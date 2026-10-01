/* AnimeTrack 13.5.2 — release availability guard.
   TVMaze episode availability is derived only from TVMaze episode dates.
   Incomplete/foreign metadata must never hide already-known season episodes. */
window.ATReleaseGuard1352=(()=>{
 'use strict';
 const source=s=>String(s?.source||'').trim().toLowerCase();
 const nums=a=>(Array.isArray(a)?a:[]).map(Number).filter(n=>Number.isInteger(n)&&n>0);
 const dateOf=ep=>{
  const raw=String(ep?.airedAt||ep?.aired||'').trim();
  if(!raw)return NaN;
  const value=/^\d{4}-\d{2}-\d{2}$/.test(raw)?raw+'T23:59:59Z':raw;
  return Date.parse(value);
 };
 function tvmazeReleasedCount(s,at=Date.now()){
  if(source(s)!=='tvmaze')return null;
  const watchedMax=Math.max(0,...nums(s?.watched));
  const total=Math.max(0,Number(s?.total)||0);
  const start=String(s?.releaseStart||'');
  const startAt=start?Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(start)?start+'T00:00:00Z':start):NaN;
  if(Number.isFinite(startAt)&&startAt>at&&watchedMax===0)return 0;

  const episodes=(Array.isArray(s?.episodes)?s.episodes:[])
    .filter(ep=>Number.isInteger(Number(ep?.number))&&Number(ep.number)>0);
  const uniqueNumbers=new Set(episodes.map(ep=>Number(ep.number)));
  const catalogComplete=total>0&&uniqueNumbers.size>=total;
  const future=episodes.filter(ep=>dateOf(ep)>at).map(ep=>Number(ep.number));
  if(future.length){
    const limit=Math.min(...future)-1;
    const dated=Math.max(0,...episodes.filter(ep=>dateOf(ep)<=at).map(ep=>Number(ep.number)));
    return Math.min(total||10000,limit,Math.max(watchedMax,dated));
  }
  if(s.releaseEvidence===true)return Math.min(total||10000,Math.max(0,Number(s.airedCount)||0));

  if(catalogComplete){
    let dated=0,validDates=0;
    for(const ep of episodes){
      const ts=dateOf(ep);
      if(!Number.isFinite(ts))continue;
      validDates++;
      if(ts<=at)dated=Math.max(dated,Number(ep.number)||0);
    }
    if(validDates>=total){
      return Math.max(watchedMax,Math.min(total,dated));
    }
    const confirmed=Math.max(0,Number(s?.airedCount)||0);
    if(confirmed>0){
      return Math.max(watchedMax,Math.min(total,confirmed));
    }
  }

  // Critical safety rule: an incomplete TVMaze catalog (or foreign release metadata)
  // cannot demote known episodes to "upcoming". The known season total stays available.
  return Math.max(watchedMax,total);
 }
 return {tvmazeReleasedCount};
})();
