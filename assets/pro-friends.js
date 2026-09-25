window.ATFriends=function ATFriends(ctx,profiles){
 let friends=[],people=[],comparison=null;
 const esc=ctx.esc,client=()=>ctx.client(),user=()=>ctx.user();
 const display=p=>p?.display_name||p?.handle||'Anime fan';
 const row=(p,actions='')=>`<div class="pro-item"><span class="pro-profile-icon">${ctx.poster(p.avatar_url)?`<img src="${esc(ctx.poster(p.avatar_url))}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:16px">`:esc(p.avatar_emoji||'🎌')}</span><div><strong>${esc(display(p))}</strong><small>@${esc(p.handle||'privat')} · ${p.is_public?'Publik':'Privat'}</small></div><div class="pro-actions">${actions}</div></div>`;
 async function load(){
  if(!user()){friends=[];people=[];return}
  const u=user().id;
  const f=await client().from('anime_friendships').select('id,requester_id,recipient_id,status,created_at').or('requester_id.eq.'+u+',recipient_id.eq.'+u);
  if(f.error)throw f.error;friends=f.data||[];
  const ids=[...new Set(friends.map(x=>x.requester_id===u?x.recipient_id:x.requester_id))];
  people=[];if(ids.length){const p=await client().from('anime_profiles').select('user_id,handle,display_name,bio,avatar_emoji,avatar_url,is_public,snapshot').in('user_id',ids);if(p.error)throw p.error;people=p.data||[]}
 }
 function findName(id){return people.find(p=>p.user_id===id)||{user_id:id,display_name:'Profil i paarritshëm'}}
 function render(){
  if(!user())return '<div class="pro-empty">Hyr në llogari për të shtuar miq.</div>';
  const pending=friends.filter(f=>f.recipient_id===user().id&&f.status==='pending'),accepted=friends.filter(f=>f.status==='accepted');
  return `<div class="pro-hero"><span class="pro-eyebrow">ANIME SOCIAL</span><h2>👥 Miqtë & Compare</h2><p>Kërko profile publike, dërgo kërkesë dhe krahaso anime vetëm pas pranimit.</p></div><section class="pro-panel"><h3>Gjej një mik</h3><div class="pro-row"><input class="pro-input" id="pro-friend-query" style="flex:1" placeholder="Username publik"><button class="pro-btn primary" data-pro-action="friend-find">Kërko</button></div><div id="pro-find-results" class="pro-list" style="margin-top:12px"></div></section><section class="pro-panel"><h3>📩 Kërkesat (${pending.length})</h3><div class="pro-list">${pending.map(f=>row(findName(f.requester_id),`<button class="pro-btn primary" data-pro-action="friend-accept" data-id="${f.id}">Prano</button><button class="pro-btn" data-pro-action="friend-decline" data-id="${f.id}">Refuzo</button>`)).join('')||'<div class="pro-empty">Nuk ka kërkesa.</div>'}</div></section><section class="pro-panel"><h3>🤝 Miqtë (${accepted.length})</h3><div class="pro-list">${accepted.map(f=>{const other=f.requester_id===user().id?f.recipient_id:f.requester_id;return row(findName(other),`<button class="pro-btn primary" data-pro-action="friend-compare" data-id="${other}">Krahaso</button><button class="pro-btn" data-pro-action="friend-remove" data-id="${f.id}">Hiq</button>`)}).join('')||'<div class="pro-empty">Nuk ke miq të pranuar ende.</div>'}</div></section><div id="pro-comparison">${comparison||''}</div>`;
 }
 async function find(){
  const q=String(ctx.el('pro-friend-query')?.value||'').trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
  if(q.length<2){ctx.toast('Shkruaj të paktën 2 karaktere.');return}
  const r=await client().from('anime_profiles').select('user_id,handle,display_name,avatar_emoji,avatar_url,is_public').eq('is_public',true).ilike('handle',q+'%').limit(12);
  if(r.error)throw r.error;const list=(r.data||[]).filter(p=>p.user_id!==user().id),slot=ctx.el('pro-find-results');
  slot.innerHTML=list.map(p=>row(p,`<button class="pro-btn primary" data-pro-action="friend-add" data-id="${p.user_id}">Shto mik</button>`)).join('')||'<div class="pro-empty">Nuk u gjet profil publik.</div>';
 }
 async function send(id){
  if(!user()||id===user().id)return;
  const r=await client().from('anime_friendships').insert({requester_id:user().id,recipient_id:id,status:'pending'});
  if(r.error)throw r.error;ctx.toast('Kërkesa u dërgua ✓');await load();ctx.rerender();
 }
 async function respond(id,status){
  const r=await client().from('anime_friendships').update({status,updated_at:new Date().toISOString()}).eq('id',Number(id)).eq('recipient_id',user().id);
  if(r.error)throw r.error;await load();ctx.rerender();
 }
 async function remove(id){
  if(!confirm('Ta heqim këtë mik?'))return;
  const r=await client().from('anime_friendships').delete().eq('id',Number(id));if(r.error)throw r.error;
  await load();ctx.rerender();
 }
 async function compare(id){
  const r=await client().from('anime_profiles').select('user_id,handle,display_name,snapshot,is_public').eq('user_id',id).maybeSingle();
  if(r.error||!r.data){ctx.toast('Nuk ke qasje te ky profil.');return}
  const p=r.data,mine=profiles.snapshot().anime,theirs=p.snapshot?.anime||[],index=new Map(mine.map(a=>[a.key,a])),both=theirs.filter(a=>index.has(a.key)),newOnes=theirs.filter(a=>!index.has(a.key)).slice(0,12);
  comparison=`<section class="pro-panel"><div class="pro-row"><h3>🔀 Ti & ${esc(display(p))}</h3><button class="pro-btn" data-pro-action="friend-close">Mbyll</button></div><div class="pro-grid"><div class="pro-panel"><strong style="font-size:26px">${both.length}</strong><small>Anime të përbashkëta</small></div><div class="pro-panel"><strong style="font-size:26px">${newOnes.length}</strong><small>Tituj të rinj për ty</small></div></div><h3>Anime të përbashkëta</h3>${both.slice(0,15).map(a=>`<div class="pro-row"><span>${esc(a.title)}</span><small>Ti: ${index.get(a.key).rating??'—'} · Miku: ${a.rating??'—'}</small></div>`).join('')||'<p class="pro-muted">Asnjë përputhje ende.</p>'}<h3 style="margin-top:14px">Nga lista e mikut</h3>${newOnes.map(a=>`<p class="pro-muted">${esc(a.title)} ${a.rating!=null?'★ '+a.rating+'/10':''}</p>`).join('')||'<p class="pro-muted">Nuk ka tituj të tjerë.</p>'}</section>`;
  ctx.rerender();
 }
 async function openHandle(handle){
  const q=await client().from('anime_profiles').select('user_id').eq('handle',handle).maybeSingle();
  if(q.error||!q.data){ctx.toast('Profili nuk është publik ose nuk gjendet.');return}
  await compare(q.data.user_id);
 }
 async function action(op,id){
  if(op==='friend-find')return find();
  if(op==='friend-add')return send(id);
  if(op==='friend-accept'||op==='friend-decline')return respond(id,op==='friend-accept'?'accepted':'declined');
  if(op==='friend-remove')return remove(id);
  if(op==='friend-compare')return compare(id);
  if(op==='friend-close'){comparison=null;ctx.rerender()}
 }
 return{load,render,action,openHandle,get:()=>friends};
};
