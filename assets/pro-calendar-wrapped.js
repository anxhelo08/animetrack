window.ATCalendarWrapped=function ATCalendarWrapped(ctx){
 let weekOffset=0,period='month';
 const esc=ctx.esc,D=86400000;
 function monday(date){const x=new Date(date.getFullYear(),date.getMonth(),date.getDate());x.setDate(x.getDate()-(x.getDay()+6)%7);return x}
 function calendar(){
  const first=monday(new Date());first.setDate(first.getDate()+weekOffset*7);
  const end=new Date(first);end.setDate(end.getDate()+7);
  const all=ctx.upcoming().filter(e=>e.when>=first.getTime()&&e.when<end.getTime());
  const columns=Array.from({length:7},(_,i)=>{const date=new Date(first);date.setDate(first.getDate()+i);const start=date.getTime(),end=start+D,events=all.filter(e=>e.when>=start&&e.when<end);return `<article class="pro-day ${date.toDateString()===new Date().toDateString()?'today':''}"><h4>${esc(date.toLocaleDateString('sq-AL',{weekday:'short',day:'numeric',month:'short'}))}</h4>${events.map(e=>`<button class="pro-event" data-pro-action="calendar-anime" data-id="${esc(e.animeId)}"><strong>${esc(e.title)}</strong><small>EP ${esc(e.episode)} · ${esc(new Date(e.when).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'}))}</small></button>`).join('')||'<p class="pro-muted">—</p>'}</article>`}).join('');
  return `<div class="pro-hero"><span class="pro-eyebrow">MY AIRING SCHEDULE</span><h2>📅 Kalendari personal</h2><p>Premierat e animeve nga biblioteka jote në orën lokale. Datë transmetimi, jo garanci e platformës streaming.</p></div><div class="pro-row" style="margin-bottom:15px"><div class="pro-actions"><button class="pro-btn" data-pro-action="week-prev">← Java</button><button class="pro-btn" data-pro-action="week-today">Sot</button><button class="pro-btn" data-pro-action="week-next">Java →</button></div><button class="pro-btn primary" data-pro-action="calendar-ics">↓ Eksporto .ics</button></div><div class="pro-calendar">${columns}</div><p class="pro-muted" style="margin-top:12px">Burimet: AniList/TVmaze. Orari mund të ndryshojë; rifresko te “Episode të reja”.</p>`;
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
  const now=Date.now(),events=ctx.upcoming().filter(e=>e.when>=now&&e.when<now+90*D);
  const stamp=t=>new Date(t).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const clean=s=>String(s||'').replace(/[\r\n,;\\]/g,' ');
  const body=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//AnimeTrack//Anime Schedule//SQ'];
  for(const e of events)body.push('BEGIN:VEVENT','UID:anime-'+clean(e.animeId)+'-'+e.episode+'@animetrack','DTSTAMP:'+stamp(now),'DTSTART:'+stamp(e.when),'DTEND:'+stamp(e.when+30*60000),'SUMMARY:'+clean(e.title+' · Episodi '+e.episode),'DESCRIPTION:Orari i transmetimit nga katalogu, mund të ndryshojë.','END:VEVENT');
  body.push('END:VCALENDAR');const blob=new Blob([body.join('\r\n')+'\r\n'],{type:'text/calendar;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='AnimeTrack-Calendar.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
 }
 function action(op,id){if(op==='week-prev')weekOffset--;if(op==='week-next')weekOffset++;if(op==='week-today')weekOffset=0;if(op.startsWith('week-'))ctx.rerender();if(op==='calendar-ics')ical();if(op==='calendar-anime')ctx.openAnime(id);if(op==='wrapped-month'){period='month';ctx.rerender()}if(op==='wrapped-year'){period='year';ctx.rerender()}if(op==='wrapped-copy')copy();if(op==='wrapped-image')image()}
 return{calendar,wrapped,action};
};
