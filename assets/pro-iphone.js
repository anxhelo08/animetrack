/* AnimeTrack 10.5 — iPhone watch-first feed, shared personal library. */
window.ATiPhone=function ATiPhone(ctx){
 const esc=ctx.esc;
 let tab='pending',limit=20,dismissed=false,lastUser='';
 const state=()=>ctx.state();
 const userKey=()=>`animetrack_ios_install_${ctx.user()?.id||'guest'}`;
 const ios=()=>/iPhone|iPad|iPod/i.test(navigator.userAgent);
 const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const poster=a=>ctx.poster(a.cover||'');
 const getSeason=(a,n)=>a.seasons?.indexOf(n.season)+1||1;
 const eligible=()=>state().anime.filter(a=>a.status==='watching'&&ctx.nextEpisode(a)&&ctx.releasedTotal(a)>ctx.count(a));
 const pending=()=>eligible().slice().sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
 const recent=()=>{const seen=new Set();return (ctx.recentAiring?.()||[]).filter(x=>{
 const a=x.anime||state().anime.find(a=>a.id===x.animeId),n=Number(x.localEpisode||x.seasonEpisode||x.episode),s=x.localSeason||a?.seasons?.find(s=>s.id===x.seasonId);
 const key=a?.id+':'+s?.id+':'+n;if(!a||!s||!n||s.watched.includes(n)||seen.has(key))return false;seen.add(key);return true;
 }).sort((a,b)=>b.when-a.when).slice(0,40)};
 const upcoming=()=>ctx.upcoming().filter(x=>x.when>=Date.now()&&x.when<Date.now()+14*86400000&&state().anime.some(a=>a.id===x.animeId)).sort((a,b)=>a.when-b.when);
 function readyCard(a){
  const nx=ctx.nextEpisode(a),total=ctx.releasedTotal(a),watched=ctx.count(a),remaining=Math.max(0,total-watched),season=getSeason(a,nx),url=poster(a);
  return `<article class="at-ios-episode-card"><button type="button" class="at-ios-cover" data-ios-action="details" data-id="${esc(a.id)}">${url?`<img src="${esc(url)}" loading="lazy" referrerpolicy="no-referrer" alt="Posteri i ${esc(a.title)}">`:'<span>✦</span>'}<span class="at-ios-cover-badge">${remaining} gati</span></button><div class="at-ios-episode-copy"><div class="at-ios-card-eyebrow">RADHA JOTE</div><button type="button" class="at-ios-title" data-ios-action="details" data-id="${esc(a.id)}">${esc(a.title)}</button><strong class="at-ios-next">S${season} · EP ${nx.n}</strong><div class="at-ios-card-progress"><span style="width:${ctx.percent(a)}%"></span></div><small>${watched}/${total} episode · ${ctx.percent(a)}%</small><div class="at-ios-card-actions"><button type="button" data-ios-action="advance" data-id="${esc(a.id)}" class="at-ios-done">✓ +1 episod</button><button type="button" data-ios-action="episode" data-id="${esc(a.id)}" class="at-ios-detail">Detajet ↗</button></div></div></article>`;
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
  const id=ctx.user()?.id||'guest';if(lastUser!==id){lastUser=id;try{dismissed=localStorage.getItem(userKey())==='1'}catch{dismissed=false}}
  const watch=pending(),released=recent(),soon=upcoming(),unread=ctx.unreadCount?.()||0;
  const name=ctx.accountName().split(/[\s@]/)[0]||'Anime fan';
  const tabs=[['pending','Për t’u parë',watch.length],['recent','Sapo dolën',released.length],['upcoming','Së shpejti',soon.length]];
  let content=tab==='pending'?watch.slice(0,limit).map(readyCard).join(''):tab==='recent'?released.slice(0,limit).map(releaseCard).join(''):soon.slice(0,limit).map(comingCard).join('');
  const total=tab==='pending'?watch.length:tab==='recent'?released.length:soon.length;
  return `<section class="at-ios-shell"><header class="at-ios-header"><div><span class="at-ios-kicker">ANIMETRACK · MY WATCHLIST</span><h1>${esc(new Date().getHours()<12?'Mirëmëngjes':new Date().getHours()<18?'Mirëdita':'Mirëmbrëma')}, ${esc(name)} <span>✦</span></h1><p>${watch.length?`${watch.length} anime me episode që të presin.`:'Historia jote anime, në një vend.'}</p></div><button class="at-ios-bell" data-pro-page="notifications" type="button" aria-label="Hap njoftimet">♧${unread?`<i>${Math.min(99,unread)}</i>`:''}</button></header>${installCard()}<div class="at-ios-section-heading"><h2>Çfarë do të shikosh?</h2><button type="button" data-ios-action="sync" aria-label="Rifresko listën dhe orarin">↻</button></div><div class="at-ios-tabs" role="group" aria-label="Episode dhe premiera">${tabs.map(([key,title,n])=>`<button type="button" class="${tab===key?'active':''}" data-ios-action="tab" data-id="${key}" aria-pressed="${tab===key}">${title} <b>${n}</b></button>`).join('')}</div><div class="at-ios-list">${content||`<div class="at-ios-empty"><span>${tab==='upcoming'?'◷':'✦'}</span><h3>${tab==='pending'?'Je në rregull me episodet!':tab==='recent'?'Nuk ka episode të reja.':'Ende nuk ka premiera të konfirmuara.'}</h3><p>${tab==='pending'?'Zbulo një anime dhe shtoje te Po shikoj.':'Rifresko orarin për njoftimet e ardhshme.'}</p><button type="button" data-ios-action="${tab==='pending'?'discover':'sync'}">${tab==='pending'?'Zbulo anime ↗':'Rifresko ↻'}</button></div>`}</div>${total>limit?'<button type="button" class="at-ios-more" data-ios-action="more">Shfaq më shumë ↓</button>':''}<div class="at-ios-end"><span>✦</span> Gjithçka që ke shënuar ruhet në bibliotekën tënde.</div></section>`;
 }
 function mount(){const home=ctx.el('home-view');if(!home||ctx.el('at-iphone-feed'))return;const el=document.createElement('div');el.id='at-iphone-feed';home.insertBefore(el,home.firstChild);document.body.classList.add('at-ios-enabled');}
 function refresh(){const node=ctx.el('at-iphone-feed');if(node)node.innerHTML=render()}
 function action(op,id,b){
  const a=state().anime.find(a=>a.id===id);
  if(op==='tab'){if(['pending','recent','upcoming'].includes(id)){tab=id;limit=20;refresh()}return}
  if(op==='more'){limit=Math.min(500,limit+20);refresh();return}
  if(op==='details'){if(a)ctx.openAnime(a.id);return}
  if(op==='episode'){if(a){const n=ctx.nextEpisode(a);if(n)ctx.openEpisode(a.id,n.season.id,n.n)}return}
  if(op==='advance'){if(a&&ctx.nextEpisode(a))ctx.markNext(a.id);return}
  if(op==='episode-specific'||op==='mark-specific'){
   if(!a)return;const s=a.seasons.find(s=>s.id===b?.dataset.season),n=Number(b?.dataset.ep);
   if(!s||!Number.isInteger(n)||n<1)return;
   if(op==='episode-specific')ctx.openEpisode(a.id,s.id,n);
   else if(n<=ctx.released(s)&&!s.watched.includes(n))ctx.markEpisode(a.id,s.id,n);
   return;
  }
  if(op==='sync')return ctx.liveRefresh?.(true).then(()=>refresh());
  if(op==='discover'){ctx.navigate('explore');return}
  if(op==='install'){const d=ctx.el('at-ios-install-guide');if(d){d.hidden=false;d.showModal?.()}return}
  if(op==='dismiss-install'){dismissed=true;try{localStorage.setItem(userKey(),'1')}catch{}refresh();return}
 }
 return{mount,refresh,render,action};
};
