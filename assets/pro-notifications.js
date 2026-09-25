window.ATNotifications=function ATNotifications(ctx){
 let notices=[],read=new Set(),refreshing=false;
 const esc=ctx.esc,client=()=>ctx.client(),user=()=>ctx.user(),state=()=>ctx.state();
 function preferences(){state().preferences=state().preferences||{};const p=state().preferences;p.notificationRead=Array.isArray(p.notificationRead)?p.notificationRead:[];return p}
 function collect(){
  const out=[],now=Date.now();
  for(const e of ctx.upcoming()){
   if(!e.animeId||e.when>now||e.when<now-7*86400000)continue;
   const a=state().anime.find(x=>x.id===e.animeId);if(!a)continue;
   out.push({key:'ep:'+e.animeId+':'+(e.seasonId||e.season)+':'+e.episode,title:'⚡ Episod i ri',body:a.title+' · EP '+e.episode,at:e.when,id:a.id,season:e.seasonId||'',ep:e.seasonEpisode||e.episode});
  }
  for(const a of state().anime)for(const s of a.seasons||[])if(s.discoveredAt&&s.releaseStatus==='NOT_YET_RELEASED'){
   const at=Date.parse(s.discoveredAt);if(at>now-30*86400000)out.push({key:'season:'+a.id+':'+s.id,title:'✦ Sezon i konfirmuar',body:a.title+' · '+(s.subtitle||s.title),at,id:a.id});
  }
  return out;
 }
 async function refresh(){
  if(refreshing)return;refreshing=true;
  const items=collect();
  try{
   if(user()){
    const u=user().id;
    const f=await client().from('anime_friendships').select('id,status,created_at').eq('recipient_id',u).eq('status','pending').limit(30);
    if(!f.error)for(const x of f.data||[])items.push({key:'friend:'+x.id,title:'👥 Kërkesë miqësie',body:'Ke një kërkesë për ta pranuar.',at:Date.parse(x.created_at),page:'friends'});
    const own=await client().from('episode_comments').select('id').eq('user_id',u).limit(80);
    if(!own.error&&own.data?.length){
     const q=await client().from('episode_comments').select('id,user_id,author_name,parent_id,created_at,episode_key').in('parent_id',own.data.map(x=>x.id)).order('created_at',{ascending:false}).limit(60);
     if(!q.error)for(const x of q.data||[])if(x.user_id!==u)items.push({key:'reply:'+x.id,title:'💬 Përgjigje në komentin tënd',body:x.author_name+' iu përgjigj komentit tënd.',at:Date.parse(x.created_at),page:'notifications'});
    }
   }
  }catch(e){console.warn('Notification update',e)}
  notices=[...new Map(items.map(x=>[x.key,x])).values()].sort((a,b)=>b.at-a.at).slice(0,100);
  read=new Set(preferences().notificationRead);refreshing=false;badge();ctx.rerender();
 }
 function badge(){const n=notices.filter(x=>!read.has(x.key)).length,el=ctx.el('pro-badge');if(el){el.textContent=String(Math.min(99,n));el.classList.toggle('has',n>0)}}
 function readOne(key){read.add(key);const p=preferences();p.notificationRead=[...read].slice(-250);ctx.save();badge();ctx.rerender()}
 function readAll(){const p=preferences();for(const x of notices)read.add(x.key);p.notificationRead=[...read].slice(-250);ctx.save();badge();ctx.rerender()}
 function render(){return `<div class="pro-hero"><span class="pro-eyebrow">NEVER MISS A RELEASE</span><h2>🔔 Njoftimet</h2><p>Episodet e sapotransmetuara, sezonet e reja dhe aktiviteti i miqve.</p></div><div class="pro-row" style="margin-bottom:13px"><b>${notices.filter(x=>!read.has(x.key)).length} të palexuara</b><div class="pro-actions"><button class="pro-btn" data-pro-action="notification-read-all">✓ Lexo të gjitha</button><button class="pro-btn" data-pro-action="notification-refresh">↻ Rifresko</button></div></div><div class="pro-list">${notices.map(x=>`<div class="pro-item pro-notification ${read.has(x.key)?'':'unread'}"><div><strong>${esc(x.title)}</strong><small>${esc(x.body)} · ${esc(new Date(x.at).toLocaleString('sq-AL'))}</small></div><button class="pro-btn" data-pro-action="notification-open" data-id="${esc(x.key)}">Hap</button></div>`).join('')||'<div class="pro-empty">Nuk ka njoftime tani.</div>'}</div><p class="pro-muted">Kontrollohet në hapje dhe gjatë përdorimit. Nuk dërgon push në sfond kur aplikacioni është i mbyllur.</p>`}
 function open(key){const n=notices.find(x=>x.key===key);if(!n)return;readOne(key);if(n.id)ctx.openAnime(n.id);else if(n.page)ctx.navigate(n.page)}
 async function action(op,id){if(op==='notification-refresh')return refresh();if(op==='notification-read-all')return readAll();if(op==='notification-open')return open(id)}
 return{refresh,render,action,badge,get:()=>notices};
};
