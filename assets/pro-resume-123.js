/* Resume from the most recent valid watched episode without writing to storage. */
window.ATResume123=(()=>{
 function resolve(a,history,released){
  const seasons=(Array.isArray(a?.seasons)?a.seasons:[]).filter(s=>!s.hidden);if(!seasons.length)return null;
  let anchor=null;
  for(let i=(Array.isArray(history)?history.length:0)-1;i>=0;i--){
   const h=history[i],s=seasons.find(x=>x.id===h?.seasonId);
   if(h?.id!==a.id||!s||!['watched','season-watched'].includes(h.action))continue;
   const n=h.action==='season-watched'?Math.max(0,...(s.watched||[])):Number(h.episode);
   if(Number.isInteger(n)&&n>0&&(s.watched||[]).includes(n)){anchor={index:seasons.indexOf(s),n};break}
  }
  if(!anchor)for(let i=seasons.length-1;i>=0;i--){const seen=seasons[i].watched||[];if(seen.length){anchor={index:i,n:Math.max(...seen)};break}}
  const at=(i,n,reason)=>({seasonId:seasons[i].id,episode:n,page:Math.floor((Math.max(1,n)-1)/24),reason});
  if(anchor){
   for(let i=anchor.index;i<seasons.length;i++){
    const season=seasons[i],limit=Math.max(0,Number(released(season))||0),seen=new Set(season.watched||[]);
    for(let n=i===anchor.index?anchor.n+1:1;n<=limit;n++)if(!seen.has(n))return at(i,n,'next');
   }
   return at(anchor.index,anchor.n,'last-watched');
  }
  for(let i=0;i<seasons.length;i++)if(Number(released(seasons[i]))>0)return at(i,1,'first');
  return at(0,1,'unreleased');
 }
 return {resolve};
})();
