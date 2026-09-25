/* AnimeTrack 11.0 — private named lists; never mutate episode progress. */
window.ATCollections110=function ATCollections110(ctx){
 const esc=ctx.esc,LIMIT=12,ITEM_LIMIT=150;
 let selected='',pending='',query='',owner='';
 const state=()=>ctx.state();
 const library=()=>state().anime||[];
 const preferences=()=>{const s=state();s.preferences=s.preferences||{};s.preferences.customLists=Array.isArray(s.preferences.customLists)?s.preferences.customLists:[];return s.preferences};
 const lists=()=>preferences().customLists;
 const userId=()=>String(ctx.user()?.id||'guest');
 function syncOwner(){
  const id=userId();if(id!==owner){owner=id;selected='';pending='';query=''}
  if(selected&&!lists().some(x=>x.id===selected))selected='';
  if(!selected&&lists().length)selected=lists()[0].id;
 }
 function current(){syncOwner();return lists().find(x=>x.id===selected)||null}
 function nameOf(item){return item?.title||'Pa titull'}
 function number(id){return (lists().find(x=>x.id===id)?.animeIds||[]).filter(x=>library().some(a=>a.id===x)).length}
 function saveMutation(mutate){
  const p=preferences(),before=JSON.stringify(p.customLists);
  try{mutate(p.customLists);if(ctx.save()!==true){p.customLists=JSON.parse(before);ctx.toast('Lista nuk u ruajt. Provo përsëri.');return false}}
  catch(e){p.customLists=JSON.parse(before);console.warn('Collections write rolled back',e);ctx.toast('Ndryshimi nuk u ruajt.');return false}
  return true;
 }
 function make(title){
  syncOwner();
  const text=String(title||'').replace(/\s+/g,' ').trim().slice(0,50);
  if(text.length<2){ctx.toast('Shkruaj një emër me të paktën 2 karaktere.');return false}
  if(lists().length>=LIMIT){ctx.toast('Mund të krijosh deri në 12 lista.');return false}
  if(lists().some(x=>x.title.toLocaleLowerCase()===text.toLocaleLowerCase())){ctx.toast('Një listë me këtë emër ekziston.');return false}
  const id='list-'+ctx.uuid(),now=new Date().toISOString(),created={id,title:text,animeIds:[],createdAt:now,updatedAt:now};
  if(!saveMutation(rows=>rows.push(created)))return false;
  selected=id;ctx.toast('Lista u krijua ✓');ctx.rerender();return true;
 }
 function toggle(itemId,listId=selected){
  syncOwner();const a=library().find(a=>a.id===itemId),list=lists().find(x=>x.id===listId);
  if(!a||!list)return false;
  const has=list.animeIds.includes(itemId);
  if(!has&&list.animeIds.length>=ITEM_LIMIT){ctx.toast('Lista ka arritur 150 anime.');return false}
  if(!saveMutation(rows=>{const target=rows.find(x=>x.id===listId);target.animeIds=has?target.animeIds.filter(id=>id!==itemId):[...target.animeIds,itemId];target.updatedAt=new Date().toISOString()}))return false;
  if(pending===itemId)pending='';
  ctx.toast(has?'Anime u hoq nga lista ✓':'Anime u shtua në listë ✓');
  ctx.rerender();return true;
 }
 function remove(listId){
  syncOwner();const list=lists().find(x=>x.id===listId);if(!list)return false;
  if(!ctx.confirm('Ta fshijmë listën “'+list.title+'”? Anime dhe progresi i tyre nuk do të fshihen.'))return false;
  if(!saveMutation(rows=>rows.splice(rows.findIndex(x=>x.id===listId),1)))return false;
  selected='';pending='';ctx.toast('Lista u fshi. Biblioteka mbeti e pandryshuar ✓');ctx.rerender();return true;
 }
 function rename(listId,title){
  syncOwner();const target=lists().find(x=>x.id===listId),name=String(title||'').replace(/\s+/g,' ').trim().slice(0,50);
  if(!target||name.length<2)return false;
  if(lists().some(x=>x.id!==listId&&x.title.toLocaleLowerCase()===name.toLocaleLowerCase())){ctx.toast('Ky emër përdoret nga një listë tjetër.');return false}
  if(!saveMutation(rows=>{const item=rows.find(x=>x.id===listId);item.title=name;item.updatedAt=new Date().toISOString()}))return false;
  ctx.toast('Emri u ndryshua ✓');ctx.rerender();return true;
 }
 function pickAnime(id){
  syncOwner();
  if(!library().some(x=>x.id===id))return;
  pending=id;
  ctx.closeDetail?.();
  ctx.navigate('collections');
 }
 function shareText(list){
  return `AnimeTrack · ${list.title}\n`+(list.animeIds.map(id=>library().find(a=>a.id===id)?.title).filter(Boolean).map((title,i)=>`${i+1}. ${title}`).join('\n')||'Lista është bosh.')+'\n\nhttps://animetrack-flax.vercel.app/';
 }
 async function share(){
  const list=current();if(!list)return;
  const text=shareText(list);
  try{
   if(navigator.share)await navigator.share({title:'AnimeTrack · '+list.title,text});
   else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);ctx.toast('Lista u kopjua ✓')}
   else{ctx.toast('Kopjimi nuk mbështetet në këtë shfletues.');return}
  }catch(e){if(e?.name!=='AbortError')ctx.toast('Ndarja e listës nuk u krye.')}
 }
 function mountLibrary(){
  const root=ctx.el('library-view'),head=root?.querySelector('.home-section-head');
  if(!head||ctx.el('at110-open-lists'))return;
  head.insertAdjacentHTML('beforeend','<button id="at110-open-lists" class="at110-library-link" type="button" data-pro-action="collection-open">▤ Listat e mia ↗</button>');
 }
 function render(){
  syncOwner();const rows=lists(),chosen=current(),items=library(),matched=items.filter(a=>String(a.title||'').toLocaleLowerCase().includes(query.toLocaleLowerCase())),ids=new Set(chosen?.animeIds||[]),assigned=(chosen?.animeIds||[]).map(id=>items.find(a=>a.id===id)).filter(Boolean),planned=pending&&items.find(a=>a.id===pending);
  const textCard=a=>{const image=ctx.poster(a.cover);return `<article class="at110-anime"><button type="button" class="at110-cover" data-pro-action="collection-anime" data-id="${esc(a.id)}" aria-label="Hap ${esc(nameOf(a))}">${image?`<img loading="lazy" src="${esc(image)}" referrerpolicy="no-referrer" alt="">`:'✦'}</button><div><strong>${esc(nameOf(a))}</strong><small>${esc(a.status||'Në bibliotekë')} · ${ctx.count(a)} episode</small></div><button type="button" class="at110-toggle ${ids.has(a.id)?'selected':''}" data-pro-action="collection-toggle" data-id="${esc(a.id)}" aria-label="${ids.has(a.id)?'Hiqe nga lista':'Shto në listë'}">${ids.has(a.id)?'✓ Në listë':'+ Shto'}</button></article>`};
  return `<div class="at110-page"><header class="at110-heading"><div><span class="at110-kicker">MY ANIME LISTS</span><h2>▤ Listat e mia</h2><p>Organizo anime sipas dëshirës. Këto lista janë private dhe nuk ndryshojnë progresin.</p></div><button type="button" data-pro-action="collection-back">← Biblioteka</button></header><div class="at110-shell"><aside class="at110-aside"><div class="at110-aside-head"><h3>Koleksionet <span>${rows.length}/${LIMIT}</span></h3></div><form id="at110-create-form" class="at110-create"><label for="at110-new-list">Emri i listës</label><input id="at110-new-list" type="text" minlength="2" maxlength="50" placeholder="P.sh. Për fundjavë" aria-label="Emri i listës"><button type="submit">+ Krijo listë</button></form><div class="at110-choices">${rows.map(list=>`<button type="button" data-pro-action="collection-select" data-id="${esc(list.id)}" class="${list.id===selected?'active':''}" aria-pressed="${list.id===selected}"><span>${esc(list.title)}</span><b>${number(list.id)}</b></button>`).join('')||'<p class="at110-empty-note">Krijo listën tënde të parë.</p>'}</div></aside><section class="at110-content">${chosen?`<div class="at110-list-top"><div><span class="at110-kicker">LISTË PERSONALE</span><h3>${esc(chosen.title)}</h3><p>${assigned.length} anime · ruhet në bibliotekën tënde</p></div><div class="at110-list-actions"><button type="button" data-pro-action="collection-share">↗ Ndaj titujt</button><button type="button" data-pro-action="collection-rename">✎ Emri</button><button type="button" data-pro-action="collection-delete" class="danger">Fshi listën</button></div></div>${planned?`<div class="at110-pick"><strong>Shto “${esc(planned.title)}” në këtë listë?</strong><button type="button" data-pro-action="collection-toggle" data-id="${esc(planned.id)}">${ids.has(planned.id)?'Hiqe nga kjo listë':'✓ Shto këtu'}</button><button type="button" data-pro-action="collection-cancel">Mbyll</button></div>`:''}<h4>Anime në listë</h4><div class="at110-items">${assigned.map(textCard).join('')||'<p class="at110-empty-note">Kjo listë është bosh. Shto një anime nga biblioteka më poshtë.</p>'}</div><div class="at110-divider"></div><div class="at110-search"><label for="at110-search-input">Shto nga biblioteka</label><input id="at110-search-input" type="search" value="${esc(query)}" placeholder="Kërko anime…" autocomplete="off" aria-label="Kërko anime për ta shtuar në listë"></div><div class="at110-items">${matched.filter(a=>!ids.has(a.id)).slice(0,24).map(textCard).join('')||'<p class="at110-empty-note">Nuk u gjet anime tjetër. Shto anime në bibliotekë për të plotësuar listën.</p>'}</div>${matched.filter(a=>!ids.has(a.id)).length>24?'<p class="at110-empty-note">Shfaqen 24 rezultate. Përdor kërkimin për të gjetur të tjerat.</p>':''}`:'<div class="at110-empty"><span>✦</span><h3>Krijo një listë personale</h3><p>Si “Anime për fundjavë”, “Top 10”, ose “Për t’u parë me miqtë”.</p></div>'}</section></div><p class="at110-private-note">🔒 Listat nuk publikohen automatikisht. “Ndaj titujt” ndan vetëm emrat e animeve, jo historikun, komentet apo shënimet e tua.</p></div>`;
 }
 function action(op,id){
  if(op==='collection-open'){ctx.navigate('collections');return}
  if(op==='collection-back'){ctx.navigate('library');return}
  if(op==='collection-select'){selected=id;query='';ctx.rerender();return}
  if(op==='collection-create')return make(ctx.el('at110-new-list')?.value);
  if(op==='collection-toggle')return toggle(id);
  if(op==='collection-delete')return remove(selected);
  if(op==='collection-rename'){const item=current();if(!item)return;const text=ctx.prompt('Emri i ri i listës:',item.title);if(text!==null)return rename(item.id,text);return}
  if(op==='collection-share')return share();
  if(op==='collection-cancel'){pending='';ctx.rerender();return}
  if(op==='collection-pick')return pickAnime(id);
  if(op==='collection-anime')return ctx.openAnime(id);
 }
 function setSearch(value){query=String(value||'').slice(0,80);ctx.rerender()}
 return{render,mountLibrary,action,setSearch,pickAnime,make,toggle,remove,rename,shareText,lists};
};
