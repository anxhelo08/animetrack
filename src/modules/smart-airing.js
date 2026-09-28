/* AnimeTrack 10.9 — personal airing calendar and per-episode reminders. */
window.ATSmartAiring=function ATSmartAiring(ctx){
 const D=86400000,esc=ctx.esc,LEADS=[0,10,30,60,1440];
 const p=()=>{const s=ctx.state();s.preferences=s.preferences||{};return s.preferences};
 const label=n=>n===0?'Në transmetim':n===1440?'1 ditë përpara':n+' min përpara';
 const eventKey=e=>[e.animeId,e.seasonId||'',e.episode,e.when].join(':');
 const allowed=n=>LEADS.includes(Number(n));
 const library=()=>ctx.state().anime||[];
 function events(windowDays=7,scope='following'){
  const now=Date.now(),byId=new Map(library().map(a=>[a.id,a])),seen=new Set();
  return (ctx.upcoming()||[]).filter(e=>{
   const a=byId.get(e.animeId),s=a?.seasons?.find(x=>x.id===e.seasonId),n=Number(e.seasonEpisode||e.episode),t=Number(e.when);
   if(!a||!Number.isInteger(n)||n<1||!Number.isFinite(t)||t<now-7*D||t>now+windowDays*D)return false;
   if(scope==='following'&&!['watching','planning'].includes(a.status)&&!a.favorite)return false;
   if(scope==='favorites'&&!a.favorite)return false;
   const key=eventKey(e);if(seen.has(key))return false;seen.add(key);
   if(s?.watched?.includes(n))return false;
   return true;
  }).sort((a,b)=>a.when-b.when);
 }
 function upcomingPersonal(days=7){return events(days,'following').filter(e=>e.when>=Date.now())}
 function summary(){
  const all=upcomingPersonal(7),now=Date.now(),day=new Date(),today=all.filter(e=>new Date(e.when).toDateString()===day.toDateString());
  const nearest=all[0],tomorrow=all.filter(e=>new Date(e.when).toDateString()===new Date(now+D).toDateString()).length;
  return {total:all.length,today:today.length,tomorrow,nearest,reminders:all.filter(e=>allowed(p().calendarReminders?.[eventKey(e)])).length};
 }
 function options(selected,disabled=false){
  return `<option value="off" ${selected==='off'?'selected':''}>Pa kujtesë</option>`+LEADS.map(n=>`<option value="${n}" ${String(selected)===String(n)?'selected':''}>${label(n)}</option>`).join('');
 }
 function reminderSelect(e){
  const selected=p().calendarReminders?.[eventKey(e)];
  return `<label class="at109-reminder-choice">🔔 <select data-smart-reminder="${esc(eventKey(e))}" aria-label="Kujtesa për ${esc(e.title)}">${options(selected===undefined?'off':selected)}</select></label>`;
 }
 function panel(compact=false){
  const data=summary(),all=upcomingPersonal(7),nearest=data.nearest;
  const items=all.slice(0,compact?2:5).map(e=>{
   const when=new Date(e.when),date=when.toLocaleDateString('sq-AL',{weekday:'short',day:'numeric',month:'short'}),time=when.toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'});
   return `<article class="at109-week-event"><span class="at109-week-date"><b>${esc(date)}</b><small>${esc(time)}</small></span><div><strong>${esc(e.title)}</strong><small>EP ${esc(e.episode)} · ${esc(e.season||'Sezoni')}</small></div><button type="button" data-pro-action="calendar-open" data-id="${esc(eventKey(e))}" aria-label="Hap detajet e ${esc(e.title)}">↗</button>${compact?'':reminderSelect(e)}</article>`;
  }).join('');
  return `<section class="at109-smart-week ${compact?'compact':''}" aria-label="Premierat personale të javës"><div class="at109-week-heading"><div><span class="at109-eyebrow">YOUR ANIME WEEK</span><h3>Kjo javë për ty ✦</h3><p>Vetëm anime që ndjek ose ke ruajtur në listë.</p></div><button type="button" data-pro-page="calendar">Hap kalendarin ↗</button></div><div class="at109-week-stats"><span><b>${data.total}</b> në 7 ditë</span><span><b>${data.today}</b> sot</span><span><b>${data.reminders}</b> kujtesa</span></div><div class="at109-week-list">${items||'<p class="at109-empty">Nuk ka episode të reja të konfirmuara këtë javë. Orari rifreskohet kur aplikacioni është aktiv.</p>'}</div>${compact?'':'<p class="at109-week-disclaimer">Orari i transmetimit mund të ndryshojë; ky është kalendari personal, jo disponueshmëri e garantuar në platforma.</p>'}</section>`;
 }
 function settings(push){
  const lead=allowed(p().reminderLead)?Number(p().reminderLead):30;
  return `<section class="at109-settings" aria-label="Cilësimet e kujtesave"><div><span class="at109-eyebrow">REMINDER SETTINGS</span><h3>🔔 Kujtesat e tua</h3><p>Zgjidh sa herët dëshiron të të kujtohet një episod. Mund ta ndryshosh veçmas për secilin episod.</p></div><label class="at109-default">Koha e parazgjedhur <select id="at109-default-lead" data-smart-default aria-label="Koha e parazgjedhur e kujtesës">${LEADS.map(n=>`<option value="${n}" ${lead===n?'selected':''}>${label(n)}</option>`).join('')}</select></label><div id="at109-push-settings">${push||'<p>Njoftimet jashtë aplikacionit kërkojnë aktivizim në server.</p>'}</div><small>Kujtesat brenda aplikacionit janë aktive edhe pa Web Push; për njoftime kur aplikacioni është i mbyllur duhet instalimi i PWA dhe shërbimi server-side.</small></section>`;
 }
 function full(base,push){
  return panel(false)+settings(push)+base;
 }
 function setReminder(key,value){
  const e=(ctx.upcoming()||[]).find(x=>eventKey(x)===key);if(!e||Number(e.when)<=Date.now())return false;
  const old=p().calendarReminders||{},next={...old};
  if(value==='off')delete next[key];else if(allowed(value))next[key]=Number(value);else return false;
  p().calendarReminders=next;
  if(!ctx.save()){p().calendarReminders=old;ctx.toast('Kujtesa nuk u ruajt.');return false}
  ctx.toast(value==='off'?'Kujtesa u hoq ✓':'Kujtesa: '+label(Number(value))+' ✓');
  ctx.rerender();return true;
 }
 function setDefault(value){
  if(!allowed(value))return false;const old=p().reminderLead;
  p().reminderLead=Number(value);if(!ctx.save()){p().reminderLead=old;return false}
  ctx.toast('Koha e parazgjedhur u ruajt ✓');ctx.rerender();return true;
 }
 function action(op,id){
  if(op==='smart-reminder-default')return setDefault(id);
  if(op==='smart-reminder')return setReminder(id,ctx.el('at109-reminder-change')?.value);
  return false;
 }
 return {eventKey,events,upcomingPersonal,summary,reminderSelect,panel,settings,full,setReminder,setDefault,action,LEADS};
};
