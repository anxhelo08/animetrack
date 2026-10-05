/* AnimeTrack 13.2 — personal viewing Diary.
   Diary metadata lives on the existing watch history / rewatch records so cloud
   sync, statistics and backups keep one source of truth. */
window.ATDiary132=function ATDiary132(ctx){
 const esc=ctx.esc,state=()=>ctx.state(),DAY=86400000;
 let query='',media='all',kind='all',month='all',detailFilter='all',order='newest',editing=null,searchTimer=null;
 const toTime=v=>{const n=Date.parse(v||'');return Number.isFinite(n)?n:0};
 const cleanRating=v=>v==null||v===''?null:Math.max(.5,Math.min(10,Math.round(Number(v)*2)/2));
 const localDay=t=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
 const localMonth=t=>localDay(t).slice(0,7);
 const currentEpisode=(anime,season,n)=>!!(anime&&season&&(season.watched||[]).includes(Number(n)));
 function mediaType(anime,season){
  if(String(season?.format||'').toUpperCase()==='MOVIE'||ctx.isMovie?.(anime))return'movie';
  return anime?.source==='TVMaze'?'tv':'anime';
 }
 function seasonIndex(anime,season){const all=anime?.seasons||[],i=all.indexOf(season);return i>=0?i+1:1}
 function episodeLabel(anime,season,episodes){
  if(mediaType(anime,season)==='movie')return 'Film';
  const nums=[...episodes].map(Number).filter(Number.isInteger).sort((a,b)=>a-b),name=season?.title||'Sezoni '+seasonIndex(anime,season);
  if(nums.length>1){const contiguous=nums.every((n,i)=>i===0||n===nums[i-1]+1);return name+' · '+(contiguous?'E'+nums[0]+'–E'+nums.at(-1):nums.length+' episode')}
  return name+' · Episodi '+(nums[0]||'?');
 }
 function historyEntries(){
  const s=state(),byId=new Map((s.anime||[]).map(a=>[a.id,a])),active=new Map(),movies=[];
  (s.history||[]).forEach((h,index)=>{
   if(!h||!h.id)return;const action=String(h.action||''),anime=byId.get(h.id),season=anime?.seasons?.find(x=>x.id===h.seasonId)||anime?.seasons?.[0]||null,prefix=h.id+'|'+(h.seasonId||season?.id||'')+'|';
   if(action==='watched'){const n=Number(h.episode);if(Number.isInteger(n)&&n>0)active.set(prefix+n,{index,event:h,anime,season,n})}
   else if(action==='unwatched'){const n=Number(h.episode);if(Number.isInteger(n)&&n>0)active.delete(prefix+n)}
   else if(action==='season-watched'&&Array.isArray(h.episodes)){for(const raw of h.episodes){const n=Number(raw);if(Number.isInteger(n)&&n>0)active.set(prefix+n,{index,event:h,anime,season,n})}}
   else if(action==='season-unwatched'){
    if(Array.isArray(h.episodes))for(const raw of h.episodes)active.delete(prefix+Number(raw));
    else for(const key of [...active.keys()])if(key.startsWith(prefix))active.delete(key);
   }else if((action==='movie-watched'||action==='movie-rewatched')&&anime){
    movies.push({id:'h:'+index,ref:{type:'history',index,eventId:String(h.eventId||'')},animeId:anime.id,seasonId:season?.id||'',episodes:[1],anime,season,date:String(h.date||''),at:toTime(h.date),kind:action==='movie-rewatched'?'rewatch':'first',media:'movie',note:String(h.diaryNote||''),rating:cleanRating(h.diaryRating),units:1,label:action==='movie-rewatched'?'Film · Rewatch':'Film'});
   }
  });
  const grouped=new Map();
  for(const item of active.values()){
   if(!item.anime||!item.season||!currentEpisode(item.anime,item.season,item.n))continue;
   const key=String(item.index),g=grouped.get(key)||{index:item.index,event:item.event,anime:item.anime,season:item.season,episodes:[]};g.episodes.push(item.n);grouped.set(key,g);
  }
  const out=[...grouped.values()].map(g=>{const h=g.event,episodes=[...new Set(g.episodes)].sort((a,b)=>a-b);return{id:'h:'+g.index,ref:{type:'history',index:g.index,eventId:String(h.eventId||'')},animeId:g.anime.id,seasonId:g.season.id,episodes,anime:g.anime,season:g.season,date:String(h.date||''),at:toTime(h.date),kind:'first',media:mediaType(g.anime,g.season),note:String(h.diaryNote||''),rating:cleanRating(h.diaryRating),units:episodes.length,label:episodeLabel(g.anime,g.season,episodes)}});
  out.push(...movies);
  for(const anime of s.anime||[])for(const session of anime.rewatches||[])for(let i=0;i<(session.episodes||[]).length;i++){
   const ep=session.episodes[i],season=anime.seasons?.find(x=>x.id===ep.seasonId)||anime.seasons?.[0];if(!season||!Number.isInteger(Number(ep.number)))continue;
   const t=toTime(ep.date);out.push({id:'r:'+anime.id+':'+session.id+':'+i,ref:{type:'rewatch',animeId:anime.id,sessionId:session.id,index:i,eventId:String(ep.eventId||'')},animeId:anime.id,seasonId:season.id,episodes:[Number(ep.number)],anime,season,date:String(ep.date||''),at:t,kind:'rewatch',media:mediaType(anime,season),note:String(ep.diaryNote||''),rating:cleanRating(ep.diaryRating),units:1,label:episodeLabel(anime,season,[Number(ep.number)])+' · Rewatch'});
  }
  return out.filter(x=>x.at>0).sort((a,b)=>b.at-a.at||b.id.localeCompare(a.id));
 }
 function undatedProgress(rows=historyEntries()){
  const logged=new Set(rows.filter(e=>e.kind==='first').flatMap(e=>e.episodes.map(n=>e.animeId+'|'+e.seasonId+'|'+n))),out=[];
  for(const anime of state().anime||[])for(const season of anime.seasons||[]){
   if(season.hidden)continue;
   const episodes=[...new Set(season.watched||[])].filter(n=>Number.isInteger(n)&&n>0&&!logged.has(anime.id+'|'+season.id+'|'+n)).sort((a,b)=>a-b);
   if(episodes.length)out.push({anime,season,episodes,media:mediaType(anime,season)});
  }
  return out;
 }
 function undatedHTML(rows){
  if(month!=='all'||kind==='rewatch'||detailFilter!=='all')return'';
  const q=query.trim().toLocaleLowerCase(),visible=rows.filter(e=>(media==='all'||media===e.media)&&(!q||[e.anime.title,e.season.title,e.season.subtitle].some(v=>String(v||'').toLocaleLowerCase().includes(q))));
  if(!visible.length)return'';
  return '<section class="at132-undated"><h3>Episode të para pa datë të regjistruar</h3><p>Progresi yt është ruajtur. Këto shikime nuk kanë datë në historik dhe nuk përfshihen në statistikat ditore.</p>'+visible.map(e=>'<button type="button" class="at132-undated-row" data-pro-action="diary-open-undated" data-id="'+esc(JSON.stringify([e.anime.id,e.season.id,e.episodes.at(-1)]))+'"><strong>'+esc(e.anime.title)+'</strong><span>'+esc(episodeLabel(e.anime,e.season,e.episodes))+' · I PARË</span></button>').join('')+'</section>';
 }
 function filterEntries(rows=historyEntries(),opts={}){
  const q=String(opts.query??query).trim().toLocaleLowerCase(),m=opts.media??media,k=opts.kind??kind,mo=opts.month??month;
  const detail=opts.detailFilter??detailFilter;
  const filtered=rows.filter(e=>(detail==='all'||detail==='notes'&&!!e.note.trim()||detail==='rated'&&e.rating!=null||detail==='unrated'&&e.rating==null)&&(m==='all'||e.media===m)&&(k==='all'||e.kind===k)&&(mo==='all'||localMonth(e.at)===mo)&&(!q||[e.anime?.title,e.season?.title,e.season?.subtitle,e.label,e.note].some(v=>String(v||'').toLocaleLowerCase().includes(q))));
  return (opts.order??order)==='oldest'?filtered.slice().sort((a,b)=>a.at-b.at):filtered;
 }
 function summary(rows=historyEntries(),clock=Date.now()){
  const d=new Date(clock),monthKey=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),thisMonth=rows.filter(x=>localMonth(x.at)===monthKey),days=new Set(rows.map(x=>localDay(x.at))),rated=rows.filter(x=>x.rating!=null),minutes=rows.reduce((n,x)=>n+(x.media==='movie'?(Number(x.anime?.runtime)||100):24*Math.max(1,x.units)),0);
  return {entries:rows.length,monthUnits:thisMonth.reduce((n,x)=>n+x.units,0),activeDays:days.size,average:rated.length?Math.round(rated.reduce((n,x)=>n+x.rating,0)/rated.length*10)/10:null,hours:Math.round(minutes/6)/10};
 }
 function monthOptions(rows){
  const set=[...new Set(rows.map(x=>localMonth(x.at)))].sort().reverse();
  return set.map(key=>{const [y,m]=key.split('-').map(Number),label=new Date(y,m-1,1).toLocaleDateString('sq-AL',{month:'long',year:'numeric'});return'<option value="'+esc(key)+'" '+(month===key?'selected':'')+'>'+esc(label)+'</option>'}).join('');
 }
 function dayLabel(key){
  const [y,m,d]=key.split('-').map(Number),date=new Date(y,m-1,d),today=new Date(),base=new Date(today.getFullYear(),today.getMonth(),today.getDate()).getTime(),diff=Math.round((date.getTime()-base)/DAY);
  if(diff===0)return'Sot';if(diff===-1)return'Dje';return date.toLocaleDateString('sq-AL',{weekday:'long',day:'numeric',month:'long',year:date.getFullYear()===today.getFullYear()?undefined:'numeric'});
 }
 function timeLabel(t){return new Date(t).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'})}
 function heatmap(rows){
  const counts=new Map();for(const e of rows)counts.set(localDay(e.at),(counts.get(localDay(e.at))||0)+e.units);
  const cells=[];for(let i=29;i>=0;i--){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-i);const key=localDay(d.getTime()),n=counts.get(key)||0,level=n===0?0:n===1?1:n<=3?2:n<=6?3:4;cells.push('<span class="at132-heat-'+level+'" title="'+esc(d.toLocaleDateString('sq-AL',{day:'numeric',month:'short'}))+': '+n+'"></span>')}return cells.join('');
 }
 function render(){
  const all=historyEntries(),rows=filterEntries(all),sum=summary(all),undated=undatedHTML(undatedProgress(all)),groups=new Map();
  for(const e of rows){const key=localDay(e.at),arr=groups.get(key)||[];arr.push(e);groups.set(key,arr)}
  const timeline=[...groups.entries()].map(([key,list])=>'<section class="at132-day"><header><div><span>'+esc(dayLabel(key))+'</span><small>'+list.reduce((n,x)=>n+x.units,0)+' regjistrime</small></div><time>'+esc(key)+'</time></header><div class="at132-day-list">'+list.map(e=>{const poster=ctx.poster(e.anime?.cover||''),rating=e.rating!=null?'★ '+e.rating.toFixed(1):'Pa notë',tag=e.kind==='rewatch'?'REWATCH':e.media==='movie'?'FILM':'FIRST WATCH';return'<article class="at132-entry"><button type="button" class="at132-poster" data-pro-action="diary-open" data-id="'+esc(e.id)+'">'+(poster?'<img src="'+esc(poster)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<span>✦</span>')+'</button><div class="at132-entry-copy"><div class="at132-entry-top"><span class="at132-tag">'+esc(tag)+'</span><time>'+esc(timeLabel(e.at))+'</time></div><button type="button" class="at132-title" data-pro-action="diary-open" data-id="'+esc(e.id)+'">'+esc(e.anime?.title||'Titull i hequr')+' <span>›</span></button><strong>'+esc(e.label)+'</strong>'+(e.note?'<p>'+esc(e.note)+'</p>':'<p class="at132-muted">Pa shënim për këtë shikim.</p>')+'</div><div class="at132-entry-side"><b>'+esc(rating)+'</b><small>'+e.units+(e.media==='movie'?' film':' ep.')+'</small><button type="button" class="ghost" data-pro-action="diary-edit" data-id="'+esc(e.id)+'">✎ Edito</button></div></article>'}).join('')+'</div></section>').join('');
  return '<section class="at132-diary"><div class="at132-hero"><div><span class="eyebrow">DITARI YT PERSONAL</span><h2>Diary ✦</h2><p>Çdo episod, film dhe rewatch me datën kur e pe. Shënimet dhe nota e këtij shikimi janë private dhe sinkronizohen me bibliotekën tënde.</p></div><div class="at132-hero-mark">✎<small>DIARY</small></div></div><div class="at132-summary"><article><span>Këtë muaj</span><strong>'+sum.monthUnits+'</strong><small>episode / filma</small></article><article><span>Ditë aktive</span><strong>'+sum.activeDays+'</strong><small>me histori të datuar</small></article><article><span>Mes. Diary</span><strong>'+(sum.average==null?'—':sum.average.toFixed(1))+'</strong><small>nga hyrjet me notë</small></article><article><span>Kohë e regjistruar</span><strong>'+sum.hours+'h</strong><small>vlerësim</small></article></div><section class="at132-activity"><div><strong>30 ditët e fundit</strong><small>Intensiteti i shikimit</small></div><div class="at132-heat">'+heatmap(all)+'</div></section><div class="at132-controls"><label class="at132-search">⌕ <input id="at132-diary-search" value="'+esc(query)+'" placeholder="Kërko titull ose shënim…" autocomplete="off"></label><label>Media<select id="at132-diary-media"><option value="all" '+(media==='all'?'selected':'')+'>Të gjitha</option><option value="anime" '+(media==='anime'?'selected':'')+'>Anime</option><option value="tv" '+(media==='tv'?'selected':'')+'>Seriale TV</option><option value="movie" '+(media==='movie'?'selected':'')+'>Filma</option></select></label><label>Shikimi<select id="at132-diary-kind"><option value="all" '+(kind==='all'?'selected':'')+'>Të gjitha</option><option value="first" '+(kind==='first'?'selected':'')+'>Shikimi i parë</option><option value="rewatch" '+(kind==='rewatch'?'selected':'')+'>Rewatch</option></select></label><label>Muaji<select id="at132-diary-month"><option value="all">Gjithë historiku</option>'+monthOptions(all)+'</select></label><label>Shënimet<select id="at132-diary-detail">'+[['all','Të gjitha'],['notes','Me shënime'],['rated','Me vlerësim'],['unrated','Pa vlerësim']].map(([id,label])=>'<option value="'+id+'" '+(detailFilter===id?'selected':'')+'>'+label+'</option>').join('')+'</select></label><label>Renditja<select id="at132-diary-order"><option value="newest" '+(order==='newest'?'selected':'')+'>Më të rejat</option><option value="oldest" '+(order==='oldest'?'selected':'')+'>Më të vjetrat</option></select></label><button type="button" class="ghost" data-pro-action="diary-reset">Pastro filtrat</button></div><div class="at132-count"><strong>'+rows.length+'</strong> hyrje të dukshme · <span>'+rows.reduce((n,x)=>n+x.units,0)+' shikime</span></div><div class="at132-timeline">'+(timeline||(undated?'':'<div class="at132-empty"><span>✎</span><h3>Ende pa hyrje në Diary</h3><p>Shëno një episod ose film si të parë. Diary krijohet automatikisht nga historiku yt me datë.</p></div>'))+'</div>'+undated+'<p class="at132-note">Diary përdor të njëjtin historik që ushqen Statistikat dhe Wrapped. Ndryshimi i datës këtu ndryshon edhe statistikat për atë ditë; nuk ndryshon progresin e episodeve.</p></section>';
 }
 function findEntry(id){return historyEntries().find(x=>x.id===id)||null}
 function localInput(iso){const t=toTime(iso);if(!t)return'';const d=new Date(t),pad=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())}
 function ratings(value){let out='<option value="">Pa vlerësim</option>';for(let n=.5;n<=10;n+=.5)out+='<option value="'+n+'" '+(Number(value)===n?'selected':'')+'>★ '+n.toFixed(1)+'/10</option>';return out}
 function openEditor(id){
  const entry=findEntry(id),dialog=document.getElementById('at132-diary-dialog');if(!entry||!dialog)return;
  editing=entry.ref;document.getElementById('at132-diary-edit-title').textContent=entry.anime?.title||'Diary';
  document.getElementById('at132-diary-edit-subtitle').textContent=entry.label+(entry.kind==='rewatch'?' · Rewatch':'');
  document.getElementById('at132-diary-date').value=localInput(entry.date);
  window.ATHTML.renderHTML(document.getElementById('at132-diary-rating'),ratings(entry.rating));
  document.getElementById('at132-diary-note').value=entry.note||'';
  if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');
 }
 function closeEditor(){const dialog=document.getElementById('at132-diary-dialog');if(dialog?.open&&dialog.close)dialog.close();else dialog?.removeAttribute('open');editing=null}
 function resolveEditing(){
  const s=state();if(!editing)return null;
  if(editing.type==='history'){
   let index=Number(editing.index),event=editing.eventId?(s.history||[]).find(x=>String(x.eventId||'')===editing.eventId):s.history?.[index];
   if(!event)return null;return{target:event,type:'history'};
  }
  const anime=(s.anime||[]).find(x=>x.id===editing.animeId),session=(anime?.rewatches||[]).find(x=>x.id===editing.sessionId);
  let target=editing.eventId?(session?.episodes||[]).find(x=>String(x.eventId||'')===editing.eventId):session?.episodes?.[Number(editing.index)];
  return target?{target,type:'rewatch'}:null;
 }
 function saveEditor(){
  const ref=resolveEditing();if(!ref){ctx.toast('Hyrja e Diary nuk u gjet më.');closeEditor();return}
  const raw=document.getElementById('at132-diary-date').value,t=Date.parse(raw),rating=cleanRating(document.getElementById('at132-diary-rating').value),note=String(document.getElementById('at132-diary-note').value||'').trim().slice(0,1500);
  if(!Number.isFinite(t)){ctx.toast('Zgjidh një datë të vlefshme.');return}
  if(t>Date.now()+10*60*1000){ctx.toast('Data e Diary nuk mund të jetë në të ardhmen.');return}
  const before=JSON.parse(JSON.stringify(ref.target));ref.target.eventId=String(ref.target.eventId||ctx.uuid());ref.target.date=new Date(t).toISOString();ref.target.diaryRating=rating;ref.target.diaryNote=note;
  if(!ctx.save()){Object.keys(ref.target).forEach(k=>delete ref.target[k]);Object.assign(ref.target,before);ctx.toast('Hyrja e Diary nuk u ruajt.');return}
  closeEditor();ctx.rerender(true);ctx.toast('Diary u përditësua ✓');
 }
 function mount(){
  if(!document.getElementById('at132-diary-dialog'))window.ATHTML.insertHTML(document.body,'beforeend','<dialog id="at132-diary-dialog" class="at132-dialog"><form id="at132-diary-form"><div class="at132-dialog-head"><div><span class="eyebrow">EDITO HYRJEN</span><h2 id="at132-diary-edit-title">Diary</h2><p id="at132-diary-edit-subtitle"></p></div><button type="button" class="x" data-at132-close aria-label="Mbyll">×</button></div><div class="at132-dialog-body"><label>Data dhe ora<input id="at132-diary-date" type="datetime-local" required></label><label>Vlerësimi i këtij shikimi<select id="at132-diary-rating"></select></label><label>Shënimi yt<textarea id="at132-diary-note" maxlength="1500" placeholder="Çfarë mendove, çfarë të bëri përshtypje…"></textarea></label><p>Ky rating është vetëm për këtë hyrje në Diary; nuk ndryshon notën e përgjithshme të anime-s.</p></div><div class="at132-dialog-actions"><button type="button" class="ghost" data-at132-close>Anulo</button><button type="submit" class="primary">Ruaj hyrjen</button></div></form></dialog>');
  document.addEventListener('click',e=>{if(e.target.closest('[data-at132-close]'))closeEditor()});
  document.getElementById('at132-diary-form')?.addEventListener('submit',e=>{e.preventDefault();saveEditor()});
  document.addEventListener('input',e=>{if(e.target?.id!=='at132-diary-search')return;query=String(e.target.value||'').slice(0,120);const caret=e.target.selectionStart;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{if(!document.getElementById('at132-diary-search'))return;ctx.rerender(true);requestAnimationFrame(()=>{const n=document.getElementById('at132-diary-search');if(n){n.focus({preventScroll:true});try{n.setSelectionRange(caret,caret)}catch{}}})},120)});
  document.addEventListener('change',e=>{if(e.target?.id==='at132-diary-media'){media=e.target.value;ctx.rerender(true)}else if(e.target?.id==='at132-diary-kind'){kind=e.target.value;ctx.rerender(true)}else if(e.target?.id==='at132-diary-detail'){detailFilter=e.target.value;ctx.rerender(true)}else if(e.target?.id==='at132-diary-order'){order=e.target.value;ctx.rerender(true)}else if(e.target?.id==='at132-diary-month'){month=e.target.value;ctx.rerender(true)}});
 }
 function action(op,id){
  if(op==='diary-open-undated'){let ref;try{ref=JSON.parse(id)}catch{return}if(!Array.isArray(ref))return;const [animeId,seasonId,n]=ref,anime=(state().anime||[]).find(a=>a.id===animeId),season=anime?.seasons?.find(s=>s.id===seasonId);if(currentEpisode(anime,season,n))ctx.openEpisode(animeId,seasonId,n);return}
  if(op==='diary-edit'){openEditor(id);return}
  if(op==='diary-open'){const e=findEntry(id);if(!e)return;if(e.media!=='movie'&&e.seasonId&&e.episodes?.length)ctx.openEpisode(e.animeId,e.seasonId,e.episodes[0]);else ctx.openAnime(e.animeId);return}
  if(op==='diary-reset'){query='';media='all';kind='all';month='all';detailFilter='all';order='newest';ctx.rerender(true)}
 }
 return{render,mount,action,collect:historyEntries,filterEntries,summary,undatedProgress};
};
