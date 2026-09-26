/* AnimeTrack 10.5 — iPhone watch-first feed, shared personal library. */
window.ATiPhone=function ATiPhone(ctx){
 const esc=ctx.esc;
 let tab='pending',limit=20,dismissed=false,lastUser='',lastWatch=null,syncing=false,syncMessage='',searchText='',sortMode='latest';
 const state=()=>ctx.state();
 const userKey=()=>`animetrack_ios_install_${ctx.user()?.id||'guest'}`;
 const ios=()=>/iPhone|iPad|iPod/i.test(navigator.userAgent);
 const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const poster=a=>ctx.poster(a.cover||'');
 const getSeason=(a,n)=>a.seasons?.indexOf(n.season)+1||1;
 const eligible=()=>(state().anime||[]).filter(a=>{try{return a?.status==='watching'&&!!ctx.nextEpisode(a)&&ctx.releasedTotal(a)>ctx.count(a)}catch(err){console.warn('Skipping incomplete anime in iPhone feed',a?.id,err);return false}});
 const pending=()=>eligible().slice().sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
 const recent=()=>{const seen=new Set();return (ctx.recentAiring?.()||[]).filter(x=>{
 const a=x.anime||state().anime.find(a=>a.id===x.animeId),n=Number(x.localEpisode||x.seasonEpisode||x.episode),s=x.localSeason||a?.seasons?.find(s=>s.id===x.seasonId);
 const key=a?.id+':'+s?.id+':'+n;if(!a||!s||!Number.isInteger(n)||n<1||(s.watched||[]).includes(n)||seen.has(key)||!Number.isFinite(Number(x.when)))return false;seen.add(key);return true;
 }).sort((a,b)=>b.when-a.when).slice(0,40)};
 const upcoming=()=>(ctx.upcoming()||[]).filter(x=>x.when>=Date.now()&&x.when<Date.now()+14*86400000&&(state().anime||[]).some(a=>a.id===x.animeId)).sort((a,b)=>a.when-b.when);
 function readyCard(a){
  const nx=ctx.nextEpisode(a),total=ctx.releasedTotal(a),watched=ctx.count(a),remaining=Math.max(0,total-watched),season=getSeason(a,nx),url=poster(a);
  return `<article class="at-ios-episode-card"><button type="button" class="at-ios-cover" data-ios-action="details" data-id="${esc(a.id)}">${url?`<img src="${esc(url)}" loading="lazy" referrerpolicy="no-referrer" alt="Posteri i ${esc(a.title)}">`:'<span>✦</span>'}<span class="at-ios-cover-badge">${remaining} gati</span></button><div class="at-ios-episode-copy"><div class="at-ios-card-eyebrow">RADHA JOTE</div><button type="button" class="at-ios-title" data-ios-action="details" data-id="${esc(a.id)}">${esc(a.title)}</button><strong class="at-ios-next">S${season} · EP ${nx.n}</strong><div class="at-ios-card-progress"><span style="width:${ctx.percent(a)}%"></span></div><small>${watched}/${total} episode · ${ctx.percent(a)}%</small><div class="at-ios-card-actions"><button type="button" data-ios-action="advance" data-id="${esc(a.id)}" class="at-ios-done"><span class="at11-watch-plus" aria-hidden="true">＋</span><span>Shëno EP ${nx.n}<small>Si i parë</small></span><span class="at11-watch-check" aria-hidden="true">✓</span></button><button type="button" data-ios-action="episode" data-id="${esc(a.id)}" class="at-ios-detail">Detajet ↗</button></div></div></article>`;
 }
 function releaseCard(x){
  const a=x.anime||state().anime.find(a=>a.id===x.animeId),s=x.localSeason||a?.seasons.find(s=>s.id===x.seasonId),n=Number(x.localEpisode||x.seasonEpisode||x.episode);
  if(!a||!s||!n)return'';
  const url=poster(a);
  return `<article class="at-ios-release"><div class="at-ios-mini-cover">${url?`<img src="${esc(url)}" loading="lazy" referrerpolicy="no-referrer" alt="">`:'✦'}</div><div class="at-ios-release-copy"><span>${esc(new Date(x.when).toLocaleDateString('sq-AL',{day:'numeric',month:'short'}))} · EPISOD I RI</span><strong>${esc(a.title)}</strong><small>S${a.seasons.indexOf(s)+1} · EP ${n}</small><div><button type="button" data-ios-action="episode-specific" data-id="${esc(a.id)}" data-season="${esc(s.id)}" data-ep="${n}">Detajet</button><button type="button" data-ios-action="mark-specific" data-id="${esc(a.id)}" data-season="${esc(s.id)}" data-ep="${n}">✓ E pashë</button></div></div></article>`;
 }
 function comingCard(e){
  const a=state().anime.find(a=>a.id===e.animeId),s=a?.seasons.find(s=>s.id===e.seasonId);
  if(!a)return'';
  const d=new Date(e.when),url=poster(a);
  return `<article class="at-ios-coming"><span class="at-ios-date"><b>${d.toLocaleDateString('sq-AL',{day:'2-digit'})}</b><small>${d.toLocaleDateString('sq-AL',{month:'short'})}</small></span><span class="at-ios-mini-cover">${url?`<img src="${esc(url)}" loading="lazy" referrerpolicy="no-referrer" alt="">`:'✦'}</span><span class="at-ios-coming-title"><strong>${esc(a.title)}</strong><small>${s?'S'+(a.seasons.indexOf(s)+1)+' · ':''}EP ${esc(e.seasonEpisode||e.episode)} · ${d.toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'})}</small></span><button type="button" data-ios-action="details" data-id="${esc(a.id)}" aria-label="Detajet e ${esc(a.title)}">↗</button></article>`;
 }
 function installCard(){
  if(!ios()||standalone()||dismissed)return'';
  return `<aside class="at-ios-install"><span>✦</span><div><strong>AnimeTrack në iPhone</strong><p>Instaloje në Home Screen për ta hapur si aplikacion, pa shiritin e Safari.</p><button type="button" data-ios-action="install">Si ta instaloj ↗</button></div><button type="button" class="at-ios-dismiss" data-ios-action="dismiss-install" aria-label="Mbyll këshillën">×</button></aside>`;
 }
 function render(){
  const id=ctx.user()?.id||'guest';if(lastUser!==id){lastUser=id;lastWatch=null;syncMessage='';searchText='';sortMode='latest';try{dismissed=localStorage.getItem(userKey())==='1'}catch{dismissed=false}}
  const watch=pending(),released=recent(),soon=upcoming(),unread=ctx.unreadCount?.()||0;
  const name=ctx.accountName().split(/[\s@]/)[0]||'Anime fan';
  const saveInfo=ctx.watchSaveStatus?.()||{},syncText=syncing?'Po kontrollohen episodet…':syncMessage||(!navigator.onLine?'Pa internet · progresi ruhet lokalisht':saveInfo.dirty?'Progresi është në pritje të cloud':saveInfo.mode==='cloud'&&saveInfo.connected?'Biblioteka në cloud ✓':'Biblioteka ruhet në pajisje');
  const validUndo=lastWatch&&lastWatch.owner===id&&(state().anime||[]).some(a=>a.id===lastWatch.id&&a.seasons?.some(s=>s.id===lastWatch.seasonId&&(s.watched||[]).includes(lastWatch.n)));
  if(lastWatch&&!validUndo)lastWatch=null;
  const feedback=`<div class="at-ios-watch-feedback" role="status" aria-live="polite"><span class="at-ios-sync-dot ${syncing?'busy':saveInfo.dirty?'pending':''}" aria-hidden="true"></span><span>${esc(syncText)}</span>${validUndo?`<button type="button" data-ios-action="undo" aria-label="Zhbëj episodin ${lastWatch.n}">↶ Zhbëj EP ${lastWatch.n}</button>`:''}</div>`;
  const tabs=[['pending','Për t’u parë',watch.length],['recent','Sapo dolën',released.length],['upcoming','Së shpejti',soon.length]];
  const needle=searchText.trim().toLocaleLowerCase();
  const sorted=watch.filter(a=>!needle||a.title.toLocaleLowerCase().includes(needle)).sort((a,b)=>sortMode==='az'?a.title.localeCompare(b.title):sortMode==='backlog'?(ctx.releasedTotal(b)-ctx.count(b))-(ctx.releasedTotal(a)-ctx.count(a)):String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
  const visible=tab==='pending'?sorted:tab==='recent'?released.filter(x=>!needle||String(x.anime?.title||state().anime.find(a=>a.id===x.animeId)?.title||'').toLocaleLowerCase().includes(needle)):soon.filter(x=>!needle||String(state().anime.find(a=>a.id===x.animeId)?.title||'').toLocaleLowerCase().includes(needle));
  let content=visible.slice(0,limit).map(tab==='pending'?readyCard:tab==='recent'?releaseCard:comingCard).join('');
  const total=visible.length,totalReady=watch.reduce((n,a)=>n+Math.max(0,ctx.releasedTotal(a)-ctx.count(a)),0),focus=watch[0],next=focus&&ctx.nextEpisode(focus);
  const glance=focus&&next?`<aside class="at112-phone-glance"><span aria-hidden="true">▶</span><div><strong>${totalReady} episode gati për ty</strong><small>Vazhdo me ${esc(focus.title)} · S${getSeason(focus,next)} EP ${next.n}</small></div><button type="button" data-ios-action="episode" data-id="${esc(focus.id)}" aria-label="Hap episodin e radhës për ${esc(focus.title)}">↗</button></aside>`:'';
  const tools=`<div class="at112-phone-tools"><label class="at112-phone-search" for="at112-phone-search"><span aria-hidden="true">⌕</span><input id="at112-phone-search" type="search" inputmode="search" autocomplete="off" placeholder="Kërko në listën tënde" value="${esc(searchText)}" aria-label="Filtro animet sipas titullit"></label><select id="at112-phone-sort" class="at112-phone-sort" aria-label="Rendit animet"><option value="latest" ${sortMode==='latest'?'selected':''}>Të fundit</option><option value="backlog" ${sortMode==='backlog'?'selected':''}>Më shumë EP</option><option value="az" ${sortMode==='az'?'selected':''}>A–Z</option></select></div><p class="at112-phone-results" role="status" aria-live="polite">${needle?`${total} rezultate për “${esc(searchText)}”`:''}</p>`;
  
  return `<section class="at-ios-shell"><header class="at-ios-header"><div><span class="at-ios-kicker">ANIMETRACK · MY WATCHLIST</span><h1>${esc(new Date().getHours()<12?'Mirëmëngjes':new Date().getHours()<18?'Mirëdita':'Mirëmbrëma')}, ${esc(name)} <span>✦</span></h1><p>${watch.length?`${watch.length} anime me episode që të presin.`:'Historia jote anime, në një vend.'}</p></div><button class="at11-head-friends" type="button" data-pro-page="friends" aria-label="Kërko dhe shto miq" title="Miqtë">👥<span> Miqtë</span></button><button class="at-ios-bell" data-pro-page="notifications" type="button" aria-label="Hap njoftimet">🔔${unread?`<i>${Math.min(99,unread)}</i>`:''}</button></header>${installCard()}${feedback}${glance}${ctx.smartWeek?.(true)||''}<div class="at-ios-section-heading"><h2>Çfarë do të shikosh?</h2><button type="button" data-ios-action="sync" aria-label="Rifresko listën dhe orarin" ${syncing?'disabled aria-busy="true"':''}>↻</button></div><div class="at-ios-tabs" role="group" aria-label="Episode dhe premiera">${tabs.map(([key,title,n])=>`<button type="button" class="${tab===key?'active':''}" data-ios-action="tab" data-id="${key}" aria-pressed="${tab===key}">${title} <b>${n}</b></button>`).join('')}</div>${tools}<div class="at-ios-list">${content||`<div class="at-ios-empty"><span>${tab==='upcoming'?'◷':'✦'}</span><h3>${needle?'Nuk u gjet anime me këtë titull.':tab==='pending'?'Je në rregull me episodet!':tab==='recent'?'Nuk ka episode të reja.':'Ende nuk ka premiera të konfirmuara.'}</h3><p>${needle?'Provo një kërkim tjetër ose pastro fushën.':tab==='pending'?'Zbulo një anime dhe shtoje te Po shikoj.':'Rifresko orarin për njoftimet e ardhshme.'}</p><button type="button" data-ios-action="${tab==='pending'?'discover':'sync'}">${tab==='pending'?'Zbulo anime ↗':'Rifresko ↻'}</button></div>`}</div>${total>limit?'<button type="button" class="at-ios-more" data-ios-action="more">Shfaq më shumë ↓</button>':''}<div class="at-ios-end"><span>✦</span> Gjithçka që ke shënuar ruhet në bibliotekën tënde.</div></section>`;
 }
 function mount(){const home=ctx.el('home-view');if(!home||ctx.el('at-iphone-feed'))return;const el=document.createElement('div');el.id='at-iphone-feed';home.insertBefore(el,home.firstChild);document.body.classList.add('at-ios-enabled');
  // Search only changes the feed presentation; never modifies any watch progress.
  home.addEventListener('input',e=>{if(e.target?.id!=='at112-phone-search')return;const start=e.target.selectionStart,end=e.target.selectionEnd;searchText=e.target.value.slice(0,100);limit=20;refresh();const input=ctx.el('at112-phone-search');if(input){input.focus({preventScroll:true});try{input.setSelectionRange(start,end)}catch{}}});
  home.addEventListener('change',e=>{if(e.target?.id==='at112-phone-sort'){sortMode=['latest','backlog','az'].includes(e.target.value)?e.target.value:'latest';refresh()}});
 }
 function refresh(){
  const node=ctx.el('at-iphone-feed');if(!node)return;
  try{node.innerHTML=render()}
  catch(err){
   console.warn('iPhone feed failed to render',err);
   node.innerHTML='<section class="at-ios-empty" role="alert"><span>✦</span><h3>Nuk u ngarkuan episodet</h3><p>Mund të ketë një problem të përkohshëm me të dhënat. Provo përsëri ose hap Bibliotekën; progresi yt ruhet.</p><button type="button" data-ios-action="retry">Riprovo ↻</button></section>';
  }
 }
 async function action(op,id,b){
  const a=state().anime.find(a=>a.id===id);
  if(op==='retry'){refresh();return}
  if(op==='tab'){if(['pending','recent','upcoming'].includes(id)){tab=id;limit=20;refresh()}return}
  if(op==='more'){limit=Math.min(500,limit+20);refresh();return}
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
   const item=(state().anime||[]).find(a=>a.id===old?.id),season=item?.seasons?.find(s=>s.id===old?.seasonId);
   if(old&&old.owner===(ctx.user()?.id||'guest')&&season?.watched?.includes(old.n)&&ctx.undoEpisode?.(old.id,old.seasonId,old.n)){syncMessage='Shënimi u kthye mbrapsht ✓'}
   else {syncMessage='Progresi ka ndryshuar. Nuk u zhbë.'}
   refresh();return;
  }
  if(op==='episode-specific'||op==='mark-specific'){
   if(!a)return;const s=a.seasons.find(s=>s.id===b?.dataset.season),n=Number(b?.dataset.ep);
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
 return{mount,refresh,render,action};
};
