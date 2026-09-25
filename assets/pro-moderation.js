window.ATModeration=function ATModeration(ctx){
 let enabled=false,reports=[];
 const esc=ctx.esc,client=()=>ctx.client(),user=()=>ctx.user();
 async function load(){
  enabled=false;reports=[];if(!user())return;
  const r=await client().from('anime_moderators').select('user_id').eq('user_id',user().id).maybeSingle();enabled=!!r.data;
  if(enabled)await refresh();
  ctx.el('pro-nav-moderation')?.classList.toggle('hidden',!enabled);
 }
 async function refresh(){
  if(!enabled)return;
  const r=await client().from('episode_comment_reports').select('id,comment_id,reason,status,created_at').eq('status','open').order('created_at',{ascending:false}).limit(50);
  if(r.error)throw r.error;reports=r.data||[];
  if(reports.length){
   const c=await client().from('episode_comments').select('id,body,author_name,episode_key,is_hidden').in('id',reports.map(x=>x.comment_id));
   const map=new Map((c.data||[]).map(x=>[x.id,x]));reports=reports.map(x=>({...x,comment:map.get(x.comment_id)||null}));
  }
 }
 function render(){
  if(!enabled)return '<div class="pro-empty">Kjo faqe kërkon leje moderatori.</div>';
  return `<div class="pro-hero"><span class="pro-eyebrow">COMMUNITY SAFETY</span><h2>🛡️ Moderimi</h2><p>Shqyrto raportimet dhe vendos nëse një koment duhet fshehur, rikthyer ose raportimi duhet mbyllur.</p></div><div class="pro-row" style="margin-bottom:13px"><strong>${reports.length} raportime të hapura</strong><button class="pro-btn" data-pro-action="mod-refresh">↻ Rifresko</button></div><div class="pro-list">${reports.map(r=>`<article class="pro-panel"><div class="pro-row"><b>Raportimi #${r.id}</b><small class="pro-muted">${esc(new Date(r.created_at).toLocaleString('sq-AL'))}</small></div><p class="pro-muted">Arsyeja: ${esc(r.reason)}</p><p>${esc(r.comment?.body||'Komenti nuk disponohet.')}</p><small class="pro-muted">${esc(r.comment?.episode_key||'')} · ${esc(r.comment?.author_name||'')}</small><div class="pro-actions" style="margin-top:10px"><button class="pro-btn primary" data-pro-action="mod-hide" data-id="${r.id}" data-comment="${r.comment_id}">Fshih</button><button class="pro-btn" data-pro-action="mod-restore" data-id="${r.id}" data-comment="${r.comment_id}">Rikthe</button><button class="pro-btn" data-pro-action="mod-dismiss" data-id="${r.id}">Mbyll raportimin</button></div></article>`).join('')||'<div class="pro-empty">Nuk ka raportime për shqyrtim.</div>'}</div>`;
 }
 async function action(op,id,comment){
  if(!enabled)return;
  if(op==='mod-refresh'){await refresh();ctx.rerender();return}
  if(!['mod-hide','mod-restore','mod-dismiss'].includes(op))return;
  if(op!=='mod-dismiss'){
   const result=await client().from('episode_comments').update({is_hidden:op==='mod-hide'}).eq('id',Number(comment));if(result.error)throw result.error;
  }
  const q=await client().from('episode_comment_reports').update({status:op==='mod-dismiss'?'dismissed':'reviewed',reviewed_at:new Date().toISOString(),reviewed_by:user().id}).eq('id',Number(id));
  if(q.error)throw q.error;await refresh();ctx.rerender();ctx.toast('Raportimi u përpunua ✓');
 }
 return{load,refresh,render,action,isModerator:()=>enabled};
};
