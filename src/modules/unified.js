/* AnimeTrack 12.15: Anime, TV and Movies are first-class entries in the same library. */
window.ATUnified119=(()=>{
 let media='all',owner='',last=null,installed=false;
 const $=id=>document.getElementById(id);
 const isTV=a=>window.ATTVUnified120?.isTV(a);
 const isMovie=a=>['TMDB','OMDb'].includes(String(a?.source||''))&&String(a?.format||'').toUpperCase()==='MOVIE';
 const seen=a=>(a.seasons||[]).reduce((n,s)=>n+(s.watched||[]).length,0);
 const total=a=>(a.seasons||[]).reduce((n,s)=>n+(Number(s.total)||0),0);
 const percent=a=>total(a)?Math.round(seen(a)/total(a)*100):0;
 const waiting=a=>a.status==='completed'&&(a.seasons||[]).some(s=>s.releaseStatus==='NOT_YET_RELEASED'||(s.episodes||[]).some(e=>e.airedAt&&Date.parse(e.airedAt)>Date.now()));
 function render(state,opts={}){
  const grid=$('anime-grid');if(!grid)return;last={state,opts};
  const uid=opts.owner||'guest';if(uid!==owner){owner=uid;media='all'}
  const all=state.anime||[],movies=all.filter(isMovie),tv=all.filter(a=>isTV(a)&&!isMovie(a)),anime=all.filter(a=>!isTV(a)&&!isMovie(a));
  grid.querySelectorAll('.anime-card').forEach(node=>{
   const kind=node.dataset.media||'anime';
   node.hidden=media!=='all'&&media!==kind;
  });
  const visible=[...grid.querySelectorAll('.anime-card')].filter(n=>!n.hidden);
  grid.querySelectorAll('.empty').forEach(n=>{n.hidden=visible.length>0});
  if(!visible.length&&!grid.querySelector('.empty'))window.ATHTML.insertHTML(grid,'beforeend','<div class="empty"><div class="symbol">✦</div><h3>Nuk ka tituj në këtë filtër</h3><p>Ndrysho filtrin ose kërko një anime apo serial.</p><button type="button" class="primary" data-at119-add-tv>+ Shto titull</button></div>');
  const counts={all:all.length,anime:anime.length,tv:tv.length,movie:movies.length,watching:all.filter(a=>a.status==='watching').length,completed:all.filter(a=>a.status==='completed').length,planning:all.filter(a=>a.status==='planning').length,paused:all.filter(a=>a.status==='paused').length,dropped:all.filter(a=>a.status==='dropped').length,waiting:all.filter(waiting).length};
  document.querySelectorAll('[data-media-filter]').forEach(b=>{const on=b.dataset.mediaFilter===media;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));b.querySelector('[data-at119-count]')?.replaceChildren(document.createTextNode(String(counts[b.dataset.mediaFilter]||0)))});
  const sub=$('library-subtitle');if(sub)sub.textContent=(opts.total??visible.length)+' tituj · '+(media==='all'?'Anime · Seriale TV · Filma':media==='anime'?'Anime':media==='tv'?'Seriale TV':'Filma');
  for(const [id,key] of [['stat-total','all'],['stat-watching','watching'],['stat-completed','completed']])if($(id))$(id).textContent=String(counts[key]);
  document.querySelectorAll('#library-status-strip [data-filter]').forEach(b=>{const n=b.querySelector('.tiny-count');if(n&&b.dataset.filter in counts)n.textContent=String(b.dataset.filter==='all'?all.filter(a=>a.status!=='planning').length:counts[b.dataset.filter])});
  const title=$('library-title');if(title)title.textContent=opts.filter==='waiting'?'Në pritje të sezonit të ri':opts.filter==='watching'?'Po shikoj':opts.filter==='completed'?'Të përfunduara':opts.filter==='planning'?'Plan to Watch':opts.filter==='paused'?'Në pauzë':opts.filter==='dropped'?'Të lëna':'Biblioteka ime';
  const head=$('at113-library-head');if(head){
   head.querySelector('[data-at113-count="all"]')?.replaceChildren(document.createTextNode(String(counts.all)));
   head.querySelector('[data-at113-count="watching"]')?.replaceChildren(document.createTextNode(String(counts.watching)));
   head.querySelector('[data-at113-count="completed"]')?.replaceChildren(document.createTextNode(String(counts.completed)));
   head.querySelector('.at113-library-title h2')?.replaceChildren(document.createTextNode(title?.textContent||'Biblioteka ime'));
   head.querySelector('.at113-library-title>span')?.replaceChildren(document.createTextNode('ANIME + TV + MOVIES · LIBRARY'));
  }
 }
 function mount(){if(installed)return;installed=true;document.addEventListener('click',e=>{const b=e.target.closest('[data-media-filter]');if(!b)return;media=b.dataset.mediaFilter;if(last)window.dispatchEvent(new CustomEvent('at119-library-filter',{detail:media}))})}
 return {render,mount,selection:()=>media,seen,total,percent};
})();