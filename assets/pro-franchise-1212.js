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
 g.ATFranchise1212={canonical,format,supportedAnimePart,mainRelation,familyTitleKeys,releaseKey,sortParts,labels,tvFamilyKey,tvFamilyName};
})(window);
