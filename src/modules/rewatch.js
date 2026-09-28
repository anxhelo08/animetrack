window.ATRewatch=function ATRewatch(ctx){
 const esc=ctx.esc,state=()=>ctx.state();
 const session=a=>(a.rewatches||[]).find(x=>x.id===a.activeRewatchId&&!x.completedAt);
 function next(a,sess){
  for(const season of a.seasons||[])for(let n=1;n<=ctx.released(season);n++)if(!(sess.episodes||[]).some(x=>x.seasonId===season.id&&x.number===n))return {season,n};
  return null;
 }
 function render(id){
  const a=state().anime.find(x=>x.id===id);if(!a)return'';
  const sessions=a.rewatches||[],active=session(a),done=active?.episodes?.length||0,available=(a.seasons||[]).reduce((n,s)=>n+ctx.released(s),0),nx=active?next(a,active):null;
  return `<section class="pro-rewatch"><div class="pro-row"><div><span class="pro-eyebrow">REWATCH MODE</span><h3>🔁 Shiko përsëri</h3><p class="pro-muted">Përparimi i shikimit të parë nuk fshihet. Çdo rishikim ruhet veçmas.</p></div>${active?'<span class="pro-tag">● Rishikim aktiv</span>':''}</div>${active?`<div class="pro-row"><b>${done} / ${available} episode</b>${ctx.button('Përfundo rishikimin','rewatch-finish',a.id)}</div><div class="pro-meter"><span style="width:${available?Math.min(100,Math.round(done/available*100)):0}%"></span></div>${nx?`<div class="pro-row" style="margin-top:11px"><small class="pro-muted">${esc(nx.season.title)} · Episodi ${nx.n}</small>${ctx.button('✓ Shëno episodin e rishikuar','rewatch-next',a.id)}</div>`:'<p class="pro-muted">Të gjithë episodet e transmetuara u rishikuan. Përfundo sesionin për ta arkivuar.</p>'}`:ctx.button('▶ Fillo një rishikim të ri','rewatch-start',a.id)}<div class="pro-muted" style="margin-top:10px">Sesione të regjistruara: ${sessions.length} · Episode të rishikuara: ${sessions.reduce((n,s)=>n+(s.episodes?.length||0),0)}</div></section>`;
 }
 function action(op,id){
  const a=state().anime.find(x=>x.id===id);if(!a)return;
  a.rewatches=a.rewatches||[];
  if(op==='rewatch-start'){
   if(session(a)){ctx.toast('Ke tashmë një rishikim aktiv.');return}
   const s={id:ctx.uuid(),startedAt:new Date().toISOString(),completedAt:'',episodes:[]};a.rewatches.push(s);a.activeRewatchId=s.id;
  }else if(op==='rewatch-next'){
   const s=session(a),nx=s&&next(a,s);if(!nx){ctx.toast('Nuk ka episode të tjera të transmetuara.');return}
   s.episodes.push({seasonId:nx.season.id,number:nx.n,date:new Date().toISOString()});
  }else if(op==='rewatch-finish'){
   const s=session(a);if(!s)return;s.completedAt=new Date().toISOString();a.activeRewatchId='';
  }
  a.updatedAt=new Date().toISOString();ctx.save();ctx.refreshDetail(a.id);ctx.toast('Rewatch u ruajt ✓');
 }
 return{render,action};
};
