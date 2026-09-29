/* AnimeTrack 13.4 — Rich Details / Cast / Staff explorer. */
window.ATRich134=function ATRich134(ctx){
 'use strict';
 const esc=ctx.esc;
 const TITLE_CACHE='animetrack_rich_title_134';
 const PERSON_CACHE='animetrack_rich_person_134';
 const TTL=24*60*60*1000;
 const TMDB_TOKEN_KEY='animetrack_tmdb_read_token';
 let activePerson=null;
 let workMap=new Map();
 let requestSeq=0;

 const clean=(s,max=5000)=>window.ATSecurity136?.text(s,max)||String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
 const safeUrl=v=>{try{const u=new URL(String(v||''));return /^https?:$/.test(u.protocol)?u.href:''}catch{return''}};
 const token=()=>{try{return String(localStorage.getItem(TMDB_TOKEN_KEY)||'').trim()}catch{return''}};
 const photo=(path,size='w300')=>path?(/^https?:\/\//.test(String(path))?String(path):'https://image.tmdb.org/t/p/'+size+String(path)):'';
 const year=v=>{const m=String(v||'').match(/(?:18|19|20|21)\d{2}/);return m?Number(m[0]):null};
 const kind=a=>{const source=String(a?.source||''),format=String(a?.format||'').toUpperCase();if(format==='MOVIE'&&['TMDB','OMDb','Cinemeta','Wikidata'].includes(source))return'movie';if(source==='TVMaze'||format==='TV_SERIES')return'tv';return'anime'};
 const tmdbHeaders=t=>({accept:'application/json',Authorization:'Bearer '+t});

 function cacheGet(bucket,key){
  try{const all=JSON.parse(localStorage.getItem(bucket)||'{}'),row=all?.[key];if(!row||!row.at||Date.now()-row.at>TTL)return null;return row.data||null}catch{return null}
 }
 function cacheSet(bucket,key,data){
  try{const all=JSON.parse(localStorage.getItem(bucket)||'{}');all[key]={at:Date.now(),data};const rows=Object.entries(all).sort((a,b)=>Number(b[1]?.at||0)-Number(a[1]?.at||0)).slice(0,100);localStorage.setItem(bucket,JSON.stringify(Object.fromEntries(rows)))}catch{}
 }
 async function request(url,options={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{return await fetch(url,{...options,signal:controller.signal})}finally{clearTimeout(timer)}
 }
 async function gql(query,variables){
  const r=await request('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({query,variables})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.errors?.length)throw Error(j.errors?.[0]?.message||'AniList HTTP '+r.status);
  return j.data||{};
 }
 function makePerson(provider,id,name,image,role,extra={}){
  return{provider,id:String(id||''),name:clean(name)||'Pa emër',image:safeUrl(image),role:clean(role),...extra};
 }
 function dedupePeople(items){
  const seen=new Set(),out=[];
  for(const p of items||[]){const key=p.provider+':'+p.id+':'+p.role;if(!p.id||seen.has(key))continue;seen.add(key);out.push(p)}
  return out;
 }
 function titleKey(a,part){return[kind(a),a?.source||'',a?.sourceId||a?.id||'',part?.sourceId||part?.id||''].join('|')}
 function animeId(a,part){const p=part?.source==='AniList'?Number(part.sourceId):0,root=a?.source==='AniList'?Number(a.sourceId):0;return Number.isInteger(p)&&p>0?p:Number.isInteger(root)&&root>0?root:0}

 async function animeRich(a,part){
  const id=animeId(a,part);
  if(!id)return{kind:'anime',cast:[],staff:[],meta:[],source:'AniList',unavailable:true};
  const query='query($id:Int!){Media(id:$id,type:ANIME){id format status seasonYear episodes duration genres averageScore siteUrl trailer{id site thumbnail} tags{name rank isMediaSpoiler} studios(isMain:true){nodes{id name siteUrl}} staff(page:1,perPage:25){edges{role node{id name{full userPreferred} image{large medium} primaryOccupations siteUrl}}} characters(page:1,perPage:20){edges{role node{id name{full userPreferred}} voiceActors{id name{full userPreferred} image{large medium} primaryOccupations languageV2 siteUrl}}}}}';
  const m=(await gql(query,{id})).Media;
  if(!m)throw Error('Anime details unavailable');
  const cast=[];
  for(const edge of m.characters?.edges||[]){
   const voices=edge.voiceActors||[];
   const va=voices.find(x=>x.languageV2==='Japanese')||voices[0];
   if(!va)continue;
   const char=edge.node?.name?.userPreferred||edge.node?.name?.full||'Personazh';
   cast.push(makePerson('anilist',va.id,va.name?.userPreferred||va.name?.full,va.image?.large||va.image?.medium,char+' · '+(va.languageV2||'Voice Actor'),{character:char,url:va.siteUrl||''}));
  }
  const priority=r=>/director|original creator|series composition|script|screenplay/i.test(r)?0:/character design|music|producer/i.test(r)?1:2;
  const staff=(m.staff?.edges||[]).map(e=>makePerson('anilist',e.node?.id,e.node?.name?.userPreferred||e.node?.name?.full,e.node?.image?.large||e.node?.image?.medium,e.role,{url:e.node?.siteUrl||''})).filter(x=>x.id).sort((x,y)=>priority(x.role)-priority(y.role)).slice(0,18);
  const trailer=m.trailer?.site==='youtube'&&m.trailer?.id?'https://www.youtube.com/watch?v='+encodeURIComponent(m.trailer.id):'';
  const tags=(m.tags||[]).filter(x=>!x.isMediaSpoiler&&Number(x.rank)>=60).sort((x,y)=>Number(y.rank)-Number(x.rank)).slice(0,8).map(x=>x.name);
  const meta=[m.format&&{k:'Format',v:String(m.format).replaceAll('_',' ')},m.status&&{k:'Status',v:String(m.status).replaceAll('_',' ')},m.seasonYear&&{k:'Viti',v:String(m.seasonYear)},m.episodes&&{k:'Episode',v:String(m.episodes)},m.duration&&{k:'Kohë',v:m.duration+' min'},m.averageScore&&{k:'AniList',v:(m.averageScore/10).toFixed(1)+'/10'}].filter(Boolean);
  return{kind:'anime',cast:dedupePeople(cast).slice(0,16),staff:dedupePeople(staff),meta,genres:m.genres||[],tags,studios:(m.studios?.nodes||[]).map(x=>({name:x.name,url:x.siteUrl||''})),trailer,source:'AniList',sourceUrl:m.siteUrl||''};
 }

 async function tvRich(a){
  const id=Number(a?.tvmazeId||a?.sourceId||0);
  if(!Number.isInteger(id)||id<1)return{kind:'tv',cast:[],staff:[],meta:[],source:'TVMaze',unavailable:true};
  const [showR,castR,crewR]=await Promise.all([request('https://api.tvmaze.com/shows/'+id),request('https://api.tvmaze.com/shows/'+id+'/cast'),request('https://api.tvmaze.com/shows/'+id+'/crew')]);
  if(!showR.ok)throw Error('TVMaze show '+showR.status);
  const show=await showR.json();
  const castData=castR.ok?await castR.json():[];
  const crewData=crewR.ok?await crewR.json():[];
  const cast=(castData||[]).slice(0,18).map(row=>makePerson('tvmaze',row.person?.id,row.person?.name,row.person?.image?.original||row.person?.image?.medium,row.character?.name||'Cast',{url:row.person?.url||'',character:row.character?.name||''}));
  const staff=(crewData||[]).map(row=>makePerson('tvmaze',row.person?.id,row.person?.name,row.person?.image?.original||row.person?.image?.medium,row.type||'Crew',{url:row.person?.url||''})).sort((x,y)=>(/director|creator|writer/i.test(x.role)?0:1)-(/director|creator|writer/i.test(y.role)?0:1)).slice(0,18);
  const meta=[show.status&&{k:'Status',v:show.status},show.premiered&&{k:'Premiera',v:String(show.premiered).slice(0,10)},show.runtime&&{k:'Kohë',v:show.runtime+' min'},show.rating?.average&&{k:'TVMaze',v:show.rating.average+'/10'},(show.network?.name||show.webChannel?.name)&&{k:'Rrjeti',v:show.network?.name||show.webChannel?.name}].filter(Boolean);
  return{kind:'tv',cast:dedupePeople(cast),staff:dedupePeople(staff),meta,genres:show.genres||[],tags:[],studios:[],trailer:'',source:'TVMaze',sourceUrl:show.url||''};
 }

 async function tmdbMovieId(a,t){
  if(/^\d+$/.test(String(a?.tmdbId||'')))return String(a.tmdbId);
  const imdb=String(a?.imdbId||'');
  if(/^tt\d+$/.test(imdb)){
   const r=await request('https://api.themoviedb.org/3/find/'+encodeURIComponent(imdb)+'?external_source=imdb_id',{headers:tmdbHeaders(t)});
   if(r.ok){const j=await r.json();if(j.movie_results?.[0]?.id)return String(j.movie_results[0].id)}
  }
  const params=new URLSearchParams({query:String(a?.title||''),include_adult:'false',language:'en-US',page:'1'});if(a?.year)params.set('year',String(a.year));
  const r=await request('https://api.themoviedb.org/3/search/movie?'+params,{headers:tmdbHeaders(t)});if(!r.ok)return'';
  const j=await r.json();return j.results?.[0]?.id?String(j.results[0].id):'';
 }
 async function movieRich(a){
  const t=token();
  if(!t){
   return{kind:'movie',castText:String(a?.cast||'').split(',').map(clean).filter(Boolean).slice(0,12),staffText:String(a?.director||'').split(',').map(clean).filter(Boolean).slice(0,5),cast:[],staff:[],meta:[a?.runtime&&{k:'Kohë',v:a.runtime+' min'},a?.year&&{k:'Viti',v:String(a.year)},a?.imdbRating&&{k:'IMDb',v:Number(a.imdbRating).toFixed(1)+'/10'}].filter(Boolean),genres:String(a?.genre||'').split(',').map(clean).filter(Boolean),tags:[],studios:[],trailer:'',source:'TMDB',needsToken:true};
  }
  const id=await tmdbMovieId(a,t);if(!id)return{kind:'movie',cast:[],staff:[],meta:[],source:'TMDB',notFound:true};
  const r=await request('https://api.themoviedb.org/3/movie/'+encodeURIComponent(id)+'?language=en-US&append_to_response=credits,keywords,videos,external_ids',{headers:tmdbHeaders(t)});
  if(!r.ok)throw Error('TMDB movie '+r.status);
  const m=await r.json();
  const cast=(m.credits?.cast||[]).slice(0,18).map(x=>makePerson('tmdb',x.id,x.name||x.original_name,photo(x.profile_path),'as '+(x.character||'Cast'),{character:x.character||''}));
  const wanted=/director|screenplay|writer|story|producer|executive producer|director of photography|original music composer/i;
  const staff=(m.credits?.crew||[]).filter(x=>wanted.test(String(x.job||''))).sort((x,y)=>(x.job==='Director'?-2:0)-(y.job==='Director'?-2:0)).slice(0,20).map(x=>makePerson('tmdb',x.id,x.name||x.original_name,photo(x.profile_path),x.job||x.department,{department:x.department||''}));
  const trailer=(m.videos?.results||[]).find(x=>x.site==='YouTube'&&x.type==='Trailer'&&x.official)||(m.videos?.results||[]).find(x=>x.site==='YouTube'&&x.type==='Trailer');
  const meta=[m.release_date&&{k:'Premiera',v:m.release_date},m.runtime&&{k:'Kohë',v:m.runtime+' min'},m.status&&{k:'Status',v:m.status},m.vote_average&&{k:'TMDB',v:Number(m.vote_average).toFixed(1)+'/10'},m.budget>0&&{k:'Buxhet',v:'$'+Number(m.budget).toLocaleString('en-US')}].filter(Boolean);
  return{kind:'movie',cast:dedupePeople(cast),staff:dedupePeople(staff),meta,genres:(m.genres||[]).map(x=>x.name),tags:(m.keywords?.keywords||[]).slice(0,8).map(x=>x.name),studios:(m.production_companies||[]).slice(0,6).map(x=>({name:x.name,url:''})),trailer:trailer?.key?'https://www.youtube.com/watch?v='+encodeURIComponent(trailer.key):'',source:'TMDB',sourceUrl:'https://www.themoviedb.org/movie/'+id,tmdbId:id};
 }
 async function loadTitle(a,part,{force=false}={}){
  const key=titleKey(a,part);if(!force){const hit=cacheGet(TITLE_CACHE,key);if(hit)return{...hit,cached:true}}
  let data;if(kind(a)==='anime')data=await animeRich(a,part);else if(kind(a)==='tv')data=await tvRich(a);else data=await movieRich(a);
  data={...data,checkedAt:new Date().toISOString()};cacheSet(TITLE_CACHE,key,data);return data;
 }

 function animeWork(node,role=''){
  return{kind:'anime',key:'al-'+node.id,source:'AniList',sourceId:String(node.id),malId:String(node.idMal||''),title:node.title?.english||node.title?.romaji||'Anime',english:node.title?.english||'',year:node.seasonYear||null,cover:node.coverImage?.large||'',score:node.averageScore||null,format:node.format||'TV',sourceUrl:node.siteUrl||'',credit:clean(role)};
 }
 async function aniPerson(id,role){
  const query='query($id:Int!){Staff(id:$id){id name{full userPreferred native} image{large medium} description(asHtml:false) primaryOccupations homeTown yearsActive siteUrl staffMedia(page:1,perPage:25,sort:POPULARITY_DESC,type:ANIME){edges{staffRole node{id idMal title{romaji english} coverImage{large} seasonYear format averageScore siteUrl}}} characterMedia(page:1,perPage:25,sort:POPULARITY_DESC){edges{characterRole node{id idMal title{romaji english} coverImage{large} seasonYear format averageScore siteUrl}}}}}';
  const s=(await gql(query,{id:Number(id)})).Staff;if(!s)throw Error('Person not found');
  const seen=new Map();
  for(const edge of s.staffMedia?.edges||[]){const w=animeWork(edge.node,edge.staffRole||'Staff');seen.set(w.sourceId,w)}
  for(const edge of s.characterMedia?.edges||[]){const w=animeWork(edge.node,'Voice Actor · '+String(edge.characterRole||'').toLowerCase()),old=seen.get(w.sourceId);if(old)old.credit=[old.credit,w.credit].filter(Boolean).join(' · ');else seen.set(w.sourceId,w)}
  return{provider:'anilist',id:String(s.id),name:s.name?.userPreferred||s.name?.full||'Staff',image:s.image?.large||s.image?.medium||'',role,description:clean(s.description).slice(0,1200),facts:[(s.primaryOccupations||[]).join(' · '),s.homeTown?'Nga '+s.homeTown:'',s.yearsActive?.length?'Aktiv '+s.yearsActive.join('–'):''].filter(Boolean),sourceUrl:s.siteUrl||'',works:[...seen.values()].slice(0,30)};
 }
 async function tvPerson(id,role){
  const base='https://api.tvmaze.com/people/'+encodeURIComponent(id);
  const [pr,cr,wr]=await Promise.all([request(base),request(base+'/castcredits?embed[]=show&embed[]=character'),request(base+'/crewcredits?embed=show')]);
  if(!pr.ok)throw Error('TVMaze person '+pr.status);
  const p=await pr.json(),casts=cr.ok?await cr.json():[],crew=wr.ok?await wr.json():[],seen=new Map();
  const add=(show,credit)=>{if(!show?.id)return;const key=String(show.id),w={kind:'tv',key:'tvmaze-'+show.id,source:'TVMaze',sourceId:String(show.id),title:show.name||'Serial TV',year:year(show.premiered),cover:show.image?.medium||show.image?.original||'',format:'TV_SERIES',score:show.rating?.average?Math.round(show.rating.average*10):null,sourceUrl:show.url||'',credit:clean(credit)},old=seen.get(key);if(old)old.credit=[old.credit,w.credit].filter(Boolean).join(' · ');else seen.set(key,w)};
  for(const row of casts||[])add(row._embedded?.show,'Cast'+(row._embedded?.character?.name?' · '+row._embedded.character.name:''));
  for(const row of crew||[])add(row._embedded?.show,row.type||'Crew');
  return{provider:'tvmaze',id:String(p.id),name:p.name||'Person',image:p.image?.original||p.image?.medium||'',role,description:'',facts:[p.birthday?'Lindur '+p.birthday:'',p.country?.name||'',p.gender||''].filter(Boolean),sourceUrl:p.url||'',works:[...seen.values()].slice(0,30)};
 }
 async function tmdbPerson(id,role){
  const t=token();if(!t)throw Error('TMDB token required');
  const r=await request('https://api.themoviedb.org/3/person/'+encodeURIComponent(id)+'?language=en-US&append_to_response=combined_credits,external_ids',{headers:tmdbHeaders(t)});
  if(!r.ok)throw Error('TMDB person '+r.status);
  const p=await r.json(),seen=new Map();
  const rows=[...(p.combined_credits?.cast||[]),...(p.combined_credits?.crew||[])].filter(x=>['movie','tv'].includes(x.media_type)&&!x.adult&&(x.title||x.name)).sort((a,b)=>Number(b.popularity||0)-Number(a.popularity||0));
  for(const x of rows){
   const key=x.media_type+':'+x.id,credit=clean(x.character||x.job||x.department||''),old=seen.get(key);
   if(old){if(credit&&!old.credit.includes(credit))old.credit=[old.credit,credit].filter(Boolean).join(' · ');continue}
   seen.set(key,{kind:x.media_type==='movie'?'movie':'tv',key:(x.media_type==='movie'?'movie-tmdb-':'tmdb-tv-')+x.id,source:'TMDB',sourceId:String(x.id),tmdbId:String(x.id),title:x.title||x.name||'Titull',year:year(x.release_date||x.first_air_date),cover:photo(x.poster_path,'w342'),format:x.media_type==='movie'?'MOVIE':'TV_SERIES',score:Number.isFinite(Number(x.vote_average))?Math.round(Number(x.vote_average)*10):null,sourceUrl:'https://www.themoviedb.org/'+x.media_type+'/'+x.id,credit});
  }
  return{provider:'tmdb',id:String(p.id),name:p.name||'Person',image:photo(p.profile_path,'w500'),role,description:clean(p.biography).slice(0,1400),facts:[p.known_for_department||'',p.birthday?'Lindur '+p.birthday:'',p.place_of_birth||''].filter(Boolean),sourceUrl:p.external_ids?.imdb_id?'https://www.imdb.com/name/'+p.external_ids.imdb_id+'/':'https://www.themoviedb.org/person/'+p.id,works:[...seen.values()].slice(0,30)};
 }
 async function loadPerson(provider,id,role,{force=false}={}){
  const key=provider+':'+id;if(!force){const hit=cacheGet(PERSON_CACHE,key);if(hit)return{...hit,role:role||hit.role,cached:true}}
  let data;if(provider==='anilist')data=await aniPerson(id,role);else if(provider==='tvmaze')data=await tvPerson(id,role);else data=await tmdbPerson(id,role);
  cacheSet(PERSON_CACHE,key,data);return data;
 }

 function personCard(p){
  const media=p.image?'<img src="'+esc(p.image)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<span class="at134-person-fallback">'+esc(p.name.slice(0,1).toUpperCase())+'</span>';
  return'<button type="button" class="at134-person-card" data-at134-person="'+esc(p.id)+'" data-provider="'+esc(p.provider)+'" data-role="'+esc(p.role)+'">'+media+'<span><strong>'+esc(p.name)+'</strong><small>'+esc(p.role||'Cast / Staff')+'</small></span><em>›</em></button>';
 }
 function metaHTML(data){
  const chips=(data.meta||[]).map(x=>'<span><small>'+esc(x.k)+'</small><b>'+esc(x.v)+'</b></span>').join('');
  const studios=(data.studios||[]).length?'<div class="at134-line"><b>Studio / Production</b><span>'+(data.studios||[]).map(x=>x.url?'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.name)+'</a>':esc(x.name)).join(' · ')+'</span></div>':'';
  const genres=(data.genres||[]).length?'<div class="at134-tags">'+data.genres.slice(0,8).map(x=>'<span>'+esc(x)+'</span>').join('')+'</div>':'';
  const tags=(data.tags||[]).length?'<div class="at134-tags at134-soft">'+data.tags.slice(0,8).map(x=>'<span>#'+esc(x)+'</span>').join('')+'</div>':'';
  return'<div class="at134-meta">'+chips+'</div>'+studios+genres+tags;
 }
 function titleHTML(data){
  const fallback=data.needsToken&&(!data.cast.length&&!data.staff.length);
  const cast=fallback&&data.castText?.length?'<div class="at134-static"><b>Cast i njohur</b><p>'+data.castText.map(esc).join(' · ')+'</p></div>':data.cast?.length?'<section><div class="at134-section-head"><h5>Cast</h5><small>Kliko personin për profil + vepra të tjera</small></div><div class="at134-people">'+data.cast.map(personCard).join('')+'</div></section>':'';
  const staff=fallback&&data.staffText?.length?'<div class="at134-static"><b>Regjia / staff</b><p>'+data.staffText.map(esc).join(' · ')+'</p></div>':data.staff?.length?'<section><div class="at134-section-head"><h5>Regji & Staff</h5><small>Regjisorë, creatorë, shkrim, produksion</small></div><div class="at134-people">'+data.staff.map(personCard).join('')+'</div></section>':'';
  const setup=data.needsToken?'<div class="at134-token"><span>◈</span><div><strong>Lidh TMDB për profile të klikueshme te filmat</strong><small>Emrat bazë shfaqen edhe pa token; filmografia dhe person IDs vijnë nga TMDB.</small></div><button type="button" class="ghost" data-at134-settings>Cilësimet TMDB</button></div>':'';
  const empty=!cast&&!staff?'<div class="at134-empty">Nuk u gjet cast/staff i strukturuar për këtë titull.</div>':'';
  return metaHTML(data)+setup+cast+staff+empty+'<div class="at134-source"><span>Burimi: '+esc(data.source||'')+'</span>'+(data.trailer?'<a href="'+esc(data.trailer)+'" target="_blank" rel="noopener noreferrer">▶ Trailer ↗</a>':'')+(data.sourceUrl?'<a href="'+esc(data.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Burimi ↗</a>':'')+'</div>';
 }
 function shell(){return'<section class="at134-rich"><header><div><span class="eyebrow">ANIMETRACK 13.4 · RICH DETAILS</span><h4>Cast, Regji & Staff ✦</h4><p>Hap një person dhe eksploro filmat, serialet ose animet ku ka punuar.</p></div><button type="button" class="ghost" data-at134-refresh>↻</button></header><div class="at134-body"><div class="at134-loading"><span></span><div><strong>Po ngarkohen njerëzit…</strong><small>Cast, staff dhe lidhjet e veprave.</small></div></div></div></section>'}
 async function attach(root,a,part){
  if(!root||!a)return;root.querySelector('.at134-rich')?.remove();
  const host=document.createElement('div');host.innerHTML=shell();
  const section=host.firstElementChild,anchor=root.querySelector('.at133-watch')||root.querySelector('.seasons-topline')||root.querySelector('.at150-movie-stats')||root.firstElementChild;
  if(anchor?.parentNode)anchor.parentNode.insertBefore(section,anchor);else root.append(section);
  const body=section.querySelector('.at134-body'),seq=++requestSeq;
  const paint=async force=>{body.innerHTML='<div class="at134-loading"><span></span><div><strong>Po ngarkohen njerëzit…</strong><small>Cast, staff dhe filmografia.</small></div></div>';try{const data=await loadTitle(a,part,{force});if(seq===requestSeq&&section.isConnected)body.innerHTML=titleHTML(data)}catch(err){console.warn('Rich Details',err);if(seq===requestSeq&&section.isConnected)body.innerHTML='<div class="at134-empty">Detajet e avancuara nuk u ngarkuan. Provo rifresko.</div>'}};
  section.querySelector('[data-at134-refresh]')?.addEventListener('click',()=>void paint(true));
  section.addEventListener('click',e=>{if(!e.target.closest('[data-at134-settings]'))return;ctx.closeDetail?.();ctx.navigate('explore');requestAnimationFrame(()=>{const d=document.getElementById('movie-provider-settings');if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'center'});document.getElementById('tmdb-token-input')?.focus()}})});
  await paint(false);
 }

 function ensureDialog(){
  let d=document.getElementById('at134-person-dialog');if(d)return d;
  document.body.insertAdjacentHTML('beforeend','<dialog id="at134-person-dialog" class="at134-dialog"><button type="button" class="at134-close" data-at134-close aria-label="Mbyll">×</button><div id="at134-person-content"></div></dialog>');
  return document.getElementById('at134-person-dialog');
 }
 function workCard(w){
  const lib=ctx.inLibrary?.(w),key='work-'+Math.random().toString(36).slice(2);workMap.set(key,{...w,libraryId:lib?.id||''});
  const media=w.cover?'<img src="'+esc(ctx.poster(w.cover))+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<span class="at134-work-fallback">▶</span>';
  return'<button type="button" class="at134-work" data-at134-work="'+key+'">'+media+'<span><strong>'+esc(w.title)+'</strong><small>'+esc([w.year,w.credit].filter(Boolean).join(' · '))+'</small>'+(lib?'<em>✓ Në bibliotekë</em>':'')+'</span></button>';
 }
 function personHTML(p){
  workMap=new Map();
  const avatar=p.image?'<img src="'+esc(p.image)+'" alt="" referrerpolicy="no-referrer">':'<span class="at134-profile-fallback">'+esc(p.name.slice(0,1).toUpperCase())+'</span>';
  const facts=(p.facts||[]).map(x=>'<span>'+esc(x)+'</span>').join('');
  const works=p.works.length?p.works.map(workCard).join(''):'<div class="at134-empty">Nuk u gjet filmografi e lidhur.</div>';
  return'<article class="at134-profile"><header>'+avatar+'<div><span class="eyebrow">'+esc(p.provider.toUpperCase())+'</span><h3>'+esc(p.name)+'</h3><p>'+esc(p.role||'Cast / Staff')+'</p><div class="at134-facts">'+facts+'</div></div></header>'+(p.description?'<p class="at134-bio">'+esc(p.description)+'</p>':'')+'<section class="at134-known"><div class="at134-section-head"><h4>Vepra të tjera</h4><small>'+p.works.length+' rezultate · kliko për ta hapur në AnimeTrack</small></div><div class="at134-works">'+works+'</div></section><footer>'+(p.sourceUrl?'<a href="'+esc(p.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Profili në burim ↗</a>':'')+'</footer></article>';
 }
 async function openPerson(provider,id,role){
  const d=ensureDialog(),box=document.getElementById('at134-person-content');if(!d||!box)return;
  activePerson={provider,id,role};box.innerHTML='<div class="at134-person-loading"><span></span><strong>Po hapet profili…</strong></div>';if(!d.open)d.showModal?.();
  try{const p=await loadPerson(provider,id,role);if(activePerson?.provider===provider&&activePerson?.id===id)box.innerHTML=personHTML(p)}catch(err){console.warn('Person profile',err);box.innerHTML='<div class="at134-person-error"><strong>Profili nuk u ngarkua.</strong><p>Provo përsëri më vonë ose kontrollo lidhjen/TMDB.</p></div>'}
 }
 function openWork(key){
  const w=workMap.get(key);if(!w)return;ensureDialog().close?.();activePerson=null;ctx.closeDetail?.();
  if(w.libraryId){ctx.openAnime(w.libraryId);return}
  if(w.kind==='tv'&&w.source==='TMDB'){ctx.searchOnline?.(w.title);return}
  ctx.previewItem?.(w);
 }
 function mount(){
  ensureDialog();
  document.addEventListener('click',e=>{
   const close=e.target.closest('[data-at134-close]');if(close){ensureDialog().close?.();activePerson=null;return}
   const p=e.target.closest('[data-at134-person]');if(p){void openPerson(p.dataset.provider,p.dataset.at134Person,p.dataset.role||'');return}
   const w=e.target.closest('[data-at134-work]');if(w){openWork(w.dataset.at134Work);return}
  });
 }
 return{mount,attach,loadTitle,loadPerson,openPerson,openWork,kind,tmdbMovieId};
};
