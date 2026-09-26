/* AnimeTrack 11.3 — mobile-only presentation enhancements. No library or account state is stored here. */
window.ATMobile113=(function(){
 const $=id=>document.getElementById(id);
 const phone=()=>window.matchMedia('(max-width:760px)').matches;
 let libraryQuery='';
 let signupMode=false;
 function signupReady(){return signupMode}
 function signup(on){
  signupMode=!!on;
  const extra=$('at113-signup-fields'),confirm=$('at113-confirm-password'),password=$('account-password'),submit=$('account-login');
  if(!extra||!confirm||!password||!submit)return;
  extra.hidden=!on;confirm.required=!!on;confirm.disabled=!on;
  $('at116-name-field').hidden=!on;
  $('account-register').hidden=!!on;$('at116-back-login').hidden=!on;$('account-reset').hidden=!!on;
  password.autocomplete=on?'new-password':'current-password';password.minLength=on?10:0;
  submit.textContent=on?'✓ Krijo llogarinë':'Hyr në llogari';
  for(const mode of ['login','signup']){const tab=$('at116-tab-'+mode),active=on=== (mode==='signup');tab.classList.toggle('active',active);tab.setAttribute('aria-pressed',String(active));}
  const status=$('account-status');if(status){status.textContent=on?'Plotëso emrin, emailin dhe dy fjalëkalimet; më pas shtyp “Krijo llogarinë”.':'Hyr me emailin dhe fjalëkalimin tënd.';status.dataset.error='0';status.dataset.ok='0';}
 }
 function authControls(){
  document.addEventListener('click',e=>{
   const b=e.target.closest('button');if(!b)return;
   if(['account-register','at116-tab-signup'].includes(b.id)){e.preventDefault();signup(true);return}
   if(['at116-tab-login','at116-back-login','at116-pending-login'].includes(b.id)){e.preventDefault();signup(false);return}
   if(b.id==='at113-password-toggle'){
    e.preventDefault();const password=$('account-password'),btn=$('at113-password-toggle');const reveal=password.type==='password';password.type=reveal?'text':'password';btn.setAttribute('aria-pressed',String(reveal));btn.setAttribute('aria-label',reveal?'Fshih fjalëkalimin':'Shfaq fjalëkalimin');btn.textContent=reveal?'◌':'◉';
   }
  });
  signup(false);
 }

 function enhanceEpisode(){
  const body=$('ep-detail-body');if(!body)return;
  const hero=body.querySelector('.ep-detail-visual'),name=body.querySelector('.ep-detail-name'),meta=body.querySelector('.ep-meta-row'),eyebrow=body.querySelector(':scope > .eyebrow');
  if(!hero||!name||!meta||body.querySelector('.at113-episode-feature'))return;
  const feature=document.createElement('section');feature.className='at113-episode-feature';
  const copy=document.createElement('div');copy.className='at113-episode-copy';
  copy.append(eyebrow||document.createElement('span'),name,meta);
  feature.append(hero,copy);
  const tabs=body.querySelector('.at108-episode-tabs');tabs?.after(feature);
  const mark=body.querySelector('[data-episode-mark]');if(mark){mark.classList.add('at113-mark-button');mark.setAttribute('aria-label','Ndrysho statusin e episodit');}
 }
 function mountLibrary(){
  const view=$('library-view'),strip=$('library-status-strip');if(!view||!strip||$('at113-library-head'))return;
  strip.insertAdjacentHTML('beforebegin',`<section id="at113-library-head" class="at113-library-head" aria-label="Përmbledhja e bibliotekës"><div class="at113-library-title"><span>ANIME UNIVERSE · LIBRARY</span><h2>Biblioteka ime</h2><p>Progresi yt, i organizuar në një vend.</p></div><div class="at113-library-metrics"><span><b data-at113-count="all">0</b> anime</span><span><b data-at113-count="watching">0</b> në progres</span><span><b data-at113-count="completed">0</b> përfunduar</span></div><label class="at113-library-search" for="at113-library-search"><span aria-hidden="true">⌕</span><input id="at113-library-search" type="search" inputmode="search" autocomplete="off" placeholder="Kërko në bibliotekën tënde…" aria-label="Kërko në bibliotekë"><span class="at113-search-help" aria-hidden="true">⌕</span></label></section>`);
  document.querySelector('#at113-library-search')?.addEventListener('input',e=>{libraryQuery=String(e.target.value||'').slice(0,100);window.dispatchEvent(new CustomEvent('at113-library-search',{detail:libraryQuery}));});
  document.querySelector('#at113-library-search')?.addEventListener('search',e=>{libraryQuery=e.target.value;window.dispatchEvent(new CustomEvent('at113-library-search',{detail:libraryQuery}));});
 }
 function libraryUpdate(){
  const el=$('at113-library-head');if(!el)return;
  const items=window.ATMobile113?.state?.()?.anime||[];
  for(const [type,num] of Object.entries({all:items.length,watching:items.filter(a=>a.status==='watching').length,completed:items.filter(a=>a.status==='completed').length})){
   const target=el.querySelector(`[data-at113-count="${type}"]`);if(target)target.textContent=String(num);
  }
  const field=$('at113-library-search');if(field&&document.activeElement!==field&&field.value!==libraryQuery)field.value=libraryQuery;
  const title=el.querySelector('h2'),legacy=$('library-title');if(title&&legacy)title.textContent=legacy.textContent;
 }
 function init(){mountLibrary();libraryUpdate();authControls();}
 return {init,enhanceEpisode,libraryUpdate,phone,signupReady,signup,state:null};
})();
