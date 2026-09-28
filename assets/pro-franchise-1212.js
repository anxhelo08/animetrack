/* AnimeTrack 12.12.2: shared franchise/timeline helpers for anime + TV series. */
(function(g){'use strict';
 const canonical=s=>String(s||'').toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const format=value=>{const raw=String(value||'TV').trim().toUpperCase().replace(/[\s-]+/g,'_');if(raw==='FILM'||raw==='MOVIE')return'MOVIE';if(raw==='TV_SPECIAL')return'SPECIAL';return raw||'TV'};
 const ANIME_PARTS=new Set(['TV','TV_SHORT','ONA','OVA','MOVIE','SPECIAL']);
 const supportedAnimePart=value=>ANIME_PARTS.has(format(value));
 const FRANCHISE_RELATIONS=new Set(['PREQUEL','SEQUEL','ALTERNATIVE','SUMMARY','COMPILATION','CONTAINS','PARENT']);
 const mainRelation=value=>FRANCHISE_RELATIONS.has(String(value||'').toUpperCase());
 const familyTitleKeys=values=>{const out=new Set(),add=value=>{const raw=String(value||'').replace(/\s+/g,' ').trim();if(!raw)return;const candidates=[raw];const colon=raw.split(/\s*[:：]\s*/,2)[0];if(colon&&colon!==raw)candidates.push(colon);const dash=raw.split(/\s+[—–-]\s+/,2)[0];if(dash&&dash!==raw)candidates.push(dash);for(let item of candidates){let key=canonical(item).replace(/\b(?:the )?(?:movie|film)\b$/,'').replace(/\b(?:season|part|cour)\s*\d+$/,'').trim();if(key.length>=4)out.add(key)}};for(const value of Array.isArray(values)?values:[values])add(value);return [...out]};
 const releaseKey=part=>{const exact=String(part?.releaseStart||'');if(/^\d{4}-\d{2}-\d{2}$/.test(exact))return exact;const year=Number(part?.year)||9999;return String(year).padStart(4,'0')+'-12-31'};
 const sortParts=parts=>(Array.isArray(parts)?parts:[]).slice().sort((a,b)=>releaseKey(a).localeCompare(releaseKey(b))||(Number(a?.sourceId)||0)-(Number(b?.sourceId)||0)||String(a?.subtitle||'').localeCompare(String(b?.subtitle||'')));
 const partMeta=part=>{const f=format(part?.format),date=String(part?.releaseStart||'').slice(0,10),year=Number(part?.year)||Number(date.slice(0,4))||null;let label='Pjesë',icon='◆';if(['TV','TV_SHORT','ONA'].includes(f)){label='Sezon';icon='▣'}else if(f==='MOVIE'){label='Film';icon='🎬'}else if(f==='OVA'){label='OVA';icon='◈'}else if(f==='SPECIAL'){label='Special';icon='✦'}return {format:f,label,icon,date:/^\d{4}-\d{2}-\d{2}$/.test(date)?date:'',year}};
 const ratingSummary=parts=>{const rows=(Array.isArray(parts)?parts:[]).map(p=>({part:p,rating:Number(p?.myRating)})).filter(x=>Number.isFinite(x.rating)&&x.rating>0);if(!rows.length)return {count:0,average:null,best:null};const average=rows.reduce((n,x)=>n+x.rating,0)/rows.length,best=rows.slice().sort((a,b)=>b.rating-a.rating)[0];return {count:rows.length,average:Math.round(average*10)/10,best:{id:String(best.part?.id||''),title:String(best.part?.title||best.part?.subtitle||'Pjesa'),rating:best.rating}}};
 const normalizeArc=(arc,index=0)=>{const start=Math.max(1,Number(arc?.start)||1),end=Math.max(start,Number(arc?.end)||start),rating=arc?.rating==null||arc.rating===''?null:Math.max(.5,Math.min(10,Number(arc.rating)||.5));return {id:String(arc?.id||'arc-'+(index+1)).slice(0,80),name:String(arc?.name||'Arc '+(index+1)).replace(/\s+/g,' ').trim().slice(0,120),start,end,rating,note:String(arc?.note||'').slice(0,500)}};
 function labels(parts){
  const ordered=sortParts(parts),counts={movie:0,ova:0,special:0},totals={movie:0,ova:0,special:0};
  for(const p of ordered){const f=format(p?.format);if(f==='MOVIE')totals.movie++;else if(f==='OVA')totals.ova++;else if(f==='SPECIAL')totals.special++}
  let season=0;
  return ordered.map(p=>{const f=format(p?.format);let title;if(['TV','TV_SHORT','ONA'].includes(f))title='Sezoni '+(++season);else if(f==='MOVIE')title='Film'+(totals.movie>1?' '+(++counts.movie):'');else if(f==='OVA')title='OVA'+(totals.ova>1?' '+(++counts.ova):'');else if(f==='SPECIAL')title='Special'+(totals.special>1?' '+(++counts.special):'');else title='Pjesa '+(season+1);return {part:p,title}});
 }
 function tvFamilyKey(title){
  const raw=String(title||'').trim();if(!raw)return'';
  const colon=raw.split(/\s*:\s*/,1)[0];
  const dash=colon.split(/\s+[—–-]\s+/,1)[0];
  return canonical(dash||raw);
 }
 function tvFamilyName(key,items){const list=Array.isArray(items)?items:[];const exact=list.find(x=>canonical(x?.title)===key);if(exact?.title)return exact.title;const first=String(list[0]?.title||key||'Serial').trim();return first.split(/\s*:\s*/)[0].split(/\s+[—–-]\s+/)[0].trim()||first}
 g.ATFranchise1212={canonical,format,supportedAnimePart,mainRelation,familyTitleKeys,releaseKey,sortParts,labels,partMeta,ratingSummary,normalizeArc,tvFamilyKey,tvFamilyName};
})(window);
