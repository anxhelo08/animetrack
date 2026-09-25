window.ATRecommendations=function ATRecommendations(ctx){
 let items=[],loading=false;
 const esc=ctx.esc;
 function card(x){const src=ctx.poster(x.cover);return `<article class="pro-rec">${src?`<img src="${esc(src)}" alt="" loading="lazy">`:''}<div class="pro-rec-body"><strong>${esc(x.title)}</strong><small>★ ${x.score!=null?(x.score/10).toFixed(1):'—'} · ${esc((x.genre||'').split(',').slice(0,2).join(' · '))}</small><button class="pro-btn primary" data-pro-action="add-recommendation" data-key="${esc(x.key)}">+ Në listë</button></div></article>`}
 function render(){return `<div class="pro-hero"><span class="pro-eyebrow">PERSONALIZED DISCOVERY</span><h2>✨ Për ty</h2><p>Sugjerime nga zhanret, notat dhe të preferuarat e tua. Titujt që i ke në bibliotekë nuk përsëriten.</p></div><div class="pro-row" style="margin-bottom:14px"><b>${items.length} sugjerime</b><button class="pro-btn" data-pro-action="refresh-recommendations">↻ Rifresko</button></div>`+(loading?'<div class="pro-loading"></div>':items.length?'<div class="pro-rec-grid">'+items.map(card).join('')+'</div>':'<div class="pro-empty">Vlerëso disa anime që të njohim shijet e tua; më pas rifresko rekomandimet.</div>')}
 function home(){return '<div class="pro-row"><div><span class="pro-eyebrow">DISCOVER</span><h3>✨ Rekomandime për ty</h3></div><button class="pro-btn" data-pro-page="recommendations">Shiko të gjitha →</button></div>'+(items.length?'<div class="pro-rec-grid">'+items.slice(0,4).map(card).join('')+'</div>':'<p class="pro-muted">Bazuar te zhanret dhe notat e tua. Hap rekomandimet për të zbuluar tituj.</p>')}
 async function refresh(force=false){
  if(loading)return;const key='animetrack_recs_'+(ctx.user()?.id||'guest');
  if(!force)try{const cache=JSON.parse(localStorage.getItem(key)||'null');if(cache&&Date.now()-cache.at<86400000&&Array.isArray(cache.items)){items=cache.items;ctx.rerender();return}}catch{}
  loading=true;ctx.rerender();
  try{
   const score=new Map();
   for(const a of ctx.state().anime){const w=1+(a.favorite?3:0)+(a.rating>=8?3:a.rating>=6?1:0);for(const g of ctx.genres(a))score.set(g,(score.get(g)||0)+w)}
   const genres=[...score].sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);
   const query='query($genres:[String]){Page(page:1,perPage:36){media(type:ANIME,genre_in:$genres,isAdult:false,sort:[SCORE_DESC,POPULARITY_DESC]){id idMal title{romaji english native} coverImage{large} genres episodes seasonYear format averageScore description(asHtml:false) siteUrl}}}';
   const res=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,variables:{genres:genres.length?genres:null}})});
   if(!res.ok)throw Error('AniList HTTP '+res.status);
   const j=await res.json();if(j.errors?.length)throw Error(j.errors[0].message);
   const known=new Set(ctx.state().anime.map(a=>ctx.seriesRoot(a.title)));
   items=(j.data?.Page?.media||[]).map(ctx.mapAniList).filter(a=>!ctx.inLibrary(a)&&!known.has(ctx.seriesRoot(a.title))).slice(0,20);
   localStorage.setItem(key,JSON.stringify({at:Date.now(),items}));
  }catch(e){ctx.toast('Rekomandimet nuk u ngarkuan: '+String(e.message||e).slice(0,90))}
  finally{loading=false;ctx.rerender()}
 }
 async function add(key){const item=items.find(x=>x.key===key);if(item)await ctx.addItem(item)}
 return {render,home,refresh,add};
};
