/* AnimeTrack 11.0 — Episode Hub only; no Franchise Hub or inferred linked titles. */
window.ATJourney=function ATJourney(ctx){
 const esc=ctx.esc;
 let tab='episode';
 const seasonLabel=(s,i)=>s.format==='MOVIE'?'Filmi':s.format==='SPECIAL'?'Special':s.title||'Sezoni '+(i+1);
 // Episode navigation only. Series use the native season tabs in anime detail.
 function adjacent(a,s,n,step){
  const seasons=a?.seasons||[],index=seasons.findIndex(x=>x.id===s?.id);
  if(index<0||![1,-1].includes(step))return null;
  const within=n+step,total=ctx.released(s);
  if(within>=1&&within<=total)return{season:s,n:within};
  for(let i=index+step;i>=0&&i<seasons.length;i+=step){
   const available=ctx.released(seasons[i]);if(available)return{season:seasons[i],n:step===1?1:available};
  }
  return null;
 }
 function renderEpisode({a,s,n,ep}){
  const box=ctx.el('ep-detail-body');if(!box||!a||!s)return;
  box.querySelector('.at108-episode-head')?.remove();
  box.querySelector('.at108-episode-tabs')?.remove();
  const prev=adjacent(a,s,n,-1),next=adjacent(a,s,n,1),seasonNumber=a.seasons.indexOf(s)+1,seen=s.watched.includes(n);
  const count=box.querySelector('.v98-comment-count')?.textContent||'0';
  const total=ctx.released(s),status=seen?'✓ I parë':'○ I paparë';
  const nav=(target,dir)=>target?`<button type="button" data-journey-action="${dir}" aria-label="${dir==='prev'?'Episodi i mëparshëm':'Episodi i radhës'}"> ${dir==='prev'?'←':'▶'} S${a.seasons.indexOf(target.season)+1} · EP ${target.n}${dir==='prev'?'':' →'}</button>`:`<span class="at108-no-episode">${dir==='prev'?'Fillimi i serisë':'Nuk ka episod tjetër të transmetuar'}</span>`;
  box.insertAdjacentHTML('afterbegin',`<div class="at108-episode-head"><div class="at108-episode-summary"><span class="at108-kicker">EPISODE HUB · ${esc(seasonLabel(s,seasonNumber-1))}</span><div><strong>S${seasonNumber} · EP ${n}</strong><span class="${seen?'seen':''}">${status}</span></div><small>${n}/${total} episode të transmetuara · ${esc(a.title)}</small></div><div class="at108-episode-switch">${nav(prev,'prev')}${nav(next,'next')}</div></div>
   <div class="at108-episode-tabs" role="group" aria-label="Pamja e episodit"><button type="button" data-journey-action="tab" data-tab="episode" aria-pressed="${tab==='episode'}" class="${tab==='episode'?'active':''}">✦ Episodi</button><button type="button" data-journey-action="tab" data-tab="discussion" aria-pressed="${tab==='discussion'}" class="${tab==='discussion'?'active':''}">💬 Diskutimi <span>${esc(count)}</span></button></div>`);
  box.dataset.at108Tab=tab;
 }
 function setTab(next){
  if(!['episode','discussion'].includes(next))return;
  tab=next;const box=ctx.el('ep-detail-body');if(!box)return;
  box.dataset.at108Tab=tab;
  box.querySelectorAll('[data-journey-action="tab"]').forEach(button=>{
   const active=button.dataset.tab===tab;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
  });
 }
 function onOpen(){tab='episode'}
 function action(button){
  const op=button?.dataset.journeyAction;if(!op)return false;
  if(op==='tab'){setTab(button.dataset.tab);return true}
  if(op==='prev'||op==='next'){
   const parts=ctx.episodeParts(),target=adjacent(parts.a,parts.s,parts.n,op==='prev'?-1:1);
   if(target){onOpen();ctx.openEpisode(parts.a.id,target.season.id,target.n)}
   return true;
  }
  return false;
 }
 return{adjacent,renderEpisode,setTab,onOpen,action};
};
