/* AnimeTrack 11.4.1 — refined mobile episode hub; shared account progress remains untouched. */
window.ATiPhone=function ATiPhone(ctx){
 const esc=ctx.esc;
 const state=()=>ctx.state();
 const STALE_MS=7*86400000;
 const DAY_MS=86400000;
 let tab='watch',recentFilter='unseen',viewMode='list',upcomingWindow=7,limit=10,dismissed=false,lastUser='',lastWatch=null,syncing=false,syncMessage='',showHistory=true,historyExpanded=false;
 const userKey=()=>`animetrack_ios_install_${ctx.user()?.id||'guest'}`;
 const ios=()=>/iPhone|iPad|iPod/i.test(navigator.userAgent);
 const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const poster=url=>ctx.poster(url||'');
 const pad=n=>String(Math.max(0,Number(n)||0)).padStart(2,'0');
 const seasonIndex=(anime,season)=>typeof ctx.seasonNumber==='function'?ctx.seasonNumber(anime,season):(anime?.seasons||[]).slice(0,(anime?.seasons?.indexOf(season)??-1)+1).filter(s=>!['MOVIE','SPECIAL','OVA'].includes(s.format)).length;
 const episodeCode=(seasonNo,ep,season)=>String(season?.format||'').toUpperCase()==='MOVIE'?'Film':`S${pad(seasonNo)} | E${pad(ep)}`;
 const toTime=value=>{const n=Date.parse(String(value||''));return Number.isFinite(n)?n:0};
 const releaseDate=value=>{const d=new Date(Number(value)||0);return Number.isFinite(d.getTime())?d:''};
 const relativeDay=value=>{const d=releaseDate(value);if(!d)return'';return d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short'})};
 const relativeTime=value=>{const d=releaseDate(value);if(!d)return'';return d.toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit',hour12:false,hourCycle:'h23'})};
 function episodeTitle(season,n,fallback='Episodi i radhës'){
  if(String(season?.format||'').toUpperCase()==='MOVIE')return season.subtitle||season.title||'Filmi';
  const episodes=Array.isArray(season?.episodes)?season.episodes:[];
  const found=episodes.find(ep=>Number(ep?.number||ep?.episode||ep?.seasonEpisode)===Number(n));
  return String(found?.title||found?.name||fallback);
 }
 function lastTouched(anime){return window.ATEpisodeHub127.lastTouched(anime,state().history||[])}
 function eligibleAnime(){
  return (state().anime||[]).filter(a=>{
   try{return ['watching','waiting'].includes(a?.status)&&!!ctx.nextEpisode(a)&&ctx.releasedTotal(a)>ctx.count(a)}
   catch(err){console.warn('Skipping incomplete anime in iPhone feed',a?.id,err);return false}
  });
 }
 function splitWatch(releases=recentFeed()){
  const recent=(releases||[]).filter(item=>['watching','waiting','completed'].includes(item.anime?.status));
  return window.ATEpisodeHub127.classify(eligibleAnime(recent),state().history||[],recent);
 }
 function watchHistory(){
  const seen=new Set();
  return (state().history||[]).slice().reverse().map(h=>{
   if(!['watched','season-watched'].includes(h.action))return null;
   const anime=(state().anime||[]).find(a=>a.id===h.id);if(!anime)return null;
   const season=anime.seasons?.find(s=>s.id===h.seasonId)||anime.seasons?.[0];if(!season)return null;
   const n=Number(h.episode)||Math.max(0,...(season.watched||[]));if(!n||!(season.watched||[]).includes(n))return null;
   const key=[anime.id,season.id,n].join(':');if(seen.has(key))return null;seen.add(key);
   return {anime,season,n,date:toTime(h.date),title:episodeTitle(season,n,'Episod i parë')};
  }).filter(Boolean).slice(0,24);
 }
 function upcomingFeed(){
  const now=Date.now(),allowed=new Set((state().anime||[]).filter(a=>['watching','completed','waiting'].includes(a.status)).map(a=>a.id));
  const seen=new Set();
  return (ctx.upcoming?.()||[]).filter(e=>allowed.has(e.animeId)&&Number.isFinite(Number(e.when))&&Number(e.when)>now&&Number(e.when)<=now+upcomingWindow*DAY_MS)
   .sort((a,b)=>Number(a.when)-Number(b.when))
   .map(e=>{
    const anime=(state().anime||[]).find(a=>a.id===e.animeId);if(!anime)return null;
    const season=anime.seasons?.find(s=>s.id===e.seasonId)||anime.seasons?.[0]||null;
    const n=Number(e.seasonEpisode||e.episode||0);if(!Number.isInteger(n)||n<1||(season?.watched||[]).includes(n))return null;
    const key=[anime.id,season?.id||'',n].join(':');if(seen.has(key))return null;seen.add(key);
    const title=String(e.episodeTitle||e.titleEpisode||episodeTitle(season,n,'Episod i ri'));
    return {anime,season,n,when:Number(e.when),title};
   }).filter(Boolean).slice(0,40);
 }
 function recentFeed(){
  // Verified past air dates only; do not confuse TV broadcast with streaming availability.
  const now=Date.now(),seen=new Set(),all=[];
  for(const event of ctx.recentAiring?.()||[]){
   const anime=(state().anime||[]).find(a=>a.id===(event.anime?.id||event.animeId));
   const season=anime?.seasons?.find(s=>s.id===(event.localSeason?.id||event.seasonId));
   const n=Number(event.localEpisode||event.seasonEpisode||event.episode),when=Number(event.when);
   if(!anime||!season||!Number.isInteger(n)||n<1||n>ctx.released(season)||!Number.isFinite(when)||when>now||when<now-7*DAY_MS)continue;
   const key=anime.id+'|'+season.id+'|'+n;if(seen.has(key))continue;seen.add(key);
   const watched=season.watched?.includes(n)||false;
   const ep=season.episodes?.find(x=>x.number===n);
   all.push({anime,season,n,when,watched,title:ep?.title||'Episodi '+n});
  }
  all.sort((a,b)=>b.when-a.when);
  return all.slice(0,40);
 }
 function recentCard(item,{priority=false}={}){
  const {anime,season,n,when,watched,title}=item,url=poster(anime.cover||''),code=episodeCode(seasonIndex(anime,season),n,season);
  return `<article class="at114-card at114-watch-card at124-release-card ${priority?'at127-new-card':''} ${viewMode==='grid'?'is-grid':''}">
   <button type="button" class="at114-cover" data-ios-action="open-recent" data-id="${esc(anime.id)}" data-season="${esc(season.id)}" data-ep="${n}" aria-label="Hap episodin ${n} të ${esc(anime.title)}">${url?`<img src="${esc(url)}" loading="lazy" referrerpolicy="no-referrer" alt="Posteri i ${esc(anime.title)}">`:'<span>✦</span>'}<span class="at124-release-date">${esc(relativeDay(when))}</span></button>
   <div class="at114-body"><span class="at124-release-status">${watched?'✓ I PARË':'● SAPO DOLI'} · ${esc(relativeTime(when))}</span>
    <button type="button" class="at114-title-pill" data-ios-action="details" data-id="${esc(anime.id)}">${esc(anime.title)} <span>›</span></button>
    <button type="button" class="at114-copy" data-ios-action="open-recent" data-id="${esc(anime.id)}" data-season="${esc(season.id)}" data-ep="${n}"><strong class="at114-code">${esc(code)}</strong><span class="at114-episode-title">${esc(title)}</span><small class="at114-meta">Transmetuar ${esc(relativeDay(when))}, ${esc(relativeTime(when))}</small></button>
   </div>
   <button type="button" class="at124-release-action ${watched?'done':''}" data-ios-action="${watched?'open-recent':'mark-recent'}" data-id="${esc(anime.id)}" data-season="${esc(season.id)}" data-ep="${n}" aria-label="${watched?'Hap episodin':'Shëno si të parë'}"><span aria-hidden="true">${watched?'↗':'✓'}</span></button>
  </article>`;
 }
 function dayHeading(value){
  const date=new Date(value),now=new Date(),midnight=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();
  const days=Math.round((midnight(date)-midnight(now))/DAY_MS);
  const weekdays=['E diel','E hënë','E martë','E mërkurë','E enjte','E premte','E shtunë'];
  const name=days===0?'Sot':days===1?'Nesër':weekdays[date.getDay()];
  return `${name} · ${relativeDay(value)}`;
 }
  function actionButtonMarkup(kind,attrs=''){
  return `<button type="button" class="at114-check ${kind||''}" ${attrs}><span aria-hidden="true">${kind==='upcoming'?'↗':'✓'}</span></button>`;
 }
 function watchCard(anime,{stale=false,release=null}={}){
  const nx=release?{season:release.season,n:release.n}:ctx.nextEpisode(anime);if(!nx)return'';
  const seasonNo=seasonIndex(anime,nx.season),watched=ctx.count(anime),released=ctx.releasedTotal(anime),backlog=Math.max(0,released-watched),url=poster(anime.cover||''),title=episodeTitle(nx.season,nx.n),touched=lastTouched(anime);
  return `<article class="at114-card at114-watch-card ${stale?'is-stale':''} ${release?'at127-new-episode':''} ${viewMode==='grid'?'is-grid':''}">
   <button type="button" class="at114-cover" data-ios-action="${release?'open-recent':'episode'}" data-id="${esc(anime.id)}" ${release?`data-season="${esc(nx.season.id)}" data-ep="${nx.n}"`:''} aria-label="Hap episodin e radhës për ${esc(anime.title)}">${url?`<img src="${esc(url)}" loading="lazy" referrerpolicy="no-referrer" alt="Posteri i ${esc(anime.title)}">`:'<span>✦</span>'}</button>
   <div class="at114-body">
    <button type="button" class="at114-title-pill" data-ios-action="details" data-id="${esc(anime.id)}">${esc(anime.title)} <span>›</span></button>
    <button type="button" class="at114-copy" data-ios-action="${release?'open-recent':'episode'}" data-id="${esc(anime.id)}" ${release?`data-season="${esc(nx.season.id)}" data-ep="${nx.n}"`:''} aria-label="Vazhdo ${esc(anime.title)} me episodin ${nx.n}">
     <strong class="at114-code">${episodeCode(seasonNo,nx.n,nx.season)}${release?'<span class="at127-new-ep">NEW EP</span>':backlog>1?` <small>+${backlog-1}</small>`:''}</strong>
     <span class="at114-episode-title">${esc(title)}</span>
     <small class="at114-meta">${release?`Episodi i ri doli më ${esc(relativeDay(release.when))}`:stale?`Nuk e ke prekur prej ${Math.max(7,Math.floor((Date.now()-touched)/86400000))} ditësh`:`${watched}/${released} episode · ${ctx.percent(anime)}%`}</small>
    </button>
   </div>
   ${actionButtonMarkup('pending',release?`data-ios-action="mark-recent" data-id="${esc(anime.id)}" data-season="${esc(nx.season.id)}" data-ep="${nx.n}" aria-label="Shëno episodin e ri ${nx.n} si të parë"`:`data-ios-action="advance" data-id="${esc(anime.id)}" aria-label="Shëno episodin ${nx.n} si të parë"`)}
  </article>`;
 }
 function historyCard(item){
  const anime=item.anime,seasonNo=seasonIndex(anime,item.season),url=poster(anime.cover||'');
  return `<article class="at114-card at114-watch-card at114-history-card ${viewMode==='grid'?'is-grid':''}">
   <button type="button" class="at114-cover" data-ios-action="episode-specific" data-id="${esc(anime.id)}" data-season="${esc(item.season.id)}" data-ep="${item.n}" aria-label="Hap ${esc(anime.title)} episodin ${item.n}">${url?`<img src="${esc(url)}" loading="lazy" referrerpolicy="no-referrer" alt="Posteri i ${esc(anime.title)}">`:'<span>✦</span>'}</button>
   <div class="at114-body">
    <button type="button" class="at114-title-pill" data-ios-action="details" data-id="${esc(anime.id)}">${esc(anime.title)} <span>›</span></button>
    <button type="button" class="at114-copy" data-ios-action="episode-specific" data-id="${esc(anime.id)}" data-season="${esc(item.season.id)}" data-ep="${item.n}" aria-label="Rihap ${esc(anime.title)} episodin ${item.n}">
     <strong class="at114-code">${episodeCode(seasonNo,item.n,item.season)}</strong>
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
     <strong class="at114-code">${episodeCode(seasonNo,item.n,item.season)}</strong>
     <span class="at114-episode-title">${esc(item.title)}</span>
     <small class="at114-meta">${esc(new Date(item.when).toLocaleDateString('sq-AL',{weekday:'long',day:'numeric',month:'long'}))} · ${esc(relativeTime(item.when))}</small>
    </button>
   </div>
   <button type="button" class="at117-upcoming-action" data-ios-action="details" data-id="${esc(anime.id)}" aria-label="Shiko detajet dhe orarin e ${esc(anime.title)}"><span aria-hidden="true">◷</span><small>Del së shpejti</small></button>
  </article>`;
 }
 function installCard(){
  if(!ios()||standalone()||dismissed)return'';
  return `<aside class="at-ios-install"><span>✦</span><div><strong>AnimeTrack në iPhone</strong><p>Instaloje në Home Screen për ta hapur si aplikacion, pa shiritin e Safari.</p><button type="button" data-ios-action="install">Si ta instaloj ↗</button></div><button type="button" class="at-ios-dismiss" data-ios-action="dismiss-install" aria-label="Mbyll këshillën">×</button></aside>`;
 }
 function tools(watchCount,upcomingCount,recentCount){
  return `<div class="at114-topbar"><div class="at114-top-tabs" role="group" aria-label="Episodet mobile"><button type="button" class="${tab==='watch'?'active':''}" data-ios-action="tab" data-id="watch" aria-pressed="${tab==='watch'}">PËR T’U PARË</button><button type="button" class="${tab==='released'?'active':''}" data-ios-action="tab" data-id="released" aria-pressed="${tab==='released'}">SAPO DOLËN ${recentCount?'<span class="at124-tab-badge">'+recentCount+'</span>':''}</button><button type="button" class="${tab==='upcoming'?'active':''}" data-ios-action="tab" data-id="upcoming" aria-pressed="${tab==='upcoming'}">SË SHPEJTI</button></div><div class="at114-view-actions" role="group" aria-label="Ndrysho paraqitjen"><button type="button" class="${viewMode==='list'?'active':''}" data-ios-action="mode" data-id="list" aria-pressed="${viewMode==='list'}" aria-label="Pamja listë">◫</button><button type="button" class="${viewMode==='grid'?'active':''}" data-ios-action="mode" data-id="grid" aria-pressed="${viewMode==='grid'}" aria-label="Pamja grid">◧</button></div></div><p class="at114-tab-count" role="status" aria-live="polite">${tab==='watch'?`${watchCount} anime aktive në radhë`:tab==='released'?`${recentCount} episode të transmetuara gjatë 7 ditëve`:`${upcomingCount} episode të planifikuara`}</p>`;
 }
 function renderWatchSection(watch){
  const {active,stale,newEpisodes}=watch,history=watchHistory();
  const listClass=`at114-list ${viewMode==='grid'?'is-grid':''}`;
  const activeMarkup=active.slice(0,limit).map(a=>watchCard(a,{release:newEpisodes.get(a.id)||null})).join('');
  const staleMarkup=stale.slice(0,limit).map(a=>watchCard(a,{stale:true})).join('');
  const historyMarkup=history.slice(0,historyExpanded?Math.min(24,Math.max(limit,8)):2).map(historyCard).join('');
  const helper=active.length<3?`<button type="button" class="at114-helper-card" data-ios-action="discover"><span class="at114-helper-icon">▣</span><span><strong>Shto një titull</strong><small>Shto anime të reja dhe mbaje radhën plot.</small></span><i>›</i></button>`:'';
  const head=(title,count,extra='')=>`<div class="at127-section-head ${extra}"><div><h2>${title}</h2><span class="at127-count">${count}</span></div></div>`;
  return `${history.length?`<div class="at114-center-pill"><button type="button" data-ios-action="toggle-history" aria-expanded="${showHistory}">HISTORIKU I SHIKIMIT</button></div>${showHistory?`<section class="${listClass} at114-history-list">${historyMarkup}</section>${history.length>2?`<button type="button" class="at114-history-more" data-ios-action="expand-history">${historyExpanded?'Shfaq më pak ↑':'Shfaq historikun e plotë ↓'}</button>`:''}`:''}`:''}
   ${head('PO SHIKOJ',active.length)}
   <section class="${listClass} at127-active-list" aria-label="Titujt që po shikon">${activeMarkup||'<div class="at127-empty-active">Asnjë episod aktiv për momentin. Shto një titull ose kontrollo premierat.</div>'}</section>
   ${helper}
   ${stale.length?`${head('S’KE PARË PREJ 7+ DITËSH',stale.length,'at127-stale-head')}<p class="at127-stale-note">Këta tituj mbeten te “Po shikoj” në bibliotekë; vetëm zhvendosen këtu. Pasi të shënosh një episod, kthehen sipër.</p><section class="${listClass} at114-stale-list at127-stale-list" aria-label="Titujt pa aktivitet prej shtatë ditësh">${staleMarkup}</section>`:''}`;
 }
 function renderReleasedSection(){
  const all=recentFeed(),visible=recentFilter==='unseen'?all.filter(x=>!x.watched):all;
  return `<section class="at124-release-hero"><div><span class="at117-kicker">EPISODE TË TRANSMETUARA</span><h2>Sapo dolën <span>✦</span></h2><p>Publikimet e 7 ditëve të fundit nga biblioteka jote. Shëno episodet ose hap detajet pa kaluar te sezoni i parë.</p></div>
   <div class="at124-release-filters" role="group" aria-label="Filtro episodet e transmetuara"><button type="button" data-ios-action="recent-filter" data-id="unseen" aria-pressed="${recentFilter==='unseen'}" class="${recentFilter==='unseen'?'active':''}">● Të papara</button><button type="button" data-ios-action="recent-filter" data-id="all" aria-pressed="${recentFilter==='all'}" class="${recentFilter==='all'?'active':''}">Të gjitha (${all.length})</button><button type="button" data-ios-action="sync">↻ Rifresko</button></div></section>
   <section class="at114-list ${viewMode==='grid'?'is-grid':''} at124-released-list">${visible.slice(0,Math.max(limit,12)).map(recentCard).join('')||`<div class="at-ios-empty"><span>✦</span><h3>${recentFilter==='unseen'?'Je në rregull me episodet e reja!':'Nuk ka publikime të verifikuara gjatë 7 ditëve.'}</h3><p>${recentFilter==='unseen'?'Shiko të gjitha ose kontrollo kalendarin e premierave.':'Datat e transmetimit shfaqen kur janë të disponueshme nga katalogu.'}</p><button type="button" data-ios-action="${recentFilter==='unseen'?'recent-filter':'sync'}" data-id="all">${recentFilter==='unseen'?'Shiko të gjitha →':'Rifresko ↻'}</button></div>`}</section>`;
 }
 function renderUpcomingSection(){
  const items=upcomingFeed();
  const grouped=[];
  let current='';
  for(const item of items.slice(0,Math.max(limit,12))){
   const key=dayHeading(item.when);
   if(key!==current){current=key;grouped.push(`<div class="at114-section-label">${esc(key)}</div>`)}
   grouped.push(upcomingCard(item));
  }
  return `<section class="at117-upcoming-hero"><span class="at117-kicker">ANIMETRACK · PREMIERAT</span><h2>Episodet që po vijnë <span>✦</span></h2><p>Vetëm episode me datë transmetimi në të ardhmen. Orari shfaqet sipas zonës kohore të telefonit.</p><div class="at117-upcoming-controls" role="group" aria-label="Periudha e premierave"><button type="button" data-ios-action="horizon" data-id="7" aria-pressed="${upcomingWindow===7}" class="${upcomingWindow===7?'active':''}">7 ditë</button><button type="button" data-ios-action="horizon" data-id="30" aria-pressed="${upcomingWindow===30}" class="${upcomingWindow===30?'active':''}">30 ditë</button><button type="button" data-ios-action="sync" aria-label="Rifresko oraret">↻ Rifresko</button></div></section><section class="at114-list ${viewMode==='grid'?'is-grid':''} at114-upcoming-list at117-upcoming-timeline">${grouped.join('')||`<div class="at-ios-empty"><span>◷</span><h3>Nuk ka premiera në ${upcomingWindow} ditët e ardhshme</h3><p>Shiko 30 ditët e ardhshme ose rifresko orarin. Nuk shfaqen episode të kaluara si “upcoming”.</p><button type="button" data-ios-action="sync">Rifresko ↻</button></div>`}</section>`;
 }
 function render(){
  const id=ctx.user()?.id||'guest';
  if(lastUser!==id){
   lastUser=id;lastWatch=null;syncMessage='';viewMode='list';tab='watch';showHistory=true;historyExpanded=false;
   try{dismissed=localStorage.getItem(userKey())==='1'}catch{dismissed=false}
  }
  const recent=recentFeed(),watch=splitWatch(recent),soon=upcomingFeed(),unread=ctx.unreadCount?.()||0;
  const name=ctx.accountName().split(/[\s@]/)[0]||'Anime fan';
  const saveInfo=ctx.watchSaveStatus?.()||{};
  const syncText=syncing?'Po kontrollohen episodet…':syncMessage||(!navigator.onLine?'Pa internet · progresi ruhet lokalisht':saveInfo.dirty?'Progresi pret sinkronizimin':saveInfo.mode==='cloud'&&saveInfo.connected?'Biblioteka e sinkronizuar ✓':'Biblioteka ruhet në pajisje');
  const validUndo=lastWatch&&lastWatch.owner===id&&(state().anime||[]).some(a=>a.id===lastWatch.id&&a.seasons?.some(s=>s.id===lastWatch.seasonId&&(s.watched||[]).includes(lastWatch.n)));
  if(lastWatch&&!validUndo)lastWatch=null;
  const feedback=`<div class="at-ios-watch-feedback" role="status" aria-live="polite"><span class="at-ios-sync-dot ${syncing?'busy':saveInfo.dirty?'pending':''}" aria-hidden="true"></span><span>${esc(syncText)}</span>${validUndo?`<button type="button" data-ios-action="undo" aria-label="Zhbëj episodin ${lastWatch.n}">↶ Zhbëj EP ${lastWatch.n}</button>`:''}</div>`;
  const body=tab==='watch'?renderWatchSection(watch):tab==='released'?renderReleasedSection():renderUpcomingSection();
  return `<section class="at-ios-shell at114-shell"><header class="at-ios-header"><div><span class="at-ios-kicker">ANIMETRACK · EPISODE</span><h1>${esc(new Date().getHours()<12?'Mirëmëngjes':new Date().getHours()<18?'Mirëdita':'Mirëmbrëma')}, ${esc(name)} <span>✦</span></h1><p>${watch.all.length?`${watch.all.length} anime me episode për të vazhduar.`:'Historia jote anime, në një vend.'}</p></div><button type="button" class="at124-mobile-search" data-at124-open="1" aria-label="Kërko në AnimeTrack">⌕</button><button class="at11-head-friends" type="button" data-pro-page="friends" aria-label="Kërko dhe shto miq" title="Miqtë">👥<span> Miqtë</span></button><button class="at-ios-bell" data-pro-page="notifications" type="button" aria-label="Hap njoftimet">🔔${unread?`<i>${Math.min(99,unread)}</i>`:''}</button></header>${installCard()}${feedback}${tools(watch.all.length,soon.length,recent.filter(x=>!x.watched).length)}${tab==='watch'?(ctx.dayBrief?.(true)||''):''}${body}${(tab==='watch'&&(watch.active.length>limit||watch.stale.length>limit))||(tab==='released'&&(recentFilter==='unseen'?recent.filter(x=>!x.watched).length:recent.length)>Math.max(limit,12))||(tab==='upcoming'&&soon.length>Math.max(limit,12))?'<button type="button" class="at-ios-more" data-ios-action="more">Shfaq më shumë ↓</button>':''}<div class="at-ios-end"><span>✦</span> Gjithçka që ke shënuar ruhet në bibliotekën tënde.</div></section>`;
 }
 function mount(){
  const home=ctx.el('home-view');if(!home||ctx.el('at-iphone-feed'))return;
  const el=document.createElement('div');el.id='at-iphone-feed';home.insertBefore(el,home.firstChild);document.body.classList.add('at-ios-enabled');
 }
 function refresh(){
  const node=ctx.el('at-iphone-feed');if(!node)return;
  try{window.ATHTML.renderHTML(node,render())}catch(err){console.warn('iPhone feed failed to render',err);window.ATHTML.renderHTML(node,'<section class="at-ios-empty" role="alert"><span>✦</span><h3>Nuk u ngarkuan episodet</h3><p>Mund të ketë një problem të përkohshëm me të dhënat. Provo përsëri ose hap Bibliotekën; progresi yt ruhet.</p><button type="button" data-ios-action="retry">Riprovo ↻</button></section>');}
 }
 async function action(op,id,b){
  const a=(state().anime||[]).find(anime=>anime.id===id);
  if(op==='retry'){refresh();return}
  if(op==='tab'){if(['watch','released','upcoming'].includes(id)){tab=id;limit=10;refresh()}return}
  if(op==='recent-filter'){if(['unseen','all'].includes(id)){recentFilter=id;limit=10;refresh()}return}
  if(op==='open-recent'||op==='mark-recent'){
   if(!a)return;const s=a.seasons.find(x=>x.id===b?.dataset.season),n=Number(b?.dataset.ep);
   if(!s||!Number.isInteger(n)||n<1||n>ctx.released(s))return;
   if(op==='open-recent')ctx.openEpisode(a.id,s.id,n);
   else if(!s.watched.includes(n)){ctx.markEpisode(a.id,s.id,n);if(s.watched.includes(n)){lastWatch={id:a.id,seasonId:s.id,n,owner:ctx.user()?.id||'guest'};syncMessage='Episodi i ri u shënua ✓'}refresh()}
   return;
  }
  if(op==='mode'){if(['list','grid'].includes(id)){viewMode=id;refresh()}return}
  if(op==='horizon'){if(id==='7'||id==='30'){upcomingWindow=Number(id);limit=10;refresh()}return}
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
  if(op==='calendar'){tab='upcoming';refresh();return}
  if(op==='discover'){ctx.navigate('explore');return}
  if(op==='install'){const d=ctx.el('at-ios-install-guide');if(d){d.hidden=false;d.showModal?.()}return}
  if(op==='dismiss-install'){dismissed=true;try{localStorage.setItem(userKey(),'1')}catch{}refresh();return}
 }
 return {mount,refresh,render,action};
};
