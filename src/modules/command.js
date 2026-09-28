/* AnimeTrack 12.4 — local-first command search. No account data is uploaded. */
window.ATCommand124=function ATCommand124(ctx){
 const esc=ctx.esc,normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
 const pages=[['home','⌂','Kryefaqja','Vazhdo shikimin'],['library','▤','Biblioteka','Anime dhe seriale'],['explore','⌕','Katalogu online','Kërko anime dhe seriale'],['recommendations','✦','Rekomandime për ty','Zbulo histori të reja'],['calendar','◷','Kalendari','Premierat e javës'],['collections','▣','Listat e mia','Koleksionet'],['profile','◉','Profili im','Statistikat personale']];
 let root=null,input=null,list=null,items=[],selected=0,returnTo=null,open=false;
 const activeModals=()=>[...document.querySelectorAll('.modal-backdrop.show')].length;
 function index(value){const q=normalize(value),found=[];for(const [id,icon,label,desc] of pages){
  if(!q||normalize(label+' '+desc+' '+id).includes(q))found.push({kind:'page',id,icon,label,desc});
 }
 const anime=ctx.state().anime||[];
 for(const a of anime){
  if(!a?.id||!a?.title)continue;
  if(!q||normalize(a.title+' '+(a.genre||'')).includes(q)){
   const next=ctx.resume(a);found.push({kind:'anime',id:a.id,icon:'▶',label:a.title,desc:next?'Vazhdo: '+(a.seasons.find(s=>s.id===next.seasonId)?.title||'Sezoni')+' · EP '+next.episode:'Hap detajet'});
  }
  if(q.length>=2)for(const s of a.seasons||[]){
   let count=0;const num=a.seasons.indexOf(s)+1;
   for(const ep of s.episodes||[]){
    if(count>=3)break;
    const n=Number(ep.number),title=String(ep.title||'');
    if(!Number.isInteger(n)||n<1||n>ctx.released(s)||!title||!normalize(title+' '+a.title+' S'+num+' E'+n).includes(q))continue;
    found.push({kind:'episode',id:a.id,seasonId:s.id,n,icon:'▸',label:title,desc:a.title+' · S'+num+' E'+n});count++;
   }
  }
 }
 if(q.length>=2)found.push({kind:'online',id:q,icon:'↗',label:'Kërko “'+String(value).trim().slice(0,100)+'” në katalog',desc:'Rezultate online nga anime dhe seriale'});
 const unique=new Set();return found.filter(x=>{const k=[x.kind,x.id,x.seasonId||'',x.n||''].join('|');if(unique.has(k))return false;unique.add(k);return true}).slice(0,22);
 }
 function paint(){
  if(!root)return;
  items=index(input.value);selected=Math.min(selected,Math.max(0,items.length-1));
  const current=items;
  list.innerHTML=current.length?current.map((x,i)=>`<button type="button" id="at124-result-${i}" class="at124-result ${selected===i?'active':''}" data-at124-index="${i}" role="option" aria-selected="${selected===i}"><span class="at124-result-icon" aria-hidden="true">${x.icon}</span><span class="at124-result-copy"><strong>${esc(x.label)}</strong><small>${esc(x.desc||'')}</small></span><span class="at124-result-arrow" aria-hidden="true">↗</span></button>`).join(''):'<p class="at124-empty">Nuk u gjet rezultat. Provo një titull tjetër.</p>';
  input.setAttribute('aria-activedescendant',current.length?'at124-result-'+selected:'');
  const count=root.querySelector('.at124-count');if(count)count.textContent=current.length+' rezultate';
 }
 function hide(){if(!open)return;open=false;root.hidden=true;root.classList.remove('show');document.body.classList.remove('at124-command-open');if(returnTo?.isConnected&&typeof returnTo.focus==='function')returnTo.focus({preventScroll:true});}
 function show(){if(!root||activeModals())return;returnTo=document.activeElement;open=true;root.hidden=false;root.classList.add('show');document.body.classList.add('at124-command-open');input.value='';selected=0;paint();input.focus({preventScroll:true});}
 function run(i){const x=items[i];if(!x)return;hide();if(x.kind==='page')ctx.navigate(x.id);else if(x.kind==='anime')ctx.openAnime(x.id);else if(x.kind==='episode')ctx.openEpisode(x.id,x.seasonId,x.n);else if(x.kind==='online')ctx.online(x.id);}
 function mount(){
  if(root)return;
  root=document.createElement('div');root.id='at124-command';root.className='at124-command';root.hidden=true;
  root.innerHTML='<div class="at124-command-shade" data-at124-close="1"></div><section class="at124-command-panel" role="dialog" aria-modal="true" aria-label="Kërkim i shpejtë"><div class="at124-command-search"><span aria-hidden="true">⌕</span><input id="at124-command-input" type="search" maxlength="100" placeholder="Kërko anime, seriale, episode ose faqe…" autocomplete="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="at124-command-results"><button type="button" data-at124-close="1" aria-label="Mbyll kërkimin">×</button></div><div class="at124-command-results" id="at124-command-results" role="listbox" aria-label="Rezultatet e kërkimit"></div><footer class="at124-command-foot"><span class="at124-count"></span><span>↑ ↓ Zgjidh · Enter Hap · Esc Mbyll</span></footer></section>';
  document.body.append(root);input=root.querySelector('input');list=root.querySelector('#at124-command-results');
  const btn=document.createElement('button');btn.type='button';btn.className='at124-search-trigger';btn.dataset.at124Open='1';btn.setAttribute('aria-label','Kërkim i shpejtë, Control K');btn.innerHTML='<span aria-hidden="true">⌕</span><span>Kërko gjithçka</span><kbd>Ctrl K</kbd>';
  document.querySelector('.top-actions')?.prepend(btn);
  input.addEventListener('input',()=>{selected=0;paint()});
  root.addEventListener('click',e=>{if(e.target.closest('[data-at124-close]'))hide();const b=e.target.closest('[data-at124-index]');if(b)run(Number(b.dataset.at124Index))});
  // Capture escape before the application's existing modal key handler.
  document.addEventListener('keydown',e=>{
   const editable=e.target.closest?.('input,textarea,select,[contenteditable="true"]');
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();e.stopImmediatePropagation();open?hide():show();return}
   if(!open)return;
   if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();hide();return}
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();selected=Math.max(0,Math.min(items.length-1,selected+(e.key==='ArrowDown'?1:-1)));paint();list.querySelector('.active')?.scrollIntoView({block:'nearest'});return}
   if(e.key==='Enter'&&!e.isComposing){e.preventDefault();run(selected);return}
   if(e.key==='Tab'&&!editable){e.preventDefault();input.focus();return}
   if(e.key==='Tab'){const close=root.querySelector('[data-at124-close]:not(.at124-command-shade)');e.preventDefault();(document.activeElement===input&&!e.shiftKey?close:input).focus();return}
  },true);
  document.addEventListener('click',e=>{if(e.target.closest('[data-at124-open]'))show()});
 }
 return {mount,show,hide,index};
};
