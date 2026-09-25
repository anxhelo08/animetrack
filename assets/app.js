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

function load(){try{let s=JSON.parse(localStorage.getItem(KEY));if(s&&Array.isArray(s.anime))return {anime:s.anime.map(normalized).filter(Boolean),history:Array.isArray(s.history)?s.history.filter(h=>h&&typeof h==='object').slice(-2000):[],preferences:{weeklyGoal:Math.max(1,Math.min(200,Number(s.preferences?.weeklyGoal)||10)),notificationRead:Array.isArray(s.preferences?.notificationRead)?s.preferences.notificationRead.filter(x=>typeof x==='string').slice(-250):[]}}}catch(e){console.warn('Nuk u lexuan të dhënat:',e)}return{anime:[],history:[],preferences:{weeklyGoal:10,notificationRead:[]}}}
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
async function importData(file){if(!file)return;try{const text=await file.text();if(text.length>8_000_000)throw Error('Skedari është tepër i madh.');const data=JSON.parse(text);if(!data||!Array.isArray(data.anime)||!Array.isArray(data.history))throw Error('Formati i kopjes rezervë nuk është i saktë.');if(!confirm('Importi do të zëvendësojë bibliotekën aktuale. Vazhdo?'))return;state={anime:data.anime.map(normalized).filter(Boolean),history:data.history.filter(h=>h&&typeof h==='object').slice(-2000),preferences:{weeklyGoal:Math.max(1,Math.min(200,Number(data.preferences?.weeklyGoal)||10)),notificationRead:Array.isArray(data.preferences?.notificationRead)?data.preferences.notificationRead.filter(x=>typeof x==='string').slice(-250):[]}};upcomingCheckedAt=0;catalogSyncAt=0;upcomingEntries=[];persistCache();save();filter='all';search='';$('search').value='';$('global-search').value='';clearCatalog();render();notify('Biblioteka u importua me sukses ✓')}catch(e){notify('Importi dështoi: '+e.message)}finally{$('import-file').value=''}}

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
 if(upcomingBusy)return;if(!force&&upcomingCheckedAt&&Date.now()-upcomingCheckedAt<DAY){renderUpcoming();return}
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
 $('upcoming-grid').innerHTML=(future.length?future.map(x=>`<article class="air-card"><div class="air-cover">${validPoster(x.cover)?`<img src="${escapeHTML(x.cover)}" alt="" loading="lazy">`:''}</div><div class="air-info"><span class="eyebrow">${escapeHTML(x.source)} · EP ${x.episode}</span><h3>${escapeHTML(x.title)}</h3><p>${escapeHTML(x.season)}</p><div class="air-when">◷ ${escapeHTML(airDate(x.when))} · Shqipëri</div><p>Orar i njoftuar transmetimi; jo garanci për një platformë s