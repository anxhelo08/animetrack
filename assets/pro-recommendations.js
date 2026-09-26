/* AnimeTrack 10.0 — personal discovery, mood and time filters, explainable matches. */
window.ATRecommendations=function ATRecommendations(ctx){
 const esc=ctx.esc;
 const MOODS=[
  ['all','✦','Të gjitha',[]],
  ['action','⚔','Adrenalinë',['action','adventure','sports']],
  ['mind','🧩','Mister',['mystery','psychological','thriller','suspense','sci-fi']],
  ['chill','🌿','Relaks',['slice of life','iyashikei','music','romance']],
  ['laugh','😄','Humor',['comedy']],
  ['emotion','💗','Emocion',['drama','romance','fantasy']]
 ];
 const LENGTHS=[['all','Çdo gjatësi'],['short','Deri 12 ep.'],['normal','13–26 ep.'],['long','27+ ep.'],['movie','Filma']];
 const TABS=[['personal','✨ Për ty'],['gems','💎 Nën radar'],['quick','⚡ Shiko shpejt'],['movies','🎬 Filma'],['surprise','🎲 Më surprizo']];
 let owner='',candidates=[],items=[],loading=false,error='',mood='all',length='all',tab='personal',limit=12,hidden=new Set(),fetchedAt=0,surpriseIndex=0,profileName='',source='AniList',requestId=0;
 const storageKey=()=>`animetrack_recs_v10_${ctx.user()?.id||'guest'}`;
 const preferencesKey=()=>`animetrack_rec_prefs_v10_${ctx.user()?.id||'guest'}`;
 const getStore=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
 const setStore=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
 function profile(){
  const taste=new Map(),negative=new Map(),faves=[];
  for(const a of ctx.state().anime||[]){
   const rating=Number(a.rating),hasRating=a.rating!=null&&Number.isFinite(rating)&&rating>0;
   const weight=(a.favorite?3.5:0)+(hasRating?Math.max(-2,(rating-5)*0.65):0.7)+(a.status==='completed'?0.3:0);
   if(a.favorite||rating>=8)faves.push(a.title);
   for(const g of ctx.genres(a)){
    const key=String(g).toLowerCase().trim();
    if(!key)continue;
    if(a.status==='dropped'&&hasRating&&rating<=4)negative.set(key,(negative.get(key)||0)+2);
    else taste.set(key,(taste.get(key)||0)+Math.max(0.2,weight));
   }
  }
  const best=[...taste].sort((a,b)=>b[1]-a[1]);
  return {taste,negative,best,top:best.slice(0,4).map(x=>x[0]),faves:faves.slice(0,10),personal:best.length>0};
 }
 function known(){
  const ids=new Set(),roots=new Set();
  for(const a of ctx.state().anime||[]){
   roots.add(ctx.seriesRoot(a.title));
   if(a.source==='AniList'&&a.sourceId)ids.add('al:'+a.sourceId);
   if(a.malId)ids.add('mal:'+a.malId);
   for(const s of a.seasons||[]){
    if(s.source==='AniList'&&s.sourceId)ids.add('al:'+s.sourceId);
    if(s.malId)ids.add('mal:'+s.malId);
   }
  }
  return {ids,roots};
 }
 function itemFromRemote(m){
  const x=ctx.mapAniList(m);
  return {...x,popularity:Number(m.popularity)||0,rawGenres:(m.genres||[]).map(g=>String(g).toLowerCase()),related:(m.relations?.edges||[]).filter(e=>['PREQUEL','SEQUEL','PARENT'].includes(e.relationType)).map(e=>({id:e.node?.id,malId:e.node?.idMal})),match:0,why:[]};
 }
 function candidateScore(x,p){
  const matches=x.rawGenres.map(g=>[g,p.taste.get(g)||0]).filter(v=>v[1]>0).sort((a,b)=>b[1]-a[1]);
  const overlap=matches.reduce((n,v)=>n+v[1],0);
  const total=p.best.slice(0,6).reduce((n,v)=>n+v[1],0)||1;
  const affinity=Math.min(1,overlap/Math.max(1,total*0.62));
  const penalty=x.rawGenres.reduce((n,g)=>n+(p.negative.get(g)||0),0);
  const rating=x.score==null?65:Number(x.score);
  let value=affinity*58+Math.max(0,Math.min(100,rating))*0.25+Math.min(10,Math.log10(x.popularity+1)*2)-penalty*4;
  if(p.personal&&matches.length===0)value-=17;
  if(x.format==='MOVIE')value+=2;
  const match=p.personal?Math.max(12,Math.min(98,Math.round(38+affinity*53-penalty*6))):null;
  let why=matches.slice(0,2).map(([g])=>g);
  if(!why.length)why=[rating>=80?'Vlerësuar nga komuniteti':'Zbulim i ri'];
  if(p.faves.length&&matches.length)why.push('Nga shijet e tua');
  return {...x,rank:value,match,why};
 }
 function uniqueRanked(pool,p){
  const k=known(),groups=new Map();
  for(const x of pool){
   if(!x?.key||!x.title||ctx.inLibrary(x))continue;
   const root=ctx.seriesRoot(x.title);
   if(k.roots.has(root)||hidden.has('series:'+root)||hidden.has(x.key))continue;
   if(k.ids.has('al:'+x.sourceId)||(x.malId&&k.ids.has('mal:'+x.malId)))continue;
   if(x.related?.some(r=>k.ids.has('al:'+r.id)||(r.malId&&k.ids.has('mal:'+r.malId))))continue;
   const ranked=candidateScore(x,p);
   const prior=groups.get(root);
   if(!prior||ranked.rank>prior.rank+3||(Math.abs(ranked.rank-prior.rank)<=3&&Number(ranked.year||9999)<Number(prior.year||9999)))groups.set(root,ranked);
  }
  const arr=[...groups.values()].sort((a,b)=>b.rank-a.rank||b.popularity-a.popularity);
  // Diversity: do not fill an entire row with near-identical genres.
  const result=[],recent=[];
  for(const x of arr){
   const primary=x.rawGenres[0]||'other';
   const same=recent.slice(-3).filter(y=>y===primary).length;
   if(same>=2)continue;
   result.push(x);recent.push(primary);
  }
  return result.length>=12?result:arr;
 }
 function filtered(){
  let data=items.slice(), selectedMood=MOODS.find(m=>m[0]===mood);
  if(mood!=='all')data=data.filter(x=>x.rawGenres.some(g=>selectedMood[3].includes(g)));
  if(length!=='all')data=data.filter(x=>{
   if(length==='movie')return x.format==='MOVIE';
   if(x.format==='MOVIE')return false;
   const n=Number(x.total);
   return n>0&&(length==='short'?n<=12:length==='normal'?n>=13&&n<=26:n>=27);
  });
  if(tab==='gems'){
   const pops=items.map(x=>x.popularity).filter(Boolean).sort((a,b)=>a-b);
   const ceiling=pops[Math.floor(pops.length*.48)]||50000;
   data=data.filter(x=>x.popularity>0&&x.popularity<=ceiling&&Number(x.score)>=72).sort((a,b)=>b.rank-a.rank);
  }
  if(tab==='quick')data=data.filter(x=>x.format==='MOVIE'||(x.total>0&&x.total<=12));
  if(tab==='movies')data=data.filter(x=>x.format==='MOVIE');
  if(tab==='surprise')return data.length?[data[surpriseIndex%data.length]]:[];
  return data;
 }
 function safeDescription(x){return String(x.synopsis||'Përshkrimi nuk është i disponueshëm.').replace(/\s+/g,' ').slice(0,155)}
 function card(x){
  const src=ctx.poster(x.cover),meta=[x.year||'Viti ?',x.format==='MOVIE'?'Film':x.total?x.total+' ep.':'Në vazhdim'].join(' · ');
  return `<article class="pro-rec pro-rec-v10">
   <button type="button" class="pro-rec-poster" data-pro-action="preview-recommendation" data-key="${esc(x.key)}" aria-label="Shiko detajet e ${esc(x.title)}">${src?`<img src="${esc(src)}" alt="Posteri i ${esc(x.title)}" loading="lazy" referrerpolicy="no-referrer">`:'<span class="pro-rec-placeholder">✦</span>'}<span class="pro-rec-score">★ ${x.score==null?'—':(Number(x.score)/10).toFixed(1)}</span></button>
   <div class="pro-rec-body"><div class="pro-rec-kicker">${x.match==null?'ZBULIM I RI':'PËRPUTHJE · '+x.match+'%'}</div>
   <button type="button" class="pro-rec-title" data-pro-action="preview-recommendation" data-key="${esc(x.key)}">${esc(x.title)}</button>
   <small class="pro-rec-meta">${esc(meta)}</small><p class="pro-rec-synopsis">${esc(safeDescription(x))}</p>
   <div class="pro-tags">${x.why.slice(0,2).map(t=>`<span class="pro-tag">${esc(t)}</span>`).join('')}</div>
   <p class="pro-rec-why"><b>Pse kjo?</b> ${esc(x.why.join(' · '))}</p>
   <div class="pro-rec-actions"><button type="button" class="pro-btn primary" data-pro-action="add-recommendation" data-key="${esc(x.key)}">＋ Në listë</button><button type="button" class="pro-btn pro-rec-hide" data-pro-action="hide-recommendation" data-key="${esc(x.key)}" aria-label="Nuk më intereson ${esc(x.title)}" title="Mos ma sugjero përsëri">✕</button></div></div>
  </article>`;
 }
 function render(){
  const p=profile(),visible=filtered(),count=visible.length;
  return `<section class="pro-hero pro-discovery-hero"><div><span class="pro-eyebrow">ANIMETRACK DISCOVERY · 10.0</span><h2>✨ Gjej animen tënde të radhës</h2><p>${p.personal?`Sugjerime nga ${esc(p.best.slice(0,3).map(x=>x[0]).join(' · '))}, notat dhe të preferuarat e tua.`:'Edhe nëse je i ri, mund të zbulosh anime me vlerësime të mira. Shto dhe vlerëso anime për rekomandime personale.'}</p><div class="pro-discovery-stats"><span>✦ ${items.length} tituj të përzgjedhur</span><span>◷ ${fetchedAt?new Date(fetchedAt).toLocaleDateString('sq-AL'):'Duke u përgatitur'}</span></div></div></section>
  <section class="pro-panel pro-discovery-controls" aria-label="Personalizo rekomandimet"><div class="pro-row"><h3>Çfarë ke qejf sot?</h3><button class="pro-btn" data-pro-action="refresh-recommendations" ${loading?'disabled':''}>↻ ${loading?'Po kërkoj…':'Tituj të rinj'}</button></div>
  <div class="pro-rec-chips">${MOODS.map(m=>`<button type="button" class="pro-rec-chip ${mood===m[0]?'active':''}" data-pro-action="rec-mood" data-id="${m[0]}" aria-pressed="${mood===m[0]}">${m[1]} ${m[2]}</button>`).join('')}</div>
  <label class="pro-field pro-rec-length">Sa kohë ke?<select class="pro-select" id="pro-rec-length">${LENGTHS.map(l=>`<option value="${l[0]}" ${length===l[0]?'selected':''}>${l[1]}</option>`).join('')}</select></label>
  <div class="pro-rec-chips pro-rec-tabs" role="group" aria-label="Kategoria e rekomandimeve">${TABS.map(t=>`<button type="button" class="pro-rec-chip ${tab===t[0]?'active':''}" data-pro-action="rec-tab" data-id="${t[0]}" aria-pressed="${tab===t[0]}">${t[1]}</button>`).join('')}</div></section>
  <div class="pro-row pro-rec-results"><div><h3>${esc(TABS.find(t=>t[0]===tab)?.[1]||'Për ty')}</h3><p class="pro-muted">${count} rezultate · Përputhja është tregues orientues nga shijet e tua, jo garanci.</p></div><div class="pro-actions">${hidden.size?`<button class="pro-btn" data-pro-action="restore-recommendations">Rikthe të fshehurat (${hidden.size})</button>`:''}${tab==='surprise'?'<button class="pro-btn primary" data-pro-action="rec-surprise">🎲 Tjetër surprizë</button>':''}</div></div>
  ${error?`<p class="pro-rec-error" role="status">${esc(error)} <button class="pro-btn" data-pro-action="refresh-recommendations">Provo përsëri</button></p>`:''}
  ${loading&&!items.length?'<div class="pro-rec-loading-grid"><div class="pro-loading"></div><div class="pro-loading"></div><div class="pro-loading"></div></div>':count?`<div class="pro-rec-grid">${visible.slice(0,limit).map(card).join('')}</div>${count>limit?'<div class="pro-rec-more"><button class="pro-btn primary" data-pro-action="more-recommendations">Shfaq më shumë ↓</button></div>':''}`:`<div class="pro-empty"><b>${loading?'Po kërkoj titujt…':'Nuk ka sugjerime për këta filtra.'}</b><p>Provo një humor tjetër, ndrysho gjatësinë ose rifresko katalogun.</p><button class="pro-btn primary" data-pro-action="reset-recommendation-filters">Hiq filtrat</button></div>`}
  <p class="pro-muted pro-rec-source">Burimi: ${esc(source)}. Përshkrimet dhe notat janë nga katalogu; lista personale dhe anime të fshehura mbeten të ndara për çdo llogari në këtë shfletues.</p>`;
 }
 function home(){
 const p=profile(),featured=items.filter(x=>!ctx.inLibrary(x)).slice(0,4);
 const short=x=>String(x.synopsis||'').replace(/\s+/g,' ').slice(0,88);
 const tile=x=>{
  const src=ctx.poster(x.cover);
  return `<article class="at-home-pick"><button class="at-home-pick-art" type="button" data-pro-action="preview-recommendation" data-key="${esc(x.key)}" aria-label="Hap ${esc(x.title)}">${src?`<img src="${esc(src)}" alt="Posteri i ${esc(x.title)}" loading="lazy" referrerpolicy="no-referrer">`:'<span>✦</span>'}</button><div class="at-home-pick-info"><div class="at-home-pick-kicker"><span>${x.match==null?'ZBULIM I RI':'✦ '+x.match+'% PËRPUTHJE'}</span><b>★ ${x.score==null?'—':(Number(x.score)/10).toFixed(1)}</b></div><button class="at-home-pick-title" type="button" data-pro-action="preview-recommendation" data-key="${esc(x.key)}">${esc(x.title)}</button><p class="at-home-pick-description">${esc(short(x))}</p><small>${esc(x.year||'')} · ${esc(x.format==='MOVIE'?'Film':x.total?x.total+' episode':'Anime')} · ${esc(x.why.slice(0,1).join(''))}</small><div class="at-home-pick-actions"><button type="button" class="pro-btn primary" data-pro-action="add-recommendation" data-key="${esc(x.key)}">+ Në listë</button><button type="button" class="at-home-pick-more" data-pro-action="preview-recommendation" data-key="${esc(x.key)}">Detajet ↗</button></div></div></article>`;
 };
 return `<div class="at-home-rec-header"><div><span class="pro-eyebrow">CURATED FOR YOU</span><h3>✨ Rekomandime për ty</h3><p>${p.personal?'Zgjedhje nga zhanret dhe vlerësimet e tua.':'Zbulo diçka të re nga katalogu anime.'}</p></div><button class="pro-btn at-home-rec-discover" data-pro-page="recommendations">Eksploro të gjitha ↗</button></div>${featured.length?`<div class="at-home-rec-grid">${featured.map(tile).join('')}</div>`:'<div class="at-home-rec-empty"><span>✦</span><p>Rekomandimet po përgatiten sipas bibliotekës tënde.</p><button class="pro-btn" data-pro-page="recommendations">Hap zbulimet →</button></div>'}`;
}
 function trending(){return items.filter(x=>!ctx.inLibrary(x)).slice().sort((a,b)=>b.popularity-a.popularity).slice(0,8).map(x=>{const src=ctx.poster(x.cover);return `<button type="button" class="at117-trending-card" data-pro-action="preview-recommendation" data-key="${esc(x.key)}" aria-label="Hap ${esc(x.title)}">${src?`<img src="${esc(src)}" alt="Posteri i ${esc(x.title)}" loading="lazy" referrerpolicy="no-referrer">`:'<span>✦</span>'}<strong>${esc(x.title)}</strong><small>${x.score==null?'AniList':`★ ${(Number(x.score)/10).toFixed(1)}`} · ${Number(x.popularity).toLocaleString('sq-AL')} ndjekës në AniList</small></button>`}).join('')}
 function rerank(){items=uniqueRanked(candidates,profile());ctx.rerender()}
 function switchOwner(){
  const id=String(ctx.user()?.id||'guest');
  if(owner===id)return;
  owner=id;candidates=[];items=[];loading=false;fetchedAt=0;error='';hidden=new Set();mood='all';length='all';tab='personal';limit=12;requestId++;
  const prefs=getStore(preferencesKey());
  if(prefs){hidden=new Set((Array.isArray(prefs.hidden)?prefs.hidden:[]).slice(0,250));mood=MOODS.some(m=>m[0]===prefs.mood)?prefs.mood:'all';length=LENGTHS.some(l=>l[0]===prefs.length)?prefs.length:'all'}
 }
 function savePrefs(){setStore(preferencesKey(),{hidden:[...hidden].slice(-250),mood,length})}
 async function request(page,genres,sort){
  const query=`query($page:Int,$genres:[String],$sort:[MediaSort]){Page(page:$page,perPage:50){media(type:ANIME,isAdult:false,genre_in:$genres,format_in:[TV,TV_SHORT,ONA,MOVIE],sort:$sort){id idMal title{romaji english native} coverImage{large} genres episodes seasonYear format averageScore description(asHtml:false) siteUrl popularity relations{edges{relationType node{id idMal}}}}}}`;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),14000);
  try{
   const res=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query,variables:{page,genres:genres.length?genres:null,sort}}),signal:controller.signal});
   if(!res.ok)throw Error('AniList HTTP '+res.status);
   const data=await res.json();
   if(data.errors?.length)throw Error(data.errors[0].message||'AniList');
   if(!Array.isArray(data.data?.Page?.media))throw Error('Përgjigje e paplotë');
   return data.data.Page.media;
  }finally{clearTimeout(timeout)}
 }
 async function refresh(force=false){
  switchOwner();if(loading)return;
  const id=requestId,stored=getStore(storageKey());
  if(!force&&stored&&Date.now()-stored.at<18*3600000&&Array.isArray(stored.candidates)){
   candidates=stored.candidates;fetchedAt=stored.at;source='AniList · cache';error='';rerank();return;
  }
  loading=true;error='';ctx.rerender();
  try{
   const p=profile(),genreNames=p.best.slice(0,4).map(([name])=>name.split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join(' '));
   const results=await Promise.allSettled([request(1,genreNames,['SCORE_DESC','POPULARITY_DESC']),request(2,genreNames,['SCORE_DESC','POPULARITY_DESC']),request(1,[],['TRENDING_DESC','POPULARITY_DESC'])]);
   if(id!==requestId)return;
   const media=[],seen=new Set();
   for(const r of results)if(r.status==='fulfilled')for(const x of r.value){if(x?.id&&!seen.has(x.id)){seen.add(x.id);media.push(x)}}
   if(!media.length)throw Error('Katalogu nuk u përgjigj. Provo sërish.');
   candidates=media.map(itemFromRemote);fetchedAt=Date.now();source='AniList';setStore(storageKey(),{at:fetchedAt,candidates});
   if(results.some(r=>r.status==='rejected'))error='Disa rezultate nuk u ngarkuan. Po shfaqim titujt e disponueshëm.';
   rerank();
  }catch(e){if(id!==requestId)return;error='Rekomandimet nuk u ngarkuan: '+String(e.message||e).slice(0,110);if(!items.length&&stored?.candidates){candidates=stored.candidates;fetchedAt=stored.at;source='AniList · cache';rerank()}}
  finally{if(id===requestId){loading=false;ctx.rerender()}}
 }
 function setMood(value){if(!MOODS.some(x=>x[0]===value))return;mood=value;limit=12;savePrefs();ctx.rerender()}
 function setLength(value){if(!LENGTHS.some(x=>x[0]===value))return;length=value;limit=12;savePrefs();ctx.rerender()}
 function setTab(value){if(!TABS.some(x=>x[0]===value))return;tab=value;limit=12;ctx.rerender()}
 function hide(key){const x=items.find(x=>x.key===key);if(!x)return;hidden.add('series:'+ctx.seriesRoot(x.title));savePrefs();rerank();ctx.toast('Nuk do ta sugjerojmë përsëri këtë seri.')}
 function restore(){hidden.clear();savePrefs();rerank()}
 function more(){limit=Math.min(100,limit+12);ctx.rerender()}
 function surprise(){surpriseIndex++;ctx.rerender()}
 function resetFilters(){mood='all';length='all';tab='personal';limit=12;savePrefs();ctx.rerender()}
 function preview(key){const x=items.find(x=>x.key===key);if(x)ctx.previewItem(x)}
 async function add(key){const x=items.find(x=>x.key===key);if(!x)return;await ctx.addItem(x);rerank()}
 function reset(){requestId++;owner='';candidates=[];items=[];loading=false;error='';ctx.rerender()}
 function onLibraryChange(){if(owner===String(ctx.user()?.id||'guest')&&candidates.length)rerank()}
 return {render,home,trending,refresh,add,preview,hide,restore,setMood,setLength,setTab,more,surprise,resetFilters,reset,onLibraryChange};
};
