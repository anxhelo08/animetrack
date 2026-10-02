/* Legacy search API delegates to the shared command palette; connection notices are read-only. */
window.ATExperience112=function ATExperience112(ctx){
 const destinations=[
  ['home','⌂','Kryefaqja','Episodet dhe vazhdimi'],
  ['library','▤','Biblioteka ime','Të gjitha animet e mia'],
  ['calendar','▦','Kalendari','Transmetimet e ardhshme'],
  ['explore','⌕','Zbulo anime','Katalogu online'],
  ['collections','▣','Listat e mia','Koleksionet personale'],
  ['recommendations','✦','Për ty','Rekomandime personale'],
  ['friends','♧','Miqtë','Kërko dhe shto miq'],
  ['notifications','♧','Njoftimet','Aktiviteti i ri'],
  ['profile','◉','Profili im','Statistika dhe llogaria'],
  ['wrapped','◇','Anime Wrapped','Statistikat e vitit']
 ];
 let noticeTimer=null;
 const $=id=>document.getElementById(id);
 function data(query=''){
  const q=String(query).trim().toLocaleLowerCase();
  const pages=destinations.map(([id,icon,title,subtitle])=>({type:'page',id,icon,title,subtitle}));
  const anime=(ctx.state()?.anime||[]).filter(a=>a&&a.id&&a.title).map(a=>({type:'anime',id:String(a.id),icon:'▶',title:String(a.title),subtitle:({watching:'Po shikoj',completed:'Përfunduar',planning:'Në listë',paused:'Në pauzë',dropped:'E lënë'})[a.status]||'Nga biblioteka jote'}));
  if(!q)return [...pages.slice(0,7),...anime.filter(a=>a.subtitle==='Po shikoj').slice(0,5)];
  return [...pages,...anime].filter(item=>(item.title+' '+item.subtitle).toLocaleLowerCase().includes(q)).slice(0,25);
 }
 function show(){window.dispatchEvent(new CustomEvent('at-open-command'))}
 function close(){window.dispatchEvent(new CustomEvent('at-close-command'))}
 function onlineNotice(){const bar=$('at112-connection');if(!bar)return;const ok=navigator.onLine;bar.hidden=ok;window.ATHTML.renderHTML(bar,ok?'':'<span aria-hidden="true">◈</span><span><strong>Pa lidhje interneti</strong><small>Biblioteka lokale është e disponueshme; ndryshimet cloud presin lidhjen.</small></span><button type="button" data-at112-action="dismiss-offline" aria-label="Mbyll njoftimin">×</button>');}
 function init(){
  if(!$('at112-connection'))window.ATHTML.insertHTML(document.body,'beforeend','<div id="at112-connection" class="at112-connection" role="status" aria-live="polite" hidden></div>');
  $('at112-connection').addEventListener('click',event=>{if(event.target.closest('[data-at112-action="dismiss-offline"]'))$('at112-connection').hidden=true});
  window.addEventListener('offline',onlineNotice);
  window.addEventListener('online',()=>{onlineNotice();clearTimeout(noticeTimer);const bar=$('at112-connection');bar.hidden=false;window.ATHTML.renderHTML(bar,'<span aria-hidden="true">✓</span><span><strong>Lidhja u rikthye</strong><small>Kontrollo statusin e ruajtjes në cloud para se të mbyllësh aplikacionin.</small></span>');noticeTimer=setTimeout(()=>{if(navigator.onLine)bar.hidden=true},6000)});
  onlineNotice();
 }
 return {init,show,close,data,onlineNotice};
};
