/* AnimeTrack 12.12.4: cross-provider anime franchise dedupe.
   AniList/MAL define the canonical anime timeline. TVMaze may enrich episode data,
   but must not create a second library card for the same anime franchise. */
window.ATProviderBridge12124=(()=>{
 const fmt=v=>{const r=String(v||'TV').trim().toUpperCase().replace(/[\s-]+/g,'_');if(r==='FILM'||r==='MOVIE')return'MOVIE';if(r==='TV_SPECIAL')return'SPECIAL';if(r==='TV_SERIES')return'TV';return r||'TV'};
 const canon=s=>String(s||'').toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const familyKeys=values=>window.ATFranchise1212?.familyTitleKeys?.(values)||[...new Set((Array.isArray(values)?values:[values]).map(canon).filter(x=>x.length>=4))];
 const isTVMaze=a=>a?.source==='TVMaze'||String(a?.id||'').startsWith('tvmaze-')||(a?.seasons||[]).some(s=>String(s?.source||'').toLowerCase()==='tvmaze');
 const isCanonical=a=>!isTVMaze(a)&&((['AniList','MyAnimeList'].includes(a?.source))||(a?.seasons||[]).some(s=>['AniList','MyAnimeList'].includes(s?.source)));
 const titleValues=a=>[a?.title,a?.english,...(a?.aliases||[]),...(a?.synonyms||[]),...(a?.seasons||[]).flatMap(s=>[s?.subtitle,...(s?.aliases||[])])].filter(Boolean);
 const keys=a=>new Set(familyKeys(titleValues(a)).filter(x=>x.length>=4));
 const tvParts=a=>(a?.seasons||[]).filter(s=>fmt(s?.format)==='TV'&&Number(s?.total)>0).slice().sort((a,b)=>(Number(a?.imdbSeasonNumber)||Number(String(a?.id||'').match(/(?:-s|-)(\d+)$/)?.[1])||999)-(Number(b?.imdbSeasonNumber)||Number(String(b?.id||'').match(/(?:-s|-)(\d+)$/)?.[1])||999));
 const canonicalTV=a=>(a?.seasons||[]).filter(s=>['TV','TV_SHORT','ONA'].includes(fmt(s?.format))&&Number(s?.total)>0).slice().sort((a,b)=>String(a?.releaseStart||a?.year||'9999').localeCompare(String(b?.releaseStart||b?.year||'9999'))||(Number(a?.sourceId)||0)-(Number(b?.sourceId)||0));
 const firstYear=a=>{const years=(a?.seasons||[]).map(s=>Number(String(s?.releaseStart||'').slice(0,4))||Number(s?.year)||0).filter(Boolean);return years.length?Math.min(...years):(Number(a?.year)||0)};
 const cumulative=parts=>{let n=0;return parts.map(p=>(n+=Number(p?.total)||0));};
 function compatible(tv,anime){
  const t=tvParts(tv),c=canonicalTV(anime);if(!t.length||!c.length)return false;
  const tBounds=cumulative(t),cBounds=new Set(cumulative(c)),tTotal=tBounds.at(-1)||0,cTotal=[...cBounds].at(-1)||0;
  if(!tTotal||!cTotal||tTotal>cTotal)return false;
  // Some providers split one anime cour into multiple seasons (Zenki is 25+26 on TVMaze
  // but one 51-episode season on AniList). Equal cumulative totals are safe even when
  // internal provider season boundaries differ; absolute episode mapping handles the split.
  if(tTotal!==cTotal&&!tBounds.every(x=>cBounds.has(x)))return false;
  const ty=firstYear(tv),cy=firstYear(anime);if(ty&&cy&&Math.abs(ty-cy)>2)return false;
  const tk=keys(tv),ck=keys(anime);return [...tk].some(k=>ck.has(k));
 }
 function searchEquivalent(anime,tv){
  if(!anime||!tv)return false;
  const af=fmt(anime?.format),tf=fmt(tv?.format);
  if(!['TV','TV_SHORT','ONA'].includes(af)||tf!=='TV')return false;
  const ay=Number(anime?.year)||0,ty=Number(tv?.year)||0;
  if(ay&&ty&&Math.abs(ay-ty)>1)return false;
  const ak=keys(anime),tk=keys(tv);
  return [...ak].some(k=>tk.has(k));
 }
 function dedupeSearchResults(items){
  const rows=Array.isArray(items)?items:[];
  const anime=rows.filter(x=>x?.kind!=='tv'&&x?.kind!=='movie'&&['TV','TV_SHORT','ONA'].includes(fmt(x?.format)));
  return rows.filter(x=>x?.kind!=='tv'||!anime.some(a=>searchEquivalent(a,x)));
 }
 function findCanonical(tv,library){const matches=(library||[]).filter(a=>a!==tv&&isCanonical(a)&&compatible(tv,a));return matches.length===1?matches[0]:null}
 function segments(parts){let at=0;return parts.map(part=>{const start=at+1,end=at+(Number(part.total)||0);at=end;return{part,start,end}})}
 function mapAbsolute(segs,n){return segs.find(x=>n>=x.start&&n<=x.end)||null}
 function mergeEpisode(target,source){
  for(const k of ['title','aired','airedAt','summary','image','url','tvmazeEpisodeId','filler','recap','fillerChecked','fillerSource','fillerCheckedAt','detailsCheckedAt'])if((target[k]==null||target[k]===''||target[k]===false)&&source?.[k]!=null&&source[k]!==''&&source[k]!==false)target[k]=source[k];
  for(const k of ['myNote','personalRating','fillerManual'])if(source?.[k]!=null&&source[k]!=='')target[k]=source[k];
 }
 function bridge(canonical,tv,history=[]){
  const targetParts=canonicalTV(canonical),targetSegs=segments(targetParts),sourceParts=tvParts(tv),sourceSegs=segments(sourceParts);if(!targetParts.length||!sourceParts.length)return{changed:false,history};
  const seasonOffsets=new Map(sourceSegs.map(x=>[String(x.part.id),x.start-1]));
  for(const src of sourceParts){const base=seasonOffsets.get(String(src.id))||0;
   for(const n of src.watched||[]){const hit=mapAbsolute(targetSegs,base+Number(n));if(hit){const local=base+Number(n)-hit.start+1;if(!hit.part.watched.includes(local))hit.part.watched.push(local)}}
   for(const ep of src.episodes||[]){const hit=mapAbsolute(targetSegs,base+Number(ep.number));if(!hit)continue;const local=base+Number(ep.number)-hit.start+1;let target=(hit.part.episodes||[]).find(x=>Number(x.number)===local);if(!target){target={number:local};hit.part.episodes=hit.part.episodes||[];hit.part.episodes.push(target)}mergeEpisode(target,ep)}
  }
  for(const p of targetParts){p.watched=[...new Set((p.watched||[]).map(Number))].sort((a,b)=>a-b);if(p.episodes)p.episodes.sort((a,b)=>Number(a.number)-Number(b.number))}
  canonical.favorite=!!(canonical.favorite||tv.favorite);if(canonical.rating==null&&tv.rating!=null)canonical.rating=tv.rating;if(!canonical.notes&&tv.notes)canonical.notes=tv.notes;if(!canonical.cover&&tv.cover)canonical.cover=tv.cover;if(!canonical.genre&&tv.genre)canonical.genre=tv.genre;
  if(canonical.status==='planning'&&tv.status&&tv.status!=='planning')canonical.status=tv.status;
  const tkeys=keys(tv),ckeys=keys(canonical);if([...tkeys].some(k=>ckeys.has(k))&&String(tv.title||'').trim())canonical.title=String(tv.title).trim();
  const primary=targetParts[0];if(primary){canonical.source=primary.source||canonical.source;canonical.sourceId=String(primary.sourceId||canonical.sourceId||'');canonical.malId=String(primary.malId||canonical.malId||'');canonical.format=fmt(primary.format);const y=Number(String(primary.releaseStart||'').slice(0,4))||Number(primary.year)||0;if(y)canonical.year=y}
  const out=[];
  for(const ev of history||[]){if(ev?.id!==tv.id){out.push(ev);continue}const src=sourceParts.find(s=>String(s.id)===String(ev.seasonId));const base=src?seasonOffsets.get(String(src.id))||0:null;if(base==null){out.push({...ev,id:canonical.id});continue}
   const nums=ev.action==='season-watched'?(Array.isArray(ev.episodes)&&ev.episodes.length?ev.episodes:(src.watched||[])):Number(ev.episode)>0?[Number(ev.episode)]:[];const groups=new Map();for(const n of nums){const hit=mapAbsolute(targetSegs,base+Number(n));if(!hit)continue;const local=base+Number(n)-hit.start+1;const arr=groups.get(hit.part.id)||[];arr.push(local);groups.set(hit.part.id,arr)}
   if(!groups.size){out.push({...ev,id:canonical.id});continue}for(const [seasonId,nums2] of groups){const clone={...ev,id:canonical.id,seasonId};if(ev.action==='season-watched'){clone.episode=0;clone.episodes=[...new Set(nums2)].sort((a,b)=>a-b)}else clone.episode=nums2[0];out.push(clone)}
  }
  return{changed:true,history:out};
 }
 function repair(library,history=[]){const list=[...(library||[])],removed=[],bridged=[];let hist=[...(history||[])];for(const tv of [...list].filter(isTVMaze)){const canonical=findCanonical(tv,list);if(!canonical)continue;const result=bridge(canonical,tv,hist);if(!result.changed)continue;hist=result.history;removed.push(tv.id);bridged.push({from:tv.id,to:canonical.id,title:canonical.title});const idx=list.indexOf(tv);if(idx>=0)list.splice(idx,1)}return{library:list,history:hist,removed,bridged,changed:removed.length>0}}
 return{fmt,isTVMaze,isCanonical,keys,tvParts,canonicalTV,compatible,searchEquivalent,dedupeSearchResults,findCanonical,bridge,repair};
})();
