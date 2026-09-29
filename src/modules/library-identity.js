/* One library record per verified anime identity. Repairs are pure so failed
   persistence can restore the original payload, including history and ratings. */
window.ATLibraryIdentity137=(()=>{
 const clone=value=>JSON.parse(JSON.stringify(value));
 const unique=values=>[...new Set(values.filter(Boolean).map(String))];
 const bridge=()=>window.ATProviderBridge12124;
 const isTV=a=>bridge()?.isTVMaze(a)===true;
 const providerKey=(source,id)=>id?({AniList:'al',MyAnimeList:'mal',TVMaze:'tvmaze'}[source]||'')+':'+String(id):'';
 function providerIds(a){
  const ids=[...(a?.providerIds||[])];
  for(const row of [a,...(a?.seasons||[])]){
   if(!row)continue;
   const key=providerKey(row.source,row.sourceId);if(/^(al|mal|tvmaze):\d+$/.test(key))ids.push(key);
   if(row.malId)ids.push('mal:'+String(row.malId));
  }
  return unique(ids);
 }
 function samePart(a,b){
  if(a.malId&&b.malId&&String(a.malId)===String(b.malId))return true;
  if(a.sourceId&&b.sourceId&&a.source===b.source&&String(a.sourceId)===String(b.sourceId)){
   if(a.source==='TVMaze')return Number(a.imdbSeasonNumber)===Number(b.imdbSeasonNumber);
   return true;
  }
  return !!(a.id&&a.id===b.id&&!String(a.id).startsWith('manual-'));
 }
 const joinNotes=(a,b,max=2500)=>!a?b||'':!b||a===b?a:(a+'\n\n'+b).slice(0,max);
 function mergePart(target,incoming){
  target.total=Math.max(Number(target.total)||0,Number(incoming.total)||0,...(target.watched||[]),...(incoming.watched||[]));
  target.watched=[...new Set([...(target.watched||[]),...(incoming.watched||[])].map(Number))].sort((a,b)=>a-b);
  target.aliases=unique([...(target.aliases||[]),...(incoming.aliases||[]),target.subtitle,incoming.subtitle]);
  target.hidden=target.hidden===true||incoming.hidden===true;
  if(target.myRating==null&&incoming.myRating!=null)target.myRating=incoming.myRating;
  const arcs=new Map((target.arcRatings||[]).map(x=>[x.id,x]));
  for(const arc of incoming.arcRatings||[])if(!arcs.has(arc.id))arcs.set(arc.id,arc);
  target.arcRatings=[...arcs.values()];
  const episodes=new Map((target.episodes||[]).map(e=>[Number(e.number),e]));
  for(const ep of incoming.episodes||[]){
   const previous=episodes.get(Number(ep.number));
   if(!previous){episodes.set(Number(ep.number),clone(ep));continue}
   for(const [key,value] of Object.entries(ep))if((previous[key]==null||previous[key]===''||previous[key]===0||previous[key]===false)&&value!=null&&value!=='')previous[key]=value;
   previous.myNote=joinNotes(previous.myNote,ep.myNote,1500);
  }
  target.episodes=[...episodes.values()].sort((a,b)=>a.number-b.number);
  for(const [key,value] of Object.entries(incoming))if((target[key]==null||target[key]===''||target[key]===0)&&value!=null&&value!=='')target[key]=clone(value);
  return target;
 }
 function repair(input){
  if(!Array.isArray(input?.anime))return {payload:input,changed:false,removed:[],remap:[]};
  const payload=clone(input),list=payload.anime,removed=[],remap=[];
  // Only official media IDs or IDs retained from a previous verified merge can
  // connect records. Similar names alone never merge anime adaptations.
  let repeat=true;
  while(repeat){
   repeat=false;
   const byKey=new Map();
   outer:for(const a of list){
    if(isTV(a))continue;
    const keys=unique(['library:'+a.id,...(a.mergedIds||[]).map(id=>'library:'+id),...providerIds(a).filter(k=>/^(al|mal):/.test(k))]);
    for(const key of keys){
     const other=byKey.get(key);if(!other){byKey.set(key,a);continue}if(other===a)continue;
     const group=[other,a].sort((x,y)=>String(x.createdAt||'9999').localeCompare(String(y.createdAt||'9999'))||String(x.id).localeCompare(String(y.id)));
     const keeper=group[0],duplicate=group[1],seasonMap={};
     keeper.providerIds=unique([...providerIds(keeper),...providerIds(duplicate)]);
     keeper.mergedIds=unique([...(keeper.mergedIds||[]),...(duplicate.mergedIds||[]),duplicate.id]).filter(id=>id!==keeper.id);
     keeper.aliases=unique([...(keeper.aliases||[]),...(duplicate.aliases||[]),keeper.title,duplicate.title]);
     keeper.seasons=keeper.seasons||[];
     for(const part of duplicate.seasons||[]){
      const target=keeper.seasons.find(s=>samePart(s,part));
      if(target){mergePart(target,part);seasonMap[part.id]=target.id}else{const copy=clone(part);if(keeper.seasons.some(s=>s.id===copy.id))copy.id='manual-'+String(duplicate.id).slice(0,40)+'-'+keeper.seasons.length;keeper.seasons.push(copy);seasonMap[part.id]=copy.id}
     }
     keeper.notes=joinNotes(keeper.notes,duplicate.notes);
     keeper.favorite=!!(keeper.favorite||duplicate.favorite);
     if(keeper.rating==null&&duplicate.rating!=null)keeper.rating=duplicate.rating;
     for(const key of ['cover','synopsis','genre'])if(!keeper[key]&&duplicate[key])keeper[key]=duplicate[key];
     if(keeper.status==='planning'&&duplicate.status!=='planning')keeper.status=duplicate.status;
     keeper.rewatches=[...(keeper.rewatches||[])];
     for(const rewatch of duplicate.rewatches||[]){
      const copy=clone(rewatch);copy.episodes=(copy.episodes||[]).map(e=>({...e,seasonId:seasonMap[e.seasonId]||e.seasonId}));
      const previous=keeper.rewatches.find(r=>r.id===copy.id);
      if(!previous)keeper.rewatches.push(copy);else previous.episodes=[...new Map([...(previous.episodes||[]),...copy.episodes].map(e=>[e.eventId||[e.seasonId,e.number,e.date].join('|'),e])).values()];
     }
     if(!keeper.activeRewatchId)keeper.activeRewatchId=duplicate.activeRewatchId||'';
     for(const event of payload.history||[])if(event.id===duplicate.id){event.id=keeper.id;event.seasonId=seasonMap[event.seasonId]||event.seasonId}
     keeper.updatedAt=[keeper.updatedAt,duplicate.updatedAt].filter(Boolean).sort().at(-1)||'';
     list.splice(list.indexOf(duplicate),1);removed.push(duplicate.id);remap.push({from:duplicate.id,to:keeper.id,seasons:seasonMap});
     repeat=true;break outer;
    }
   }
  }
  const bridged=bridge()?.repair(list,payload.history||[]);
  if(bridged?.changed){payload.anime=bridged.library;payload.history=bridged.history;removed.push(...bridged.removed);remap.push(...bridged.bridged)}
  for(const a of payload.anime)for(const id of a.mergedIds||[])if(id!==a.id&&!remap.some(x=>x.from===id))remap.push({from:id,to:a.id});
  const resolve=id=>{let current=id;for(let n=0;n<remap.length;n++){const hit=remap.find(x=>x.from===current);if(!hit)break;current=hit.to}return current};
  let referencesChanged=false;
  for(const collection of payload.preferences?.customLists||[]){const ids=unique((collection.animeIds||[]).map(resolve));if(JSON.stringify(ids)!==JSON.stringify(collection.animeIds))referencesChanged=true;collection.animeIds=ids}
  if(!removed.length&&!referencesChanged)return {payload:input,changed:false,removed,remap:[]};
  for(const a of payload.anime){
   if(isTV(a))continue;
   const helper=window.ATFranchise1212;
   const rows=helper?.labels(a.seasons||[]);if(rows)a.seasons=rows.map(({part,title})=>({...part,title:String(part.id||'').startsWith('manual-')?part.title:title}));
   const primary=(a.seasons||[]).find(s=>['TV','TV_SHORT','ONA'].includes(s.format)&&['AniList','MyAnimeList'].includes(s.source));
   if(primary){if(a.format==='MOVIE'&&primary.subtitle)a.title=primary.subtitle;a.source=primary.source;a.sourceId=primary.sourceId;a.malId=primary.malId||a.malId;a.format=primary.format}
  }
  for(const event of payload.history||[])event.id=resolve(event.id);
  payload.history=[...new Map((payload.history||[]).map(e=>[e.eventId||[e.id,e.seasonId,e.episode,e.action,e.date,JSON.stringify(e.episodes||[])].join('|'),e])).values()];
  return {payload,changed:true,removed:unique(removed),remap};
 }
 return {repair,providerIds,mergePart};
})();
