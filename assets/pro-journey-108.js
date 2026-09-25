/* AnimeTrack 10.8 — non-destructive Franchise Hub and episode experience. */
window.ATJourney=function ATJourney(ctx){
 const esc=ctx.esc;
 let tab='episode';
 const all=()=>ctx.state().anime||[];
 const root=a=>ctx.root(a?.title||'');
 const seasonLabel=(s,i)=>s.format==='MOVIE'?'Filmi':s.format==='SPECIAL'?'Special':s.title||'Sezoni '+(i+1);
 function family(a){
  if(!a)return[];
  const key=root(a);
  if(!key||key.length<12)return[a];
  return all().filter(x=>x.id===a.id||(
   x.id!==a.id && ctx.seriesFormat(x.format) && ctx.seriesFormat(a.format) &&
   root(x)===key && (!!x.source||!!a.source)
  )).sort((x,y)=>(Number(x.year)||9999)-(Number(y.year)||9999)||String(x.createdAt||'').localeCompare(String(y.createdAt||'')));
 }
 function seasonTotals(a){
  return (a?.seasons||[]).reduce((sum,s)=>({seen:sum.seen+(s.watched||[]).length,available:sum.available+ctx.released(s)}),{seen:0,available:0});
 }
 function detail(a){
  if(!a)return'';
  const groups=family(a),totals=seasonTotals(a),multi=groups.length>1;
  const cards=groups.flatMap(item=>(item.seasons||[]).map((s,index)=>{
   const released=ctx.released(s),seen=(s.watched||[]).length,n=(s.watched||[]).length<released?Array.from({length:released},(_,j)=>j+1).find(ep=>!s.watched.includes(ep)):null;
   const selected=item.id===a.id&&ctx.activeSeason()===s.id;
   return `<article class="at108-season-tile ${selected?'selected':''}">
    <div class="at108-season-top"><span>${esc(seasonLabel(s,index))}</span><b>${released?Math.round(seen/released*100)+'%':'—'}</b></div>
    <strong>${esc(s.subtitle||item.title)}</strong>
    <div class="at108-season-progress"><span style="width:${released?Math.round(seen/released*100):0}%"></span></div>
    <small>${seen}/${released} episode${s.total>released?' · '+(s.total-released)+' në pritje':''}</small>
    <div class="at108-season-actions"><button type="button" data-journey-action="season" data-id="${esc(item.id)}" data-season="${esc(s.id)}">${item.id===a.id?'Hap sezonin':'Hap te seria'} ↗</button>${n?`<button type="button" data-journey-action="open-episode" data-id="${esc(item.id)}" data-season="${esc(s.id)}" data-ep="${n}">▶ EP ${n}</button>`:''}</div>
   </article>`;
  })).join('');
  return `<section class="at108-franchise" aria-label="Sezonet dhe vazhdimet e animes">
   <div class="at108-franchise-head"><div><span class="at108-kicker">FRANCHISE HUB</span><h4>${esc(multi?'E gjithë seria':'Sezonet e serisë')}</h4><p>${groups.length} ${groups.length===1?'titull':'tituj'} · ${totals.seen}/${totals.available} episode në këtë kartë</p></div>${multi?'<span class="at108-grouped">Tituj të lidhur · pa bashkim të të dhënave</span>':''}</div>
   <div class="at108-season-grid">${cards}</div>
   <p class="at108-franchise-foot">${multi?'Titujt e tjerë hapen veçmas. Progresi i secilit ruhet pa ndryshim.':'Zgjidh sezonin ose episodin ku dëshiron të vazhdosh.'}</p>
  </section>`;
 }
 function renderDetail(a){
  const box=ctx.el('detail-body');if(!box||!a)return;
  box.querySelector('.at108-franchise')?.remove();
  const target=box.querySelector('.seasons-topline');
  if(!target)return;
  target.insertAdjacentHTML('beforebegin',detail(a));
 }
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
  const id=button.dataset.id,seasonId=button.dataset.season,n=Number(button.dataset.ep);
  if(op==='tab'){setTab(button.dataset.tab);return true}
  if(op==='prev'||op==='next'){
   const parts=ctx.episodeParts(),target=adjacent(parts.a,parts.s,parts.n,op==='prev'?-1:1);
   if(target){onOpen();ctx.openEpisode(parts.a.id,target.season.id,target.n)}
   return true;
  }
  if(op==='open-episode'){
   const a=all().find(x=>x.id===id),s=a?.seasons?.find(x=>x.id===seasonId);
   if(s&&Number.isInteger(n)&&n>=1&&n<=ctx.released(s)){ctx.closeEpisode();onOpen();ctx.openEpisode(a.id,s.id,n)}
   return true;
  }
  if(op==='season'){
   const a=all().find(x=>x.id===id),s=a?.seasons?.find(x=>x.id===seasonId);
   if(a&&s){ctx.openSeason(a.id,s.id)}return true;
  }
  return false;
 }
 return{family,seasonTotals,detail,renderDetail,adjacent,renderEpisode,setTab,onOpen,action};
};
