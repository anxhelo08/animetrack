/* AnimeTrack 12.12.4: cross-provider anime franchise dedupe.
   AniList/MAL define the canonical anime timeline. TVMaze may enrich episode data,
   but must not create a second library card for the same anime franchise. */
window.ATProviderBridge12124=(()=>{
 const fmt=v=>{const r=String(v||'TV').trim().toUpperCase().replace(/[\s-]+/g,'_');if(r==='FILM'||r==='MOVIE')return'MOVIE';if(r==='TV_SPECIAL')return'SPECIAL';if(r==='TV_SERIES')return'TV';return r||'TV'};
 const canon=s=>String(s||'').toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const familyKeys=values=>window.ATFranchise1212?.familyTitleKeys?.(values)||[...new Set((Array.isArray(values)?values:[values]).map(canon).filter(x=>x.length>=4))];
 const isTVMaze=a=>a?.source==='TVMaze'||(!['AniList','MyAnimeList'].includes(a?.source)&&(String(a?.id||'').startsWith('tvmaze-')||(a?.seasons||[]).some(s=>String(s?.source||'').toLowerCase()==='tvmaze')));
 const isCanonical=a=>!isTVMaze(a)&&((['AniList','MyAnimeList'].includes(a?.source))||(a?.seasons||[]).some(s=>['AniList','MyAnimeList'].includes(s?.source)));
 const titleValues=a=>[a?.title,a?.english,...(a?.aliases||[]),...(a?.synonyms||[]),...(a?.seasons||[]).flatMap(s=>[s?.subtitle,...(s?.aliases||[])])].filter(Boolean);
 const exactKeys=a=>new Set(titleValues(a).map(canon).filter(x=>x.length>=2));
 const keys=a=>new Set(familyKeys(titleValues(a)).filter(x=>x.length>=4));
 const words=s=>canon(s).split(/\s+/).filter(Boolean);
 const tokenSimilarity=(a,b)=>{const x=new Set(words(a)),y=new Set(words(b));if(!x.size||!y.size)return 0;let same=0;for(const token of x)if(y.has(token))same++;return same/Math.max(x.size,y.size)};
 const bestTokenSimilarity=(a,b)=>{let best=0;for(const x of exactKeys(a))for(const y of exactKeys(b))best=Math.max(best,tokenSimilarity(x,y));return best};
 const genreKeys=a=>{const raw=[...(Array.isArray(a?.genres)?a.genres:[]),...String(a?.genre||'').split(',')];return new Set(raw.map(canon).filter(Boolean))};
 const genreOverlap=(a,b)=>{const x=genreKeys(a),y=genreKeys(b);let n=0;for(const key of x)if(y.has(key))n++;return n};
 const releaseDate=a=>{const direct=String(a?.releaseStart||a?.premiered||'').slice(0,10);if(/^\d{4}-\d{2}-\d{2}$/.test(direct))return direct;const dates=(a?.seasons||[]).map(s=>String(s?.releaseStart||s?.aired||'').slice(0,10)).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)).sort();return dates[0]||''};
 const dateDistance=(a,b)=>{const x=releaseDate(a),y=releaseDate(b);if(!x||!y)return null;return Math.abs(Date.parse(x)-Date.parse(y))/86400000};
 const totalEpisodes=a=>{const parts=isTVMaze(a)?tvParts(a):canonicalTV(a);if(parts.length)return parts.reduce((n,p)=>n+(Number(p?.total)||0),0);return Math.max(0,Number(a?.total)||0)};
 function identityEvidence(a,b){
  const ax=exactKeys(a),bx=exactKeys(b),ak=keys(a),bk=keys(b);
  let exact='',family='';
  for(const key of ax)if(bx.has(key)){exact=key;break}
  for(const key of ak)if(bk.has(key)){family=key;break}
  const similarity=bestTokenSimilarity(a,b),ay=firstYear(a),by=firstYear(b),yearDiff=ay&&by?Math.abs(ay-by):null,days=dateDistance(a,b),genres=genreOverlap(a,b),at=totalEpisodes(a),bt=totalEpisodes(b);
  return {exact,family,similarity,yearDiff,days,genres,totalEqual:!!(at&&bt&&at===bt),aTotal:at,bTotal:bt};
 }
 const tvParts=a=>(a?.seasons||[]).filter(s=>fmt(s?.format)==='TV'&&Number(s?.total)>0).slice().sort((a,b)=>(Number(a?.imdbSeasonNumber)||Number(String(a?.id||'').match(/(?:-s|-)(\d+)$/)?.[1])||999)-(Number(b?.imdbSeasonNumber)||Number(String(b?.id||'').match(/(?:-s|-)(\d+)$/)?.[1])||999));
 const canonicalTV=a=>(a?.seasons||[]).filter(s=>['TV','TV_SHORT','ONA'].includes(fmt(s?.format))&&Number(s?.total)>0).slice().sort((a,b)=>String(a?.releaseStart||a?.year||'9999').localeCompare(String(b?.releaseStart||b?.year||'9999'))||(Number(a?.sourceId)||0)-(Number(b?.sourceId)||0));
 const firstYear=a=>{const years=(a?.seasons||[]).map(s=>Number(String(s?.releaseStart||'').slice(0,4))||Number(s?.year)||0).filter(Boolean);return years.length?Math.min(...years):(Number(a?.year)||0)};
 const cumulative=parts=>{let n=0;return parts.map(p=>(n+=Number(p?.total)||0));};
 function compatible(tv,anime){
  const t=tvParts(tv),c=canonicalTV(anime);if(!t.length||!c.length)return false;
  const e=identityEvidence(tv,anime);
  if(e.yearDiff!=null&&e.yearDiff>2)return false;
  if(!e.exact&&!e.family&&e.similarity<.9)return false;
  const tBounds=cumulative(t),cBounds=new Set(cumulative(c)),tTotal=tBounds.at(-1)||0,cTotal=[...cBounds].at(-1)||0;
  if(!tTotal||!cTotal||tTotal>cTotal)return false;
  // Provider season boundaries are metadata, not identity. When cumulative episode
  // totals agree, a 1-season source and a multi-season source can still be one anime.
  if(tTotal!==cTotal&&!tBounds.every(x=>cBounds.has(x)))return false;
  // Short/generic titles need extra corroboration to avoid merging unrelated shows.
  const key=e.exact||e.family||'',short=words(key).length<=1||key.length<7;
  if(short&&!e.totalEqual&&!e.genres&&!(e.days!=null&&e.days<=45))return false;
  return true;
 }
 function searchEquivalent(anime,tv){
  if(!anime||!tv)return false;
  const af=fmt(anime?.format),tf=fmt(tv?.format);
  if(!['TV','TV_SHORT','ONA'].includes(af)||tf!=='TV')return false;
  const e=identityEvidence(anime,tv);
  if(e.yearDiff!=null&&e.yearDiff>1)return false;
  const titleStrong=!!(e.exact||e.family)||e.similarity>=.9;
  if(!titleStrong)return false;
  const key=e.exact||e.family||'',short=words(key).length<=1||key.length<7;
  const sameYear=e.yearDiff===0,closeDate=e.days!=null&&e.days<=45,corroborated=closeDate||e.genres>0||e.totalEqual;
  if(short)return closeDate||(sameYear&&(e.genres>0||e.totalEqual));
  if(e.exact)return e.yearDiff==null||sameYear||closeDate||e.genres>0;
  // A franchise-root match alone is intentionally weaker than an exact alias.
  // It must be backed by date/genre/episode evidence so sequels and spin-offs
  // with a shared root do not disappear from search.
  if(e.family)return (sameYear||e.yearDiff==null)&&corroborated;
  return sameYear&&corroborated;
 }
 function dedupeSearchResults(items){
  const rows=Array.isArray(items)?items:[];
  const anime=rows.filter(x=>x?.kind!=='tv'&&x?.kind!=='movie'&&['TV','TV_SHORT','ONA'].includes(fmt(x?.format)));
  return rows.filter(x=>x?.kind!=='tv'||!anime.some(a=>searchEquivalent(a,x)));
 }
 function findCanonical(tv,library){const matches=(library||[]).filter(a=>a!==tv&&isCanonical(a)&&compatible(tv,a));const bound=matches.filter(a=>(a.providerIds||[]).includes('tvmaze:'+String(tv.sourceId))||(a.mergedIds||[]).includes(tv.id));return bound.length===1?bound[0]:matches.length===1?matches[0]:null}
 function segments(parts){let at=0;return parts.map(part=>{const start=at+1,end=at+(Number(part.total)||0);at=end;return{part,start,end}})}
 function mapAbsolute(segs,n){return segs.find(x=>n>=x.start&&n<=x.end)||null}
 function mergeEpisode(target,source){
  for(const k of ['title','aired','airedAt','summary','image','url','tvmazeEpisodeId','filler','recap','fillerChecked','fillerSource','fillerCheckedAt','detailsCheckedAt'])if((target[k]==null||target[k]===''||target[k]===false)&&source?.[k]!=null&&source[k]!==''&&source[k]!==false)target[k]=source[k];
  for(const k of ['personalRating','fillerManual'])if(target[k]==null&&source?.[k]!=null&&source[k]!=='')target[k]=source[k];
  if(source?.myNote&&target.myNote!==source.myNote)target.myNote=(target.myNote?target.myNote+'\n\n'+source.myNote:source.myNote).slice(0,1500);
 }
 function bridge(canonical,tv,history=[]){
  const targetParts=canonicalTV(canonical),targetSegs=segments(targetParts),sourceParts=tvParts(tv),sourceSegs=segments(sourceParts);if(!targetParts.length||!sourceParts.length)return{changed:false,history};
  const seasonOffsets=new Map(sourceSegs.map(x=>[String(x.part.id),x.start-1]));
  for(const src of sourceParts){const base=seasonOffsets.get(String(src.id))||0;
   for(const n of src.watched||[]){const hit=mapAbsolute(targetSegs,base+Number(n));if(hit){const local=base+Number(n)-hit.start+1;if(!hit.part.watched.includes(local))hit.part.watched.push(local)}}
   for(const ep of src.episodes||[]){const hit=mapAbsolute(targetSegs,base+Number(ep.number));if(!hit)continue;const local=base+Number(ep.number)-hit.start+1;let target=(hit.part.episodes||[]).find(x=>Number(x.number)===local);if(!target){target={number:local};hit.part.episodes=hit.part.episodes||[];hit.part.episodes.push(target)}mergeEpisode(target,ep)}
  }
  for(const src of sourceSegs)for(const target of targetSegs){if(target.start>=src.start&&target.end<=src.end){if(target.part.myRating==null&&src.part.myRating!=null)target.part.myRating=src.part.myRating;if(src.part.hidden===true)target.part.hidden=true}}
  for(const p of targetParts){p.watched=[...new Set((p.watched||[]).map(Number))].sort((a,b)=>a-b);if(p.episodes)p.episodes.sort((a,b)=>Number(a.number)-Number(b.number))}
  canonical.favorite=!!(canonical.favorite||tv.favorite);if(canonical.rating==null&&tv.rating!=null)canonical.rating=tv.rating;if(tv.notes&&tv.notes!==canonical.notes)canonical.notes=(canonical.notes?canonical.notes+'\n\n'+tv.notes:tv.notes).slice(0,2500);if(!canonical.cover&&tv.cover)canonical.cover=tv.cover;if(!canonical.genre&&tv.genre)canonical.genre=tv.genre;
  canonical.providerIds=[...new Set([...(canonical.providerIds||[]),...(tv.providerIds||[]),...(tv.sourceId?['tvmaze:'+String(tv.sourceId)]:[])])];
  canonical.mergedIds=[...new Set([...(canonical.mergedIds||[]),...(tv.mergedIds||[]),tv.id])];
  canonical.aliases=[...new Set([...(canonical.aliases||[]),...(tv.aliases||[]),tv.title,canonical.title].filter(Boolean))];
  if(canonical.status==='planning'&&tv.status&&tv.status!=='planning')canonical.status=tv.status;
  const tkeys=keys(tv),ckeys=keys(canonical);if([...tkeys].some(k=>ckeys.has(k))&&String(tv.title||'').trim())canonical.title=String(tv.title).trim();
  const primary=targetParts[0];if(primary){canonical.source=primary.source||canonical.source;canonical.sourceId=String(primary.sourceId||canonical.sourceId||'');canonical.malId=String(primary.malId||canonical.malId||'');canonical.format=fmt(primary.format);const y=Number(String(primary.releaseStart||'').slice(0,4))||Number(primary.year)||0;if(y)canonical.year=y}
  const out=[];
  for(const ev of history||[]){if(ev?.id!==tv.id){out.push(ev);continue}const src=sourceParts.find(s=>String(s.id)===String(ev.seasonId));const base=src?seasonOffsets.get(String(src.id))||0:null;if(base==null){out.push({...ev,id:canonical.id});continue}
   const bulk=ev.action==='season-watched'||ev.action==='season-unwatched';const nums=bulk?(Array.isArray(ev.episodes)&&ev.episodes.length?ev.episodes:ev.action==='season-unwatched'?Array.from({length:Number(src.total)||0},(_,i)=>i+1):(src.watched||[])):Number(ev.episode)>0?[Number(ev.episode)]:[];const groups=new Map();for(const n of nums){const hit=mapAbsolute(targetSegs,base+Number(n));if(!hit)continue;const local=base+Number(n)-hit.start+1;const arr=groups.get(hit.part.id)||[];arr.push(local);groups.set(hit.part.id,arr)}
   if(!groups.size){out.push({...ev,id:canonical.id});continue}for(const [seasonId,nums2] of groups){const clone={...ev,id:canonical.id,seasonId};if(bulk){clone.episode=0;clone.episodes=[...new Set(nums2)].sort((a,b)=>a-b);if(clone.eventId&&groups.size>1)clone.eventId=String(clone.eventId).slice(0,65)+':'+seasonId}else clone.episode=nums2[0];out.push(clone)}
  }
  canonical.rewatches=[...(canonical.rewatches||[])];
  for(const rewatch of tv.rewatches||[]){const copy={...rewatch,episodes:(rewatch.episodes||[]).map(ep=>{const offset=seasonOffsets.get(String(ep.seasonId));const hit=offset==null?null:mapAbsolute(targetSegs,offset+Number(ep.number));return hit?{...ep,seasonId:hit.part.id,number:offset+Number(ep.number)-hit.start+1}:ep})};if(!canonical.rewatches.some(r=>r.id===copy.id))canonical.rewatches.push(copy)}
  if(!canonical.activeRewatchId)canonical.activeRewatchId=tv.activeRewatchId||'';
  return{changed:true,history:out};
 }
 function repair(library,history=[]){const list=[...(library||[])],removed=[],bridged=[];let hist=[...(history||[])];for(const tv of [...list].filter(isTVMaze)){const canonical=findCanonical(tv,list);if(!canonical)continue;const result=bridge(canonical,tv,hist);if(!result.changed)continue;hist=result.history;removed.push(tv.id);bridged.push({from:tv.id,to:canonical.id,title:canonical.title});const idx=list.indexOf(tv);if(idx>=0)list.splice(idx,1)}return{library:list,history:hist,removed,bridged,changed:removed.length>0}}
 return{fmt,isTVMaze,isCanonical,keys,exactKeys,identityEvidence,tvParts,canonicalTV,compatible,searchEquivalent,dedupeSearchResults,findCanonical,bridge,repair};
})();
