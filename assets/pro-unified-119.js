/* AnimeTrack 11.9 — one library for anime and TV; no data migration or duplicate progress. */
window.ATUnified119=(()=>{
 let media='all',owner='',last=null,installed=false;
 const $=id=>document.getElementById(id);
 const safe=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const seen=s=>(s.seasons||[]).reduce((n,x)=>n+(x.episodes||[]).filter(e=>(s.watched||[]).includes(e.id)).length,0);
 const total=s=>(s.seasons||[]).reduce((n,x)=>n+(x.episodes||[]).length,0);
 const percent=s=>total(s)?Math.round(seen(s)/total(s)*100):0;
 const waitingTV=s=>s.status==='completed'&&(/running|to be determined|in development/i.test(String(s.showStatus||''))||(s.seasons||[]).some(se=>se.episodes?.some(e=>e.airdate&&Date.parse(e.airdate+'T00:00:00')>Date.now())));
 const dexter=s=>['Dexter','Dexter: New Blood','Dexter: Original Sin','Dexter: Resurrection'].includes(s.title);
 const image=s=>{const url=s.image||'';return /^https?:\/\//.test(url)?'<img src="'+safe(url)+'" alt="Posteri i '+safe(s.title)+'" loading="lazy" referrerpolicy="no-referrer">':'<span class="at119-poster-empty">▣</span>'};
 function card(s){const n=seen(s),t=total(s),p=percent(s);return '<article class="anime-card at119-tv-card" data-at119-tv="'+safe(s.id)+'" data-status="'+safe(s.status)+'"><button type="button" class="at119-poster-button" data-tv-action="detail" data-id="'+safe(s.id)+'">'+image(s)+'</button><div class="status-badge">'+safe(({watching:'Po shikoj',completed:'Përfunduar',planning:'Në listë',paused:'Në pauzë',dropped:'E lënë'})[s.status]||'Në listë')+'</div><span class="at119-media-badge">SERIAL TV</span><div class="card-info"><button type="button" class="at119-title" data-tv-action="detail" data-id="'+safe(s.id)+'">'+safe(s.title)+' ›</button><div class="card-row"><span>'+n+'/'+t+' ep.</span><div class="progress"><span style="width:'+p+'%"></span></div><span>'+p+'%</span></div><div class="card-actions"><button type="button" class="ghost" data-tv-action="detail" data-id="'+safe(s.id)+'">Sezonet & episodet</button><button type="button" class="plus" data-tv-action="resume" data-id="'+safe(s.id)+'" aria-label="Vazhdo '+safe(s.title)+'">▶</button></div></div></article>'}
 function franchise(items){const n=items.reduce((v,s)=>v+seen(s),0),t=items.reduce((v,s)=>v+total(s),0);return '<article class="anime-card at119-tv-card at119-franchise" data-at119-tv="dexter"><button type="button" class="at119-poster-button" data-tv-action="franchise">'+image(items[0])+'</button><span class="at119-media-badge">UNIVERSI TV</span><div class="card-info"><button type="button" class="at119-title" data-tv-action="franchise">Dexter · '+items.length+' seriale ›</button><div class="card-row"><span>'+n+'/'+t+' ep.</span><div class="progress"><span style="width:'+(t?Math.round(n/t*100):0)+'%"></span></div></div><div class="card-actions"><button type="button" class="ghost" data-tv-action="franchise">Të gjitha sezonet ›</button></div></div></article>'}
 function render(state,opts={}){
  const grid=$('anime-grid');if(!grid)return;last={state,opts};
  const id=opts.owner||'guest';if(id!==owner){owner=id;media='all'}
  const anime=Array.isArray(state.anime)?state.anime:[],tv=Array.isArray(state.tvShows)?state.tvShows:[];
  const search=String(opts.search||'').toLocaleLowerCase(),filter=opts.filter||'all',genre=opts.genre||'all',sort=opts.sort||'updated';
  const matching=tv.filter(s=>(filter==='all'||(filter==='genres'?(genre==='all'||(s.genres||[]).some(g=>g.toLocaleLowerCase()===genre)):filter==='waiting'?waitingTV(s):['favorites','movies'].includes(filter)?false:s.status===filter))&&String(s.title||'').toLocaleLowerCase().includes(search));
  const groups=new Map();for(const s of matching){const key=dexter(s)?'dexter':s.id;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s)}
  if(media!=='anime'){grid.insertAdjacentHTML('beforeend',[...groups].map(([key,items])=>key==='dexter'&&items.length>1?franchise(items):items.map(card).join('')).join(''))}
  if(media==='tv')grid.querySelectorAll('.anime-card:not(.at119-tv-card)').forEach(node=>node.remove());
  if(media!=='anime'&&matching.length)grid.querySelectorAll('.empty').forEach(node=>node.remove());
  const lookup=new Map(anime.map(s=>[String(s.id),s]));
  const tvLookup=new Map(tv.map(s=>[String(s.id),s]));
  const cards=[...grid.querySelectorAll('.anime-card')];
  const data=node=>{const key=node.getAttribute('data-at119-tv');if(key==='dexter'){const items=groups.get('dexter')||[];return {title:'Dexter',updatedAt:items.reduce((m,s)=>String(s.updatedAt||'')>m?String(s.updatedAt):m,''),rating:items[0]?.rating||0,progress:items.reduce((n,s)=>n+seen(s),0)/Math.max(1,items.reduce((n,s)=>n+total(s),0))}}if(key){const s=tvLookup.get(key);return {title:s?.title||'',updatedAt:s?.updatedAt||'',rating:s?.rating||0,progress:percent(s||{})}}const s=lookup.get(node.querySelector('[data-detail]')?.dataset.detail||'');return {title:s?.title||'',updatedAt:s?.updatedAt||'',rating:s?.rating||0,progress:(s?.seasons||[]).reduce((n,x)=>n+(x.watched||[]).length,0)/Math.max(1,(s?.seasons||[]).reduce((n,x)=>n+(Number(x.total)||0),0))}};
  cards.sort((a,b)=>{const x=data(a),y=data(b);return sort==='title'?x.title.localeCompare(y.title):sort==='progress'?y.progress-x.progress:sort==='rating'?y.rating-x.rating:String(y.updatedAt).localeCompare(String(x.updatedAt))});
  for(const node of cards)grid.appendChild(node);
  const any=cards.length>0;
  if(!any){grid.innerHTML='<div class="empty"><div class="symbol">✦</div><h3>Nuk ka tituj në këtë filtër</h3><p>Ndrysho filtrin ose shto një anime apo serial TV.</p><button type="button" class="primary" data-at119-add-tv>+ Shto serial TV</button></div>'}
  const counts={all:anime.length+tv.length,anime:anime.length,tv:tv.length,watching:anime.filter(s=>s.status==='watching').length+tv.filter(s=>s.status==='watching').length,completed:anime.filter(s=>s.status==='completed').length+tv.filter(s=>s.status==='completed').length,planning:anime.filter(s=>s.status==='planning').length+tv.filter(s=>s.status==='planning').length,paused:anime.filter(s=>s.status==='paused').length+tv.filter(s=>s.status==='paused').length,dropped:anime.filter(s=>s.status==='dropped').length+tv.filter(s=>s.status==='dropped').length,waiting:anime.filter(s=>(s.seasons||[]).some(x=>x.nextAiringAt&&Date.parse(x.nextAiringAt)>Date.now())).length+tv.filter(waitingTV).length};
  document.querySelectorAll('[data-media-filter]').forEach(b=>{const on=b.dataset.mediaFilter===media;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));b.querySelector('[data-at119-count]')?.replaceChildren(document.createTextNode(String(counts[b.dataset.mediaFilter]||0)))});
  const subtitle=$('library-subtitle');if(subtitle)subtitle.textContent=cards.length+' tituj · '+(media==='all'?'Anime & seriale TV':media==='anime'?'Anime':'Seriale TV');
  const all=$('stat-total');if(all)all.textContent=String(counts.all);
  if($('stat-watching'))$('stat-watching').textContent=String(counts.watching);
  if($('stat-completed'))$('stat-completed').textContent=String(counts.completed);
  const title=$('library-title');if(title)title.textContent='Biblioteka ime';
  document.querySelectorAll('#library-status-strip [data-filter]').forEach(b=>{const key=b.dataset.filter;if(key in counts){const n=b.querySelector('.tiny-count');if(n)n.textContent=String(counts[key])}});
  const heading=$('at113-library-head');if(heading){heading.querySelector('[data-at113-count="all"]')?.replaceChildren(document.createTextNode(String(counts.all)));heading.querySelector('[data-at113-count="watching"]')?.replaceChildren(document.createTextNode(String(counts.watching)));heading.querySelector('[data-at113-count="completed"]')?.replaceChildren(document.createTextNode(String(counts.completed)));heading.querySelector('.at113-library-title h2')?.replaceChildren(document.createTextNode('Biblioteka ime'));heading.querySelector('.at113-library-title>span')?.replaceChildren(document.createTextNode('ANIME + TV · LIBRARY'));heading.querySelector('.at113-library-metrics>span')?.lastChild?.nodeType;}
  const week=$('stat-episodes');if(week)week.textContent=(anime.reduce((n,s)=>n+(s.seasons||[]).reduce((m,x)=>m+(x.watched||[]).length,0),0)+tv.reduce((n,s)=>n+seen(s),0)).toLocaleString('sq-AL');
 }
 function mount(){if(installed)return;installed=true;document.addEventListener('click',e=>{const b=e.target.closest('[data-media-filter]');if(!b)return;media=b.dataset.mediaFilter;if(last){const {state,opts}=last;window.dispatchEvent(new CustomEvent('at119-library-filter',{detail:media}))}})}
 function selection(){return media}
 return {render,mount,selection,seen,total,percent};
})();