/* AnimeTrack 12.7.3 — NEW EP is a badge on a previously completed title, never a separate feed. */
window.ATEpisodeHub127=(()=>{
 const DAY=86400000,WINDOW=7*DAY;
 function when(value){const n=Date.parse(String(value||''));return Number.isFinite(n)?n:0}
 function lastTouched(anime,history=[],now=Date.now()){
  let recent=0;
  for(const h of history)if(h?.id===anime?.id&&['watched','season-watched'].includes(h.action))recent=Math.max(recent,when(h.date));
  return Math.min(now,recent||when(anime?.createdAt)||when(anime?.updatedAt)||now);
 }
 function classify(eligible,history,recent,now=Date.now()){
  const allowed=new Set((eligible||[]).map(a=>a.id)),newEpisodes=new Map();
  for(const item of recent||[]){
   const anime=item?.anime,season=item?.season,n=Number(item?.n),aired=Number(item?.when);
   if(!anime||anime.status!=='completed'||!allowed.has(anime.id)||!season||!Number.isInteger(n)||n<1||!Number.isFinite(aired)||aired>now||aired<now-WINDOW||item.watched||season.watched?.includes(n))continue;
   const old=newEpisodes.get(anime.id);
   if(!old||aired>old.when)newEpisodes.set(anime.id,item);
  }
  const active=[],stale=[];
  for(const anime of eligible||[]){
   // A finished title with a newly aired episode rejoins normal Watching, even
   // when the previous watch was months ago. No change to its actual status.
   (newEpisodes.has(anime.id)||now-lastTouched(anime,history,now)<WINDOW?active:stale).push(anime);
  }
  const sort=(a,b)=>(Number(newEpisodes.has(b.id))-Number(newEpisodes.has(a.id)))||
   (newEpisodes.get(b.id)?.when||lastTouched(b,history,now))-(newEpisodes.get(a.id)?.when||lastTouched(a,history,now))||
   String(a.title||'').localeCompare(String(b.title||''));
  return {newEpisodes,active:active.sort(sort),stale:stale.sort(sort),all:[...(eligible||[])].sort(sort)};
 }
 return {DAY,WINDOW,lastTouched,classify};
})();
