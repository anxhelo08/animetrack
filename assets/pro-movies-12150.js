/* AnimeTrack 12.15.0 — live-action movie catalog.
   TMDB is primary when a local Read Access Token is configured.
   OMDb is a fallback when its existing personal key is configured. */
window.ATMovies12150=(()=>{
 'use strict';
 const clean=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 const year=v=>{const n=Number(String(v||'').slice(0,4));return n>=1880&&n<=2200?n:null};
 const poster=p=>p?(/^https?:\/\//.test(String(p))?String(p):'https://image.tmdb.org/t/p/w500'+p):'';
 const backdrop=p=>p?(/^https?:\/\//.test(String(p))?String(p):'https://image.tmdb.org/t/p/w1280'+p):'';
 const tmdbUrl=id=>'https://www.themoviedb.org/movie/'+encodeURIComponent(id);
 const auth=t=>({accept:'application/json',Authorization:'Bearer '+String(t||'').trim()});
 async function searchTMDB(q,token,signal){
  const url='https://api.themoviedb.org/3/search/movie?'+new URLSearchParams({query:q,include_adult:'false',language:'en-US',page:'1'});
  const r=await fetch(url,{headers:auth(token),signal});if(!r.ok)throw Error('TMDB HTTP '+r.status);
  const j=await r.json();
  return (j.results||[]).slice(0,14).map(m=>({kind:'movie',key:'movie-tmdb-'+m.id,source:'TMDB',sourceId:String(m.id),tmdbId:String(m.id),imdbId:'',title:m.title||m.original_title||'Film',english:m.original_title||'',year:year(m.release_date),releaseDate:String(m.release_date||''),cover:poster(m.poster_path),backdrop:backdrop(m.backdrop_path),genre:'',synopsis:clean(m.overview).slice(0,700),score:Number.isFinite(Number(m.vote_average))?Math.round(Number(m.vote_average)*10):null,format:'MOVIE',sourceUrl:tmdbUrl(m.id)}));
 }
 async function searchOMDb(q,key,signal){
  const url='https://www.omdbapi.com/?'+new URLSearchParams({apikey:key,s:q,type:'movie',page:'1'});
  const r=await fetch(url,{signal});if(!r.ok)throw Error('OMDb HTTP '+r.status);const j=await r.json();
  if(j.Response==='False')return [];
  return (j.Search||[]).slice(0,12).map(m=>({kind:'movie',key:'movie-omdb-'+m.imdbID,source:'OMDb',sourceId:String(m.imdbID||''),tmdbId:'',imdbId:String(m.imdbID||''),title:m.Title||'Film',english:'',year:year(m.Year),releaseDate:'',cover:poster(m.Poster==='N/A'?'':m.Poster),backdrop:'',genre:'',synopsis:'',score:null,format:'MOVIE',sourceUrl:m.imdbID?'https://www.imdb.com/title/'+m.imdbID+'/':''}));
 }
 async function search(q,{tmdbToken='',omdbKey='',signal}={}){
  const query=String(q||'').trim();if(query.length<2)return {items:[],provider:'',authNeeded:false};
  if(String(tmdbToken).trim()){try{return {items:await searchTMDB(query,tmdbToken,signal),provider:'TMDB',authNeeded:false}}catch(err){if(signal?.aborted)throw err;console.warn('TMDB movie search failed',err)}}
  if(String(omdbKey).trim()){try{return {items:await searchOMDb(query,omdbKey,signal),provider:'OMDb',authNeeded:false}}catch(err){if(signal?.aborted)throw err;console.warn('OMDb movie search failed',err)}}
  return {items:[],provider:'',authNeeded:true};
 }
 async function omdbDetails(imdbId,key,signal){
  if(!imdbId||!key)return null;const url='https://www.omdbapi.com/?'+new URLSearchParams({apikey:key,i:imdbId,plot:'full'});
  const r=await fetch(url,{signal});if(!r.ok)throw Error('OMDb HTTP '+r.status);const j=await r.json();if(j.Response==='False')return null;return j;
 }
 async function details(item,{tmdbToken='',omdbKey='',signal}={}){
  if(item?.source==='TMDB'&&String(tmdbToken).trim()){
   const url='https://api.themoviedb.org/3/movie/'+encodeURIComponent(item.sourceId)+'?'+new URLSearchParams({language:'en-US',append_to_response:'credits,external_ids'});
   const r=await fetch(url,{headers:auth(tmdbToken),signal});if(!r.ok)throw Error('TMDB HTTP '+r.status);const m=await r.json();
   const imdbId=String(m.external_ids?.imdb_id||'');let omdb=null;try{omdb=await omdbDetails(imdbId,omdbKey,signal)}catch(err){console.warn('OMDb enrichment failed',err)}
   const director=(m.credits?.crew||[]).find(x=>x.job==='Director')?.name||omdb?.Director||'';
   const cast=(m.credits?.cast||[]).slice(0,8).map(x=>x.name).filter(Boolean).join(', ')||String(omdb?.Actors||'');
   const imdbRating=Number(omdb?.imdbRating),imdbVotes=Number(String(omdb?.imdbVotes||'').replace(/,/g,''));
   return {kind:'movie',source:'TMDB',sourceId:String(m.id),tmdbId:String(m.id),imdbId,title:m.title||m.original_title||item.title,originalTitle:m.original_title||'',year:year(m.release_date),releaseDate:String(m.release_date||''),runtime:Math.max(0,Number(m.runtime)||0),genre:(m.genres||[]).map(x=>x.name).join(', '),cover:poster(m.poster_path)||item.cover||'',backdrop:backdrop(m.backdrop_path)||item.backdrop||'',synopsis:clean(m.overview||omdb?.Plot).slice(0,1800),director,cast,communityScore:Number.isFinite(Number(m.vote_average))?Math.round(Number(m.vote_average)*10):null,communitySource:'TMDB',imdbRating:Number.isFinite(imdbRating)?imdbRating:null,imdbVotes:Number.isFinite(imdbVotes)?imdbVotes:0,sourceUrl:tmdbUrl(m.id),collectionId:m.belongs_to_collection?.id?String(m.belongs_to_collection.id):'',collectionName:String(m.belongs_to_collection?.name||'')};
  }
  const imdbId=item?.imdbId||item?.sourceId;const m=await omdbDetails(imdbId,omdbKey,signal);if(!m)throw Error('Nuk u gjetën detajet e filmit.');
  const rating=Number(m.imdbRating),votes=Number(String(m.imdbVotes||'').replace(/,/g,''));
  return {kind:'movie',source:'OMDb',sourceId:String(m.imdbID||imdbId),tmdbId:'',imdbId:String(m.imdbID||imdbId),title:m.Title||item.title,originalTitle:'',year:year(m.Year),releaseDate:'',runtime:Number(String(m.Runtime||'').match(/\d+/)?.[0])||0,genre:String(m.Genre||''),cover:poster(m.Poster==='N/A'?'':m.Poster)||item.cover||'',backdrop:'',synopsis:clean(m.Plot).slice(0,1800),director:String(m.Director==='N/A'?'':m.Director||''),cast:String(m.Actors==='N/A'?'':m.Actors||''),communityScore:null,communitySource:'',imdbRating:Number.isFinite(rating)?rating:null,imdbVotes:Number.isFinite(votes)?votes:0,sourceUrl:m.imdbID?'https://www.imdb.com/title/'+m.imdbID+'/':'',collectionId:'',collectionName:''};
 }
 async function collection(id,token,signal){
  if(!id||!token)return [];const r=await fetch('https://api.themoviedb.org/3/collection/'+encodeURIComponent(id)+'?language=en-US',{headers:auth(token),signal});if(!r.ok)throw Error('TMDB collection HTTP '+r.status);const j=await r.json();
  return (j.parts||[]).filter(x=>x&&x.id).sort((a,b)=>String(a.release_date||'9999').localeCompare(String(b.release_date||'9999'))).map(m=>({kind:'movie',key:'movie-tmdb-'+m.id,source:'TMDB',sourceId:String(m.id),tmdbId:String(m.id),imdbId:'',title:m.title||m.original_title||'Film',year:year(m.release_date),releaseDate:String(m.release_date||''),cover:poster(m.poster_path),backdrop:backdrop(m.backdrop_path),synopsis:clean(m.overview).slice(0,500),score:Number.isFinite(Number(m.vote_average))?Math.round(Number(m.vote_average)*10):null,format:'MOVIE',sourceUrl:tmdbUrl(m.id)}));
 }
 return {search,details,collection,poster,backdrop};
})();
