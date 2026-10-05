/* AnimeTrack 13.0 — compact cloud-first recovery payloads.
   Supabase stores the canonical per-account user state. Reproducible episode
   metadata stays out of the hot sync path so PC <-> mobile updates remain small. */
window.ATCloudLocal12123=(()=>{
 const stamp=value=>Date.parse(value)||0;
 const timeMap=(value,at=Date.now(),prune=false)=>Object.fromEntries(Object.entries(value||{}).filter(([,v])=>Number.isFinite(Date.parse(v))&&(!prune||stamp(v)>=at-60*86400000)));
 const mergeTimes=(a,b,at,prune=false)=>timeMap(Object.fromEntries([...new Set([...Object.keys(a||{}),...Object.keys(b||{})])].map(k=>[k,stamp(a?.[k])>=stamp(b?.[k])?a?.[k]:b?.[k]])),at,prune);
 const clone=value=>JSON.parse(JSON.stringify(value));
 const ANIME_FIELDS=['id','title','status','rating','year','genre','cover','notes','favorite','communityScore','communitySource','source','sourceId','malId','aliases','mergedIds','providerIds','format','sourceUrl','synopsis','hydrated','franchiseVersion','tvmazeId','rewatches','activeRewatchId','imdbId','imdbRating','imdbVotes','tmdbId','runtime','director','cast','backdrop','trailer','releaseDate','movieWatchCount','lastWatchedAt','collectionId','collectionName','createdAt','updatedAt'];
 const SEASON_FIELDS=['id','title','subtitle','aliases','total','watched','unwatched','watchedAt','year','source','sourceId','malId','format','globalStart','epPage','myRating','arcRatings','releaseStatus','releaseStart','nextAiringAt','nextAiringEpisode','airedCount','imdbId','imdbSeasonNumber','hidden','watchEpisodeOffset'];
 const pick=(value,fields)=>{
  const out={};
  for(const key of fields){
   const v=value?.[key];
   if(v===undefined)continue;
   out[key]=v;
  }
  return out;
 };
 function compactEpisode(ep){
  const number=Number(ep?.number);
  if(!Number.isInteger(number)||number<1)return null;
  const note=String(ep?.myNote||'').trim();
  const rating=ep?.personalRating==null?null:Number(ep.personalRating);
  const manual=ep?.fillerManual===true?true:ep?.fillerManual===false?false:null;
  const hasWatchUrl=Object.prototype.hasOwnProperty.call(ep,'watchUrl'),watchUrl=String(ep?.watchUrl||'').slice(0,2000);
  if(!note&&rating==null&&manual==null&&!hasWatchUrl)return null;
  const out={number};
  if(note)out.myNote=note.slice(0,1500);
  if(Number.isFinite(rating))out.personalRating=Math.max(1,Math.min(10,rating));
  if(manual!==null)out.fillerManual=manual;
  if(hasWatchUrl)out.watchUrl=watchUrl;
  return out;
 }
 function compactSeason(season,at){
  const out=pick(season,SEASON_FIELDS);
  if(season?.unwatched)out.unwatched=timeMap(season.unwatched,at,true);
  out.watchUrl=String(season?.watchUrl||'').slice(0,2000);
  out.episodes=(Array.isArray(season?.episodes)?season.episodes:[]).map(compactEpisode).filter(Boolean);
  return out;
 }
 function compactAnime(anime,at){
  const out=pick(anime,ANIME_FIELDS);
  out.watchUrl=String(anime?.watchUrl||'').slice(0,2000);
  out.seasons=(Array.isArray(anime?.seasons)?anime.seasons:[]).map(s=>compactSeason(s,at));
  return out;
 }
 function compact(value,at=Date.now()){
  const input=value&&typeof value==='object'?value:{};
  return {
   cloudSchema:'13.0',
   ...(input.syncSchema?{syncSchema:input.syncSchema}:{}),
   ...(input.deleted?{deleted:timeMap(input.deleted,at,true)}:{}),
   anime:(Array.isArray(input.anime)?input.anime:[]).map(a=>compactAnime(a,at)),
   tvShows:[],
   ...(Array.isArray(input.readingLibrary)?{readingLibrary:clone(input.readingLibrary)}:{}),
   history:Array.isArray(input.history)?clone(input.history):[],
   preferences:input.preferences&&typeof input.preferences==='object'?clone(input.preferences):{}
  };
 }
 const animeKey=a=>String(a?.id||'')||`${a?.source||''}:${a?.sourceId||''}`;
 const seasonKey=s=>String(s?.id||'')||`${s?.source||''}:${s?.sourceId||''}`;
 function mergeEpisode(remote,local){return {...(remote||{}),...(local||{})}}
 function mergeSeason(remote,local,at,remoteAt=0,localAt=0){
  remote=remote||{};
  const richEpisodes=new Map((remote.episodes||[]).map(ep=>[Number(ep.number),ep]));
  for(const ep of local.episodes||[]){const n=Number(ep.number);richEpisodes.set(n,mergeEpisode(richEpisodes.get(n),ep))}
  const out={...remote,...local,episodes:[...richEpisodes.values()].sort((a,b)=>Number(a.number)-Number(b.number))};
  out.unwatched=mergeTimes(remote.unwatched,local.unwatched,at,true);
  out.watchedAt=mergeTimes(remote.watchedAt,local.watchedAt,at);
  // Each episode has its own ordering; editing another episode cannot restore it.
  out.watched=[...new Set([...(remote.watched||[]),...(local.watched||[])].map(Number).filter(n=>Number.isInteger(n)&&n>0))].filter(n=>!out.unwatched[n]||stamp(out.unwatched[n])<Math.max(stamp(remote.watchedAt?.[n])||(remote.watched||[]).includes(n)&&remoteAt||0,stamp(local.watchedAt?.[n])||(local.watched||[]).includes(n)&&localAt||0)).sort((a,b)=>a-b);
  out.total=Math.max(Number(remote.total)||0,Number(local.total)||0,...out.watched);
  if(remote.loadedPages)out.loadedPages=remote.loadedPages;
  if(remote.fillerPagesChecked)out.fillerPagesChecked=remote.fillerPagesChecked;
  return out;
 }
 function mergeAnime(remote,local,at){
  remote=remote||{};
  const remoteSeasons=new Map((remote.seasons||[]).map(s=>[seasonKey(s),s]));
  const merged=[];
  for(const ls of local.seasons||[]){const key=seasonKey(ls);merged.push(mergeSeason(remoteSeasons.get(key),ls,at,stamp(remote.updatedAt),stamp(local.updatedAt)));remoteSeasons.delete(key)}
  for(const rs of remoteSeasons.values())merged.push(rs);
  const rt=Date.parse(String(remote.updatedAt||'')),lt=Date.parse(String(local.updatedAt||''));
  const localNewer=!Number.isFinite(rt)||(Number.isFinite(lt)&&lt>=rt);
  const newer=localNewer?local:remote,older=localNewer?remote:local;
  const out={...older,...newer,seasons:merged};
  if(!out.synopsis)out.synopsis=remote.synopsis||local.synopsis||'';
  return out;
 }
 function merge(remote,local,at=Date.now()){
  const base=clone(remote||{anime:[],history:[],preferences:{}}),pending=clone(local||{});
  const remoteAnime=new Map((base.anime||[]).map(a=>[animeKey(a),a]));
  const anime=[];
  for(const la of pending.anime||[]){const key=animeKey(la);anime.push(mergeAnime(remoteAnime.get(key),la,at));remoteAnime.delete(key)}
  for(const ra of remoteAnime.values())anime.push(ra);
  const deleted=mergeTimes(base.deleted,pending.deleted,at,true);
  const liveAnime=anime.filter(a=>!deleted[a.id]||stamp(a.updatedAt)>stamp(deleted[a.id]));
  const historyMap=new Map();
  for(const row of [...(base.history||[]),...(pending.history||[])]){
   if(!row||typeof row!=='object')continue;
   const batch=Array.isArray(row.episodes)?[...new Set(row.episodes.map(Number))].sort((a,b)=>a-b).join(','):'';
   const key=row.eventId?'event:'+row.eventId:[row.id||'',row.seasonId||'',row.episode||'',row.action||'',row.date||row.at||'',batch].join('|');
   historyMap.set(key,row);
  }
  const lists=new Map();
  for(const list of [...(base.preferences?.customLists||[]),...(pending.preferences?.customLists||[])]){
   const prior=lists.get(list.id),a=Date.parse(prior?.updatedAt||''),b=Date.parse(list.updatedAt||'');
   if(!prior||!Number.isFinite(a)||(Number.isFinite(b)&&b>=a))lists.set(list.id,list);
  }
  const merged={
   ...base,
   anime:liveAnime,
   deleted,
   ...(pending.syncSchema?{syncSchema:pending.syncSchema}:{}),
   ...((Array.isArray(base.readingLibrary)||Array.isArray(pending.readingLibrary))?{readingLibrary:mergeReading(base.readingLibrary,pending.readingLibrary)}:{}),
   tvShows:[],
   history:[...historyMap.values()],
   preferences:{...(base.preferences||{}),...(pending.preferences||{}),customLists:[...lists.values()]}
  };
  return window.ATLibraryIdentity137?.repair(merged)?.payload||merged;
 }
 function mergeReading(remote=[],local=[]){
  const rows=new Map(remote.map(row=>[row.id,clone(row)]));
  for(const row of local){
   const prior=rows.get(row.id);if(!prior){rows.set(row.id,clone(row));continue}
   const localNewer=Date.parse(row.updatedAt)>=Date.parse(prior.updatedAt),newer=localNewer?row:prior,older=localNewer?prior:row;
   const events=new Map();for(const event of [...(older.journal||[]),...(newer.journal||[])])events.set(event.id,event);
   const journal=[...events.values()].sort((a,b)=>(a.recordedAt||a.date).localeCompare(b.recordedAt||b.date));
   const read=new Set([...(prior.chaptersRead||[]),...(row.chaptersRead||[])]);
   for(const event of journal){if(event.action==='read')read.add(event.chapter);else read.delete(event.chapter)}
   const total=Math.max(newer.totalChapters||0,older.totalChapters||0,...read);
   const releases=new Map();for(const entry of [...(older.chapterReleases||[]),...(newer.chapterReleases||[])]){const previous=releases.get(entry.chapter);if(!previous||Date.parse(entry.date)<Date.parse(previous.date))releases.set(entry.chapter,entry)}
   rows.set(row.id,{...older,...newer,totalChapters:(newer.totalChapters||older.totalChapters)?total:0,chapterReleases:[...releases.values()].sort((a,b)=>a.chapter-b.chapter).slice(-300),chaptersRead:[...read].sort((a,b)=>a-b),journal:journal.slice(-5000)});
  }
  return [...rows.values()];
 }
 function hydrateSeason(remote,rich){
  if(!rich)return clone(remote);
  const richEpisodes=new Map((rich.episodes||[]).map(ep=>[Number(ep.number),ep]));
  const remoteEpisodes=new Map((remote.episodes||[]).map(ep=>[Number(ep.number),ep]));
  const episodes=[];
  for(const ep of richEpisodes.values()){
   const n=Number(ep.number);
   const metadata={...ep,myNote:'',personalRating:null,fillerManual:null};delete metadata.watchUrl;
   const incoming=remoteEpisodes.get(n)||{};
   // Normalization adds empty metadata to compact cloud rows. Those defaults
   // must not erase the richer device cache; personal values remain authoritative.
   for(const [key,value] of Object.entries(incoming)){
    if(['myNote','personalRating','fillerManual','watchUrl','number'].includes(key)||
       (incoming.fillerChecked===true&&['filler','recap'].includes(key))||
       (value!==''&&value!=null&&value!==false&&value!==0))metadata[key]=value;
   }
   episodes.push(metadata);
   remoteEpisodes.delete(n);
  }
  for(const ep of remoteEpisodes.values())episodes.push(ep);
  return {...rich,...remote,unwatched:remote.unwatched||{},watchedAt:remote.watchedAt||{},tvmazeShowId:remote.tvmazeShowId||rich.tvmazeShowId||'',tvmazeSeasonNumber:remote.tvmazeSeasonNumber||rich.tvmazeSeasonNumber||0,watchUrl:remote.watchUrl||'',watchEpisodeOffset:remote.watchEpisodeOffset||0,episodes:episodes.sort((a,b)=>Number(a.number)-Number(b.number))};
 }
 function hydrateAnime(remote,rich){
  if(!rich)return clone(remote);
  const richSeasons=new Map((rich.seasons||[]).map(s=>[seasonKey(s),s]));
  const seasons=(remote.seasons||[]).map(rs=>hydrateSeason(rs,richSeasons.get(seasonKey(rs))));
  return {...rich,...remote,watchUrl:remote.watchUrl||'',seasons};
 }
 function hydrate(remote,richLocal,at=Date.now()){
  const incoming=clone(remote||{anime:[],history:[],preferences:{}}),rich=richLocal&&typeof richLocal==='object'?richLocal:{};
  const richAnime=new Map((rich.anime||[]).map(a=>[animeKey(a),a]));
  return {
   ...incoming,
   deleted:timeMap(incoming.deleted,at,true),
   anime:(incoming.anime||[]).filter(a=>!incoming.deleted?.[a.id]||stamp(a.updatedAt)>stamp(incoming.deleted[a.id])).map(a=>{const out=hydrateAnime(a,richAnime.get(animeKey(a)));out.seasons=out.seasons.map(s=>({...s,unwatched:timeMap(s.unwatched,at,true),watched:s.watched.filter(n=>!s.unwatched?.[n]||stamp(s.watchedAt?.[n])>stamp(s.unwatched[n]))}));return out}),
   tvShows:[],
   history:Array.isArray(incoming.history)?incoming.history:[],
   preferences:incoming.preferences&&typeof incoming.preferences==='object'?incoming.preferences:{}
  };
 }
 return {compact,merge,hydrate};
})();
