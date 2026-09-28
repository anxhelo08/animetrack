/* AnimeTrack 12.8 — provider-backed genre and tag filters for seasonal anime. Read-only. */
window.ATSeasonal128=(()=>{
 const presets=[
  ['all','✦','Të gjitha'],['Action','⚔','Action'],['Adventure','◇','Adventure'],
  ['Drama','◈','Drama'],['Thriller','◉','Thriller'],['Isekai','↗','Isekai'],
  ['Fantasy','✧','Fantasy'],['Romance','♡','Romance'],['Comedy','☻','Comedy'],
  ['Mystery','⌕','Mystery'],['Psychological','◐','Psychological'],
  ['Sci-Fi','⌁','Sci-Fi'],['Slice of Life','☼','Slice of Life'],
  ['Supernatural','✦','Supernatural'],['Horror','☾','Horror'],
  ['Sports','◯','Sports'],['Music','♫','Music'],['Mecha','▣','Mecha']
 ];
 const normalized=s=>String(s||'').trim().toLocaleLowerCase('en-US').replace(/&/g,'and').replace(/[\s_-]+/g,' ');
 const canonical=s=>{
  const n=normalized(s);
  if(n==='science fiction'||n==='sci fi'||n==='scifi')return 'sci fi';
  if(n==='slice of life')return 'slice of life';
  if(n==='psychological thriller')return 'psychological';
  return n;
 };
 const tokens=item=>{
  const genres=String(item?.genre||'').split(',').map(x=>x.trim());
  const tags=Array.isArray(item?.seasonTags)?item.seasonTags:[];
  return new Set([...genres,...tags].filter(x=>typeof x==='string'&&x.trim()).map(canonical));
 };
 function includes(item,genre){return genre==='all'||tokens(item).has(canonical(genre))}
 function counts(items){
  const list=Array.isArray(items)?items:[],result={all:list.length};
  for(const [key] of presets)if(key!=='all')result[key]=list.filter(x=>includes(x,key)).length;
  return result;
 }
 function list(items,{genre='all',query='',format='ALL',unadded=false,inLibrary=()=>false}={}){
  const term=normalized(query),seen=new Set();
  return (Array.isArray(items)?items:[]).filter(item=>{
   const key=String(item?.key||'');if(!key||seen.has(key))return false;
   seen.add(key);
   if(format!=='ALL'&&item.format!==format)return false;
   if(unadded&&inLibrary(item))return false;
   if(!includes(item,genre))return false;
   return !term||normalized(item.title).includes(term)||normalized(item.english).includes(term);
  });
 }
 function tags(item,limit=3){
  const raw=String(item?.genre||'').split(',').map(x=>x.trim()).filter(Boolean);
  const unique=new Set(),out=[];
  for(const genre of [...raw,...(Array.isArray(item?.seasonTags)?item.seasonTags:[])]){
   if(typeof genre!=='string'||!genre.trim()||unique.has(canonical(genre)))continue;
   unique.add(canonical(genre));out.push(genre.trim().slice(0,42));if(out.length>=limit)break;
  }
  return out;
 }
 function safeTags(media){
  return (Array.isArray(media?.tags)?media.tags:[])
   .filter(t=>t&&!t.isMediaSpoiler&&!t.isGeneralSpoiler&&Number(t.rank)>=50&&typeof t.name==='string')
   .map(t=>t.name.trim().slice(0,42)).filter(Boolean).slice(0,18);
 }
 const searchSummary=(total,filtered,genre,query)=>filtered===total&&!query&&genre==='all'?total+' anime në katalog':
  filtered+' nga '+total+' anime të ngarkuara'+(genre==='all'?'':' · '+genre)+(query?' · kërkim':'');
 return {presets,canonical,tokens,includes,counts,list,tags,safeTags,searchSummary};
})();
