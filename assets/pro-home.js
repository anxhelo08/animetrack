/* AnimeTrack 10.2 — action-oriented home. Legacy home nodes remain mounted for compatibility. */
window.ATHome=function ATHome(ctx){
 const esc=ctx.esc,anime=()=>ctx.state().anime||[],DAY=86400000;
 let sort='recent',selection='',cycle=-1,owner='';
 const prefs=()=>{const s=ctx.state();s.preferences=s.preferences||{};return s.preferences};
 const qids=()=>Array.isArray(prefs().homeQueue)?prefs().homeQueue.filter(x=>typeof x==='string').slice(0,6):[];
 const poster=a=>ctx.poster(a?.cover||'');
 const next=a=>ctx.nextEpisode(a);
 const ready=a=>Math.max(0,ctx.releasedTotal(a)-ctx.count(a));
 const byId=id=>anime().find(x=>x.id===id);
 const dateTime=ms=>new Date(ms).toLocaleDateString('sq-AL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
 const stamp=a=>Date.parse(a?.updatedAt||a?.createdAt||'')||0;
 function syncOwner(){const id=String(ctx.user()?.id||'guest');if(owner!==id){owner=id;selection='';cycle=-1;sort='recent'}}
 function candidates(){return anime().filter(a=>a.status==='watching'&&ready(a)>0&&next(a))}
 function ordered(){
  const xs=candidates().slice();
  if(sort==='few')xs.sort((a,b)=>ready(a)-ready(b)||stamp(b)-stamp(a));
  else if(sort==='finish')xs.sort((a,b)=>ctx.percent(b)-ctx.percent(a)||stamp(b)-stamp(a));
  else if(sort==='favorites')xs.sort((a,b)=>Number(b.favorite)-Number(a.favorite)||stamp(b)-stamp(a));
  else xs.sort((a,b)=>stamp(b)-stamp(a));
  return xs;
 }
 function focus(){
  syncOwner();
  const eligible=ordered();
  return eligible.find(a=>a.id===selection)||qids().map(byId).find(a=>a&&a.status==='watching'&&next(a))||eligible[0]||anime().filter(a=>a.status==='planning')[0]||null;
 }
 function img(a,cls=''){const url=poster(a);return url?`<img class="${cls}" loading="lazy" referrerpolicy="no-referrer" src="${esc(url)}" alt="Posteri i ${esc(a.title)}">`:`<span class="at-h2-poster-empty">✦</span>`}
 function mount(home,recommend,dash){
  if(ctx.el('at-home-main'))return;
  const main=document.createElement('div');main.id='at-home-main';main.innerHTML='<div id="at-home-top"></div><div class="at-h2-top-grid"><section id="at-home-focus" aria-label="Vazhdo shikimin"></section><section id="at-home-session" aria-label="Lista e shikimit"></section></div><section id="at-home-lineup"></section><section id="at-home-releases"></section><section id="at-home-discovery"></section><section id="at-home-brief"></section><section id="at-home-seasons"></section>';
  home.insertBefore(main,home.firstChild);
  home.classList.add('at-home-rebuilt');
  ctx.el('at-home-discovery').append(recommend);
  ctx.el('at-home-brief').append(dash);
 }
 function hero(){
  const h=new Date().getHours(),greeting=h<11?'Mirëmëngjes':h<18?'Mirëdita':'Mirëmbrëma',candidate=focus(),nx=candidate&&next(candidate),count=candidates().length;
  return `<div class="at-h2-hero"><div class="at-h2-hero-copy"><span class="at-h2-kicker"><span class="at-h2-live"></span> MY ANIME SPACE</span><h2>${greeting}! <span>Çfarë do të shikosh sot?</span></h2><p>Vazhdo aty ku e le, organizo sesionin tënd dhe zbulo episodet që të presin — gjithçka në një vend.</p><div class="at-h2-hero-actions"><button type="button" class="at-h2-btn primary" data-home-action="continue">▶ Vazhdo shikimin</button><button type="button" class="at-h2-btn" data-pro-page="recommendations">✦ Zbulo anime</button><button type="button" class="at-h2-btn subtle" data-pro-page="calendar">📅 Kalendari</button></div></div><div class="at-h2-hero-aside"><div class="at-h2-mini-label">RADHA JOTE</div><strong>${candidate?esc(candidate.title):'Fillo historinë tënde'}</strong><span>${nx?'S'+(candidate.seasons.indexOf(nx.season)+1)+' · Episodi '+nx.n:count?count+' anime me episode gati':'Zgjidh një anime nga biblioteka'}</span><div class="at-h2-hero-aside-foot"><span>✦ Personalizuar për ty</span><button data-home-action="continue" type="button">Hap →</button></div></div></div>`;
 }
 function quickActions(){
  const info=ctx.liveStatus?.()||{},status=info.busy?'Po kontrollohen të dhënat…':info.failed?'Disa burime nuk u arritën':info.at?'Orari u kontrollua '+dateTime(info.at):'Orari ende pa kontroll';
  return `<div class="at-h4-shortcuts"><div class="at-h4-shortcut-list"><button type="button" data-home-action="lineup-scroll">▶ Po shikoj</button><button type="button" data-home-action="recent-scroll">● Sapo dolën</button><button type="button" data-pro-page="recommendations">✦ Për ty</button><button type="button" data-pro-page="calendar">◷ Kalendari</button></div><div class="at-h4-sync"><span class="at-h4-sync-dot" aria-hidden="true"></span><span>${esc(status)} · Përditësim automatik kur aplikacioni është aktiv</span><button type="button" data-home-action="sync-now" aria-label="Kontrollo tani për episode dhe të dhëna të reja">↻ Kontrollo</button></div></div>`;
 }
 function feature(){
  const a=focus();if(!a)return `<div class="at-h3-feature at-h3-feature-empty"><span class="at-h2-kicker">UP NEXT</span><h3>Historia jote nis këtu ✦</h3><p>Kërko një anime dhe vendose te “Po shikoj”. AnimeTrack do ta mbajë mend automatikisht episodin ku e le.</p><button type="button" class="at-h2-btn primary" data-home-action="find">⌕ Kërko një anime</button></div>`;
  const nx=next(a),seas=nx?a.seasons.indexOf(nx.season)+1:null,pct=ctx.percent(a),n=ctx.count(a),total=ctx.releasedTotal(a),left=ready(a),hasNext=!!nx;
  const season=nx?.season,available=season?ctx.released(season):0,episodePills=[];
  if(nx&&season)for(let ep=nx.n;ep<=Math.min(available,nx.n+3);ep++)episodePills.push(`<button type="button" class="at-h3-ep-pill ${ep===nx.n?'next':''}" data-home-action="open-release" data-id="${esc(a.id)}" data-season="${esc(season.id)}" data-ep="${ep}"><span>EP</span><b>${ep}</b>${ep===nx.n?'<small>RADHA</small>':''}</button>`);
  return `<article class="at-h3-feature">
   <div class="at-h3-feature-visual">${img(a)}<span class="at-h3-feature-gradient"></span><div class="at-h3-feature-over"><span class="at-h2-kicker">VAZHDO NGA KU E LE</span><h3>${esc(a.title)}</h3><div class="at-h3-feature-badges"><span>▶ ${left} ${left===1?'episod':'episode'} gati</span>${a.favorite?'<span>♥ Favorite</span>':''}</div></div></div>
   <div class="at-h3-feature-panel">
    <div class="at-h3-nextline"><div><small>EPISODI I RADHËS</small><strong>${hasNext?`Sezoni ${seas} · Episodi ${nx.n}`:'Nuk ka episod të radhës'}</strong></div><b>${total?pct+'%':'—'}</b></div>
    <div class="at-h3-progress"><span style="width:${Math.max(0,Math.min(100,pct))}%"></span></div>
    <div class="at-h3-progress-copy"><span>${n} të parë</span><span>${left} për t’u parë</span><span>${total||'?'} të transmetuar</span></div>
    ${episodePills.length?`<div class="at-h3-episode-strip" aria-label="Episode të ardhshme">${episodePills.join('')}</div>`:''}
    <div class="at-h3-feature-actions">${hasNext?`<button type="button" class="at-h3-watch-btn" data-home-action="open-next" data-id="${esc(a.id)}">▶ Hap episodin ${nx.n}</button><button type="button" class="at-h3-check-btn" data-home-action="mark-next" data-id="${esc(a.id)}">✓ E pashë</button>`:`<button type="button" class="at-h3-watch-btn" data-home-action="open-anime" data-id="${esc(a.id)}">Hap animen →</button>`}<button type="button" class="at-h3-more-btn" data-home-action="open-anime" data-id="${esc(a.id)}" aria-label="Më shumë detaje">•••</button></div>
   </div>
  </article>`;
 }
 function session(){
  const queued=qids().map(byId).filter(Boolean),eligible=ordered();
  return `<div class="at-h2-session"><div class="at-h2-section-title"><div><span class="at-h2-kicker">YOUR WATCH SESSION</span><h3>🎬 Sesioni im</h3><p>Zgjidh deri në 6 anime për t’i pasur gati.</p></div><button type="button" class="at-h2-plain" data-home-action="surprise" ${eligible.length?'':'disabled'}>🎲 Më surprizo</button></div><div class="at-h2-session-list">${queued.length?queued.map((a,i)=>`<div class="at-h2-session-row"><span class="at-h2-session-num">${String(i+1).padStart(2,'0')}</span><button type="button" class="at-h2-session-cover" data-home-action="choose" data-id="${esc(a.id)}">${img(a)}</button><button type="button" class="at-h2-session-name" data-home-action="choose" data-id="${esc(a.id)}"><strong>${esc(a.title)}</strong><small>${next(a)?`S${a.seasons.indexOf(next(a).season)+1} · E${next(a).n}`:ready(a)?ready(a)+' episode gati':'Hap sezonet'}</small></button><button type="button" class="at-h2-row-remove" data-home-action="queue-toggle" data-id="${esc(a.id)}" aria-label="Hiqe ${esc(a.title)} nga sesioni">×</button></div>`).join(''):`<div class="at-h2-session-empty"><span>✦</span><strong>Sesioni yt është bosh</strong><p>Shto anime nga “Gati për t’u parë” për të krijuar listën e mbrëmjes.</p></div>`}</div><div class="at-h2-session-foot"><span>${queued.length}/6 anime</span>${queued.length?'<button data-home-action="queue-clear" type="button">Pastro listën</button>':'<button data-home-action="lineup-scroll" type="button">Zgjidh nga Watching ↓</button>'}</div></div>`;
 }
 function lineup(){
  const list=ordered(),filters=[['recent','Së fundmi'],['few','Pak episode'],['finish','Afër përfundimit'],['favorites','♥ Favorites']];
  return `<div class="at-h2-section-head" id="at-h2-lineup-anchor"><div><span class="at-h2-kicker">READY TO WATCH</span><h3>Vazhdo shikimin <span>${list.length} anime</span></h3><p>Zgjidh çfarë të shikosh ose shëno episodin pas përfundimit.</p></div><button class="at-h2-plain" type="button" data-home-action="watching">Të gjitha te Watching ↗</button></div><div class="at-h2-filter-row" role="group" aria-label="Rendit anime">${filters.map(([id,label])=>`<button class="${sort===id?'active':''}" type="button" data-home-action="sort" data-id="${id}" aria-pressed="${sort===id}">${label}</button>`).join('')}</div>${list.length?`<div class="at-h2-lineup-grid">${list.slice(0,6).map(a=>{const nx=next(a);return `<article class="at-h2-lineup-card"><button type="button" class="at-h2-lineup-poster" data-home-action="open-next" data-id="${esc(a.id)}">${img(a)}<span>${ready(a)} gati</span></button><div class="at-h2-lineup-info"><button type="button" class="at-h2-lineup-name" data-home-action="open-anime" data-id="${esc(a.id)}">${esc(a.title)}</button><div class="at-h4-next-info"><span class="at-h4-ep-label">KU E KE LËNË</span><strong>S${a.seasons.indexOf(nx.season)+1} · EP ${nx.n}</strong><span class="at-h4-remaining">${ready(a)} episode gati · ${ctx.percent(a)}%</span></div><div class="at-h2-lineup-actions"><button type="button" class="at-h4-advance" data-home-action="advance-next" data-id="${esc(a.id)}" aria-label="Shëno episodin ${nx.n} të ${esc(a.title)} si të parë">✓ +1 episod</button><button type="button" class="at-h4-details" data-home-action="open-next" data-id="${esc(a.id)}" aria-label="Hap detajet e episodit ${nx.n}">▶ Detaje</button><button type="button" data-home-action="queue-toggle" data-id="${esc(a.id)}" aria-label="${qids().includes(a.id)?'Hiqe nga sesioni':'Shto në sesion'}">${qids().includes(a.id)?'✓':'+'}</button></div></div></article>`}).join('')}</div>`:'<div class="at-h2-inline-empty">Nuk ke episode të tjera të transmetuara te “Po shikoj”. Kontrollo kalendarin ose zbulo një anime të re. <button type="button" data-pro-page="recommendations">Zbulo anime →</button></div>'}`;
 }
 function releases(){
  const now=Date.now(),byKey=new Map();
  for(const x of ctx.recentAiring?.()||[]){
   const a=x.anime||byId(x.animeId),s=x.localSeason,n=Number(x.localEpisode||x.seasonEpisode||x.episode);
   if(!a||!Number.isInteger(n)||n<1)continue;
   const key=a.id+'|'+(s?.id||x.season||'')+'|'+n;
   byKey.set(key,{e:x,a,s,n,seen:!!x.seen});
  }
  for(const e of ctx.upcoming()){
   if(!e?.animeId||e.when>now||e.when<now-7*DAY)continue;
   const a=byId(e.animeId),s=a?.seasons?.find(s=>s.id===e.seasonId),n=Number(e.seasonEpisode||e.episode);
   if(!a||!Number.isInteger(n)||n<1)continue;
   const key=a.id+'|'+(s?.id||e.season||'')+'|'+n,seen=!!s?.watched?.includes(n);
   const prev=byKey.get(key);
   if(!prev||e.when>prev.e.when)byKey.set(key,{e,a,s,n,seen});
  }
  const rows=[...byKey.values()].filter(x=>!x.seen).sort((x,y)=>y.e.when-x.e.when).slice(0,4);
  return `<div class="at-h2-section-head"><div><span class="at-h2-kicker"><span class="at-h2-live"></span> JUST AIRED</span><h3>Sapo dolën</h3><p>Episode nga biblioteka jote gjatë 7 ditëve të fundit.</p></div><button type="button" class="at-h2-plain" data-pro-page="calendar">Kalendari ↗</button></div>${rows.length?`<div class="at-h2-release-grid">${rows.map(({e,a,s,n})=>`<article class="at-h2-release-card"><div class="at-h2-release-art">${img(a)}</div><div class="at-h2-release-body"><span class="at-h2-kicker">● I RI · ${esc(dateTime(e.when))}</span><strong>${esc(a.title)}</strong><small>${esc(e.season||s?.title||'')} · EP ${n}</small><div><button data-home-action="open-release" data-id="${esc(a.id)}" data-season="${esc(s?.id||'')}" data-ep="${n}" type="button">Detajet ↗</button>${s&&n<=ctx.released(s)?`<button data-home-action="mark-release" data-id="${esc(a.id)}" data-season="${esc(s.id)}" data-ep="${n}" type="button">✓ I parë</button>`:''}</div></div></article>`).join('')}</div>`:'<div class="at-h2-inline-empty">Nuk ka episode të reja të pashënuara me datë të verifikuar. Rifresko orarin për të kontrolluar publikimet. <button type="button" data-home-action="refresh-airing">↻ Rifresko</button></div>'}`;
 }
 function seasons(){
  const seasons=anime().filter(a=>a.status==='completed').flatMap(a=>(a.seasons||[]).filter(s=>s.releaseStatus==='NOT_YET_RELEASED'&&s.discoveredAt).map(s=>({a,s}))).slice(0,3);
  return `<div class="at-h2-season-header"><div><span class="at-h2-kicker">WHAT'S NEXT</span><h3>✦ Vazhdime në horizont</h3><p>Sezone të zbuluara në bibliotekën tënde.</p></div><button type="button" data-home-action="waiting">Në pritje →</button></div><div class="at-h2-season-list">${seasons.length?seasons.map(({a,s})=>`<button type="button" data-home-action="open-anime" data-id="${esc(a.id)}"><span class="at-h2-season-thumb">${img(a)}</span><span><strong>${esc(a.title)}</strong><small>${esc(s.subtitle||s.title)} · ${s.releaseStart?esc(s.releaseStart):'Data ende pa njoftim'}</small></span><span>↗</span></button>`).join(''):'<p class="at-h2-season-empty">Kur të konfirmohet një vazhdim në bibliotekën tënde, do të shfaqet këtu.</p>'}</div>`;
 }
 function render(){return {hero:hero()+quickActions(),feature:feature(),session:session(),lineup:lineup(),releases:releases(),seasons:seasons()}}
 function scrollLineup(){ctx.el('at-h2-lineup-anchor')?.scrollIntoView({behavior:'smooth',block:'start'})}
 function action(op,id,b){
  syncOwner();const a=byId(id);
  if(op==='find'){ctx.navigate('explore');return}
  if(op==='watching'){ctx.openFilter('watching');return}
  if(op==='waiting'){ctx.openFilter('waiting');return}
  if(op==='continue'){const x=focus();if(x){selection=x.id;const n=next(x);if(n)ctx.openEpisode(x.id,n.season.id,n.n);else ctx.openAnime(x.id)}else ctx.navigate('explore');return}
  if(op==='open-anime'){if(a)ctx.openAnime(a.id);return}
  if(op==='open-next'){const n=a&&next(a);if(n)ctx.openEpisode(a.id,n.season.id,n.n);else if(a)ctx.openAnime(a.id);return}
  if(op==='mark-next'||op==='advance-next'){if(a&&next(a))ctx.markNext(a.id);return}
  if(op==='sort'){if(['recent','few','finish','favorites'].includes(id)){sort=id;ctx.rerender()}return}
  if(op==='choose'){if(a){selection=a.id;ctx.rerender()}return}
  if(op==='surprise'){const list=candidates();if(!list.length)return;cycle=(cycle+1)%list.length;selection=list[cycle].id;ctx.rerender();ctx.el('at-home-focus')?.scrollIntoView({behavior:'smooth',block:'center'});return}
  if(op==='queue-toggle'){if(!a)return;let ids=qids();if(ids.includes(a.id))ids=ids.filter(x=>x!==a.id);else if(ids.length>=6){ctx.toast('Sesioni lejon deri në 6 anime.');return}else ids.push(a.id);prefs().homeQueue=ids;ctx.save();ctx.rerender();return}
  if(op==='queue-clear'){prefs().homeQueue=[];ctx.save();ctx.rerender();return}
  if(op==='lineup-scroll'){scrollLineup();return}
  if(op==='recent-scroll'){ctx.el('at-home-releases')?.scrollIntoView({behavior:'smooth',block:'start'});return}
  if(op==='open-release'||op==='mark-release'){
   if(!a)return;const season=a.seasons.find(s=>s.id===b?.dataset.season),n=Number(b?.dataset.ep);
   if(op==='open-release'){if(season&&n>0)ctx.openEpisode(a.id,season.id,n);else ctx.openAnime(a.id)}
   else if(season&&n>0&&n<=ctx.released(season)&&!season.watched.includes(n))ctx.markEpisode(a.id,season.id,n);
   return;
  }
  if(op==='refresh-airing')return ctx.refreshAiring();
 }
 return{mount,render,action,focus};
};
