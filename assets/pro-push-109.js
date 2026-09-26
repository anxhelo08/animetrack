/* AnimeTrack 10.9 — opt-in, server-gated Web Push; never request permission automatically. */
window.ATPush109=function ATPush109(ctx){
 const D=86400000,validLead=n=>[0,10,30,60,1440].includes(Number(n));
 let owner='',phase='checking',detail='',publicKey='',registration=null,subscription=null,busy=false,syncTimer=null;
 const prefs=()=>{const s=ctx.state();s.preferences=s.preferences||{};return s.preferences};
 const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent);
 const installed=()=>!!(window.matchMedia?.('(display-mode: standalone)')?.matches||navigator.standalone);
 const available=()=>typeof Notification!=='undefined'&&'serviceWorker' in navigator&&'PushManager' in window&&location.protocol==='https:';
 const keyOf=e=>[e.animeId,e.seasonId||'',e.episode,e.when].join(':');
 const button=(op,label,disabled=false)=>`<button type="button" data-pro-action="${op}" ${disabled?'disabled':''}>${label}</button>`;
 function banner(){
  const enabled=!!prefs().pushEnabled;
  const states={checking:'Po kontrollohet shërbimi…',login:'Hyr në llogari për njoftime push.',install:'Në iPhone, instalo AnimeTrack në Home Screen për Web Push.',unsupported:'Web Push nuk mbështetet në këtë shfletues.',unconfigured:'Serveri i Web Push nuk është aktivizuar ende.',denied:'Leja është bllokuar. Ndrysho cilësimet e njoftimeve të pajisjes.',ready:enabled&&subscription?'Njoftimet Web Push janë aktive për këtë pajisje.':'Web Push është gati për aktivizim.',error:'Shërbimi push nuk u lidh. Mund të riprovosh.'};
  const control=phase==='ready'?button('smart-push-toggle',enabled&&subscription?'Çaktivizo në këtë pajisje':'Aktivizo Web Push',busy):phase==='install'?button('install','Udhëzimi i instalimit'):button('smart-push-check','Kontrollo përsëri',busy);
  return `<div class="at109-push-state ${phase==='ready'&&enabled&&subscription?'enabled':''}"><div><span class="at109-push-dot" aria-hidden="true"></span><strong>Njoftimet jashtë aplikacionit</strong><p>${states[phase]||states.error}${detail?' · '+ctx.esc(detail):''}</p><small>Leja kërkohet vetëm pasi shtyp butonin. Asnjë abonim nuk krijohet automatikisht.</small></div>${control}</div>`;
 }
 async function prepare(force=false){
  const uid=ctx.user()?.id||'';
  if(uid!==owner){owner=uid;subscription=null;publicKey='';phase='checking'}
  if(!uid){phase='login';return phase}
  if(!available()){phase='unsupported';return phase}
  if(isIOS()&&!installed()){phase='install';return phase}
  if(Notification.permission==='denied'){phase='denied';return phase}
  if(phase==='ready'&&publicKey&&!force)return phase;
  if(!ctx.client()?.functions?.invoke){phase='unconfigured';return phase}
  try{
   const {data,error}=await ctx.client().functions.invoke('anime-push-config',{body:{}});
   if(error||!data?.publicKey||!/^[A-Za-z0-9_-]{80,100}$/.test(String(data.publicKey)))throw Error('Serveri nuk ka çelësin publik VAPID');
   publicKey=String(data.publicKey);
   registration=await navigator.serviceWorker.ready;
   subscription=await registration.pushManager.getSubscription();
   phase='ready';detail='';
  }catch(err){phase='unconfigured';detail='Funksioni i serverit nuk është publikuar';console.warn('Push preparation unavailable',err)}
  ctx.rerender?.();return phase;
 }
 function decodeKey(key){
  const value=String(key).replace(/-/g,'+').replace(/_/g,'/');
  const bytes=atob(value+'='.repeat((4-value.length%4)%4));
  return Uint8Array.from(bytes,c=>c.charCodeAt(0));
 }
 function jobs(){
  const now=Date.now(),settings=prefs().calendarReminders||{},uid=ctx.user()?.id;
  if(!uid)return[];
  return (ctx.upcoming()||[]).filter(e=>{
   const n=Number(settings[keyOf(e)]),when=Number(e.when);
   if(!Object.prototype.hasOwnProperty.call(settings,keyOf(e))||!validLead(n)||!Number.isFinite(when)||when<now||when>now+90*D)return false;
   const a=ctx.state().anime.find(x=>x.id===e.animeId),s=a?.seasons.find(x=>x.id===e.seasonId);
   return !!a&&!!s&&!s.watched.includes(Number(e.seasonEpisode||e.episode));
  }).slice(0,250).map(e=>({
   user_id:uid,event_key:keyOf(e),anime_id:String(e.animeId),season_id:String(e.seasonId||''),
   episode:Number(e.seasonEpisode||e.episode),title:String(e.title||'Anime').slice(0,140),
   air_at:new Date(Number(e.when)).toISOString(),
   notify_at:new Date(Number(e.when)-Number(settings[keyOf(e)])*60000).toISOString()
  }));
 }
 async function sync(){
  if(!ctx.user()||!prefs().pushEnabled||phase!=='ready'||!subscription||!ctx.client()?.from)return;
  const uid=ctx.user().id,records=jobs();
  try{
   if(records.length){const {error}=await ctx.client().from('anime_push_reminders').upsert(records,{onConflict:'user_id,event_key'});if(error)throw error}
   const {data,error}=await ctx.client().from('anime_push_reminders').select('event_key').eq('user_id',uid).is('sent_at',null).limit(300);
   if(error)throw error;
   const current=new Set(records.map(x=>x.event_key)),stale=(data||[]).map(x=>x.event_key).filter(k=>!current.has(k));
   if(stale.length){const {error:removeError}=await ctx.client().from('anime_push_reminders').delete().eq('user_id',uid).in('event_key',stale);if(removeError)throw removeError}
  }catch(err){console.warn('Push reminder sync failed; in-app reminders remain available',err)}
 }
 function scheduleSync(){
  clearTimeout(syncTimer);
  if(!prefs().pushEnabled||phase!=='ready')return;
  syncTimer=setTimeout(()=>void sync(),1200);
 }
 async function activate(){
  if(busy||phase!=='ready'||!publicKey||!registration||!ctx.user())return;
  busy=true;ctx.rerender();
  try{
   // Called directly from the user's click, before any awaited network call.
   const permission=await Notification.requestPermission();
   if(permission!=='granted'){phase=permission==='denied'?'denied':'ready';detail='Nuk u dha leja';return}
   subscription=subscription||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(publicKey)});
   const json=subscription.toJSON(),keys=json.keys||{};
   if(!json.endpoint||!keys.p256dh||!keys.auth)throw Error('Abonimi push nuk përmban çelësat e nevojshëm');
   const {error}=await ctx.client().from('anime_push_subscriptions').upsert({user_id:ctx.user().id,endpoint:json.endpoint,p256dh:keys.p256dh,auth_key:keys.auth,last_seen_at:new Date().toISOString()},{onConflict:'user_id,endpoint'});
   if(error)throw error;
   const old=prefs().pushEnabled;prefs().pushEnabled=true;
   if(!ctx.save()){prefs().pushEnabled=old;throw Error('Cilësimi nuk u ruajt në bibliotekë')}
   await sync();detail='Aktivizuar në këtë pajisje';ctx.toast('Web Push u aktivizua ✓');
  }catch(err){detail='Aktivizimi nuk u përfundua';console.warn('Push subscribe failed',err);ctx.toast('Aktivizimi dështoi; kujtesat brenda aplikacionit vazhdojnë.')}
  finally{busy=false;ctx.rerender()}
 }
 async function disable(){
  if(busy)return;busy=true;ctx.rerender();
  try{
   const uid=ctx.user()?.id,endpoint=subscription?.endpoint;
   if(uid&&endpoint&&ctx.client()?.from){const {error}=await ctx.client().from('anime_push_subscriptions').delete().eq('user_id',uid).eq('endpoint',endpoint);if(error)throw error}
   await subscription?.unsubscribe?.();subscription=null;
   const old=prefs().pushEnabled;prefs().pushEnabled=false;
   if(!ctx.save()){prefs().pushEnabled=old;throw Error('Cilësimi nuk u ruajt')}
   detail='Çaktivizuar në këtë pajisje';ctx.toast('Web Push u çaktivizua ✓');
  }catch(err){detail='Çaktivizimi nuk u përfundua';console.warn('Push unsubscribe failed',err);ctx.toast('Nuk u çaktivizua; provo përsëri.')}
  finally{busy=false;ctx.rerender()}
 }
 async function action(op){
  if(op==='smart-push-check')return prepare(true);
  if(op==='smart-push-toggle')return prefs().pushEnabled&&subscription?disable():activate();
 }
 return {banner,prepare,action,jobs,sync,scheduleSync,status:()=>({phase,enabled:!!prefs().pushEnabled,subscription:!!subscription})};
};
