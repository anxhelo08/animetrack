/* AnimeTrack 12.5 — read-only premiere-year sorting for unified anime + TV libraries.
   The earliest known release year belongs to the title, not its latest sequel season. */
window.ATLibraryYear125=(()=>{
 const year=value=>{
  if(value===null||value===undefined||value==='')return null;
  const number=Number(value);
  return Number.isInteger(number)&&number>=1888&&number<=2200?number:null;
 };
 const dateYear=value=>{
  const match=/^(\d{4})-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])(?:$|T)/.exec(String(value||''));
  return match?year(match[1]):null;
 };
 function releaseYear(entry){
  if(!entry||typeof entry!=='object')return null;
  const confirmed=[];
  const add=n=>{if(n!==null)confirmed.push(n)};
  add(year(entry.year));
  for(const season of entry.seasons||[]){
   add(year(season?.year));add(dateYear(season?.releaseStart));
  }
  // Metadata sometimes lacks a premiere year (e.g. older imported library items).
  // In that case, use the first dated episode; never use createdAt/updatedAt.
  if(!confirmed.length)for(const season of entry.seasons||[]){
   for(const episode of season?.episodes||[]){
    const aired=dateYear(episode?.airedAt)||dateYear(episode?.aired);
    if(aired!==null)add(aired);
   }
  }
  return confirmed.length?Math.min(...confirmed):null;
 }
 function sort(items,mode){
  const source=Array.isArray(items)?items:[];
  if(mode!=='year-new'&&mode!=='year-old')return source.slice();
  const direction=mode==='year-new'?-1:1;
  return source.map((item,index)=>({item,index,year:releaseYear(item)})).sort((a,b)=>{
   if(a.year===null)return b.year===null?a.index-b.index:1;
   if(b.year===null)return -1;
   if(a.year!==b.year)return direction*(a.year-b.year);
   // Stable within the same release year, matching the user's previous list order.
   return a.index-b.index;
  }).map(row=>row.item);
 }
 return {releaseYear,sort};
})();
