/* AnimeTrack 11.6: explicit, local-only MAL XML / AniList CSV import preview.
   Never replaces an existing library entry or uploads raw files to an external service. */
window.ATImport116=(function(){
 const clean=x=>String(x??'').trim().replace(/\s+/g,' ').slice(0,180);
 const number=(x,max=10000)=>Math.max(0,Math.min(max,Math.floor(Number(x)||0)));
 const status=value=>{
  const s=String(value||'').trim().toLowerCase().replace(/[\s_-]+/g,'');
  if(['watching','current','1'].includes(s))return 'watching';
  if(['completed','complete','2','finished'].includes(s))return 'completed';
  if(['onhold','paused','3'].includes(s))return 'paused';
  if(['dropped','4'].includes(s))return 'dropped';
  return 'planning';
 };
 function csvCells(text){
  const rows=[],cells=[];let value='',quote=false;
  for(let i=0;i<text.length;i++){
   const c=text[i];if(c==='"'){if(quote&&text[i+1]==='"'){value+='"';i++}else quote=!quote}
   else if(c===','&&!quote){cells.push(value);value=''}
   else if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&text[i+1]==='\n')i++;cells.push(value);if(cells.some(v=>v.trim()))rows.push(cells.splice(0));else cells.length=0;value=''}
   else value+=c;
  }
  if(quote)throw Error('CSV ka thonjëza të pambyllura.');
  cells.push(value);if(cells.some(v=>v.trim()))rows.push(cells);
  return rows;
 }
 function parseCsv(text){
  const rows=csvCells(String(text||'').replace(/^\uFEFF/,''));if(rows.length<2)throw Error('CSV nuk përmban rreshta për import.');
  const headers=rows[0].map(x=>x.toLowerCase().trim().replace(/[\s_-]+/g,''));
  const field=(cells,keys)=>{const index=headers.findIndex(h=>keys.includes(h));return index<0?'':cells[index]||''};
  const titleIndex=headers.findIndex(x=>['title','animetitle','mediatitle','name','romaji','english'].includes(x));if(titleIndex<0)throw Error('CSV duhet të ketë kolonën Title.');
  const result=[];for(const cells of rows.slice(1,3001)){
   const title=clean(cells[titleIndex]);if(!title)continue;
   const anilistId=clean(field(cells,['anilistid','mediaid','id'])),malId=clean(field(cells,['malid','myanimelistid','idmal'])),total=number(field(cells,['episodes','totalepisodes','episodestotal','total'])),progress=number(field(cells,['progress','watched','watchedepisodes','episodeswatched']));
   const source=anilistId?'AniList':malId?'MyAnimeList':'',sourceId=source==='AniList'?anilistId:malId;
   const rawScore=Number(field(cells,['score','rating','userscore']));
   result.push({title,status:status(field(cells,['status','watchstatus','mywatchstatus'])),progress,total:Math.max(total,progress),rating:Number.isFinite(rawScore)&&rawScore>0?Math.min(10,rawScore>10?rawScore/10:rawScore):null,source,sourceId,malId,format:clean(field(cells,['format','type']))||'TV'});
  }
  return result;
 }
 function parseXml(text){
  if(typeof DOMParser==='undefined')throw Error('Shfletuesi nuk mbështet leximin XML.');
  if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('XML me entitete të jashtme nuk lejohet.');
  const dom=new DOMParser().parseFromString(text,'application/xml');
  if(dom.querySelector('parsererror'))throw Error('XML nuk është i vlefshëm.');
  const nodes=[...dom.querySelectorAll('myanimelist > anime')].slice(0,3000);
  if(!nodes.length)throw Error('Nuk u gjetën anime në eksportin MyAnimeList XML.');
  const value=(node,key)=>node.querySelector(key)?.textContent||'';
  return nodes.map(x=>{
   const title=clean(value(x,'series_title'));if(!title)return null;
   const malId=clean(value(x,'series_animedb_id')),progress=number(value(x,'my_watched_episodes')),total=number(value(x,'series_episodes'));
   const score=Number(value(x,'my_score'));
   return {title,status:status(value(x,'my_status')),progress,total:Math.max(total,progress),rating:Number.isFinite(score)&&score>0?Math.min(10,score):null,source:malId?'MyAnimeList':'',sourceId:malId,malId,format:clean(value(x,'series_type'))||'TV'};
  }).filter(Boolean);
 }
 function parse(text,filename=''){
  if(String(text||'').length>5_000_000)throw Error('Skedari është tepër i madh (mbi 5 MB).');
  const rows=/\.xml$/i.test(filename)||/^\s*<\?xml|^\s*<myanimelist/i.test(text)?parseXml(text):parseCsv(text);
  if(!rows.length)throw Error('Nuk ka anime të vlefshme në skedar.');
  return rows;
 }
 function mount(ctx){
  const root=ctx.el('library-view');if(!root||ctx.el('at116-import'))return;
  const el=document.createElement('section');el.id='at116-import';el.className='at116-import';
  el.innerHTML=`<div class="at116-import-heading"><div><span class="pro-eyebrow">IMPORT · PRIVAT</span><h3>Importo nga AniList / MyAnimeList</h3><p>Lexohet lokalisht CSV ose MAL XML. Shikon paraprakisht çfarë do të shtohet; nuk zëvendësohet biblioteka ekzistuese.</p></div><button type="button" class="pro-btn" id="at116-import-backup">↓ Backup para importit</button></div><label class="at116-file-pick">Zgjidh skedarin CSV / XML <input id="at116-import-file" type="file" accept=".csv,.xml,text/csv,application/xml,text/xml"></label><div id="at116-import-result" role="status" aria-live="polite"></div><button type="button" class="pro-btn primary" id="at116-import-confirm" hidden>＋ Shto vetëm anime të reja</button>`;
  const before=root.querySelector('.stats');(before||root.firstChild)?.before(el);
  let pending=[];
  el.querySelector('#at116-import-backup').addEventListener('click',()=>ctx.exportLibrary());
  el.querySelector('#at116-import-file').addEventListener('change',async e=>{
   pending=[];const file=e.target.files?.[0],out=el.querySelector('#at116-import-result'),submit=el.querySelector('#at116-import-confirm');submit.hidden=true;
   if(!file)return;
   try{
    if(file.size>5_000_000)throw Error('Skedari është tepër i madh.');
    pending=parse(await file.text(),file.name);
    const existing=new Set((ctx.state().anime||[]).map(a=>(a.malId?'mal:'+a.malId:a.sourceId?a.source+':'+a.sourceId:'title:'+a.title.toLowerCase())));
    const seen=new Set();const fresh=pending.filter(row=>{const key=row.malId?'mal:'+row.malId:row.sourceId?row.source+':'+row.sourceId:'title:'+row.title.toLowerCase();if(existing.has(key)||seen.has(key))return false;seen.add(key);return true});
    pending=fresh;
    out.textContent=`${fresh.length} anime të reja për import; elementët që ekzistojnë në bibliotekë u anashkaluan. ${file.name}`;
    if(fresh.length){const summary=document.createElement('p');summary.className='at116-import-preview';summary.textContent='Parapamje: '+fresh.slice(0,6).map(r=>r.title+' ('+r.progress+' ep.)').join(' · ')+(fresh.length>6?' …':'');out.append(summary);submit.hidden=false;}
   }catch(err){out.textContent='Importi nuk u lexua: '+err.message}
   finally{e.target.value=''}
  });
  el.querySelector('#at116-import-confirm').addEventListener('click',()=>{
   if(!pending.length)return;
   if(!window.confirm(`Shto ${pending.length} anime të reja? Progresi i animeve ekzistuese nuk ndryshon. Këshillohet të shkarkosh backup fillimisht.`))return;
   const out=el.querySelector('#at116-import-result');const outcome=ctx.importExternal(pending);out.textContent=outcome?.error?'Importi dështoi: '+outcome.error:`U shtuan ${outcome?.added||0} anime. Biblioteka ekzistuese u ruajt.`;
   if(outcome&&!outcome.error){pending=[];el.querySelector('#at116-import-confirm').hidden=true;}
  });
 }
 return {parse,parseCsv,parseXml,mount};
})();
