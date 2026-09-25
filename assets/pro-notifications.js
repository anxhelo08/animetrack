/* AnimeTrack 10.1 — notification inbox, controls, digest and filters. */
window.ATNotifications=function ATNotifications(ctx){
 let notices=[],read=new Set(),refreshing=false,filter='all',onlyUnread=false,showSettings=false;
 const esc=ctx.esc,client=()=>ctx.client(),user=()=>ctx.user(),state=()=>ctx.state(),D=86400000;
 const categories=[['all','Të gjitha'],['episodes','📺 Episode'],['comments','💬 Komente'],['friends','👥 Miq'],['system','✦ Sistemi']];
 function preferences(){
  state().preferences=state().preferences||{};const p=state().preferences;
  p.notificationRead=Array.isArray(p.notificationRead)?p.notificationRead:[];
  p.notificationMuted=Array.isArray(p.notificationMuted)?p.notificationMuted:[];
  p.notificationDismissed=Array.isArray(p.notificationDismissed)?p.notificationDismissed:[];
  return p;
 }
 function collect(){
  const out=[],now=Date.now();
  const reminders=preferences().calendarReminders||{};
  const alreadyWatched=e=>{const a=state().anime.find(x=>x.id===e.animeId),season=a?.seasons?.find(x=>x.id===e.seasonId);return !!season?.watched?.includes(Number(e.seasonEpisode||e.episode))};
  for(const e of ctx.upcoming()){
   const key=[e.animeId,e.seasonId||'',e.episode,e.when].join(':');
   if(!reminders[key]||e.when>now+30*60000||e.when<now-D||alreadyWatched(e))continue;
   const a=state().anime.find(x=>x.id===e.animeId);if(!a)continue;
   out.push({key:'reminder:'+key,category:'episodes',title:'Kujtesa e episodit',body:a.title+' · EP '+e.episode+' · '+new Date(e.when).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'}),at:e.when-30*60000,id:a.id,cover:a.cover,season:e.seasonId||'',ep:e.seasonEpisode||e.episode});
  }
  for(const e of ctx.upcoming()){
   if(!e.animeId||e.when>now||e.when<now-7*D||alreadyWatched(e))continue;
   const a=state().anime.find(x=>x.id===e.animeId);if(!a)continue;
   out.push({key:'ep:'+e.animeId+':'+(e.seasonId||e.season)+':'+e.episode,category:'episodes',title:'Episod i ri',body:a.title+' · EP '+e.episode,at:e.when,id:a.id,cover:a.cover,season:e.seasonId||'',ep:e.seasonEpisode||e.episode});
  }
  for(const a of state().anime)for(const s of a.seasons||[])if(s.discoveredAt&&s.releaseStatus==='NOT_YET_RELEASED'){
   const at=Date.parse(s.discoveredAt);if(Number.isFinite(at)&&at>now-30*D)out.push({key:'season:'+a.id+':'+s.id,category:'episodes',title:'Sezon i konfirmuar',body:a.title+' · '+(s.subtitle||s.title),at,id:a.id,cover:a.cover});
  }
  return out;
 }
 async function refresh(){
  if(refreshing)return;refreshing=true;const items=collect();
  try{
   if(user()){
    const u=user().id;
    const f=await client().from('anime_friendships').select('id,status,created_at').eq('recipient_id',u).eq('status','pending').limit(30);
    if(!f.error)for(const x of f.data||[])items.push({key:'friend:'+x.id,category:'friends',title:'Kërkesë miqësie',body:'Ke një kërkesë të re për ta shqyrtuar.',at:Date.parse(x.created_at),page:'friends',requestId:String(x.id)});
    const own=await client().from('episode_comments').select('id').eq('user_id',u).limit(80);
    if(!own.error&&own.data?.length){
     const q=await client().from('episode_comments').select('id,user_id,author_name,parent_id,created_at,episode_key').in('parent_id',own.data.map(x=>x.id)).order('created_at',{ascending:false}).limit(60);
     if(!q.error)for(const x of q.data||[])if(x.user_id!==u)items.push({key:'reply:'+x.id,category:'comments',title:'Përgjigje në komentin tënd',body:x.author_name+' iu përgjigj komentit tënd.',at:Date.parse(x.created_at),episodeKey:x.episode_key});
    }
   }
  }catch(e){console.warn('Notification update',e)}
  finally{notices=[...new Map(items.map(x=>[x.key,x])).values()].sort((a,b)=>b.at-a.at).slice(0,100);read=new Set(preferences().notificationRead);refreshing=false;badge();ctx.rerender()}
 }
 function visible(){const p=preferences(),muted=new Set(p.notificationMuted),dismissed=new Set(p.notificationDismissed);
  return notices.filter(x=>!muted.has(x.category)&&!dismissed.has(x.key));
 }
 function filtered(){return visible().filter(x=>(filter==='all'||x.category===filter)&&(!onlyUnread||!read.has(x.key)))}
 function badge(){const n=visible().filter(x=>!read.has(x.key)).length,el=ctx.el('pro-badge');if(el){el.textContent=String(Math.min(99,n));el.classList.toggle('has',n>0)}}
 function persistRead(){const p=preferences();p.notificationRead=[...read].slice(-250);ctx.save();badge();ctx.rerender()}
 function readOne(key){if(!key||read.has(key))return;read.add(key);persistRead()}
 function readAll(){for(const x of visible())read.add(x.key);persistRead()}
 function dismiss(key){const p=preferences();if(!notices.some(x=>x.key===key))return;p.notificationDismissed=[...new Set([...p.notificationDismissed,key])].slice(-250);ctx.save();badge();ctx.rerender()}
 function mute(category){const p=preferences();if(!categories.some(c=>c[0]===category&&category!=='all'))return;const val=new Set(p.notificationMuted);if(val.has(category))val.delete(category);else val.add(category);p.notificationMuted=[...val];ctx.save();badge();ctx.rerender()}
 function localKey(value){const d=new Date(value);return [d.getFullYear(),d.getMonth(),d.getDate()].join('-')}
 function groupName(ms){const now=new Date(),yesterday=new Date(now);yesterday.setDate(now.getDate()-1);if(localKey(ms)===localKey(now))return'Sot';if(localKey(ms)===localKey(yesterday))return'Dje';const monday=new Date(now.getFullYear(),now.getMonth(),now.getDate());monday.setDate(monday.getDate()-(monday.getDay()+6)%7);return ms>=monday.getTime()?'Këtë javë':'Më herët'}
 function iconOf(x){return x.category==='episodes'?'▶':x.category==='comments'?'💬':x.category==='friends'?'👥':'✦'}
 function relative(at){const delta=Math.max(0,Date.now()-at);if(delta<3600000)return Math.max(1,Math.floor(delta/60000))+' min më parë';if(delta<D)return Math.floor(delta/3600000)+' orë më parë';return new Date(at).toLocaleDateString('sq-AL',{day:'numeric',month:'short'})}
 function render(){
  const rows=filtered(),unread=visible().filter(x=>!read.has(x.key)).length,p=preferences();
  const groups=new Map();for(const x of rows){const g=groupName(x.at);if(!groups.has(g))groups.set(g,[]);groups.get(g).push(x)}
  const groupHTML=[...groups].map(([name,arr])=>`<section class="at-notice-group"><h3>${esc(name)} <span>${arr.length}</span></h3><div class="at-notice-list">${arr.map(x=>`<article class="at-notice ${read.has(x.key)?'':'unread'}"><div class="at-notice-symbol ${x.category}">${ctx.poster(x.cover)?`<img src="${esc(ctx.poster(x.cover))}" loading="lazy" referrerpolicy="no-referrer" alt="">`:iconOf(x)}</div><div class="at-notice-content"><div class="at-notice-top"><strong>${esc(x.title)}</strong><time>${esc(relative(x.at))}</time></div><p>${esc(x.body)}</p><div class="at-notice-actions">${x.category==='friends'&&x.requestId?`<button class="pro-btn primary" data-pro-action="notification-friend-accept" data-id="${esc(x.requestId)}">✓ Prano</button><button class="pro-btn" data-pro-action="notification-friend-decline" data-id="${esc(x.requestId)}">Refuzo</button>`:''}<button class="pro-btn primary" data-pro-action="notification-open" data-id="${esc(x.key)}">${x.category==='friends'?'Shiko kërkesën':x.category==='comments'?'Shiko diskutimin':'Hap animen'} →</button>${!read.has(x.key)?`<button class="pro-btn" data-pro-action="notification-read" data-id="${esc(x.key)}">✓ Lexuar</button>`:''}<button class="pro-btn at-notice-dismiss" data-pro-action="notification-dismiss" data-id="${esc(x.key)}" aria-label="Fshi këtë njoftim nga pamja" title="Fshih">✕</button></div></div></article>`).join('')}</div></section>`).join('');
  return `<header class="at-notice-hero"><div><span class="pro-eyebrow">YOUR ANIME INBOX</span><h2>🔔 Njoftimet e tua</h2><p>Episodet e reja dhe bisedat e komunitetit, të gjitha në një vend.</p></div><div class="at-notice-total"><strong>${unread}</strong><span>të palexuara</span></div></header><div class="at-notice-toolbar"><div class="at-notice-filters" role="group" aria-label="Filtro njoftimet">${categories.map(([key,label])=>`<button class="at-filter ${filter===key?'active':''}" data-pro-action="notification-filter" data-id="${key}" aria-pressed="${filter===key}">${label}</button>`).join('')}</div><div class="at-notice-options"><button class="pro-btn ${onlyUnread?'primary':''}" data-pro-action="notification-unread" aria-pressed="${onlyUnread}">● Vetëm të palexuara</button><button class="pro-btn" data-pro-action="notification-read-all" ${unread?'':'disabled'}>✓ Lexo të gjitha</button><button class="pro-btn" data-pro-action="notification-clear-old">Pastro të vjetrat</button><button class="pro-btn" data-pro-action="notification-refresh" ${refreshing?'disabled':''}>↻ ${refreshing?'Po rifreskohet…':'Rifresko'}</button><button class="pro-btn" data-pro-action="notification-settings" aria-expanded="${showSettings}">⚙ Preferencat</button></div></div>${showSettings?`<section class="pro-panel at-notice-preferences"><h3>Çfarë do të shohësh?</h3><p class="pro-muted">Çaktivizimi fsheh një kategori njoftimesh brenda aplikacionit. Nuk ndikon te komentet, miqtë apo të dhënat e tjera.</p><div class="at-notice-toggle-list">${categories.filter(x=>x[0]!=='all').map(([key,label])=>`<button class="at-notice-toggle" data-pro-action="notification-mute" data-id="${key}" aria-pressed="${!p.notificationMuted.includes(key)}"><span>${label}</span><b>${p.notificationMuted.includes(key)?'Fikur':'Aktiv'}</b></button>`).join('')}</div><button class="pro-btn" data-pro-action="notification-restore">Rikthe njoftimet e fshehura</button></section>`:''}${groupHTML||`<div class="at-notice-empty"><span>✦</span><h3>Je në rregull!</h3><p>${onlyUnread?'Nuk ka njoftime të palexuara për këtë filtër.':'Nuk ka njoftime në këtë kategori. Rifresko kur të ketë aktivitet të ri.'}</p></div>`}<p class="pro-muted at-notice-note">Njoftimet kontrollohen në aplikacion; nuk dërgojnë push kur faqja është e mbyllur. Të dhënat e llogarisë ruhen sipas cilësimeve të tua.</p>`;
 }
 function open(key){
  const n=notices.find(x=>x.key===key);if(!n)return;readOne(key);
  if(n.category==='comments'&&n.episodeKey){if(ctx.openDiscussion?.(n.episodeKey))return;ctx.toast('Episodi nuk është gjetur në bibliotekën tënde.');return}
  if(n.category==='friends'){ctx.navigate('friends');return}
  if(n.id)ctx.openAnime(n.id);else if(n.page)ctx.navigate(n.page);
 }
 async function action(op,id){
  if(op==='notification-refresh')return refresh();
  if(op==='notification-read-all')return readAll();
  if(op==='notification-clear-old'){const p=preferences(),old=notices.filter(x=>x.at<Date.now()-7*D).map(x=>x.key);p.notificationDismissed=[...new Set([...p.notificationDismissed,...old])].slice(-250);ctx.save();badge();ctx.rerender();ctx.toast(old.length?old.length+' njoftime të vjetra u fshehën.':'Nuk ka njoftime më të vjetra se 7 ditë.');return}
  if(op==='notification-friend-accept'||op==='notification-friend-decline'){if(!user())return;const n=notices.find(x=>x.requestId===id&&x.category==='friends');if(!n)return;await ctx.respondFriend?.(id,op==='notification-friend-accept');ctx.toast(op==='notification-friend-accept'?'Kërkesa u pranua ✓':'Kërkesa u refuzua');return}
  if(op==='notification-open')return open(id);
  if(op==='notification-read')return readOne(id);
  if(op==='notification-dismiss')return dismiss(id);
  if(op==='notification-filter'){if(categories.some(x=>x[0]===id)){filter=id;ctx.rerender()}return}
  if(op==='notification-unread'){onlyUnread=!onlyUnread;ctx.rerender();return}
  if(op==='notification-settings'){showSettings=!showSettings;ctx.rerender();return}
  if(op==='notification-mute')return mute(id);
  if(op==='notification-restore'){preferences().notificationDismissed=[];ctx.save();ctx.rerender()}
 }
 function home(){
 const rows=visible().filter(x=>!read.has(x.key)).slice(0,3),count=visible().filter(x=>!read.has(x.key)).length;
 return `<div class="at-home-widget-head"><div><span class="pro-eyebrow">INBOX</span><h3>🔔 Njoftimet <span class="at-widget-count">${count}</span></h3><p>Aktiviteti që kërkon vëmendje</p></div><button class="pro-btn" data-pro-page="notifications">Hap inbox ↗</button></div><div class="at-home-widget-list">${rows.map(x=>`<button class="at-home-alert-row" data-pro-action="notification-open" data-id="${esc(x.key)}"><span>${iconOf(x)}</span><span><strong>${esc(x.title)}</strong><small>${esc(x.body)}</small></span><span aria-hidden="true">↗</span></button>`).join('')||'<p class="at-home-widget-empty">Je i përditësuar. S’ka njoftime të palexuara.</p>'}</div>`;
}
 return {refresh,render,action,badge,home,get:()=>notices};
};
