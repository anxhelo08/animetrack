/* AnimeTrack 12.7 — release-first episode hub. Read-only personal grouping. */
window.ATEpisodeHub127=(()=>{
 const DAY=86400000,WINDOW=7*DAY;
 function when(value){const n=Date.parse(String(value||''));return Number.isFinite(n)?n:0}
 function lastTouched(anime,history=[],now=Date.now()){
  let recent=0;
  for(const h of history)if(h?.id===anime?.id&&['watched','season-watched'].includes(h.action))recent=Math.max(recent,when(h.date));
  return Math.min(now,recent||when(anime?.createdAt)||when(anime?.updatedAt)||now);
 }
 function classify(eligible,history,recent,now=Date.now()){
  const seen=new Set(),fresh=[];
  for(const item of recent||[]){
   const anime=item?.anime,season=item?.season,n=Number(item?.n),aired=Number(item?.when);
   if(!anime||!season||!Number.isInteger(n)||n<1||!Number.isFinite(aired)||aired>now||aired<now-WINDOW||item.watched||season.watched?.includes(n))continue;
   const key=String(anime.id)+'|'+String(season.id)+'|'+n;
   if(seen.has(key))continue;
   seen.add(key);fresh.push(item);
  }
  fresh.sort((a,b)=>b.when-a.when);
  const promoted=new Set(fresh.map(item=>item.anime.id)),active=[],stale=[];
  for(const anime of eligible||[]){
   if(promoted.has(anime.id))continue; // a new release is displayed once, in priority.
   (now-lastTouched(anime,history,now)>=WINDOW?stale:active).push(anime);
  }
  const sort=(a,b)=>lastTouched(b,history,now)-lastTouched(a,history,now)||String(a.title||'').localeCompare(String(b.title||''));
  return {fresh,active:active.sort(sort),stale:stale.sort(sort),all:[...(eligible||[])].sort(sort)};
 }
 return {DAY,WINDOW,lastTouched,classify};
})();
