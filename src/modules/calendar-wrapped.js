window.ATCalendarWrapped=function ATCalendarWrapped(ctx){
 let weekOffset=0,period='month',mode=(typeof matchMedia==='function'&&matchMedia('(max-width:760px)').matches)?'agenda':'week',scope='following',focusDay=null,calendarQuery='',releaseFilter='all';
 const esc=ctx.esc,D=86400000;
 function monday(date){const x=new Date(date.getFullYear(),date.getMonth(),date.getDate());x.setDate(x.getDate()-(x.getDay()+6)%7);return x}
 function calendar(){
 const now=new Date(),prefs=ctx.state().preferences||{},reminders=prefs.calendarReminders||{},status=ctx.airingStatus?.()||{},library=ctx.state().anime;
 const all=ctx.upcoming().filter(e=>Number.isFinite(Number(e.when))&&library.some(a=>a.id===e.animeId));
 const findSeason=e=>library.find(a=>a.id===e.animeId)?.seasons?.find(s=>s.id===e.seasonId);
 const isWatched=e=>!!findSeason(e)?.watched?.includes(Number(e.seasonEpisode||e.episode));
 const selected=a=>scope==='all'||scope==='following'&&['watching','completed'].includes(a?.status)||scope==='watching'&&a?.status==='watching'||scope==='completed'&&a?.status==='completed'||scope==='favorites'&&a?.favorite;
 const entries=all.filter(e=>selected(library.find(a=>a.id===e.animeId))&&(!calendarQuery||`${e.title} ${e.season}`.toLocaleLowerCase().includes(calendarQuery.toLocaleLowerCase()))&&(releaseFilter==='all'||releaseFilter==='upcoming'&&e.when>Date.now()||releaseFilter==='unwatched'&&e.when<=Date.now()&&!isWatched(e))).sort((a,b)=>a.when-b.when);
 const labelDate=d=>d.toLocaleDateString('sq-AL',{weekday:'short',day:'numeric',month:'short'});
 const dayStart=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate());
 const dayEvents=d=>{const start=dayStart(d).getTime(),end=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1).getTime();return entries.filter(e=>e.when>=start&&e.when<end)};
 const keyOf=e=>[e.animeId,e.seasonId||'',e.episode,e.when].join(':');
 const detail=e=>`data-pro-action="calendar-open" data-id="${esc(keyOf(e))}"`;
 const line=e=>{
  const coming=e.when>Date.now(),key=esc(keyOf(e)),n=Number(e.seasonEpisode||e.episode),s=findSeason(e),watched=isWatched(e),time=new Date(e.when).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'});
  return `<article class="at-cal-event ${coming?'upcoming':'released'} ${watched?'seen':''}"><div class="at-cal-cover">${ctx.poster(e.cover)?`<img src="${esc(ctx.poster(e.cover))}" alt="" loading="lazy" referrerpolicy="no-referrer">`:''}</div><div class="at-cal-event-info"><span class="at-cal-event-meta"><time datetime="${esc(new Date(e.when).toISOString())}">${esc(time)}</time> · ${s?.format==='MOVIE'?'Film':'EP '+esc(n)} · ${coming?'Së shpejti':watched?'I parë':'Transmetuar'}</span><button type="button" class="at-cal-title" ${detail(e)}>${esc(e.title)}</button><small>${esc(e.season||'Vazhdim i konfirmuar')}</small><div class="at-cal-event-actions"><button type="button" class="at-cal-mini" ${detail(e)}>Detajet</button>${coming?`<button type="button" class="at-cal-mini ${reminders[keyOf(e)]!==undefined?'active':''}" data-pro-action="calendar-remind" data-id="${key}" aria-pressed="${reminders[keyOf(e)]!==undefined}">${reminders[keyOf(e)]!==undefined?'Kujtesa aktive':'Më kujto'}</button>`:s&&n>0&&n<=ctx.released(s)?`<button type="button" class="at-cal-mini ${watched?'active':''}" data-pro-action="calendar-mark" data-id="${key}">${watched?'I parë':'+ Shëno si parë'}</button>`:''}</div><a class="at-cal-source" href="${esc(e.url||'https://anilist.co')}" target="_blank" rel="noopener noreferrer">${esc(e.source||'Katalogu')} · Burimi</a>${!s?'<small class="at-cal-untracked">Vazhdim i ri; hap titullin dhe përditëso pjesët për ta shënuar.</small>':''}</div></article>`;
 };
 const day=(d,compact=false)=>{
  const list=dayEvents(d),today=dayStart(d).getTime()===dayStart(now).getTime();
  return `<article class="at-cal-day ${today?'today':''} ${compact?'compact':''}"><header><span>${esc(labelDate(d))}</span><b>${today?'Sot':list.length?list.length:''}</b></header>${compact?`<button type="button" class="at-cal-day-open" data-pro-action="calendar-day" data-id="${dateKey(d)}" aria-label="Shiko ngjarjet e ${esc(labelDate(d))}">${list.slice(0,3).map(x=>`<span class="at-cal-month-event">${esc(x.title)} · E${x.episode}</span>`).join('')||'<span class="at-cal-noevents">—</span>'}${list.length>3?`<small>+${list.length-3} të tjera</small>`:''}</button>`:list.map(line).join('')||'<p class="at-cal-noevents">Pa transmetim</p>'}</article>`;
 };
 const start=mode==='month'?new Date(now.getFullYear(),now.getMonth()+weekOffset,1):monday(now);
 if(mode!=='month')start.setDate(start.getDate()+weekOffset*7);
 const begin=mode==='month'?monday(start):start;
 const days=mode==='month'?Math.ceil((new Date(start.getFullYear(),start.getMonth()+1,0).getDate()+(start.getDay()+6)%7)/7)*7:mode==='agenda'?14:7;
 const dates=Array.from({length:days},(_,i)=>{const d=new Date(begin);d.setDate(begin.getDate()+i);return d});
 const showDates=focusDay&&mode==='agenda'?[new Date(focusDay+'T12:00:00')]:dates;
 const windowEvents=dates.flatMap(dayEvents),upcoming=windowEvents.filter(e=>e.when>Date.now()).length;
 const heading=mode==='month'?start.toLocaleDateString('sq-AL',{month:'long',year:'numeric'}):showDates.length===1?labelDate(showDates[0]):labelDate(dates[0])+' — '+labelDate(dates.at(-1));
 const controls=`<div class="at-cal-toolbar"><div class="at-cal-modes" role="group" aria-label="Pamja e kalendarit">${[['week','Java'],['month','Muaji'],['agenda','Agjenda']].map(([v,l])=>`<button type="button" data-pro-action="calendar-view" data-id="${v}" class="${mode===v?'active':''}" aria-pressed="${mode===v}">${l}</button>`).join('')}</div><div class="at-cal-nav"><button type="button" class="pro-btn" data-pro-action="week-prev" aria-label="Periudha e mëparshme">←</button><button type="button" class="pro-btn" data-pro-action="week-today">Sot</button><button type="button" class="pro-btn" data-pro-action="week-next" aria-label="Periudha tjetër">→</button><button type="button" class="pro-btn" data-pro-action="calendar-refresh" ${status.busy?'disabled':''}>${status.busy?'Po rifreskoj…':'Rifresko orarin'}</button><button type="button" class="pro-btn" data-pro-action="calendar-ics">Eksporto .ics</button></div></div><div class="at-cal-filter-bar"><div class="at-cal-filters" role="group" aria-label="Filtro sipas bibliotekës">${[['following','Duke parë + Përfunduar'],['watching','Duke parë'],['completed','Përfunduar'],['all','Biblioteka'],['favorites','Të preferuarat']].map(([v,l])=>`<button type="button" data-pro-action="calendar-filter" data-id="${v}" class="${scope===v?'active':''}" aria-pressed="${scope===v}">${l}</button>`).join('')}</div><label class="at-cal-search"><span>Kërko në orar</span><input type="search" id="calendar-query" maxlength="100" placeholder="Titulli i animes…" value="${esc(calendarQuery)}"></label><label class="at-cal-release"><span>Episodet</span><select id="calendar-release">${[['all','Të gjitha'],['upcoming','Së shpejti'],['unwatched','Transmetuar, të paparë']].map(([v,l])=>`<option value="${v}" ${releaseFilter===v?'selected':''}>${l}</option>`).join('')}</select></label></div>`;
 const chips=mode==='agenda'?`<nav class="at113-cal-days" aria-label="Zgjidh ditën">${dates.map(d=>`<button type="button" data-pro-action="calendar-day" data-id="${dateKey(d)}" aria-pressed="${focusDay===dateKey(d)}" class="${focusDay===dateKey(d)?'active':dateKey(d)===dateKey(now)?'today':''}"><small>${esc(d.toLocaleDateString('sq-AL',{weekday:'short'}))}</small><b>${d.getDate()}</b><i>${dayEvents(d).length} ep.</i></button>`).join('')}</nav>`:'';
 const agendaDates=focusDay?showDates:showDates.filter(d=>dayEvents(d).length);
 const body=mode==='agenda'?`<div class="at-cal-agenda">${agendaDates.map(d=>`<section><h3>${esc(labelDate(d))} <small>${dayEvents(d).length} episode</small></h3><div class="at-cal-agenda-events">${dayEvents(d).map(line).join('')||'<p class="at-cal-noevents">Pa transmetime të konfirmuara këtë ditë.</p>'}</div></section>`).join('')||'<div class="at-cal-empty"><h3>Ende pa transmetime të konfirmuara</h3><p>Ndrysho periudhën ose filtrat. Orari rifreskohet çdo ditë nga burimet; një datë e pakonfirmuar nuk shfaqet si episod i ri.</p><button type="button" class="pro-btn" data-pro-action="calendar-refresh">Kontrollo burimet</button></div>'}</div>`:`<div class="at-cal-grid ${mode==='month'?'month':''}">${dates.map(d=>day(d,mode==='month')).join('')}</div>`;
 const coverage=(status.coverage||[]).filter(x=>selected(library.find(a=>a.id===x.animeId)));
 const missing=coverage.filter(x=>x.status!=='scheduled');
 const stamp=status.checkedAt?new Date(status.checkedAt).toLocaleString('sq-AL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'Ende pa kontroll';
 const followed=library.filter(a=>selected(a)&&(!calendarQuery||a.title.toLocaleLowerCase().includes(calendarQuery.toLocaleLowerCase())));
 const nearest=entries.find(e=>e.when>Date.now()&&!windowEvents.some(x=>keyOf(x)===keyOf(e)));
 const followedHTML=`<section class="at-cal-followed"><div class="at-cal-followed-heading"><h3>Anime që ndjek</h3><span>${followed.length} tituj</span></div><div class="at-cal-followed-grid">${followed.map(a=>{const check=coverage.find(c=>c.animeId===a.id),next=entries.find(e=>e.animeId===a.id&&e.when>Date.now());return `<article><button type="button" class="at-cal-followed-title" data-pro-action="calendar-anime" data-id="${esc(a.id)}">${ctx.poster(a.cover)?`<img src="${esc(ctx.poster(a.cover))}" alt="" loading="lazy">`:''}<span><strong>${esc(a.title)}</strong><small>${next?'EP '+next.episode+' · '+esc(labelDate(new Date(next.when))):check?.status==='unavailable'?'Burimi përkohësisht i paarritshëm':check?.status==='unlinked'?'Mungon lidhja me katalogun':check?.status==='unannounced'?'Ende pa datë episodi të konfirmuar':'Po kontrolloj orarin…'}</small></span></button>${next?`<button type="button" class="at-cal-mini" data-pro-action="calendar-day" data-id="${dateKey(new Date(next.when))}">Shiko në kalendar</button>`:''}</article>`}).join('')||'<p class="at-cal-noevents">Ky filtër nuk ka tituj. Zgjidh “Biblioteka” për të parë të gjithë titujt e ruajtur.</p>'}</div></section>`;
 const missed=entries.filter(e=>e.when<Date.now()&&e.when>Date.now()-7*D&&!isWatched(e)).slice(-6).reverse();
 return `<div class="at-calendar-modern"><header class="at-cal-hero"><div><h2>Kalendari i animeve të tua</h2><p>Episode të reja dhe vazhdime për titujt që ndjek, në orën lokale.</p><div class="at-cal-summary"><span><b>${upcoming}</b> së shpejti</span><span><b>${missed.length}</b> të paparë këtë javë</span><span>${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)}</span></div></div><p class="at-cal-freshness" role="status">${status.busy?'Po kontrolloj burimet…':'Kontrolluar: '+esc(stamp)}${status.failures?'<br>Disa burime nuk u arritën; oraret e ruajtura mbeten.':''}<small>Kontroll ditor në server · AniList / MAL / TVMaze</small></p></header>${controls}<div class="at-cal-period"><h3>${esc(heading)}</h3>${focusDay&&mode==='agenda'?'<button type="button" class="pro-btn" data-pro-action="calendar-focus-reset">Gjithë periudha</button>':''}</div>${!windowEvents.length&&nearest?`<p class="at-cal-nearest">Orari i radhës është jashtë kësaj periudhe: ${esc(nearest.title)} · ${esc(labelDate(new Date(nearest.when)))} <button type="button" class="pro-btn" data-pro-action="calendar-day" data-id="${dateKey(new Date(nearest.when))}">Hap datën</button></p>`:''}${chips}<div class="at-cal-stage" aria-busy="${!!status.busy}">${body}</div>${followedHTML}${missed.length&&releaseFilter!=='upcoming'?`<section class="at-cal-missed"><h3>Për t’u kapur me episodet e fundit</h3><div class="at-cal-missed-list">${missed.map(line).join('')}</div></section>`:''}<details class="at-cal-coverage"><summary>Gjendja e burimeve · ${coverage.length} tituj${missing.length?' · '+missing.length+' pa orar të ardhshëm':''}</summary><p>Vazhdimet vijnë vetëm nga lidhje të konfirmuara. Pa datë në katalog nuk do të thotë se titulli është hequr nga lista.</p><div>${coverage.map(x=>`<p><strong>${esc(x.title)}</strong><span>${esc(({scheduled:'Orar i konfirmuar',unannounced:'Ende pa datë të re',unavailable:'Burimi nuk u arrit',pending:'Po kontrolloj orarin',unlinked:'Mungon ID e katalogut'})[x.status]||'Në kontroll')}</span><small>${esc((x.checks||[]).map(c=>c.source+(c.status==='ok'?' ✓':' · i paarritshëm')).join(' · '))}${x.checkedAt?' · '+esc(new Date(x.checkedAt).toLocaleDateString('sq-AL')):''}</small></p>`).join('')||'<p>Rifresko orarin për të parë gjendjen e çdo titulli.</p>'}</div></details><p class="at-cal-footnote">Datat janë orare transmetimi të katalogut dhe mund të ndryshojnë. Disponueshmëria në një platformë nuk garantohet; kujtesat dhe eksporti .ics përdorin kohën e konfirmuar.</p></div>`;
 }
 function dateKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
 function setSearch(value){calendarQuery=String(value||'').slice(0,100);ctx.rerender()}
 function setRelease(value){if(['all','upcoming','unwatched'].includes(value)){releaseFilter=value;ctx.rerender()}}
 let wrappedScope='all',badgeFilter='all';
 function wrappedReport(){return window.ATWrapped129.analyze({state:ctx.state(),events:ctx.activity(),genres:ctx.genres,isMovie:ctx.isMovie,period,scope:wrappedScope,now:new Date()})}
 function wrapped(){return window.ATWrapped129.render(wrappedReport(),{badgeFilter})}
 // Share the all-time analysis across profile and badge refreshes until library/account data changes.
 let allReport=null,allReportState=null,allReportDay='',allReportOwner='';
 ctx.subscribe?.(()=>{allReport=null});
 function allTimeReport(){
  const state=ctx.state(),now=new Date(),day=dateKey(now),owner=String(ctx.user?.()?.id||'guest');
  if(!ctx.subscribe||!allReport||allReportState!==state||allReportDay!==day||allReportOwner!==owner){
   allReport=window.ATWrapped129.analyze({state,events:ctx.activity(),genres:ctx.genres,isMovie:ctx.isMovie,period:'all',scope:'all',now});
   allReportState=state;allReportDay=day;allReportOwner=owner;
  }
  return allReport;
 }
 function achievementsMini(){return window.ATWrapped129.mini(allTimeReport())}
 function achievementIds(){return allTimeReport().unlocked.map(x=>x.id)}
 function copy(){
  const text=window.ATWrapped129.copyText(wrappedReport());
  if(!navigator.clipboard?.writeText){ctx.toast('Kopjimi nuk mbështetet në këtë shfletues.');return}
  navigator.clipboard.writeText(text).then(()=>ctx.toast('Përmbledhja u kopjua ✓')).catch(()=>ctx.toast('Kopjimi nuk u krye.'));
 }
 function image(){
  const canvas=document.createElement('canvas');
  if(!window.ATWrapped129.drawShare(canvas,wrappedReport())){ctx.toast('Karta nuk u krijua në këtë pajisje.');return}
  canvas.toBlob(blob=>{if(!blob){ctx.toast('Eksporti i kartës nuk u krye.');return}
   const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='AnimeTrack-Wrapped.png';link.click();
   setTimeout(()=>URL.revokeObjectURL(url),3000);
  },'image/png');
 }
 function ical(){
 const now=Date.now(),D=86400000,reminders=ctx.state().preferences?.calendarReminders||{},events=ctx.upcoming().filter(e=>e.when>=now&&e.when<now+90*D);
 const stamp=t=>new Date(t).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const clean=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
 const body=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//AnimeTrack//Anime Schedule//SQ','CALSCALE:GREGORIAN'];
 for(const e of events){
  const key=[e.animeId,e.seasonId||'',e.episode,e.when].join(':');
  body.push('BEGIN:VEVENT','UID:anime-'+clean(key)+'@animetrack','DTSTAMP:'+stamp(now),'DTSTART:'+stamp(e.when),'DTEND:'+stamp(e.when+30*60000),'SUMMARY:'+clean(e.title+' · Episodi '+e.episode),'DESCRIPTION:Orari i transmetimit nga katalogu, mund të ndryshojë.');
  if(Object.prototype.hasOwnProperty.call(reminders,key)&&[0,10,30,60,1440].includes(Number(reminders[key])))body.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:AnimeTrack · Episodi i radhës','TRIGGER:-PT'+Number(reminders[key])+'M','END:VALARM');
  body.push('END:VEVENT');
 }
 body.push('END:VCALENDAR');
 const blob=new Blob([body.join('\r\n')+'\r\n'],{type:'text/calendar;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='AnimeTrack-Calendar.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
 function action(op,id){
 if(op==='calendar-anime'){if(ctx.state().anime.some(a=>a.id===id))ctx.openAnime(id);return}

 if(op==='week-prev'){weekOffset--;focusDay=null;ctx.rerender();return}
 if(op==='week-next'){weekOffset++;focusDay=null;ctx.rerender();return}
 if(op==='week-today'){weekOffset=0;focusDay=null;ctx.rerender();return}
 if(op==='calendar-view'){if(['week','month','agenda'].includes(id)){mode=id;weekOffset=0;focusDay=null;ctx.rerender()}return}
 if(op==='calendar-filter'){if(['all','following','watching','completed','favorites'].includes(id)){scope=id;ctx.rerender()}return}
 if(op==='calendar-day'){if(/^\d{4}-\d{2}-\d{2}$/.test(id)){mode='agenda';focusDay=id;const date=new Date(id+'T12:00:00');weekOffset=Math.round((monday(date)-monday(new Date()))/D/7);ctx.rerender()}return}
 if(op==='calendar-focus-reset'){focusDay=null;ctx.rerender();return}
 if(op==='calendar-refresh'){return ctx.refreshAiring?.()}
 if(op==='calendar-ics'){ical();return}
 if(['calendar-open','calendar-mark','calendar-remind'].includes(op)){
  const event=ctx.upcoming().find(e=>[e.animeId,e.seasonId||'',e.episode,e.when].join(':')===id);if(!event)return;
  const a=ctx.state().anime.find(x=>x.id===event.animeId),s=a?.seasons?.find(x=>x.id===event.seasonId),ep=Number(event.seasonEpisode||event.episode);
  if(op==='calendar-open'){if(s&&ep>0)ctx.openEpisode?.(a.id,s.id,ep);else if(a)ctx.openAnime(a.id);return}
  if(op==='calendar-mark'){if(s&&ep>0&&event.when<=Date.now()&&ep<=ctx.released(s))ctx.markEpisode?.(a.id,s.id,ep);return}
  if(op==='calendar-remind'){
   if(event.when<=Date.now())return;
   const reminders=ctx.state().preferences?.calendarReminders||{};
   const defaultLead=ctx.state().preferences?.reminderLead;
   return ctx.setCalendarReminder?.(id,Object.prototype.hasOwnProperty.call(reminders,id)?'off':String([0,10,30,60,1440].includes(Number(defaultLead))?Number(defaultLead):30));
  }
 }
 if(op==='wrapped-month'||op==='wrapped-year'||op==='wrapped-all'){period=op.slice(8);ctx.rerender();return}
 if(op==='wrapped-scope'){if(['all','anime','tv'].includes(id)){wrappedScope=id;ctx.rerender()}return}
 if(op==='wrapped-badges'){if(['all','unlocked','locked'].includes(id)){badgeFilter=id;ctx.rerender()}return}
 if(op==='wrapped-copy'){copy();return}
 if(op==='wrapped-image'){image();return}
}
 function home(){return ctx.smartWeek?ctx.smartWeek(true):'<div class="at-home-widget-empty">Orari personal nuk u ngarkua.</div>'}
 return{calendar,setSearch,setRelease,wrapped,action,home,achievementsMini,achievementIds};
};
