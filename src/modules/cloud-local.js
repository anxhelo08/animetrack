/* AnimeTrack 13.0 — compact cloud-first recovery payloads.
   Supabase stores the canonical per-account user state. Reproducible episode
   metadata stays out of the hot sync path so PC <-> mobile updates remain small. */
window.ATCloudLocal12123=(()=>{
 const clone=value=>JSON.parse(JSON.stringify(value));
 const ANIME_FIELDS=['id','title','status','rating','year','genre','cover','notes','favorite','communityScore','communitySource','source','sourceId','malId','aliases','mergedIds','providerIds','format','sourceUrl','synopsis','hydrated','franchiseVersion','tvmazeId','rewatches','activeRewatchId','imdbId','imdbRating','imdbVotes','tmdbId','runtime','director','cast','backdrop','releaseDate','movieWatchCount','lastWatchedAt','collectionId','collectionName','createdAt','updatedAt'];
 const SEASON_FIELDS=['id','title','subtitle','aliases','total','watched','year','source','sourceId','malId','format','globalStart','epPage','myRating','arcRatings','releaseStatus','releaseStart','nextAiringAt','nextAiringEpisode','airedCount','imdbId','imdbSeasonNumber','hidden'];
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
  if(!note&&rating==null&&manual==null)return null;
  const out={number};
  if(note)out.myNote=note.slice(0,1500);
  if(Number.isFinite(rating))out.personalRating=Math.max(1,Math.min(10,rating));
  if(manual!==null)out.fillerManual=manual;
  return out;
 }
 function compactSeason(season){
  const out=pick(season,SEASON_FIELDS);
  out.episodes=(Array.isArray(season?.episodes)?season.episodes:[]).map(compactEpisode).filter(Boolean);
  return out;
 }
 function compactAnime(anime){
  const out=pick(anime,ANIME_FIELDS);
  out.seasons=(Array.isArray(anime?.seasons)?anime.seasons:[]).map(compactSeason);
  return out;
 }
 function compact(value){
  const input=value&&typeof value==='object'?value:{};
  return {
   cloudSchema:'13.0',
   anime:(Array.isArray(input.anime)?input.anime:[]).map(compactAnime),
   tvShows:[],
   history:Array.isArray(input.history)?clone(input.history):[],
   preferences:input.preferences&&typeof input.preferences==='object'?clone(input.preferences):{}
  };
 }
 const animeKey=a=>String(a?.id||'')||`${a?.source||''}:${a?.sourceId||''}`;
 const seasonKey=s=>String(s?.id||'')||`${s?.source||''}:${s?.sourceId||''}`;
 function mergeEpisode(remote,local){return {...(remote||{}),...(local||{})}}
 function mergeSeason(remote,local){
  if(!remote)return clone(local);
  const richEpisodes=new Map((remote.episodes||[]).map(ep=>[Number(ep.number),ep]));
  for(const ep of local.episodes||[]){const n=Number(ep.number);richEpisodes.set(n,mergeEpisode(richEpisodes.get(n),ep))}
  const out={...remote,...local,episodes:[...richEpisodes.values()].sort((a,b)=>Number(a.number)-Number(b.number))};
  // Watching progress is monotonic during conflict recovery: never lose an episode
  // that was marked watched on either device.
  out.watched=[...new Set([...(remote.watched||[]),...(local.watched||[])].map(Number).filter(n=>Number.isInteger(n)&&n>0))].sort((a,b)=>a-b);
  out.total=Math.max(Number(remote.total)||0,Number(local.total)||0,...out.watched);
  if(remote.loadedPages)out.loadedPages=remote.loadedPages;
  if(remote.fillerPagesChecked)out.fillerPagesChecked=remote.fillerPagesChecked;
  return out;
 }
 function mergeAnime(remote,local){
  if(!remote)return clone(local);
  const remoteSeasons=new Map((remote.seasons||[]).map(s=>[seasonKey(s),s]));
  const merged=[];
  for(const ls of local.seasons||[]){const key=seasonKey(ls);merged.push(mergeSeason(remoteSeasons.get(key),ls));remoteSeasons.delete(key)}
  for(const rs of remoteSeasons.values())merged.push(rs);
  const rt=Date.parse(String(remote.updatedAt||'')),lt=Date.parse(String(local.updatedAt||''));
  const localNewer=!Number.isFinite(rt)||(Number.isFinite(lt)&&lt>=rt);
  const newer=localNewer?local:remote,older=localNewer?remote:local;
  const out={...older,...newer,seasons:merged};
  if(!out.synopsis)out.synopsis=remote.synopsis||local.synopsis||'';
  return out;
 }
 function merge(remote,local){
  const base=clone(remote||{anime:[],history:[],preferences:{}}),pending=clone(local||{});
  const remoteAnime=new Map((base.anime||[]).map(a=>[animeKey(a),a]));
  const anime=[];
  for(const la of pending.anime||[]){const key=animeKey(la);anime.push(mergeAnime(remoteAnime.get(key),la));remoteAnime.delete(key)}
  for(const ra of remoteAnime.values())anime.push(ra);
  const historyMap=new Map();
  for(const row of [...(base.history||[]),...(pending.history||[])]){
   if(!row||typeof row!=='object')continue;
   const key=[row.id||'',row.seasonId||'',row.episode||'',row.action||'',row.date||row.at||''].join('|');
   historyMap.set(key,row);
  }
  const merged={
   ...base,
   anime,
   tvShows:[],
   history:[...historyMap.values()],
   preferences:pending.preferences&&typeof pending.preferences==='object'?{...(base.preferences||{}),...pending.preferences}:(base.preferences||{})
  };
  return window.ATLibraryIdentity137?.repair(merged)?.payload||merged;
 }
 function hydrateSeason(remote,rich){
  if(!rich)return clone(remote);
  const richEpisodes=new Map((rich.episodes||[]).map(ep=>[Number(ep.number),ep]));
  const remoteEpisodes=new Map((remote.episodes||[]).map(ep=>[Number(ep.number),ep]));
  const episodes=[];
  for(const ep of richEpisodes.values()){
   const n=Number(ep.number);
   episodes.push({...ep,myNote:'',personalRating:null,fillerManual:null,...(remoteEpisodes.get(n)||{})});
   remoteEpisodes.delete(n);
  }
  for(const ep of remoteEpisodes.values())episodes.push(ep);
  return {...rich,...remote,episodes:episodes.sort((a,b)=>Number(a.number)-Number(b.number))};
 }
 function hydrateAnime(remote,rich){
  if(!rich)return clone(remote);
  const richSeasons=new Map((rich.seasons||[]).map(s=>[seasonKey(s),s]));
  const seasons=(remote.seasons||[]).map(rs=>hydrateSeason(rs,richSeasons.get(seasonKey(rs))));
  return {...rich,...remote,seasons};
 }
 function hydrate(remote,richLocal){
  const incoming=clone(remote||{anime:[],history:[],preferences:{}}),rich=richLocal&&typeof richLocal==='object'?richLocal:{};
  const richAnime=new Map((rich.anime||[]).map(a=>[animeKey(a),a]));
  return {
   ...incoming,
   anime:(incoming.anime||[]).map(a=>hydrateAnime(a,richAnime.get(animeKey(a)))),
   tvShows:[],
   history:Array.isArray(incoming.history)?incoming.history:[],
   preferences:incoming.preferences&&typeof incoming.preferences==='object'?incoming.preferences:{}
  };
 }
 return {compact,merge,hydrate};
})();