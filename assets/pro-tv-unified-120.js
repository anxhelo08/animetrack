/* AnimeTrack 12.0 — TVMaze titles use the exact anime library schema.
   Legacy tvShows are converted without discarding watched episode IDs. */
window.ATTVUnified120=(()=>{
 const dexterNames=['Dexter','Dexter: New Blood','Dexter: Original Sin','Dexter: Resurrection'];
 const isDexter=title=>dexterNames.some(n=>n.toLowerCase()===String(title||'').trim().toLowerCase());
 const isTV=a=>a?.source==='TVMaze'||a?.format==='TV_SERIES'||String(a?.id||'').startsWith('tvmaze-');
 const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''))?String(v):'';
 const clean=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 const poster=u=>/^https?:\/\//.test(String(u||''))?String(u):'';
 function convert(raw){
  if(!raw||!Number.isInteger(Number(raw.sourceId))||Number(raw.sourceId)<1)return null;
  const showId=Number(raw.sourceId),title=String(raw.title||'Serial TV').slice(0,180);
  const seasons=(raw.seasons||[]).map(x=>{
   const seasonNo=Number(x.number)||0,episodes=(x.episodes||[]).filter(e=>Number(e.id)>0).map((e,i)=>({
    number:Number(e.number)>0?Number(e.number):i+1,title:String(e.title||'Episodi '+(i+1)).slice(0,220),
    aired:validDate(e.airdate),airedAt:validDate(e.airdate)?validDate(e.airdate)+'T12:00:00Z':'',
    summary:clean(e.summary).slice(0,2500),image:poster(e.image),tvmazeEpisodeId:String(e.id),absolute:0
   })).sort((a,b)=>a.number-b.number);
   const unique=new Map(episodes.map(e=>[e.number,e]));
   const sorted=[...unique.values()],total=sorted.length?Math.max(...sorted.map(e=>e.number)):0;
   const watched=sorted.filter(e=>(raw.watched||[]).map(Number).includes(Number(e.tvmazeEpisodeId))).map(e=>e.number);
   return {id:'tvmaze-'+showId+'-s'+seasonNo,title:(isDexter(title)?title+' · ':'')+(seasonNo===0?'Speciale':'Sezoni '+seasonNo),subtitle:title,total,watched,source:'TVMaze',sourceId:String(showId),format:'TV_SERIES',year:raw.year||null,releaseStatus:'',episodes:sorted,imdbSeasonNumber:seasonNo};
  }).filter(s=>s.total>0).sort((a,b)=>Number(a.id.split('-s').pop())-Number(b.id.split('-s').pop()));
  if(!seasons.length)seasons.push({id:'tvmaze-'+showId+'-s1',title:'Sezoni 1',subtitle:title,total:0,watched:[],source:'TVMaze',sourceId:String(showId),format:'TV_SERIES',episodes:[]});
  return {id:'tvmaze-'+showId,title,status:raw.status||'planning',format:'TV_SERIES',source:'TVMaze',sourceId:String(showId),tvmazeId:String(showId),tvmazeLoaded:true,hydrated:true,cover:poster(raw.image),year:raw.year||null,genre:(raw.genres||[]).join(', '),synopsis:clean(raw.summary),sourceUrl:raw.url||'',rating:null,communityScore:raw.rating?Math.round(Number(raw.rating)*10):null,communitySource:'TVMaze',createdAt:raw.updatedAt||new Date().toISOString(),updatedAt:raw.updatedAt||new Date().toISOString(),seasons};
 }
 function merge(anime,raw,normalize){
  const incoming=convert(raw);if(!incoming)return {anime,entry:null,changed:false};
  const list=anime.slice(),existing=list.find(a=>isTV(a)&&(a.id===incoming.id||a.seasons?.some(s=>incoming.seasons.some(x=>x.id===s.id))||(isDexter(a.title)&&isDexter(incoming.title))));
  if(!existing){list.push(normalize(incoming));return {anime:list,entry:list[list.length-1],changed:true}}
  let changed=false;
  const ids=new Set(existing.seasons.map(s=>s.id));
  for(const season of incoming.seasons){if(!ids.has(season.id)){existing.seasons.push(season);ids.add(season.id);changed=true}else{
    const current=existing.seasons.find(s=>s.id===season.id);
    const prior=new Set(current.watched||[]);
    const epIds=new Map((current.episodes||[]).map(e=>[e.tvmazeEpisodeId,e.number]));
    for(const ep of season.episodes)if(!epIds.has(ep.tvmazeEpisodeId)){current.episodes.push(ep);epIds.set(ep.tvmazeEpisodeId,ep.number);changed=true}
    for(const n of season.watched)if(!prior.has(n)){prior.add(n);changed=true}
    current.watched=[...prior].sort((a,b)=>a-b);
    current.total=Math.max(current.total,season.total);
   }}
  if(isDexter(existing.title)&&incoming.title==='Dexter'){existing.title='Dexter';if(incoming.cover)existing.cover=incoming.cover;changed=true}if(changed){existing.seasons.sort((a,b)=>{const ax=Number(a.sourceId),bx=Number(b.sourceId);return ax-bx||Number(a.id.split('-s').pop())-Number(b.id.split('-s').pop())});existing.updatedAt=new Date().toISOString()}
  const idx=list.indexOf(existing);list[idx]=normalize(existing);return {anime:list,entry:list[idx],changed};
 }
 function migrate(anime,legacy,normalize){let result=anime.slice(),changed=false;for(const show of legacy||[]){const next=merge(result,show,normalize);result=next.anime;changed=changed||next.changed}return {anime:result,tvShows:[],changed}}
 return {convert,merge,migrate,isTV,isDexter};
})();