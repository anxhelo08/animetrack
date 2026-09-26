/* AnimeTrack 11.4 — mobile episode hub inspired by the user's TV Time-style flow. */
window.ATiPhone=function ATiPhone(ctx){
 const esc=ctx.esc;
 const state=()=>ctx.state();
 const STALE_MS=7*86400000;
 let tab='watch',viewMode='list',limit=10,dismissed=false,lastUser='',lastWatch=null,syncing=false,syncMessage='',showHistory=true,historyExpanded=false;
 const userKey=()=>`animetrack_ios_install_${ctx.user()?.id||'guest'}`;
 const ios=()=>/iPhone|iPad|iPod/i.test(navigator.userAgent);
 const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const poster=url=>ctx.poster(url||'');
 const pad=n=>String(Math.max(0,Number(n)||0)).padStart(2,'0');
 const seasonIndex=(anime,season)=>Math.max(0,anime?.seasons?.indexOf(season))+1;
 const episodeCode=(seasonNo,ep)=>`S${pad(seasonNo)} | E${pad(ep)}`;
 const toTime=value=>{const n=Date.parse(String(value||''));return Number.isFinite(n)?n:0};
 const releaseDate=value=>{const d=new Date(Number(value)||0);return Number.isFinite(d.getTime())?d:''};
 const relativeDay=value=>{const d=releaseDate(value);if(!d)return'';return d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short'})};
 const relativeTime=value=>{const d=releaseDate(value);if(!d)return'';return d.toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'})};
 function episodeTitle(season,n,fallback='Episodi i radhës'){
  const episodes=Array.isArray(season?.episodes)?season.episodes:[];
  const found=episodes.find(ep=>Number(ep?.number||ep?.episode||ep?.seasonEpisode)===Number(n));
  return String(found?.title||found?.name||fallback);
 }
 function lastTouched(anime){
  const event=(state().history||[]).slice().reverse().find(h=>h.id===anime.id&&['watched','season-watched'].includes(h.action));
  return toTime(event?.date)||toTime(anime.updatedAt)||toTime(anime.createdAt);
 }
 function eligibleAnime(){
  return (state().anime||[]).filter(a=>{
   try{return a?.status==='watching'&&!!ctx.nextEpisode(a)&&ctx.releasedTotal(a)>ctx.count(a)}
   catch(err){console.warn('Skipping incomplete anime in iPhone feed',a?.id,err);return false}
  });
 }
 function splitWatch(){
  const now=Date.now(),all=eligibleAnime();
  const active=[],stale=[];
  for(const anime of all){
   const touched=lastTouched(anime)||now;
   if(now-touched>=STALE_MS)stale.push(anime);else active.push(anime);
  }
  const sorter=(a,b)=>lastTouched(b)-lastTouched(a)||String(a.title||'').localeCompare(String(b.title||''));
  return {active:active.sort(sorter),stale:stale.sort(sorter),all:all.sort(sorter)};
 }
 function watchHistory(){
  const seen=new Set();
  return (state().history||[]).slice().reverse().map(h=>{
   if(!['watched','season-watched'].includes(h.action))return null;
   const anime=(state().anime||[]).find(a=>a.id===h.id);if(!anime)return null;
   const season=anime.seasons?.find(s=>s.id===h.seasonId)||anime.seasons?.[0];if(!season)return null;
   const n=Number(h.episode)||Math.max(0,...(season.watched||[]));if(!n)return null;
   const key=[anime.id,season.id,n,h.date].join(':');if(seen.has(key))return null;seen.add(key);
   return {anime,season,n,date:toTime(h.date),title:episodeTitle(season,n,'Episod i parë')};
  }).filter(Boolean).slice(0,24);
 }
 function upcomingFeed(){
  const allowed=new Set((state().anime||[]).filter(a=>['watching','completed','waiting'].includes(a.status)).map(a=>a.id));
  return (ctx.upcoming()||[]).filter(e=>allowed.has(e.animeId)&&Number(e.when)>=Date.now()-6*3600000&&Number(e.when)<=Date.now()+30*86400000)
   .sort((a,b)=>Number(a.when)-Number(b.when))
   .slice(0,40)
   .map(e=>{
    const anime=(state().anime||[]).find(a=>a.id===e.animeId);if(!anime)return null;
    const season=anime.seasons?.find(s=>s.id===e.seasonId)||anime.seasons?.[0]||null;
    const n=Number(e.seasonEpisode||e.episode||0);if(!n)return null;
    return {anime,season,n,when:Number(e.when),title:episodeTitle(season,n,'Episod i ri')};
   }).filter(Boolean);
 }
 function actionButtonMarkup(kind,attrs=''){
  return `<button type="button" class="at114-check ${kind||''}" ${attrs}><span>✓</span></button>`;
 }
 function watchCard(anime,{stale=false}={}){
  const nx=ctx.nextEpisode(anime);if(!nx)return'';
  const seasonNo=seasonIndex(anime,nx.season),watched=ctx.count(anime),released=ctx.releasedTotal(anime),backlog=Math.max(0,released-watched),url=poster(anime.cover||''),title=episodeTitle(nx.season,nx.n),touched=lastTouched(anime);
  return `<article class="at114-card at114-watch-card ${stale?'is-stale':''} ${viewMode==='grid'?'is-grid':''}">
   <button type="button" class="at114-cover" data-ios-action="episode" data-id="${esc(anime.id)}" aria-label="Hap episodin e radhës për ${esc(anime.title)}">${url?`<img src="${esc(url)}" loading="lazy" referrerpolicy="no-referrer" alt="Posteri i ${esc(anime.title)}">`:'<span>✦</span>'}</button>
   <div class="at114-body">
    <button type="button" class="at114-title-pill" data-ios-action="details" data-id="${esc(anime.id)}">${esc(anime.title)} <span>›</span></button>
    <button type="button" class="at114-copy" data-ios-action="episode" data-id="${esc(anime.id)}" aria-label="Vazhdo ${esc(anime.title)} me episodin ${nx.n}">
     <strong class="at114-code">${episodeCode(seasonNo,nx.n)}${backlog>1?` <small>+${backlog-1}</small>`:''}</strong>
     <span class="at114-episode-title">${esc(title)}</span>
     <small class="at114-meta">${stale?`Nuk e ke prekur prej ${Math.max(7,Math.floor((Date.now()-touched)/86400000))} ditësh`:`${watched}/${released} episode · ${ctx.percent(anime)}%`}</small>
    </button>
   </div>
   ${actionButtonMarkup(stale?'ghost':'ready',`data-ios-action="advance" data-id="${esc(anime.id)}" aria-label="Shëno episodin ${nx.n} si të parë"`)}
  </article>`;
 }
 function historyCard(item){
  const anime=item.anime,seasonNo=seasonIndex(anime,item.season),url=poster(anime.cover||'');
  return `<article class="at114-card at114-watch-card at114-history-card ${viewMode==='grid'?'is-grid':''}">
   <button type="button" class="at114-cover" data-ios-action="episode-specific" data-id="${esc(anime.id)}" data-season="${esc(item.season.id)}" data-ep="${item.n}" aria-label="Hap ${esc(anime.title)} episodin ${item.n}">${url?`<img src="${esc(url)}" loading="lazy" referrerpolicy="no-referrer" alt="Posteri i ${esc(anime.title)}">`:'<span>✦</span>'}</button>
   <div class="at114-body">
    <button type="button" class="at114-title-pill" data-ios-action="details" data-id="${esc(anime.id)}">${esc(anime.title)} <span>›</span></button>
    <button type="button" class="at114-copy" data-ios-action="episode-specific" data-id="${esc(anime.id)}" data-season="${esc(item.season.id)}" data-ep="${item.n}" aria-label="Rihap ${esc(anime.title)} episodin ${item.n}">
     <strong class="at114-code">${episodeCode(seasonNo,item.n)}</strong>
     <span class="at114-episode-title">${esc(item.title)}</span>
     <small class="at114-meta">${item.date?`E pe më ${esc(new Date(item.date).toLocaleDateString('sq-AL',{day:'2-digit',month:'short'}))}`:'E parë së fundmi'}</small>
    </button>
   </div>
   ${actionButtonMarkup('done',`data-ios-action="episode-specific" data-id="${esc(anime.id)}" data-season="${esc(item.season.id)}" data-ep="${item.n}" aria-label="Rihap episodin ${item.n}"`)}
  </article>`;
 }
 function upcomingCard(item){
  const anime=item.anime,seasonNo=seasonIndex(anime,item.season),url=poster(anime.cover||'');
  return `<article class="at114-card at114-watch-card at114-upcoming-card ${viewMode==='grid'?'is-grid':''}">
   <button type="button" class="at114-cover" data-ios-action="details" data-id="${esc(anime.id)}" aria-label="Hap orarin e ${esc(anime.title)}">${url?`<img src="${esc(url)}" loading="lazy" referrerpolicy="no-referrer" alt="Posteri i ${esc(anime.title)}">`:'<span>✦</span>'}<span class="at114-cover-date"><b>${esc(relativeDay(item.when))}</b><small>${esc(relativeTime(item.when))}</small></span></button>
   <div class="at114-body">
    <button type="button" class="at114-title-pill" data-ios-action="details" data-id="${esc(anime.id)}">${esc(anime.title)} <span>›</span></button>
    <button type="button" class="at114-copy" data-ios-action="details" data-id="${esc(anime.id)}" aria-label="Hap detajet e ${esc(anime.title)}">
     <strong class="at114-code">${episodeCode(seasonNo,item.n)}</strong>
     <span class="at114-episode-title">${esc(item.title)}</span>
     <small class="at114-meta">Del ${esc(relativeDay(item.when))} · ${esc(relativeTime(item.when))}</small>
    </button>
   </div>
   ${actionButtonMarkup('ghost',`data-ios-action="details" data-id="${esc(anime.id)}" aria-label="Detajet e ${esc(anime.title)}"`)}
  </article>`;
 }
 function installCard(){
  if(!ios()||standalone()||dismissed)return'';
  return `<aside class="at-ios-install"><span>✦</span><div><strong>AnimeTrack në iPhone</strong><p>Instaloje në Home Screen për ta hapur si aplikacion, pa shiritin e Safari.</p><button type="button" data-ios-action="install">Si ta instaloj ↗</button></div><button type="button" class="at-ios-dismiss" data-ios-action="dismiss-install" aria-label="Mbyll këshillën">×</button></aside>`;
 }
 function tools(watchCount,upcomingCount){
  return `<div class="at114-topbar"><div class="at114-top-tabs" role="tablist" aria-label="Episodet mobile"><button type="button" class="${tab==='watch'?'active':''}" data-ios-action="tab" data-id="watch" aria-selected="${tab==='watch'}">TO WATCH</button><button type="button" class="${tab==='upcoming'?'active':''}" data-ios-action="tab" data-id="upcoming" aria-selected="${tab==='upcoming'}">UPCOMING</button></div><div class="at114-view-actions" role="group" aria-label="Ndrysho paraqitjen"><button type="button" class="${viewMode==='list'?'active':''}" data-ios-action="mode" data-id="list" aria-pressed="${viewMode==='list'}" aria-label="Pamja listë">◫</button><button type="button" class="${viewMode==='grid'?'active':''}" data-ios-action="mode" data-id="grid" aria-pressed="${viewMode==='grid'}" aria-label="Pamja grid">◧</button></div></div><p class="at114-tab-count" role="status" aria-live="polite">${tab==='watch'?`${watchCount} anime aktive në radhë`:`${upcomingCount} episode të planifikuara`}</p>`;
 }
 function renderWatchSection(){
  const {active,stale}=splitWatch();
  const history=watchHistory();
  const listClass=`at114-list ${viewMode==='grid'?'is-grid':''}`;
  const activeMarkup=active.slice(0,limit).map(a=>watchCard(a)).join('');
  const staleMarkup=stale.slice(0,limit).map(a=>watchCard(a,{stale:true})).join('');
  const historyMarkup=history.slice(0,historyExpanded?Math.min(24,Math.max(limit,8)):2).map(historyCard).join('');
  const helper=active.length<3?`<button type="button" class="at114-helper-card" data-ios-action="discover"><span class="at114-helper-icon">▣</span><span><strong>Fill my shows list</strong><small>Shto anime të reja dhe mbaje radhën plot.</small></span><i>›</i></button>`:'';
  return `${history.length?`<div class="at114-center-pill"><button type="button" data-ios-action="toggle-history" aria-expanded="${showHistory}">WATCH HISTORY</button></div>${showHistory?`<section class="${listClass} at114-history-list">${historyMarkup}</section>${history.length>2?`<button type="button" class="at114-history-more" data-ios-action="expand-history">${historyExpanded?'Shfaq më pak ↑':'Shfaq historikun e plotë ↓'}</button>`:''}`:''}`:''}<section class="${listClass}">${activeMarkup||`<div class="at-ios-empty"><span>✦</span><h3>Je në rregull me episodet!</h3><p>Shto një anime te “Po shikoj” ose prit premierën e radhës.</p><button type="button" data-ios-action="discover">Zbulo anime ↗</button></div>`}</section>${helper}${stale.length?`<div class="at114-center-pill at114-muted-pill"><button type="button" disabled>NOT WATCHED IN A WHILE</button></div><section class="${listClass} at114-stale-list">${staleMarkup}</section>`:''}`;
 }
 function renderUpcomingSection(){
  const items=upcomingFeed();
  const grouped=[];
  let current='';
  for(const item of items.slice(0,Math.max(limit,12))){
   const key=relativeDay(item.when);
   if(key!==current){current=key;grouped.push(`<div class="at114-section-label">${esc(key)}</div>`)}
   grouped.push(upcomingCard(item));
  }
  return `<section class="at114-list ${viewMode==='grid'?'is-grid':''} at114-upcoming-list">${grouped.join('')||`<div class="at-ios-empty"><span>◷</span><h3>Nuk ka episode të planifikuara</h3><p>Rifresko kalendarin ose shto më shumë anime te lista jote.</p><button type="button" data-ios-action="sync">Rifresko ↻</button></div>`}</section>`;
 }
 function render(){
  const id=ctx.user()?.id||'guest';
  if(lastUser!==id){
   lastUser=id;lastWatch=null;syncMessage='';viewMode='list';tab='watch';showHistory=true;historyExpanded=false;
   try{dismissed=localStorage.getItem(userKey())==='1'}catch{dismissed=false}
  }
  const watch=splitWatch(),soon=upcomingFeed(),unread=ctx.unreadCount?.()||0;
  const name=ctx.accountName().split(/[\s@]/)[0]||'Anime fan';
  const saveInfo=ctx.watchSaveStatus?.()||{};
  const syncText=syncing?'Po kontrollohen episodet…':syncMessage||(!navigator.onLine?'Pa internet · progresi ruhet lokalisht':saveInfo.dirty?'Progresi është në pritje të cloud':saveInfo.mode==='cloud'&&saveInfo.connected?'Biblioteka në cloud ✓':'Biblioteka ruhet në pajisje');
  const validUndo=lastWatch&&lastWatch.owner===id&&(state().anime||[]).some(a=>a.id===lastWatch.id&&a.seasons?.some(s=>s.id===lastWatch.seasonId&&(s.watched||[]).includes(lastWatch.n)));
  if(lastWatch&&!validUndo)lastWatch=null;
  const feedback=`<div class="at-ios-watch-feedback" role="status" aria-live="polite"><span class="at-ios-sync-dot ${syncing?'busy':saveInfo.dirty?'pending':''}" aria-hidden="true"></span><span>${esc(syncText)}</span>${validUndo?`<button type="button" data-ios-action="undo" aria-label="Zhbëj episodin ${lastWatch.n}">↶ Zhbëj EP ${lastWatch.n}</button>`:''}</div>`;
  const body=tab==='watch'?renderWatchSection():renderUpcomingSection();
  return `<section class="at-ios-shell at114-shell"><header class="at-ios-header"><div><span class="at-ios-kicker">ANIMETRACK · EPISODES</span><h1>${esc(new Date().getHours()<12?'Mirëmëngjes':new Date().getHours()<18?'Mirëdita':'Mirëmbrëma')}, ${esc(name)} <span>✦</span></h1><p>${watch.all.length?`${watch.all.length} anime me episode për të vazhduar.`:'Historia jote anime, në një vend.'}</p></div><button class="at11-head-friends" type="button" data-pro-page="friends" aria-label="Kërko dhe shto miq" title="Miqtë">👥<span> Miqtë</span></button><button class="at-ios-bell" data-pro-page="notifications" type="button" aria-label="Hap njoftimet">🔔${unread?`<i>${Math.min(99,unread)}</i>`:''}</button></header>${installCard()}${feedback}${tools(watch.all.length,soon.length)}${body}${(tab==='watch'&&(watch.all.length>limit||watch.stale.length>limit))||(tab==='upcoming'&&soon.length>Math.max(limit,12))?'<button type="button" class="at-ios-more" data-ios-action="more">Shfaq më shumë ↓</button>':''}<div class="at-ios-end"><span>✦</span> Gjithçka që ke shënuar ruhet në bibliotekën tënde.</div></section>`;
 }
 function mount(){
  const home=ctx.el('home-view');if(!home||ctx.el('at-iphone-feed'))return;
  const el=document.createElement('div');el.id='at-iphone-feed';home.insertBefore(el,home.firstChild);document.body.classList.add('at-ios-enabled');
 }
 function refresh(){
  const node=ctx.el('at-iphone-feed');if(!node)return;
  try{node.innerHTML=render()}catch(err){console.warn('iPhone feed failed to render',err);node.innerHTML='<section class="at-ios-empty" role="alert"><span>✦</span><h3>Nuk u ngarkuan episodet</h3><p>Mund të ketë një problem të përkohshëm me të dhënat. Provo përsëri ose hap Bibliotekën; progresi yt ruhet.</p><button type="button" data-ios-action="retry">Riprovo ↻</button></section>';}
 }
 async function action(op,id,b){
  const a=(state().anime||[]).find(anime=>anime.id===id);
  if(op==='retry'){refresh();return}
  if(op==='tab'){if(['watch','upcoming'].includes(id)){tab=id;limit=10;refresh()}return}
  if(op==='mode'){if(['list','grid'].includes(id)){viewMode=id;refresh()}return}
  if(op==='toggle-history'){showHistory=!showHistory;refresh();return}
  if(op==='expand-history'){historyExpanded=!historyExpanded;refresh();return}
  if(op==='more'){limit=Math.min(50,limit+8);refresh();return}
  if(op==='details'){if(a)ctx.openAnime(a.id);return}
  if(op==='episode'){if(a){const n=ctx.nextEpisode(a);if(n)ctx.openEpisode(a.id,n.season.id,n.n)}return}
  if(op==='advance'){
   const nx=a&&ctx.nextEpisode(a);if(!nx)return;
   const owner=ctx.user()?.id||'guest',entry={id:a.id,seasonId:nx.season.id,n:nx.n,owner};
   if(ctx.markNext(a.id)){lastWatch=entry;syncMessage='Episodi u shënua ✓';refresh()}
   return;
  }
  if(op==='undo'){
   const old=lastWatch;lastWatch=null;
   const item=(state().anime||[]).find(anime=>anime.id===old?.id),season=item?.seasons?.find(s=>s.id===old?.seasonId);
   if(old&&old.owner===(ctx.user()?.id||'guest')&&season?.watched?.includes(old.n)&&ctx.undoEpisode?.(old.id,old.seasonId,old.n))syncMessage='Shënimi u kthye mbrapsht ✓';
   else syncMessage='Progresi ka ndryshuar. Nuk u zhbë.';
   refresh();return;
  }
  if(op==='episode-specific'||op==='mark-specific'){
   if(!a)return;const s=a.seasons.find(season=>season.id===b?.dataset.season),n=Number(b?.dataset.ep);
   if(!s||!Number.isInteger(n)||n<1)return;
   if(op==='episode-specific')ctx.openEpisode(a.id,s.id,n);
   else if(n<=ctx.released(s)&&!s.watched.includes(n))ctx.markEpisode(a.id,s.id,n);
   return;
  }
  if(op==='sync'){
   if(syncing)return;syncing=true;syncMessage='';refresh();
   try{await ctx.liveRefresh?.(true);const status=ctx.liveStatus?.()||{};syncMessage=status.failed?'Disa burime të orarit nuk u arritën':'Kontrolli përfundoi ✓'}
   catch(err){console.warn('iPhone sync failed',err);syncMessage='Nuk u lidh burimi. Provo përsëri.'}
   finally{syncing=false;refresh()}return;
  }
  if(op==='discover'){ctx.navigate('explore');return}
  if(op==='install'){const d=ctx.el('at-ios-install-guide');if(d){d.hidden=false;d.showModal?.()}return}
  if(op==='dismiss-install'){dismissed=true;try{localStorage.setItem(userKey(),'1')}catch{}refresh();return}
 }
 return {mount,refresh,render,action};
};
