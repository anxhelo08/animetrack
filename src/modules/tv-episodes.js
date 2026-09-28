/* AnimeTrack 12.7 — TVMaze episode metadata refresh, never touches viewing decisions. */
window.ATTVEpisodes127=(()=>{
 const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''))?String(v):'';
 function merge(entry,showId,raw,normalizeSeason){
  if(!entry||entry.source!=='TVMaze'||!Array.isArray(entry.seasons)||!Array.isArray(raw)||!/^\d+$/.test(String(showId)))return false;
  const id=String(showId),groups=new Map();
  for(const episode of raw){
   const sn=Number(episode?.season),n=Number(episode?.number),epId=Number(episode?.id);
   if(!Number.isInteger(sn)||sn<1||!Number.isInteger(n)||n<1||n>10000||!Number.isInteger(epId)||epId<1)continue;
   const group=groups.get(sn)||[];
   const aired=validDate(episode.airdate),stamp=String(episode.airstamp||'');
   group.push({number:n,title:String(episode.name||'Episodi '+n).slice(0,220),aired,airedAt:Number.isFinite(Date.parse(stamp))?stamp:aired?aired+'T12:00:00Z':'',summary:String(episode.summary||'').replace(/<[^>]*>/g,' ').slice(0,2500),image:String(episode.image?.medium||episode.image?.original||''),url:String(episode.url||''),tvmazeEpisodeId:String(epId)});
   groups.set(sn,group);
  }
  let changed=false;
  for(const [sn,episodes] of groups){
   const unique=[...new Map(episodes.sort((a,b)=>a.number-b.number).map(ep=>[ep.number,ep])).values()];
   const seasonId='tvmaze-'+id+'-s'+sn;
   let season=entry.seasons.find(s=>s.id===seasonId||(s.source==='TVmaze'&&String(s.sourceId)===id&&Number(s.imdbSeasonNumber||Number(String(s.id).split('-').at(-1)))===sn));
   if(!season){
    const sameShow=entry.seasons.find(s=>String(s.sourceId)===id),globalNo=entry.seasons.filter(s=>String(s.format||'').toUpperCase().replace(/[\s-]+/g,'_')==='TV_SERIES').length+1;const candidate={id:seasonId,title:'Sezoni '+globalNo,subtitle:(sameShow?.subtitle?String(sameShow.subtitle).split(' · Sezoni ')[0]:entry.title)+(sn>1?' · Sezoni '+sn:''),total:Math.max(...unique.map(ep=>ep.number)),watched:[],source:'TVMaze',sourceId:id,format:'TV_SERIES',imdbSeasonNumber:sn,episodes:unique};
    entry.seasons.push(normalizeSeason(candidate,entry.seasons.length));changed=true;continue;
   }
   const byNumber=new Map((season.episodes||[]).map(ep=>[Number(ep.number),ep]));
   const byId=new Set((season.episodes||[]).map(ep=>String(ep.tvmazeEpisodeId||'')).filter(Boolean));
   for(const ep of unique){
    const existing=byNumber.get(ep.number);
    if(!existing){
     if(byId.has(ep.tvmazeEpisodeId))continue; // numbering changed upstream: do not shift watched marks
     season.episodes.push(ep);byNumber.set(ep.number,ep);byId.add(ep.tvmazeEpisodeId);changed=true;continue;
    }
    if(existing.tvmazeEpisodeId&&existing.tvmazeEpisodeId!==ep.tvmazeEpisodeId)continue;
    for(const field of ['title','aired','airedAt','summary','image','url','tvmazeEpisodeId']){
     if(ep[field]&&existing[field]!==ep[field]){existing[field]=ep[field];changed=true}
    }
   }
   const total=Math.max(Number(season.total)||0,...unique.map(ep=>ep.number));
   if(season.total!==total){season.total=total;changed=true}
   if(changed)season.episodes.sort((a,b)=>Number(a.number)-Number(b.number));
  }
  return changed;
 }
 return {merge};
})();
