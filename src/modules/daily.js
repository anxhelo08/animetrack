/* AnimeTrack 11.5 — shared, read-only daily brief + explicit quick episode actions.
   Reads the existing personal library; creates no second progress store. */
window.ATDaily115=function ATDaily115(ctx){
 const esc=ctx.esc,DAY=86400000;
 const anime=()=>ctx.state().anime||[];
 let latest=null,busy=false,expanded=false;
 const ready=a=>Math.max(0,ctx.releasedTotal(a)-ctx.count(a));
 const byId=id=>anime().find(a=>a.id===id);
 const next=a=>ctx.nextEpisode(a);
 const stamp=a=>Date.parse(a.updatedAt||a.createdAt||'')||0;
 const season=(a,s)=>Math.max(1,a.seasons.indexOf(s)+1);
 const dtime=t=>new Date(t).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'});
 const date=t=>new Date(t).toLocaleDateString('sq-AL',{day:'numeric',month:'short'});
 function focus(){return anime().filter(a=>['watching','waiting','completed'].includes(a.status)&&ready(a)>0&&next(a)).sort((a,b)=>Number(b.status==='watching')-Number(a.status==='watching')||stamp(b)-stamp(a))[0]||null}
 function today(){const start=new Date();start.setHours(0,0,0,0);return (ctx.upcoming()||[]).filter(e=>Number(e.when)>=start.getTime()&&Number(e.when)<start.getTime()+DAY).sort((a,b)=>a.when-b.when).slice(0,3)}
 function thisWeek(){const now=Date.now(),start=new Date();start.setHours(0,0,0,0);const begin=start.getTime()-((start.getDay()+6)%7)*DAY;return (ctx.state().history||[]).filter(h=>h.action==='watched'&&Date.parse(h.date||'')>=begin&&Date.parse(h.date||'')<=now).length}
 function cover(a){const url=ctx.poster(a.cover||'');return url?`<img loading="lazy" referrerpolicy="no-referrer" src="${esc(url)}" alt="Posteri i ${esc(a.title)}">`:'<span>✦</span>'}
 function sync(){const s=ctx.watchSaveStatus?.()||{};return s.mode==='cloud'?(s.conflict?'Konflikt cloud · ruaj kopjen lokale':s.dirty||s.saving?'Ndryshime në pritje të cloud':s.connected?'Progresi në cloud ✓':'Lidhja me cloud nuk është konfirmuar'):'Progresi lokal · hyr për sinkronizim'}
 function render(compact=false){
  const a=focus(),n=a&&next(a),due=today(),goal=Number(ctx.state().preferences?.weeklyGoal)||10,done=thisWeek(),last=latest&&latest.owner===(ctx.user()?.id||'guest')&&byId(latest.id)?.seasons?.find(s=>s.id===latest.seasonId)?.watched?.includes(latest.n);
  const greeting=new Date().getHours()<12?'Mirëmëngjes':new Date().getHours()<18?'Mirëdita':'Mirëmbrëma';
  const panel=`<section class="at115-day ${compact?'compact':''}" aria-label="Your Anime Day"><div class="at115-day-top"><span class="at115-eyebrow">✦ YOUR ANIME DAY</span><span class="at115-day-date">${esc(new Date().toLocaleDateString('sq-AL',{weekday:'short',day:'numeric',month:'short'}))}</span></div><div class="at115-day-heading"><div><h2>${compact?greeting:'Plani yt për sot'} ✦</h2><p>Vazhdo shikimin, shiko premierat dhe mbaj ritmin tënd.</p></div><button type="button" class="at115-day-calendar" data-day-action="calendar">Kalendari ↗</button></div>
  <div class="at115-day-grid"><article class="at115-day-focus"><span class="at115-label">VAZHDO KU E LE</span>${a&&n?`<div class="at115-day-focus-row"><button type="button" class="at115-day-cover" data-day-action="open-next" data-id="${esc(a.id)}">${cover(a)}</button><div class="at115-day-focus-main"><strong>${esc(a.title)}</strong><span>S${season(a,n.season)} · EP ${n.n} · ${ready(a)} episode gati</span><div class="at115-day-actions"><button type="button" class="at115-watch-open" data-day-action="open-next" data-id="${esc(a.id)}">▶ Hap episodin</button><button type="button" class="at115-watch-done" data-day-action="mark-next" data-id="${esc(a.id)}" aria-label="Shëno episodin ${n.n} si të parë">✓ E pashë</button></div></div></div>`:`<div class="at115-day-empty"><strong>Je në rregull me episodet!</strong><span>Shiko orarin ose gjej diçka të re.</span><button type="button" data-day-action="discover">Zbulo anime ↗</button></div>`}${last?`<button type="button" class="at115-day-undo" data-day-action="undo">↶ Zhbëj EP ${latest.n}</button>`:''}</article>
  <article class="at115-day-agenda"><span class="at115-label">SOT NË KALENDAR</span>${due.length?due.map(e=>{const entry=byId(e.animeId);return `<button type="button" class="at115-day-event" data-day-action="calendar"><time>${esc(dtime(e.when))}</time><span>${esc(entry?.title||e.title||'Anime')}<small>EP ${esc(e.seasonEpisode||e.episode)} · ${esc(date(e.when))}</small></span><span aria-hidden="true">›</span></button>`}).join(''):'<p>Nuk ka premiera të konfirmuara për sot.</p>'}<button type="button" class="at115-day-link" data-day-action="calendar">Shiko javën →</button></article>
  ${compact?'<details class="at115-day-more"><summary>✦ Më shumë: rekomandime dhe statistika</summary><div class="at115-day-more-grid">':''}<article class="at115-day-discover"><span class="at115-label">PËR TY</span><strong>Zbulimi i radhës ✨</strong><p>Rekomandime sipas shijeve dhe bibliotekës tënde, pa përsëritje të sezoneve.</p><button type="button" data-day-action="recommendations">Shiko rekomandimet ↗</button></article>
  <article class="at115-day-progress"><span class="at115-label">RITMI KËTË JAVË</span><strong>${done}<small> / ${Math.max(1,goal)} episode</small></strong><div class="at115-day-progressbar" role="progressbar" aria-label="Objektivi javor" aria-valuenow="${Math.min(done,goal)}" aria-valuemin="0" aria-valuemax="${Math.max(1,goal)}"><span style="width:${Math.min(100,Math.round(done/Math.max(1,goal)*100))}%"></span></div><small>${esc(sync())}</small></article>${compact?'</div></details>':''}</div></section>`;
  return compact?`<div class="at115-day-collapse"><button type="button" class="at115-day-summary" data-day-action="toggle" aria-expanded="${expanded}"><span>✦ YOUR ANIME DAY</span><strong>${a&&n?esc(a.title)+' · EP '+n.n:due.length+' premiera sot'}</strong><span aria-hidden="true">${expanded?'⌃':'⌄'}</span></button>${expanded?panel:''}</div>`:panel;
 }
 function action(op,id){
  if(op==='toggle'){expanded=!expanded;ctx.rerender();return}
  if(op==='calendar'){ctx.navigate('calendar');return}
  if(op==='recommendations'){ctx.navigate('recommendations');return}
  if(op==='discover'){ctx.navigate('explore');return}
  const a=byId(id);
  if(op==='open-next'){const n=a&&next(a);if(n)ctx.openEpisode(a.id,n.season.id,n.n);else if(a)ctx.openAnime(a.id);return}
  if(op==='mark-next'){
   if(busy||!a)return;const n=next(a);if(!n)return;busy=true;
   try{if(ctx.markNext(a.id)){latest={id:a.id,seasonId:n.season.id,n:n.n,owner:ctx.user()?.id||'guest'};ctx.rerender()}}finally{busy=false}return;
  }
  if(op==='undo'){
   const prior=latest;latest=null;
   if(prior&&prior.owner===(ctx.user()?.id||'guest'))ctx.undoEpisode?.(prior.id,prior.seasonId,prior.n);
   ctx.rerender();return;
  }
 }
 return{render,action,focus,today,thisWeek};
};
