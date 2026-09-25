/* Modular extension for AnimeTrack; loaded after all feature modules. */
window.AnimeTrackPro=function AnimeTrackPro(ctx){
 const $=ctx.el,esc=ctx.esc;
 let active='',installPrompt=null,liveBusy=false,liveLastCheck=0,liveTimer=null,noticeTimer=null;
 const proPages=['notifications','recommendations','calendar','wrapped','profile','friends','moderation'];
 ctx.button=(label,action,id='')=>`<button type="button" class="pro-btn" data-pro-action="${esc(action)}" data-id="${esc(id)}">${esc(label)}</button>`;
 const modules={
  notifications:window.ATNotifications(ctx),
  recommendations:window.ATRecommendations(ctx),
  calendar:window.ATCalendarWrapped(ctx),
  profiles:window.ATProfiles(ctx),
  friends:null,
  moderation:window.ATModeration(ctx),
  rewatch:window.ATRewatch(ctx),
  home:window.ATHome(ctx),
  iphone:window.ATiPhone(ctx)
 };
 modules.friends=window.ATFriends(ctx,modules.profiles);
 ctx.unreadCount=()=>modules.notifications.get().filter(n=>!((ctx.state().preferences?.notificationRead)||[]).includes(n.key)&&!((ctx.state().preferences?.notificationMuted)||[]).includes(n.category)&&!((ctx.state().preferences?.notificationDismissed)||[]).includes(n.key)).length;
 ctx.respondFriend=async(id,accept)=>{await modules.friends.action(accept?'friend-accept':'friend-decline',id);await modules.notifications.refresh()};
 function setMobileActive(name){document.querySelectorAll('[data-mobile-nav]').forEach(b=>b.classList.toggle('active',b.dataset.mobileNav===name))}
 function render(){if(!active)return;const renderers={notifications:modules.notifications.render,recommendations:modules.recommendations.render,calendar:modules.calendar.calendar,wrapped:modules.calendar.wrapped,profile:modules.profiles.render,friends:modules.friends.render,moderation:modules.moderation.render};$('pro-content').innerHTML=renderers[active]?.()||''}
 async function refreshLive(force=false){
  if(liveBusy||document.visibilityState==='hidden'||!navigator.onLine)return;
  if(!force&&Date.now()-liveLastCheck<5*60000)return;
  liveBusy=true;liveLastCheck=Date.now();document.body.classList.add('at-live-checking');renderHome();
  try{await ctx.liveRefresh(force)}catch(e){console.warn('Live refresh failed',e)}
  finally{liveBusy=false;document.body.classList.remove('at-live-checking');render();renderHome()}
 }
 function renderHome(){
  // Always render the phone feed first. A desktop-only dashboard error must never blank iPhone.
  try{modules.iphone.refresh()}catch(err){console.warn('iPhone feed recovery',err);const feed=$('at-iphone-feed');if(feed)feed.innerHTML='<section class="at-ios-empty" role="alert"><h3>Nuk u ngarkua lista e episodeve</h3><p>Provo rifreskimin. Biblioteka jote nuk është fshirë.</p><button type="button" data-ios-action="retry">Riprovo ↻</button></section>'}
  if(window.matchMedia?.('(max-width: 760px)').matches)return;
  if($('at-home-main')){const parts=modules.home.render();for(const [key,target] of Object.entries({hero:'at-home-top',feature:'at-home-focus',session:'at-home-session',lineup:'at-home-lineup',releases:'at-home-releases',seasons:'at-home-seasons'})){const node=$(target);if(node)node.innerHTML=parts[key]}}
  const box=$('pro-home-recs');if(box)box.innerHTML=modules.recommendations.home();
  const week=$('pro-home-week');if(week)week.innerHTML=modules.calendar.home();
  const inbox=$('pro-home-inbox');if(inbox)inbox.innerHTML=modules.notifications.home();
 }
 ctx.rerender=()=>{render();renderHome()};
 function init(){
  const nav=$('side-nav');
  nav.insertAdjacentHTML('beforeend','<div class="aside-title">PRO EXPERIENCE</div>'+[['notifications','🔔','Njoftimet'],['recommendations','✨','Për ty'],['calendar','📅','Kalendari'],['wrapped','🏆','Anime Wrapped'],['profile','👤','Profili im'],['friends','👥','Miqtë & Compare'],['moderation','🛡️','Moderimi']].map(([key,icon,label])=>`<button type="button" class="nav-btn ${key==='moderation'?'hidden':''}" data-pro-page="${key}" id="pro-nav-${key}"><span>${icon} <span class="nav-label">${label}</span></span></button>`).join(''));
  document.querySelector('.top-actions')?.insertAdjacentHTML('afterbegin','<button type="button" class="pro-bell" id="pro-bell" data-pro-page="notifications" aria-label="Njoftimet">🔔 <span id="pro-badge" class="pro-bell-count"></span></button>');
  document.querySelector('main.main').insertAdjacentHTML('beforeend','<section class="pro-view hidden" id="pro-view" aria-label="AnimeTrack Pro"><div id="pro-content"></div></section>');
  document.body.insertAdjacentHTML('beforeend','<nav class="at-mobile-nav" aria-label="Navigimi i aplikacionit"><button type="button" data-mobile-nav="home" class="active"><span>▶</span><small>Episodet</small></button><button type="button" data-mobile-nav="calendar"><span>▦</span><small>Kalendari</small></button><button type="button" data-mobile-nav="explore"><span>⌕</span><small>Zbulo</small></button><button type="button" data-mobile-nav="library"><span>▤</span><small>Biblioteka</small></button><button type="button" data-mobile-nav="profile"><span>◉</span><small>Unë</small></button></nav>');
  const home=$('home-view'),recommend=document.createElement('section');recommend.id='pro-home-recs';recommend.className='pro-panel';const sync=home.querySelector('.sync-panel');if(sync)sync.before(recommend);else home.append(recommend);
  const dash=document.createElement('div');dash.className='at-home-dashboard';dash.innerHTML='<section id="pro-home-week" class="pro-panel"></section><section id="pro-home-inbox" class="pro-panel"></section>';recommend.after(dash);
  modules.home.mount(home,recommend,dash);
  modules.iphone.mount();
  document.body.insertAdjacentHTML('beforeend','<dialog id="at-ios-install-guide" class="at-ios-install-dialog" aria-labelledby="at-ios-install-title"><button type="button" class="at-ios-dialog-close" data-ios-action="close-install" aria-label="Mbyll">×</button><div class="at-ios-install-mark">✦</div><h2 id="at-ios-install-title">Instalo AnimeTrack</h2><p>Hape në Safari dhe shtoje si aplikacion në ekranin e iPhone.</p><ol><li>Hap <strong>Safari</strong> në iPhone.</li><li>Prek butonin <strong>Share</strong> (katrori me shigjetë).</li><li>Zgjidh <strong>Add to Home Screen</strong>.</li><li>Aktivizo <strong>Open as Web App</strong>, pastaj prek <strong>Add</strong>.</li></ol><button type="button" class="at-ios-install-ok" data-ios-action="close-install">E kuptova ✓</button></dialog>');
  const install=document.createElement('div');install.className='pro-install';install.innerHTML='<div class="pro-row"><strong>📱 AnimeTrack si aplikacion</strong>'+ctx.button('Instalo','install')+'</div><small class="pro-muted">Hape nga ekrani kryesor në telefon ose desktop.</small>';document.querySelector('.sidebar')?.appendChild(install);
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});
  if('serviceWorker' in navigator&&location.protocol==='https:'){
   const showUpdate=()=>{
    if($('at-pwa-update'))return;
    document.body.insertAdjacentHTML('beforeend','<div id="at-pwa-update" class="at-pwa-update" role="status"><span>✦ Version i ri i AnimeTrack është gati.</span><button type="button" data-pro-action="reload-update">Përditëso tani ↻</button><button type="button" data-pro-action="dismiss-update" aria-label="Më vonë">×</button></div>');
   };
   navigator.serviceWorker.addEventListener('controllerchange',showUpdate);
   navigator.serviceWorker.register('/sw.js').then(reg=>{
    if(reg.waiting)showUpdate();
    let lastCheck=0;
    const check=()=>{if(document.visibilityState==='hidden'||!navigator.onLine||Date.now()-lastCheck<30*60000)return;lastCheck=Date.now();reg.update().catch(console.warn)};
    reg.addEventListener('updatefound',()=>{const worker=reg.installing;if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdate()})});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()});
    window.addEventListener('online',check);
    setInterval(check,60*60000);
   }).catch(console.warn);
  }
  document.addEventListener('click',handleClick);
  document.addEventListener('change',e=>{if(e.target?.id==='pro-rec-length')modules.recommendations.setLength(e.target.value)});
  let pcSearchTimer=null;document.addEventListener('input',e=>{if(e.target?.id!=='at-pc-watch-search')return;clearTimeout(pcSearchTimer);pcSearchTimer=setTimeout(()=>{const current=$('at-pc-watch-search');if(!current)return;const value=current.value,caret=current.selectionStart,focused=document.activeElement===current;modules.home.search(value);const next=$('at-pc-watch-search');if(focused&&next){next.focus({preventScroll:true});try{next.setSelectionRange(caret,caret)}catch{}}},140)});
  // Active-tab polling only. The upstream anime schedules are not a push feed.
  liveTimer=setInterval(()=>{if(document.visibilityState==='visible')void refreshLive(false)},10*60000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void refreshLive(false)});
  window.addEventListener('online',()=>void refreshLive(false));
  window.addEventListener('focus',()=>void refreshLive(false));
  setInterval(()=>{if(document.visibilityState==='visible'&&ctx.user())void modules.notifications.refresh()},5*60000);
  renderHome();
  void modules.recommendations.refresh(false);
 }
 function open(name){
  if(!proPages.includes(name))return false;
  active=name;ctx.setLocalView(name);
  for(const id of ['home-view','library-view','upcoming-view','explore-view','seasons-view','statistics-view'])$(id)?.classList.add('hidden');
  $('pro-view').classList.remove('hidden');document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));$('pro-nav-'+name)?.classList.add('active');
  $('page-title').textContent=({notifications:'Njoftimet 🔔',recommendations:'Për ty ✨',calendar:'Kalendari 📅',wrapped:'Anime Wrapped 🏆',profile:'Profili im 👤',friends:'Miqtë 👥',moderation:'Moderimi 🛡️'})[name];setMobileActive(name);
  render();if(name==='recommendations')void modules.recommendations.refresh(false);if(name==='notifications')void modules.notifications.refresh();window.scrollTo({top:0,behavior:'smooth'});return true;
 }
 function hide(){active='';$('pro-view')?.classList.add('hidden')}
 function syncMobile(name){setMobileActive(name)}
 async function onAccount(){
  try{if(!ctx.user())modules.recommendations.reset();await modules.profiles.load();await modules.friends.load();await modules.moderation.load();await modules.notifications.refresh();await modules.recommendations.refresh(false);renderHome();void refreshLive(false);
   const handle=new URLSearchParams(location.search).get('profile');if(handle&&ctx.user()){open('friends');await modules.friends.openHandle(handle)}
  }catch(e){console.warn('Pro account setup',e);ctx.toast('Disa veçori sociale nuk u ngarkuan: '+String(e.message||e).slice(0,90))}
 }
 function onStateChange(){
  modules.profiles.scheduleSnapshot();modules.recommendations.onLibraryChange();
  render();renderHome();
  clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{if(document.visibilityState==='visible')void modules.notifications.refresh();else modules.notifications.badge()},450);
 }
 function renderRewatch(id){const root=$('detail-body');if(!root)return;root.querySelector('#pro-rewatch')?.remove();const element=document.createElement('div');element.id='pro-rewatch';element.innerHTML=modules.rewatch.render(id);root.append(element)}
 async function handleClick(e){
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.mobileNav){const page=b.dataset.mobileNav;setMobileActive(page);ctx.navigate(page);return}
  if(b.dataset.iosAction){if(b.dataset.iosAction==='close-install'){const d=$('at-ios-install-guide');d?.close?.();if(d)d.hidden=true;return}try{return await modules.iphone.action(b.dataset.iosAction,b.dataset.id||'',b)}catch(err){ctx.toast('Veprimi nuk u krye: '+String(err.message||err).slice(0,110));return}}
  if(b.dataset.proPage){ctx.navigate(b.dataset.proPage);return}
  if(b.dataset.homeAction==='sync-now'){await refreshLive(true);ctx.toast('Kontrolli i përditësimeve përfundoi.');return}
  if(b.dataset.homeAction){try{return await modules.home.action(b.dataset.homeAction,b.dataset.id||'',b)}catch(err){ctx.toast('Veprimi nuk u krye: '+String(err.message||err).slice(0,120));return}}
  const op=b.dataset.proAction,id=b.dataset.id||'';if(!op)return;
  try{
   if(op==='dismiss-update'){$('at-pwa-update')?.remove();return}
   if(op==='reload-update'){if(ctx.canReload&&!ctx.canReload()){ctx.toast('Ruajtja në cloud është ende në proces. Provo përsëri pas sinkronizimit.');return}location.reload();return}
   if(op==='install'){if(/iPhone|iPad|iPod/.test(navigator.userAgent)){const d=$('at-ios-install-guide');if(d){d.hidden=false;d.showModal?.()}return}if(installPrompt){await installPrompt.prompt();installPrompt=null}else ctx.toast('Në Android: Chrome → ⋮ → Instalo. Në iPhone: Safari → Share → Add to Home Screen.');return}
   if(op==='recommendations'){ctx.navigate('recommendations');return}
   if(op==='add-recommendation')return await modules.recommendations.add(b.dataset.key);
   if(op==='preview-recommendation')return modules.recommendations.preview(b.dataset.key);
   if(op==='hide-recommendation')return modules.recommendations.hide(b.dataset.key);
   if(op==='restore-recommendations')return modules.recommendations.restore();
   if(op==='rec-mood')return modules.recommendations.setMood(id);
   if(op==='rec-tab')return modules.recommendations.setTab(id);
   if(op==='rec-surprise')return modules.recommendations.surprise();
   if(op==='more-recommendations')return modules.recommendations.more();
   if(op==='reset-recommendation-filters')return modules.recommendations.resetFilters();
   if(op==='refresh-recommendations')return await modules.recommendations.refresh(true);
   if(op.startsWith('notification-'))return await modules.notifications.action(op,id);
   if(op.startsWith('week-')||op.startsWith('calendar-')||op.startsWith('wrapped-'))return modules.calendar.action(op,id);
   if(op==='profile-tab')return modules.profiles.setTab(id);
   if(op==='profile-goal-save')return modules.profiles.goalSave();
   if(op==='profile-save')return await modules.profiles.save();
   if(op==='profile-share')return await modules.profiles.share();
   if(op.startsWith('friend-'))return await modules.friends.action(op,id);
   if(op.startsWith('mod-'))return await modules.moderation.action(op,id,b.dataset.comment);
   if(op.startsWith('rewatch-'))return modules.rewatch.action(op,id);
  }catch(err){ctx.toast('Veprimi nuk u krye: '+String(err.message||err).slice(0,120))}
 }
 return{init,open,hide,syncMobile,onAccount,onStateChange,renderRewatch,renderHome,render,modules};
};
