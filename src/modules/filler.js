/* AnimeTrack 12.10 — verified Jikan filler / recap metadata and manual fallback.
   The helper never changes watched episode numbers or guesses from titles. */
window.ATFiller1210=(()=>{
 const validId=value=>/^\d{1,10}$/.test(String(value||''));
 function kind(ep){
  if(ep?.fillerManual===true)return 'filler';
  if(ep?.fillerManual===false)return 'normal';
  if(ep?.filler===true)return 'filler';
  if(ep?.recap===true)return 'recap';
  return ep?.fillerChecked===true?'normal':'unknown';
 }
 function sharedCatalog(anime,season){
  return validId(season?.malId)&&Number(season.globalStart)>0&&
   (anime?.seasons||[]).filter(s=>String(s.malId||'')===String(season.malId)).length>1;
 }
 function absolute(season,n,shared){return shared?Number(season.globalStart)+n-1:n}
 function local(season,number,shared){return shared?number-Number(season.globalStart)+1:number}
 function pages(season,uiPage,shared){
  const first=uiPage*24+1,last=Math.min(season.total||first+23,first+23);
  const start=absolute(season,first,shared),end=absolute(season,last,shared);
  return [...new Set([Math.ceil(start/100),Math.ceil(end/100)])].filter(p=>p>0&&p<=500);
 }
 function pageVerified(rows){
  return Array.isArray(rows)&&rows.length>0&&rows.every(ep=>
   ep&&Number.isInteger(Number(ep.mal_id))&&Number(ep.mal_id)>0&&
   typeof ep.filler==='boolean'&&typeof ep.recap==='boolean');
 }
 function storedPageVerified(season,page,shared){
  const entries=(season?.episodes||[]).filter(ep=>{
   const n=Number(ep?.number);return Number.isInteger(n)&&n>0&&
    Math.ceil(absolute(season,n,shared)/100)===page;
  });
  const total=Number(season?.total)||0,start=shared?Number(season.globalStart):1;
  const first=(page-1)*100+1,last=page*100;
  const expected=total>0?Math.max(0,Math.min(last,start+total-1)-Math.max(first,start)+1):0;
  return entries.length>0&&(!expected||entries.length>=expected)&&entries.every(ep=>ep.fillerChecked===true);
 }
 function merge(season,rows,shared,checkedAt){
  if(!Array.isArray(rows))throw Error('Invalid Jikan episode list');
  const original=Array.isArray(season.episodes)?season.episodes:[],byNumber=new Map(original.map(e=>[Number(e.number),e]));
  let changed=false;
  for(const raw of rows){
   const number=Number(raw?.mal_id),n=local(season,number,shared);
   if(!Number.isInteger(number)||!Number.isInteger(n)||n<1||n>10000||(season.total&&n>season.total))continue;
   const old=byNumber.get(n)||{number:n};
   const filler=typeof raw.filler==='boolean'?raw.filler:old.filler===true;
   const recap=typeof raw.recap==='boolean'?raw.recap:old.recap===true;
   const known=typeof raw.filler==='boolean'&&typeof raw.recap==='boolean';
   const updated={...old,number:n,absolute:number,
    title:String(old.title||raw.title||raw.title_romanji||'').slice(0,220),
    aired:String(old.aired||raw.aired||'').slice(0,40),
    filler,recap,fillerChecked:known||old.fillerChecked===true,
    fillerSource:known?'Jikan':String(old.fillerSource||''),
    fillerCheckedAt:known?checkedAt||'':String(old.fillerCheckedAt||'')};
   if(JSON.stringify(updated)!==JSON.stringify(old)){byNumber.set(n,updated);changed=true}
  }
  if(changed)season.episodes=[...byNumber.values()].sort((a,b)=>a.number-b.number);
  return changed;
 }
 return {kind,sharedCatalog,absolute,local,pages,merge,validId,pageVerified,storedPageVerified};
})();
