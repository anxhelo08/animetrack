/* AnimeTrack 11.2 — exact-handle private invites on RLS-protected profiles. */
window.ATFriends=function ATFriends(ctx,profiles){
 let friends=[],people=[],comparison=null,results=[],searchQuery='',searchState='',searchSerial=0,busy=false;
 const esc=ctx.esc,client=()=>ctx.client(),user=()=>ctx.user();
 const display=p=>p?.display_name||p?.handle||'Anime fan';
 const myId=()=>user()?.id||'';
 const peer=f=>f.requester_id===myId()?f.recipient_id:f.requester_id;
 const relation=id=>friends.find(f=>peer(f)===id&&f.status==='accepted')||friends.find(f=>peer(f)===id&&f.status==='pending')||friends.find(f=>peer(f)===id&&f.status==='declined');
 const counts=()=>({accepted:friends.filter(f=>f.status==='accepted').length,pending:friends.filter(f=>f.status==='pending'&&f.recipient_id===myId()).length,outgoing:friends.filter(f=>f.status==='pending'&&f.requester_id===myId()).length});
 const avatar=p=>`<span class="at11-social-avatar">${ctx.poster(p.avatar_url)?`<img src="${esc(ctx.poster(p.avatar_url))}" alt="" loading="lazy" referrerpolicy="no-referrer">`:esc(p.avatar_emoji||'🎌')}</span>`;
 const row=(p,actions='',subtitle='')=>`<article class="at11-person">${avatar(p)}<div class="at11-person-info"><strong>${esc(display(p))}</strong><small>@${esc(p.handle||'privat')}${subtitle?' · '+esc(subtitle):''}</small></div><div class="at11-person-actions">${actions}</div></article>`;
 const btn=(label,op,id,primary=false)=>`<button type="button" class="pro-btn ${primary?'primary':''}" data-pro-action="${op}" data-id="${esc(id)}">${label}</button>`;
 const pById=id=>people.find(p=>p.user_id===id)||results.find(p=>p.user_id===id)||{user_id:id,display_name:'Profil privat'};
 async function load(){
  if(!user()){friends=[];people=[];results=[];comparison=null;return}
  const id=myId(),f=await client().from('anime_friendships').select('id,requester_id,recipient_id,status,created_at').or('requester_id.eq.'+id+',recipient_id.eq.'+id);
  if(f.error)throw f.error;friends=f.data||[];
  const ids=[...new Set(friends.map(peer))];people=[];
  if(ids.length){const p=await client().from('anime_profiles').select('user_id,handle,display_name,bio,avatar_emoji,avatar_url,is_public,snapshot').in('user_id',ids);if(p.error)throw p.error;people=p.data||[]}
 }
 function relationActions(p){const f=relation(p.user_id);
  if(!f)return btn('＋ Shto mik','friend-add',p.user_id,true);
  if(f.status==='accepted')return btn('⇄ Krahaso','friend-compare',p.user_id,true);
  if(f.status==='pending')return f.recipient_id===myId()?btn('✓ Prano','friend-accept',f.id,true):btn('Në pritje · Anulo','friend-remove',f.id);
  return btn('＋ Kërko sërish','friend-add',p.user_id,true);
 }
 function resultMarkup(){if(searchState)return `<p class="at11-search-state" role="status">${esc(searchState)}</p>`;
  if(!searchQuery.trim())return '<p class="at11-search-state">Kërko emrin publik, ose shkruaj username-in e plotë (@username) për t’i dërguar ftesë edhe një profili privat. Biblioteka e tij mbetet e fshehur deri kur të pranoni miqësinë.</p>';
  if(!results.length)return '<p class="at11-search-state">Nuk u gjet profil. Provo username-in e saktë të mikut.</p>';
  return results.map(p=>row(p,relationActions(p),p.is_public?'Profil publik':'Profil privat · vetëm ftesë')).join('');
 }
 function render(){
  if(!user())return '<section class="at11-social-hero"><h2>Miqtë e AnimeTrack</h2><p>Hyr në llogari për të kërkuar shokët dhe për të krahasuar bibliotekat.</p></section>';
  const c=counts(),mine=profiles.get();
  const incoming=friends.filter(f=>f.recipient_id===myId()&&f.status==='pending');
  const outgoing=friends.filter(f=>f.requester_id===myId()&&f.status==='pending');
  const accepted=friends.filter(f=>f.status==='accepted');
  const needsHandle=!mine?.handle;
  return `<div class="at11-social-page"><header class="at11-social-hero"><span class="pro-eyebrow">ANIMETRACK · COMMUNITY</span><h2>Historitë janë më të bukura bashkë.</h2><p>Gjej miqtë, ndiq kërkesat dhe zbulo anime që keni të përbashkëta.</p><div class="at11-social-metrics"><span><strong>${c.accepted}</strong> miq</span><span><strong>${c.pending}</strong> kërkesa</span><span><strong>${c.outgoing}</strong> në pritje</span></div></header>
  ${mine?.handle?`<section class="at112-invite-box"><span>✉</span><div><strong>Fto një shok në AnimeTrack</strong><small>Ndaj @${esc(mine.handle)} — profili yt mund të mbetet privat.</small></div><button type="button" class="pro-btn primary" data-pro-action="friend-copy">Kopjo ftesën ↗</button></section>`:''}${needsHandle?`<section class="at11-friend-hint"><strong>✦ Krijo username-in tënd</strong><p>Vendos një emër publik që miqtë të mund të të gjejnë. Profili yt mbetet privat derisa ta aktivizosh vetë publikimin.</p><button type="button" class="pro-btn primary" data-pro-action="friend-profile">Personalizo profilin ↗</button></section>`:''}
  <section class="pro-panel at11-friend-search"><div class="at11-panel-head"><div><span class="pro-eyebrow">DISCOVER PEOPLE</span><h3>Gjej një mik</h3></div><span class="at11-soft-pill">⌕ Kërkim</span></div><form id="at11-friend-form" class="at11-friend-form"><label for="pro-friend-query" class="at11-input-shell"><span aria-hidden="true">⌕</span><input id="pro-friend-query" class="pro-input" autocomplete="off" autocapitalize="none" maxlength="30" enterkeyhint="search" placeholder="Username ose emri i mikut…" value="${esc(searchQuery)}"></label><button type="submit" class="pro-btn primary">Kërko →</button></form><div id="pro-find-results" class="at11-person-list" aria-live="polite">${resultMarkup()}</div></section>
  <div class="at11-social-columns"><section class="pro-panel"><div class="at11-panel-head"><h3>📩 Kërkesat e marra</h3><span class="at11-count">${incoming.length}</span></div><div class="at11-person-list">${incoming.map(f=>row(pById(f.requester_id),btn('✓ Prano','friend-accept',f.id,true)+btn('Refuzo','friend-decline',f.id))).join('')||'<p class="at11-search-state">Nuk ke kërkesa të reja.</p>'}</div></section><section class="pro-panel"><div class="at11-panel-head"><h3>⏳ Në pritje</h3><span class="at11-count">${outgoing.length}</span></div><div class="at11-person-list">${outgoing.map(f=>row(pById(f.recipient_id),btn('Anulo','friend-remove',f.id))).join('')||'<p class="at11-search-state">Asnjë kërkesë në pritje.</p>'}</div></section></div>
  <section class="pro-panel"><div class="at11-panel-head"><h3>🤝 Miqtë e tu</h3><span class="at11-count">${accepted.length}</span></div><div class="at11-person-list at11-friend-grid">${accepted.map(f=>row(pById(peer(f)),btn('⇄ Krahaso bibliotekat','friend-compare',peer(f),true)+btn('Hiq','friend-remove',f.id))).join('')||'<p class="at11-search-state">Kur dikush pranon kërkesën tënde, do të shfaqet këtu.</p>'}</div></section><div id="pro-comparison">${comparison||''}</div></div>`;
 }
 async function find(qFromEvent){
  const raw=String(qFromEvent??ctx.el('pro-friend-query')?.value??searchQuery).trim().replace(/^@/,'');
  searchQuery=raw.slice(0,30);const seq=++searchSerial;
  if(searchQuery.length<2){results=[];searchState=searchQuery?'Shkruaj të paktën 2 karaktere.':'';showResults();return}
  // Broad discovery is public only; RPC below returns minimal fields on EXACT username match.
  const q=searchQuery.toLowerCase().replace(/[^a-z0-9_ ]/g,'').trim();
  if(q.length<2){results=[];searchState='Përdor shkronja, numra ose _. ';showResults();return}
  searchState='Po kërkoj…';showResults();
  try{
   const cols='user_id,handle,display_name,avatar_emoji,avatar_url,is_public';
   const lookups=[client().from('anime_profiles').select(cols).eq('is_public',true).ilike('handle',q+'%').limit(12),client().from('anime_profiles').select(cols).eq('is_public',true).ilike('display_name','%'+q+'%').limit(12)];
   const requests=[...lookups];
   if(/^[a-z0-9_]{3,24}$/.test(q)&&typeof client().rpc==='function')requests.push(client().rpc('anime_find_friend_by_handle',{p_handle:q}).then(r=>{if(r.error){console.warn('Exact username lookup unavailable',r.error.message);return {data:[]}}return r}));
   const responses=await Promise.all(requests);
   if(seq!==searchSerial)return;
   const failure=responses.slice(0,2).find(r=>r.error);if(failure)throw failure.error;
   const seen=new Set();results=responses.flatMap(r=>r.data||[]).filter(p=>{if(p.user_id===myId()||seen.has(p.user_id))return false;seen.add(p.user_id);return true}).slice(0,12);
   searchState='';showResults();
  }catch(err){if(seq!==searchSerial)return;results=[];searchState='Kërkimi nuk u krye. Kontrollo lidhjen dhe provo përsëri.';showResults();console.warn('Friend search',err)}
 }
 function showResults(){const slot=ctx.el('pro-find-results');if(slot)slot.innerHTML=resultMarkup()}
 async function send(id){
  if(!user()||id===myId()||busy)return;const person=results.find(p=>p.user_id===id);if(!person?.handle)return;
  busy=true;try{
   const existing=relation(id);if(existing?.status==='accepted'||existing?.status==='pending'){ctx.toast('Kërkesa ekziston tashmë.');return}
   if(existing?.status==='declined'){ctx.toast('Kjo kërkesë është refuzuar më parë.');return}
   if(typeof client().rpc==='function'){
    const r=await client().rpc('anime_request_friend_by_handle',{p_handle:person.handle});
    if(!r.error){const messages={sent:'Kërkesa u dërgua ✓',pending:'Kërkesa ekziston tashmë.',declined:'Kërkesa është refuzuar më parë.',limit:'Ke shumë kërkesa në pritje.',self:'Nuk mund të ftosh veten.',invalid:'Kontrollo username-in.','not-found':'Profili nuk u gjet.','already-friends':'Jeni tashmë miq.'};ctx.toast(messages[r.data]||'Kërkesa u kontrollua.');if(r.data==='sent'||r.data==='pending'||r.data==='already-friends'){await load();ctx.rerender()}return}
    if(!['42883','PGRST202'].includes(r.error.code)){throw r.error}
   }
   // Older backends only allow public profile requests; never bypass privacy policies.
   if(!person.is_public){ctx.toast('Ftesat private kërkojnë migrimin 11.2 në Supabase.');return}
   const r=await client().from('anime_friendships').insert({requester_id:myId(),recipient_id:id,status:'pending'});if(r.error)throw r.error;
   ctx.toast('Kërkesa u dërgua ✓');await load();ctx.rerender();
  }finally{busy=false}
 }
 async function respond(id,status){const f=friends.find(f=>String(f.id)===String(id));if(!f||f.recipient_id!==myId()||f.status!=='pending')return;
  const r=await client().from('anime_friendships').update({status,updated_at:new Date().toISOString()}).eq('id',f.id).eq('recipient_id',myId()).eq('status','pending');if(r.error)throw r.error;await load();ctx.toast(status==='accepted'?'Jeni miq tani ✓':'Kërkesa u refuzua.');ctx.rerender();
 }
 async function remove(id){const f=friends.find(f=>String(f.id)===String(id));if(!f||busy)return;
  if(f.status==='accepted'&&!ctx.confirm('Ta heqim këtë mik?'))return;
  busy=true;try{const r=await client().from('anime_friendships').delete().eq('id',f.id);if(r.error)throw r.error;await load();comparison=null;ctx.toast('Kërkesa/lidhja u hoq.');ctx.rerender()}finally{busy=false}
 }
 async function compare(id){if(!friends.some(f=>f.status==='accepted'&&peer(f)===id)){ctx.toast('Duhet të jeni miq për krahasim.');return}
  const r=await client().from('anime_profiles').select('user_id,handle,display_name,snapshot,is_public').eq('user_id',id).maybeSingle();
  if(r.error||!r.data){ctx.toast('Profili nuk është i disponueshëm.');return}
  const p=r.data,mine=profiles.snapshot().anime||[],theirs=Array.isArray(p.snapshot?.anime)?p.snapshot.anime:[],index=new Map(mine.map(a=>[a.key,a]));
  const both=theirs.filter(a=>index.has(a.key)),newOnes=theirs.filter(a=>!index.has(a.key)).slice(0,12);
  comparison=`<section class="pro-panel at11-compare"><div class="at11-panel-head"><div><span class="pro-eyebrow">LIBRARY MATCH</span><h3>Ti & ${esc(display(p))}</h3></div><button type="button" class="pro-btn" data-pro-action="friend-close">Mbyll ×</button></div><div class="at11-compare-metrics"><div><strong>${both.length}</strong><small>Anime të përbashkëta</small></div><div><strong>${newOnes.length}</strong><small>Tituj të rinj për ty</small></div></div><h4>Anime të përbashkëta</h4>${both.slice(0,15).map(a=>`<div class="at11-compare-row"><strong>${esc(a.title)}</strong><small>Ti: ${esc(index.get(a.key).rating??'—')} · Miku: ${esc(a.rating??'—')}</small></div>`).join('')||'<p class="at11-search-state">Asnjë përputhje ende.</p>'}<h4>Nga lista e mikut</h4>${newOnes.map(a=>`<p class="at11-compare-row">${esc(a.title)} ${a.rating!=null?'★ '+esc(a.rating)+'/10':''}</p>`).join('')||'<p class="at11-search-state">Nuk ka tituj të tjerë.</p>'}</section>`;
  ctx.rerender();ctx.el('pro-comparison')?.scrollIntoView?.({behavior:'smooth',block:'nearest'});
 }
 async function openHandle(handle){
  const name=String(handle||'').trim().replace(/^@/,'').toLowerCase();if(!/^[a-z0-9_]{3,24}$/.test(name))return;
  searchQuery=name;ctx.rerender();await find(name);
  const found=results.find(p=>p.handle===name),relationship=found&&relation(found.user_id);
  if(found&&relationship?.status==='accepted')return compare(found.user_id);
  if(!found)ctx.toast('Nuk u gjet një profil me këtë username.');
  ctx.el('pro-friend-query')?.focus?.({preventScroll:true});
 }
 async function action(op,id){
  if(op==='friend-find')return find();
  if(op==='friend-copy'){
   const handle=profiles.get()?.handle;if(!handle)return;
   const url=location.origin+'/?profile='+encodeURIComponent(handle);
   try{await navigator.clipboard.writeText(url);ctx.toast('Linku i ftesës u kopjua ✓')}
   catch{ctx.prompt('Kopjo linkun e ftesës:',url)}return;
  }
  if(op==='friend-profile'){ctx.navigate('profile');profiles.setTab('settings');return}
  if(op==='friend-add')return send(id);
  if(op==='friend-accept'||op==='friend-decline')return respond(id,op==='friend-accept'?'accepted':'declined');
  if(op==='friend-remove')return remove(id);
  if(op==='friend-compare')return compare(id);
  if(op==='friend-close'){comparison=null;ctx.rerender()}
 }
 return{load,render,action,openHandle,find,get:()=>friends,counts};
};
