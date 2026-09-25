/* AnimeTrack 10.1 - personal showcase, insights and privacy-preserving profile. */
window.ATProfiles=function ATProfiles(ctx){
 let profile=null,timer=0,tab='overview';
 const esc=ctx.esc,client=()=>ctx.client(),user=()=>ctx.user(),state=()=>ctx.state(),poster=ctx.poster;
 const dateLabel=value=>{const t=Date.parse(value||'');return Number.isFinite(t)?new Date(t).toLocaleDateString('sq-AL',{month:'long',year:'numeric'}):''};
 function snapshot(){
  const anime=state().anime.slice(0,450).map(a=>({key:a.malId?'mal:'+a.malId:a.sourceId?a.source+':'+a.sourceId:'name:'+a.title.toLowerCase(),title:a.title,cover:a.cover,rating:a.rating,genre:a.genre,status:a.status,watched:ctx.count(a)}));
  return {anime,stats:{titles:anime.length,episodes:anime.reduce((n,a)=>n+a.watched,0),completed:state().anime.filter(a=>a.status==='completed').length,favorites:state().anime.filter(a=>a.favorite).length},updatedAt:new Date().toISOString()};
 }
 async function load(){
  if(!user()){profile=null;tab='overview';ctx.rerender?.();return}
  const r=await client().from('anime_profiles').select('user_id,handle,display_name,bio,avatar_emoji,avatar_url,is_public,snapshot,created_at').eq('user_id',user().id).maybeSingle();
  if(r.error)throw r.error;profile=r.data||null;
 }
 function analytics(){
  const anime=state().anime||[],logs=ctx.activity()||[],counts=new Map(),days=new Map(),today=new Date(),now=Date.now();
  for(const a of anime)for(const genre of ctx.genres(a)){const k=genre.trim();if(k)counts.set(k,(counts.get(k)||0)+1)}
  for(const row of logs){const t=Number(row.at);if(!Number.isFinite(t)||t>now||t<now-365*86400000)continue;const d=new Date(t),key=[d.getFullYear(),d.getMonth()+1,d.getDate()].join('-');days.set(key,(days.get(key)||0)+1)}
  let streak=0;const base=new Date(today.getFullYear(),today.getMonth(),today.getDate());
  for(let i=0;i<366;i++){const d=new Date(base);d.setDate(d.getDate()-i);const key=[d.getFullYear(),d.getMonth()+1,d.getDate()].join('-');if(!days.has(key)){if(i===0)continue;break}streak++}
  const minutes=anime.reduce((n,a)=>n+(ctx.isMovie(a)?100:24)*ctx.count(a),0);
  const favorites=anime.filter(a=>a.favorite).sort((a,b)=>(Number(b.rating)||0)-(Number(a.rating)||0));
  const top=anime.filter(a=>a.rating!=null&&Number(a.rating)>0).sort((a,b)=>Number(b.rating)-Number(a.rating)).slice(0,5);
  const recent=[...logs].filter(e=>Number.isFinite(Number(e.at))).sort((a,b)=>b.at-a.at).slice(0,6);
  const genres=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,5),maxGenre=genres[0]?.[1]||1;
  const rewatches=anime.reduce((n,a)=>n+(a.rewatches||[]).length,0);
  const badges=[];
  if(anime.length>=10)badges.push(['📚','Collector','10+ anime në bibliotekë']);
  if(anime.filter(a=>a.status==='completed').length>=5)badges.push(['🏁','Finisher','5+ anime të përfunduara']);
  if(favorites.length>=3)badges.push(['💜','Curator','3+ anime të preferuara']);
  if(streak>=3)badges.push(['🔥','On a streak',streak+' ditë aktivitet']);
  if(rewatches>=1)badges.push(['🔁','Rewatch fan','Ke nisur një rishikim']);
  if(!badges.length)badges.push(['🌱','First steps','Historia jote anime po merr formë']);
  return {anime,logs,days,streak,minutes,favorites,top,recent,genres,maxGenre,rewatches,badges};
 }
 function heatmap(a){
  const now=new Date(),first=new Date(now.getFullYear(),now.getMonth(),now.getDate());first.setDate(first.getDate()-83);
  const cells=Array.from({length:84},(_,i)=>{const d=new Date(first);d.setDate(first.getDate()+i);const key=[d.getFullYear(),d.getMonth()+1,d.getDate()].join('-'),n=a.days.get(key)||0,level=Math.min(4,n?Math.max(1,Math.ceil(n/2)):0),label=d.toLocaleDateString('sq-AL',{day:'numeric',month:'short'});return `<span class="at-heat at-heat-${level}" title="${esc(label)} · ${n} episode" aria-label="${esc(label)}: ${n} episode"></span>`}).join('');
  return `<div class="at-heatmap" role="img" aria-label="Aktiviteti i 12 javëve të fundit">${cells}</div><div class="at-heat-legend"><span>12 javët e fundit · vetëm episodet me datë</span><span>Pak <i class="at-heat at-heat-0"></i><i class="at-heat at-heat-1"></i><i class="at-heat at-heat-2"></i><i class="at-heat at-heat-3"></i><i class="at-heat at-heat-4"></i> Shumë</span></div>`;
 }
 function statsPage(){
  const logs=ctx.activity()||[],now=new Date(),startWeek=new Date(now.getFullYear(),now.getMonth(),now.getDate()-(now.getDay()+6)%7),startMonth=new Date(now.getFullYear(),now.getMonth(),1),startYear=new Date(now.getFullYear(),0,1);
  const countSince=ms=>logs.filter(e=>Number(e.at)>=ms&&Number(e.at)<=Date.now()).length;
  const week=countSince(startWeek.getTime()),month=countSince(startMonth.getTime()),year=countSince(startYear.getTime()),goal=Math.max(1,Math.min(200,Number(state().preferences?.weeklyGoal)||10)),progress=Math.min(100,Math.round(week/goal*100));
  const all=state().anime||[],a=analytics(),statuses=[['watching','▶ Po shikoj'],['completed','✓ Përfunduar'],['planning','◇ Në listë'],['paused','Ⅱ Në pauzë'],['dropped','× E lënë']];
  const days=Array.from({length:7},(_,i)=>{const d=new Date(startWeek);d.setDate(d.getDate()+i);const end=new Date(d);end.setDate(d.getDate()+1);return {label:d.toLocaleDateString('sq-AL',{weekday:'short'}),n:logs.filter(e=>e.at>=d.getTime()&&e.at<end.getTime()).length}});
  const months=Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+i,1),end=new Date(d.getFullYear(),d.getMonth()+1,1);return {label:d.toLocaleDateString('sq-AL',{month:'short'}),n:logs.filter(e=>e.at>=d.getTime()&&e.at<end.getTime()).length}});
  const chart=(data,tag)=>{const top=Math.max(1,...data.map(x=>x.n));return '<div class="at-h2-stat-chart" role="img" aria-label="'+esc(tag)+'">'+data.map(x=>'<div><b>'+x.n+'</b><span><i style="height:'+Math.max(x.n?7:0,Math.round(x.n/top*100))+'%"></i></span><small>'+esc(x.label)+'</small></div>').join('')+'</div>'};
  return '<section class="at-h2-stats-top"><div><span class="pro-eyebrow">MY WATCHING JOURNEY</span><h3>📊 Statistikat e mia</h3><p>Progresi dhe aktiviteti personal, në një vend.</p></div><button type="button" class="pro-btn" data-pro-action="profile-tab" data-id="overview">← Profili</button></section>'+
   '<section class="pro-panel at-h2-profile-goal"><div><span class="pro-eyebrow">OBJEKTIVI JAVOR</span><h3>'+week+' / '+goal+' episode</h3><p>'+Math.min(100,progress)+'% e objektivit këtë javë</p><div class="at-h2-meter"><span style="width:'+progress+'%"></span></div></div><div class="at-h2-goal-form"><label for="at-profile-goal-input">Episode në javë</label><input id="at-profile-goal-input" type="number" min="1" max="200" step="1" value="'+goal+'"><button type="button" class="pro-btn primary" data-pro-action="profile-goal-save">Ruaj objektivin</button></div></section>'+
   '<div class="at-h2-profile-metrics">'+[['Këtë javë',week],['Këtë muaj',month],['Këtë vit',year],['Gjithsej episode',all.reduce((n,x)=>n+ctx.count(x),0).toLocaleString('sq-AL')],['Ditë radhazi',a.streak],['Orë të përafërta',(a.minutes/60).toFixed(1)+'h']].map(([label,val])=>'<div><span>'+label+'</span><strong>'+val+'</strong></div>').join('')+'</div>'+
   '<div class="at-profile-columns"><section class="pro-panel"><span class="pro-eyebrow">KËTË JAVË</span><h3>7 ditët e javës</h3>'+chart(days,'Episode në ditë')+'</section><section class="pro-panel"><span class="pro-eyebrow">RITMI YT</span><h3>6 muajt e fundit</h3>'+chart(months,'Episode në muaj')+'</section></div>'+
   '<section class="pro-panel"><span class="pro-eyebrow">BIBLIOTEKA IME</span><h3>Shpërndarja sipas statusit</h3><div class="at-h2-status-grid">'+statuses.map(([id,label])=>'<div><span>'+label+'</span><strong>'+all.filter(x=>x.status===id).length+'</strong></div>').join('')+'</div></section>'+
   '<p class="pro-muted">Aktiviteti bazohet në episodet me datë të ruajtur. Koha është vlerësim 24 min/episod dhe 100 min/film, jo kohë e matur.</p>';
 }
 function goalSave(){
  const val=Number(ctx.el('at-profile-goal-input')?.value);
  if(!Number.isInteger(val)||val<1||val>200){ctx.toast('Objektivi duhet të jetë 1–200 episode në javë.');return}
  state().preferences=state().preferences||{};state().preferences.weeklyGoal=val;ctx.save();ctx.toast('Objektivi javor u ruajt ✓');ctx.rerender();
 }
 function render(){
  const p=profile||{},a=analytics(),s=snapshot(),avatar=poster(p.avatar_url),handle=p.handle?'@'+p.handle:'Përcakto username',name=p.display_name||ctx.accountName();
  const joined=dateLabel(p.created_at),status=p.is_public?'🌐 Profil publik':'🔒 Privat';
  const nav=`<div class="at-profile-tabs" role="group" aria-label="Seksionet e profilit"><button type="button" data-pro-action="profile-tab" data-id="overview" class="${tab==='overview'?'active':''}" aria-pressed="${tab==='overview'}">✦ Përmbledhje</button><button type="button" data-pro-action="profile-tab" data-id="stats" class="${tab==='stats'?'active':''}" aria-pressed="${tab==='stats'}">▥ Statistikat e mia</button><button type="button" data-pro-action="profile-tab" data-id="settings" class="${tab==='settings'?'active':''}" aria-pressed="${tab==='settings'}">⚙ Ndrysho profilin</button></div>`;
  const header=`<header class="at-profile-header"><div class="at-profile-banner"><span class="pro-eyebrow">Profili im · AnimeTrack</span><span class="at-profile-privacy">${status}</span></div><div class="at-profile-identity"><div class="at-profile-avatar">${avatar?`<img src="${esc(avatar)}" alt="Foto profili" referrerpolicy="no-referrer">`:esc(p.avatar_emoji||'🎌')}</div><div class="at-profile-person"><h2>${esc(name)}</h2><span>${esc(handle)}</span><p>${esc(p.bio||'Çdo anime që shikon është pjesë e historisë tënde.')}</p><div class="at-profile-bits"><span>${joined?'✦ Anëtar që nga '+esc(joined):'✦ Historia jote anime'} </span><span>• ${s.stats.titles} anime në bibliotekë</span></div></div><div class="at-profile-top-actions">${profile?'<button class="pro-btn" data-pro-action="profile-share">↗ Kopjo linkun</button>':''}<button class="pro-btn primary" data-pro-action="profile-tab" data-id="${tab==='overview'?'settings':'overview'}">${tab==='overview'?'Ndrysho profilin':'Shiko profilin'}</button></div></div></header>`;
  const metrics=[['📚','Anime',s.stats.titles],['▶','Episode',s.stats.episodes],['✓','Përfunduar',s.stats.completed],['♥','Favorites',s.stats.favorites],['◷','Orë të përafërta',(a.minutes/60).toFixed(1)],['↻','Rewatch',a.rewatches]].map(([i,label,val])=>`<div class="at-profile-stat"><span>${i} ${label}</span><strong>${val}</strong></div>`).join('');
  const favorites=a.favorites.slice(0,5).map(x=>`<div class="at-profile-anime">${poster(x.cover)?`<img src="${esc(poster(x.cover))}" loading="lazy" referrerpolicy="no-referrer" alt="">`:'<span>✦</span>'}<div><strong>${esc(x.title)}</strong><small>${x.rating!=null?'★ '+esc(x.rating)+'/10':'♥ E preferuar'}</small></div></div>`).join('');
  const top=a.top.map((x,i)=>`<div class="at-profile-top"><b>${String(i+1).padStart(2,'0')}</b><span>${esc(x.title)}</span><strong>★ ${esc(x.rating)}/10</strong></div>`).join('');
  const genreBars=a.genres.map(([g,n])=>`<div class="at-genre-row"><div><b>${esc(g)}</b><small>${n}</small></div><span><i style="width:${Math.round(n/a.maxGenre*100)}%"></i></span></div>`).join('');
  const recent=a.recent.map(e=>{const x=a.anime.find(x=>x.id===e.id),d=new Date(e.at);return `<div class="at-profile-history"><span class="at-history-dot"></span><div><strong>${esc(x?.title||'Anime')}</strong><small>${esc(d.toLocaleDateString('sq-AL',{day:'numeric',month:'short'}))} · Episodi ${esc(e.n||'—')}</small></div></div>`}).join('');
  const overview=`<div class="at-profile-stats">${metrics}</div><div class="at-profile-columns"><section class="pro-panel at-profile-activity"><div class="pro-row"><div><span class="pro-eyebrow">YOUR JOURNEY</span><h3>Aktiviteti yt</h3></div><div class="at-streak">🔥 ${a.streak} ditë radhazi</div></div>${heatmap(a)}<h3 class="at-subheading">Së fundmi</h3><div class="at-profile-recent">${recent||'<p class="pro-muted">Shëno një episod për të nisur historikun.</p>'}</div></section><section class="pro-panel"><span class="pro-eyebrow">TASTE PROFILE</span><h3>Zhanret e tua</h3><div class="at-profile-genres">${genreBars||'<p class="pro-muted">Shto anime për të zbuluar zhanret e preferuara.</p>'}</div><h3 class="at-subheading">Badges</h3><div class="at-badges">${a.badges.map(([icon,title,desc])=>`<div class="at-badge" title="${esc(desc)}"><b>${icon}</b><span>${esc(title)}</span><small>${esc(desc)}</small></div>`).join('')}</div></section></div><div class="at-profile-columns"><section class="pro-panel"><span class="pro-eyebrow">THE COLLECTION</span><h3>♥ Anime të preferuara</h3><div class="at-profile-favorites">${favorites||'<p class="pro-muted">Shëno anime me zemër për t’i shfaqur këtu.</p>'}</div></section><section class="pro-panel"><span class="pro-eyebrow">PERSONAL PICKS</span><h3>Top 5 sipas vlerësimeve të tua</h3><div class="at-profile-top-list">${top||'<p class="pro-muted">Vlerëso disa anime për të krijuar Top 5.</p>'}</div></section></div><p class="pro-muted">Koha është vlerësim 24 min/episod dhe 100 min/film. Aktiviteti bazohet te historiku me datë; nuk shpiken shënimet e vjetra.</p>`;
  const settings=`<section class="pro-panel at-profile-settings"><div><span class="pro-eyebrow">EDIT YOUR IDENTITY</span><h3>Personalizo profilin</h3><p class="pro-muted">Ndryshimet ruhen në llogarinë tënde. Biblioteka dhe historiku nuk preken.</p></div>${!user()?'<p class="pro-empty">Hyr në llogari për të ruajtur një profil publik ose privat.</p>':''}<div class="at-settings-grid"><label class="pro-field">Username<input class="pro-input" id="pro-handle" maxlength="24" autocomplete="off" placeholder="animefan01" value="${esc(p.handle||'')}"></label><label class="pro-field">Emri publik<input class="pro-input" id="pro-name" maxlength="40" value="${esc(p.display_name||ctx.accountName())}"></label><label class="pro-field">Avatar emoji<input class="pro-input" id="pro-avatar" maxlength="12" value="${esc(p.avatar_emoji||'🎌')}"></label><label class="pro-field">Foto profili · link HTTPS<input class="pro-input" id="pro-avatar-url" type="url" maxlength="500" placeholder="https://..." value="${esc(p.avatar_url||'')}"></label><label class="pro-field at-full">Bio<textarea class="pro-textarea" id="pro-bio" maxlength="280">${esc(p.bio||'')}</textarea></label></div><label class="at-privacy-setting"><input type="checkbox" id="pro-public" ${p.is_public?'checked':''}><span><strong>Bëje profilin publik</strong><small>Vetëm kur e aktivizon ti. Miqtë e pranuar mund të shohin përmbledhjen edhe në profil privat.</small></span></label><p class="pro-muted">Nuk publikohen emaili, historiku i detajuar dhe shënimet private.</p><div class="pro-actions"><button class="pro-btn primary" data-pro-action="profile-save" ${!user()?'disabled':''}>✓ Ruaj ndryshimet</button><button class="pro-btn" data-pro-action="profile-tab" data-id="overview">Kthehu te përmbledhja</button></div></section>`;
  return header+nav+(tab==='settings'?settings:tab==='stats'?statsPage():overview);
 }
 function setTab(next){if(!['overview','settings','stats'].includes(next))return;tab=next;ctx.rerender()}
 async function save(){
  if(!user()){ctx.toast('Hyr në llogari për të ruajtur profilin.');return}
  const handle=String(ctx.el('pro-handle')?.value||'').trim().toLowerCase(),name=String(ctx.el('pro-name')?.value||'').trim(),bio=String(ctx.el('pro-bio')?.value||'').trim(),avatar=String(ctx.el('pro-avatar')?.value||'🎌').trim()||'🎌',avatar_url=String(ctx.el('pro-avatar-url')?.value||'').trim(),is_public=!!ctx.el('pro-public')?.checked;
  if(!/^[a-z0-9_]{3,24}$/.test(handle)){ctx.toast('Username: 3–24 shkronja të vogla, numra ose _.');return}
  if(!name||name.length>40){ctx.toast('Emri duhet të ketë 1–40 karaktere.');return}
  if(avatar_url&&(!avatar_url.startsWith('https://')||!ctx.poster(avatar_url))){ctx.toast('Fotoja duhet të jetë link HTTPS.');return}
  const row={user_id:user().id,handle,display_name:name,bio:bio.slice(0,280),avatar_emoji:avatar.slice(0,12),avatar_url:avatar_url.slice(0,500),is_public,snapshot:snapshot(),updated_at:new Date().toISOString()};
  const r=await client().from('anime_profiles').upsert(row,{onConflict:'user_id'}).select('user_id,handle,display_name,bio,avatar_emoji,avatar_url,is_public,snapshot,created_at').single();
  if(r.error)throw r.error;profile=r.data;tab='overview';ctx.toast('Profili u ruajt në cloud ✓');ctx.rerender();
 }
 function scheduleSnapshot(){
  if(!profile||!user())return;clearTimeout(timer);
  timer=setTimeout(async()=>{const id=user()?.id;if(!id)return;try{await client().from('anime_profiles').update({snapshot:snapshot(),updated_at:new Date().toISOString()}).eq('user_id',id)}catch(e){console.warn('Snapshot sync',e)}},2200);
 }
 async function share(){if(!profile)return;try{await navigator.clipboard.writeText(location.origin+'/?profile='+encodeURIComponent(profile.handle));ctx.toast('Linku i profilit u kopjua ✓')}catch{ctx.toast('Kopjimi dështoi.')}}
 return {load,render,save,share,scheduleSnapshot,snapshot,get:()=>profile,setTab,goalSave};
};
