window.ATCalendarWrapped=function ATCalendarWrapped(ctx){
 let weekOffset=0,period='month',mode='week',scope='all',focusDay=null;
 const esc=ctx.esc,D=86400000;
 function monday(date){const x=new Date(date.getFullYear(),date.getMonth(),date.getDate());x.setDate(x.getDate()-(x.getDay()+6)%7);return x}
 function calendar(){
 const now=new Date(),prefs=ctx.state().preferences||{},reminders=prefs.calendarReminders&&typeof prefs.calendarReminders==='object'?prefs.calendarReminders:{};
 const all=ctx.upcoming().filter(e=>Number.isFinite(Number(e.when))&&e.animeId&&ctx.state().anime.some(a=>a.id===e.animeId));
 const entries=all.filter(e=>{const a=ctx.state().anime.find(x=>x.id===e.animeId);return scope==='all'||scope==='favorites'&&a?.favorite||scope==='watching'&&a?.status==='watching'}).sort((a,b)=>a.when-b.when);
 const labelDate=d=>d.toLocaleDateString('sq-AL',{weekday:'short',day:'numeric',month:'short'});
 const dayStart=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate());
 const dayEvents=d=>{const start=dayStart(d).getTime(),end=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1).getTime();return entries.filter(e=>e.when>=start&&e.when<end)};
 const monday=d=>{const x=dayStart(d);x.setDate(x.getDate()-(x.getDay()+6)%7);return x};
 const findSeason=e=>ctx.state().anime.find(a=>a.id===e.animeId)?.seasons?.find(s=>s.id===e.seasonId);
 const keyOf=e=>[e.animeId,e.seasonId||'',e.episode,e.when].join(':');
 const isWatched=e=>{const s=findSeason(e);return !!s?.watched?.includes(Number(e.seasonEpisode||e.episode))};
 const detail=e=>`data-pro-action="calendar-open" data-id="${esc(keyOf(e))}"`;
 const media=e=>ctx.poster(e.cover);
 const line=e=>{
  const coming=e.when>Date.now(),key=esc(keyOf(e)),n=Number(e.seasonEpisode||e.episode),s=findSeason(e),watched=isWatched(e);
  return `<article class="at-cal-event ${coming?'upcoming':'released'}"><div class="at-cal-cover">${media(e)?`<img src="${esc(media(e))}" alt="" loading="lazy" referrerpolicy="no-referrer">`:'✦'}</div><div class="at-cal-event-info"><span class="at-cal-event-meta">${coming?'◷ '+esc(new Date(e.when).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'})):'✓ Transmetuar'} · EP ${esc(e.episode)}</span><button type="button" class="at-cal-title" ${detail(e)}>${esc(e.title)}</button><small>${esc(e.season||'')} · ${esc(e.source||'Katalogu')}</small><div class="at-cal-event-actions"><button class="at-cal-mini" ${detail(e)}>Detajet ↗</button>${coming?`<button class="at-cal-mini ${reminders[keyOf(e)]?'active':''}" data-pro-action="calendar-remind" data-id="${key}" aria-pressed="${!!reminders[keyOf(e)]}">${reminders[keyOf(e)]?'✓ Kujtesa':'🔔 Më kujto'}</button>`:s&&n>0&&n<=ctx.released(s)?`<button class="at-cal-mini ${watched?'active':''}" data-pro-action="calendar-mark" data-id="${key}">${watched?'✓ I parë':'+ Shëno si parë'}</button>`:''}</div></div></article>`;
 };
 const day=(d,compact=false)=>{
  const list=dayEvents(d),today=dayStart(d).getTime()===dayStart(now).getTime();
  return `<article class="at-cal-day ${today?'today':''} ${compact?'compact':''}"><header><span>${esc(labelDate(d))}</span>${today?'<b>SOT</b>':''}</header>${compact?`<button class="at-cal-day-open" data-pro-action="calendar-day" data-id="${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}" aria-label="Shiko ngjarjet e ${esc(labelDate(d))}">${list.slice(0,3).map(x=>`<span class="at-cal-month-event">● ${esc(x.title)}</span>`).join('')||'<span class="at-cal-noevents">—</span>'}${list.length>3?`<small>+${list.length-3} të tjera</small>`:''}</button>`:list.map(line).join('')||'<p class="at-cal-noevents">Asnjë premierë</p>'}</article>`;
 };
 const start=mode==='month'?new Date(now.getFullYear(),now.getMonth()+weekOffset,1):monday(now);
 if(mode!=='month')start.setDate(start.getDate()+weekOffset*7);
 const begin=mode==='month'?monday(start):start;
 let days=mode==='month'?Math.ceil((new Date(start.getFullYear(),start.getMonth()+1,0).getDate()+(start.getDay()+6)%7)/7)*7:mode==='agenda'?14:7;
 const dates=Array.from({length:days},(_,i)=>{const d=new Date(begin);d.setDate(begin.getDate()+i);return d});
 const showDates=focusDay&&mode==='agenda'?[new Date(focusDay+'T12:00:00')]:dates;
 const windowEvents=dates.flatMap(dayEvents),upcoming=windowEvents.filter(e=>e.when>Date.now()).length,nearest=entries.find(e=>e.when>Date.now()),lead=nearest?Math.max(0,Math.ceil((nearest.when-Date.now())/3600000)):null;
 const busiest=[...new Map(dates.map(d=>[labelDate(d),dayEvents(d).length])).entries()].sort((a,b)=>b[1]-a[1])[0];
 const missed=entries.filter(e=>e.when<Date.now()&&e.when>Date.now()-7*86400000&&!isWatched(e)).slice(-4).reverse();
 const controls=`<div class="at-cal-toolbar"><div class="at-cal-modes" role="group" aria-label="Pamja e kalendarit">${[['week','Java'],['month','Muaji'],['agenda','Timeline']].map(([v,l])=>`<button data-pro-action="calendar-view" data-id="${v}" class="${mode===v?'active':''}" aria-pressed="${mode===v}">${l}</button>`).join('')}</div><div class="at-cal-nav"><button class="pro-btn" data-pro-action="week-prev" aria-label="Periudha e mëparshme">←</button><button class="pro-btn" data-pro-action="week-today">Sot</button><button class="pro-btn" data-pro-action="week-next" aria-label="Periudha tjetër">→</button><button class="pro-btn" data-pro-action="calendar-refresh">↻ Orari</button><button class="pro-btn primary" data-pro-action="calendar-ics">↓ .ics</button></div></div><div class="at-cal-filters" role="group" aria-label="Filtro sipas bibliotekës">${[['all','Të gjitha'],['watching','Po shikoj'],['favorites','♥ Favorites']].map(([v,l])=>`<button data-pro-action="calendar-filter" data-id="${v}" class="${scope===v?'active':''}" aria-pressed="${scope===v}">${l}</button>`).join('')}</div>`;
 const heading=mode==='month'?start.toLocaleDateString('sq-AL',{month:'long',year:'numeric'}):showDates.length===1?labelDate(showDates[0]):esc(labelDate(dates[0])+' — '+labelDate(dates[dates.length-1]));
 const body=mode==='agenda'?`<div class="at-cal-agenda">${showDates.map(d=>`<section><h3>${esc(labelDate(d))} <small>${dayEvents(d).length} ngjarje</small></h3><div class="at-cal-agenda-events">${dayEvents(d).map(line).join('')||'<p class="at-cal-noevents">Asnjë premierë e konfirmuar.</p>'}</div></section>`).join('')}</div>`:`<div class="at-cal-grid ${mode==='month'?'month':''}">${dates.map(d=>day(d,mode==='month')).join('')}</div>`;
 return `<header class="at-cal-hero"><div><span class="pro-eyebrow">YOUR AIRING SCHEDULE</span><h2>📅 Kalendari yt anime</h2><p>Premierat e animeve nga biblioteka jote, në orën lokale. Orari i transmetimit nuk garanton disponueshmërinë në një platformë.</p></div><div class="at-cal-hero-stat"><strong>${upcoming}</strong><span>premiera në këtë periudhë</span></div></header><div class="at-cal-highlights"><div><span>◷ Episodi i radhës</span><strong>${nearest?esc(nearest.title):'Ende pa njoftim'}</strong><small>${lead!=null?'Pas rreth '+lead+' orësh':'Rifresko kalendarin për data të reja.'}</small></div><div><span>✦ Dita më aktive</span><strong>${busiest?.[1]?esc(busiest[0]):'Nuk ka premiera'}</strong><small>${busiest?.[1]||0} transmetime të njoftuara</small></div></div>${controls}<div class="at-cal-period"><h3>${heading}</h3>${mode==='agenda'&&focusDay?'<button class="pro-btn" data-pro-action="calendar-focus-reset">Shiko gjithë periudhën</button>':''}</div>${body}${missed.length?`<section class="pro-panel at-cal-missed"><div class="pro-row"><div><span class="pro-eyebrow">CATCH UP</span><h3>Episode të fundit që s’i ke shënuar</h3></div><span class="at-cal-quiet">${missed.length} episode</span></div><div class="at-cal-missed-list">${missed.map(line).join('')}</div></section>`:''}<p class="pro-muted at-cal-footnote">🔔 Kujtesat shfaqen vetëm brenda aplikacionit. Aktivizimi i një kujtese shton njoftim rreth 30 minuta përpara transmetimit; eksporti .ics mund ta shtojë në kalendarin e telefonit.</p>`;
}
 function wrapped(){
  const now=new Date(),start=period==='month'?new Date(now.getFullYear(),now.getMonth(),1).getTime():new Date(now.getFullYear(),0,1).getTime();
  const events=ctx.activity().filter(e=>e.at>=start),byId=new Map(ctx.state().anime.map(a=>[a.id,a])),counts=new Map(),genres=new Map();
  for(const e of events){counts.set(e.id,(counts.get(e.id)||0)+1);for(const g of ctx.genres(byId.get(e.id)||{}))genres.set(g,(genres.get(g)||0)+1)}
  const top=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,5),favorite=[...genres].sort((a,b)=>b[1]-a[1]).slice(0,3),minutes=events.reduce((n,e)=>n+(ctx.isMovie(byId.get(e.id))?100:24),0),title=period==='month'?now.toLocaleDateString('sq-AL',{month:'long',year:'numeric'}):String(now.getFullYear());
  const completed=ctx.state().anime.filter(a=>a.status==='completed').length;
  return `<div class="pro-hero"><span class="pro-eyebrow">YOUR ANIME STORY</span><h2>🏆 Anime Wrapped</h2><p>Përmbledhja personale e muajit ose vitit, nga historiku real i episodeve.</p></div><div class="pro-actions"><button class="pro-btn" data-pro-action="wrapped-month">Ky muaj</button><button class="pro-btn" data-pro-action="wrapped-year">Ky vit</button><button class="pro-btn primary" data-pro-action="wrapped-image">↓ Ruaj kartën PNG</button><button class="pro-btn" data-pro-action="wrapped-copy">Kopjo përmbledhjen</button></div><div class="pro-wrapped" id="pro-wrapped-card"><span class="pro-eyebrow">ANIMETRACK · ${esc(title)}</span><h2>Historia jote anime ✦</h2><div class="pro-wrapped-number">${events.length}</div><p>episode të shënuara në këtë periudhë</p><div class="pro-wrapped-stats"><div><strong>${(minutes/60).toFixed(1)} h</strong><small>Kohë e përafërt</small></div><div><strong>${completed}</strong><small>Anime gjithsej të përfunduara</small></div><div><strong>${favorite.length}</strong><small>Zhanre aktive</small></div></div><h3>Anime më aktive</h3><div class="pro-list">${top.map(([id,n])=>`<div class="pro-row"><strong>${esc(byId.get(id)?.title||'Anime')}</strong><span>${n} ep.</span></div>`).join('')||'<small>Ende pa episode këtë periudhë.</small>'}</div><h3>Zhanret kryesore</h3><div class="pro-tags">${favorite.map(([g,n])=>`<span class="pro-tag">${esc(g)} · ${n}</span>`).join('')||'<small>Ende pa të dhëna.</small>'}</div></div><p class="pro-muted">Koha e shikimit është vlerësim 24 min/episod dhe 100 min/film; nuk është kohë e matur. Shënimet e vjetra pa datë nuk shpiken.</p>`;
 }
 function copy(){const text=$('pro-wrapped-card')?.innerText||'';navigator.clipboard?.writeText(text).then(()=>ctx.toast('Përmbledhja u kopjua ✓')).catch(()=>ctx.toast('Kopjimi nuk u krye.'))}
 function image(){
  const raw=($('pro-wrapped-card')?.innerText||'AnimeTrack').split('\n').map(x=>x.trim()).filter(Boolean).slice(0,17);
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const g=canvas.getContext('2d');
  const bg=g.createLinearGradient(0,0,1080,1350);bg.addColorStop(0,'#37244f');bg.addColorStop(1,'#13283b');g.fillStyle=bg;g.fillRect(0,0,1080,1350);g.fillStyle='#e9d4ff';g.font='bold 60px system-ui';g.fillText('AnimeTrack Wrapped ✦',65,110);g.fillStyle='#f7f3ff';g.font='bold 41px system-ui';
  raw.forEach((line,i)=>{const max=46,short=line.length>max?line.slice(0,max-1)+'…':line;g.fillText(short,65,190+i*58)});
  canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='AnimeTrack-Wrapped.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)},'image/png');
 }
 function ical(){
 const now=Date.now(),D=86400000,reminders=ctx.state().preferences?.calendarReminders||{},events=ctx.upcoming().filter(e=>e.when>=now&&e.when<now+90*D);
 const stamp=t=>new Date(t).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const clean=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
 const body=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//AnimeTrack//Anime Schedule//SQ','CALSCALE:GREGORIAN'];
 for(const e of events){
  const key=[e.animeId,e.seasonId||'',e.episode,e.when].join(':');
  body.push('BEGIN:VEVENT','UID:anime-'+clean(key)+'@animetrack','DTSTAMP:'+stamp(now),'DTSTART:'+stamp(e.when),'DTEND:'+stamp(e.when+30*60000),'SUMMARY:'+clean(e.title+' · Episodi '+e.episode),'DESCRIPTION:Orari i transmetimit nga katalogu, mund të ndryshojë.');
  if(reminders[key])body.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:AnimeTrack · Episodi i radhës','TRIGGER:-PT30M','END:VALARM');
  body.push('END:VEVENT');
 }
 body.push('END:VCALENDAR');
 const blob=new Blob([body.join('\r\n')+'\r\n'],{type:'text/calendar;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='AnimeTrack-Calendar.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
 function action(op,id){
 if(op==='week-prev'){weekOffset--;focusDay=null;ctx.rerender();return}
 if(op==='week-next'){weekOffset++;focusDay=null;ctx.rerender();return}
 if(op==='week-today'){weekOffset=0;focusDay=null;ctx.rerender();return}
 if(op==='calendar-view'){if(['week','month','agenda'].includes(id)){mode=id;weekOffset=0;focusDay=null;ctx.rerender()}return}
 if(op==='calendar-filter'){if(['all','watching','favorites'].includes(id)){scope=id;ctx.rerender()}return}
 if(op==='calendar-day'){if(/^\d{4}-\d{2}-\d{2}$/.test(id)){mode='agenda';focusDay=id;ctx.rerender()}return}
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
   const state=ctx.state();state.preferences=state.preferences||{};const prefs=state.preferences,old=prefs.calendarReminders&&typeof prefs.calendarReminders==='object'?prefs.calendarReminders:{};
   prefs.calendarReminders={...old};
   if(prefs.calendarReminders[id])delete prefs.calendarReminders[id];else prefs.calendarReminders[id]=30;
   ctx.save();ctx.toast(prefs.calendarReminders[id]?'Kujtesa u aktivizua ✓':'Kujtesa u hoq');ctx.rerender();return;
  }
 }
 if(op==='wrapped-month'){period='month';ctx.rerender();return}
 if(op==='wrapped-year'){period='year';ctx.rerender();return}
 if(op==='wrapped-copy'){copy();return}
 if(op==='wrapped-image'){image();return}
}
 return{calendar,wrapped,action};
};
