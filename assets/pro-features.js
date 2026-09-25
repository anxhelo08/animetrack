/* Modular extension for AnimeTrack; loaded after all feature modules. */
window.AnimeTrackPro=function AnimeTrackPro(ctx){
 const $=ctx.el,esc=ctx.esc;
 let active='',installPrompt=null;
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
  home:window.ATHome(ctx)
 };
 modules.friends=window.ATFriends(ctx,modules.profiles);
 ctx.respondFriend=async(id,accept)=>{await modules.friends.action(accept?'friend-accept':'friend-decline',id);await modules.notifications.refresh()};
 function setMobileActive(name){document.querySelectorAll('[data-mobile-nav]').forEach(b=>b.classList.toggle('active',b.dataset.mobileNav===name))}
 function render(){if(!active)return;const renderers={notifications:modules.notifications.render,recommendations:modules.recommendations.render,calendar:modules.calendar.calendar,wrapped:modules.calendar.wrapped,profile:modules.profiles.render,friends:modules.friends.render,moderation:modules.moderation.render};$('pro-content').innerHTML=renderers[active]?.()||''}
 function renderHome(){
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
  document.body.insertAdjacentHTML('beforeend','<nav class="at-mobile-nav" aria-label="Navigimi kryesor në telefon"><button type="button" data-mobile-nav="home" class="active"><span>⌂</span><small>Home</small></button><button type="button" data-mobile-nav="library"><span>▦</span><small>Biblioteka</small></button><button type="button" data-mobile-nav="calendar"><span>◷</span><small>Kalendari</small></button><button type="button" data-mobile-nav="explore"><span>⌕</span><small>Zbulo</small></button><button type="button" data-mobile-nav="profile"><span>◉</span><small>Profili</small></button></nav>');
  const home=$('home-view'),recommend=document.createElement('section');recommend.id='pro-home-recs';recommend.className='pro-panel';const sync=home.querySelector('.sync-panel');if(sync)sync.before(recommend);else home.append(recommend);
  const dash=document.createElement('div');dash.className='at-home-dashboard';dash.innerHTML='<section id="pro-home-week" class="pro-panel"></section><section id="pro-home-inbox" class="pro-panel"></section>';recommend.after(dash);
  modules.home.mount(home,recommend,dash);
  const install=document.createElement('div');install.className='pro-install';install.innerHTML='<div class="pro-row"><strong>📱 AnimeTrack si aplikacion</strong>'+ctx.button('Instalo','install')+'</div><small class="pro-muted">Hape nga ekrani kryesor në telefon ose desktop.</small>';document.querySelector('.sidebar')?.appendChild(install);
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});
  if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('/sw.js').catch(console.warn);
  document.addEventListener('click',handleClick);
  document.addEventListener('change',e=>{if(e.target?.id==='pro-rec-length')modules.recommendations.setLength(e.target.value)});
  setInterval(()=>{if(ctx.user())modules.notifications.refresh()},5*60000);
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
 async function onAccount(){
  try{if(!ctx.user())modules.recommendations.reset();await modules.profiles.load();await modules.friends.load();await modules.moderation.load();await modules.notifications.refresh();await modules.recommendations.refresh(false);renderHome();
   const handle=new URLSearchParams(location.search).get('profile');if(handle&&ctx.user()){open('friends');await modules.friends.openHandle(handle)}
  }catch(e){console.warn('Pro account setup',e);ctx.toast('Disa veçori sociale nuk u ngarkuan: '+String(e.message||e).slice(0,90))}
 }
 function onStateChange(){modules.profiles.scheduleSnapshot();modules.notifications.syncLocal();modules.recommendations.onLibraryChange();render();renderHome()}
 function renderRewatch(id){const root=$('detail-body');if(!root)return;root.querySelector('#pro-rewatch')?.remove();const element=document.createElement('div');element.id='pro-rewatch';element.innerHTML=modules.rewatch.render(id);root.append(element)}
 async function handleClick(e){
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.mobileNav){const page=b.dataset.mobileNav;setMobileActive(page);ctx.navigate(page);return}
  if(b.dataset.proPage){ctx.navigate(b.dataset.proPage);return}
  if(b.dataset.homeAction){try{return await modules.home.action(b.dataset.homeAction,b.dataset.id||'',b)}catch(err){ctx.toast('Veprimi nuk u krye: '+String(err.message||err).slice(0,120));return}}
  const op=b.dataset.proAction,id=b.dataset.id||'';if(!op)return;
  try{
   if(op==='install'){if(installPrompt){await installPrompt.prompt();installPrompt=null}else ctx.toast('Në Android: Chrome → ⋮ → Instalo. Në iPhone: Share → Add to Home Screen.');return}
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
 return{init,open,hide,onAccount,onStateChange,renderRewatch,renderHome,render,modules};
};
