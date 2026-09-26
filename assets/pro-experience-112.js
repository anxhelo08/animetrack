/* AnimeTrack 11.2 — keyboard-first desktop command center and resilient connection status.
   Presentation only: never modifies user data, auth, or library records. */
window.ATExperience112=function ATExperience112(ctx){
 const esc=ctx.esc;
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
 let open=false,selected=0,shown=[],previousFocus=null,noticeTimer=null;
 const $=id=>document.getElementById(id);
 const mobile=()=>matchMedia('(max-width:760px)').matches;
 const editable=e=>!!e.target?.closest?.('input,textarea,select,[contenteditable="true"]');
 function data(query=''){
  const q=String(query).trim().toLocaleLowerCase();
  const pages=destinations.map(([id,icon,title,subtitle])=>({type:'page',id,icon,title,subtitle}));
  const anime=(ctx.state()?.anime||[]).filter(a=>a&&a.id&&a.title).map(a=>({type:'anime',id:String(a.id),icon:'▶',title:String(a.title),subtitle:({watching:'Po shikoj',completed:'Përfunduar',planning:'Në listë',paused:'Në pauzë',dropped:'E lënë'})[a.status]||'Nga biblioteka jote'}));
  if(!q)return [...pages.slice(0,7),...anime.filter(a=>a.subtitle==='Po shikoj').slice(0,5)];
  return [...pages,...anime].filter(item=>(item.title+' '+item.subtitle).toLocaleLowerCase().includes(q)).slice(0,25);
 }
 function markup(){
  const q=$('at112-command-input')?.value||'';shown=data(q);selected=Math.min(selected,Math.max(0,shown.length-1));
  const list=$('at112-command-results');if(!list)return;
  list.innerHTML=shown.map((item,i)=>`<button type="button" role="option" id="at112-option-${i}" aria-selected="${i===selected}" data-at112-choice="${i}" class="at112-command-row ${i===selected?'active':''}"><span class="at112-command-icon" aria-hidden="true">${item.icon}</span><span class="at112-command-text"><strong>${esc(item.title)}</strong><small>${esc(item.subtitle)}</small></span><span class="at112-command-kind">${item.type==='anime'?'ANIME':'FAQE'}</span></button>`).join('')||'<div class="at112-no-match">Nuk ka rezultate në bibliotekën tënde. Provo një titull tjetër.</div>';
  $('at112-command-input')?.setAttribute('aria-activedescendant',shown.length?'at112-option-'+selected:'');
 }
 function choose(i){
  const item=shown[i];if(!item)return;
  close();if(item.type==='anime')ctx.openAnime(item.id);else ctx.navigate(item.id);
 }
 function show(){if(open||mobile())return;open=true;previousFocus=document.activeElement;const d=$('at112-command');if(!d)return;d.hidden=false;document.body.classList.add('at112-command-open');selected=0;$('at112-command-input').value='';markup();$('at112-command-input').focus();}
 function close(){if(!open)return;open=false;const d=$('at112-command');if(d)d.hidden=true;document.body.classList.remove('at112-command-open');if(previousFocus?.isConnected)previousFocus.focus?.({preventScroll:true});}
 function onlineNotice(){const bar=$('at112-connection');if(!bar)return;const ok=navigator.onLine;bar.hidden=ok;bar.innerHTML=ok?'':'<span aria-hidden="true">◈</span><span><strong>Pa lidhje interneti</strong><small>Biblioteka lokale është e disponueshme; ndryshimet cloud presin lidhjen.</small></span><button type="button" data-at112-action="dismiss-offline" aria-label="Mbyll njoftimin">×</button>';}
 function init(){
  if(!$('at112-command'))document.body.insertAdjacentHTML('beforeend','<section id="at112-command" class="at112-command-backdrop" hidden aria-label="Kërkim i shpejtë"><div class="at112-command-dialog" role="dialog" aria-modal="true" aria-labelledby="at112-command-label"><label id="at112-command-label" for="at112-command-input" class="at112-command-search"><span aria-hidden="true">⌕</span><input id="at112-command-input" type="search" autocomplete="off" spellcheck="false" placeholder="Kërko anime ose hap një seksion..." role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="at112-command-results"><kbd>ESC</kbd></label><div id="at112-command-results" class="at112-command-results" role="listbox"></div><footer class="at112-command-foot"><span>↑ ↓ Zgjidh</span><span>↵ Hap</span><span>Esc Mbyll</span></footer></div></section>');
  if(!$('at112-connection'))document.body.insertAdjacentHTML('beforeend','<div id="at112-connection" class="at112-connection" role="status" aria-live="polite" hidden></div>');
  const top=document.querySelector('.top-actions');if(top&&!$('at112-open-command'))top.insertAdjacentHTML('afterbegin','<button id="at112-open-command" type="button" class="at112-launch" data-at112-action="open" aria-keyshortcuts="Control+K Meta+K" title="Kërko anime dhe seksione (Ctrl/⌘ K)"><span aria-hidden="true">⌕</span><span>Kërko kudo</span><kbd>⌘ K</kbd></button>');
  document.addEventListener('keydown',e=>{
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open?close():show();return}
   if(!open){if(e.key==='/'&&!editable(e)&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&!mobile()){e.preventDefault();show()}return}
   if(e.key==='Escape'){e.preventDefault();close();return}
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(shown.length){selected=(selected+(e.key==='ArrowDown'?1:-1)+shown.length)%shown.length;markup();$('at112-option-'+selected)?.scrollIntoView?.({block:'nearest'})}return}
   if(e.key==='Enter'){e.preventDefault();choose(selected);return}
   // Keep focus inside the modal when tabbing from search to results and back.
   if(e.key==='Tab'){const nodes=Array.from($('at112-command').querySelectorAll('input,button')).filter(n=>!n.disabled);const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
  });
  document.addEventListener('input',e=>{if(e.target?.id==='at112-command-input'){selected=0;markup()}});
  document.addEventListener('click',e=>{
   const b=e.target.closest?.('[data-at112-action],[data-at112-choice]');if(b?.dataset.at112Action==='open'){show();return}
   if(b?.dataset.at112Action==='dismiss-offline'){$('at112-connection').hidden=true;return}
   if(b?.dataset.at112Choice!==undefined){choose(Number(b.dataset.at112Choice));return}
   if(e.target?.id==='at112-command')close();
  });
  window.addEventListener('offline',onlineNotice);
  window.addEventListener('online',()=>{onlineNotice();clearTimeout(noticeTimer);const bar=$('at112-connection');bar.hidden=false;bar.innerHTML='<span aria-hidden="true">✓</span><span><strong>Lidhja u rikthye</strong><small>Kontrollo statusin e ruajtjes në cloud para se të mbyllësh aplikacionin.</small></span>';noticeTimer=setTimeout(()=>{if(navigator.onLine)bar.hidden=true},6000)});
  onlineNotice();
 }
 return {init,show,close,data,onlineNotice};
};
