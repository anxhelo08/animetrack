/* AnimeTrack 12.15.2 — live-action movie catalog.
   TMDB is primary when configured. Cinemeta is the rich zero-key IMDb-ID catalog.
   OMDb enriches when configured. Wikidata is the final zero-key fallback. */
window.ATMovies12150=(()=>{
 'use strict';
 const clean=s=>window.ATSecurity136?.text(s,5000)||String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 const year=v=>{const m=String(v||'').match(/(?:18|19|20|21)\d{2}/),n=m?Number(m[0]):null;return n>=1880&&n<=2200?n:null};
 const poster=p=>p?(/^https?:\/\//.test(String(p))?String(p):'https://image.tmdb.org/t/p/w500'+p):'';
 const backdrop=p=>p?(/^https?:\/\//.test(String(p))?String(p):'https://image.tmdb.org/t/p/w1280'+p):'';
 const tmdbUrl=id=>'https://www.themoviedb.org/movie/'+encodeURIComponent(id);
 const auth=t=>({accept:'application/json',Authorization:'Bearer '+String(t||'').trim()});
 const wdApi=params=>'https://www.wikidata.org/w/api.php?'+new URLSearchParams({...params,format:'json',origin:'*'});
 const wdUrl=id=>'https://www.wikidata.org/wiki/'+encodeURIComponent(id);
 const commonsFile=name=>name?'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(name)+'?width=500':'';
 const filmDescription=s=>{const d=String(s||'').toLowerCase();return (/\bfilm\b|\bmovie\b|motion picture|documentary/.test(d))&&!/\bfilm series\b|\bmovie series\b|\btelevision series\b|\btv series\b/.test(d)};
 function claim(entity,pid){return entity?.claims?.[pid]?.[0]?.mainsnak?.datavalue?.value??null}
 function claimTime(entity,pid){const v=claim(entity,pid);return typeof v?.time==='string'?v.time.replace(/^\+/,'').slice(0,10):''}
 function claimAmount(entity,pid){const v=claim(entity,pid),n=Number(v?.amount);return Number.isFinite(n)?Math.max(0,Math.round(n)):0}
 async function searchTMDB(q,token,signal){
  const url='https://api.themoviedb.org/3/search/movie?'+new URLSearchParams({query:q,include_adult:'false',language:'en-US',page:'1'});
  const r=await fetch(url,{headers:auth(token),signal});if(!r.ok)throw Error('TMDB HTTP '+r.status);
  const j=await r.json();
  return (j.results||[]).slice(0,14).map(m=>({kind:'movie',key:'movie-tmdb-'+m.id,source:'TMDB',sourceId:String(m.id),tmdbId:String(m.id),imdbId:'',title:clean(m.title||m.original_title||'Film'),english:clean(m.original_title||''),year:year(m.release_date),releaseDate:String(m.release_date||''),cover:poster(m.poster_path),backdrop:backdrop(m.backdrop_path),genre:'',synopsis:clean(m.overview).slice(0,700),score:Number.isFinite(Number(m.vote_average))?Math.round(Number(m.vote_average)*10):null,format:'MOVIE',sourceUrl:tmdbUrl(m.id)}));
 }
 async function searchOMDb(q,key,signal){
  const url='https://www.omdbapi.com/?'+new URLSearchParams({apikey:key,s:q,type:'movie',page:'1'});
  const r=await fetch(url,{signal});if(!r.ok)throw Error('OMDb HTTP '+r.status);const j=await r.json();
  if(j.Response==='False')return [];
  return (j.Search||[]).slice(0,12).map(m=>({kind:'movie',key:'movie-omdb-'+m.imdbID,source:'OMDb',sourceId:String(m.imdbID||''),tmdbId:'',imdbId:String(m.imdbID||''),title:clean(m.Title||'Film'),english:'',year:year(m.Year),releaseDate:'',cover:poster(m.Poster==='N/A'?'':m.Poster),backdrop:'',genre:'',synopsis:'',score:null,format:'MOVIE',sourceUrl:m.imdbID?'https://www.imdb.com/title/'+m.imdbID+'/':''}));
 }

 async function searchCinemeta(q,signal){
  const url='/api/cinemeta?mode=search&q='+encodeURIComponent(q);
  const r=await fetch(url,{signal,headers:{Accept:'application/json'}});if(!r.ok)throw Error('Cinemeta HTTP '+r.status);const j=await r.json();
  return (j.metas||[]).filter(x=>x&&/^tt\d+$/.test(String(x.id||''))&&String(x.type||'movie')==='movie').slice(0,18).map(m=>({
   kind:'movie',key:'movie-cinemeta-'+m.id,source:'Cinemeta',sourceId:String(m.id),tmdbId:'',imdbId:String(m.id),
   title:clean(m.name||m.title||'Film'),english:'',year:year(m.releaseInfo||m.year||m.released),releaseDate:String(m.released||'').slice(0,10),
   cover:poster(m.poster||''),backdrop:backdrop(m.background||m.banner||''),genre:clean(Array.isArray(m.genres)?m.genres.join(', '):m.genre||''),
   synopsis:clean(m.description).slice(0,700),score:Number.isFinite(Number(m.imdbRating))?Math.round(Number(m.imdbRating)*10):null,
   format:'MOVIE',sourceUrl:'https://www.imdb.com/title/'+m.id+'/'
  }));
 }
 async function cinemetaDetails(item,{omdbKey='',signal}={}){
  const imdbId=String(item?.imdbId||item?.sourceId||'');if(!/^tt\d+$/.test(imdbId))throw Error('IMDb ID i pavlefshëm.');
  const r=await fetch('/api/cinemeta?mode=meta&id='+encodeURIComponent(imdbId),{signal,headers:{Accept:'application/json'}});
  if(!r.ok)throw Error('Cinemeta HTTP '+r.status);const j=await r.json(),m=j.meta;if(!m||!m.id)throw Error('Cinemeta nuk ktheu metadata.');
  let omdb=null;try{omdb=await omdbDetails(imdbId,omdbKey,signal)}catch(err){console.warn('OMDb enrichment failed',err)}
  const rating=Number(omdb?.imdbRating??m.imdbRating),votes=Number(String(omdb?.imdbVotes||'').replace(/,/g,''));
  const directors=clean(Array.isArray(m.director)?m.director.join(', '):m.director||omdb?.Director||'');
  const actors=clean(Array.isArray(m.cast)?m.cast.join(', '):m.cast||omdb?.Actors||'');
  const genres=clean(Array.isArray(m.genres)?m.genres.join(', '):m.genre||omdb?.Genre||'');
  const runtimeRaw=m.runtime||omdb?.Runtime||'',runtime=Number(String(runtimeRaw).match(/\d+/)?.[0])||0;
  const released=String(m.released||m.releaseInfo||'').slice(0,10);
  return {kind:'movie',source:'Cinemeta',sourceId:imdbId,tmdbId:'',imdbId,title:clean(m.name||item.title||omdb?.Title||'Film'),originalTitle:'',
   year:year(m.year||m.releaseInfo||m.released||omdb?.Year),releaseDate:/^\d{4}-\d{2}-\d{2}/.test(released)?released:'',
   runtime,genre:genres,cover:poster(m.poster||((omdb?.Poster&&omdb.Poster!=='N/A')?omdb.Poster:''))||item.cover||'',backdrop:backdrop(m.background||m.banner||''),
   synopsis:clean(m.description||omdb?.Plot).slice(0,1800),director:directors,cast:actors,communityScore:Number.isFinite(rating)?Math.round(rating*10):null,
   communitySource:'IMDb',imdbRating:Number.isFinite(rating)?rating:null,imdbVotes:Number.isFinite(votes)?votes:0,
   sourceUrl:'https://www.imdb.com/title/'+imdbId+'/',collectionId:'',collectionName:''};
 }
 async function searchWikidata(q,signal){
  const r=await fetch(wdApi({action:'wbsearchentities',search:q,language:'en',uselang:'en',type:'item',limit:'20'}),{signal,headers:{Accept:'application/json'}});
  if(!r.ok)throw Error('Wikidata HTTP '+r.status);const j=await r.json();
  return (j.search||[]).filter(x=>x&&/^Q\d+$/.test(String(x.id||''))&&filmDescription(x.description)).slice(0,14).map(x=>({kind:'movie',key:'movie-wikidata-'+x.id,source:'Wikidata',sourceId:String(x.id),tmdbId:'',imdbId:'',title:clean(x.label||x.display?.label?.value||'Film'),english:'',year:year(x.description),releaseDate:'',cover:'',backdrop:'',genre:'',synopsis:clean(x.description).slice(0,700),score:null,format:'MOVIE',sourceUrl:wdUrl(x.id)}));
 }
 async function search(q,{tmdbToken='',omdbKey='',signal}={}){
  const query=String(q||'').trim();if(query.length<2)return {items:[],provider:'',authNeeded:false};
  if(String(tmdbToken).trim()){try{const items=await searchTMDB(query,tmdbToken,signal);if(items.length)return {items,provider:'TMDB',authNeeded:false}}catch(err){if(signal?.aborted)throw err;console.warn('TMDB movie search failed',err)}}
  try{const items=await searchCinemeta(query,signal);if(items.length)return {items,provider:'IMDb/Cinemeta',authNeeded:false}}catch(err){if(signal?.aborted)throw err;console.warn('Cinemeta movie search failed',err)}
  if(String(omdbKey).trim()){try{const items=await searchOMDb(query,omdbKey,signal);if(items.length)return {items,provider:'OMDb',authNeeded:false}}catch(err){if(signal?.aborted)throw err;console.warn('OMDb movie search failed',err)}}
  try{return {items:await searchWikidata(query,signal),provider:'Wikidata',authNeeded:false}}catch(err){if(signal?.aborted)throw err;console.warn('Wikidata movie search failed',err);return {items:[],provider:'Wikidata',authNeeded:false}}
 }
 async function omdbDetails(imdbId,key,signal){
  if(!imdbId||!key)return null;const url='https://www.omdbapi.com/?'+new URLSearchParams({apikey:key,i:imdbId,plot:'full'});
  const r=await fetch(url,{signal});if(!r.ok)throw Error('OMDb HTTP '+r.status);const j=await r.json();if(j.Response==='False')return null;return j;
 }
 async function wikidataDetails(item,{omdbKey='',signal}={}){
  const id=String(item?.sourceId||'');if(!/^Q\d+$/.test(id))throw Error('Wikidata ID i pavlefshëm.');
  const r=await fetch(wdApi({action:'wbgetentities',ids:id,props:'claims|labels|descriptions',languages:'en'}),{signal,headers:{Accept:'application/json'}});
  if(!r.ok)throw Error('Wikidata HTTP '+r.status);const j=await r.json(),e=j.entities?.[id];if(!e||e.missing!==undefined)throw Error('Filmi nuk u gjet në Wikidata.');
  const imdbId=String(claim(e,'P345')||''),releaseDate=claimTime(e,'P577'),image=String(claim(e,'P18')||''),label=e.labels?.en?.value||item.title||'Film',description=e.descriptions?.en?.value||item.synopsis||'';
  let omdb=null;try{omdb=await omdbDetails(imdbId,omdbKey,signal)}catch(err){console.warn('OMDb enrichment failed',err)}
  const rating=Number(omdb?.imdbRating),votes=Number(String(omdb?.imdbVotes||'').replace(/,/g,''));
  return {kind:'movie',source:'Wikidata',sourceId:id,tmdbId:'',imdbId,title:clean(omdb?.Title||label),originalTitle:'',year:year(releaseDate)||year(omdb?.Year)||item.year||null,releaseDate,runtime:Number(String(omdb?.Runtime||'').match(/\d+/)?.[0])||claimAmount(e,'P2047'),genre:clean(omdb?.Genre==='N/A'?'':omdb?.Genre||''),cover:poster(omdb?.Poster==='N/A'?'':omdb?.Poster)||commonsFile(image)||item.cover||'',backdrop:'',synopsis:clean(omdb?.Plot&&omdb.Plot!=='N/A'?omdb.Plot:description).slice(0,1800),director:clean(omdb?.Director==='N/A'?'':omdb?.Director||''),cast:clean(omdb?.Actors==='N/A'?'':omdb?.Actors||''),communityScore:null,communitySource:'Wikidata',imdbRating:Number.isFinite(rating)?rating:null,imdbVotes:Number.isFinite(votes)?votes:0,sourceUrl:wdUrl(id),collectionId:'',collectionName:''};
 }
 async function details(item,{tmdbToken='',omdbKey='',signal}={}){
  if(item?.source==='Cinemeta')return cinemetaDetails(item,{omdbKey,signal});
  if(item?.source==='Wikidata')return wikidataDetails(item,{omdbKey,signal});
  if(item?.source==='TMDB'&&String(tmdbToken).trim()){
   const url='https://api.themoviedb.org/3/movie/'+encodeURIComponent(item.sourceId)+'?'+new URLSearchParams({language:'en-US',append_to_response:'credits,external_ids'});
   const r=await fetch(url,{headers:auth(tmdbToken),signal});if(!r.ok)throw Error('TMDB HTTP '+r.status);const m=await r.json();
   const imdbId=String(m.external_ids?.imdb_id||'');let omdb=null;try{omdb=await omdbDetails(imdbId,omdbKey,signal)}catch(err){console.warn('OMDb enrichment failed',err)}
   const director=clean((m.credits?.crew||[]).find(x=>x.job==='Director')?.name||omdb?.Director||'');
   const cast=clean((m.credits?.cast||[]).slice(0,8).map(x=>x.name).filter(Boolean).join(', ')||omdb?.Actors||'');
   const imdbRating=Number(omdb?.imdbRating),imdbVotes=Number(String(omdb?.imdbVotes||'').replace(/,/g,''));
   return {kind:'movie',source:'TMDB',sourceId:String(m.id),tmdbId:String(m.id),imdbId,title:clean(m.title||m.original_title||item.title),originalTitle:clean(m.original_title||''),year:year(m.release_date),releaseDate:String(m.release_date||''),runtime:Math.max(0,Number(m.runtime)||0),genre:clean((m.genres||[]).map(x=>x.name).join(', ')),cover:poster(m.poster_path)||item.cover||'',backdrop:backdrop(m.backdrop_path)||item.backdrop||'',synopsis:clean(m.overview||omdb?.Plot).slice(0,1800),director,cast,communityScore:Number.isFinite(Number(m.vote_average))?Math.round(Number(m.vote_average)*10):null,communitySource:'TMDB',imdbRating:Number.isFinite(imdbRating)?imdbRating:null,imdbVotes:Number.isFinite(imdbVotes)?imdbVotes:0,sourceUrl:tmdbUrl(m.id),collectionId:m.belongs_to_collection?.id?String(m.belongs_to_collection.id):'',collectionName:String(m.belongs_to_collection?.name||'')};
  }
  const imdbId=item?.imdbId||item?.sourceId;const m=await omdbDetails(imdbId,omdbKey,signal);if(!m)throw Error('Nuk u gjetën detajet e filmit.');
  const rating=Number(m.imdbRating),votes=Number(String(m.imdbVotes||'').replace(/,/g,''));
  return {kind:'movie',source:'OMDb',sourceId:String(m.imdbID||imdbId),tmdbId:'',imdbId:String(m.imdbID||imdbId),title:clean(m.Title||item.title),originalTitle:'',year:year(m.Year),releaseDate:'',runtime:Number(String(m.Runtime||'').match(/\d+/)?.[0])||0,genre:clean(m.Genre||''),cover:poster(m.Poster==='N/A'?'':m.Poster)||item.cover||'',backdrop:'',synopsis:clean(m.Plot).slice(0,1800),director:clean(m.Director==='N/A'?'':m.Director||''),cast:clean(m.Actors==='N/A'?'':m.Actors||''),communityScore:null,communitySource:'',imdbRating:Number.isFinite(rating)?rating:null,imdbVotes:Number.isFinite(votes)?votes:0,sourceUrl:m.imdbID?'https://www.imdb.com/title/'+m.imdbID+'/':'',collectionId:'',collectionName:''};
 }
 async function collection(id,token,signal){
  if(!id||!token)return [];const r=await fetch('https://api.themoviedb.org/3/collection/'+encodeURIComponent(id)+'?language=en-US',{headers:auth(token),signal});if(!r.ok)throw Error('TMDB collection HTTP '+r.status);const j=await r.json();
  return (j.parts||[]).filter(x=>x&&x.id).sort((a,b)=>String(a.release_date||'9999').localeCompare(String(b.release_date||'9999'))).map(m=>({kind:'movie',key:'movie-tmdb-'+m.id,source:'TMDB',sourceId:String(m.id),tmdbId:String(m.id),imdbId:'',title:clean(m.title||m.original_title||'Film'),year:year(m.release_date),releaseDate:String(m.release_date||''),cover:poster(m.poster_path),backdrop:backdrop(m.backdrop_path),synopsis:clean(m.overview).slice(0,500),score:Number.isFinite(Number(m.vote_average))?Math.round(Number(m.vote_average)*10):null,format:'MOVIE',sourceUrl:tmdbUrl(m.id)}));
 }
 return {search,details,collection,poster,backdrop};
})();
