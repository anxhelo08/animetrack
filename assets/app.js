(()=>{'use strict';
let KEY='animetrack_v1';
const STATUS={watching:'Po shikoj',completed:'Përfunduar',planning:'Në listë',paused:'Në pauzë',dropped:'E lënë'};
const $=id=>document.getElementById(id);
let accountMode='guest',accountUser=null,cloudClient=null,cloudTimer=null,cloudDirty=false,cloudSaving=false,cloudLastSync='',cloudConnected=false,accountBusy=false;
let state=load(),filter='all',search='',sort='updated',detailId=null,episodePage=0,activeSeasonId=null,toastTimeout,selectedGenre='all';
let view='home', previewKey=null, pendingEpisode=null, airingWindow=7, upcomingEntries=[], upcomingFailures=0, upcomingCheckedAt=0, upcomingBusy=false;
function escapeHTML(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function validPoster(s){try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
function uuid(){return (globalThis.crypto&&crypto.randomUUID)?crypto.randomUUID():'anime-'+Date.now()+'-'+Math.random().toString(36).slice(2);}
function now(){return new Date().toISOString();}
// Seasons remain local; online catalog metadata is fetched only when requested.
function genresOf(a){return [...new Set(String(a?.genre||'').split(',').map(g=>g.trim()).filter(Boolean).map(g=>g.slice(0,55)))]}
function genreCounts(){const m=new Map();for(const a of state.anime)for(const g of genresOf(a)){const key=g.toLocaleLowerCase(),old=m.get(key);m.set(key,{name:old?.name||g,count:(old?.count||0)+1})}return [...m.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name))}
function mediaFormat(value){
 const raw=String(value||'TV').trim().toUpperCase().replace(/[\s-]+/g,'_');
 if(raw==='FILM'||raw==='MOVIE')return 'MOVIE';
 if(raw==='TV_SPECIAL')return 'SPECIAL';
 return raw||'TV';
}
function isMovieAnime(a){return mediaFormat(a?.format)==='MOVIE'||(Array.isArray(a?.seasons)&&a.seasons.length===1&&mediaFormat(a.seasons[0]?.format)==='MOVIE')}
function isConfirmedFutureSeason(s){return !!s&&['TV','TV_SHORT','ONA'].includes(mediaFormat(s.format))&&String(s.releaseStatus||'').toUpperCase()==='NOT_YET_RELEASED'}
function futureSeasonOf(a){return a?.status==='completed'?(a.seasons||[]).find(isConfirmedFutureSeason)||null:null}
function tidyNums(values,total=0){return [...new Set((Array.isArray(values)?values:[]).map(Number).filter(n=>Number.isInteger(n)&&n>0&&n<=10000&&(!total||n<=total)))].sort((a,b)=>a-b)}
function normSeason(raw,idx=0){const total=Math.max(0,Math.min(10000,parseInt(raw?.total,10)||0));return {id:String(raw?.id||'manual-'+(idx+1)).slice(0,65),title:String(raw?.title||'Sezoni '+(idx+1)).slice(0,180),subtitle:String(raw?.subtitle||'').slice(0,180),total,watched:tidyNums(raw?.watched,total),year:Number(raw?.year)||null,source:String(raw?.source||'').slice(0,20),sourceId:String(raw?.sourceId||'').slice(0,30),malId:String(raw?.malId||'').slice(0,30),format:mediaFormat(raw?.format||'TV'),globalStart:Math.max(0,Number(raw?.globalStart)||0),episodes:(Array.isArray(raw?.episodes)?raw.episodes:[]).filter(e=>e&&Number.isInteger(Number(e.number))&&Number(e.number)>0).slice(0,10000).map(e=>({number:Number(e.number),absolute:Number(e.absolute)||0,title:String(e.title||'').slice(0,220),aired:String(e.aired||'').slice(0,40),airedAt:String(e.airedAt||'').slice(0,60),summary:String(e.summary||'').slice(0,2500),image:validPoster(e.image||''),url:validPoster(e.url||''),tvmazeEpisodeId:String(e.tvmazeEpisodeId||'').slice(0,30),filler:!!e.filler,recap:!!e.recap,detailsCheckedAt:String(e.detailsCheckedAt||'').slice(0,40),myNote:String(e.myNote||'').slice(0,1500),personalRating:e.personalRating==null?null:Math.max(1,Math.min(10,Number(e.personalRating)||1))})),loadedPages:[...new Set((Array.isArray(raw?.loadedPages)?raw.loadedPages:[]).filter(n=>Number.isInteger(n)&&n>0&&n<=500))],epPage:Math.max(0,Math.min(500,parseInt(raw?.epPage,10)||0)),hasMore:!!raw?.hasMore,myRating:raw?.myRating==null||raw.myRating===''?null:Math.min(10,Math.max(0,Number(raw.myRating)||0)),communityScore:Number.isFinite(Number(raw?.communityScore))&&raw?.communityScore!=null?Math.max(0,Math.min(100,Number(raw.communityScore))):null,communitySource:String(raw?.communitySource||'').slice(0,25),discoveredAt:String(raw?.discoveredAt||'').slice(0,40),releaseStatus:String(raw?.releaseStatus||'').slice(0,32),releaseStart:String(raw?.releaseStart||'').slice(0,32),nextAiringAt:Math.max(0,Number(raw?.nextAiringAt)||0),nextAiringEpisode:Math.max(0,Number(raw?.nextAiringEpisode)||0),airedCount:raw?.airedCount==null?null:Math.max(0,Number(raw.airedCount)||0),airedCheckedAt:String(raw?.airedCheckedAt||'').slice(0,40),imdbId:/^tt\d{5,12}$/.test(String(raw?.imdbId||''))?String(raw.imdbId):'',imdbSeasonNumber:Math.max(1,Math.min(200,Number(raw?.imdbSeasonNumber)||idx+1)),imdbEpisodeAverage:raw?.imdbEpisodeAverage==null?null:(Number.isFinite(Number(raw.imdbEpisodeAverage))?Math.max(0,Math.min(10,Number(raw.imdbEpisodeAverage))):null),imdbEpisodeCount:Math.max(0,Number(raw?.imdbEpisodeCount)||0),imdbCheckedAt:String(raw?.imdbCheckedAt||'').slice(0,40)};}
// 9.3: "planned" is never the denominator of viewing progress.
function mediaStartIso(d){if(!d?.year)return '';return [String(d.year),String(d.month||1).padStart(2,'0'),String(d.day||1).padStart(2,'0')].join('-')}
function releaseFromMedia(s,m){
 if(!s||!m)return;
 if(m.status)s.releaseStatus=String(m.status).toUpperCase().replace(/\s+/g,'_');
 if(m.startDate?.year)s.releaseStart=mediaStartIso(m.startDate);
 const next=m.nextAiringEpisode;
 if(next?.episode&&next?.airingAt){s.nextAiringEpisode=Math.max(0,Number(next.episode)||0);s.nextAiringAt=Math.max(0,Number(next.airingAt)||0);s.airedCount=Math.max(0,s.nextAiringEpisode-(Date.now()<s.nextAiringAt*1000?1:0));}
 else if(s.releaseStatus==='FINISHED'||s.releaseStatus==='FINISHED_AIRING'){s.airedCount=Math.max(0,Number(m.episodes)||s.total||0);s.nextAiringEpisode=0;s.nextAiringAt=0;}
 else if(s.releaseStatus==='NOT_YET_RELEASED'||s.releaseStatus==='NOT_YET_AIRED'){s.airedCount=0;s.nextAiringEpisode=0;s.nextAiringAt=0;}
 else if(s.releaseStatus==='RELEASING'){s.nextAiringEpisode=0;s.nextAiringAt=0;}
 s.airedCheckedAt=now();
}
function releasedCount(s, at=Date.now()){
 const maxWatched=Math.max(0,...(s?.watched||[]));if(!s)return 0;
 const total=Math.max(0,Number(s.total)||0),status=String(s.releaseStatus||'').toUpperCase();
 if(s.source==='TVmaze'&&s.episodes?.length){
  let dated=0;
  for(const ep of s.episodes){let passed=false;
   if(ep.airedAt){let t=Date.parse(ep.airedAt);passed=Number.isFinite(t)&&t<=at;}
   else if(/^\d{4}-\d{2}-\d{2}$/.test(ep.aired||'')){passed=ep.aired<new Date(at).toISOString().slice(0,10);}
   if(passed)dated=Math.max(dated,Number(ep.number)||0);
  }
  return Math.max(maxWatched,Math.min(total||10000,dated));
 }
 if(s.releaseStart&&Date.parse(s.releaseStart+'T00:00:00Z')>at&&maxWatched===0)return 0;
 if(['NOT_YET_RELEASED','NOT_YET_AIRED'].includes(status))return maxWatched;
 if(['FINISHED','FINISHED_AIRING'].includes(status))return Math.max(maxWatched,total);
 let confirmed=Math.max(0,Number(s.airedCount)||0);
 if(s.nextAiringEpisode&&s.nextAiringAt){confirmed=Math.max(0,Number(s.nextAiringEpisode)-(at<Number(s.nextAiringAt)*1000?1:0));}
 // Episode-by-episode dates are useful when Jikan has not supplied an AniList schedule.
 for(const ep of s.episodes||[]){const ts=Date.parse(ep.airedAt||ep.aired||'');if(Number.isFinite(ts)&&ts<=at)confirmed=Math.max(confirmed,Number(ep.number)||0);}
 if(['RELEASING','CURRENTLY_AIRING','HIATUS','CANCELLED'].includes(status))return Math.max(maxWatched,Math.min(total||10000,confirmed));
 if(s.airedCount!=null||s.nextAiringAt)return Math.max(maxWatched,Math.min(total||10000,confirmed));
 if(Number(s.year)>new Date(at).getUTCFullYear()&&maxWatched===0)return 0;
 // Legacy / manually entered anime remain usable until online metadata arrives.
 return Math.max(maxWatched,total);
}
function releasedTotal(a){return (a?.seasons||[]).reduce((sum,s)=>sum+releasedCount(s),0)}
function plannedPending(a){return (a?.seasons||[]).reduce((sum,s)=>sum+Math.max(0,(Number(s.total)||0)-releasedCount(s)),0)}
function pendingReleaseText(s){let date=s.nextAiringAt?new Date(s.nextAiringAt*1000):null;let when=date&&Number.isFinite(date.getTime())?' · '+new Intl.DateTimeFormat('sq-AL',{timeZone:'Europe/Tirane',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(date):'';return `E konfirmuar · ${s.total?Math.max(0,s.total-releasedCount(s))+' ep. ende pa dalë':'numri i episodeve ende i panjohur'}${when||((s.releaseStart&&s.releaseStart.length>=10)?' · Fillimi: '+s.releaseStart:'')}`} 
function releasedStatusAfterWatch(a,seen){const available=releasedTotal(a);if(available>0&&count(a)>=available)a.status='completed';else if(a.status==='completed'&&count(a)<available)a.status='watching';else if(seen&&a.status==='planning')a.status='watching'}
function syncTotals(a){a.seasons=(Array.isArray(a.seasons)?a.seasons:[]).map(normSeason).slice(0,45);const allKnown=a.seasons.length>0&&a.seasons.every(s=>s.total>0);a.total=allKnown?a.seasons.reduce((sum,s)=>sum+s.total,0):0;let offset=0;const flat=[];for(const season of a.seasons){for(const n of season.watched){const absolute=season.globalStart?season.globalStart+n-1:offset+n;if(absolute>0&&absolute<=10000)flat.push(absolute)}offset+=season.total||Math.max(0,...season.watched)}a.watched=tidyNums(flat);return a}
function normalized(a){if(!a||typeof a!=='object'||typeof a.title!=='string'||!a.title.trim())return null;const oldTotal=Math.max(0,Math.min(10000,parseInt(a.total,10)||0));const seed={id:a.source==='AniList'&&a.sourceId?'al-'+a.sourceId:a.source==='MyAnimeList'&&a.sourceId?'mal-'+a.sourceId:'manual-1',title:'Sezoni 1',subtitle:a.title,total:oldTotal,watched:tidyNums(a.watched,oldTotal),source:a.source||'',sourceId:a.sourceId||'',malId:a.malId||'',format:a.format||'TV',episodes:[],myRating:null,communityScore:null};let o={id:String(a.id||uuid()),title:String(a.title).trim().slice(0,180),status:STATUS[a.status]?a.status:'planning',total:oldTotal,watched:[],rating:a.rating===''||a.rating==null?null:Math.min(10,Math.max(0,Number(a.rating)||0)),year:Number.isInteger(+a.year)&&+a.year>=1950&&+a.year<=2200?+a.year:null,genre:String(a.genre||'').slice(0,120),cover:validPoster(a.cover||''),notes:String(a.notes||'').slice(0,2500),favorite:!!a.favorite,communityScore:a.communityScore==null?null:Math.max(0,Math.min(100,Number(a.communityScore)||0)),communitySource:String(a.communitySource||'').slice(0,25),source:['AniList','MyAnimeList'].includes(a.source)?a.source:'',sourceId:String(a.sourceId||'').slice(0,30),malId:String(a.malId||'').slice(0,30),format:mediaFormat(a.format||'TV'),sourceUrl:validPoster(a.sourceUrl||''),synopsis:String(a.synopsis||'').slice(0,1800),hydrated:!!a.hydrated,tvmazeId:String(a.tvmazeId||'').slice(0,30),tvmazeLoaded:!!a.tvmazeLoaded,rewatches:(Array.isArray(a.rewatches)?a.rewatches:[]).slice(-40).map(r=>({id:String(r.id||uuid()).slice(0,90),startedAt:String(r.startedAt||''),completedAt:String(r.completedAt||''),episodes:(Array.isArray(r.episodes)?r.episodes:[]).slice(-10000).filter(e=>e&&Number.isInteger(Number(e.number))&&Number(e.number)>0).map(e=>({seasonId:String(e.seasonId||''),number:Number(e.number),date:String(e.date||'')}))})),activeRewatchId:String(a.activeRewatchId||'').slice(0,90),imdbId:/^tt\d{5,12}$/.test(String(a.imdbId||''))?String(a.imdbId):'',imdbRating:a.imdbRating==null?null:(Number.isFinite(Number(a.imdbRating))?Math.max(0,Math.min(10,Number(a.imdbRating))):null),imdbVotes:Math.max(0,Number(a.imdbVotes)||0),imdbCheckedAt:String(a.imdbCheckedAt||'').slice(0,40),createdAt:String(a.createdAt||now()),updatedAt:String(a.updatedAt||now()),seasons:Array.isArray(a.seasons)&&a.seasons.length?a.seasons:[seed]};return syncTotals(o)}
function count(a){return a.seasons.reduce((sum,s)=>sum+s.watched.length,0)}
function percentage(a){const aired=releasedTotal(a);return aired?Math.min(100,Math.round(count(a)/aired*100)):0}
function nextSeasonEp(a){for(const s of a.seasons){const seen=new Set(s.watched);let n=1;while(seen.has(n))n++;if(n<=releasedCount(s))return {season:s,n}}return null}
function nextEp(a){const next=nextSeasonEp(a);return next?`${a.seasons.indexOf(next.season)+1} · ${next.n}`:null}
function updateSeasonEpisode(id,seasonId,n,seen,quiet=false){const a=state.anime.find(x=>x.id===id),s=a?.seasons.find(x=>x.id===seasonId);if(!s||!Number.isInteger(n)||n<1||n>10000||(s.total&&n>s.total))return false;let old=s.watched.includes(n);if(old===seen)return false;if(seen&&n>releasedCount(s)){notify('Ky episod ende nuk është transmetuar. Do të shtohet pas publikimit të datës.');return false}const seasonIndex=a.seasons.findIndex(x=>x.id===seasonId)+1;s.watched=seen?tidyNums([...s.watched,n],s.total):s.watched.filter(x=>x!==n);syncTotals(a);a.updatedAt=now();releasedStatusAfterWatch(a,seen);record(id,n,seen?'watched':'unwatched',seasonId);save();render();if(detailId===id)renderDetail(id);renderHome();if(!quiet)notify(`Sezoni ${seasonIndex}, episodi ${n} ${seen?'u shënua ✓':'u hoq'}`);return true}
function updateEpisode(id,n,seen){let a=state.anime.find(x=>x.id===id);if(!a)return;let offset=0;for(const s of a.seasons){const len=s.total||Math.max(...s.watched,24);if(n<=offset+len)return updateSeasonEpisode(id,s.id,n-offset,seen);offset+=len}}
function markNext(id){let a=state.anime.find(x=>x.id===id);if(!a)return;const ep=nextSeasonEp(a);if(!ep){notify('Nuk ka episode të tjera të transmetuara.');return}activeSeasonId=ep.season.id;episodePage=Math.floor((ep.n-1)/24);updateSeasonEpisode(id,ep.season.id,ep.n,true)}
function record(id,episode,action,seasonId='',episodes=null){state.history.push({id,episode,action,seasonId,date:now(),...(Array.isArray(episodes)?{episodes:episodes.filter(n=>Number.isInteger(n)&&n>0&&n<=10000)}:{})});if(state.history.length>2000)state.history=state.history.slice(-2000)}
let pendingSeason=null;
function commitSeason(id,seasonId,seen,includePrevious=false){
 const a=state.anime.find(x=>x.id===id),s=a?.seasons.find(x=>x.id===seasonId);if(!a||!s)return;
 const idx=a.seasons.indexOf(s), targets=includePrevious&&seen?a.seasons.slice(0,idx+1):[s];
 let added=0,removed=0,skipped=0;
 for(const x of targets){const available=releasedCount(x);if(!available){skipped++;continue}
  const before=x.watched.length,next=seen?Array.from({length:available},(_,i)=>i+1):[];
  if(seen)added+=next.length-before;else removed+=before;
  if(before!==next.length||x.watched.some((n,i)=>n!==next[i])){const changed=seen?next.filter(n=>!x.watched.includes(n)):x.watched.filter(n=>!next.includes(n));x.watched=next;record(id,0,seen?'season-watched':'season-unwatched',x.id,changed)}
 }
 if(!added&&!removed){notify('Nuk kishte episode për t’u ndryshuar.');return}
 syncTotals(a);a.updatedAt=now();
 releasedStatusAfterWatch(a,seen);
 save();render();if(detailId===id)renderDetail(id);renderHome();
 notify(`${seen?'U shënuan '+added:'U hoqën '+removed} episode${skipped?' · '+skipped+' sezone me total të panjohur u lanë pa ndryshuar':''} ✓`);
}
function markSeason(id,seasonId,seen){
 const a=state.anime.find(x=>x.id===id),s=a?.seasons.find(x=>x.id===seasonId);if(!s||!a)return;
 if(!releasedCount(s)){notify('Ky sezon nuk ka ende episode të transmetuara.');return}
 if(!seen){commitSeason(id,seasonId,false);return}
 const idx=a.seasons.indexOf(s),earlier=a.seasons.slice(0,idx),incomplete=earlier.filter(x=>!releasedCount(x)||x.watched.length<releasedCount(x));
 if(incomplete.length){
  pendingSeason={id,seasonId};$('season-confirm-copy').textContent=`Po shënon “${s.title}” si të parë. Ke ${incomplete.length} sezon${incomplete.length===1?'':'e'} të mëparshme që nuk janë shënuar plotësisht. A dëshiron të shënosh edhe ato? Sezonet me numër episodesh të panjohur nuk do të ndryshohen.`;
  showModal('season-confirm-modal');return;
 }
 commitSeason(id,seasonId,true);
}
function resolveSeasonConfirm(includePrevious){const pending=pendingSeason;closeModal('season-confirm-modal');pendingSeason=null;if(pending)commitSeason(pending.id,pending.seasonId,true,includePrevious)}
function addManualSeason(id){const a=state.anime.find(x=>x.id===id);if(!a)return;let title=prompt('Emri i sezonit të ri:',`Sezoni ${a.seasons.length+1}`);if(title===null)return;title=title.trim().slice(0,100);if(!title)return;let input=prompt('Sa episode ka sezoni? (0 nëse nuk dihet)','12');if(input===null)return;let total=Number(input);if(!Number.isInteger(total)||total<0||total>10000){notify('Numri i episodeve nuk është i vlefshëm.');return}let s=normSeason({id:'manual-'+uuid(),title,total,subtitle:'Shtuar nga ti'},a.seasons.length);a.seasons.push(s);syncTotals(a);a.updatedAt=now();activeSeasonId=s.id;episodePage=0;save();render();renderDetail(id)}
function editSeasonCount(id,seasonId){const a=state.anime.find(x=>x.id===id),s=a?.seasons.find(x=>x.id===seasonId);if(!s)return;let input=prompt('Numri i episodeve për '+s.title+':',String(s.total));if(input===null)return;let n=Number(input);if(!Number.isInteger(n)||n<0||n>10000||n<Math.max(0,...s.watched)){notify('Numër i pavlefshëm ose më i vogël se episodet e shënuara.');return}s.total=n;syncTotals(a);a.updatedAt=now();save();render();renderDetail(id)}

/* Keep in-app preferences across refreshes and Supabase cloud pulls. */
function normalizePreferences(raw){
 const p=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const allowed=new Set(['episodes','comments','friends','system']);
 const reminderEntries=Object.entries(p.calendarReminders&&typeof p.calendarReminders==='object'&&!Array.isArray(p.calendarReminders)?p.calendarReminders:{}).filter(([key,val])=>typeof key==='string'&&key.length<=180&&val===30).slice(-250);
 return{
  weeklyGoal:Math.max(1,Math.min(200,Number(p.weeklyGoal)||10)),
  notificationRead:Array.isArray(p.notificationRead)?p.notificationRead.filter(x=>typeof x==='string'&&x.length<=180).slice(-250):[],
  notificationMuted:Array.isArray(p.notificationMuted)?[...new Set(p.notificationMuted.filter(x=>allowed.has(x)))]:[],
  notificationDismissed:Array.isArray(p.notificationDismissed)?p.notificationDismissed.filter(x=>typeof x==='string'&&x.length<=180).slice(-250):[],
  calendarReminders:Object.fromEntries(reminderEntries),
  homeQueue:Array.isArray(p.homeQueue)?[...new Set(p.homeQueue.filter(x=>typeof x==='string'&&x.length<=90))].slice(0,6):[]
 };
}
function load(){try{let s=JSON.parse(localStorage.getItem(KEY));if(s&&Array.isArray(s.anime))return {anime:s.anime.map(normalized).filter(Boolean),history:Array.isArray(s.history)?s.history.filter(h=>h&&typeof h==='object').slice(-2000):[],preferences:normalizePreferences(s.preferences)}}catch(e){console.warn('Nuk u lexuan të dhënat:',e)}return{anime:[],history:[],preferences:{weeklyGoal:10,notificationRead:[]}}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));if(accountMode==='cloud'&&accountUser)accountQueueSave();return true}catch(e){notify('Ruajtja dështoi. Eksporto kopje rezervë.');console.error(e);return false}}
function notify(message){const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>t.classList.remove('show'),2800)}
function cover(a,cls){const url=validPoster(a.cover);return `<div class="${cls}">${url?`<img src="${escapeHTML(url)}" alt="Posteri i ${escapeHTML(a.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" />`:''}</div>`}
function render(){const totals={all:state.anime.length};Object.keys(STATUS).forEach(s=>totals[s]=state.anime.filter(a=>a.status===s).length);totals.movies=state.anime.filter(isMovieAnime).length;totals.waiting=state.anime.filter(a=>!!futureSeasonOf(a)).length;totals.genres=genreCounts().length;document.querySelectorAll('[data-count]').forEach(el=>el.textContent=totals[el.dataset.count]||0);$('hero-add').textContent=totals.all?'+ Shto anime':'+ Shto animen e parë';$('stat-total').textContent=totals.all;$('favorite-count').textContent=state.anime.filter(a=>a.favorite).length;$('stat-watching').textContent=totals.watching;$('stat-completed').textContent=totals.completed;$('stat-episodes').textContent=state.anime.reduce((s,a)=>s+count(a),0).toLocaleString('sq-AL');const weekAgo=Date.now()-7*86400000;$('stat-week').textContent='+'+activityEpisodes().filter(e=>e.at>=weekAgo).length+' gjatë 7 ditëve';document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter===filter));const looking=state.anime.filter(a=>a.status==='watching').sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,3);$('continue-section').classList.toggle('hidden',looking.length===0||filter!=='all'||!!search);$('continue-grid').innerHTML=looking.map(a=>`<article class="continue-card" data-status="${a.status}">${cover(a,'continue-cover')}<div class="continue-info"><strong title="${escapeHTML(a.title)}">${escapeHTML(a.title)}</strong><span class="meta">${count(a)}/${releasedTotal(a)} episode</span><div class="progress"><span style="width:${percentage(a)}%"></span></div><div class="continue-bottom"><button class="ghost" data-detail="${escapeHTML(a.id)}">Detaje</button><button class="episode-pill" data-next="${escapeHTML(a.id)}" ${nextSeasonEp(a)?'':'disabled'}>+ Episodi ${nextEp(a)??'✓'}</button></div></div></article>`).join('');const genrePanel=$('genre-controls');genrePanel.classList.toggle('hidden',filter!=='genres');if(filter==='genres'){$('genre-chips').innerHTML=`<button type="button" class="genre-chip ${selectedGenre==='all'?'active':''}" data-genre="all">Të gjitha <span>${state.anime.length}</span></button>`+genreCounts().map(g=>`<button type="button" class="genre-chip ${g.name.toLocaleLowerCase()===selectedGenre?'active':''}" data-genre="${escapeHTML(g.name.toLocaleLowerCase())}">${escapeHTML(g.name)} <span>${g.count}</span></button>`).join('')+`<button type="button" class="genre-chip ${selectedGenre==='__unknown'?'active':''}" data-genre="__unknown">Pa zhanër <span>${state.anime.filter(a=>!genresOf(a).length).length}</span></button>`;}let anime=state.anime.filter(a=>(filter==='all'||(filter==='favorites'?a.favorite:filter==='movies'?isMovieAnime(a):filter==='waiting'?!!futureSeasonOf(a):filter==='genres'?(selectedGenre==='all'||(selectedGenre==='__unknown'?!genresOf(a).length:genresOf(a).some(g=>g.toLocaleLowerCase()===selectedGenre))):a.status===filter))&&`${a.title} ${a.genre}`.toLocaleLowerCase().includes(search));anime.sort((a,b)=>sort==='title'?a.title.localeCompare(b.title):sort==='progress'?percentage(b)-percentage(a):sort==='rating'?(b.rating??-1)-(a.rating??-1):b.updatedAt.localeCompare(a.updatedAt));$('library-title').textContent=filter==='all'?'Biblioteka ime':filter==='favorites'?'Të preferuarat':filter==='movies'?'Filma anime':filter==='waiting'?'Në pritje të sezonit të ri':filter==='genres'?'Sipas zhanrit':STATUS[filter];$('library-subtitle').textContent=filter==='movies'?`${anime.length} filma anime në bibliotekë`:filter==='waiting'?`${anime.length} anime të përfunduara me vazhdim të konfirmuar`:filter==='genres'?`${anime.length} anime · ${selectedGenre==='all'?'të gjitha zhanret':selectedGenre==='__unknown'?'pa zhanër':selectedGenre}`:`${anime.length} anime në këtë seksion`;$('anime-grid').innerHTML=anime.length?anime.map(a=>`<article class="anime-card" data-status="${a.status}">${cover(a,'poster')}<div class="status-badge">${STATUS[a.status]}</div>${a.favorite?'<div class="favorite-badge">♥</div>':''}${a.rating!=null?`<div class="score-badge">★ ${a.rating}/10</div>`:''}<div class="card-info"><div class="card-title" title="${escapeHTML(a.title)}">${escapeHTML(a.title)}</div><div class="card-row"><span>${count(a)}/${releasedTotal(a)} ep.</span><div class="progress"><span style="width:${percentage(a)}%"></span></div><span>${releasedTotal(a)?percentage(a)+'%':'—'}</span></div><div class="card-actions"><button class="ghost" data-detail="${escapeHTML(a.id)}">Shiko detajet</button><button class="plus" title="Shëno episodin tjetër" aria-label="Episodi tjetër i ${escapeHTML(a.title)}" data-next="${escapeHTML(a.id)}" ${nextSeasonEp(a)?'':'disabled'}>+1</button></div></div></article>`).join(''):`<div class="empty"><div class="symbol">✦</div><h3>${state.anime.length?'Nuk u gjet asnjë anime':'Biblioteka jote është bosh'}</h3><p>${state.anime.length?'Ndrysho filtrin ose kërkimin.':'Shto animen tënde të parë dhe fillo të regjistrosh episodet.'}</p><button class="primary" id="empty-add">+ Shto anime</button></div>`;let empty=$('empty-add');if(empty)empty.addEventListener('click',()=>openForm());}
function setFilter(f){filter=f;if(f!=='genres')selectedGenre='all';setView('library');render()}
function showModal(id){$(id).classList.add('show');document.body.style.overflow='hidden'}
function closeModal(id){$(id).classList.remove('show');if(!document.querySelector('.modal-backdrop.show'))document.body.style.overflow='';if(id==='detail-modal'){detailId=null;activeSeasonId=null;previewKey=null;}if(id==='confirm-modal')pendingEpisode=null;if(id==='season-confirm-modal')pendingSeason=null;}
function openForm(id=null){let a=id?state.anime.find(a=>a.id===id):null;$('anime-id').value=a?.id||'';$('anime-title').value=a?.title||'';$('anime-status').value=a?.status||'watching';$('anime-total').value=a?.total??12;$('anime-current').value=a?count(a):0;$('anime-total').readOnly=!!a&&a.seasons.length>1;$('anime-current').readOnly=!!a&&a.seasons.length>1;$('anime-rating').value=a?.rating??'';$('anime-year').value=a?.year??'';$('anime-genre').value=a?.genre||'';$('anime-cover').value=a?.cover||'';$('anime-notes').value=a?.notes||'';$('form-heading').textContent=a?'Ndrysho animen':'Shto anime';$('delete-btn').classList.toggle('hidden',!a);if(detailId)closeModal('detail-modal');showModal('form-modal');$('anime-title').focus()}
function saveForm(e){e.preventDefault();const id=$('anime-id').value;let a=id?state.anime.find(x=>x.id===id):null;const title=$('anime-title').value.trim(),total=Number($('anime-total').value),current=Number($('anime-current').value);if(!title||!Number.isInteger(total)||total<0||total>10000||!Number.isInteger(current)||current<0||current>10000||(total>0&&current>total)){notify('Kontrollo titullin dhe episodet.');return}let status=$('anime-status').value;if(!STATUS[status])status='planning';let fields={title,status,rating:$('anime-rating').value===''?null:Number($('anime-rating').value),year:$('anime-year').value?Number($('anime-year').value):null,genre:$('anime-genre').value,cover:$('anime-cover').value,notes:$('anime-notes').value,updatedAt:now()};if(a){Object.assign(a,fields);if(a.seasons.length===1){a.seasons[0].total=total;let seen=tidyNums(a.seasons[0].watched,total);while(seen.length<current){let n=1;while(seen.includes(n))n++;seen.push(n)}if(seen.length>current)seen=seen.slice(0,current);a.seasons[0].watched=tidyNums(seen,total)}Object.assign(a,normalized(a))}else{a=normalized({...fields,id:uuid(),total,watched:Array.from({length:current},(_,i)=>i+1),createdAt:now()});state.anime.unshift(a)}if(a.total&&count(a)===a.total&&a.status==='watching')a.status='completed';save();closeModal('form-modal');render();renderHome();notify('Anime u ruajt me sukses ✓')}
function renderDetail(id){const a=state.anime.find(x=>x.id===id);if(!a){closeModal('detail-modal');return}detailId=id;let s=a.seasons.find(x=>x.id===activeSeasonId)||a.seasons[0];activeSeasonId=s.id;const shownTotal=releasedCount(s),pages=Math.max(1,Math.ceil(shownTotal/24));episodePage=Math.max(0,Math.min(episodePage,pages-1));const first=episodePage*24+1,last=Math.min(shownTotal,first+23),num=a.seasons.indexOf(s)+1,full=releasedCount(s)>0&&s.watched.length>=releasedCount(s);const titleMap=new Map(s.episodes.map(ep=>[ep.number,ep]));$('detail-heading').textContent='Sezonet & episodet';$('detail-body').innerHTML=`<div class="detail-top">${cover(a,'detail-poster')}<div class="detail-content"><div class="eyebrow">${STATUS[a.status]} · ${a.source||'Regjistrim personal'}</div><h3>${escapeHTML(a.title)}</h3><div>${a.year?`<span class="pill">${a.year}</span>`:''}${a.genre?`<span class="pill">${escapeHTML(a.genre)}</span>`:''}${a.rating!=null?`<span class="pill">★ ${a.rating}/10</span>`:''}<span class="pill">${a.seasons.length} sezon${a.seasons.length===1?'':'e'}</span></div><div class="rating-deck"><label class="field">Statusi<select class="detail-select" data-status-select="${escapeHTML(id)}">${Object.entries(STATUS).map(([value,label])=>`<option value="${value}" ${a.status===value?'selected':''}>${label}</option>`).join('')}</select></label><label class="field">Vlerësimi im / 10<select class="detail-select" data-anime-rating="${escapeHTML(id)}">${ratingOptions(a.rating)}</select></label><div class="rating-chip"><small>Komuniteti · ${escapeHTML(a.communitySource||'Pa të dhëna')}</small><b>${a.communityScore!=null?'★ '+(a.communityScore/10).toFixed(1)+'/10':'—'}</b></div><div class="rating-chip imdb-chip"><small>IMDb · ${a.imdbCheckedAt?'Përditësuar '+escapeHTML(a.imdbCheckedAt.slice(0,10)):'Nuk është lidhur'}</small><b>${a.imdbRating!=null?'★ '+a.imdbRating.toFixed(1)+'/10':'—'}</b>${a.imdbVotes?`<small>${a.imdbVotes.toLocaleString('en-US')} vota</small>`:''}</div></div><div class="imdb-tools"><label class="field">IMDb ID (opsionale)<input type="text" data-imdb-id="${escapeHTML(id)}" placeholder="tt0388629" value="${escapeHTML(a.imdbId||'')}" autocomplete="off" aria-label="IMDb ID"></label><button class="ghost" data-imdb-fetch="${escapeHTML(id)}" type="button">↻ Merr notën IMDb</button><a target="_blank" rel="noopener noreferrer" href="${a.imdbId?'https://www.imdb.com/title/'+encodeURIComponent(a.imdbId)+'/':'https://www.imdb.com/find/?q='+encodeURIComponent(a.title)}">${a.imdbId?'Hap në IMDb ↗':'Gjej titullin në IMDb ↗'}</a><small>Nota IMDb merret vetëm kur ke lidhur çelësin OMDb. AniList mbetet i shënuar veçmas.</small></div><div class="detail-stats"><span><b>${count(a)}</b> / ${releasedTotal(a)||0} episode të transmetuara</span><span><b>${releasedTotal(a)?percentage(a)+'%':'—'}</b> progres</span></div><div class="progress"><span style="width:${percentage(a)}%"></span></div><div class="detail-actions"><button class="primary" data-next="${escapeHTML(a.id)}">+ Episodi tjetër</button><button class="ghost" data-edit="${escapeHTML(a.id)}">✎ Ndrysho të dhënat</button><button class="ghost" data-favorite="${escapeHTML(a.id)}">${a.favorite?'♥ Hiq nga të preferuarat':'♡ Shto te të preferuarat'}</button><button class="danger" data-remove-anime="${escapeHTML(a.id)}">Hiqe nga biblioteka</button></div></div></div>${a.synopsis?`<div class="details-section"><h4>Përshkrimi</h4><p class="notes">${escapeHTML(a.synopsis)}</p>${a.sourceUrl?`<a class="catalog-link" href="${escapeHTML(a.sourceUrl)}" target="_blank" rel="noopener noreferrer">Shiko te ${escapeHTML(a.source||'katalogu')} ↗</a>`:''}</div>`:''}${a.notes?`<div class="details-section"><h4>Shënimet e mia</h4><p class="notes">${escapeHTML(a.notes)}</p></div>`:''}<div class="seasons-topline"><h4>Sezonet • ${a.seasons.length}</h4><div class="season-toolbar">${a.source?`<button class="ghost" data-sync-seasons="${escapeHTML(id)}">↻ ${a.hydrated?'Përditëso sezonet':'Gjej sezonet online'}</button>`:''}<button class="ghost" data-tv-sync="${escapeHTML(id)}">↻ Ndarja si serial (TV)</button><button class="ghost" data-add-season="${escapeHTML(id)}">+ Shto sezon</button></div></div><div class="season-scroller">${a.seasons.map((x,i)=>`<button class="season-tab ${x.id===s.id?'active':''}" data-season="${escapeHTML(x.id)}" data-id="${escapeHTML(id)}" aria-pressed="${x.id===s.id}"><strong>${escapeHTML(x.title||'Sezoni '+(i+1))}</strong><small title="${escapeHTML(x.subtitle)}">${escapeHTML(x.subtitle||'Sezoni '+(i+1))}</small><div class="season-total">${x.watched.length}/${releasedCount(x)} episode ${releasedCount(x)>0&&x.watched.length>=releasedCount(x)?' ✓':''}${x.total>releasedCount(x)?` · ${x.total-releasedCount(x)} në pritje`:''}</div><small>★ Im: ${x.myRating??'—'} · ${x.imdbEpisodeAverage!=null?'IMDb ep. mes.: '+x.imdbEpisodeAverage.toFixed(1):x.communityScore!=null?(x.communityScore/10).toFixed(1)+' '+x.communitySource:'Komuniteti: —'}</small><div class="progress"><span style="width:${releasedCount(x)?Math.round(x.watched.length/releasedCount(x)*100):0}%"></span></div></button>`).join('')}</div><div class="season-banner"><div><strong>${escapeHTML(s.title)}</strong><p>${escapeHTML(s.subtitle||a.title)}${s.year?' · '+s.year:''} · ${s.watched.length}/${releasedCount(s)} episode të transmetuara</p></div><div class="season-ratings"><label class="field">Vlerësimi im për këtë sezon<select class="detail-select" data-season-rating="${escapeHTML(s.id)}" data-id="${escapeHTML(id)}">${ratingOptions(s.myRating)}</select></label><span>Komuniteti · ${escapeHTML(s.communitySource||'pa vlerësim')}: <b>${s.communityScore!=null?'★ '+(s.communityScore/10).toFixed(1)+'/10':'—'}</b></span></div><div class="imdb-season-bar"><span>★ Mesatarja e episodeve IMDb: <b>${s.imdbEpisodeAverage!=null?s.imdbEpisodeAverage.toFixed(1)+'/10':'—'}</b> ${s.imdbEpisodeCount?'· '+s.imdbEpisodeCount+' episode me vlerësim':''}</span><div class="imdb-season-form"><label>IMDb ID e serialit<input data-imdb-season-id="${escapeHTML(s.id)}" value="${escapeHTML(s.imdbId||a.imdbId||'')}" placeholder="tt..." autocomplete="off"></label><label>Nr. sezonit IMDb<input data-imdb-season-number="${escapeHTML(s.id)}" type="number" min="1" max="200" value="${s.imdbSeasonNumber||num}"></label><button type="button" class="ghost" data-imdb-season-fetch="${escapeHTML(s.id)}" data-id="${escapeHTML(id)}">↻ Merr vlerësimet</button></div><small>Mesatare e llogaritur nga episodet me nota të disponueshme; jo notë zyrtare e vetme për sezonin. Kontrollo numrin e sezonit IMDb, i cili mund të ndryshojë nga renditja këtu.</small></div><div class="season-actions"><button class="primary" data-season-toggle="${escapeHTML(s.id)}" data-id="${escapeHTML(id)}" data-seen="1" ${!releasedCount(s)||(full&&!a.seasons.slice(0,num-1).some(x=>!releasedCount(x)||x.watched.length<releasedCount(x)))?'disabled':''}>✓ Shëno gjithë sezonin</button><button class="ghost" data-season-toggle="${escapeHTML(s.id)}" data-id="${escapeHTML(id)}" data-seen="0" ${!s.watched.length?'disabled':''}>Hiq shënimet</button><button class="ghost" data-season-edit="${escapeHTML(s.id)}" data-id="${escapeHTML(id)}">✎ Ep.</button></div></div><div class="episode-jump"><label for="episode-jump-input">Shko direkt te episodi (numri i përgjithshëm)</label><input id="episode-jump-input" type="number" min="1" max="10000" inputmode="numeric" placeholder="p.sh. 1000"><button class="ghost" data-jump-episode="${escapeHTML(id)}">Shko →</button></div>${a.tvmazeLoaded?'<p class="season-note">Sezonet sipas viteve të transmetimit · Burimi: <a href="https://www.tvmaze.com/" target="_blank" rel="noopener noreferrer">TVmaze ↗</a></p>':''}<p class="season-info">Shfaqen vetëm episodet që kanë dalë. Sezonet e konfirmuara për të ardhmen ruhen veçmas.</p><div class="episode-list">${Array.from({length:last-first+1},(_,i)=>{const n=first+i,ep=titleMap.get(n),seen=s.watched.includes(n);return `<button class="ep-row ${seen?'watched':''}" data-ep="${n}" data-season-ep="${escapeHTML(s.id)}" data-id="${escapeHTML(id)}" aria-pressed="${seen}" aria-label="Sezoni ${num}, episodi ${n}, ${seen?'i parë':'i paparë'}"><span class="ep-num">${seen?'✓':'E'+String(n).padStart(2,'0')}</span><span class="ep-text"><strong>${escapeHTML(ep?.title||'Episodi '+n)}</strong><small>${ep?.aired?escapeHTML(ep.aired.slice(0,10))+' · ':''}S${num} E${n}${s.globalStart?' · #'+(s.globalStart+n-1):''}</small></span><span class="ep-check">${seen?'✓':'○'}</span></button>`}).join('')}</div><div class="episode-pages"><button data-page="prev" ${episodePage===0?'disabled':''}>← Më parë</button><span>Faqja ${episodePage+1}/${pages} · ${first}–${last} ${s.total?'nga '+s.total:''}</span><button data-page="next" ${episodePage>=pages-1?'disabled':''}>Më pas →</button></div>${!s.malId?'<p class="season-note">Titujt nuk janë të disponueshëm për këtë sezon; numrat dhe shënimet e episodeve funksionojnë normalisht. Mund të ndryshosh numrin e episodeve me ✎ Ep.</p>':''}${!s.total?'<p class="season-note">Numri total nuk dihet ende. Vendose manualisht për të shënuar gjithë sezonin.</p>':''}</div>`}
function openDetail(id){previewKey=null;$('top-results').classList.add('hidden');episodePage=0;activeSeasonId=null;renderDetail(id);showModal('detail-modal');const a=state.anime.find(x=>x.id===id);if(a){if(isOnePiece(a)&&!a.tvmazeLoaded)syncTVmaze(id,false,true);else if(a.source&&!a.hydrated)hydrateSeasons(id);const selected=a.seasons.find(x=>x.id===activeSeasonId);if(selected)loadSeasonEpisodes(id,selected.id,0)}}
function deleteAnime(){const id=$('anime-id').value;let a=state.anime.find(a=>a.id===id);if(!a)return;if(!confirm(`Ta fshijmë “${a.title}” dhe progresin e tij?`))return;state.anime=state.anime.filter(x=>x.id!==id);state.history=state.history.filter(h=>h.id!==id);save();closeModal('form-modal');render();renderHome();notify('Anime u fshi.')} 
function exportData(){const blob=new Blob([JSON.stringify({...state,version:3,exportedAt:now()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='AnimeTrack-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Kopja rezervë u shkarkua ✓')}
async function importData(file){if(!file)return;try{const text=await file.text();if(text.length>8_000_000)throw Error('Skedari është tepër i madh.');const data=JSON.parse(text);if(!data||!Array.isArray(data.anime)||!Array.isArray(data.history))throw Error('Formati i kopjes rezervë nuk është i saktë.');if(!confirm('Importi do të zëvendësojë bibliotekën aktuale. Vazhdo?'))return;state={anime:data.anime.map(normalized).filter(Boolean),history:data.history.filter(h=>h&&typeof h==='object').slice(-2000),preferences:normalizePreferences(data.preferences)};upcomingCheckedAt=0;catalogSyncAt=0;upcomingEntries=[];persistCache();save();filter='all';search='';$('search').value='';$('global-search').value='';clearCatalog();render();notify('Biblioteka u importua me sukses ✓')}catch(e){notify('Importi dështoi: '+e.message)}finally{$('import-file').value=''}}

// Search across a live anime catalog. AniList is primary, Jikan (MAL) is fallback.
const API_QUERY=`query ($search:String!, $page:Int!) { Page(page:$page, perPage:12) { pageInfo { hasNextPage } media(search:$search, type:ANIME, sort:SEARCH_MATCH, isAdult:false) { id idMal title { romaji english native } synonyms coverImage { large } episodes seasonYear startDate { year } format averageScore description(asHtml:false) genres siteUrl } } }`;
let catalogItems=[],catalogQuery='',catalogPage=0,catalogProvider='',catalogHasNext=false,catalogBusy=false,catalogTimer=null,catalogRequest=0,catalogController=null;

// AniList PREQUEL/SEQUEL links build a series; Jikan provides episode titles.
const SEASON_QUERY=`query ($id:Int!) { Media(id:$id,type:ANIME) { id idMal averageScore episodes status format seasonYear startDate { year month day } nextAiringEpisode { episode airingAt } title { romaji english } relations { edges { relationType node { id idMal averageScore type format episodes status seasonYear startDate { year month day } nextAiringEpisode { episode airingAt } title { romaji english } } } } } }`;
const hydrating=new Set(),episodesLoading=new Set();
function mediaSeason(m){return normSeason({id:'al-'+m.id,title:'Sezoni',subtitle:m.title?.english||m.title?.romaji||'',total:m.episodes||0,year:m.seasonYear||m.startDate?.year,source:'AniList',sourceId:String(m.id),malId:String(m.idMal||''),format:m.format||'TV',communityScore:m.averageScore,communitySource:'AniList',releaseStatus:m.status||'',releaseStart:mediaStartIso(m.startDate),nextAiringEpisode:m.nextAiringEpisode?.episode||0,nextAiringAt:m.nextAiringEpisode?.airingAt||0,airedCount:m.status==='FINISHED'?m.episodes||0:m.nextAiringEpisode?Math.max(0,m.nextAiringEpisode.episode-(Date.now()<m.nextAiringEpisode.airingAt*1000?1:0)):m.status==='NOT_YET_RELEASED'?0:null,airedCheckedAt:now()})}
async function anilistMedia(id){let r=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query:SEASON_QUERY,variables:{id:Number(id)}})});if(!r.ok)throw Error('AniList HTTP '+r.status);let j=await r.json();if(j.errors?.length||!j.data?.Media)throw Error(j.errors?.[0]?.message||'AniList metadata unavailable');return j.data.Media}
async function anilistSeasons(seedId,format){
 if(!isSeriesFormat(format))return [];
 const first=await anilistMedia(seedId),base=seriesRootTitle(first.title?.romaji||first.title?.english||''),queue=[first],result=new Map(),visited=new Set();
 // AniList can route prequel/sequel relations via an OVA or a split-cour entry; search the exact series root too.
 if(base.length>=12){
  try{const search=await fetchAniList(base,1);for(const item of search.items||[])if(isSeriesFormat(item.format)&&seriesRootTitle(item.title)===base&&item.sourceId&&!queue.some(x=>String(x.id)===String(item.sourceId)))queue.push({id:Number(item.sourceId)})}
  catch(err){console.warn('Series title fallback unavailable',err)}
 }
 while(queue.length&&visited.size<36){
  const short=queue.shift();if(!short?.id||visited.has(short.id))continue;
  visited.add(short.id);
  let media;try{media=short.relations?short:await anilistMedia(short.id)}catch(err){if(!result.size)throw err;console.warn('One linked season was unavailable',err);continue}
  if(!isSeriesFormat(media.format))continue;
  result.set(media.id,mediaSeason(media));
  for(const edge of media.relations?.edges||[]){
   const m=edge.node;
   if(!['PREQUEL','SEQUEL'].includes(edge.relationType)||m?.type!=='ANIME'||!isSeriesFormat(m.format)||visited.has(m.id))continue;
   if(!queue.some(x=>x.id===m.id))queue.push(m);
  }
 }
 return [...result.values()].sort((a,b)=>(a.year||9999)-(b.year||9999)||String(a.releaseStart||'9999').localeCompare(String(b.releaseStart||'9999'))||(Number(a.sourceId)||0)-(Number(b.sourceId)||0));
}
async function jikanGet(url){const r=await fetch(url);if(!r.ok)throw Error('MyAnimeList HTTP '+r.status);return r.json()}
async function jikanSeasons(seedId,format){if(!['TV','TV_SHORT','ONA'].includes(format))return [];const known=new Map(),queue=[String(seedId)];let errors=0;while(queue.length&&known.size<10){const id=queue.shift();if(known.has(id))continue;let full;try{full=(await jikanGet('https://api.jikan.moe/v4/anime/'+encodeURIComponent(id)+'/full')).data}catch(err){errors++;if(known.size)break;throw err}const fmt=full?.type;if(!['TV','ONA','TV Special'].includes(fmt))continue;known.set(id,normSeason({id:'mal-'+id,title:'Sezoni',subtitle:full.title_english||full.title||'',total:full.episodes||0,year:full.year||full.aired?.prop?.from?.year,source:'MyAnimeList',sourceId:id,malId:id,format:'TV',communityScore:full.score==null?null:Math.round(full.score*10),communitySource:'MyAnimeList',releaseStatus:String(full.status||'').toUpperCase().replace(/\s+/g,'_'),releaseStart:String(full.aired?.from||'').slice(0,10),airedCount:/finished/i.test(full.status||'')?full.episodes||0:/not yet/i.test(full.status||'')?0:null,airedCheckedAt:now()}));for(const rel of full.relations||[]){if(!['Prequel','Sequel'].includes(rel.relation))continue;for(const ep of rel.entry||[]){if(ep.type==='anime'&&!known.has(String(ep.mal_id))&&!queue.includes(String(ep.mal_id)))queue.push(String(ep.mal_id))}}}
return [...known.values()].sort((x,y)=>(x.year||9999)-(y.year||9999)||Number(x.sourceId)-Number(y.sourceId))}
async function hydrateSeasons(id,force=false){
 const entry=state.anime.find(x=>x.id===id);
 if(!entry||!entry.source||hydrating.has(id)||(!force&&entry.hydrated))return entry?.id||null;
 hydrating.add(id);const owner=accountUser?.id||null;
 if(detailId===id)notify('Po lidh sezonet e së njëjtës seri...');
 try{
  if(isOnePiece(entry)){const ok=await syncTVmaze(id,false,true);if(ok)return id}
  const remote=entry.source==='AniList'?await anilistSeasons(entry.sourceId,entry.format):await jikanSeasons(entry.sourceId,entry.format);
  if(owner!==(accountUser?.id||null)||!state.anime.some(a=>a.id===id))return null;
  if(!remote.length)return id;
  const keeper=reconcileSeriesLibrary(entry,remote);
  save();render();renderHome();renderCatalog();if(typeof v8RenderSeasonal==='function')v8RenderSeasonal();
  if(detailId===keeper.id){renderDetail(keeper.id);const selected=keeper.seasons.find(s=>s.id===activeSeasonId)||keeper.seasons[0];if(selected)loadSeasonEpisodes(keeper.id,selected.id,0)}
  if(force)notify('Sezonet u bashkuan dhe u përditësuan ✓');
  return keeper.id;
 }catch(err){console.warn('Season grouping failed; existing library preserved',err);if(detailId===id)notify('S’u verifikuan lidhjet e sezoneve. Provo “Bashko sezonet”.');return id}
 finally{hydrating.delete(id)}
}
async function loadSeasonEpisodes(id,seasonId,uiPage=0){
 const a=state.anime.find(x=>x.id===id),s=a?.seasons.find(x=>x.id===seasonId);
 if(!s||!s.malId||s.source==='TVmaze'||(s.total>0&&s.episodes.length>=s.total))return;
 const first=uiPage*24+1,last=Math.min(s.total||first+23,first+23),absFirst=s.globalStart?first+s.globalStart-1:first,absLast=s.globalStart?last+s.globalStart-1:last;
 const pages=[...new Set([Math.ceil(absFirst/100),Math.ceil(absLast/100)])];let changed=false;
 for(const metadataPage of pages){
  const key=id+':'+seasonId+':'+metadataPage;
  if(episodesLoading.has(key)||s.loadedPages?.includes(metadataPage))continue;
  episodesLoading.add(key);
  try{
   const j=await jikanGet('https://api.jikan.moe/v4/anime/'+encodeURIComponent(s.malId)+'/episodes?page='+metadataPage);
   const prior=new Map(s.episodes.map(e=>[e.number,e]));
   for(const ep of j.data||[]){const abs=Number(ep.mal_id);const n=s.globalStart?abs-s.globalStart+1:abs;if(Number.isInteger(n)&&n>0&&(!s.total||n<=s.total))prior.set(n,{...(prior.get(n)||{}),number:n,absolute:abs,title:String(ep.title||ep.title_romanji||prior.get(n)?.title||'').slice(0,220),aired:String(ep.aired||prior.get(n)?.aired||'').slice(0,40),filler:!!ep.filler,recap:!!ep.recap});}
   s.episodes=[...prior.values()].sort((x,y)=>x.number-y.number);s.loadedPages=[...(s.loadedPages||[]),metadataPage];s.epPage=Math.max(s.epPage,metadataPage);s.hasMore=!!j.pagination?.has_next_page;changed=true;
   if(!s.total&&!s.hasMore&&s.episodes.length)s.total=Math.max(...s.episodes.map(e=>e.number));
  }catch(err){console.warn('Episode metadata unavailable',err);if(detailId===id)notify('Titujt nuk u ngarkuan; episodet mund t’i shënosh normalisht.');}
  finally{episodesLoading.delete(key)}
 }
 if(changed){syncTotals(a);save();if(detailId===id&&activeSeasonId===seasonId)renderDetail(id)}
}

function textOnly(html){const d=new DOMParser().parseFromString(String(html||''),'text/html');return (d.body.textContent||'').replace(/\s+/g,' ').trim().slice(0,1800)}
function canonicalTitle(s){return String(s||'').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()}

function seriesRootTitle(title){
 const normalizedTitle=canonicalTitle(title);
 const suffix=/(?:\s+(?:\d+(?:st|nd|rd|th)\s+season|season\s+\d+|s\d+|part\s+\d+|cour\s+\d+))+$/i;
 return normalizedTitle.replace(suffix,'').trim();
}
function seriesHasSeasonSuffix(title){return seriesRootTitle(title)!==canonicalTitle(title)}
function isSeriesFormat(format){return ['TV','TV_SHORT','ONA'].includes(mediaFormat(format))}
function sameSeriesSeason(a,b){
 if(!a||!b)return false;
 const xMal=String(a.malId||''),yMal=String(b.malId||'');
 if(xMal&&yMal&&xMal===yMal)return true;
 const xId=String(a.sourceId||''),yId=String(b.sourceId||'');
 return !!(xId&&yId&&a.source===b.source&&xId===yId);
}
function linkedToSeries(anime,remote,reference){
 if(!anime||!isSeriesFormat(anime.format)||!anime.source)return false;
 if(remote.some(s=>sameSeriesSeason(anime,s)||(anime.seasons||[]).some(old=>sameSeriesSeason(old,s))))return true;
 const aRoot=seriesRootTitle(anime.title),refRoot=seriesRootTitle(reference?.title||'');
 return !!(aRoot&&aRoot.length>=12&&aRoot===refRoot&&(seriesHasSeasonSuffix(anime.title)||seriesHasSeasonSuffix(reference?.title||'')));
}
function catalogGrouped(items){
 const groups=new Map();
 for(const item of items){
  const root=seriesRootTitle(item.title);
  const key=isSeriesFormat(item.format)&&root.length>=12?'series:'+root:'item:'+item.key;
  const old=groups.get(key);
  if(!old||(!seriesHasSeasonSuffix(item.title)&&seriesHasSeasonSuffix(old.title))||(seriesHasSeasonSuffix(item.title)===seriesHasSeasonSuffix(old.title)&&(item.year||9999)<(old.year||9999)))groups.set(key,item);
 }
 return [...groups.values()];
}
function mergeSeasonMetadata(old,updated){
 old.total=Math.max(Number(old.total)||0,Number(updated.total)||0,...(old.watched||[]),...(updated.watched||[]));
 old.watched=tidyNums([...(old.watched||[]),...(updated.watched||[])],old.total);
 const episodeMap=new Map((old.episodes||[]).map(e=>[Number(e.number),e]));
 for(const ep of updated.episodes||[]){const prior=episodeMap.get(Number(ep.number));if(!prior){episodeMap.set(Number(ep.number),ep);continue}for(const [k,v] of Object.entries(ep))if((prior[k]==null||prior[k]===''||prior[k]===0||prior[k]===false)&&v!=null&&v!==''&&v!==0)prior[k]=v}
 old.episodes=[...episodeMap.values()].sort((a,b)=>a.number-b.number);
 old.loadedPages=[...new Set([...(old.loadedPages||[]),...(updated.loadedPages||[])])];
 for(const key of ['subtitle','year','source','sourceId','malId','format','communityScore','communitySource','releaseStatus','releaseStart','nextAiringAt','nextAiringEpisode','airedCount','airedCheckedAt','discoveredAt','imdbId','imdbSeasonNumber','imdbEpisodeAverage','imdbEpisodeCount','imdbCheckedAt']){
  if((old[key]==null||old[key]===''||old[key]===0)&&updated[key]!=null&&updated[key]!==''&&updated[key]!==0)old[key]=updated[key];
 }
 if(updated.releaseStatus)old.releaseStatus=updated.releaseStatus;
 if(updated.airedCount!=null)old.airedCount=Math.max(Number(old.airedCount)||0,Number(updated.airedCount)||0);
 if(updated.nextAiringAt){old.nextAiringAt=updated.nextAiringAt;old.nextAiringEpisode=updated.nextAiringEpisode}
 return old;
}
function reconcileSeriesLibrary(reference,remote){
 if(!reference||!Array.isArray(remote)||!remote.length)return reference;
 const matched=state.anime.filter(a=>linkedToSeries(a,remote,reference));
 if(!matched.some(a=>a.id===reference.id))matched.push(reference);
 const root=seriesRootTitle(reference.title);
 const keeper=matched.find(a=>seriesRootTitle(a.title)===root&&!seriesHasSeasonSuffix(a.title))||matched.slice().sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')))[0];
 const remap=new Map(),allSeasons=[],seenIds=new Set();
 for(const a of matched){
  const seasonMap=new Map();
  for(const s of a.seasons||[]){
   const same=allSeasons.find(x=>sameSeriesSeason(x,s));
   if(same){mergeSeasonMetadata(same,s);seasonMap.set(s.id,same.id);continue}
   const copy=normSeason(s,allSeasons.length);
   if(seenIds.has(copy.id))copy.id='manual-'+uuid();
   seenIds.add(copy.id);allSeasons.push(copy);seasonMap.set(s.id,copy.id);
  }
  remap.set(a.id,seasonMap);
  if(a!==keeper){
   keeper.favorite=keeper.favorite||a.favorite;
   if(keeper.rating==null&&a.rating!=null)keeper.rating=a.rating;
   if(!keeper.cover&&a.cover)keeper.cover=a.cover;
   if(!keeper.synopsis&&a.synopsis)keeper.synopsis=a.synopsis;
   if(!keeper.notes&&a.notes)keeper.notes=a.notes;
   if(!keeper.genre&&a.genre)keeper.genre=a.genre;
   if(a.status==='watching'&&keeper.status==='planning')keeper.status='watching';
  }
 }
 for(const s of remote){
  const prior=allSeasons.find(x=>sameSeriesSeason(x,s));
  if(prior){mergeSeasonMetadata(prior,s);continue}
  const copy=normSeason(s,allSeasons.length);if(seenIds.has(copy.id))copy.id='manual-'+uuid();
  seenIds.add(copy.id);allSeasons.push(copy);
 }
 allSeasons.sort((a,b)=>(a.year||9999)-(b.year||9999)||String(a.releaseStart||'9999').localeCompare(String(b.releaseStart||'9999'))||(Number(a.sourceId)||0)-(Number(b.sourceId)||0));
 allSeasons.forEach((s,i)=>{if(!String(s.id).startsWith('manual-'))s.title=(s.format==='MOVIE'?'Filmi':'Sezoni '+(i+1))});
 keeper.seasons=allSeasons;keeper.hydrated=true;
 if(seriesHasSeasonSuffix(keeper.title)){
  const main=matched.find(a=>!seriesHasSeasonSuffix(a.title));
  if(main)keeper.title=main.title;
  else keeper.title=String(reference.title||keeper.title).replace(/(?:\s+(?:\d+(?:st|nd|rd|th)\s+season|season\s+\d+|s\d+|part\s+\d+|cour\s+\d+))+$/i,'').trim()||keeper.title;
 }
 const first=remote[0];if(first?.year&&(!keeper.year||first.year<keeper.year))keeper.year=first.year;
 if(first?.source&&first?.sourceId){keeper.source=first.source;keeper.sourceId=first.sourceId;keeper.malId=first.malId||keeper.malId;keeper.format=mediaFormat(first.format)}
 keeper.updatedAt=now();
 const removed=new Set(matched.filter(a=>a!==keeper).map(a=>a.id));
 for(const event of state.history||[]){
  const map=remap.get(event.id);if(!map)continue;
  event.seasonId=map.get(event.seasonId)||event.seasonId;
  if(removed.has(event.id))event.id=keeper.id;
 }
 state.anime=state.anime.filter(a=>!removed.has(a.id));syncTotals(keeper);
 if(removed.has(detailId)){const map=remap.get(detailId);activeSeasonId=map?.get(activeSeasonId)||activeSeasonId;detailId=keeper.id}
 return keeper;
}

function inLibrary(item){return state.anime.find(a=>a.seasons.some(s=>(s.source===item.source&&s.sourceId===String(item.sourceId))||(item.malId&&s.malId===String(item.malId)))||(a.source===item.source&&a.sourceId===String(item.sourceId))||canonicalTitle(a.title)===canonicalTitle(item.title)||(item.english&&canonicalTitle(a.title)===canonicalTitle(item.english)))}
function mapAniList(a){return {malId:String(a.idMal||''),key:'al-'+a.id,source:'AniList',sourceId:String(a.id),title:a.title?.romaji||a.title?.english||a.title?.native||'Pa titull',english:a.title?.english||'',total:a.episodes||0,year:a.seasonYear||a.startDate?.year||null,genre:(a.genres||[]).join(', '),cover:a.coverImage?.large||'',synopsis:textOnly(a.description),score:a.averageScore,format:mediaFormat(a.format||'ANIME'),sourceUrl:a.siteUrl||''}}
function mapJikan(a){return {malId:String(a.mal_id||''),key:'mal-'+a.mal_id,source:'MyAnimeList',sourceId:String(a.mal_id),title:a.title||a.title_english||'Pa titull',english:a.title_english||'',total:a.episodes||0,year:a.year||a.aired?.prop?.from?.year||null,genre:(a.genres||[]).map(g=>g.name).join(', '),cover:a.images?.jpg?.large_image_url||a.images?.jpg?.image_url||'',synopsis:textOnly(a.synopsis),score:a.score?Math.round(a.score*10):null,format:mediaFormat(a.type||'ANIME'),sourceUrl:a.url||''}}
async function fetchAniList(q,page,signal){const response=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query:API_QUERY,variables:{search:q,page}}),signal});if(!response.ok)throw Error('AniList: HTTP '+response.status);const json=await response.json();if(json.errors?.length)throw Error(json.errors[0].message||'AniList error');const data=json.data?.Page;if(!data)throw Error('Përgjigje e paplotë');return {items:(data.media||[]).map(mapAniList),hasNext:!!data.pageInfo?.hasNextPage,provider:'AniList'}}
async function fetchJikan(q,page,signal){const url='https://api.jikan.moe/v4/anime?'+new URLSearchParams({q,page:String(page),limit:'12',sfw:'true'});const response=await fetch(url,{signal});if(!response.ok)throw Error('MyAnimeList: HTTP '+response.status);const json=await response.json();return {items:(json.data||[]).map(mapJikan),hasNext:!!json.pagination?.has_next_page,provider:'MyAnimeList'}}
function clearCatalog(){catalogRequest++;clearTimeout(catalogTimer);catalogController?.abort();catalogController=null;catalogItems=[];catalogQuery='';catalogPage=0;catalogProvider='';catalogHasNext=false;catalogBusy=false;$('catalog-grid').innerHTML='';$('catalog-more').classList.add('hidden');$('catalog-state').textContent='Shkruaj të paktën 2 shkronja për të kërkuar në katalog.';renderTopResults()}
function catalogTile(item){const existing=inLibrary(item),url=validPoster(item.cover),sourceUrl=validPoster(item.sourceUrl),id=escapeHTML(item.key),synopsis=item.synopsis||'Përshkrimi nuk është i disponueshëm për këtë anime.';return `<article class="catalog-card"><button class="catalog-open" data-preview="${id}" aria-label="Hap ${escapeHTML(item.title)}"><div class="catalog-art">${url?`<img src="${escapeHTML(url)}" alt="Posteri i ${escapeHTML(item.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()"/>`:''}<span class="catalog-type">${escapeHTML(item.format)}</span>${item.score!=null?`<span class="catalog-score">★ ${(Number(item.score)/10).toFixed(1)}</span>`:''}</div></button><div class="catalog-info"><h4><button class="catalog-title-open" data-preview="${id}">${escapeHTML(item.title)}</button></h4><div class="catalog-english" title="${escapeHTML(item.english)}">${escapeHTML(item.english&&item.english!==item.title?item.english:' ')}</div><div class="catalog-meta">${item.year||'Viti ?'} • ${item.total||'?'} ep. • ${escapeHTML(item.source)}</div><p class="catalog-synopsis">${escapeHTML(synopsis)}</p><div class="catalog-action">${existing?`<button class="ghost in-library" data-detail="${escapeHTML(existing.id)}">✓ Në bibliotekë · Hape</button>`:`<button class="primary" data-catalog-add="${id}" data-catalog-status="watching">+ Po shikoj</button><button class="ghost" data-catalog-add="${id}" data-catalog-status="planning">+ Në listë</button>`}</div>${sourceUrl?`<a class="catalog-link" href="${escapeHTML(sourceUrl)}" target="_blank" rel="noopener noreferrer">Detaje te ${escapeHTML(item.source)} ↗</a>`:''}</div></article>`}
function renderCatalog(){const grid=$('catalog-grid');grid.innerHTML=catalogItems.length?catalogGrouped(catalogItems).map(catalogTile).join(''):(catalogQuery&&!catalogBusy?'<div class="catalog-empty">Nuk u gjet asnjë rezultat. Provo titullin anglisht ose japonisht.</div>':'');$('catalog-more').classList.toggle('hidden',!catalogHasNext||catalogBusy);renderTopResults()}
async function searchCatalog(q,page=1){if(catalogBusy&&page>1)return;const token=++catalogRequest;catalogController?.abort();const controller=new AbortController();catalogController=controller;catalogBusy=true;catalogQuery=q;catalogPage=page;if(page===1){catalogItems=[];catalogProvider='';$('catalog-grid').innerHTML=''}$('catalog-state').textContent=page===1?'Duke kërkuar në katalog...':'Duke ngarkuar rezultate të tjera...';$('catalog-more').classList.add('hidden');try{let result;if(catalogProvider==='MyAnimeList'&&page>1){result=await fetchJikan(q,page,controller.signal)}else{try{result=await fetchAniList(q,page,controller.signal)}catch(err){if(controller.signal.aborted)throw err;result=await fetchJikan(q,page,controller.signal)}}if(token!==catalogRequest)return;catalogProvider=result.provider;const prior=new Set(catalogItems.map(a=>a.key));for(const anime of result.items){if(!prior.has(anime.key)){catalogItems.push(anime);prior.add(anime.key)}}catalogHasNext=result.hasNext;catalogBusy=false;$('catalog-state').textContent=`${catalogItems.length} rezultate për “${q}” · Burimi: ${catalogProvider}${catalogHasNext?' · Shfaq më shumë për rezultate të tjera':''}`;renderCatalog()}catch(err){if(token!==catalogRequest||controller.signal.aborted)return;catalogBusy=false;catalogHasNext=false;$('catalog-state').textContent='Kërkimi online nuk u lidh. Kontrollo internetin dhe provo përsëri.';$('catalog-grid').innerHTML='<div class="catalog-empty catalog-error">Katalogu është përkohësisht i padisponueshëm. Biblioteka jote vazhdon të funksionojë offline. <button class="ghost" data-catalog-retry="1">Provo sërish</button></div>';console.warn('Catalog search failed',err)}}
function syncSearch(q,from){const value=String(q||'').slice(0,180);$('search').value=value;$('global-search').value=value;search=value.trim().toLocaleLowerCase();render();clearTimeout(catalogTimer);catalogController?.abort();if(!value.trim()||value.trim().length<2){clearCatalog();if(value.trim())$('catalog-state').textContent='Shkruaj të paktën 2 shkronja.';return}const query=value.trim();catalogRequest++;catalogQuery=query;catalogPage=0;catalogBusy=false;catalogItems=[];catalogHasNext=false;$('catalog-grid').innerHTML='';$('catalog-more').classList.add('hidden');$('catalog-state').textContent='Kërkimi po përgatitet...';renderTopResults();catalogTimer=setTimeout(()=>searchCatalog(query,1),650);if(from==='top'){setView('explore');$('top-results').classList.remove('hidden')}else $('top-results').classList.add('hidden')}
const addingCatalogKeys=new Set();
async function addCatalogItem(key,status){
 const item=catalogItems.find(a=>a.key===key);if(!item||addingCatalogKeys.has(key))return null;
 addingCatalogKeys.add(key);
 try{
  const already=inLibrary(item);
  if(already){return isSeriesFormat(item.format)?(await hydrateSeasons(already.id,true)||already.id):already.id}
  let remote=[];
  if(item.source&&isSeriesFormat(item.format)){
   try{remote=item.source==='AniList'?await anilistSeasons(item.sourceId,item.format):await jikanSeasons(item.sourceId,item.format)}
   catch(err){console.warn('Could not safely verify this series',err);notify('S’u verifikuan sezonet online. Provo përsëri që të shmangim një kopje të dyfishtë.');return null}
  }
  // The source could have loaded into the library while the network request was in flight.
  const second=inLibrary(item);if(second)return second.id;
  const existing=remote.length?state.anime.find(a=>linkedToSeries(a,remote,item)):null;
  if(existing){
   const keeper=reconcileSeriesLibrary(existing,remote);
   save();render();renderHome();renderCatalog();if(typeof v8RenderSeasonal==='function')v8RenderSeasonal();
   notify('“'+item.title+'” është pjesë e “'+keeper.title+'”. Sezonet u bashkuan ✓');
   return keeper.id;
  }
  const anime=normalized({id:uuid(),title:item.title,total:item.total,watched:[],status,year:item.year,genre:item.genre,cover:item.cover,source:item.source,communityScore:item.score,communitySource:item.source,sourceId:item.sourceId,malId:item.malId,format:item.format,sourceUrl:item.sourceUrl,synopsis:item.synopsis,createdAt:now(),updatedAt:now()});
  state.anime.unshift(anime);
  const added=remote.length?reconcileSeriesLibrary(anime,remote):anime;
  upcomingCheckedAt=0;catalogSyncAt=0;persistCache();save();render();renderHome();renderCatalog();if(typeof v8RenderSeasonal==='function')v8RenderSeasonal();
  notify('“'+added.title+'” u shtua me '+added.seasons.length+' sezon(e) ✓');
  return added.id;
 }finally{addingCatalogKeys.delete(key)}
}
// TVmaze: complete season and episode metadata (not a live streaming provider).
// TVmaze's One Piece grouping is by broadcast year. No account or API key is required.
function isOnePiece(a){return a.malId==='21'||((canonicalTitle(a.title)==='one piece')&&(a.year===1999||!a.year));}
function tvEpisodeAbsolute(e,index){return index+1;}
function watchedAbsolute(a){let offset=0,out=new Set();for(const s of a.seasons){for(const n of s.watched)out.add(s.globalStart?s.globalStart+n-1:offset+n);offset+=s.total||Math.max(0,...s.watched)}return out;}
async function syncTVmaze(id,force=false,silent=false){
 const a=state.anime.find(x=>x.id===id);if(!a)return false;
 if(a.tvmazeLoaded&&!force)return true;
 if(hydratingTV.has(id))return false;
 hydratingTV.add(id);if(!silent)notify('Po marr sezonet dhe episodet nga TVmaze...');
 try{
  let showId=a.tvmazeId;
  if(!showId){
   if(isOnePiece(a))showId='1505';
   else {
    const res=await fetch('https://api.tvmaze.com/search/shows?q='+encodeURIComponent(a.title));if(!res.ok)throw Error('Kërkimi i sezoneve dështoi');
    const candidates=await res.json();const norm=canonicalTitle(a.title);
    const found=candidates.find(x=>canonicalTitle(x.show?.name)===norm&&(!a.year||!x.show.premiered||Math.abs(Number(x.show.premiered.slice(0,4))-a.year)<=1));
    if(!found){if(!silent)notify('Nuk u gjet një përputhje e sigurt në TVmaze. Sezonet ekzistuese ruhen.');return false;}
    showId=String(found.show.id);
   }
  }
  const resp=await fetch('https://api.tvmaze.com/shows/'+encodeURIComponent(showId)+'/episodes');if(!resp.ok)throw Error('Episode HTTP '+resp.status);
  const list=await resp.json();const valid=list.filter(e=>Number.isInteger(e.season)&&e.season>0&&Number.isInteger(e.number)&&e.number>0).sort((x,y)=>x.season-y.season||x.number-y.number);
  if(!valid.length)throw Error('Lista e episodeve është bosh');
  const previous=watchedAbsolute(a),oldRatings=new Map(a.seasons.map(s=>[s.id,{myRating:s.myRating,communityScore:s.communityScore,communitySource:s.communitySource}])),oldTotal=a.seasons.reduce((n,s)=>n+s.total,0),groups=new Map();
  valid.forEach((e,i)=>{const bucket=groups.get(e.season)||[];bucket.push({...e,absolute:i+1});groups.set(e.season,bucket)});
  let sequence=0;const seasons=[];
  for(const [year,eps] of groups){
   const maxNum=Math.max(...eps.map(e=>e.number));const start=sequence+1;
   const data=normSeason({id:'tv-'+showId+'-'+year,title:'Sezoni '+(seasons.length+1)+' · '+year,subtitle:'Viti '+year,total:maxNum,year,source:'TVmaze',sourceId:String(showId),format:'TV',globalStart:start,episodes:eps.map(e=>({number:e.number,absolute:e.absolute,title:e.name||'',aired:e.airdate||'',airedAt:e.airstamp||'',summary:textOnly(e.summary),image:e.image?.original||e.image?.medium||'',url:e.url||'',tvmazeEpisodeId:String(e.id||'')})),watched:eps.filter(e=>previous.has(e.absolute)).map(e=>e.number),...oldRatings.get('tv-'+showId+'-'+year)},seasons.length);
   seasons.push(data);sequence+=maxNum;
  }
  // Never discard watches beyond the currently available catalog (e.g. an older export).
  if(oldTotal>sequence){const extra=[...previous].filter(n=>n>sequence);if(extra.length){seasons.push(normSeason({id:'manual-archive-'+showId,title:'Episode të tjera',subtitle:'Nga regjistrimi yt i mëparshëm',total:Math.max(...extra)-sequence,globalStart:sequence+1,watched:extra.map(n=>n-sequence)},seasons.length));}}
  const current=activeSeasonId; a.seasons=seasons;a.tvmazeId=String(showId);a.tvmazeLoaded=true;a.hydrated=true;syncTotals(a);a.updatedAt=now();save();render();
  if(detailId===id){activeSeasonId=a.seasons.some(s=>s.id===current)?current:(a.seasons.find(s=>s.watched.length<s.total)||a.seasons[0]).id;episodePage=0;renderDetail(id)}
  if(!silent)notify(seasons.length+' sezone dhe '+list.length+' episode u përditësuan ✓');
  return true;
 }catch(err){console.warn('TVmaze unavailable',err);if(!silent)notify('Nuk u morën sezonet TV. Nuk u ndryshua progresi.');return false}
 finally{hydratingTV.delete(id)}
}
const hydratingTV=new Set();
function jumpToEpisode(id){const a=state.anime.find(x=>x.id===id),input=$('episode-jump-input');if(!a||!input)return;const n=Number(input.value);if(!Number.isInteger(n)||n<1||n>10000){notify('Shkruaj një numër të vlefshëm episodi.');return}
 let offset=0;for(const s of a.seasons){const start=s.globalStart||offset+1;const total=s.total||Math.max(24,...s.watched);if(n>=start&&n<start+total){activeSeasonId=s.id;episodePage=Math.floor((n-start)/24);renderDetail(id);loadSeasonEpisodes(id,s.id,episodePage);const target=$('detail-body').querySelector('[data-season-ep][data-ep="'+(n-start+1)+'"]');target?.scrollIntoView({block:'center',behavior:'smooth'});return;}offset+=total;}
 notify('Episodi nuk gjendet në sezonet aktuale. Provo përditësimin e sezoneve.');}


// v5: top-right instant results and full-page catalog preview.
function renderTopResults(){
 const box=$('top-results');if(!box)return;
 const q=$('search').value.trim();if(q.length<2){box.classList.add('hidden');box.innerHTML='';$('search').setAttribute('aria-expanded','false');return}
 const items=catalogGrouped(catalogItems).slice(0,6), local=state.anime.filter(a=>canonicalTitle(a.title).includes(canonicalTitle(q))).slice(0,4);
 const foundIds=new Set(local.map(a=>a.id));
 const tiles=local.map(a=>`<button class="top-result" data-detail="${escapeHTML(a.id)}">${validPoster(a.cover)?`<img src="${escapeHTML(a.cover)}" alt=""/>`:'<span class="thumb-placeholder"></span>'}<span><strong>${escapeHTML(a.title)}</strong><small>✓ Në bibliotekën tënde</small></span></button>`);
 for(const x of items){const match=inLibrary(x);if(match&&foundIds.has(match.id))continue;tiles.push(`<button class="top-result" data-preview="${escapeHTML(x.key)}">${validPoster(x.cover)?`<img src="${escapeHTML(x.cover)}" alt=""/>`:'<span class="thumb-placeholder"></span>'}<span><strong>${escapeHTML(x.title)}</strong><small>${escapeHTML(x.year||'')} · ${escapeHTML(x.source)}</small></span></button>`)}
 box.innerHTML=(tiles.join('')||'<p class="top-results-info">Po kërkoj online…</p>')+'<button class="top-see-all" id="see-all-search">Shiko të gjitha rezultatet ↓</button>';
 $('search').setAttribute('aria-expanded',String(!box.classList.contains('hidden')));
}
function openCatalogPreview(key){
 const item=catalogItems.find(x=>x.key===key);if(!item)return;
 const already=inLibrary(item);if(already){openDetail(already.id);return}
 previewKey=key;detailId=null;$('top-results').classList.add('hidden');$('detail-heading').textContent='Anime · '+item.title;
 const poster=validPoster(item.cover)?`<img src="${escapeHTML(item.cover)}" alt="Posteri i ${escapeHTML(item.title)}"/>`:'';
 $('detail-body').innerHTML=`<div class="detail-top preview-top"><div class="detail-poster preview-poster">${poster}</div><div class="detail-content preview-info"><span class="eyebrow">${escapeHTML(item.source)} · ${escapeHTML(item.format)}</span><h3>${escapeHTML(item.title)}</h3><p class="preview-meta">${escapeHTML(item.english||'')} · ${item.year||'Viti nuk dihet'} · ${item.total||'?'} episode</p>${item.genre?`<p class="preview-meta">${escapeHTML(item.genre)}</p>`:''}${item.score!=null?`<span class="pill">★ ${(item.score/10).toFixed(1)} / 10 · ${escapeHTML(item.source)}</span>`:''}<div class="preview-add-row"><button class="primary" data-preview-add="${escapeHTML(key)}" data-preview-status="watching">+ Po shikoj</button><button class="ghost" data-preview-add="${escapeHTML(key)}" data-preview-status="planning">+ Në listë</button><button class="ghost" data-preview-add="${escapeHTML(key)}" data-preview-status="completed">✓ Përfunduar</button></div><p class="season-note">Pasi ta shtosh, hapen sezonet dhe mund të shënosh episodet një nga një.</p></div></div><section class="details-section"><h4>Historia</h4><p class="preview-synopsis">${escapeHTML(item.synopsis||'Përshkrimi nuk është i disponueshëm.')}</p>${validPoster(item.sourceUrl)?`<a class="catalog-link" href="${escapeHTML(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">Burimi: ${escapeHTML(item.source)} ↗</a>`:''}</section>`;
 showModal('detail-modal');
}
function setView(which){
 view=which;$('library-view').classList.toggle('hidden',which!=='library');$('upcoming-view').classList.toggle('hidden',which!=='upcoming');$('home-view').classList.toggle('hidden',which!=='home');$('home-nav').classList.toggle('active',which==='home');$('library-nav').classList.toggle('active',which==='library'&&filter==='all');
 document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',which==='library'&&b.dataset.filter===filter));
 $('upcoming-nav').classList.toggle('active',which==='upcoming');$('page-title').textContent=which==='upcoming'?'Episode të reja ✦':which==='home'?'Mirë se u ktheve ✦':'Biblioteka ime ✦';
 if(which==='upcoming'){renderUpcoming();if(!upcomingCheckedAt||Date.now()-upcomingCheckedAt>DAY)refreshUpcoming()}else if(which==='home')renderHome();else render();
 window.scrollTo({top:0,behavior:'smooth'});
}
// v5: never silently mark skipped episodes as watched.
function requestEpisodeToggle(id,seasonId,n){
 const a=state.anime.find(x=>x.id===id),s=a?.seasons.find(x=>x.id===seasonId);if(!s)return;
 if(!s.watched.includes(n)&&n>releasedCount(s)){notify('Episodi nuk ka dalë ende.');return;}
 if(s.watched.includes(n)){updateSeasonEpisode(id,seasonId,n,false);return}
 const skipped=[];for(let i=1;i<n;i++)if(!s.watched.includes(i))skipped.push(i);
 if(!skipped.length){updateSeasonEpisode(id,seasonId,n,true);return}
 pendingEpisode={id,seasonId,n,skipped};$('confirm-heading').textContent='Episodi '+n+' · '+s.title;
 $('confirm-copy').textContent=`Po shënon episodin ${n}. Episodet ${skipped.length<=9?skipped.join(', '):skipped[0]+'–'+skipped[skipped.length-1]} të këtij sezoni nuk janë ende të shënuara. Dëshiron t’i shënosh edhe ato si të para?`;
 showModal('confirm-modal');
}
function confirmEpisode(all){
 const action=pendingEpisode;if(!action)return;pendingEpisode=null;closeModal('confirm-modal');
 const a=state.anime.find(x=>x.id===action.id),s=a?.seasons.find(x=>x.id===action.seasonId);if(!s)return;
 if(!all){updateSeasonEpisode(action.id,action.seasonId,action.n,true);return}
 const newly=[...action.skipped,action.n].filter(n=>!s.watched.includes(n));
 s.watched=tidyNums([...s.watched,...newly],s.total);syncTotals(a);a.updatedAt=now();
 releasedStatusAfterWatch(a,true);
 for(const ep of newly)record(a.id,ep,'watched',s.id);
 save();render();if(detailId===a.id)renderDetail(a.id);renderHome();notify(newly.length+' episode u shënuan ✓');
}
// v5: announcements, not unverified streaming availability.
const AIRING_QUERY=`query ($id:Int,$idMal:Int){Media(id:$id,idMal:$idMal,type:ANIME){id idMal title{romaji english} nextAiringEpisode{airingAt episode} relations{edges{relationType node{id title{romaji english} format nextAiringEpisode{airingAt episode}}}}}}`;
async function getAirMedia(id,mal){
 const variables={};if(id)variables.id=Number(id);else if(mal)variables.idMal=Number(mal);else return null;
 const res=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query:AIRING_QUERY,variables})});
 if(!res.ok)throw Error('AniList HTTP '+res.status);const result=await res.json();if(result.errors?.length)throw Error(result.errors[0].message);return result.data?.Media||null;
}
function addAirEntry(out,unique,x){const when=Number(x.when)||0;if(when<Date.now()-7*DAY)return;const key=x.animeId+':'+x.title+':'+x.episode+':'+when;if(unique.has(key))return;unique.add(key);out.push(x)}
const AIR_BATCH=`query($ids:[Int],$malIds:[Int]){a:Page(page:1,perPage:50){media(id_in:$ids,type:ANIME){id idMal title{romaji english} nextAiringEpisode{airingAt episode} airingSchedule(notYetAired:false,perPage:6,sort:TIME_DESC){nodes{airingAt episode}} relations{edges{relationType node{id title{romaji english} nextAiringEpisode{airingAt episode}}}}}}b:Page(page:1,perPage:50){media(idMal_in:$malIds,type:ANIME){id idMal title{romaji english} nextAiringEpisode{airingAt episode} airingSchedule(notYetAired:false,perPage:6,sort:TIME_DESC){nodes{airingAt episode}} relations{edges{relationType node{id title{romaji english} nextAiringEpisode{airingAt episode}}}}}}}`;
async function refreshUpcoming(force=false){
 if(upcomingBusy)return;if(!force&&upcomingCheckedAt&&Date.now()-upcomingCheckedAt<30*60000){renderUpcoming();return}
 upcomingBusy=true;$('refresh-upcoming').disabled=true;$('upcoming-status').textContent='Po kontrolloj datat e transmetimit…';renderHome();
 const targets=state.anime.filter(a=>['watching','completed'].includes(a.status)),rows=[],unique=new Set(),ids=[],mals=[];let failures=0;
 const byId=new Map(),byMal=new Map();
 for(const anime of targets){
  for(const s of anime.seasons){for(const e of s.episodes||[]){if(!e.airedAt)continue;const when=Date.parse(e.airedAt);if(Number.isFinite(when))addAirEntry(rows,unique,{animeId:anime.id,title:anime.title,cover:anime.cover,episode:s.globalStart?s.globalStart+e.number-1:e.absolute||e.number,season:s.title,seasonId:s.id,seasonEpisode:e.number,when,source:'TVmaze',url:'https://www.tvmaze.com/'})}}
  const seasons=anime.seasons.filter(s=>s.source==='AniList'&&/^[0-9]+$/.test(s.sourceId));if(seasons.length)for(const s of seasons){const id=Number(s.sourceId);if(!byId.has(id)){ids.push(id);byId.set(id,[])}byId.get(id).push(anime)}
  else if(anime.source==='AniList'&&/^[0-9]+$/.test(anime.sourceId)){const id=Number(anime.sourceId);if(!byId.has(id)){ids.push(id);byId.set(id,[])}byId.get(id).push(anime)}
  else if(/^[0-9]+$/.test(anime.malId)){const id=Number(anime.malId);if(!byMal.has(id)){mals.push(id);byMal.set(id,[])}byMal.get(id).push(anime)}
 }
 const total=Math.max(ids.length,mals.length);for(let offset=0;offset<total;offset+=25){
  const batchIds=ids.slice(offset,offset+25),batchMals=mals.slice(offset,offset+25);
  try{const res=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query:AIR_BATCH,variables:{ids:batchIds.length?batchIds:[0],malIds:batchMals.length?batchMals:[0]}})});if(!res.ok)throw Error('AniList HTTP '+res.status);const result=await res.json();if(result.errors?.length)throw Error(result.errors[0].message);
   for(const media of new Map([...(result.data?.a?.media||[]),...(result.data?.b?.media||[])].map(m=>[m.id,m])).values()){
    const matching=new Map([...(byId.get(media.id)||[]),...(byMal.get(media.idMal)||[])].map(a=>[a.id,a]));for(const anime of matching.values()){
     const localSeason=anime.seasons.find(s=>(s.source==='AniList'&&s.sourceId===String(media.id))||(media.idMal&&s.malId===String(media.idMal)))||anime.seasons[0];const push=(m,label)=>{const n=m?.nextAiringEpisode;if(!n?.airingAt)return;const season=anime.seasons.find(s=>(s.source==='AniList'&&s.sourceId===String(m.id))||(m.idMal&&s.malId===String(m.idMal)))||localSeason;addAirEntry(rows,unique,{animeId:anime.id,title:label||anime.title,cover:anime.cover,episode:n.episode,season:season?.title||anime.title,seasonId:season?.id||'',seasonEpisode:n.episode,when:n.airingAt*1000,source:'AniList',url:'https://anilist.co/anime/'+m.id})};push(media,anime.title);for(const aired of media.airingSchedule?.nodes||[]){if(!aired?.airingAt||aired.airingAt*1000>=Date.now())continue;addAirEntry(rows,unique,{animeId:anime.id,title:anime.title,cover:anime.cover,episode:aired.episode,season:localSeason?.title||anime.title,seasonId:localSeason?.id||'',seasonEpisode:aired.episode,when:aired.airingAt*1000,source:'AniList',url:'https://anilist.co/anime/'+media.id})}
     if(anime.status==='completed')for(const edge of media.relations?.edges||[])if(edge.relationType==='SEQUEL'&&edge.node?.nextAiringEpisode)push(edge.node,edge.node.title?.english||edge.node.title?.romaji||anime.title);
    }
   }
  }catch(e){failures++;console.warn('Air schedule sync failed',e)}
 }
 if(!failures){const keep=upcomingEntries.filter(x=>x.when>=Date.now()-7*DAY&&x.when<Date.now());const merged=new Map();for(const x of [...keep,...rows])merged.set(x.animeId+':'+x.title+':'+x.episode+':'+x.when,x);upcomingEntries=[...merged.values()].sort((a,b)=>a.when-b.when).slice(-2000);upcomingCheckedAt=Date.now();persistCache()}else if(rows.length){const merged=new Map();for(const x of [...upcomingEntries.filter(x=>x.when>=Date.now()-7*DAY),...rows])merged.set(x.animeId+':'+x.title+':'+x.episode+':'+x.when,x);upcomingEntries=[...merged.values()].sort((a,b)=>a.when-b.when)}
 upcomingFailures=failures;upcomingBusy=false;$('refresh-upcoming').disabled=false;renderUpcoming();renderHome();
}
function airDate(ms){return new Intl.DateTimeFormat('sq-AL',{timeZone:'Europe/Tirane',weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(ms))}
function renderUpcoming(){
 const nowTime=Date.now(),future=upcomingEntries.filter(x=>x.when>=nowTime&&x.when<=nowTime+airingWindow*DAY),recent=upcomingEntries.filter(x=>x.when>=nowTime-7*DAY&&x.when<nowTime).sort((a,b)=>b.when-a.when).slice(0,30);
 document.querySelectorAll('[data-upcoming-window]').forEach(b=>b.classList.toggle('active',Number(b.dataset.upcomingWindow)===airingWindow));
 $('upcoming-count').textContent=upcomingEntries.filter(x=>x.when>=nowTime).length;
 $('upcoming-status').textContent=upcomingBusy?'Po kontrolloj oraret…':`${future.length} episode të njoftuara · ${upcomingCheckedAt?'Kontrolluar: '+airDate(upcomingCheckedAt):'Ende pa rifreskim'}${upcomingFailures?' · '+upcomingFailures+' kërkime nuk u realizuan':''}`;
 $('upcoming-grid').innerHTML=(future.length?future.map(x=>`<article class="air-card"><div class="air-cover">${validPoster(x.cover)?`<img src="${escapeHTML(x.cover)}" alt="" loading="lazy">`:''}</div><div class="air-info"><span class="eyebrow">${escapeHTML(x.source)} · EP ${x.episode}</span><h3>${escapeHTML(x.title)}</h3><p>${escapeHTML(x.season)}</p><div class="air-when">◷ ${escapeHTML(airDate(x.when))} · Shqipëri</div><p>Orar i njoftuar transmetimi; jo garanci për një platformë streaming.</p></div><div class="air-actions"><button class="primary" data-open-airing="${escapeHTML(x.animeId)}">Hap animen</button><a class="ghost" target="_blank" rel="noopener noreferrer" href="${escapeHTML(x.url)}">Burimi ↗</a></div></article>`).join(''):'<div class="air-empty">Nuk ka episode të ardhshme të konfirmuara në këtë periudhë. Zgjero periudhën ose rifresko orarin.</div>')+(recent.length?'<div class="air-recent-heading"><h3>✓ Sapo transmetuar · 7 ditët e fundit</h3><p>Ora e transmetimit në Japoni; jo domosdoshmërisht dalja në platformën tënde.</p></div>'+recent.map(x=>`<article class="air-card"><div class="air-cover">${validPoster(x.cover)?`<img src="${escapeHTML(x.cover)}" alt="" loading="lazy">`:''}</div><div class="air-info"><span class="eyebrow">${escapeHTML(x.source)} · EP ${escapeHTML(x.episode)}</span><h3>${escapeHTML(x.title)}</h3><p>${escapeHTML(x.season)}</p><div class="air-when">✓ ${escapeHTML(airDate(x.when))} · Shqipëri</div></div><div class="air-actions"><button class="primary" data-open-airing="${escapeHTML(x.animeId)}">Hap animen</button></div></article>`).join(''):'');
}

// AnimeTrack 6.0 — personal home, favorite controls, separate rating sources, resilient daily sync.
const DAY=86400000,CACHE_KEY='animetrack_v6_meta';
let catalogSyncBusy=false,catalogSyncAt=0,catalogSyncFailed=0;
try{const x=JSON.parse(localStorage.getItem(CACHE_KEY)||'{}');if(Array.isArray(x.upcoming)){upcomingEntries=x.upcoming.filter(y=>y&&Number.isFinite(Number(y.when)));upcomingCheckedAt=Number(x.upcomingCheckedAt)||0;}catalogSyncAt=Number(x.catalogSyncAt)||0;}catch(e){console.warn('Catalog cache unavailable',e)}
function persistCache(){try{localStorage.setItem(CACHE_KEY,JSON.stringify({upcoming:upcomingEntries.slice(0,2000),upcomingCheckedAt,catalogSyncAt}))}catch(e){console.warn('Schedule cache could not be saved',e)}}
function ratingOptions(value){let out=`<option value="" ${value==null?'selected':''}>Pa vlerësim</option>`;for(let x=0.5;x<=10;x+=.5)out+=`<option value="${x}" ${Number(value)===x?'selected':''}>★ ${x.toFixed(1)} / 10</option>`;return out}
function setPersonalRating(a,value,seasonId){const target=seasonId?a.seasons.find(s=>s.id===seasonId):a;if(!target)return;target[seasonId?'myRating':'rating']=value===''?null:Math.max(.5,Math.min(10,Number(value)));a.updatedAt=now();save();render();if(detailId===a.id)renderDetail(a.id);notify(seasonId?'Vlerësimi i sezonit u ruajt ✓':'Vlerësimi i animes u ruajt ✓')}
function setAnimeStatus(id,status){const a=state.anime.find(x=>x.id===id);if(!a||!STATUS[status])return;a.status=status;a.updatedAt=now();upcomingCheckedAt=0;persistCache();save();render();if(detailId===id)renderDetail(id);renderHome();notify('Statusi: '+STATUS[status]);if(['watching','completed'].includes(status)&&!upcomingCheckedAt)refreshUpcoming()}
function toggleFavorite(id){const a=state.anime.find(x=>x.id===id);if(!a)return;a.favorite=!a.favorite;a.updatedAt=now();save();render();if(detailId===id)renderDetail(id);renderHome();notify(a.favorite?'U shtua te të preferuarat ♥':'U hoq nga të preferuarat')}
function removeAnime(id){const a=state.anime.find(x=>x.id===id);if(!a||!confirm(`Ta heqim “${a.title}” dhe të gjitha episodet e tij nga biblioteka? Kjo nuk kthehet pa kopje rezervë.`))return;state.anime=state.anime.filter(x=>x.id!==id);state.history=state.history.filter(h=>h.id!==id);upcomingCheckedAt=0;persistCache();save();closeModal('detail-modal');render();renderHome();notify('Anime u hoq nga biblioteka')}
function formatStamp(t){return t?new Intl.DateTimeFormat('sq-AL',{timeZone:'Europe/Tirane',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(t)):'Ende pa kontroll'}
function homeCard(a){const next=nextSeasonEp(a),at=a.seasons.indexOf(next?.season)+1;return `<article class="home-anime">${cover(a,'home-poster')}<div class="home-card-body"><span class="eyebrow">${escapeHTML(STATUS[a.status])}${a.favorite?' · ♥':''}</span><h4>${escapeHTML(a.title)}</h4><p>${count(a)}/${releasedTotal(a)} ep. · ${percentage(a)}%</p><div class="progress"><span style="width:${percentage(a)}%"></span></div><div class="home-card-actions"><button class="ghost" data-detail="${escapeHTML(a.id)}">Hap faqen</button>${next?`<button class="primary" data-next="${escapeHTML(a.id)}">+ S${at} E${next.n}</button>`:''}</div></div></article>`}
function renderHome(){const h=$('home-view');if(!h)return;const all=state.anime,watching=all.filter(a=>a.status==='watching').sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),favorites=all.filter(a=>a.favorite).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));$('home-anime-count').textContent=all.length;$('home-ep-count').textContent=all.reduce((n,a)=>n+count(a),0).toLocaleString('sq-AL');$('home-fav-count').textContent=favorites.length;$('home-watching-count').textContent=watching.length;$('home-continue').innerHTML=watching.length?watching.slice(0,4).map(homeCard).join(''):'<div class="home-empty">Asnjë anime te «Po shikoj». Kërko një titull dhe shtoje në bibliotekë.</div>';const newSeasons=all.flatMap(a=>a.status==='completed'?a.seasons.filter(isConfirmedFutureSeason).map(s=>({a,s})):[]).sort((x,y)=>{const ax=x.s.nextAiringAt?x.s.nextAiringAt*1000:Date.parse(x.s.releaseStart||'2999-12-31'),ay=y.s.nextAiringAt?y.s.nextAiringAt*1000:Date.parse(y.s.releaseStart||'2999-12-31');return ax-ay}).slice(0,8);$('home-new-seasons').innerHTML=newSeasons.length?newSeasons.map(({a,s})=>{const when=s.nextAiringAt?formatStamp(s.nextAiringAt*1000):(s.releaseStart?new Date(s.releaseStart+'T12:00:00').toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'Data ende pa u njoftuar');return `<div class="home-season-alert"><span class="eyebrow">VAZHDIM I KONFIRMUAR</span><strong>${escapeHTML(a.title)}</strong><p>${escapeHTML(s.subtitle||s.title)} · ${escapeHTML(when)}${s.total?' · '+s.total+' ep. të planifikuara':''}</p><button class="ghost" data-detail="${escapeHTML(a.id)}">Hap sezonet →</button></div>`}).join(''):'<div class="home-empty">Kur një anime e përfunduar të ketë sequel ose sezon të ri të konfirmuar, do të shfaqet këtu automatikisht.</div>';$('home-favorites').innerHTML=favorites.length?favorites.slice(0,4).map(homeCard).join(''):'<div class="home-empty">Shto anime te të preferuarat me butonin ♡ në faqen e tyre.</div>';
const nowTime=Date.now(),up=upcomingEntries.filter(x=>x.when>=nowTime).slice(0,3),recentAir=upcomingEntries.filter(x=>x.when<nowTime&&x.when>nowTime-7*DAY).slice(-2).reverse();$('home-premieres').innerHTML=(up.length?up.map(x=>`<button class="home-premiere" data-open-airing="${escapeHTML(x.animeId)}"><span class="premiere-time">${escapeHTML(formatStamp(x.when))}</span><strong>${escapeHTML(x.title)}</strong><small>EP ${escapeHTML(x.episode)} · ${escapeHTML(x.source)}</small></button>`).join(''):'<div class="home-empty">Nuk ka premierë të ardhshme të konfirmuar.</div>')+(recentAir.length?'<p class="eyebrow" style="margin:12px 0 7px">SAPO TRANSMETUAR</p>'+recentAir.map(x=>`<button class="home-premiere" data-open-airing="${escapeHTML(x.animeId)}"><span class="premiere-time">✓ ${escapeHTML(formatStamp(x.when))}</span><strong>${escapeHTML(x.title)}</strong><small>EP ${escapeHTML(x.episode)}</small></button>`).join(''):'');
const recent=state.history.filter(e=>e.action==='watched'||e.action==='season-watched').slice(-5).reverse();$('home-activity').innerHTML=recent.length?recent.map(e=>{const a=all.find(x=>x.id===e.id);return `<div class="activity-row"><span>✓ ${escapeHTML(a?.title||'Anime e hequr')}</span><small>${e.action==='season-watched'?'Sezon i përfunduar':'Episodi '+e.episode} · ${escapeHTML(formatStamp(Date.parse(e.date)))}</small></div>`}).join(''):'<div class="home-empty">Historia e shikimit do të shfaqet këtu.</div>';
$('last-sync').textContent='Katalogu: '+formatStamp(catalogSyncAt)+' · Orari: '+formatStamp(upcomingCheckedAt)+(catalogSyncFailed?' · Disa burime nuk u arritën':'');$('home-daily-refresh').disabled=catalogSyncBusy||upcomingBusy;
}
// One GraphQL request per batch; no invented IMDb ratings. Matches by AniList and MAL IDs.
const DAILY_QUERY=`query($ids:[Int],$malIds:[Int]){a:Page(page:1,perPage:50){media(id_in:$ids,type:ANIME){id idMal averageScore episodes status startDate{year month day} format title{english romaji} nextAiringEpisode{airingAt episode} relations{edges{relationType node{id idMal averageScore type episodes status startDate{year month day} format seasonYear nextAiringEpisode{airingAt episode} title{english romaji}}}}}} b:Page(page:1,perPage:50){media(idMal_in:$malIds,type:ANIME){id idMal averageScore episodes status startDate{year month day} format title{english romaji} nextAiringEpisode{airingAt episode} relations{edges{relationType node{id idMal averageScore type episodes status startDate{year month day} format seasonYear nextAiringEpisode{airingAt episode} title{english romaji}}}}}}}`;
async function refreshCatalogDaily(force=false){if(catalogSyncBusy)return;if(!force&&catalogSyncAt&&Date.now()-catalogSyncAt<DAY)return;catalogSyncBusy=true;renderHome();let errors=0,updated=0;const a=state.anime.filter(x=>x.source&&(/^[0-9]+$/.test(x.sourceId)||/^[0-9]+$/.test(x.malId))),byId=new Map(),byMal=new Map();for(const anime of a){for(const s of anime.seasons){if(s.source==='AniList'&&/^[0-9]+$/.test(s.sourceId))byId.set(Number(s.sourceId),true);if(s.malId&&/^[0-9]+$/.test(s.malId))byMal.set(Number(s.malId),true)}if(anime.source==='AniList'&&/^[0-9]+$/.test(anime.sourceId))byId.set(Number(anime.sourceId),true);if(anime.malId&&/^[0-9]+$/.test(anime.malId))byMal.set(Number(anime.malId),true)}
const ids=[...byId.keys()],mals=[...byMal.keys()],total=Math.max(ids.length,mals.length,1);for(let offset=0;offset<total;offset+=24){const batchIds=ids.slice(offset,offset+24),batchMals=mals.slice(offset,offset+24);if(!batchIds.length&&!batchMals.length)continue;
try{const r=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query:DAILY_QUERY,variables:{ids:batchIds.length?batchIds:[0],malIds:batchMals.length?batchMals:[0]}})});if(!r.ok)throw Error('AniList HTTP '+r.status);const j=await r.json();if(j.errors?.length)throw Error(j.errors[0].message);const found=[...(j.data?.a?.media||[]),...(j.data?.b?.media||[])],unique=new Map(found.map(m=>[m.id,m]));for(const m of unique.values())for(const anime of a){const primary=(anime.source==='AniList'&&anime.sourceId===String(m.id))||(anime.malId&&anime.malId===String(m.idMal));if(primary){if(m.averageScore!=null){anime.communityScore=m.averageScore;anime.communitySource='AniList'}if(m.format)anime.format=mediaFormat(m.format);updated++}for(const s of anime.seasons)if((s.source==='AniList'&&s.sourceId===String(m.id))||(s.malId&&s.malId===String(m.idMal))){if(m.averageScore!=null){s.communityScore=m.averageScore;s.communitySource='AniList'}if(m.episodes&&m.episodes>s.total&&s.source!=='TVmaze')s.total=m.episodes;if(s.source!=='TVmaze')releaseFromMedia(s,m);
for(const edge of m.relations?.edges||[]){const node=edge.node;if(edge.relationType!=='SEQUEL'||!['TV','TV_SHORT','ONA'].includes(mediaFormat(node?.format))||node?.type!=='ANIME'||anime.seasons.some(v=>(v.source==='AniList'&&v.sourceId===String(node.id))||(node.idMal&&v.malId===String(node.idMal))))continue;const ns=mediaSeason(node);ns.title='Sezoni '+(anime.seasons.length+1);ns.discoveredAt=now();anime.seasons.push(ns);updated++}}
} }catch(e){errors++;console.warn('Daily catalog sync failed',e)}}
if(!errors){catalogSyncAt=Date.now();persistCache()}catalogSyncFailed=errors;for(const anime of a)syncTotals(anime);save();catalogSyncBusy=false;render();renderHome();if(detailId)renderDetail(detailId);if(force)notify(errors?'Disa burime nuk u arritën; të dhënat e vjetra ruhen.':'Katalogu u përditësua ✓');}
async function dailySync(force=false){await refreshCatalogDaily(force);await refreshUpcoming(force);renderHome()}


// AnimeTrack 7.0: reliable 'last actually watched' and visible TV Time-style lists.
const V7_STATUSES=[['watching','◉','Watching','Po shikoj'],['completed','✓','Completed','Përfunduar'],['paused','Ⅱ','On Hold','Në pauzë'],['dropped','×','Dropped','E lënë'],['planning','◇','Plan to Watch','Në listë']];
function v7Label(a){return escapeHTML(STATUS[a.status]||a.status)}
function v7StatusSelect(a){return `<select class="v7-inline-select" data-status-select="${escapeHTML(a.id)}" aria-label="Ndrysho statusin e ${escapeHTML(a.title)}">${V7_STATUSES.map(([code,,label])=>`<option value="${code}" ${a.status===code?'selected':''}>${label}</option>`).join('')}</select>`}
function v7LastEvent(a){for(let i=state.history.length-1;i>=0;i--){const h=state.history[i];if(h.id!==a.id||!['watched','season-watched'].includes(h.action))continue;const s=a.seasons.find(x=>x.id===h.seasonId)||a.seasons[0];if(!s)continue;let n=h.action==='season-watched'?Math.max(0,...s.watched):Number(h.episode);if(n>0&&s.watched.includes(n))return {a,s,n,date:h.date}}let s=[...a.seasons].reverse().find(s=>s.watched.length);return s?{a,s,n:Math.max(...s.watched),date:a.updatedAt}:null}
function v7Recent(){const m=state.anime.map(a=>v7LastEvent(a)).filter(Boolean);return m.sort((x,y)=>Date.parse(y.date||0)-Date.parse(x.date||0))}
function v7NextDescription(a){const nex=nextSeasonEp(a);if(!nex)return 'Të gjitha episodet e njohura janë shënuar';return `Sezoni ${a.seasons.indexOf(nex.season)+1} · Episodi ${nex.n}`}
function v7EnhanceLibrary(){
 const counts=Object.fromEntries(V7_STATUSES.map(([status])=>[status,state.anime.filter(a=>a.status===status).length]));
 $('library-status-strip').innerHTML=`<button data-filter="all" class="${filter==='all'?'active':''}">Të gjitha <span class="tiny-count">${state.anime.length}</span></button><button data-filter="movies" class="${filter==='movies'?'active':''}">🎬 Filma <span class="tiny-count">${state.anime.filter(isMovieAnime).length}</span></button><button data-filter="waiting" class="${filter==='waiting'?'active':''}">◷ Në pritje <span class="tiny-count">${state.anime.filter(a=>!!futureSeasonOf(a)).length}</span></button><button data-filter="genres" class="${filter==='genres'?'active':''}">◈ Zhanret <span class="tiny-count">${genreCounts().length}</span></button>`+V7_STATUSES.map(([k,icon,label])=>`<button data-filter="${k}" class="${filter===k?'active':''}">${icon} ${label} <span class="tiny-count">${counts[k]}</span></button>`).join('');
 for(const card of $('anime-grid').querySelectorAll('.anime-card')){
 const detail=card.querySelector('[data-detail]');const a=state.anime.find(x=>x.id===detail?.dataset.detail);if(!a)continue;
 const info=card.querySelector('.card-info');if(info&&!info.querySelector('[data-status-select]'))info.insertAdjacentHTML('beforeend',v7StatusSelect(a));
 for(const el of [card.querySelector('.poster'),card.querySelector('.card-title')])if(el){el.classList.add(el.classList.contains('poster')?'poster-link':'title-link');el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label','Hap '+a.title);}
 }
}
function v7RenderHome(){
 const counts=Object.fromEntries(V7_STATUSES.map(([code])=>[code,state.anime.filter(a=>a.status===code).length]));
 $('home-status-grid').innerHTML=V7_STATUSES.map(([code,icon,label,description])=>`<button class="home-status-tile" data-go-status="${code}"><i>${icon}</i><b>${counts[code]}</b><span>${label}</span><small>${description}</small></button>`).join('');
 const recent=v7Recent(),last=recent[0],watched=state.anime.filter(a=>a.status==='watching').sort((a,b)=>{const x=v7LastEvent(a),y=v7LastEvent(b);return Date.parse(y?.date||b.updatedAt)-Date.parse(x?.date||a.updatedAt)});
 if(last){const {a,s,n,date}=last,idx=a.seasons.indexOf(s)+1;
 $('home-last-watched').innerHTML=`${cover(a,'last-cover')}<div><span class="eyebrow">EPISODI I FUNDIT • ${escapeHTML(formatStamp(Date.parse(date)))}</span><h3>${escapeHTML(a.title)}</h3><p>Ke parë: <b>S${idx} · E${n}</b> ${s.episodes.find(x=>x.number===n)?.title?'· '+escapeHTML(s.episodes.find(x=>x.number===n).title):''}</p><p>Episodi i radhës: <b>${escapeHTML(v7NextDescription(a))}</b></p><div class="progress"><span style="width:${percentage(a)}%"></span></div><div class="last-actions"><button class="primary" data-next="${escapeHTML(a.id)}" ${nextSeasonEp(a)?'':'disabled'}>+1 Episod ✓</button><button class="ghost" data-open-episode="${escapeHTML(a.id)}" data-target-season="${escapeHTML(s.id)}" data-target-ep="${n}">Hap episodet →</button><button class="ghost" data-undo-last="${escapeHTML(a.id)}" data-undo-season="${escapeHTML(s.id)}" data-undo-ep="${n}" title="Hiq shënimin e episodit të fundit">↶ Zhbëj</button>${v7StatusSelect(a)}</div></div>`;
 }else $('home-last-watched').innerHTML='<div class="v7-empty"><strong>Ende nuk ke regjistruar episode.</strong><br>Hap një anime dhe shëno episodin e parë. Ai do të shfaqet këtu automatikisht.</div>';
 $('home-continue').innerHTML=watched.length?watched.slice(0,6).map(a=>{let h=homeCard(a);return h.replace('</div></div></article>',`${v7StatusSelect(a)}</div></div></article>`)}).join(''):'<div class="v7-empty">Lista Watching është bosh. Zgjidh një anime dhe vendose te Po shikoj.</div>';
 $('home-watch-next').innerHTML=watched.length?watched.slice(0,8).map(a=>{let nx=nextSeasonEp(a);return `<div class="watch-next-row"><strong title="${escapeHTML(a.title)}">${escapeHTML(a.title)}</strong><small>${nx?`Vazhdo: ${escapeHTML(v7NextDescription(a))}`:'Të gjitha episodet e njohura janë shënuar'}</small><div><button class="ghost" data-detail="${escapeHTML(a.id)}">Sezonet →</button><button class="plus" data-next="${escapeHTML(a.id)}" ${nx?'':'disabled'}>+1 Episod</button></div></div>`}).join(''):'<div class="v7-empty">Kur të shtosh anime te Watching, këtu del episodi i radhës për secilën.</div>';
 $('home-recent-watched').innerHTML=recent.length?recent.slice(0,3).map(({a,s,n,date})=>`<article class="recent-card" data-status="${a.status}">${cover(a,'recent-poster')}<div class="recent-info"><span class="eyebrow">SË FUNDI · ${escapeHTML(formatStamp(Date.parse(date)))}</span><strong title="${escapeHTML(a.title)}">${escapeHTML(a.title)}</strong><span class="watch-status-summary">${v7Label(a)}</span><small>Ke parë: Sezoni ${a.seasons.indexOf(s)+1} · Episodi ${n} ${s.episodes.find(ep=>ep.number===n)?.title?'· '+escapeHTML(s.episodes.find(ep=>ep.number===n).title):''}</small><div class="progress"><span style="width:${percentage(a)}%"></span></div><div class="last-actions"><button class="ghost" data-detail="${escapeHTML(a.id)}">Hap sezonet →</button><button class="plus" data-next="${escapeHTML(a.id)}" ${nextSeasonEp(a)?'':'disabled'}>+1 Episod</button></div></div></article>`).join(''):'<div class="v7-empty">Historiku i animeve që ke parë do të shfaqet këtu.</div>';
}
const v7RenderOriginal=render;
render=function(){v7RenderOriginal();v7EnhanceLibrary();};
const v7HomeOriginal=renderHome;
renderHome=function(){v7HomeOriginal();v7RenderHome();};
// Extra view hooks avoid a stale home after quickly switching status in the library.
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(b){
 if(b.dataset.goStatus)setFilter(b.dataset.goStatus);
 if(b.id==='home-last-history')$('home-history-title').scrollIntoView({behavior:'smooth',block:'start'});
 if(b.dataset.undoLast){updateSeasonEpisode(b.dataset.undoLast,b.dataset.undoSeason,Number(b.dataset.undoEp),false);}
 if(b.dataset.openEpisode){const id=b.dataset.openEpisode;openDetail(id);activeSeasonId=b.dataset.targetSeason;episodePage=Math.floor((Number(b.dataset.targetEp)-1)/24);renderDetail(id);loadSeasonEpisodes(id,activeSeasonId,episodePage);}
 }
 const open=e.target.closest('.anime-card .poster-link,.anime-card .title-link,.home-anime .home-poster');if(open){const card=open.closest('.anime-card,.home-anime');const id=card?.querySelector('[data-detail]')?.dataset.detail;if(id)openDetail(id)}
});
document.addEventListener('keydown',e=>{if(!['Enter',' '].includes(e.key))return;const open=e.target.closest('.poster-link,.title-link');if(open){e.preventDefault();open.click()}});

// IMDb via personal OMDb key. No IMDb scraping and no substitution with AniList ratings.
const OMDB_KEY_STORAGE='animetrack_omdb_key';
function omdbKey(){return (localStorage.getItem(OMDB_KEY_STORAGE)||'').trim()}
function imdbBadge(){const badge=$('imdb-key-badge');if(badge)badge.textContent=omdbKey()?'✓ OMDb i lidhur':'Lidh OMDb për notat reale'}
function setOmdbKey(){const key=$('omdb-key-input').value.trim();if(!/^[A-Za-z0-9]{5,32}$/.test(key)){notify('Vendos një çelës të vlefshëm OMDb.');return}try{localStorage.setItem(OMDB_KEY_STORAGE,key);$('omdb-key-input').value='';imdbBadge();notify('Çelësi u ruajt në këtë shfletues ✓')}catch(e){notify('Nuk u ruajt çelësi në këtë shfletues')}}
async function fetchIMDb(id,force=true){
 const a=state.anime.find(x=>x.id===id);if(!a)return;
 const key=omdbKey();if(!key){$('imdb-settings').open=true;notify('Vendos fillimisht çelësin OMDb në kryefaqe.');return}
 if(!force&&a.imdbCheckedAt&&Date.now()-Date.parse(a.imdbCheckedAt)<86400000)return;
 let chosen=String(a.imdbId||'').trim();
 const manual=$(`detail-body`)?.querySelector('[data-imdb-id]');if(manual&&detailId===id){const typed=manual.value.trim();if(typed&&!/^tt\d{5,12}$/.test(typed)){notify('IMDb ID duhet të jetë p.sh. tt0388629');return}chosen=typed}
 try{
  // For title lookup, prefer an exact TVmaze mapping when available. Otherwise require exact title/year check.
  if(!chosen&&a.tvmazeId){try{const r=await fetch('https://api.tvmaze.com/shows/'+encodeURIComponent(a.tvmazeId));if(r.ok){let show=await r.json();if(/^tt\d{5,12}$/.test(show.externals?.imdb||''))chosen=show.externals.imdb}}catch(e){console.warn('TVmaze IMDb link unavailable',e)}}
  const params=new URLSearchParams({apikey:key});if(chosen)params.set('i',chosen);else{params.set('t',a.title);if(a.year)params.set('y',String(a.year))}
  const resp=await fetch('https://www.omdbapi.com/?'+params);if(!resp.ok)throw Error('OMDb HTTP '+resp.status);
  const data=await resp.json();if(data.Response==='False')throw Error(data.Error||'Titulli nuk u gjet në OMDb');
  if(!/^tt\d{5,12}$/.test(data.imdbID||''))throw Error('IMDb ID mungon në përgjigje');
  if(!chosen){const canonical=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
   const exact=canonical(data.Title)===canonical(a.title);
   const sameYear=!a.year||!Number(data.Year?.slice(0,4))||Math.abs(Number(data.Year.slice(0,4))-a.year)<=1;
   if(!exact||!sameYear)throw Error('Titulli nuk u përputh me siguri. Vendos IMDb ID manualisht.');
  }
  const rating=Number(data.imdbRating);
  if(!Number.isFinite(rating)||rating<0||rating>10)throw Error('IMDb nuk ka vlerësim të disponueshëm për këtë titull');
  a.imdbId=data.imdbID;a.imdbRating=rating;a.imdbVotes=Number(String(data.imdbVotes||'0').replace(/,/g,''))||0;a.imdbCheckedAt=now();
  save();render();if(detailId===id)renderDetail(id);renderHome();notify('Nota IMDb u mor nga OMDb: '+rating+'/10 ✓');
 }catch(err){console.warn('IMDb rating failed',err);if(force)notify('IMDb: '+String(err.message||'Nuk u mor nota').slice(0,115))}
}
async function fetchSeasonIMDb(id,seasonId){
 const a=state.anime.find(x=>x.id===id),s=a?.seasons.find(x=>x.id===seasonId);if(!s||!a)return;
 const key=omdbKey();if(!key){notify('Lidh fillimisht çelësin OMDb në kryefaqe.');return}
 const el=$('detail-body');const entered=el.querySelector('[data-imdb-season-id]')?.value.trim()||a.imdbId||'';
 const season=Number(el.querySelector('[data-imdb-season-number]')?.value);
 if(!/^tt\d{5,12}$/.test(entered)||!Number.isInteger(season)||season<1||season>200){notify('Vendos një IMDb ID dhe numër sezoni të vlefshëm.');return}
 try{const params=new URLSearchParams({apikey:key,i:entered,Season:String(season)});
 const resp=await fetch('https://www.omdbapi.com/?'+params);if(!resp.ok)throw Error('OMDb HTTP '+resp.status);
 const data=await resp.json();if(data.Response==='False')throw Error(data.Error||'Sezoni nuk u gjet');
 if(!Array.isArray(data.Episodes)||!data.Episodes.length)throw Error('Nuk ka episode për këtë sezon');
 const ratings=data.Episodes.map(e=>Number(e.imdbRating)).filter(n=>Number.isFinite(n)&&n>=0&&n<=10);
 if(!ratings.length)throw Error('Ky sezon nuk ka ende vlerësime episodesh');
 s.imdbId=entered;s.imdbSeasonNumber=season;s.imdbEpisodeAverage=Math.round(ratings.reduce((x,y)=>x+y,0)/ratings.length*100)/100;s.imdbEpisodeCount=ratings.length;s.imdbCheckedAt=now();
 save();if(detailId===id)renderDetail(id);notify(`Mesatarja e ${ratings.length} episodeve IMDb: ${s.imdbEpisodeAverage.toFixed(2)}/10 ✓`);
 }catch(err){console.warn('Season IMDb unavailable',err);notify('IMDb sezoni: '+String(err.message||'Nuk u morën vlerësimet').slice(0,105))}
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b?.dataset.imdbSeasonFetch)fetchSeasonIMDb(b.dataset.id,b.dataset.imdbSeasonFetch)});

$('omdb-save-key')?.addEventListener('click',setOmdbKey);
$('omdb-clear-key')?.addEventListener('click',()=>{localStorage.removeItem(OMDB_KEY_STORAGE);$('omdb-key-input').value='';imdbBadge();notify('Çelësi OMDb u hoq nga ky shfletues.')});
$('season-confirm-all').addEventListener('click',()=>resolveSeasonConfirm(true));
$('season-confirm-only').addEventListener('click',()=>resolveSeasonConfirm(false));
$('season-confirm-cancel').addEventListener('click',()=>closeModal('season-confirm-modal'));
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b?.dataset.imdbFetch)fetchIMDb(b.dataset.imdbFetch)});
const v71OpenDetail=openDetail;
openDetail=function(id){v71OpenDetail(id)};
imdbBadge();

$('upcoming-nav').addEventListener('click',()=>setView('upcoming'));
$('home-nav').addEventListener('click',()=>setView('home'));$('library-nav').addEventListener('click',()=>setFilter('all'));$('home-go-library').addEventListener('click',()=>setFilter('all'));$('home-go-upcoming').addEventListener('click',()=>setView('upcoming'));$('home-daily-refresh').addEventListener('click',()=>dailySync(true));$('home-search-btn').addEventListener('click',()=>{$('search').focus()});$('home-random').addEventListener('click',()=>{const p=state.anime.filter(x=>x.status==='planning');if(!p.length){notify('Nuk ke anime në listën «Plan to Watch».');return}openDetail(p[Math.floor(Math.random()*p.length)].id)});document.addEventListener('change',e=>{const x=e.target;if(x.dataset.statusSelect)setAnimeStatus(x.dataset.statusSelect,x.value);if(x.dataset.animeRating){const a=state.anime.find(a=>a.id===x.dataset.animeRating);if(a)setPersonalRating(a,x.value)}if(x.dataset.seasonRating){const a=state.anime.find(a=>a.id===x.dataset.id);if(a)setPersonalRating(a,x.value,x.dataset.seasonRating)}});
$('refresh-upcoming').addEventListener('click',()=>refreshUpcoming(true));
$('confirm-all').addEventListener('click',()=>confirmEpisode(true));
$('confirm-only').addEventListener('click',()=>confirmEpisode(false));
$('confirm-cancel').addEventListener('click',()=>closeModal('confirm-modal'));
$('search').addEventListener('focus',()=>{if($('search').value.trim().length>=2){$('top-results').classList.remove('hidden');renderTopResults()}});
$('search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const first=$('top-results').querySelector('[data-preview],[data-detail]');if(first)first.click();else $('discover').scrollIntoView({behavior:'smooth'})}if(e.key==='Escape')$('top-results').classList.add('hidden')});
$('top-results').addEventListener('click',e=>{if(e.target.closest('#see-all-search')){$('top-results').classList.add('hidden');setView('explore');$('discover').scrollIntoView({behavior:'smooth'})}});
document.addEventListener('click',e=>{if(!e.target.closest('.top-search-wrap'))$('top-results').classList.add('hidden')});
// Filter buttons always navigate back to library (even after visiting premieres).
document.querySelectorAll('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>setView('library')));

$('global-search').addEventListener('input',e=>syncSearch(e.target.value,'catalog'));
$('clear-global').addEventListener('click',()=>{syncSearch('','catalog');$('global-search').focus()});
$('catalog-more').addEventListener('click',()=>{if(!catalogBusy&&catalogHasNext)searchCatalog(catalogQuery,catalogPage+1)});

$('add-btn').addEventListener('click',()=>openForm());$('hero-add').addEventListener('click',()=>openForm());$('view-watching').addEventListener('click',()=>setFilter('watching'));$('anime-form').addEventListener('submit',saveForm);$('delete-btn').addEventListener('click',deleteAnime);$('search').addEventListener('input',e=>syncSearch(e.target.value,'top'));$('sort').addEventListener('change',e=>{sort=e.target.value;render()});$('export-btn').addEventListener('click',exportData);$('export-mobile').addEventListener('click',exportData);$('import-btn').addEventListener('click',()=>$('import-file').click());$('import-mobile').addEventListener('click',()=>$('import-file').click());$('import-file').addEventListener('change',e=>importData(e.target.files?.[0]));
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.filter)setFilter(b.dataset.filter);if(b.dataset.catalogAdd){addCatalogItem(b.dataset.catalogAdd,b.dataset.catalogStatus).then(id=>{if(id)openDetail(id)})}if(b.dataset.preview)openCatalogPreview(b.dataset.preview);if(b.dataset.catalogRetry)searchCatalog(catalogQuery,1);if(b.dataset.close)closeModal(b.dataset.close);if(b.dataset.detail)openDetail(b.dataset.detail);if(b.dataset.edit)openForm(b.dataset.edit);if(b.dataset.next)markNext(b.dataset.next);if(b.dataset.season){activeSeasonId=b.dataset.season;episodePage=0;renderDetail(b.dataset.id);loadSeasonEpisodes(b.dataset.id,activeSeasonId,0)}if(b.dataset.seasonEp){const a=state.anime.find(a=>a.id===b.dataset.id),s=a?.seasons.find(s=>s.id===b.dataset.seasonEp),n=Number(b.dataset.ep);if(s)requestEpisodeToggle(a.id,s.id,n)}if(b.dataset.seasonToggle)markSeason(b.dataset.id,b.dataset.seasonToggle,b.dataset.seen==='1');if(b.dataset.addSeason)addManualSeason(b.dataset.addSeason);if(b.dataset.seasonEdit)editSeasonCount(b.dataset.id,b.dataset.seasonEdit);if(b.dataset.syncSeasons)hydrateSeasons(b.dataset.syncSeasons,true);if(b.dataset.moreEpisodes){const a=state.anime.find(x=>x.id===b.dataset.id),s=a?.seasons.find(x=>x.id===b.dataset.moreEpisodes);if(s)loadSeasonEpisodes(a.id,s.id,episodePage)}if(b.dataset.page){if(detailId){episodePage+=b.dataset.page==='next'?1:-1;renderDetail(detailId);loadSeasonEpisodes(detailId,activeSeasonId,episodePage)}}if(b.dataset.jumpEpisode)jumpToEpisode(b.dataset.jumpEpisode);if(b.dataset.tvSync)syncTVmaze(b.dataset.tvSync,true);if(b.dataset.upcomingWindow){airingWindow=Number(b.dataset.upcomingWindow);renderUpcoming()}if(b.dataset.openAiring)openDetail(b.dataset.openAiring);if(b.dataset.favorite)toggleFavorite(b.dataset.favorite);if(b.dataset.removeAnime)removeAnime(b.dataset.removeAnime);if(b.dataset.previewAdd){addCatalogItem(b.dataset.previewAdd,b.dataset.previewStatus).then(id=>{if(id)openDetail(id)})}});
document.querySelectorAll('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id)}));document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal-backdrop.show').forEach(m=>closeModal(m.id))});
// AnimeTrack 8.0 — desktop seasonal catalog and simplified home.
const V8_SEASON_CACHE='animetrack_v8_season_cache';
const V8_LABELS={WINTER:'Dimër',SPRING:'Pranverë',SUMMER:'Verë',FALL:'Vjeshtë'};
const V8_ORDER=['WINTER','SPRING','SUMMER','FALL'];
let v8Year=2026,v8Quarter='FALL',v8Page=1,v8More=false,v8Provider='AniList',v8Items=[],v8Loading=false,v8Serial=0,v8SeasonCache={};
try{let raw=JSON.parse(localStorage.getItem(V8_SEASON_CACHE)||'{}');if(raw&&typeof raw==='object'&&!Array.isArray(raw))v8SeasonCache=raw}catch(e){console.warn('Season cache unavailable',e)}
function v8StoreCache(){try{const entries=Object.entries(v8SeasonCache).sort((a,b)=>(b[1]?.at||0)-(a[1]?.at||0)).slice(0,48);localStorage.setItem(V8_SEASON_CACHE,JSON.stringify(Object.fromEntries(entries)))}catch(e){console.warn('Season cache storage unavailable',e)}}
function v8CacheKey(page=v8Page){return `${v8Year}-${v8Quarter}-${page}-${$('season-sort').value}`}
function v8SetMessage(msg){$('season-catalog-state').textContent=msg}
function v8Filters(){return v8Items.filter(x=>($('season-format').value==='ALL'||x.format===$('season-format').value)&&(!$('season-unadded').checked||!inLibrary(x)))}
function v8FindItem(key){return v8Items.find(x=>x.key===key)}
function v8PrepareCatalog(item){if(item&&!catalogItems.some(x=>x.key===item.key))catalogItems.unshift(item)}
function v8Tile(item){const existing=inLibrary(item),image=validPoster(item.cover);return `<article class="seasonal-tile" data-source="${escapeHTML(item.source)}"><button type="button" class="seasonal-cover" data-season-open="${escapeHTML(item.key)}" aria-label="Hap ${escapeHTML(item.title)}">${image?`<img loading="lazy" src="${escapeHTML(image)}" alt="${escapeHTML(item.title)}">`:''}<span class="catalog-type">${escapeHTML(item.format||'ANIME')}</span>${item.score!=null?`<span class="catalog-score">★ ${(Number(item.score)/10).toFixed(1)} · ${escapeHTML(item.source)}</span>`:''}</button><div class="seasonal-info"><button class="seasonal-name" type="button" data-season-open="${escapeHTML(item.key)}">${escapeHTML(item.title)}</button><span class="seasonal-meta">${escapeHTML(String(item.year||v8Year))} · ${item.total||'?'} ep. · ${escapeHTML(item.source)}</span><p>${escapeHTML((item.genre||'Anime').split(',').slice(0,3).join(' · '))}</p><div class="seasonal-actions">${existing?`<button class="primary" data-detail="${escapeHTML(existing.id)}">✓ Në bibliotekë</button>`:`<button class="primary" data-season-add="${escapeHTML(item.key)}" data-season-status="watching">+ Watching</button><button class="ghost" data-season-add="${escapeHTML(item.key)}" data-season-status="planning">+ Plan to Watch</button>`}</div></div></article>`}
function v8RenderSeasonal(){const filtered=v8Filters();$('season-catalog-grid').innerHTML=filtered.length?filtered.map(v8Tile).join(''):`<div class="home-empty" style="grid-column:1/-1">${v8Loading?'Po ngarkohen animet…':v8Items.length?'Asnjë anime nuk përputhet me filtrat.':'Nuk ka ende rezultate. Provo të rifreskosh katalogun.'}</div>`;$('season-heading').textContent=V8_LABELS[v8Quarter]+' '+v8Year;$('season-more').classList.toggle('hidden',!v8More||v8Loading);$('season-refresh').disabled=v8Loading;$('season-more').disabled=v8Loading;v8RenderHomeTeaser()}
function v8RenderHomeTeaser(){const box=$('home-season-teaser');if(!box)return;let selected=(v8Items.length?v8Items:(v8SeasonCache[v8CacheKey(1)]?.items||[]));box.innerHTML=selected.length?selected.slice(0,4).map(x=>`<button type="button" class="teaser-card" data-teaser-open="${escapeHTML(x.key)}">${validPoster(x.cover)?`<img src="${escapeHTML(x.cover)}" alt="">`:''}<span><strong>${escapeHTML(x.title)}</strong><small>★ ${x.score!=null?(x.score/10).toFixed(1)+'/10':'—'} · ${escapeHTML(x.source)}</small></span></button>`).join(''):'<div class="home-empty" style="grid-column:1/-1">Hap “Sezonet anime” për të zbuluar titujt e rinj.</div>';$('home-seasonal-heading').querySelector('h3').textContent=V8_LABELS[v8Quarter]+' '+v8Year+' · anime të reja'}
const V8_QUERY=`query($page:Int,$season:MediaSeason,$year:Int,$sort:[MediaSort]){Page(page:$page,perPage:24){pageInfo{hasNextPage}media(type:ANIME,season:$season,seasonYear:$year,isAdult:false,sort:$sort){id idMal title{romaji english native} episodes averageScore format genres description coverImage{large} siteUrl seasonYear startDate{year month day}}}}`;
async function v8AniList(page){const response=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query:V8_QUERY,variables:{page,season:v8Quarter,year:v8Year,sort:[$('season-sort').value]}})});if(!response.ok)throw Error('AniList HTTP '+response.status);const j=await response.json();if(j.errors?.length)throw Error(j.errors[0].message);if(!j.data?.Page)throw Error('Përgjigje e paplotë AniList');return{items:(j.data.Page.media||[]).map(mapAniList),more:!!j.data.Page.pageInfo?.hasNextPage,provider:'AniList'}}
async function v8Jikan(page){const url=`https://api.jikan.moe/v4/seasons/${v8Year}/${v8Quarter.toLowerCase()}?page=${page}&limit=24&sfw=true`;const response=await fetch(url);if(!response.ok)throw Error('Jikan HTTP '+response.status);const j=await response.json();let items=(j.data||[]).map(mapJikan);if($('season-sort').value==='SCORE_DESC')items.sort((a,b)=>(b.score||0)-(a.score||0));return{items,more:!!j.pagination?.has_next_page,provider:'MyAnimeList/Jikan'}}
async function v8LoadSeason(page=1,force=false){if(v8Loading)return;const key=v8CacheKey(page),cached=v8SeasonCache[key],fresh=cached&&Date.now()-cached.at<DAY;const token=++v8Serial;v8Loading=true;if(page===1){v8Items=[];v8Page=1}v8RenderSeasonal();if(cached&&Array.isArray(cached.items)){if(page===1)v8Items=cached.items;else v8Items=[...v8Items,...cached.items.filter(x=>!v8Items.some(y=>y.key===x.key))];v8Page=page;v8More=!!cached.more;v8Provider=cached.provider||'AniList';v8SetMessage(`Të dhëna të ruajtura · ${v8Provider} · ${new Date(cached.at).toLocaleString('sq-AL')} ${fresh?'· të përditësuara':''}`);v8RenderSeasonal()}
if(fresh&&!force){v8Loading=false;v8RenderSeasonal();return}
v8SetMessage('Po marr katalogun e '+V8_LABELS[v8Quarter]+' '+v8Year+'…');try{let result;try{result=await v8AniList(page)}catch(e){console.warn('AniList seasons unavailable; using Jikan',e);result=await v8Jikan(page)}if(token!==v8Serial)return;const chosen=result.items.filter(x=>x&&x.key&&x.title);v8Items=page===1?chosen:[...v8Items,...chosen.filter(x=>!v8Items.some(y=>y.key===x.key))];v8Page=page;v8More=result.more;v8Provider=result.provider;v8SeasonCache[key]={items:chosen,at:Date.now(),more:result.more,provider:result.provider};v8StoreCache();v8SetMessage(`${v8Items.length} tituj të ngarkuar · ${v8Provider} · përditësuar tani · ${v8More?'ka rezultate të tjera':'fund i listës'}`)}catch(e){console.warn('Seasonal catalog failed',e);v8SetMessage(cached?`Burimi online nuk u lidh. Po shfaq rezultatet e ruajtura nga ${new Date(cached.at).toLocaleDateString('sq-AL')}.`:'Katalogu online nuk u lidh. Kontrollo internetin ose provo përsëri. Biblioteka jote nuk preket.')}finally{v8Loading=false;v8RenderSeasonal()}}
function v8ChooseSeason(year,quarter){if(v8Loading)return;v8Year=year;v8Quarter=quarter;$('season-year').value=String(year);$('season-quarter').value=quarter;v8Items=[];v8Page=1;v8More=false;v8RenderSeasonal();v8LoadSeason(1)}
function v8ShiftSeason(direction){let index=V8_ORDER.indexOf(v8Quarter)+direction,year=v8Year;if(index<0){year--;index=3}else if(index>3){year++;index=0}if(year<1960||year>2035)return;v8ChooseSeason(year,V8_ORDER[index])}
const v8OriginalSetView=setView;
setView=function(which){if(which==='seasons'||which==='explore'){view=which;for(const id of ['home-view','library-view','upcoming-view','explore-view','seasons-view'])$(id).classList.toggle('hidden',id!==(which==='seasons'?'seasons-view':'explore-view'));$('home-nav').classList.remove('active');$('library-nav').classList.remove('active');$('upcoming-nav').classList.remove('active');document.querySelectorAll('[data-filter]').forEach(b=>b.classList.remove('active'));$('explore-nav').classList.toggle('active',which==='explore');$('seasons-nav').classList.toggle('active',which==='seasons');$('page-title').textContent=which==='seasons'?'Sezonet e animeve ✦':'Zbulo anime ✦';if(which==='seasons'&&!v8Items.length)v8LoadSeason(1);window.scrollTo({top:0,behavior:'smooth'});return}v8OriginalSetView(which);$('explore-view').classList.add('hidden');$('seasons-view').classList.add('hidden');$('explore-nav').classList.remove('active');$('seasons-nav').classList.remove('active')};
const v8OriginalRenderDetail=renderDetail;
renderDetail=function(id){v8OriginalRenderDetail(id);$('detail-body').querySelectorAll('.imdb-chip,.imdb-tools,.imdb-season-bar').forEach(node=>node.remove())};
const v8OriginalRenderHome=renderHome;
renderHome=function(){v8OriginalRenderHome();const recent=v7Recent();$('home-recent-watched').innerHTML=recent.length?recent.slice(0,5).map(({a,s,n,date})=>`<article class="recent-card" data-status="${a.status}">${cover(a,'recent-poster')}<div class="recent-info"><span class="eyebrow">${escapeHTML(formatStamp(Date.parse(date)))}</span><strong title="${escapeHTML(a.title)}">${escapeHTML(a.title)}</strong><span class="watch-status-summary">${v7Label(a)}</span><small>S${a.seasons.indexOf(s)+1} · E${n} · ${count(a)}/${a.total||'?'} ep.</small><div class="progress"><span style="width:${percentage(a)}%"></span></div><div class="last-actions"><button class="ghost" data-detail="${escapeHTML(a.id)}">Hap</button><button class="plus" data-next="${escapeHTML(a.id)}" ${nextSeasonEp(a)?'':'disabled'}>+1 Ep.</button></div></div></article>`).join(''):'<div class="v7-empty">Shëno një episod dhe animi do të shfaqet këtu.</div>';v8RenderHomeTeaser()};
// Put the useful items at the top; eliminate visually duplicated "continue" blocks.
(function v8OrganizeHome(){const home=$('home-view'),hero=home.querySelector('.home-hero'),stats=home.querySelector('.home-stats'),status=$('home-status-grid'),statusHead=status.previousElementSibling,recentHead=$('home-history-title'),recent=$('home-recent-watched'),seasonHead=$('home-seasonal-heading'),seasonTeaser=$('home-season-teaser'),premiere=home.querySelector('.home-columns'),next=$('home-watch-next'),nextHead=next.previousElementSibling;for(const el of [hero,stats,statusHead,status,recentHead,recent,seasonHead,seasonTeaser,premiere,nextHead,next])home.appendChild(el);const last=$('home-last-watched');last?.classList.add('hidden');const duplicate=home.querySelector('#home-continue');duplicate?.classList.add('hidden');if(duplicate?.previousElementSibling)duplicate.previousElementSibling.classList.add('hidden')})();
for(let y=2035;y>=1960;y--){let o=document.createElement('option');o.value=String(y);o.textContent=String(y);$('season-year').appendChild(o)}$('season-year').value=String(v8Year);$('season-quarter').value=v8Quarter;
$('explore-nav').addEventListener('click',()=>setView('explore'));
$('seasons-nav').addEventListener('click',()=>setView('seasons'));
$('home-go-seasons').addEventListener('click',()=>setView('seasons'));
$('season-refresh').addEventListener('click',()=>v8LoadSeason(1,true));
$('season-more').addEventListener('click',()=>v8LoadSeason(v8Page+1));
$('season-year').addEventListener('change',e=>v8ChooseSeason(Number(e.target.value),v8Quarter));
$('season-quarter').addEventListener('change',e=>v8ChooseSeason(v8Year,e.target.value));
$('season-prev').addEventListener('click',()=>v8ShiftSeason(-1));
$('season-next').addEventListener('click',()=>v8ShiftSeason(1));
$('season-sort').addEventListener('change',()=>v8LoadSeason(1));
$('season-format').addEventListener('change',v8RenderSeasonal);
$('season-unadded').addEventListener('change',v8RenderSeasonal);
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.seasonOpen){const item=v8FindItem(b.dataset.seasonOpen);if(item){v8PrepareCatalog(item);openCatalogPreview(item.key)}}if(b.dataset.seasonAdd){const item=v8FindItem(b.dataset.seasonAdd);if(item){v8PrepareCatalog(item);addCatalogItem(item.key,b.dataset.seasonStatus||'planning').then(id=>{if(id){v8RenderSeasonal();openDetail(id)}})}}if(b.dataset.teaserOpen){const item=v8FindItem(b.dataset.teaserOpen)||v8SeasonCache[v8CacheKey(1)]?.items?.find(x=>x.key===b.dataset.teaserOpen);if(item){v8PrepareCatalog(item);openCatalogPreview(item.key)}else setView('seasons')}});
// Use the cached first page at startup; live data loads when the seasonal page opens.
if(v8SeasonCache[v8CacheKey(1)]?.items){v8Items=v8SeasonCache[v8CacheKey(1)].items;v8More=!!v8SeasonCache[v8CacheKey(1)].more;v8SetMessage('Të dhëna të ruajtura nga katalogu sezonal.');v8RenderSeasonal()}


// AnimeTrack 8.1: eliminate stale home duplicate, keep last-watch data independent of status.
(function v81Layout(){
 const home=$('home-view'), old=$('home-last-watched');
 if(old){const heading=old.previousElementSibling;if(heading?.querySelector('#home-last-history'))heading.remove();old.classList.add('hidden');}
 const hero=home.querySelector('.home-hero'),stats=home.querySelector('.home-stats'),head=$('home-history-title'),cards=$('home-recent-watched');
 home.prepend(hero);hero.after(stats);stats.after(head);head.after(cards);
 const subtitle=head.querySelector('.eyebrow');if(subtitle)subtitle.textContent='VAZHDO NGA KU E LE';
 const link=head.querySelector('[data-go-status]');if(link)link.textContent='Shiko bibliotekën →';
})();
function v81SafeDate(v){const t=Date.parse(v||'');return Number.isFinite(t)?new Date(t).toLocaleString('sq-AL',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Regjistruar më parë'}
function v81Last(a){return v7LastEvent(a)}
function v81Next(a){
 const last=v81Last(a);if(last){const idx=a.seasons.indexOf(last.s);if(idx>=0){for(let i=idx;i<a.seasons.length;i++){let s=a.seasons[i],start=i===idx?last.n+1:1;if(start<=releasedCount(s)){for(let n=start;n<=releasedCount(s);n++)if(!s.watched.includes(n))return {season:s,n};}}}}
 return nextSeasonEp(a);
}
function v81RecentMarkup(){
 const items=v7Recent().slice(0,5);
 if(!items.length)return `<div class="recent-empty"><strong>Ende nuk ke episode të shënuara.</strong><p>Hap një anime nga biblioteka, shëno një episod dhe do të shfaqet këtu menjëherë.</p><button class="primary" data-go-status="watching">Hap Watching →</button></div>`;
 return items.map(({a,s,n,date})=>{const next=v81Next(a),index=a.seasons.indexOf(s)+1,ep=s.episodes.find(x=>x.number===n);return `<article class="recent-card" data-status="${escapeHTML(a.status)}">
 <button type="button" class="recent-cover-open" data-detail="${escapeHTML(a.id)}" aria-label="Hap ${escapeHTML(a.title)}">${cover(a,'recent-poster')}</button><div class="recent-info"><span class="recent-date">${escapeHTML(v81SafeDate(date))}</span><strong title="${escapeHTML(a.title)}">${escapeHTML(a.title)}</strong><span class="watch-status-summary">${v7Label(a)}</span><small>Fundit: S${index} · E${n}${ep?.title?' · '+escapeHTML(ep.title):''}</small><span class="recent-position">${count(a)}/${releasedTotal(a)} episode · ${percentage(a)}%</span>${plannedPending(a)?`<small class="pending-note">◷ ${plannedPending(a)} episode në pritje (sezone të reja)</small>`:''}<div class="progress"><span style="width:${percentage(a)}%"></span></div><div class="last-actions"><button type="button" class="ghost" data-episode-detail="${escapeHTML(a.id)}" data-episode-season="${escapeHTML(s.id)}" data-episode-number="${n}">Detajet</button><button type="button" class="ghost" data-detail="${escapeHTML(a.id)}">Sezonet</button><button type="button" class="plus" data-home-next="${escapeHTML(a.id)}" ${next?'':'disabled'} title="${next?'Shëno S'+(a.seasons.indexOf(next.season)+1)+' E'+next.n:'Në pritje të episodit të ardhshëm'}">+1 Ep.</button></div></div></article>`}).join('');
}
const v81PriorRenderHome=renderHome;
renderHome=function(){v81PriorRenderHome();$('home-recent-watched').innerHTML=v81RecentMarkup();};
function v81EnhanceEpisodeRows(){
 const a=state.anime.find(x=>x.id===detailId);if(!a)return;
 for(const row of $('detail-body').querySelectorAll('.episode-list .ep-row')){
  const seasonId=row.dataset.seasonEp,n=Number(row.dataset.ep);const seen=row.classList.contains('watched');
  const wrapper=document.createElement('div');wrapper.className='ep-article'+(seen?' seen':'');
  const info=document.createElement('button');info.type='button';info.className='ep-info-btn';info.dataset.episodeDetail=a.id;info.dataset.episodeSeason=seasonId;info.dataset.episodeNumber=String(n);info.setAttribute('aria-label',`Shiko informacionet e episodit ${n}`);
  const item=a.seasons.find(s=>s.id===seasonId)?.episodes.find(e=>e.number===n),still=validPoster(item?.image||'');info.innerHTML=(still?`<img class="v98-mini-still" src="${escapeHTML(still)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:'')+row.querySelector('.ep-num').outerHTML+row.querySelector('.ep-text').outerHTML+(item?.personalRating?`<span class="v98-episode-chips">★ ${item.personalRating}/10</span>`:'')+'<span class="ep-info-arrow" aria-hidden="true">›</span>';
  const toggle=document.createElement('button');toggle.type='button';toggle.className='ep-toggle-btn';toggle.dataset.seasonEp=seasonId;toggle.dataset.id=a.id;toggle.dataset.ep=String(n);toggle.setAttribute('aria-pressed',String(seen));toggle.textContent=seen?'✓ I parë':'+ Shëno';
  wrapper.append(info,toggle);row.replaceWith(wrapper);
 }
}
const v81PriorRenderDetail=renderDetail;
renderDetail=function(id){v81PriorRenderDetail(id);v81EnhanceEpisodeRows()};
const v81PriorUpdate=updateSeasonEpisode;
updateSeasonEpisode=function(...args){const changed=v81PriorUpdate(...args);if(changed&&$('episode-detail-modal').classList.contains('show'))v81RenderEpisode();return changed};
let v81EpisodeRef=null,v81EpisodeBusy=false;
function v81EpisodeParts(){const r=v81EpisodeRef,a=state.anime.find(x=>x.id===r?.id),s=a?.seasons.find(x=>x.id===r?.seasonId),n=r?.n,ep=s?.episodes.find(x=>x.number===n);return {a,s,n,ep}}
function v81RenderEpisode(message=''){
 const {a,s,n,ep}=v81EpisodeParts();if(!a||!s){closeModal('episode-detail-modal');return}
 const sn=a.seasons.indexOf(s)+1,seen=s.watched.includes(n),image=validPoster(ep?.image||''),url=validPoster(ep?.url||''),date=ep?.aired?.slice(0,10)||'',title=ep?.title||'Episodi '+n;
 $('ep-detail-heading').textContent=a.title+' · S'+sn+' E'+n;
 $('ep-detail-body').innerHTML=`<div class="ep-detail-visual">${image?`<img src="${escapeHTML(image)}" alt="Pamje nga episodi ${n} i ${escapeHTML(a.title)}" onerror="this.remove();this.parentElement.querySelector('.visual-caption').textContent='Fotoja nuk mund të ngarkohet'" loading="lazy" referrerpolicy="no-referrer"/>`:`<strong>S${sn} · E${n}</strong>`}<span class="visual-caption">${image?'Foto e episodit · TVmaze':'Pa foto të verifikuar për episodin'}</span></div>
 <span class="eyebrow">${escapeHTML(a.title)} · ${escapeHTML(s.title)}</span><h3 class="ep-detail-name">${escapeHTML(title)}</h3><div class="ep-meta-row"><span class="pill">Sezoni ${sn} · Episodi ${n}</span>${ep?.absolute?`<span class="pill">Episodi #${ep.absolute}</span>`:''}${date?`<span class="pill">📅 ${escapeHTML(date)}</span>`:''}${ep?.filler?'<span class="pill">Filler</span>':''}${ep?.recap?'<span class="pill">Recap</span>':''}<span class="pill">${seen?'✓ I parë':'○ I paparë'}</span></div>
 ${ep?.summary?`<p class="ep-detail-summary">${escapeHTML(ep.summary)}</p>`:'<p class="ep-detail-notice">Përshkrimi i këtij episodi nuk është i disponueshëm në burimet e lidhura. Nuk do të shfaqim tekst ose foto të pasakta.</p>'}
 ${message?`<p class="ep-detail-notice">${escapeHTML(message)}</p>`:''}<div class="ep-detail-actions"><button type="button" class="primary" data-episode-mark="1">${seen?'Hiq shënimin ✓':'✓ Shëno si të parë'}</button><button type="button" class="ghost" data-episode-open-season="1">Hap sezonin →</button><button type="button" class="ghost" data-episode-refresh="1" ${v81EpisodeBusy?'disabled':''}>${v81EpisodeBusy?'Po kërkoj…':'↻ Merr detajet online'}</button></div>${url?`<a class="ep-detail-source" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">Shiko episodin në TVmaze ↗</a>`:ep?.filler||ep?.recap?'':`<small class="ep-detail-source">Burime: Jikan/MyAnimeList për titullin dhe përshkrimin; TVmaze për foton, kur përputhja është e verifikuar.</small>`}`;
}
async function v81FetchEpisode(force=false){
 const {a,s,n,ep}=v81EpisodeParts();if(!a||!s||v81EpisodeBusy)return;
 if(!force&&((ep?.summary&&ep?.image)||(ep?.detailsCheckedAt&&Date.now()-Date.parse(ep.detailsCheckedAt)<86400000)))return;
 v81EpisodeBusy=true;v81RenderEpisode();let changed=false,errors=[],prior=ep||{number:n};
 try{
  let remote=null;
  if(/^\d+$/.test(String(prior.tvmazeEpisodeId||''))){let res=await fetch('https://api.tvmaze.com/episodes/'+prior.tvmazeEpisodeId);if(res.ok)remote=await res.json();}
  // Only query by season/number when this track itself has confirmed TVmaze season identity.
  else if(s.source==='TVmaze'&&/^\d+$/.test(a.tvmazeId||'')){
   const match=s.id.match(/^tv-\d+-(\d+)$/);if(match){let res=await fetch(`https://api.tvmaze.com/shows/${a.tvmazeId}/episodebynumber?season=${match[1]}&number=${n}`);if(res.ok)remote=await res.json();}
  }
  if(remote){prior={...prior,number:n,title:remote.name||prior.title||'',aired:remote.airdate||prior.aired||'',airedAt:remote.airstamp||prior.airedAt||'',summary:textOnly(remote.summary)||prior.summary||'',image:validPoster(remote.image?.original||remote.image?.medium||prior.image||''),url:validPoster(remote.url||''),tvmazeEpisodeId:String(remote.id||prior.tvmazeEpisodeId||'')};changed=true;}
 }catch(e){errors.push('TVmaze')}
 // Jikan's episode detail is useful for anime that do not have verified TVmaze episode IDs.
 if(/^\d+$/.test(s.malId||'')&&(!prior.summary||force))try{
  const eid=s.globalStart?s.globalStart+n-1:n;
  const res=await fetch(`https://api.jikan.moe/v4/anime/${s.malId}/episodes/${eid}`);
  if(res.ok){const j=await res.json(),d=j.data;if(d){prior={...prior,number:n,title:d.title||d.title_romanji||prior.title||'',aired:d.aired||prior.aired||'',summary:textOnly(d.synopsis)||prior.summary||'',filler:!!d.filler,recap:!!d.recap};changed=true;}}
 }catch(e){errors.push('Jikan')}
 {const old=new Map(s.episodes.map(e=>[e.number,e]));old.set(n,{...old.get(n),...prior,detailsCheckedAt:now()});s.episodes=[...old.values()].sort((x,y)=>x.number-y.number);save();if(detailId===a.id)renderDetail(a.id);}
 v81EpisodeBusy=false;v81RenderEpisode(changed?'Detajet u kontrolluan në katalog.':errors.length?'Burimi nuk u lidh. Provo përsëri kur të kesh internet.':'Nuk u gjetën detaje të tjera të konfirmuara për këtë episod.');
}
function v81OpenEpisode(id,seasonId,n){
 const a=state.anime.find(x=>x.id===id),s=a?.seasons.find(x=>x.id===seasonId);n=Number(n);if(!s||!Number.isInteger(n)||n<1||(s.total&&n>s.total))return;
 v81EpisodeRef={id,seasonId,n};v81RenderEpisode();showModal('episode-detail-modal');v81FetchEpisode(false);
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.episodeDetail){v81OpenEpisode(b.dataset.episodeDetail,b.dataset.episodeSeason,b.dataset.episodeNumber)}
 if(b.dataset.homeNext){const a=state.anime.find(x=>x.id===b.dataset.homeNext),nx=a&&v81Next(a);if(nx)requestEpisodeToggle(a.id,nx.season.id,nx.n)}
 if(b.dataset.episodeMark){const {a,s,n}=v81EpisodeParts();if(a&&s){closeModal('episode-detail-modal');requestEpisodeToggle(a.id,s.id,n)}}
 if(b.dataset.episodeOpenSeason){const {a,s,n}=v81EpisodeParts();if(a){closeModal('episode-detail-modal');activeSeasonId=s.id;episodePage=Math.floor((n-1)/24);renderDetail(a.id);showModal('detail-modal');loadSeasonEpisodes(a.id,s.id,episodePage)}}
 if(b.dataset.episodeRefresh){v81FetchEpisode(true)}
});
$('episode-detail-modal').addEventListener('click',e=>{if(e.target.id==='episode-detail-modal')closeModal('episode-detail-modal')});


// 9.0 — genuine multi-account option (Supabase Auth + per-user RLS).
let cloudLastPullAt=0;
const ACCOUNT_CONFIG='animetrack_cloud_config_v1',GUEST_KEY='animetrack_v1';
function accountGetConfig(){const configured=window.ANIMETRACK_CONFIG||{};return {url:configured.url||'',key:configured.key||''}}
function accountStatus(message,kind=''){const el=$('account-status');el.textContent=message;el.dataset.error=kind==='error'?'1':'0';el.dataset.ok=kind==='ok'?'1':'0'}
function accountName(){return accountUser?.user_metadata?.display_name?.trim()?.slice(0,40)||accountUser?.email?.split('@')[0]||'Pa llogari'}
function accountUI(){$('account-stat-anime').textContent=state.anime.length;$('account-stat-episodes').textContent=state.anime.reduce((v,a)=>v+count(a),0);const name=accountMode==='cloud'?accountName():'Hyr / Regjistrohu';$('account-display-name').textContent=name;$('account-display-subtitle').textContent=accountMode==='cloud'?(accountUser.email||'Llogari cloud'):'Biblioteka lokale · nuk sinkronizohet mes pajisjeve';$('account-top-name').textContent=name;$('account-side-label').textContent=accountMode==='cloud'?name+' · Cloud':'Hyr / Regjistrohu';$('account-top-avatar').textContent=$('account-avatar').textContent=name.slice(0,1).toUpperCase()||'A';$('account-sync-pill').textContent=accountMode==='cloud'?(cloudDirty?'Në pritje':cloudConnected?'Cloud ✓':'Cloud !'):'Local';$('account-cloud-user').classList.toggle('hidden',accountMode!=='cloud');$('account-guest-user').classList.toggle('hidden',accountMode==='cloud');if(accountMode==='cloud')accountStatus(cloudLastSync?'Sinkronizimi i fundit: '+cloudLastSync+(cloudDirty?' · ndryshime në pritje':''):'U lidhe me llogarinë. Biblioteka është personale.',cloudConnected?'ok':'')}
function accountToggle(open=true){if(open){accountUI();showModal('account-modal')}else closeModal('account-modal')}
function accountSetConfig(){const url=$('account-project-url').value.trim().replace(/\/$/,'');const key=$('account-project-key').value.trim();if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)){accountStatus('Project URL duhet të jetë https://...supabase.co','error');return false}if(!key||/^sb_secret_|^service_role/i.test(key)){accountStatus('Vendos vetëm publishable / anon key, jo secret/service_role.','error');return false}try{const role=JSON.parse(atob((key.split('.')[1]||'').replace(/-/g,'+').replace(/_/g,'/'))).role;if(role==='service_role'){accountStatus('Ky çelës është service_role: mos e vendos në shfletues!','error');return false}}catch(e){}try{localStorage.setItem(ACCOUNT_CONFIG,JSON.stringify({url,key}));cloudClient=null;accountStatus('Konfigurimi u ruajt. Tani mund të krijosh llogari ose të hysh.','ok');return true}catch(e){accountStatus('Konfigurimi nuk u ruajt: '+e.message,'error');return false}}
function accountInitClient(){if(cloudClient)return cloudClient;const {url,key}=accountGetConfig();if(!url||!key){throw Error('Së pari konfiguro Project URL dhe Publishable key te ⚙ Konfiguro databazën.')}if(!window.supabase?.createClient)throw Error('Biblioteka Supabase nuk u ngarkua. Kontrollo internetin ose përdor versionin e publikuar HTTPS.');cloudClient=window.supabase.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return cloudClient}
function accountNormalizePayload(data){if(!data||!Array.isArray(data.anime))throw Error('Biblioteka online ka format të pavlefshëm.');return {anime:data.anime.map(normalized).filter(Boolean),history:Array.isArray(data.history)?data.history.filter(h=>h&&typeof h==='object').slice(-2000):[],preferences:normalizePreferences(data.preferences)}}
function accountRefreshViews(){filter='all';search='';$('search').value='';$('global-search').value='';if(typeof clearCatalog==='function')clearCatalog();render();renderHome();renderUpcoming();setView('home');accountUI()}
async function accountOpenCloud(user){if(!user?.id)throw Error('Nuk u verifikua llogaria.');const client=accountInitClient();const uid=user.id;const {data,error}=await client.from('anime_libraries').select('payload,updated_at').eq('user_id',uid).maybeSingle();if(error)throw Error('Leximi nga databaza dështoi: '+error.message+'. Kontrollo që ke ekzekutuar supabase_setup.sql.');
 // Snapshot is selected by authenticated user ID. Never copy the guest library implicitly.
 document.body.classList.remove('auth-required');accountUser=user;accountMode='cloud';KEY='animetrack_user_'+uid;cloudDirty=false;cloudConnected=true;cloudLastPullAt=Date.now();cloudLastSync=data?.updated_at?new Date(data.updated_at).toLocaleString('sq-AL'):'Llogari e re';state=data?.payload?accountNormalizePayload(data.payload):{anime:[],history:[]};localStorage.setItem(KEY,JSON.stringify(state));accountRefreshViews();if(!data)accountStatus('Llogari e re · bibliotekë bosh. Përdor “Kopjo bibliotekën lokale” vetëm nëse dëshiron të importosh progresin e vjetër.','ok');else accountStatus('Biblioteka u shkarkua nga cloud · '+cloudLastSync,'ok');}
function accountQueueSave(){if(accountMode!=='cloud'||!accountUser)return;cloudDirty=true;cloudConnected=false;accountUI();clearTimeout(cloudTimer);cloudTimer=setTimeout(()=>accountPush(false),1100)}
async function accountPush(showResult=true){if(accountMode!=='cloud'||!accountUser||cloudSaving)return;clearTimeout(cloudTimer);const uid=accountUser.id;const payload=JSON.parse(JSON.stringify(state));cloudSaving=true;try{const {error}=await accountInitClient().from('anime_libraries').upsert({user_id:uid,payload},{onConflict:'user_id'});if(error)throw error;if(accountUser?.id!==uid)return;cloudConnected=true;cloudLastSync=new Date().toLocaleString('sq-AL');const changed=JSON.stringify(state)!==JSON.stringify(payload);cloudDirty=changed;if(changed)cloudTimer=setTimeout(()=>accountPush(false),1200);if(showResult)accountStatus('Ruajtur në cloud ✓ · '+cloudLastSync,'ok')}catch(e){if(accountUser?.id===uid){cloudConnected=false;cloudDirty=true;accountStatus('Nuk u sinkronizua: '+e.message+' · Ruajtja lokale për llogarinë tënde mbetet.','error');if(showResult)notify('Cloud nuk u lidh. Provo përsëri.')}}finally{cloudSaving=false;accountUI()}}
let quietCloudPullBusy=false;
async function accountPullQuiet(){
 if(quietCloudPullBusy||accountMode!=='cloud'||!accountUser||cloudDirty||cloudSaving||accountBusy)return false;
 const uid=accountUser.id;quietCloudPullBusy=true;
 try{
  const {data,error}=await accountInitClient().from('anime_libraries').select('payload,updated_at').eq('user_id',uid).maybeSingle();
  if(error)throw error;
  if(accountUser?.id!==uid||cloudDirty||cloudSaving||accountMode!=='cloud')return false;
  cloudLastPullAt=Date.now();
  if(!data?.payload)return false;
  const remote=accountNormalizePayload(data.payload);
  if(JSON.stringify(remote)===JSON.stringify(state))return false;
  if(cloudDirty||cloudSaving)return false;
  state=remote;localStorage.setItem(KEY,JSON.stringify(state));
  cloudConnected=true;cloudLastSync=new Date(data.updated_at).toLocaleString('sq-AL');
  render();renderHome();renderUpcoming();proApp.render();void proApp.modules.notifications.refresh();
  proApp.modules.recommendations.onLibraryChange();accountUI();return true;
 }catch(e){console.warn('Quiet library synchronization failed',e);return false}
 finally{quietCloudPullBusy=false}
}
async function accountPull(manual=false){if(accountMode!=='cloud'||!accountUser)return;if(cloudDirty){if(manual&&!confirm('Ke ndryshime lokale që nuk janë sinkronizuar. Të shkarkosh cloud mund t’i zëvendësojë. Vazhdo?'))return;if(!manual)return;}const uid=accountUser.id;try{const {data,error}=await accountInitClient().from('anime_libraries').select('payload,updated_at').eq('user_id',uid).maybeSingle();if(error)throw error;if(accountUser?.id!==uid)return;if(data?.payload){state=accountNormalizePayload(data.payload);localStorage.setItem(KEY,JSON.stringify(state));cloudDirty=false;cloudConnected=true;cloudLastSync=new Date(data.updated_at).toLocaleString('sq-AL');cloudLastPullAt=Date.now();accountRefreshViews();if(manual)accountStatus('Biblioteka u rifreskua nga cloud ✓','ok')}else if(manual)accountStatus('Ende nuk ka bibliotekë të ruajtur në cloud.','ok')}catch(e){cloudConnected=false;accountUI();if(manual)accountStatus('Rifreskimi dështoi: '+e.message,'error')}}
async function accountLogin(event){event?.preventDefault();if(accountBusy)return;let email=$('account-email').value.trim(),password=$('account-password').value;if(!email||!password){accountStatus('Plotëso emailin dhe fjalëkalimin.','error');return}accountBusy=true;$('account-login').disabled=true;try{const client=accountInitClient();const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;await accountOpenCloud(data.user);accountToggle(false);notify('Mirë se u ktheve, '+accountName()+'!')}catch(e){accountStatus('Hyrja dështoi: '+e.message,'error')}finally{accountBusy=false;$('account-login').disabled=false}}
async function accountRegister(){if(accountBusy)return;let email=$('account-email').value.trim(),password=$('account-password').value,display_name=$('account-name').value.trim().slice(0,40);if(!email||password.length<6){accountStatus('Shkruaj email të vlefshëm dhe fjalëkalim me të paktën 6 karaktere.','error');return}accountBusy=true;$('account-register').disabled=true;try{const client=accountInitClient();const {data,error}=await client.auth.signUp({email,password,options:{data:{display_name},...(location.protocol==='https:'?{emailRedirectTo:location.origin+location.pathname}:{})}});if(error)throw error;if(data.session&&data.user){await accountOpenCloud(data.user);accountToggle(false);notify('Llogaria u krijua ✓')}else accountStatus('U dërgua emaili i konfirmimit. Hape, konfirmo llogarinë dhe kthehu këtu për të hyrë.','ok')}catch(e){accountStatus('Regjistrimi dështoi: '+e.message,'error')}finally{accountBusy=false;$('account-register').disabled=false}}
async function accountReset(){const email=$('account-email').value.trim();if(!email){accountStatus('Shkruaj emailin dhe pastaj shtyp Harrova fjalëkalimin.','error');return}try{const {error}=await accountInitClient().auth.resetPasswordForEmail(email,location.protocol==='https:'?{redirectTo:location.origin+location.pathname}:{});if(error)throw error;accountStatus('Nëse emaili ka llogari, udhëzimet e rikuperimit do të të vijnë aty.','ok')}catch(e){accountStatus('Nuk u dërgua kërkesa: '+e.message,'error')}}
async function accountLogout(){if(accountMode!=='cloud')return;if(cloudDirty){await accountPush(false);if(cloudDirty&&!confirm('Ka ndryshime të paruajtura në cloud. Mund t’i rifitosh nga ky kompjuter. Të dalësh gjithsesi?'))return}try{const {error}=await accountInitClient().auth.signOut();if(error)throw error}catch(e){accountStatus('Dalja dështoi: '+e.message,'error');return}clearTimeout(cloudTimer);accountMode='guest';accountUser=null;cloudConnected=false;cloudDirty=false;KEY=GUEST_KEY;state={anime:[],history:[],preferences:{weeklyGoal:10,notificationRead:[]}};accountRefreshViews();document.body.classList.add('auth-required');accountToggle(true);accountStatus('Dole nga llogaria. Hyr me një tjetër ose krijo të re.','ok');notify('Dole nga llogaria ✓')}
function accountCopyGuest(){if(accountMode!=='cloud')return;let guest;try{guest=JSON.parse(localStorage.getItem(GUEST_KEY)||'null')}catch{}if(!guest||!Array.isArray(guest.anime)||!guest.anime.length){accountStatus('Nuk u gjet bibliotekë lokale me anime për import.','error');return}if(!confirm(`Të zëvendësojmë bibliotekën e kësaj llogarie me ${guest.anime.length} anime nga versioni lokal? Eksporto më parë një kopje të të dhënave cloud.`))return;state=accountNormalizePayload(guest);save();render();renderHome();renderUpcoming();accountStatus('Biblioteka lokale u kopjua. Po sinkronizohet në cloud…','ok')}
async function accountBoot(){try{const c=accountGetConfig();$('account-project-url').value=c.url||'';$('account-project-key').value=c.key||'';if(c.url&&c.key&&window.supabase?.createClient){const client=accountInitClient();const {data,error}=await client.auth.getSession();if(error)throw error;if(data?.session?.user)await accountOpenCloud(data.session.user)}}catch(e){KEY=GUEST_KEY;accountMode='guest';accountUser=null;state=load();render();renderHome();accountStatus('Llogaria online nuk u hap: '+e.message+' · Biblioteka lokale mbetet e sigurt.','error')}finally{document.body.classList.remove('account-booting');if(accountMode!=='cloud'){document.body.classList.add('auth-required');state={anime:[],history:[],preferences:{weeklyGoal:10,notificationRead:[]}};render();renderHome();accountToggle(true);}accountUI()}}
$('account-top-btn').addEventListener('click',()=>accountToggle(true));$('account-sidebar-btn').addEventListener('click',()=>accountToggle(true));
$('account-form').addEventListener('submit',accountLogin);$('account-register').addEventListener('click',accountRegister);$('account-reset').addEventListener('click',accountReset);$('account-save-config').addEventListener('click',accountSetConfig);$('account-refresh').addEventListener('click',()=>accountPull(true));$('account-push').addEventListener('click',()=>accountPush(true));$('account-copy-guest').addEventListener('click',accountCopyGuest);$('account-logout').addEventListener('click',accountLogout);$('account-export').addEventListener('click',exportData);$('account-guest-backup').addEventListener('click',()=>{const current=state;try{const raw=localStorage.getItem(GUEST_KEY);if(raw){state=accountNormalizePayload(JSON.parse(raw));exportData();}else notify('Nuk ka bibliotekë të vjetër në këtë shfletues.')}catch(e){notify('Kopja rezervë nuk u hap.')}finally{state=current}});$('account-use-guest').addEventListener('click',()=>accountToggle(false));
window.addEventListener('focus',()=>{if(accountMode==='cloud'&&!cloudDirty&&!cloudSaving&&cloudLastSync&&Date.now()-cloudLastPullAt>90000)accountPull(false)});

// 9.3 – season forecast is information only, never a watched episode.
const v93BaseDetail=renderDetail;
renderDetail=function(id){
 v93BaseDetail(id);const a=state.anime.find(x=>x.id===id);if(!a)return;
 const s=a.seasons.find(x=>x.id===activeSeasonId)||a.seasons[0],available=releasedCount(s),pending=Math.max(0,(s.total||0)-available),waiting=s.releaseStatus==='NOT_YET_RELEASED'||s.releaseStatus==='NOT_YET_AIRED',detail=$('detail-body');
 const stat=detail.querySelector('.detail-stats');if(stat){stat.querySelectorAll('span')[0].innerHTML=`<b>${count(a)}</b> / ${releasedTotal(a)} episode të transmetuara`;stat.querySelectorAll('span')[1].innerHTML=`<b>${releasedTotal(a)?percentage(a)+'%':'—'}</b> progres`;}
 const next=detail.querySelector('[data-next]');if(next){next.disabled=!nextSeasonEp(a);next.title=next.disabled?'Nuk ka episode të tjera të transmetuara':'';}
 const tabs=[...detail.querySelectorAll('.season-tab')];tabs.forEach((tab,i)=>{const x=a.seasons[i];const total=releasedCount(x);const caption=tab.querySelector('.season-total');if(caption)caption.textContent=`${x.watched.length}/${total} episode${total&&x.watched.length===total?' ✓':''}`;if(x.total>total){const small=document.createElement('span');small.className='pending-note';small.textContent=`◷ ${x.total-total} episode ende pa dalë`;tab.appendChild(small)}const bar=tab.querySelector('.progress span');if(bar)bar.style.width=(total?Math.min(100,Math.round(x.watched.length/total*100)):0)+'%'});
 const banner=detail.querySelector('.season-banner');if(banner&&(pending||waiting)){let note=document.createElement('div');note.className='pending-season';note.innerHTML=`<strong>◷ Sezon i konfirmuar, ende në transmetim / në pritje</strong><br>${escapeHTML(pendingReleaseText(s))}<br>Progresi numëron vetëm ${available} episode që kanë dalë. Numri i planifikuar nuk shtohet te episodet e pashikuara.`;banner.insertAdjacentElement('afterend',note)}
 const toggle=detail.querySelector('[data-season-toggle][data-seen="1"]');if(toggle)toggle.disabled=!available||(s.watched.length>=available&&!a.seasons.slice(0,a.seasons.indexOf(s)).some(x=>x.watched.length<releasedCount(x)));
 if(!available){const list=detail.querySelector('.episode-list');if(list)list.innerHTML='<div class="pending-season" style="grid-column:1/-1">📅 Nuk ka ende episode të transmetuara për këtë sezon. Rikontrollohet automatikisht kur të hapësh AnimeTrack.</div>';const pages=detail.querySelector('.episode-pages');if(pages)pages.style.display='none';}
};
const v93BaseUpdate=updateSeasonEpisode;
updateSeasonEpisode=function(id,seasonId,n,seen,quiet=false){const a=state.anime.find(x=>x.id===id),s=a?.seasons.find(x=>x.id===seasonId);if(seen&&s&&n>releasedCount(s)){notify('Ky episod nuk ka dalë ende.');return false;}return v93BaseUpdate(id,seasonId,n,seen,quiet)};
const v93BaseDaily=refreshCatalogDaily;
refreshCatalogDaily=async function(force=false){const before=new Map(state.anime.map(a=>[a.id,releasedTotal(a)]));await v93BaseDaily(force);if(catalogSyncFailed)return;let changed=false;for(const a of state.anime){const prev=before.get(a.id)||0,current=releasedTotal(a);if(prev>0&&current>prev&&a.status==='completed'&&count(a)<current){a.status='watching';changed=true}}if(changed){save();render();renderHome();if(detailId)renderDetail(detailId)}};
const v93BaseOpenCloud=accountOpenCloud;
accountOpenCloud=async function(user){await v93BaseOpenCloud(user);if(state.anime.length){const key='animetrack_release_sync_v93_'+user.id,prior=Number(localStorage.getItem(key)||0);if(!prior||Date.now()-prior>=DAY){catalogSyncAt=0;upcomingCheckedAt=0;setTimeout(async()=>{if(accountUser?.id!==user.id)return;await dailySync(false);if(!catalogSyncFailed){try{localStorage.setItem(key,String(Date.now()))}catch{}}},800)}}};
// Refresh the released-episode clock while the tab remains open.
setInterval(()=>{if(accountMode!=='cloud')return;if(!catalogSyncBusy&&Date.now()-catalogSyncAt>DAY)dailySync(false);else{render();renderHome();if(detailId)renderDetail(detailId)}},5*60*1000);

function activityEpisodes(){
 const current=new Set();
 for(const a of state.anime)for(const s of a.seasons||[])for(const n of s.watched||[])current.add(a.id+'|'+s.id+'|'+n);
 const events=new Map();
 for(const e of state.history||[]){
  const at=Date.parse(e.date||'');if(!Number.isFinite(at)||!e.id)continue;
  const prefix=e.id+'|'+(e.seasonId||'')+'|';
  if(e.action==='watched'||e.action==='unwatched'){
   const n=Number(e.episode);if(!Number.isInteger(n)||n<1)continue;
   const key=prefix+n;if(e.action==='watched')events.set(key,{key,id:e.id,n,at});else events.delete(key);
  }else if(e.action==='season-watched'&&Array.isArray(e.episodes)){
   for(const v of e.episodes){const n=Number(v);if(Number.isInteger(n)&&n>0){const key=prefix+n;events.set(key,{key,id:e.id,n,at})}}
  }else if(e.action==='season-unwatched'){
   if(Array.isArray(e.episodes))for(const v of e.episodes)events.delete(prefix+Number(v));
   else for(const key of events.keys())if(key.startsWith(prefix))events.delete(key);
  }
 }
 return [...events.values()].filter(e=>current.has(e.key));
}
function statsLocalKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function statsWeekStart(d){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-(x.getDay()+6)%7);return x.getTime()}
function renderStatistics(){
 const events=activityEpisodes(),nowDate=new Date(),startWeek=statsWeekStart(nowDate),startMonth=new Date(nowDate.getFullYear(),nowDate.getMonth(),1).getTime(),startYear=new Date(nowDate.getFullYear(),0,1).getTime();
 const week=events.filter(e=>e.at>=startWeek),month=events.filter(e=>e.at>=startMonth),year=events.filter(e=>e.at>=startYear),goal=Math.max(1,Math.min(200,Number(state.preferences?.weeklyGoal)||10));
 $('stats-week').textContent=week.length.toLocaleString('sq-AL');$('stats-month').textContent=month.length.toLocaleString('sq-AL');$('stats-year').textContent=year.length.toLocaleString('sq-AL');$('stats-all').textContent=events.length.toLocaleString('sq-AL');
 const byId=new Map(state.anime.map(a=>[a.id,a]));const mins=events.reduce((n,e)=>n+(isMovieAnime(byId.get(e.id))?100:24),0);
 $('stats-hours').textContent=(mins/60).toLocaleString('sq-AL',{maximumFractionDigits:1})+'h';
 $('stats-weekly-goal').value=String(goal);$('stats-goal-progress').textContent=week.length+' / '+goal+' episode · '+Math.min(100,Math.round(week.length/goal*100))+'%'+(week.length>=goal?' ✓ Objektivi u arrit!':'');
 $('stats-goal-fill').style.width=Math.min(100,week.length/goal*100)+'%';
 const dayCounts=new Map();for(const e of events){const key=statsLocalKey(new Date(e.at));dayCounts.set(key,(dayCounts.get(key)||0)+1)}
 let streak=0,cursor=new Date(nowDate.getFullYear(),nowDate.getMonth(),nowDate.getDate());if(!dayCounts.get(statsLocalKey(cursor)))cursor.setDate(cursor.getDate()-1);
 while(streak<2000&&dayCounts.get(statsLocalKey(cursor))){streak++;cursor.setDate(cursor.getDate()-1)}$('stats-streak').textContent=streak;
 const days=Array.from({length:7},(_,i)=>{const d=new Date(nowDate.getFullYear(),nowDate.getMonth(),nowDate.getDate());d.setDate(d.getDate()-6+i);return{label:['D','H','M','M','E','P','Sh'][d.getDay()],title:d.toLocaleDateString('sq-AL',{weekday:'long',day:'numeric',month:'long'}),value:dayCounts.get(statsLocalKey(d))||0}});
 const months=Array.from({length:6},(_,i)=>{const d=new Date(nowDate.getFullYear(),nowDate.getMonth()-5+i,1),key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');return{label:d.toLocaleDateString('sq-AL',{month:'short'}),title:d.toLocaleDateString('sq-AL',{month:'long',year:'numeric'}),value:events.filter(e=>statsLocalKey(new Date(e.at)).startsWith(key)).length}});
 function bars(rows){const max=Math.max(1,...rows.map(x=>x.value));return rows.map(x=>`<div class="stats-col" title="${escapeHTML(x.title)}: ${x.value}"><b>${x.value||'·'}</b><div class="stats-bar-track"><span class="stats-bar-fill" style="height:${x.value?Math.max(5,Math.round(x.value/max*100)):0}%"></span></div><small>${escapeHTML(x.label)}</small></div>`).join('')}
 $('stats-week-bars').innerHTML=bars(days);$('stats-month-bars').innerHTML=bars(months);
 function ranks(rows){const max=Math.max(1,...rows.map(x=>x.count));return rows.length?rows.map(x=>`<div class="stats-rank-row"><strong title="${escapeHTML(x.name)}">${escapeHTML(x.name)}</strong><b>${x.count}</b><div class="stats-rank-track"><span style="width:${Math.round(x.count/max*100)}%"></span></div></div>`).join(''):'<p class="home-empty">Ende pa të dhëna për këtë seksion.</p>'}
 $('stats-genre-chart').innerHTML=ranks(genreCounts().slice(0,7));
 const top=new Map();for(const e of month)top.set(e.id,(top.get(e.id)||0)+1);
 $('stats-top-anime').innerHTML=ranks([...top.entries()].map(([id,count])=>({name:byId.get(id)?.title||'Anime e mëparshme',count})).sort((a,b)=>b.count-a.count).slice(0,7));
}
function initV95(){
 const prevRender=render;render=function(){prevRender();if(view==='statistics')renderStatistics()};
 const prevSetView=setView;setView=function(which){
  if(which==='statistics'){
   view='statistics';for(const id of ['home-view','library-view','upcoming-view','explore-view','seasons-view','statistics-view'])$(id).classList.toggle('hidden',id!=='statistics-view');
   for(const id of ['home-nav','library-nav','upcoming-nav','explore-nav','seasons-nav'])$(id).classList.remove('active');
   document.querySelectorAll('[data-filter]').forEach(b=>b.classList.remove('active'));
   $('statistics-nav').classList.add('active');$('page-title').textContent='Statistikat e mia ✦';renderStatistics();window.scrollTo({top:0,behavior:'smooth'});return;
  }
  $('statistics-view').classList.add('hidden');$('statistics-nav').classList.remove('active');return prevSetView(which);
 };
 $('statistics-nav').addEventListener('click',()=>setView('statistics'));
 document.addEventListener('click',e=>{const b=e.target.closest('button[data-genre]');if(!b)return;selectedGenre=b.dataset.genre||'all';filter='genres';setView('library');render()});
 $('stats-goal-save').addEventListener('click',()=>{const value=Number($('stats-weekly-goal').value);if(!Number.isInteger(value)||value<1||value>200){notify('Objektivi duhet të jetë 1–200 episode në javë.');return}state.preferences=state.preferences||{};state.preferences.weeklyGoal=value;save();renderStatistics();notify('Objektivi javor u ruajt në cloud ✓')});
}
initV95();


function v96RecentEpisodes(){
 const cutoff=Date.now()-7*DAY,found=new Map(),library=new Map(state.anime.map(a=>[a.id,a]));
 const add=(x,season=null,n=null)=>{if(!x||x.when<cutoff||x.when>Date.now())return;const a=library.get(x.animeId);if(!a)return;let s=season||a.seasons.find(v=>v.id===x.seasonId)||null;const ep=Math.max(1,Number(n??x.seasonEpisode??x.episode)||1);if(!s&&x.source==='AniList')s=a.seasons.find(v=>v.sourceId&&x.url?.includes('/anime/'+v.sourceId))||null;if(!s)s=a.seasons.find(v=>releasedCount(v)>=ep)||a.seasons[0]||null;const key=a.id+':'+(s?.id||x.season||'')+':'+ep;if(found.has(key)&&Number(found.get(key).when)>=Number(x.when))return;found.set(key,{...x,anime:a,localSeason:s,localEpisode:ep,seen:!!s?.watched.includes(ep)})};
 for(const x of upcomingEntries)add(x);
 for(const a of state.anime.filter(a=>['watching','completed'].includes(a.status)))for(const s of a.seasons||[])for(const ep of s.episodes||[]){
  const when=Date.parse(ep.airedAt||ep.aired||'');if(!Number.isFinite(when))continue;
  add({animeId:a.id,title:a.title,cover:a.cover,episode:ep.number,season:s.subtitle||s.title,seasonId:s.id,seasonEpisode:ep.number,when,source:'Datë episodi',url:a.sourceUrl||''},s,ep.number);
 }
 return [...found.values()].sort((a,b)=>b.when-a.when).slice(0,8);
}
function v96RenderReleases(){
 const list=v96RecentEpisodes(),future=upcomingEntries.filter(x=>x.when>Date.now()&&x.when<=Date.now()+30*DAY).sort((a,b)=>a.when-b.when).slice(0,3),unseen=list.filter(x=>!x.seen).length;
 $('v96-release-count').textContent=upcomingBusy?'Po përditësohen datat…':(unseen?unseen+' të reja · ':'')+list.length+' episode gjatë 7 ditëve'+(upcomingCheckedAt?' · kontrolluar '+formatStamp(upcomingCheckedAt):' · ende pa kontroll online');
 $('v96-refresh-airing').disabled=upcomingBusy;
 $('v96-release-grid').innerHTML=list.length?list.map(x=>{
  const a=x.anime,image=validPoster(a?.cover||x.cover),when=formatStamp(x.when),s=x.localSeason,index=s?a.seasons.indexOf(s)+1:0;
  return `<article class="v96-release-card ${x.seen?'v96-seen':'v96-unseen'}"><div class="v96-release-cover">${image?`<img src="${escapeHTML(image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:''}</div><div class="v96-release-copy"><div class="v96-release-line"><span class="v96-release-tag">${x.seen?'✓ I PARË':'● I RI'} · ${index?'S'+index+' · ':''}EP ${x.localEpisode}</span><span class="v96-release-source">${escapeHTML(x.source)}</span></div><h4 title="${escapeHTML(a?.title||x.title)}">${escapeHTML(a?.title||x.title)}</h4><small>${escapeHTML(when)}${a?' · '+escapeHTML(STATUS[a.status]):''}</small><div class="v96-release-actions"><button class="ghost" ${s?`data-episode-detail="${escapeHTML(x.animeId)}" data-episode-season="${escapeHTML(s.id)}" data-episode-number="${x.localEpisode}"`:`data-detail="${escapeHTML(x.animeId)}"`}>Detajet e episodit</button>${!x.seen&&s?`<button class="primary" data-v96-watch="${escapeHTML(x.animeId)}" data-v96-season="${escapeHTML(s.id)}" data-v96-episode="${x.localEpisode}">✓ Shëno si parë</button>`:''}</div></div></article>`
 }).join(''):'<div class="v96-empty">Ende nuk ka episode me datë transmetimi të verifikuar gjatë 7 ditëve të fundit. Rifresko orarin ose kontrollo përsëri kur të dalë episodi i radhës.</div>';
 $('v96-next-grid').innerHTML=future.length?future.map(x=>`<button class="v96-next-card" data-detail="${escapeHTML(x.animeId)}"><span>◷</span><div><strong>${escapeHTML(x.title)} · EP ${escapeHTML(x.episode)}</strong><small>${escapeHTML(formatStamp(x.when))} · Shqipëri</small></div></button>`).join(''):'<div class="v96-empty">Nuk ka data të tjera të njoftuara për 30 ditët e ardhshme.</div>';
}
function v96OrganizeDashboard(){
 const home=$('home-view'),hero=home.querySelector('.home-hero'),stats=home.querySelector('.home-stats'),quick=document.createElement('div');
 const pulse=document.createElement('div');pulse.className='v96-pulse';pulse.id='v96-pulse';stats.after(pulse);quick.className='v96-quicklinks';quick.innerHTML=`<button class="v96-quicklink" data-v96-view="upcoming"><span class="v96-icon">◷</span><span><strong>Episode të reja</strong><small>Transmetimet dhe datat</small></span></button><button class="v96-quicklink" data-v96-filter="waiting"><span class="v96-icon">✦</span><span><strong>Në pritje sezoni</strong><small>Vazhdimet zyrtare</small></span></button><button class="v96-quicklink" data-v96-view="statistics"><span class="v96-icon">▥</span><span><strong>Statistikat e mia</strong><small>Java dhe muaji yt</small></span></button><button class="v96-quicklink" data-v96-filter="genres"><span class="v96-icon">◈</span><span><strong>Zhanret</strong><small>Zbulo sipas shijes</small></span></button>`;
 pulse.after(quick);
 const recent=$('home-recent-watched'),recentHead=$('home-history-title'),releases=$('home-release-section'),wait=$('home-new-seasons'),waitHead=wait.previousElementSibling,teaser=$('home-season-teaser'),teaserHead=$('home-seasonal-heading'),next=$('home-watch-next'),nextHead=next.previousElementSibling,cols=home.querySelector('.home-columns');
 const oldPremiere=cols?.querySelector('.home-panel:has(#home-premieres)');if(oldPremiere)oldPremiere.classList.add('hidden');if(cols)cols.classList.add('v96-home-activity');
 const keep=[hero,stats,quick,recentHead,recent,releases,waitHead,wait,teaserHead,teaser,nextHead,next,cols];
 for(const el of keep)if(el)home.appendChild(el);
 const status=$('home-status-grid');if(status){const label=status.previousElementSibling;home.append(label,status)}
 const favorites=$('home-favorites');if(favorites){home.append(favorites.previousElementSibling,favorites)}
 const sync=home.querySelector('.sync-panel');if(sync)home.appendChild(sync);
 const extras=[home.querySelector('#home-continue')];for(const e of extras)if(e)e.classList.add('hidden');
}
function v96RenderPulse(){const box=$('v96-pulse');if(!box)return;const events=activityEpisodes(),week=events.filter(e=>e.at>=statsWeekStart(new Date())).length,goal=Math.max(1,Number(state.preferences?.weeklyGoal)||10),ready=state.anime.filter(a=>a.status==='watching').reduce((n,a)=>n+Math.max(0,releasedTotal(a)-count(a)),0),next7=upcomingEntries.filter(x=>x.when>=Date.now()&&x.when<=Date.now()+7*DAY).length,waiting=state.anime.filter(a=>!!futureSeasonOf(a)).length;box.innerHTML=`<button data-v96-view="statistics"><span>Këtë javë</span><strong>${week}</strong><small>${Math.min(100,Math.round(week/goal*100))}% e objektivit</small></button><button data-v96-filter="watching"><span>Gati për t’u parë</span><strong>${ready}</strong><small>episode të transmetuara</small></button><button data-v96-view="upcoming"><span>7 ditët e ardhshme</span><strong>${next7}</strong><small>premiera</small></button><button data-v96-filter="waiting"><span>Vazhdime</span><strong>${waiting}</strong><small>sezone të konfirmuara</small></button>`}
const v96OldHome=renderHome;
renderHome=function(){v96OldHome();v96RenderReleases();v96RenderPulse()};
v96OrganizeDashboard();
$('v96-open-schedule').addEventListener('click',()=>setView('upcoming'));
$('v96-refresh-airing').addEventListener('click',()=>refreshUpcoming(true));
document.addEventListener('click',e=>{const b=e.target.closest('[data-v96-view],[data-v96-filter],[data-v96-watch]');if(!b)return;if(b.dataset.v96Watch){const changed=updateSeasonEpisode(b.dataset.v96Watch,b.dataset.v96Season,Number(b.dataset.v96Episode),true);if(changed){v96RenderReleases();v96RenderPulse()}return}if(b.dataset.v96View)setView(b.dataset.v96View);else if(b.dataset.v96Filter)setFilter(b.dataset.v96Filter)});


let seriesRepairBusy=false;
async function scanAndMergeSeries(quiet=false){
 if(seriesRepairBusy)return;
 seriesRepairBusy=true;const button=$('series-repair-btn'),owner=accountUser?.id||null,before=state.anime.length;
 if(button){button.disabled=true;button.textContent='Po kontrollohen lidhjet...'}
 try{
  const candidates=state.anime.filter(a=>a.source&&isSeriesFormat(a.format)&&/^\d+$/.test(a.sourceId||'')).map(a=>a.id);
  for(const id of candidates){if((accountUser?.id||null)!==owner)break;const anime=state.anime.find(a=>a.id===id);if(!anime)continue;await hydrateSeasons(id,true)}
  const merged=before-state.anime.length;
  if(!quiet)notify(merged>0?merged+' karta të dyfishuara u bashkuan pa humbur episodet ✓':'Sezonet u kontrolluan. Nuk ka karta të tjera për t’u bashkuar.');
 }finally{seriesRepairBusy=false;if(button){button.disabled=false;button.textContent='↻ Kontrollo & bashko sezonet'}}
}
$('series-repair-btn').addEventListener('click',()=>scanAndMergeSeries(false));
const seriesBaseAccountOpen=accountOpenCloud;
accountOpenCloud=async function(user){
 await seriesBaseAccountOpen(user);
 const groups=new Map();
 for(const a of state.anime.filter(a=>a.source&&isSeriesFormat(a.format))){const root=seriesRootTitle(a.title);if(root.length<12)continue;const group=groups.get(root)||[];group.push(a);groups.set(root,group)}
 if([...groups.values()].some(group=>group.length>1&&group.some(a=>seriesHasSeasonSuffix(a.title))))setTimeout(()=>{if(accountUser?.id===user.id)scanAndMergeSeries(true)},3500);
};


let episodeDiscussion={key:'',rows:[],loading:false,error:'',draft:'',isSpoiler:true,sort:'newest',sending:false},episodeRevealed=new Set(),episodeSynopsisRevealed=new Set(),episodeLastPost=0;
function episodePublicKey(a,s,n,ep){
 const num=Number(s.globalStart)?Number(s.globalStart)+Number(n)-1:Number(n);
 if(/^\d+$/.test(String(s.malId||'')))return 'mal:'+s.malId+':'+num;
 if(s.source==='AniList'&&/^\d+$/.test(String(s.sourceId||'')))return 'al:'+s.sourceId+':'+n;
 if(ep?.tvmazeEpisodeId&&/^\d+$/.test(String(a.tvmazeId||'')))return 'tv:'+a.tvmazeId+':'+ep.tvmazeEpisodeId;
 return '';
}
function episodePersonalRow(s,n){
 let ep=(s.episodes||[]).find(e=>e.number===n);
 if(!ep){ep={number:n};s.episodes.push(ep);s.episodes.sort((a,b)=>a.number-b.number)}
 return ep;
}
function v98DiscussionHTML(key){
 const rows=[...episodeDiscussion.rows].sort((a,b)=>episodeDiscussion.sort==='oldest'?Date.parse(a.created_at)-Date.parse(b.created_at):Date.parse(b.created_at)-Date.parse(a.created_at));
 const active=accountMode==='cloud'&&accountUser;
 const cards=rows.map(x=>{
  const own=accountUser?.id===x.user_id,concealed=x.is_spoiler&&!episodeRevealed.has(x.id),date=Number.isFinite(Date.parse(x.created_at))?new Date(x.created_at).toLocaleString('sq-AL',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
  return `<article class="v98-comment"><div class="v98-comment-head"><strong>${escapeHTML(x.author_name||'Anime fan')}</strong><small>${escapeHTML(date)}</small><span class="v98-spoiler-badge">${x.is_spoiler?'⚠ Spoiler':'Pa spoiler'}</span></div>${concealed?`<button class="v98-reveal" data-v98-reveal="${x.id}">⚠ Komenti përmban spoiler · Kliko për ta zbuluar</button>`:`<p class="v98-comment-body">${escapeHTML(x.body)}</p>`}<div class="v98-comment-actions"><button data-v98-reply="${x.id}">Përgjigju</button>${own?`<button data-v98-edit="${x.id}">Ndrysho</button><button data-v98-delete="${x.id}">Fshi komentin tim</button>`:`<button data-v98-report="${x.id}">Raporto</button>`}</div></article>`
 }).join('');
 return `<section class="v98-discussion" id="v98-discussion"><div class="v98-section-head"><div><span class="eyebrow">BASHKËBISEDIMI I FANSAVE</span><h3>💬 Komentet e episodit <span class="v98-comment-count">${rows.length}</span></h3></div><button type="button" class="ghost" data-v98-refresh="${escapeHTML(key)}" ${episodeDiscussion.loading?'disabled':''}>↻ Rifresko</button></div><p class="v98-discussion-info">Diskutim publik mes përdoruesve të regjistruar. Mos zbulo informacione personale. Komentet me spoiler mbulohen derisa t’i hapësh.</p>${key?`<div class="v98-comment-form"><label for="v98-comment-body">${episodeDiscussion.replyTo?"↳ Po i përgjigjesh komentit #"+episodeDiscussion.replyTo:"Komenti yt"}</label>${episodeDiscussion.replyTo?'<button class="ghost" data-v98-cancel-reply="1">Anulo përgjigjen</button>':""}<textarea id="v98-comment-body" maxlength="1200" rows="3" placeholder="Çfarë mendove për këtë episod?">${escapeHTML(episodeDiscussion.draft)}</textarea><div class="v98-comment-controls"><label><input type="checkbox" id="v98-spoiler-check" ${episodeDiscussion.isSpoiler?'checked':''}> Përmban spoiler</label><span id="v98-char-count">${episodeDiscussion.draft.length}/1200</span><button class="primary" type="button" data-v98-send="1" ${episodeDiscussion.sending||!active?'disabled':''}>${episodeDiscussion.sending?'Po dërgohet…':'Publiko komentin'}</button></div></div><div class="v98-discussion-tools"><label>Rendit <select id="v98-comment-sort"><option value="newest" ${episodeDiscussion.sort==='newest'?'selected':''}>Më të rejat</option><option value="oldest" ${episodeDiscussion.sort==='oldest'?'selected':''}>Më të vjetrat</option></select></label><small>${episodeDiscussion.loading?'Po merren komentet…':episodeDiscussion.error?escapeHTML(episodeDiscussion.error):''}</small></div><div class="v98-comments-list">${cards||(!episodeDiscussion.loading?'<p class="v98-empty">Ende nuk ka komente. Nise ti diskutimin!</p>':'')}</div>`:`<p class="v98-empty">Komentet publike hapen për anime të lidhura me ID zyrtare AniList, MyAnimeList ose TVmaze. Shënimet personale funksionojnë për çdo anime.</p>`}</section>`;
}
function v98RenderEpisodeExtras(){
 const parts=v81EpisodeParts(),{a,s,n,ep}=parts;if(!a||!s)return;
 const box=$('ep-detail-body');if(!box)return;
 const actualImage=validPoster(ep?.image||'');
 if(!actualImage){const visual=box.querySelector('.ep-detail-visual'),poster=validPoster(a.cover||'');if(visual&&poster){const image=document.createElement('img');image.src=poster;image.alt='Poster i animes '+a.title+', jo foto e episodit';image.loading='lazy';image.referrerPolicy='no-referrer';image.className='v98-poster-fallback';visual.querySelector('strong')?.remove();visual.prepend(image);const caption=visual.querySelector('.visual-caption');if(caption)caption.textContent='Poster i animes · foto e episodit nuk gjendet te burimi'}}
 const currentKey=episodePublicKey(a,s,n,ep),cacheKey=a.id+'|'+s.id+'|'+n;
 const synopsis=box.querySelector('.ep-detail-summary');
 if(synopsis){synopsis.insertAdjacentHTML('beforebegin','<div class="v98-subheading">PËRSHKRIMI I EPISODIT</div>');if(!s.watched.includes(n)&&!episodeSynopsisRevealed.has(cacheKey)){synopsis.hidden=true;const button=document.createElement('button');button.type='button';button.className='v98-spoiler-reveal';button.dataset.v98Synopsis=cacheKey;button.textContent='⚠ Mund të ketë spoiler · Shfaq përshkrimin';synopsis.before(button)}}
 const epNote=String(ep?.myNote||''),rating=Number(ep?.personalRating)||0;
 const options='<option value="0">Pa vlerësim</option>'+Array.from({length:10},(_,i)=>`<option value="${i+1}" ${rating===i+1?'selected':''}>${i+1}/10 ${i+1>=9?'★':''}</option>`).join('');
 const extra=`<div class="v98-navline"><button class="ghost" data-v98-move="-1" ${n<=1?'disabled':''}>← Episodi ${Math.max(1,n-1)}</button><span>${n} / ${releasedCount(s)} të transmetuara</span><button class="ghost" data-v98-move="1" ${n>=releasedCount(s)?'disabled':''}>Episodi ${n+1} →</button></div><div class="v98-personal"><div class="v98-section-head"><div><span class="eyebrow">VETËM PËR LLOGARINË TËNDE</span><h3>✎ Shënimet & vlerësimi im</h3></div><label>Nota ime <select id="v98-rating">${options}</select></label></div><textarea id="v98-personal-note" maxlength="1500" rows="3" placeholder="Çfarë të pëlqeu? Teoritë e tua për episodin...">${escapeHTML(epNote)}</textarea><div class="v98-personal-bottom"><small>Private · ruhen me bibliotekën tënde në Supabase.</small><button class="ghost" data-v98-save-note="1" type="button">Ruaj shënimin</button></div></div>${v98DiscussionHTML(currentKey)}`;
 box.insertAdjacentHTML('beforeend',extra);
}
async function v98LoadComments(){
 const {a,s,n,ep}=v81EpisodeParts();if(!a||!s)return;
 const key=episodePublicKey(a,s,n,ep);
 if(key!==episodeDiscussion.key){episodeDiscussion={key,rows:[],loading:false,error:'',draft:'',isSpoiler:true,sort:'newest',sending:false}}
 if(!key||accountMode!=='cloud'||!accountUser){episodeDiscussion.rows=[];episodeDiscussion.error=!key?'ID e episodit nuk është verifikuar ende.':'Hyr në llogari për të komentuar.';v81RenderEpisode();return}
 if(episodeDiscussion.loading)return;
 episodeDiscussion.loading=true;episodeDiscussion.error='';v81RenderEpisode();
 try{
  const {data,error}=await accountInitClient().from('episode_comments').select('id,user_id,author_name,body,is_spoiler,parent_id,created_at').eq('episode_key',key).order('created_at',{ascending:false}).limit(80);
  if(error)throw error;if(episodeDiscussion.key!==key)return;
  episodeDiscussion.rows=data||[];
 }catch(e){if(episodeDiscussion.key===key)episodeDiscussion.error='Komentet nuk u ngarkuan: '+String(e.message||e).slice(0,130)}
 finally{if(episodeDiscussion.key===key){episodeDiscussion.loading=false;v81RenderEpisode()}}
}
async function v98PublishComment(){
 if(episodeDiscussion.sending||accountMode!=='cloud'||!accountUser)return;
 const {a,s,n,ep}=v81EpisodeParts(),key=a&&s?episodePublicKey(a,s,n,ep):'';
 if(!key||key!==episodeDiscussion.key)return;
 const area=$('v98-comment-body'),body=String(area?.value||episodeDiscussion.draft).trim(),spoiler=!!$('v98-spoiler-check')?.checked;
 if(body.length<3||body.length>1200){notify('Komenti duhet të ketë 3–1200 karaktere.');return}
 if(Date.now()-episodeLastPost<15000){notify('Mund të publikosh komentin tjetër pas pak sekondash.');return}
 episodeDiscussion.draft=body;episodeDiscussion.isSpoiler=spoiler;episodeDiscussion.sending=true;v81RenderEpisode();
 try{
  const name=String(accountUser.user_metadata?.display_name||'Anime fan').trim().slice(0,40)||'Anime fan';
  const {error}=await accountInitClient().from('episode_comments').insert({user_id:accountUser.id,episode_key:key,author_name:name,body,is_spoiler:spoiler,parent_id:episodeDiscussion.replyTo||null});
  if(error)throw error;
  episodeLastPost=Date.now();episodeDiscussion.draft='';episodeDiscussion.replyTo=null;episodeDiscussion.isSpoiler=true;notify('Komenti u publikua ✓');episodeDiscussion.sending=false;await v98LoadComments();
 }catch(e){episodeDiscussion.error='Dërgimi dështoi: '+String(e.message||e).slice(0,160);episodeDiscussion.sending=false;v81RenderEpisode()}
}
async function v98EditComment(id){
 const record=episodeDiscussion.rows.find(x=>String(x.id)===String(id));if(!record||record.user_id!==accountUser?.id)return;
 const draft=prompt('Ndrysho komentin tënd (3–1200 karaktere):',record.body);
 if(draft===null)return;const body=draft.trim();
 if(body.length<3||body.length>1200){notify('Komenti duhet të ketë 3–1200 karaktere.');return}
 const {error}=await accountInitClient().from('episode_comments').update({body}).eq('id',id).eq('user_id',accountUser.id);
 if(error){notify('Ndryshimi dështoi: '+error.message);return}
 notify('Komenti u përditësua ✓');await v98LoadComments();
}
async function v98DeleteComment(id){
 const record=episodeDiscussion.rows.find(x=>String(x.id)===String(id));if(!record||record.user_id!==accountUser?.id)return;
 if(!confirm('Ta fshijmë komentin tënd?'))return;
 const {error}=await accountInitClient().from('episode_comments').delete().eq('id',id).eq('user_id',accountUser.id);
 if(error){notify('Fshirja nuk u krye: '+error.message);return}notify('Komenti u fshi');await v98LoadComments();
}
async function v98ReportComment(id){
 const record=episodeDiscussion.rows.find(x=>String(x.id)===String(id));if(!record||record.user_id===accountUser?.id)return;
 const reason=prompt('Pse po e raporton këtë koment? (spam, ofendim, spoiler i pashënuar...)');
 if(reason==null)return;const value=reason.trim().slice(0,250);if(value.length<3){notify('Shkruaj të paktën 3 karaktere.');return}
 const {error}=await accountInitClient().from('episode_comment_reports').insert({comment_id:Number(id),reporter_id:accountUser.id,reason:value});
 if(error){notify(error.code==='23505'?'E ke raportuar më parë këtë koment.':'Raportimi nuk u ruajt.');return}
 notify('Raportimi u regjistrua për shqyrtim. Komenti nuk hiqet automatikisht.');
}
function v98SavePrivate(){
 const {a,s,n}=v81EpisodeParts();if(!a||!s)return;
 const ep=episodePersonalRow(s,n),note=String($('v98-personal-note')?.value||'').trim(),rating=Number($('v98-rating')?.value||0);
 ep.myNote=note.slice(0,1500);ep.personalRating=rating>=1&&rating<=10?rating:null;a.updatedAt=now();save();if(detailId===a.id)renderDetail(a.id);v81RenderEpisode('Shënimi dhe nota u ruajtën; sinkronizimi cloud kryhet automatikisht.');
}
function v98EpisodeActionHandlers(){
 const baseRender=v81RenderEpisode;
 v81RenderEpisode=function(msg=''){baseRender(msg);v98RenderEpisodeExtras()};
 const baseOpen=v81OpenEpisode;
 v81OpenEpisode=function(id,seasonId,n){
  const a=state.anime.find(x=>x.id===id),s=a?.seasons.find(x=>x.id===seasonId),ep=s?.episodes.find(x=>x.number===Number(n)),key=a&&s?episodePublicKey(a,s,Number(n),ep):'';
  if(key!==episodeDiscussion.key)episodeDiscussion={key,rows:[],loading:false,error:'',draft:'',isSpoiler:true,sort:'newest',sending:false};
  baseOpen(id,seasonId,n);void v98LoadComments();
 };
 document.addEventListener('input',e=>{if(e.target.id==='v98-comment-body'){episodeDiscussion.draft=e.target.value;$('v98-char-count').textContent=e.target.value.length+'/1200'}});
 document.addEventListener('change',e=>{if(e.target.id==='v98-comment-sort'){episodeDiscussion.sort=e.target.value;v81RenderEpisode()}if(e.target.id==='v98-spoiler-check')episodeDiscussion.isSpoiler=e.target.checked});
 document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.v98SaveNote){v98SavePrivate();return}
  if(b.dataset.v98Reply){episodeDiscussion.replyTo=Number(b.dataset.v98Reply);v81RenderEpisode();$('v98-comment-body')?.focus();return}
  if(b.dataset.v98CancelReply){episodeDiscussion.replyTo=null;v81RenderEpisode();return}
  if(b.dataset.v98Send){void v98PublishComment();return}
  if(b.dataset.v98Refresh){void v98LoadComments();return}
  if(b.dataset.v98Reveal){episodeRevealed.add(Number(b.dataset.v98Reveal));v81RenderEpisode();return}
  if(b.dataset.v98Synopsis){episodeSynopsisRevealed.add(b.dataset.v98Synopsis);v81RenderEpisode();return}
  if(b.dataset.v98Edit){void v98EditComment(b.dataset.v98Edit);return}
  if(b.dataset.v98Delete){void v98DeleteComment(b.dataset.v98Delete);return}
  if(b.dataset.v98Report){void v98ReportComment(b.dataset.v98Report);return}
  if(b.dataset.v98Move){const {a,s,n}=v81EpisodeParts(),newN=n+Number(b.dataset.v98Move);if(a&&s&&newN>=1&&newN<=releasedCount(s))v81OpenEpisode(a.id,s.id,newN)}
 });
}
v98EpisodeActionHandlers();


/* AnimeTrack 9.9 — composed feature modules. Core user library remains unchanged. */
const proContext={
 el:$,esc:escapeHTML,state:()=>state,user:()=>accountUser,client:()=>accountInitClient(),
 poster:validPoster,count,activity:activityEpisodes,upcoming:()=>upcomingEntries,
 genres:genresOf,seriesRoot:seriesRootTitle,mapAniList,inLibrary,released:releasedCount,isMovie:isMovieAnime,uuid,
 toast:notify,save:()=>save(),accountName,openAnime:id=>openDetail(id),
 nextEpisode:nextSeasonEp,releasedTotal,percent:percentage,markNext,recentAiring:()=>v96RecentEpisodes(),
 openFilter:code=>setFilter(code),
 
 openEpisode:(id,seasonId,n)=>v81OpenEpisode(id,seasonId,n),
 markEpisode:(id,seasonId,n)=>requestEpisodeToggle(id,seasonId,n),
 refreshAiring:async()=>{await refreshUpcoming(true);proApp.render();await proApp.modules.notifications.refresh()},
 liveRefresh:async(force=false)=>{if(accountMode==='cloud'&&accountUser)await accountPullQuiet();await refreshUpcoming(force);if(catalogSyncAt&&Date.now()-catalogSyncAt>DAY)await refreshCatalogDaily(false);await proApp.modules.notifications.refresh();proApp.renderHome();proApp.render();return {at:upcomingCheckedAt,failed:upcomingFailures,cloud:cloudConnected}},
 liveStatus:()=>({at:upcomingCheckedAt,failed:upcomingFailures,busy:upcomingBusy,cloud:cloudConnected}),
 openDiscussion:key=>{
  const m=/^(mal|al|tv):(\d+):(\d+)$/.exec(String(key||''));if(!m)return false;
  for(const a of state.anime)for(const ss of a.seasons||[]){
   let n=0;
   if(m[1]==='mal'&&String(ss.malId)===m[2])n=Number(m[3])-(Number(ss.globalStart)||1)+1;
   else if(m[1]==='al'&&ss.source==='AniList'&&String(ss.sourceId)===m[2])n=Number(m[3]);
   else if(m[1]==='tv'&&String(a.tvmazeId)===m[2])n=Number((ss.episodes||[]).find(e=>String(e.tvmazeEpisodeId)===m[3])?.number)||0;
   if(n>0&&Number.isInteger(n)&&(!ss.total||n<=ss.total)){v81OpenEpisode(a.id,ss.id,n);return true}
  }
  return false;
 },
 refreshDetail:id=>renderDetail(id),navigate:page=>setView(page),setLocalView:page=>{view=page},
 previewItem:item=>{v8PrepareCatalog(item);openCatalogPreview(item.key)},
 addItem:async item=>{v8PrepareCatalog(item);const id=await addCatalogItem(item.key,'planning');if(id)openDetail(id)}
};
const proApp=window.AnimeTrackPro(proContext);
proApp.init();
const proPriorHome=renderHome;renderHome=function(){proPriorHome();proApp.renderHome()};
const proPriorView=setView;setView=function(which){if(proApp.open(which))return;proApp.hide();return proPriorView(which)};
const proPriorDetail=renderDetail;renderDetail=function(id){proPriorDetail(id);proApp.renderRewatch(id)};
const proPriorCloud=accountOpenCloud;accountOpenCloud=async function(user){await proPriorCloud(user);await proApp.onAccount()};
const proPriorLogout=accountLogout;accountLogout=async function(){await proPriorLogout();proApp.hide();await proApp.onAccount()};
const proPriorSave=save;save=function(){const result=proPriorSave();if(result)proApp.onStateChange();return result};

render();renderUpcoming();renderHome();setView('home');v8LoadSeason(1);accountBoot();
})();
