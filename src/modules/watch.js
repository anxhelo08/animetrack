/* AnimeTrack 13.3 — Where to Watch.
   Anime: AniList official streaming links + Jikan/MAL fallback.
   Movie/TV: public network and regional discovery links; TMDB watch/providers when configured. */
window.ATWatch133=function ATWatch133(ctx){
 'use strict';
 const esc=ctx.esc, CACHE_KEY='animetrack_watch_cache_direct', TTL=12*60*60*1000, TMDB_TOKEN_KEY='animetrack_tmdb_read_token';
 const regions=[
  ['AL','Shqipëri'],['XK','Kosovë'],['US','SHBA'],['GB','Mbretëri e Bashkuar'],['IT','Itali'],['DE','Gjermani'],['FR','Francë'],['ES','Spanjë'],['GR','Greqi'],['TR','Turqi'],['AT','Austri'],['CH','Zvicër'],['CA','Kanada'],['AU','Australi'],['JP','Japoni'],['KR','Kore e Jugut']
 ];
 let pageQuery='';const pending=new Map();
 const clean=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 const safeUrl=value=>{try{const u=new URL(String(value||''));return /^https?:$/.test(u.protocol)?u.href:''}catch{return''}};
 const token=()=>{try{return String(localStorage.getItem(TMDB_TOKEN_KEY)||'').trim()}catch{return''}};
 const region=()=>{const raw=String(ctx.state()?.preferences?.watchRegion||'AL').toUpperCase();return /^[A-Z]{2}$/.test(raw)?raw:'AL'};
 const regionName=code=>regions.find(x=>x[0]===code)?.[1]||code;
 const providerKey=p=>clean(p?.name||p?.provider_name||'').toLocaleLowerCase().replace(/[^a-z0-9]+/g,'-');
 const providerLogo=p=>{const path=String(p?.logo_path||'');if(path.startsWith('/'))return'https://image.tmdb.org/t/p/w92'+path;return safeUrl(p?.icon||p?.logo||'')};
 const titleKey=a=>String(a?.id||a?.sourceId||a?.title||'unknown').slice(0,160);
 function kind(anime){
  const source=String(anime?.source||''),format=String(anime?.format||'').toUpperCase();
  if(format==='MOVIE'&&['TMDB','OMDb','Cinemeta','Wikidata'].includes(source))return'movie';
  if(source==='TVMaze'||format==='TV_SERIES')return'tv';
  return'anime';
 }
 function cacheRead(key){
  try{const all=JSON.parse(localStorage.getItem(CACHE_KEY)||'{}'),row=all?.[key];if(!row||!row.at||Date.now()-row.at>TTL)return null;return row.data||null}catch{return null}
 }
 function cacheWrite(key,data){
  try{
   const all=JSON.parse(localStorage.getItem(CACHE_KEY)||'{}');all[key]={at:Date.now(),data};
   const rows=Object.entries(all).sort((a,b)=>Number(b[1]?.at||0)-Number(a[1]?.at||0)).slice(0,120);
   localStorage.setItem(CACHE_KEY,JSON.stringify(Object.fromEntries(rows)));
  }catch{}
 }
 function cacheKey(anime,part,reg=region()){return[kind(anime),titleKey(anime),String(part?.id||''),reg].join('|')}
 function request(url,options={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000),parent=options.signal;
  if(parent?.aborted)controller.abort();else parent?.addEventListener?.('abort',()=>controller.abort(),{once:true});
  return fetch(url,{...options,signal:controller.signal}).finally(()=>clearTimeout(timer));
 }
 const uniqueProviders=items=>{
  const seen=new Set(),out=[];
  for(const raw of items||[]){const name=clean(raw?.name||raw?.provider_name||raw?.site);if(!name)continue;const key=providerKey({name});if(seen.has(key))continue;seen.add(key);out.push({name,url:safeUrl(raw?.url),logo:providerLogo(raw),id:raw?.provider_id||'',priority:Number(raw?.display_priority)||999})}
  return out.sort((a,b)=>a.priority-b.priority||a.name.localeCompare(b.name));
 };
 async function anilistLinks(anime,part){
  const id=Number(part?.source==='AniList'?part.sourceId:anime?.source==='AniList'?anime.sourceId:0);if(!Number.isInteger(id)||id<1)return[];
  const query='query($id:Int!){Media(id:$id,type:ANIME){externalLinks{site url type icon language notes isDisabled}}}';
  const r=await request('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query,variables:{id}})});
  if(!r.ok)throw Error('AniList HTTP '+r.status);const j=await r.json();
  return uniqueProviders((j.data?.Media?.externalLinks||[]).filter(x=>String(x?.type||'').toUpperCase()==='STREAMING'&&!x?.isDisabled));
 }
 async function jikanLinks(anime,part){
  const mal=Number(part?.malId||anime?.malId||0);if(!Number.isInteger(mal)||mal<1)return[];
  const r=await request('https://api.jikan.moe/v4/anime/'+encodeURIComponent(mal)+'/streaming',{headers:{Accept:'application/json'}});
  if(!r.ok)throw Error('Jikan HTTP '+r.status);const j=await r.json();
  return uniqueProviders((j.data||[]).map(x=>({name:x.name,url:x.url})));
 }
 async function animeAvailability(anime,part){
  let links=[],sources=[];
  try{links=await anilistLinks(anime,part);if(links.length)sources.push('AniList')}catch(err){console.warn('Where to Watch AniList',err)}
  if(!links.length){try{links=await jikanLinks(anime,part);if(links.length)sources.push('MyAnimeList/Jikan')}catch(err){console.warn('Where to Watch Jikan',err)}}
  return{kind:'anime',region:region(),providers:links,categories:links.length?[{key:'stream',label:'Streaming zyrtar',providers:links}]:[],source:sources.join(' + ')||'AniList / MyAnimeList',note:'Providerët vijnë nga AniList ose MyAnimeList. Klikimi hap faqen e providerit; disponueshmëria ndryshon sipas rajonit.'};
 }
 const tmdbHeaders=t=>({accept:'application/json',Authorization:'Bearer '+t});
 const canonical=s=>clean(s).toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 async function tvmazeImdb(anime){
  const id=Number(anime?.tvmazeId||anime?.sourceId||0);if(!Number.isInteger(id)||id<1)return'';
  try{const r=await request('https://api.tvmaze.com/shows/'+id,{headers:{Accept:'application/json'}});if(!r.ok)return'';const j=await r.json();return /^tt\d+$/.test(String(j?.externals?.imdb||''))?String(j.externals.imdb):''}catch{return''}
 }
 async function tmdbFindByImdb(imdb,type,t){
  if(!/^tt\d+$/.test(String(imdb||'')))return'';
  const r=await request('https://api.themoviedb.org/3/find/'+encodeURIComponent(imdb)+'?external_source=imdb_id',{headers:tmdbHeaders(t)});if(!r.ok)throw Error('TMDB find '+r.status);const j=await r.json(),arr=type==='movie'?j.movie_results:j.tv_results;return arr?.[0]?.id?String(arr[0].id):'';
 }
 async function tmdbSearchId(anime,type,t){
  const title=clean(anime?.title);if(!title)return'';
  const params=new URLSearchParams({query:title,include_adult:'false',language:'en-US',page:'1'});
  if(anime?.year)params.set(type==='movie'?'year':'first_air_date_year',String(anime.year));
  const r=await request('https://api.themoviedb.org/3/search/'+type+'?'+params,{headers:tmdbHeaders(t)});if(!r.ok)throw Error('TMDB search '+r.status);const j=await r.json(),want=canonical(title);
  const rows=(j.results||[]).map(x=>({x,key:canonical(type==='movie'?(x.title||x.original_title):(x.name||x.original_name)),year:Number(String(type==='movie'?x.release_date:x.first_air_date).slice(0,4))||0}));
  const match=rows.find(r=>r.key===want&&(!anime?.year||!r.year||Math.abs(Number(anime.year)-r.year)<=1))||rows.find(r=>r.key===want)||rows[0];
  return match?.x?.id?String(match.x.id):'';
 }
 async function resolveTmdb(anime,type,t){
  const direct=String(anime?.tmdbId||'');if(/^\d+$/.test(direct))return direct;
  let imdb=String(anime?.imdbId||'');if(!/^tt\d+$/.test(imdb)&&type==='tv')imdb=await tvmazeImdb(anime);
  if(/^tt\d+$/.test(imdb)){const found=await tmdbFindByImdb(imdb,type,t);if(found)return found}
  return tmdbSearchId(anime,type,t);
 }
 const categoryDefs=[['flatrate','stream','Me abonim'],['free','free','Falas'],['ads','ads','Falas me reklama'],['rent','rent','Me qira'],['buy','buy','Bli']];
 function tmdbCategories(data){
  const out=[];for(const [field,key,label] of categoryDefs){const providers=uniqueProviders(data?.[field]||[]);if(providers.length)out.push({key,label,providers})}return out;
 }
 function discoveryLinks(anime){return kind(anime)==='anime'?[{name:'Anisuge',url:'https://anisuge.org/',logo:'/icons/anisuge.svg'}]:[{name:'CineHD',url:'https://cinehd.vc/home',logo:'/icons/cinehd.svg'}]};
 async function publicAvailability(anime,type,reg){
  const discovery=discoveryLinks(anime,type,reg),categories=[],providers=[];
  if(type==='tv'&&anime.source==='TVMaze'&&/^\d+$/.test(String(anime.tvmazeId||anime.sourceId||''))){
   try{const r=await request('https://api.tvmaze.com/shows/'+encodeURIComponent(anime.tvmazeId||anime.sourceId),{headers:{Accept:'application/json'}});if(r.ok){const show=await r.json(),network=show.webChannel||show.network,url=safeUrl(network?.officialSite);if(network?.name&&url){providers.push(...uniqueProviders([{name:network.name,url}]));categories.push({key:'network',label:'Rrjeti origjinal',providers})}}}catch{}
  }
  return {kind:type,region:reg,categories,providers,discovery,source:type==='tv'?'TVMaze':'Faqja e zgjedhur',note:categories.length?'Rrjeti i transmetimit nga TVMaze. Abonimi dhe disponueshmëria në '+regionName(reg)+' duhen kontrolluar te burimi.':'Hap faqen dhe kërko titullin. Disponueshmëria dhe lidhja e episodit ende nuk janë verifikuar.'};
 }
 async function tmdbAvailability(anime,type,reg){
  const t=token();if(!t)return publicAvailability(anime,type,reg);
  const id=await resolveTmdb(anime,type,t);if(!id)return publicAvailability(anime,type,reg);
  const r=await request('https://api.themoviedb.org/3/'+type+'/'+encodeURIComponent(id)+'/watch/providers',{headers:tmdbHeaders(t)});
  if(!r.ok)throw Error('TMDB watch providers '+r.status);const j=await r.json(),market=j.results?.[reg]||null,categories=tmdbCategories(market),providers=uniqueProviders(categories.flatMap(x=>x.providers));
  return{kind:type,region:reg,tmdbId:id,categories,providers,discovery:discoveryLinks(anime,type,reg),link:safeUrl(market?.link),source:'TMDB / JustWatch',note:market?'Availability sipas rajonit '+regionName(reg)+'.':'TMDB/JustWatch nuk raporton availability për këtë titull në '+regionName(reg)+'.'};
 }
 async function load(anime,part,{force=false,reg=region()}={}){
  const key=cacheKey(anime,part,reg);if(!force){const cached=cacheRead(key);if(cached)return{...cached,cached:true}}
  if(pending.has(key))return pending.get(key);
  const work=(async()=>{
   let data;if(kind(anime)==='anime')data=await animeAvailability(anime,part);else try{data=await tmdbAvailability(anime,kind(anime),reg)}catch{data=await publicAvailability(anime,kind(anime),reg)}
   data={...data,title:clean(anime.title),discovery:discoveryLinks(anime),checkedAt:new Date().toISOString()};cacheWrite(key,data);return data;
  })();pending.set(key,work);try{return await work}finally{pending.delete(key)}
 }
 function providerCard(p,href='',title=''){
  const url=safeUrl(p.url)||safeUrl(href),logo=p.logo?'<img src="'+esc(p.logo)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<span>'+esc((p.name||'?').slice(0,1).toUpperCase())+'</span>';
  const inner=logo+'<strong>'+esc(p.name)+'</strong>';return url?'<a class="at133-provider" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+inner+'<em>↗</em></a>':'<div class="at133-provider">'+inner+'</div>';
 }
 function resultHTML(data){
  const discovery=data.discovery?.length?'<div class="at133-discovery"><strong>Kontrollo ku mund ta shohësh</strong><div class="at133-provider-grid">'+data.discovery.map(p=>providerCard(p,'',data.title)).join('')+'</div><small>'+esc(data.note||'')+'</small></div>':'';
    if(!data.categories?.length&&discovery)return discovery;
  if(!data.categories?.length)return'<div class="at133-empty"><span>⌁</span><div><strong>Nuk u gjet availability</strong><p>'+esc(data.note||'Provo një rajon tjetër ose rifresko më vonë.')+'</p></div></div><p class="at133-credit">'+esc(data.source||'')+'</p>';
  return'<div class="at133-groups">'+data.categories.map(group=>'<section class="at133-group"><header><strong>'+esc(group.label)+'</strong><small>'+group.providers.length+' provider'+(group.providers.length===1?'':'ë')+'</small></header><div class="at133-provider-grid">'+group.providers.map(p=>providerCard(p,data.link,data.title)).join('')+'</div></section>').join('')+'</div>'+discovery+'<div class="at133-watch-foot"><span>'+esc(data.note||'')+'</span>'+(data.link?'<a href="'+esc(safeUrl(data.link))+'" target="_blank" rel="noopener noreferrer">Shiko të gjitha opsionet ↗</a>':'')+'</div><p class="at133-credit">'+(data.kind==='anime'?'Burimet e streaming: '+esc(data.source||'AniList / MyAnimeList'):'Burimet: '+esc(data.source||'TMDB · JustWatch'))+'</p>';
 }
 function regionOptions(selected){return regions.map(([code,name])=>'<option value="'+code+'" '+(selected===code?'selected':'')+'>'+esc(name)+' · '+code+'</option>').join('')}
 function detailShell(anime,part){
  const label=kind(anime)==='anime'?clean(part?.subtitle||part?.title||anime.title):clean(anime.title);
  return'<section class="at133-watch" data-at133-id="'+esc(anime.id)+'"><div class="at133-head"><div><span class="eyebrow">ANIMETRACK 13.3 · WHERE TO WATCH</span><h4>Ku mund ta shoh? ▶</h4><p>'+esc(label)+'</p></div><div class="at133-tools"><label>Rajoni<select data-at133-region>'+regionOptions(region())+'</select></label><button type="button" class="ghost" data-at133-refresh>↻ Rifresko</button></div></div><div class="at133-result"><div class="at133-loading"><span></span><div><strong>Po kontrollohen providerët…</strong><small>Availability ndryshon sipas titullit dhe rajonit.</small></div></div></div></section>';
 }
 async function attach(root,anime,part){
  if(!root||!anime)return;root.querySelector('.at133-watch')?.remove();
  const host=document.createElement('div');window.ATHTML.renderHTML(host,detailShell(anime,part));const section=host.firstElementChild,anchor=root.querySelector('.seasons-topline')||root.querySelector('.at150-movie-stats')||root.firstElementChild;
  if(anchor?.parentNode)anchor.parentNode.insertBefore(section,anchor);else root.append(section);
  const body=section.querySelector('.at133-result'),select=section.querySelector('[data-at133-region]');let sequence=0;
  const paint=async force=>{
   const current=++sequence;
   window.ATHTML.renderHTML(body,'<div class="at133-loading"><span></span><div><strong>Po kontrollohen providerët…</strong><small>'+esc(regionName(select.value))+'</small></div></div>');
   try{const data=await load(anime,part,{force,reg:select.value});if(current===sequence&&section.isConnected){window.ATHTML.renderHTML(body,resultHTML(data));body.querySelectorAll('a[href]').forEach(a=>{a.target='_blank';a.rel='noopener noreferrer'})}}
   catch(err){console.warn('Where to Watch',err);if(current===sequence&&section.isConnected)window.ATHTML.renderHTML(body,'<div class="at133-empty"><span>!</span><div><strong>Availability nuk u ngarkua</strong><p>Kontrollo internetin dhe provo përsëri.</p></div></div>')}
  };
  select.addEventListener('change',()=>{setRegion(select.value,false);void paint(false)});
  section.querySelector('[data-at133-refresh]')?.addEventListener('click',()=>void paint(true));
  section.addEventListener('click',e=>{if(!e.target.closest('[data-at133-settings]'))return;ctx.closeDetail?.();ctx.navigate('explore');requestAnimationFrame(()=>{const d=document.getElementById('movie-provider-settings');if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'center'});document.getElementById('tmdb-token-input')?.focus()}})});
  await paint(false);
 }
 function peek(anime,part){return cacheRead(cacheKey(anime,part,region()))}
 function setRegion(value,rerender=true){
  const code=String(value||'').toUpperCase();if(!/^[A-Z]{2}$/.test(code))return false;
  const state=ctx.state(),before=state.preferences?.watchRegion;state.preferences=state.preferences||{};state.preferences.watchRegion=code;
  if(!ctx.save()){state.preferences.watchRegion=before;return false}if(rerender)ctx.rerender();return true;
 }
 function mediaLabel(a){return kind(a)==='movie'?'Film':kind(a)==='tv'?'Serial TV':'Anime'}
 function render(){
  const q=pageQuery.trim().toLocaleLowerCase(),list=(ctx.state()?.anime||[]).filter(a=>!q||[a.title,a.genre,mediaLabel(a)].some(v=>String(v||'').toLocaleLowerCase().includes(q))).sort((a,b)=>{const order={watching:0,planning:1,paused:2,completed:3,dropped:4};return (order[a.status]??9)-(order[b.status]??9)||String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))});
  return'<section class="at133-page"><header class="at133-page-hero"><div><span class="eyebrow">ANIMETRACK 13.3</span><h2>Where to Watch ▶</h2><p>Kontrollo burimet zyrtare të streaming për anime dhe availability sipas shtetit për filma/seriale. Availability nuk ruhet si fakt permanent — cache rifreskohet çdo 12 orë.</p></div><div class="at133-page-region"><label>Rajoni im<select id="at133-region-page">'+regionOptions(region())+'</select></label><small>'+esc(token()?'TMDB i lidhur ✓':'Burime dhe kërkim automatik për anime, filma e seriale')+'</small></div></header><div class="at133-page-search"><label>⌕ <input id="at133-page-search" value="'+esc(pageQuery)+'" placeholder="Kërko në bibliotekën tënde…"></label><span>'+list.length+' tituj</span></div><div class="at133-library">'+list.map(a=>{const part=(a.seasons||[]).find(s=>!s.hidden)||(a.seasons||[])[0],cached=part&&peek(a,part),names=cached?.providers?.slice(0,3).map(x=>x.name)||[];return'<article class="at133-library-card"><button type="button" class="at133-library-poster" data-pro-action="watch-open" data-id="'+esc(a.id)+'">'+(a.cover?'<img src="'+esc(ctx.poster(a.cover))+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<span>▶</span>')+'</button><div><span>'+esc(mediaLabel(a))+' · '+esc(a.status||'')+'</span><strong>'+esc(a.title)+'</strong><small>'+(names.length?'Së fundi: '+esc(names.join(' · ')):'Hape titullin për të kontrolluar providerët.')+'</small></div><button type="button" class="ghost" data-pro-action="watch-open" data-id="'+esc(a.id)+'">Kontrollo →</button></article>'}).join('')+'</div><footer class="at133-page-note"><strong>Burimet</strong><span>Anime: AniList + MyAnimeList/Jikan. Film/TV: TVMaze dhe opsione TMDB kur janë të disponueshme. Lidhje direkte: CineHD dhe Anisuge.</span></footer></section>';
 }
 function mount(){
  document.addEventListener('change',e=>{if(e.target?.id==='at133-region-page')setRegion(e.target.value)});
  let timer=null;document.addEventListener('input',e=>{if(e.target?.id!=='at133-page-search')return;pageQuery=String(e.target.value||'').slice(0,120);clearTimeout(timer);timer=setTimeout(()=>ctx.rerender(true),120)});
 }
 function action(op,id){if(op==='watch-open')ctx.openAnime(id)}
 return{render,mount,action,attach,load,peek,setRegion,kind,tmdbCategories,uniqueProviders,region,regionName,cacheKey};
};
