/* AnimeTrack 13.5 — AniList / MyAnimeList Live Sync.
   Provider tokens are held by the authenticated server vault. Sync baselines also stay local; only the auto-sync toggle is part of normal preferences. */
window.ATProviderSync135=function ATProviderSync135(ctx){
 'use strict';
 const esc=ctx.esc;
 const KEYS={
  anilistToken:'animetrack_anilist_token_135',anilistUser:'animetrack_anilist_user_135',anilistClient:'animetrack_anilist_client_135',
  malToken:'animetrack_mal_token_135',malUser:'animetrack_mal_user_135',baseline:'animetrack_provider_baseline_135'
 };
 const providers=['anilist','mal'];
 let busy='',rowsByProvider={anilist:[],mal:[]},profiles={anilist:null,mal:null},messages={anilist:'',mal:''},autoTimer=null,lastAuto=0;
 const now=()=>new Date().toISOString();
 const storeGet=k=>{try{return String(localStorage.getItem(k)||'')}catch{return''}};
 const storeSet=(k,v)=>{try{if(v)localStorage.setItem(k,String(v));else localStorage.removeItem(k)}catch{}};
 const clean=s=>String(s||'').replace(/\s+/g,' ').trim().slice(0,180);
 const num=(v,max=10000)=>Math.max(0,Math.min(max,Math.floor(Number(v)||0)));
 const rating=v=>{const n=Number(v);return Number.isFinite(n)&&n>0?Math.max(.5,Math.min(10,Math.round(n*2)/2)):null};
 let owner='',serverProviders=new Set(),connectionReady=false,oauthPending=null;
 const legacyTokens={anilist:storeGet(KEYS.anilistToken),mal:storeGet(KEYS.malToken)};
 // Old credentials are offered once for an explicit transfer, never silently assigned to an account.
 storeSet(KEYS.anilistToken,'');storeSet(KEYS.malToken,'');
 const token=p=>serverProviders.has(p);
 const serverCall=payload=>ctx.accountService.call(payload);
 async function onAccount(){
  const uid=ctx.user?.()?.id||'';if(owner!==uid){owner=uid;serverProviders=new Set();connectionReady=false;profiles={anilist:null,mal:null};rowsByProvider={anilist:[],mal:[]}}
  if(!uid){oauthPending=null;return;}
  try{const r=await serverCall({action:'status'});if(owner!==uid)return;serverProviders=new Set(r.providers||[]);connectionReady=true;
   if(oauthPending&&oauthPending.owner===uid){const pending=oauthPending;oauthPending=null;await connectToken('anilist',pending.token)}
  }catch{connectionReady=false}
 }
 async function connectToken(provider,value){
  const uid=ctx.user?.()?.id;if(!uid)throw Error('Hyr në llogari për të lidhur provider-in.');
  const r=await serverCall({action:'connect',provider,token:value});if(ctx.user?.()?.id!==uid)return;
  owner=uid;serverProviders.add(provider);profiles[provider]=r.profile;legacyTokens[provider]='';connectionReady=true;messages[provider]='Lidhja u ruajt në server ✓';ctx.rerender(true);
 }
 const username=p=>storeGet(p==='anilist'?KEYS.anilistUser:KEYS.malUser);
 const connected=p=>!!(token(p)||username(p));
 const writeable=p=>!!token(p);

 function appStatus(v){
  const s=String(v||'').toUpperCase();
  if(['CURRENT','WATCHING','REPEATING'].includes(s))return'watching';
  if(['COMPLETED','FINISHED'].includes(s))return'completed';
  if(['PAUSED','ON_HOLD','ONHOLD'].includes(s))return'paused';
  if(s==='DROPPED')return'dropped';
  return'planning';
 }
 function remoteStatus(provider,v){
  const s=String(v||'planning');
  if(provider==='anilist')return({watching:'CURRENT',completed:'COMPLETED',paused:'PAUSED',dropped:'DROPPED',planning:'PLANNING'})[s]||'PLANNING';
  return({watching:'watching',completed:'completed',paused:'on_hold',dropped:'dropped',planning:'plan_to_watch'})[s]||'plan_to_watch';
 }
 function contiguous(watched){
  const set=new Set((Array.isArray(watched)?watched:[]).map(Number).filter(n=>Number.isInteger(n)&&n>0));let n=0;while(set.has(n+1))n++;return n;
 }
 function localStatus(anime,season,progress){
  const total=num(season?.total||anime?.total);
  if(total&&progress>=total)return'completed';
  if(progress>0&&anime?.status!=='dropped'&&anime?.status!=='paused')return'watching';
  return ['watching','completed','paused','dropped','planning'].includes(anime?.status)?anime.status:'planning';
 }
 function localEntries(provider){
  const out=[],seen=new Set();
  for(const anime of ctx.state()?.anime||[]){
   const seasons=(anime.seasons||[]).filter(s=>!s.hidden);
   for(const season of seasons){
    const al=season.source==='AniList'&&/^\d+$/.test(String(season.sourceId||''))?String(season.sourceId):'';
    const mal=/^\d+$/.test(String(season.malId||''))?String(season.malId):season.source==='MyAnimeList'&&/^\d+$/.test(String(season.sourceId||''))?String(season.sourceId):'';
    let id=provider==='anilist'?al:mal;
    if(!id&&seasons.length===1){
     if(provider==='anilist'&&anime.source==='AniList'&&/^\d+$/.test(String(anime.sourceId||'')))id=String(anime.sourceId);
     if(provider==='mal')id=/^\d+$/.test(String(anime.malId||''))?String(anime.malId):anime.source==='MyAnimeList'&&/^\d+$/.test(String(anime.sourceId||''))?String(anime.sourceId):'';
    }
    if(!id)continue;
    const key=provider+':'+id;if(seen.has(key))continue;seen.add(key);
    const progress=contiguous(season.watched),score=rating(season.myRating??(seasons.length===1?anime.rating:null));
    out.push({key,provider,providerId:id,malId:mal,animeId:anime.id,seasonId:season.id,title:season.subtitle||anime.title,total:num(season.total||anime.total),snapshot:{status:localStatus(anime,season,progress),progress,score},updatedAt:anime.updatedAt||anime.createdAt||''});
   }
  }
  return out;
 }
 const fp=s=>JSON.stringify({status:appStatus(s?.status),progress:num(s?.progress),score:rating(s?.score)});
 function baseline(){
  try{const b=JSON.parse(localStorage.getItem(KEYS.baseline)||'{}');return b&&typeof b==='object'?b:{}}catch{return{}}
 }
 function saveBaseline(value){try{localStorage.setItem(KEYS.baseline,JSON.stringify(value||{}))}catch{}}
 function decision(provider,key,local,remote){
  if(local&&!remote)return'local-only';
  if(!local&&remote)return'remote-only';
  if(!local&&!remote)return'same';
  const lf=fp(local.snapshot),rf=fp(remote.snapshot);if(lf===rf)return'same';
  const base=baseline()[provider+':'+key];if(!base)return'conflict';
  const lc=lf!==base.local,rc=rf!==base.remote;
  if(!lc&&rc)return'pull';
  if(lc&&!rc)return'push';
  if(lc&&rc&&lf===rf)return'same';
  return'conflict';
 }
 function analyzeSnapshots(provider,local,remote){
  const locals=Array.isArray(local)?local:[],remotes=Array.isArray(remote)?remote:[],used=new Set(),out=[];
  const byId=new Map(locals.map(x=>[String(x.providerId),x])),byMal=new Map(locals.filter(x=>x.malId).map(x=>[String(x.malId),x]));
  for(const r of remotes){
   const l=byId.get(String(r.providerId))||(r.malId?byMal.get(String(r.malId)):null);if(l)used.add(l.key);
   const key=String(r.providerId||r.malId||r.title);
   out.push({key,provider,local:l||null,remote:r,decision:decision(provider,key,l,r)});
  }
  for(const l of locals)if(!used.has(l.key))out.push({key:String(l.providerId),provider,local:l,remote:null,decision:'local-only'});
  return out.sort((a,b)=>({conflict:0,pull:1,push:2,'remote-only':3,'local-only':4,same:5}[a.decision]??9)-({conflict:0,pull:1,push:2,'remote-only':3,'local-only':4,same:5}[b.decision]??9)||String(a.local?.title||a.remote?.title).localeCompare(String(b.local?.title||b.remote?.title)));
 }
 function updateBaseline(provider,rows){
  const b=baseline();
  for(const row of rows||[])if(row.local&&row.remote)b[provider+':'+row.key]={local:fp(row.local.snapshot),remote:fp(row.remote.snapshot),at:Date.now()};
  saveBaseline(b);
 }
 async function aniGql(query,variables={}){
  const headers={'Content-Type':'application/json',Accept:'application/json'};
  const r=await fetch('https://graphql.anilist.co',{method:'POST',headers,body:JSON.stringify({query,variables})}),j=await r.json().catch(()=>({}));
  if(!r.ok||j.errors?.length)throw Error(j.errors?.[0]?.message||'AniList HTTP '+r.status);return j.data||{};
 }
 function mapAniMedia(m){
  return{source:'AniList',sourceId:String(m.id),malId:String(m.idMal||''),title:m.title?.english||m.title?.romaji||'Anime',total:num(m.episodes),format:String(m.format||'TV').replaceAll('_',' '),year:m.seasonYear||null,cover:m.coverImage?.large||'',genre:(m.genres||[]).join(', '),score:m.averageScore||null,sourceUrl:m.siteUrl||''};
 }
 async function fetchAniList(){
  const auth=token('anilist'),user=clean(username('anilist'));let profile=null,userId=null,userName=user;
  if(auth){profile=await serverCall({action:'provider',provider:'anilist',operation:'me'});if(!profile)throw Error('AniList token i pavlefshëm.');userId=profile.id;userName=profile.name;storeSet(KEYS.anilistUser,userName)}
  if(!userId&&!userName)throw Error('Vendos username ose access token AniList.');
  const query='query($userId:Int,$userName:String){MediaListCollection(type:ANIME,userId:$userId,userName:$userName){lists{entries{id mediaId status score(format:POINT_10) progress repeat updatedAt media{id idMal title{romaji english} episodes format seasonYear coverImage{large} genres averageScore siteUrl}}}}}';
  const data=auth?await serverCall({action:'provider',provider:'anilist',operation:'list'}):await aniGql(query,{userId,userName:userId?null:userName}),all=[];
  for(const list of data.MediaListCollection?.lists||[])for(const e of list.entries||[]){const media=mapAniMedia(e.media||{});all.push({provider:'anilist',providerId:String(e.mediaId||e.media?.id||''),malId:media.malId,title:media.title,total:media.total,media,snapshot:{status:appStatus(e.status),progress:num(e.progress),score:rating(e.score)},updatedAt:Number(e.updatedAt||0)*1000,entryId:e.id})}
  const uniq=new Map();for(const x of all)if(x.providerId)uniq.set(x.providerId,x);
  return{profile:profile||{name:userName},entries:[...uniq.values()],canWrite:!!auth};
 }
 async function fetchMalToken(){
  const auth=token('mal');if(!auth)return null;
  const me=await serverCall({action:'provider',provider:'mal',operation:'me'});
  const entries=[];for(let offset=0;offset<10000;offset+=1000){const j=await serverCall({action:'provider',provider:'mal',operation:'list',offset});for(const row of j.data||[]){const n=row.node||{},s=row.list_status||{};entries.push({provider:'mal',providerId:String(n.id||''),malId:String(n.id||''),title:n.title||'Anime',total:num(n.num_episodes),media:{source:'MyAnimeList',sourceId:String(n.id||''),malId:String(n.id||''),title:n.title||'Anime',total:num(n.num_episodes),format:n.media_type||'TV',year:Number(String(n.start_date||'').slice(0,4))||null,cover:n.main_picture?.large||n.main_picture?.medium||'',genre:'',score:n.mean?Math.round(Number(n.mean)*10):null,sourceUrl:'https://myanimelist.net/anime/'+n.id},snapshot:{status:appStatus(s.status),progress:num(s.num_episodes_watched),score:rating(s.score)},updatedAt:Date.parse(s.updated_at||'')||0})}if((j.data||[]).length<1000)break}
  return{profile:{name:me.name||username('mal'),picture:me.picture||''},entries,canWrite:true};
 }
 async function fetchMalPublic(){
  const user=clean(username('mal'));if(!user)throw Error('Vendos MAL username ose access token.');
  const entries=[];
  for(let page=1;page<=40;page++){const r=await fetch('https://api.jikan.moe/v4/users/'+encodeURIComponent(user)+'/animelist?limit=25&page='+page),j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.message||'Jikan HTTP '+r.status);for(const row of j.data||[]){const n=row.anime||row.entry||row,s=row;const id=n.mal_id||n.id;if(!id)continue;entries.push({provider:'mal',providerId:String(id),malId:String(id),title:n.title||'Anime',total:num(n.episodes||n.num_episodes),media:{source:'MyAnimeList',sourceId:String(id),malId:String(id),title:n.title||'Anime',total:num(n.episodes||n.num_episodes),format:n.type||'TV',year:n.year||null,cover:n.images?.jpg?.large_image_url||n.images?.jpg?.image_url||'',genre:'',score:n.score?Math.round(Number(n.score)*10):null,sourceUrl:n.url||'https://myanimelist.net/anime/'+id},snapshot:{status:appStatus(row.status),progress:num(row.episodes_seen??row.watched_episodes??row.num_episodes_watched),score:rating(row.score)},updatedAt:0})}if(!j.pagination?.has_next_page)break;await new Promise(r=>setTimeout(r,120))}
  return{profile:{name:user},entries,canWrite:false};
 }
 async function fetchRemote(provider){return provider==='anilist'?fetchAniList():(await fetchMalToken())||fetchMalPublic()}
 async function pushRemote(provider,row){
  if(!row?.local||!writeable(provider))throw Error('Ky provider nuk është lidhur me access token.');
  const s=row.local.snapshot,id=row.local.providerId;
  if(provider==='anilist'){
   const query='mutation($mediaId:Int!,$status:MediaListStatus,$score:Float,$progress:Int){SaveMediaListEntry(mediaId:$mediaId,status:$status,score:$score,progress:$progress){id mediaId status score(format:POINT_10) progress updatedAt}}';
   await serverCall({action:'provider',provider:'anilist',operation:'update',id:Number(id),status:remoteStatus('anilist',s.status),score:s.score||0,progress:num(s.progress)});return true;
  }
  await serverCall({action:'provider',provider:'mal',operation:'update',id:Number(id),status:remoteStatus('mal',s.status),progress:num(s.progress),score:s.score||0});return true;
 }
 function importRows(rows){
  const payload=(rows||[]).map(row=>({title:row.remote.title,status:row.remote.snapshot.status,progress:row.remote.snapshot.progress,total:row.remote.total,rating:row.remote.snapshot.score,source:row.remote.media.source,sourceId:row.remote.media.sourceId,malId:row.remote.media.malId,format:row.remote.media.format,year:row.remote.media.year,cover:row.remote.media.cover,genre:row.remote.media.genre,sourceUrl:row.remote.media.sourceUrl,communityScore:row.remote.media.score}));
  return payload.length?ctx.importExternal(payload):{added:0};
 }
 function findLocalForRemote(provider,remote){
  return analyzeSnapshots(provider,localEntries(provider),[remote])[0]?.local||null;
 }
 function applyRemoteToLocal(provider,row){
  if(!row?.remote)return false;let local=row.local;
  if(!local){const result=importRows([row]);if(result?.error)throw Error(result.error);local=findLocalForRemote(provider,row.remote);if(!local)return false}
  const state=ctx.state(),anime=state.anime.find(x=>x.id===local.animeId),season=anime?.seasons?.find(x=>x.id===local.seasonId);if(!anime||!season)return false;
  const s=row.remote.snapshot,progress=num(s.progress),total=num(row.remote.total||season.total);
  season.total=Math.max(total,progress);season.watched=Array.from({length:progress},(_,i)=>i+1);season.myRating=rating(s.score);
  if(anime.seasons.filter(x=>!x.hidden).length===1){anime.status=appStatus(s.status);anime.rating=rating(s.score)}
  else{const visible=anime.seasons.filter(x=>!x.hidden),allDone=visible.length&&visible.every(x=>x.total&&contiguous(x.watched)>=x.total),anyStarted=visible.some(x=>contiguous(x.watched)>0);if(allDone)anime.status='completed';else if(anyStarted&&anime.status==='planning')anime.status='watching'}
  anime.updatedAt=now();state.history.push({eventId:ctx.uuid(),id:anime.id,seasonId:season.id,episode:progress,action:'provider-sync',date:now(),provider});
  return true;
 }
 async function analyze(provider){
  const remote=await fetchRemote(provider);profiles[provider]=remote.profile;const rows=analyzeSnapshots(provider,localEntries(provider),remote.entries);rowsByProvider[provider]=rows;return{...remote,rows};
 }
 async function sync(provider,{auto=false,quiet=false}={}){
  if(busy)return{status:'busy'};busy=provider;if(!quiet){messages[provider]='Po krahasohen listat…';ctx.rerender(true)}
  try{
   const first=await analyze(provider),safe=first.rows.filter(r=>auto?['pull','push'].includes(r.decision):['pull','push','remote-only','local-only'].includes(r.decision));
   const pull=safe.filter(r=>['pull','remote-only'].includes(r.decision)),push=safe.filter(r=>['push','local-only'].includes(r.decision));
   let changed=false;if(pull.length){for(const row of pull)changed=applyRemoteToLocal(provider,row)||changed;if(changed&&!ctx.save())throw Error('Ruajtja lokale dështoi.')}
   let pushed=0;if(writeable(provider)){for(const row of push){await pushRemote(provider,row);pushed++;if(provider==='mal')await new Promise(r=>setTimeout(r,90))}}
   const second=await analyze(provider);updateBaseline(provider,second.rows.filter(r=>r.local&&r.remote&&r.decision==='same'));
   const conflicts=second.rows.filter(r=>r.decision==='conflict').length;messages[provider]=(auto?'Auto-sync':'Sync')+' ✓ · '+pull.length+' pull · '+pushed+' push'+(conflicts?' · '+conflicts+' konflikt(e)':'');
   if(!quiet){ctx.rerender(true);ctx.toast(messages[provider])}return{status:'ok',pull:pull.length,push:pushed,conflicts,rows:second.rows};
  }catch(err){messages[provider]='Gabim: '+String(err.message||err);if(!quiet){ctx.rerender(true);ctx.toast(messages[provider])}return{status:'error',error:String(err.message||err)}
  }finally{busy=''}
 }
 async function resolve(provider,key,direction){
  if(busy)return;busy=provider;messages[provider]='Po zgjidhet konflikti…';ctx.rerender(true);
  try{const current=await analyze(provider),row=current.rows.find(x=>x.key===String(key));if(!row)throw Error('Hyrja nuk u gjet.');
   if(direction==='pull'){if(!applyRemoteToLocal(provider,row))throw Error('Ndryshimi lokal nuk u aplikua.');if(!ctx.save())throw Error('Ruajtja lokale dështoi.')}else await pushRemote(provider,row);
   const next=await analyze(provider);updateBaseline(provider,next.rows.filter(r=>r.local&&r.remote&&r.decision==='same'));messages[provider]='Konflikti u zgjidh ✓';ctx.rerender(true);
  }catch(err){messages[provider]='Gabim: '+String(err.message||err);ctx.rerender(true)}finally{busy=''}
 }
 async function testConnection(provider){
  if(busy)return;busy=provider;messages[provider]='Po kontrollohet lidhja…';ctx.rerender(true);try{const r=await fetchRemote(provider);profiles[provider]=r.profile;messages[provider]='Lidhja funksionon ✓ · '+r.entries.length+' hyrje';ctx.rerender(true)}catch(err){messages[provider]='Lidhja dështoi: '+String(err.message||err);ctx.rerender(true)}finally{busy=''}
 }
 async function saveCredentials(provider){
  const root=document.getElementById('at135-'+provider),u=root?.querySelector('[data-at135-user]')?.value.trim()||'',field=root?.querySelector('[data-at135-token]'),t=field?.value.trim()||'';
  storeSet(provider==='anilist'?KEYS.anilistUser:KEYS.malUser,u);
  try{if(t)await connectToken(provider,t);if(field)field.value='';await testConnection(provider)}catch(e){messages[provider]=e.message;ctx.rerender(true)}finally{if(field)field.value=''}
 }
 async function migrate(provider){try{const t=legacyTokens[provider];if(!t)return;await connectToken(provider,t);await testConnection(provider)}catch(e){messages[provider]=e.message;ctx.rerender(true)}}
 async function disconnect(provider){try{await serverCall({action:'disconnect',provider});serverProviders.delete(provider);profiles[provider]=null;rowsByProvider[provider]=[];messages[provider]='Token-i u hoq nga serveri. Revokoje edhe te provider-i nëse dëshiron ta çaktivizosh.';ctx.rerender(true)}catch(e){messages[provider]=e.message;ctx.rerender(true)}}
 function setAuto(enabled){const state=ctx.state();state.preferences=state.preferences||{};const before=!!state.preferences.providerAutoSync;state.preferences.providerAutoSync=!!enabled;if(!ctx.save())state.preferences.providerAutoSync=before;ctx.rerender(true)}
 async function auto(){
  if(!connectionReady&&ctx.user?.())await onAccount();
  if(!ctx.state()?.preferences?.providerAutoSync||busy||document.visibilityState==='hidden'||!navigator.onLine||Date.now()-lastAuto<8*60000)return;lastAuto=Date.now();
  for(const provider of providers)if(connected(provider))await sync(provider,{auto:true,quiet:true});
  ctx.rerender?.();
 }
 function oauthAniList(){
  if(!ctx.user?.()){messages.anilist='Hyr në llogari për OAuth.';ctx.rerender(true);return}
  const root=document.getElementById('at135-anilist'),raw=root?.querySelector('[data-at135-client]')?.value.trim()||storeGet(KEYS.anilistClient);if(!/^\d+$/.test(raw)){messages.anilist='Vendos AniList Client ID.';ctx.rerender(true);return}
  storeSet(KEYS.anilistClient,raw);sessionStorage.setItem('animetrack_anilist_oauth_135',JSON.stringify({at:Date.now(),owner:ctx.user().id}));location.href='https://anilist.co/api/v2/oauth/authorize?client_id='+encodeURIComponent(raw)+'&response_type=token';
 }
 function captureAniListOAuth(){
  let attempt;try{attempt=JSON.parse(sessionStorage.getItem('animetrack_anilist_oauth_135')||'null')}catch{return false}
  const started=attempt?.at;
  if(!attempt?.owner||!started||Date.now()-started>10*60*1000||Date.now()<started||!location.hash.includes('access_token=')||location.hash.includes('refresh_token='))return false;
  sessionStorage.removeItem('animetrack_anilist_oauth_135');const p=new URLSearchParams(location.hash.slice(1)),t=p.get('access_token');if(!t)return false;
  history.replaceState(null,'',location.pathname+location.search);oauthPending={owner:attempt.owner,token:t};messages.anilist='Po lidhet AniList me serverin…';return true;
 }
 function counts(rows){const c={same:0,pull:0,push:0,conflict:0,'remote-only':0,'local-only':0};for(const r of rows||[])c[r.decision]=(c[r.decision]||0)+1;return c}
 const badge=d=>({same:'Në sinkron',pull:'← Merr',push:'Dërgo →',conflict:'Konflikt','remote-only':'Vetëm provider','local-only':'Vetëm AnimeTrack'})[d]||d;
 function rowHTML(provider,row){
  const title=row.local?.title||row.remote?.title||'Anime',l=row.local?.snapshot,r=row.remote?.snapshot;
  const cell=s=>s?'<strong>'+esc(s.status)+'</strong><small>'+num(s.progress)+' ep.'+(rating(s.score)?' · ★ '+rating(s.score):'')+'</small>':'<strong>—</strong><small>Nuk ekziston</small>';
  const actions=row.decision==='conflict'?'<button type="button" class="ghost" data-at135-resolve="pull" data-provider="'+provider+'" data-key="'+esc(row.key)+'">← Përdor provider</button>'+(writeable(provider)?'<button type="button" class="ghost" data-at135-resolve="push" data-provider="'+provider+'" data-key="'+esc(row.key)+'">Përdor AnimeTrack →</button>':''):'';
  return'<article class="at135-row '+esc(row.decision)+'"><div class="at135-title"><span class="at135-decision">'+esc(badge(row.decision))+'</span><strong>'+esc(title)+'</strong><small>ID '+esc(row.remote?.providerId||row.local?.providerId||'')+'</small></div><div class="at135-side"><span>AnimeTrack</span>'+cell(l)+'</div><div class="at135-arrow">⇄</div><div class="at135-side"><span>'+esc(provider==='anilist'?'AniList':'MAL')+'</span>'+cell(r)+'</div><div class="at135-actions">'+actions+'</div></article>';
 }
 function providerCard(provider){
  const name=provider==='anilist'?'AniList':'MyAnimeList',user=username(provider),has=writeable(provider),profile=profiles[provider],rows=rowsByProvider[provider],c=counts(rows),client=storeGet(KEYS.anilistClient);
  return'<section class="at135-provider" id="at135-'+provider+'"><header><div class="at135-logo '+provider+'">'+(provider==='anilist'?'AL':'MAL')+'</div><div><h3>'+name+'</h3><p>'+(has?'Lexim + shkrim · token në server':user?'Read-only me username':'Pa lidhje')+'</p></div><span class="at135-state '+(connected(provider)?'on':'')+'">'+(connected(provider)?'● Lidhur':'○ Jo lidhur')+'</span></header><div class="at135-connect"><label>Username<input data-at135-user value="'+esc(user)+'" placeholder="'+(provider==='anilist'?'AniList username':'MAL username')+'"></label>'+(provider==='anilist'?'<label>Client ID opsional<input data-at135-client value="'+esc(client)+'" inputmode="numeric" placeholder="Për OAuth implicit"></label>':'')+'<label class="at135-token-field">Access token për lidhje me serverin<input data-at135-token type="password" autocomplete="off" placeholder="'+(has?'Token në server · lëre bosh për ta mbajtur':'Aktivizon two-way sync')+'"></label><div class="at135-connect-actions"><button type="button" class="primary" data-at135-action="save" data-provider="'+provider+'">Ruaj & testo</button>'+(provider==='anilist'?'<button type="button" class="ghost" data-at135-action="oauth" data-provider="anilist">Lidhu me OAuth ↗</button>':'')+(legacyTokens[provider]?'<button type="button" class="ghost" data-at135-action="migrate" data-provider="'+provider+'">Transfero token-in e vjetër në këtë llogari</button>':'')+(has?'<button type="button" class="ghost danger" data-at135-action="disconnect" data-provider="'+provider+'">Hiq token</button>':'')+'</div></div>'+(profile?'<div class="at135-profile-mini"><strong>'+esc(profile.name||user)+'</strong><span>'+rows.length+' hyrje të krahasuara</span></div>':'')+'<div class="at135-syncbar"><div><b>'+c.conflict+'</b><small>konflikte</small></div><div><b>'+c.pull+'</b><small>pull</small></div><div><b>'+c.push+'</b><small>push</small></div><div><b>'+c['remote-only']+'</b><small>vetëm provider</small></div><button type="button" class="primary" data-at135-action="sync" data-provider="'+provider+'" '+(!connected(provider)||busy?'disabled':'')+'>↻ Sync tani</button></div>'+(messages[provider]?'<p class="at135-message">'+esc(messages[provider])+'</p>':'')+(rows.length?'<div class="at135-rows">'+rows.filter(x=>x.decision!=='same').slice(0,80).map(x=>rowHTML(provider,x)).join('')+(rows.every(x=>x.decision==='same')?'<div class="at135-all-good">✓ Gjithçka është në sinkron.</div>':'')+'</div>':'')+'</section>';
 }
 function render(){
  const autoOn=!!ctx.state()?.preferences?.providerAutoSync;
  return'<section class="at135-page"><header class="at135-hero"><div><span class="eyebrow">ANIMETRACK 13.5</span><h2>MAL / AniList Live Sync ⇄</h2><p>Krahaso progresin, statusin dhe rating-un. Pas baseline-it të parë, AnimeTrack zbulon cila anë ndryshoi dhe sinkronizon vetëm drejtimin e sigurt; konfliktet nuk mbishkruhen automatikisht.</p></div><label class="at135-auto"><input type="checkbox" id="at135-auto" '+(autoOn?'checked':'')+'><span><strong>Auto Live Sync</strong><small>Kontroll çdo ~10 min kur app-i është aktiv</small></span></label></header><div class="at135-security">🔒 Token-at ruhen të enkriptuar në server dhe lidhen me llogarinë tënde. OAuth implicit i AniList kalon token-in përkohësisht në shfletues para transferimit; nuk ruhet në localStorage. Kodi në faqe ende mund të kryejë veprime gjatë sesionit tënd. Mund të përdorësh vetëm username për lexim. “Hiq token” e heq lidhjen; revokoje te provider-i për ta çaktivizuar plotësisht.</div>'+providerCard('anilist')+providerCard('mal')+'<section class="at135-how"><h3>Si zgjidhen ndryshimet</h3><div><span><b>← Merr</b> Provider-i ndryshoi, AnimeTrack jo.</span><span><b>Dërgo →</b> AnimeTrack ndryshoi, provider-i jo.</span><span><b>Konflikt</b> Të dy ndryshuan; ti zgjedh cilën anë të mbash.</span><span><b>Remote-only</b> Shtohet në AnimeTrack vetëm gjatë Sync manual.</span></div><p>AniList mutations kërkojnë autentikim OAuth; access token-at janë long-lived dhe AniList nuk ofron refresh token. MAL write sync kërkon OAuth access token; pa të, username/Jikan përdoret vetëm për lexim.</p></section></section>';
 }
 function profileCard(){
  const names=providers.filter(connected).map(p=>p==='anilist'?'AniList':'MAL');
  return'<section class="at135-profile-card"><div><span class="eyebrow">LIVE SYNC 13.5</span><strong>'+esc(names.length?names.join(' + ')+' i lidhur':'Lidh MAL ose AniList')+'</strong><small>Progres · status · rating · konflikte të kontrolluara</small></div><button type="button" class="ghost" data-pro-page="sync">Hap Live Sync →</button></section>';
 }
 function mount(){
  captureAniListOAuth();
  document.addEventListener('change',e=>{if(e.target?.id==='at135-auto')setAuto(e.target.checked)});
  document.addEventListener('click',e=>{const b=e.target.closest('[data-at135-action]');if(!b)return;const action=b.dataset.at135Action,p=b.dataset.provider;
   if(action==='open')return;if(action==='save')void saveCredentials(p);if(action==='migrate')void migrate(p);if(action==='disconnect')void disconnect(p);if(action==='sync')void sync(p);if(action==='oauth')oauthAniList();
  });
  document.addEventListener('click',e=>{const b=e.target.closest('[data-at135-resolve]');if(b)void resolve(b.dataset.provider,b.dataset.key,b.dataset.at135Resolve)});
  autoTimer=setInterval(()=>void auto(),10*60000);window.addEventListener('focus',()=>void auto());window.addEventListener('online',()=>void auto());
  setTimeout(()=>void auto(),2500);
 }
 return{render,profileCard,mount,onAccount,auto,sync,resolve,analyze,fetchRemote,localEntries,analyzeSnapshots,decision,appStatus,remoteStatus,contiguous,connected,writeable};
};
