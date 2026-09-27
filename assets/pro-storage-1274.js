/* AnimeTrack 12.7.4: quota-safe storage. Delete ONLY reproducible catalog caches.
   Never remove a library, guest library, pending journal, backup, settings or auth tokens. */
window.ATStorage1274=(()=>{
 const disposable=key=>key==='animetrack_v8_season_cache'||key==='animetrack_v6_meta'||/^animetrack_recs_v125_[\w-]+$/.test(key);
 const quota=error=>error?.name==='QuotaExceededError'||error?.code===22||error?.code===1014||/quota\s*(?:exceeded)?|storage\s*full/i.test(String(error?.message||''));
 function reclaim(storage){
  const found=[];
  try{
   for(let i=0;i<storage.length;i++){
    const key=storage.key(i);
    if(key&&disposable(key))found.push({key,size:(storage.getItem(key)||'').length});
   }
  }catch(error){console.warn('Cache inventory unavailable',error)}
  found.sort((a,b)=>b.size-a.size);
  const removed=[];
  for(const item of found)try{storage.removeItem(item.key);removed.push(item.key)}catch(error){console.warn('Cache removal unavailable',error)}
  return removed;
 }
 function write(storage,key,value){
  try{storage.setItem(key,value);return {ok:true,reclaimed:[]}}
  catch(error){
   if(!quota(error))throw error;
   const removed=reclaim(storage);
   try{storage.setItem(key,value);return {ok:true,reclaimed:removed}}
   catch(retry){if(!quota(retry))throw retry;return {ok:false,reclaimed:removed}}
  }
 }
 function save(storage,key,state,revision,cloud,sync){
  try{sync.save(storage,key,state,revision,cloud);return {ok:true,reclaimed:[]}}
  catch(error){
   if(!quota(error))throw error;
   const removed=reclaim(storage);
   try{sync.save(storage,key,state,revision,cloud);return {ok:true,reclaimed:removed}}
   catch(retry){if(!quota(retry))throw retry;return {ok:false,reclaimed:removed}}
  }
 }
 return {disposable,quota,reclaim,write,save};
})();
