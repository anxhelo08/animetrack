import { createVisibleScheduler } from '../core/visible-scheduler.js';
import {navIcon} from './nav-icons.js';
import {createProductExperience} from './product-experience.js';
/* Modular extension for AnimeTrack; loaded after all feature modules. */
export function createFeatures(ctx){
 const $=ctx.el,esc=ctx.esc;
 let active='',installPrompt=null,liveBusy=false,liveLastCheck=0,liveTimer=null,noticeTimer=null,pwaRegistration=null,pwaUpdater=null,updateRequested=false;
 let achievementsOwner='',achievementsKnown=null;const homeMarkup=new WeakMap();
 const product=createProductExperience(ctx);
 const proPages=['notifications','recommendations','calendar','diary','watch','sync','wrapped','profile','friends','moderation','collections'];
 ctx.button=(label,action,id='')=>window.ATHTML.html`<button type="button" class="pro-btn" data-pro-action="${action}" data-id="${id}">${label}</button>`;
 const modules={
  notifications:window.ATNotifications(ctx),
  recommendations:window.ATRecommendations(ctx),
  calendar:window.ATCalendarWrapped(ctx),
  diary:null,
  watch:window.ATWatch133(ctx),
  rich:window.ATRich134(ctx),
  providerSync:window.ATProviderSync135(ctx),
  smart:window.ATSmartAiring(ctx),
  push:window.ATPush109(ctx),
  collections:window.ATCollections110(ctx),
  profiles:window.ATProfiles(ctx),
  friends:null,
  moderation:window.ATModeration(ctx),
  rewatch:window.ATRewatch(ctx),
  home:window.ATHome(ctx),
  day:window.ATDaily115(ctx),
  iphone:window.ATiPhone(ctx),
  tv:window.ATTVShows(ctx),
  experience:window.ATExperience112(ctx)
 };
 modules.friends=window.ATFriends(ctx,modules.profiles);
 ctx.mobileRecommendations=()=>modules.recommendations.getItems();
 ctx.mobileFriends=()=>modules.friends.render();
 ctx.socialCounts=()=>modules.friends.counts();
 ctx.dayBrief=compact=>modules.day.render(!!compact);
 ctx.smartWeek=compact=>modules.smart.panel(!!compact);
 ctx.smartReminderSelect=e=>modules.smart.reminderSelect(e);
 ctx.setCalendarReminder=(key,value)=>modules.smart.setReminder(key,value);
 ctx.unreadCount=()=>modules.notifications.get().filter(n=>!((ctx.state().preferences?.notificationRead)||[]).includes(n.key)&&!((ctx.state().preferences?.notificationMuted)||[]).includes(n.category)&&!((ctx.state().preferences?.notificationDismissed)||[]).includes(n.key)).length;
 ctx.respondFriend=async(id,accept)=>{await modules.friends.action(accept?'friend-accept':'friend-decline',id);await modules.notifications.refresh()};
 function renderMobileDiscover(){const node=$('at117-mobile-discover');if(!node)return;const recs=modules.recommendations;window.ATHTML.renderHTML(node,`<section class="at128-mobile-season-link"><div><span>✦ KATALOGU SEZONAL</span><strong>Zbulo anime sipas zhanrit</strong><small>Drama · Thriller · Isekai · Fantasy</small></div><button type="button" data-at128-open-seasons>Shiko sezonet ↗</button></section><section class="at117-discover-section"><div class="at117-discover-heading"><div><span>✦ PËR TY</span><h3>Rekomanduar për ty</h3></div><button type="button" data-pro-page="recommendations">Të gjitha ›</button></div>${recs.home()}</section><section class="at117-discover-section"><div class="at117-discover-heading"><div><span>◈ ANILIST · POPULLARITETI</span><h3>Popullore për ty</h3></div></div><p class="at117-discover-note">Tituj nga zbulimet e tua, renditur sipas ndjekësve në AniList; jo statistika të AnimeTrack.</p><div class="at117-trending-row">${recs.trending()||'<p class="at117-discover-note">Po ngarkohen titujt nga katalogu…</p>'}</div></section>`)}
 function setMobileActive(name){document.querySelectorAll('[data-mobile-nav]').forEach(b=>b.classList.toggle('active',b.dataset.mobileNav===name))}
 function renderBackground(){if(!['collections','profile','friends','moderation','sync'].includes(active))render()}
 function render(force=false){if(!active)return;if(active==='diary'&&!modules.diary)return;
  // Background refreshes must never replace a typed, unsubmitted collection name.
  // Explicit collection mutations still use ctx.rerender() and force a fresh view.
  if(!force&&active==='collections'&&$('at110-new-list')?.value.trim())return;
  if(!force&&['profile','friends','sync','diary'].includes(active)&&$('pro-content')?.contains(document.activeElement)&&['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
  const renderers={notifications:modules.notifications.render,recommendations:modules.recommendations.render,calendar:()=>modules.smart.full(modules.calendar.calendar(),modules.push.banner()),diary:()=>modules.diary?.render()||'',watch:modules.watch.render,sync:modules.providerSync.render,wrapped:modules.calendar.wrapped,profile:()=>modules.profiles.render()+modules.calendar.achievementsMini()+modules.providerSync.profileCard(),friends:modules.friends.render,moderation:modules.moderation.render,collections:modules.collections.render,tv:modules.tv.render};const content=$('pro-content'),markup=renderers[active]?.()||'';if(force||homeMarkup.get(content)!==markup){window.ATHTML.renderHTML(content,markup);homeMarkup.set(content,markup)}product?.refresh()}
 async function refreshLive(force=false){
  if(liveBusy)return {status:'busy'};
  if(document.visibilityState==='hidden')return {status:'hidden'};
  if(!navigator.onLine)return {status:'offline'};
  if(!force&&Date.now()-liveLastCheck<5*60000)return {status:'recent'};
  liveBusy=true;liveLastCheck=Date.now();document.body.classList.add('at-live-checking');renderHome();
  try{const result=await ctx.liveRefresh(force);modules.push.scheduleSync();void modules.providerSync.auto();return {status:result?.failed?'partial':'ok'}}
  catch(e){console.warn('Live refresh failed',e);return {status:'error'}}
  finally{liveBusy=false;document.body.classList.remove('at-live-checking');if(!['collections','profile','friends','moderation','sync'].includes(active))render();renderHome()}
 }
 function renderHome(){
  if(product&&window.matchMedia('(max-width: 760px)').matches){product.refresh();return}
  // Always render the phone feed first. A desktop-only dashboard error must never blank iPhone.
  try{modules.iphone.refresh()}catch(err){console.warn('iPhone feed recovery',err);const feed=$('at-iphone-feed');if(feed)window.ATHTML.renderHTML(feed,'<section class="at-ios-empty" role="alert"><h3>Nuk u ngarkua lista e episodeve</h3><p>Provo rifreskimin. Biblioteka jote nuk është fshirë.</p><button type="button" data-ios-action="retry">Riprovo ↻</button></section>')}
  if(window.matchMedia?.('(max-width: 760px)').matches){renderMobileDiscover();product?.refresh();return;}
  if($('at-home-main'))try{
   const day=$('at115-desktop-day');if(day)window.ATHTML.renderHTML(day,modules.day.render(true));
   const parts=modules.home.render();
   for(const [key,target] of Object.entries({hero:'at-home-top',feature:'at-home-focus',session:'at-home-session',lineup:'at-home-lineup',releases:'at-home-releases',seasons:'at-home-seasons'})){const node=$(target);if(node&&homeMarkup.get(node)!==parts[key]){window.ATHTML.renderHTML(node,parts[key]);homeMarkup.set(node,parts[key])}}
  }catch(err){
   console.warn('Desktop home recovery',err);
   const focus=$('at-home-focus');if(focus)window.ATHTML.renderHTML(focus,'<section class="at-pro-recovery" role="alert"><h3>Nuk u ngarkua ky seksion</h3><p>Biblioteka jote mbetet e ruajtur. Mund të riprovosh pa rifreskuar gjithë faqen.</p><button type="button" data-home-action="retry-home">Riprovo ↻</button></section>');
  }
  for(const [target,fn] of [['pro-home-recs',()=>modules.recommendations.home()],['pro-home-week',()=>modules.calendar.home()],['pro-home-inbox',()=>modules.notifications.home()]]){const node=$(target);if(node)try{window.ATHTML.renderHTML(node,fn())}catch(err){console.warn('Home widget recovery',target,err);window.ATHTML.renderHTML(node,'<div class="at-pro-recovery"><p>Ky seksion nuk u ngarkua.</p><button type="button" data-home-action="retry-home">Riprovo ↻</button></div>')}}
  product?.refresh();
 }
 ctx.rerender=(force=false)=>{render(!!force);renderHome()};
 ctx.rerenderRecommendations=()=>{
  // Catalog network refreshes must never reset a form that the user is typing into
  // (e.g. personal collections, profile, login).
  if(active==='recommendations')render();
  const node=$('pro-home-recs');
  if(node)window.ATHTML.renderHTML(node,modules.recommendations.home());
  if(window.matchMedia?.('(max-width:760px)').matches&&active==='')renderMobileDiscover();
  product?.refresh();
 };
 async function init(){
  modules.experience.init();
  await new Promise(resolve=>setTimeout(resolve,0));
  modules.watch.mount();
  modules.rich.mount();
  await new Promise(resolve=>setTimeout(resolve,0));
  modules.providerSync.mount();
  await new Promise(resolve=>setTimeout(resolve,0));
  window.ATMobile113.init();
  await new Promise(resolve=>setTimeout(resolve,0));
  window.ATUnified119?.mount();
  await new Promise(resolve=>setTimeout(resolve,0));
  const nav=$('side-nav');
  window.ATHTML.insertHTML(nav,'beforeend','<div class="aside-title">PRO EXPERIENCE</div>'+[['collections','▤','Listat e mia'],['diary','✎','Diary'],['watch','▶','Ku ta shoh'],['sync','⇄','MAL / AniList Sync'],['notifications','🔔','Njoftimet'],['recommendations','✨','Për ty'],['calendar','📅','Kalendari'],['wrapped','🏆','Anime Wrapped'],['profile','👤','Profili im'],['friends','👥','Miqtë & Compare'],['moderation','🛡️','Moderimi']].map(([key,icon,label])=>`<button type="button" class="nav-btn ${key==='moderation'?'hidden':''}" data-pro-page="${key}" id="pro-nav-${key}"><span>${navIcon(key)} <span class="nav-label">${label}</span></span></button>`).join(''));
  window.ATHTML.insertHTML(document.querySelector('.top-actions'),'afterbegin','<button type="button" class="pro-bell" id="pro-bell" data-pro-page="notifications" aria-label="Njoftimet">🔔 <span id="pro-badge" class="pro-bell-count"></span></button>');
  window.ATHTML.insertHTML(document.querySelector('main.main'),'beforeend','<section class="pro-view hidden" id="pro-view" aria-label="AnimeTrack Pro"><div id="pro-content"></div></section>');
  document.querySelector('main.main .footer')?.before($('pro-view'));
  window.ATHTML.insertHTML(document.body,'beforeend',`<nav class="at-mobile-nav" aria-label="Navigimi i aplikacionit"><button type="button" data-mobile-nav="home" class="active"><span>${navIcon("home")}</span><small>Episodet</small></button><button type="button" data-mobile-nav="explore"><span>${navIcon("explore")}</span><small>Kërko</small></button><button type="button" data-mobile-nav="library"><span>${navIcon("library")}</span><small>Biblioteka</small></button><button type="button" data-mobile-nav="diary"><span>${navIcon("diary")}</span><small>Aktiviteti</small></button><button type="button" data-mobile-nav="profile"><span>${navIcon("profile")}</span><small>Unë</small></button></nav>`);
  const home=$('home-view'),recommend=document.createElement('section');recommend.id='pro-home-recs';recommend.className='pro-panel';const sync=home.querySelector('.sync-panel');if(sync)sync.before(recommend);else home.append(recommend);
  const dash=document.createElement('div');dash.className='at-home-dashboard';window.ATHTML.renderHTML(dash,'<section id="pro-home-week" class="pro-panel"></section><section id="pro-home-inbox" class="pro-panel"></section>');recommend.after(dash);
  await new Promise(resolve=>setTimeout(resolve,0));
  modules.home.mount(home,recommend,dash);
  await new Promise(resolve=>setTimeout(resolve,0));
  const dayNode=document.createElement('section');dayNode.id='at115-desktop-day';dayNode.setAttribute('aria-label','Your Anime Day');$('at-home-top')?.after(dayNode);
  modules.iphone.mount();
  await new Promise(resolve=>setTimeout(resolve,0));
  window.ATHTML.insertHTML($('discover'),'beforebegin','<section id="at117-mobile-discover" class="at117-mobile-discover" aria-label="Rekomandimet dhe animet popullore"></section>');
  modules.collections.mountLibrary();
  await new Promise(resolve=>setTimeout(resolve,0));
  window.ATHTML.insertHTML($('library-view'),'afterbegin','<div class="at119-library-intro"><span>✦ BIBLIOTEKA JOTE</span><strong>Anime dhe seriale, bashkë.</strong><button type="button" data-at119-add-tv>+ Shto anime ose serial</button></div>');
  window.ATImport116?.mount?.(ctx);
  document.addEventListener('submit',e=>{if(e.target?.id==='at110-create-form'){e.preventDefault();modules.collections.action('collection-create')}if(e.target?.id==='at11-friend-form'){e.preventDefault();void modules.friends.find()}});
  let friendSearchTimer=null;document.addEventListener('input',e=>{if(e.target?.id!=='pro-friend-query')return;const q=e.target.value;clearTimeout(friendSearchTimer);friendSearchTimer=setTimeout(()=>void modules.friends.find(q),340)});
  let collectionSearchTimer=null;document.addEventListener('input',e=>{if(e.target?.id!=='at110-search-input')return;clearTimeout(collectionSearchTimer);collectionSearchTimer=setTimeout(()=>{const input=$('at110-search-input');if(!input)return;const value=input.value,caret=input.selectionStart,focused=document.activeElement===input;modules.collections.setSearch(value);const next=$('at110-search-input');if(focused&&next){next.focus({preventScroll:true});try{next.setSelectionRange(caret,caret)}catch{}}},140)});
  window.ATHTML.insertHTML(document.body,'beforeend','<dialog id="at-ios-install-guide" class="at-ios-install-dialog" aria-labelledby="at-ios-install-title"><button type="button" class="at-ios-dialog-close" data-ios-action="close-install" aria-label="Mbyll">×</button><div class="at-ios-install-mark">✦</div><h2 id="at-ios-install-title">Instalo AnimeTrack</h2><p>Hape në Safari dhe shtoje si aplikacion në ekranin e iPhone.</p><ol><li>Hap <strong>Safari</strong> në iPhone.</li><li>Prek butonin <strong>Share</strong> (katrori me shigjetë).</li><li>Zgjidh <strong>Add to Home Screen</strong>.</li><li>Aktivizo <strong>Open as Web App</strong>, pastaj prek <strong>Add</strong>.</li></ol><button type="button" class="at-ios-install-ok" data-ios-action="close-install">E kuptova ✓</button></dialog>');
  const install=document.createElement('div');install.className='pro-install';window.ATHTML.renderHTML(install,'<div class="pro-row"><strong>📱 AnimeTrack si aplikacion</strong>'+ctx.button('Instalo','install')+'</div><small class="pro-muted">Hape nga ekrani kryesor në telefon ose desktop.</small>');document.querySelector('.sidebar')?.appendChild(install);
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});
  if('serviceWorker' in navigator&&location.protocol==='https:'&&window.ATPWA136){
    const showUpdate=()=>{
     if($('at-pwa-update'))return;
     window.ATHTML.insertHTML(document.body,'beforeend','<div id="at-pwa-update" class="at-pwa-update" role="status"><span>✦ Version i ri i AnimeTrack është gati.</span><button type="button" data-pro-action="reload-update">Përditëso tani ↻</button><button type="button" data-pro-action="dismiss-update" aria-label="Më vonë">×</button></div>');
    };
    const bridge=window.ATPWA136.register({
     onNeedRefresh:showUpdate,
     onRegistered:reg=>{
      pwaRegistration=reg;
      let lastCheck=0;
      const check=()=>{if(!reg||document.visibilityState==='hidden'||!navigator.onLine||Date.now()-lastCheck<30*60000)return;lastCheck=Date.now();reg.update().catch(console.warn)};
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()});
      window.addEventListener('online',check);
      check();
      createVisibleScheduler(check,{interval:60*60000});
     },
     onError:error=>console.warn('PWA registration failed',error)
    });
    pwaUpdater=bridge.update;
   }
   document.addEventListener('click',handleClick);
  window.addEventListener('at120-tv-open',e=>{window.dispatchEvent(new CustomEvent('at120-unified-tv-open',{detail:e.detail}))});
  document.addEventListener('change',e=>{
   const node=e.target;
   if(node?.id?.startsWith('at118-')){modules.tv.change(node.id,node.value);return}
   if(node?.id==='pro-rec-length')modules.recommendations.setLength(node.value);
   if(node?.dataset?.smartReminder!==undefined)modules.smart.setReminder(node.dataset.smartReminder,node.value);
   if(node?.id==='at109-default-lead')modules.smart.setDefault(node.value);
  });
  document.addEventListener('input',e=>{if(e.target?.id==='at118-query')modules.tv.input(e.target.value)});
  document.addEventListener('keydown',e=>{if(e.target?.id==='at118-query'&&e.key==='Enter'){e.preventDefault();void modules.tv.searchNow()}});
  let pcSearchTimer=null;document.addEventListener('input',e=>{if(e.target?.id!=='at-pc-watch-search')return;const value=e.target.value,caret=e.target.selectionStart,focused=document.activeElement===e.target;clearTimeout(pcSearchTimer);pcSearchTimer=setTimeout(()=>{if(!$('home-view')||$('home-view').classList.contains('hidden'))return;modules.home.search(value);const next=$('at-pc-watch-search');if(focused&&next){next.focus({preventScroll:true});try{next.setSelectionRange(caret,caret)}catch{}}},140)});
  // Active-tab polling only. The upstream anime schedules are not a push feed.
  liveTimer=createVisibleScheduler(()=>refreshLive(false),{interval:10*60000});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void refreshLive(false)});
  window.addEventListener('online',()=>void refreshLive(false));
  window.addEventListener('focus',()=>void refreshLive(false));
  createVisibleScheduler(()=>{if(ctx.user())return modules.notifications.refresh()},{interval:5*60000});
  trackAchievements(false);renderHome();
  await new Promise(resolve=>setTimeout(resolve,0));
  if(ctx.user())void modules.recommendations.refresh(false);
  product?.mount();
 }
 let diaryLoading=null;
 function loadDiary(){
  if(modules.diary)return Promise.resolve(modules.diary);
  if(!diaryLoading)diaryLoading=import('./diary-page.js').then(()=>{modules.diary=window.ATDiary132(ctx);modules.diary.mount();return modules.diary}).catch(error=>{diaryLoading=null;throw error});
  return diaryLoading;
 }
 function open(name){
  if(!proPages.includes(name))return false;
  active=name;ctx.setLocalView(name);
  for(const id of ['home-view','library-view','upcoming-view','explore-view','seasons-view','statistics-view'])$(id)?.classList.add('hidden');
  $('pro-view').classList.remove('hidden');document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));$('pro-nav-'+name)?.classList.add('active');
  $('page-title').textContent=({notifications:'Njoftimet 🔔',recommendations:'Për ty ✨',calendar:'Kalendari 📅',diary:'Ditari',watch:'Ku ta shoh ▶',sync:'MAL / AniList Sync ⇄',wrapped:'Anime Wrapped 🏆',profile:'Profili im 👤',friends:'Miqtë 👥',moderation:'Moderimi 🛡️',collections:'Listat e mia ▤',tv:'Serialet e mia ▣'})[name];setMobileActive(name);
  if(name==='diary'&&!modules.diary){window.ATHTML.renderHTML($('pro-content'),'<p role="status">Po ngarkohet ditari…</p>');void loadDiary().then(()=>{if(active==='diary')render()}).catch(()=>{if(active==='diary')window.ATHTML.renderHTML($('pro-content'),'<p role="alert">Ditari nuk u ngarkua.</p><button type="button" class="ghost" data-pro-page="diary">Provo përsëri</button>')})}
  if(name==='collections'||name==='tv')setMobileActive('library');if(name==='sync')setMobileActive('profile');render();if(name==='recommendations')void modules.recommendations.refresh(false);if(name==='notifications')void modules.notifications.refresh();if(!window.matchMedia('(max-width:760px)').matches)window.scrollTo({top:0,behavior:'smooth'});return true;
 }
 function hide(){active='';$('pro-view')?.classList.add('hidden')}
 function syncMobile(name){setMobileActive(name);if(name==='explore'){renderMobileDiscover();void modules.recommendations.refresh(false)}}
 async function onAccount(){
  try{
   if(!ctx.user())modules.recommendations.reset();
   // Social, notifications and external recommendations must not hold the entire account UI hostage.
   const work=[['provider',()=>modules.providerSync.onAccount()],['profiles',()=>modules.profiles.load()],['friends',()=>modules.friends.load()],['moderation',()=>modules.moderation.load()],['notifications',()=>modules.notifications.refresh()],['recommendations',()=>modules.recommendations.refresh(false)]];
   void Promise.allSettled(work.map(async([name,fn])=>{
    try{await fn()}catch(err){console.warn('Account module '+name,err)}
    finally{if((name==='provider'&&(active==='sync'||active==='profile'))||(name==='profiles'&&active==='profile')||(name==='friends'&&active==='friends'))render();if(name==='profiles'||name==='friends')renderHome()}
   }));
   trackAchievements(false);render();renderHome();
   void modules.push.prepare().then(()=>modules.push.scheduleSync()).catch(console.warn);
   void refreshLive(false);
   const handle=new URLSearchParams(location.search).get('profile');
   if(handle&&ctx.user()){open('friends');await modules.friends.load();await modules.friends.openHandle(handle)}
  }catch(e){console.warn('Pro account setup',e);ctx.toast('Disa veçori sociale nuk u ngarkuan: '+String(e.message||e).slice(0,90))}
 }
 function trackAchievements(announce=false){
  const owner=ctx.user()?.id||'guest',current=modules.calendar.achievementIds();
  if(achievementsOwner!==owner||!achievementsKnown){achievementsOwner=owner;achievementsKnown=new Set(current);return}
  const earned=current.filter(id=>!achievementsKnown.has(id));
  achievementsKnown=new Set(current);
  if(announce&&earned.length)ctx.toast(earned.length===1?'🏅 Arritje e re! Shiko Trophy Room te Wrapped.':'🏅 '+earned.length+' arritje të reja! Shiko Wrapped.');
 }
 function onStateChange(){
  modules.profiles.scheduleSnapshot();modules.recommendations.onLibraryChange();modules.push.scheduleSync();
  trackAchievements(true);
  if(!['collections','profile','friends','moderation','sync'].includes(active))render();renderHome();
  clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{if(document.visibilityState==='visible')void modules.notifications.refresh();else modules.notifications.badge()},450);
 }
 function renderRewatch(id){const root=$('detail-body');if(!root)return;root.querySelector('#pro-rewatch')?.remove();const element=document.createElement('div');element.id='pro-rewatch';window.ATHTML.renderHTML(element,modules.rewatch.render(id));root.append(element)}
 async function handleClick(e){
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.mobileNav){const page=b.dataset.mobileNav;if(document.body.dataset.mobilePage===page)return;setMobileActive(page);ctx.navigate(page);return}
  if(b.hasAttribute('data-at128-open-seasons')){ctx.navigate('seasons');return}
  if(b.dataset.tvSearchPreview){window.dispatchEvent(new CustomEvent('at120-unified-tv-open',{detail:b.dataset.tvSearchPreview}));return}
  if(b.dataset.tvAction){const id=String(b.dataset.id||'');if(id.startsWith('tvmaze-')){ctx.openAnime(id);return}return modules.tv.action(b.dataset.tvAction,id,b.dataset.ep||'')}
  if(b.hasAttribute('data-at119-add-tv')){ctx.navigate('explore');document.getElementById('global-search')?.focus();return}
  if(b.dataset.dayAction){try{return modules.day.action(b.dataset.dayAction,b.dataset.id||'')}catch(err){ctx.toast('Veprimi nuk u krye: '+String(err.message||err).slice(0,110));return}}
  if(b.dataset.iosAction){if(b.dataset.iosAction==='close-install'){const d=$('at-ios-install-guide');d?.close?.();if(d)d.hidden=true;return}try{return await modules.iphone.action(b.dataset.iosAction,b.dataset.id||'',b)}catch(err){ctx.toast('Veprimi nuk u krye: '+String(err.message||err).slice(0,110));return}}
  if(b.dataset.proPage){ctx.navigate(b.dataset.proPage);return}
  if(b.dataset.homeAction==='retry-home'){renderHome();return}
  if(b.dataset.homeAction==='sync-now'){const result=await refreshLive(true);ctx.toast(({ok:'Orari u kontrollua ✓',partial:'Disa burime nuk u arritën. Provo përsëri.',offline:'Nuk ka internet. Provo kur të lidhet pajisja.',busy:'Kontrolli është në proces.',hidden:'Hap aplikacionin për kontroll.',recent:'Orari është kontrolluar së fundmi.',error:'Kontrolli dështoi. Provo përsëri.'})[result.status]||'Kontrolli nuk u krye.');return}
  if(b.dataset.homeAction){try{return await modules.home.action(b.dataset.homeAction,b.dataset.id||'',b)}catch(err){ctx.toast('Veprimi nuk u krye: '+String(err.message||err).slice(0,120));return}}
  const op=b.dataset.proAction,id=b.dataset.id||'';if(!op)return;
  try{
   if(op==='dismiss-update'){$('at-pwa-update')?.remove();return}
   if(op==='reload-update'){if(ctx.canReload&&!ctx.canReload()){ctx.toast('Ruajtja është ende aktive ose kopja lokale nuk është ruajtur në mënyrë të sigurt. Provo përsëri pas pak ose eksporto kopje rezervë.');return}if(pwaUpdater){updateRequested=true;await pwaUpdater(true);return}location.reload();return}
   if(op==='install'){if(/iPhone|iPad|iPod/.test(navigator.userAgent)){const d=$('at-ios-install-guide');if(d){d.hidden=false;d.showModal?.()}return}if(installPrompt){await installPrompt.prompt();installPrompt=null}else ctx.toast('Në Android: Chrome → ⋮ → Instalo. Në iPhone: Safari → Share → Add to Home Screen.');return}
   if(op==='recommendations'){ctx.navigate('recommendations');return}
   if(op==='add-recommendation')return await modules.recommendations.add(b.dataset.key);
   if(op==='preview-recommendation')return modules.recommendations.preview(b.dataset.key);
   if(op==='hide-recommendation')return modules.recommendations.hide(b.dataset.key);
   if(op==='restore-recommendations')return modules.recommendations.restore();
   if(op==='rec-media')return modules.recommendations.setMedia(id);
   if(op==='rec-mood')return modules.recommendations.setMood(id);
   if(op==='rec-tab')return modules.recommendations.setTab(id);
   if(op==='rec-surprise')return modules.recommendations.surprise();
   if(op==='more-recommendations')return modules.recommendations.more();
   if(op==='reset-recommendation-filters')return modules.recommendations.resetFilters();
   if(op==='refresh-recommendations')return await modules.recommendations.refresh(true);
   if(op.startsWith('diary-'))return (await loadDiary()).action(op,id,b);
   if(op.startsWith('watch-'))return modules.watch.action(op,id,b);
   if(op.startsWith('notification-'))return await modules.notifications.action(op,id);
   if(op.startsWith('collection-'))return await modules.collections.action(op,id);
   if(op.startsWith('smart-push-'))return await modules.push.action(op);
   if(op.startsWith('week-')||op.startsWith('calendar-')||op.startsWith('wrapped-'))return modules.calendar.action(op,id);
   if(op==='account-open')return ctx.openAccount();
   if(op==='profile-tab')return modules.profiles.setTab(id);
   if(op==='profile-anime')return ctx.openAnime(id);
   if(op==='profile-goal-save')return modules.profiles.goalSave();
   if(op==='profile-save')return await modules.profiles.save();
   if(op==='profile-share')return await modules.profiles.share();
   if(op.startsWith('friend-'))return await modules.friends.action(op,id);
   if(op.startsWith('mod-'))return await modules.moderation.action(op,id,b.dataset.comment);
   if(op.startsWith('rewatch-'))return modules.rewatch.action(op,id);
  }catch(err){ctx.toast('Veprimi nuk u krye: '+String(err.message||err).slice(0,120))}
 }
 return{product,init,open,hide,syncMobile,onAccount,onStateChange,renderRewatch,renderHome,render,renderBackground,modules};
}
