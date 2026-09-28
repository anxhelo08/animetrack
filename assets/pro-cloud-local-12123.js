/* AnimeTrack 12.12.3: compact per-account recovery snapshots.
   Supabase remains the canonical full library for signed-in accounts; localStorage
   keeps only progress/user data plus the minimum metadata needed for offline recovery. */
window.ATCloudLocal12123=(()=>{
 const clone=value=>JSON.parse(JSON.stringify(value));
 const EP_KEYS=['number','absolute','title','aired','airedAt','tvmazeEpisodeId','filler','recap','fillerChecked','fillerManual','myNote','personalRating'];
 function compactEpisode(ep){
  const out={};
  for(const key of EP_KEYS){
   const value=ep?.[key];
   if(value===undefined||value===null||value===''||value===false)continue;
   out[key]=value;
  }
  if(!Number.isInteger(Number(out.number))||Number(out.number)<1)return null;
  out.number=Number(out.number);
  return out;
 }
 function compact(value){
  const out=clone(value||{});
  out.anime=(Array.isArray(out.anime)?out.anime:[]).map(anime=>{
   delete anime.synopsis;
   anime.seasons=(Array.isArray(anime.seasons)?anime.seasons:[]).map(season=>{
    delete season.loadedPages;
    delete season.fillerPagesChecked;
    delete season.synopsis;
    delete season.sourceUrl;
    season.episodes=(Array.isArray(season.episodes)?season.episodes:[]).map(compactEpisode).filter(Boolean);
    return season;
   });
   return anime;
  });
  out.history=Array.isArray(out.history)?out.history:[];
  out.preferences=out.preferences&&typeof out.preferences==='object'?out.preferences:{};
  out.tvShows=[];
  return out;
 }
 const animeKey=a=>String(a?.id||'')||`${a?.source||''}:${a?.sourceId||''}`;
 const seasonKey=s=>String(s?.id||'')||`${s?.source||''}:${s?.sourceId||''}`;
 function mergeEpisode(remote,local){return {...(remote||{}),...(local||{})}}
 function mergeSeason(remote,local){
  if(!remote)return clone(local);
  const richEpisodes=new Map((remote.episodes||[]).map(ep=>[Number(ep.number),ep]));
  for(const ep of local.episodes||[]){const n=Number(ep.number);richEpisodes.set(n,mergeEpisode(richEpisodes.get(n),ep))}
  const out={...remote,...local,episodes:[...richEpisodes.values()].sort((a,b)=>Number(a.number)-Number(b.number))};
  // These are reproducible cache markers, never authoritative user data.
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
  const out={...remote,...local,seasons:merged};
  // Keep rich reproducible metadata from the server when the compact local copy omitted it.
  if(!local.synopsis&&remote.synopsis)out.synopsis=remote.synopsis;
  return out;
 }
 function merge(remote,local){
  const base=clone(remote||{anime:[],history:[],preferences:{}}),pending=clone(local||{});
  const remoteAnime=new Map((base.anime||[]).map(a=>[animeKey(a),a]));
  const anime=[];
  for(const la of pending.anime||[]){const key=animeKey(la);anime.push(mergeAnime(remoteAnime.get(key),la));remoteAnime.delete(key)}
  for(const ra of remoteAnime.values())anime.push(ra);
  return {
   ...base,
   anime,
   tvShows:[],
   history:Array.isArray(pending.history)?pending.history:(base.history||[]),
   preferences:pending.preferences&&typeof pending.preferences==='object'?pending.preferences:(base.preferences||{})
  };
 }
 return {compact,merge};
})();
