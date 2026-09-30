Warning: truncated output (original token count: 76029)
Total output lines: 2071

(()=>{'use strict';
let KEY='animetrack_v1';
const STATUS={watching:'Po shikoj',completed:'Përfunduar',planning:'Në listë',paused:'Në pauzë',dropped:'E lënë'};
const $=id=>document.getElementById(id);
let accountMode='guest',accountUser=null,cloudClient=null,cloudTimer=null,cloudDirty=false,cloudSaving=false,cloudLastSync='',cloudConnected=false,cloudRevision=null,cloudConflict=false,cloudBaseKnown=false,cloudMirrorUnavailable=false,accountBusy=false,cloudRealtimeChannel=null,cloudRealtimeUID='',cloudRealtimePending=false,cloudRealtimeTimer=null,cloudRealtimeRecord=null;
let state=load(),filter='all',search='',sort='updated',detailId=null,episodePage=0,activeSeasonId=null,toastTimeout,selectedGenre='all';
let view='home', previewKey=null, pendingEpisode=null, airingWindow=7, upcomingEntries=[], upcomingFailures=0, upcomingCheckedAt=0, upcomingBusy=false;
const FRANCHISE_SCHEMA='13.1.0';
function escapeHTML(s){return window.ATHTML.escapeHTML(s);}
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
function isLiveMovie(a){return mediaFormat(a?.format)==='MOVIE'&&['TMDB','OMDb','Cinemeta','Wikidata'].includes(String(a?.source||''))}
function mediaKind(a){return isLiveMovie(a)?'movie':a?.source==='TVMaze'?'tv':'anime'}
function movieWatched(a){return !!(isLiveMovie(a)&&visibleSeasons(a)[0]?.watched?.includes(1))}
function isConfirmedFutureSeason(s){return !!s&&['TV','TV_SHORT','ONA'].includes(mediaFormat(s.format))&&String(s.releaseStatus||'').toUpperCase()==='NOT_YET_RELEASED'}
function visibleSeasons(a){return (a?.seasons||[]).filter(s=>!s.hidden)}
function hiddenSeasons(a){return (a?.seasons||[]).filter(s=>s.hidden)}
function futureSeasonOf(a){if(a?.status!=='completed')return null;const parts=visibleSeasons(a);return parts.find(isConfirmedFutureSeason)||((a.source==='TVMaze')?parts.find(s=>(s.episodes||[]).some(e=>e.airedAt&&Date.parse(e.airedAt)>Date.now())):null)}
function tidyNums(values,total=0){return [...new Set((Array.isArray(values)?values:[]).map(Number).filter(n=>Number.isInteger(n)&&n>0&&n<=10000&&(!total||n<=total)))].sort((a,b)=>a-b)}
function normSeason(raw,idx=0){const total=Math.max(0,Math.min(10000,parseInt(raw?.total,10)||0));return {id:String(raw?.id||'manual-'+(idx+1)).slice(0,65),title:String(raw?.title||'Sezoni '+(idx+1)).slice(0,180),subtitle:String(raw?.subtitle||'').slice(0,180),aliases:[...new Set((Array.isArray(raw?.aliases)?raw.aliases:[]).map(x=>String(x||'').replace(/\s+/g,' ').trim().slice(0,180)).filter(Boolean))].slice(0,12),total,watched:tidyNums(raw?.watched,total),year:Number(raw?.year)||null,source:String(raw?.source||'').slice(0,20),sourceId:String(raw?.sourceId||'').slice(0,30),malId:String(raw?.malId||'').slice(0,30),format:mediaFormat(raw?.format||'TV'),globalStart:Math.max(0,Number(raw?.globalStart)||0),episodes:(Array.isArray(raw?.episodes)?raw.episodes:[]).filter(e=>e&&Number.isInteger(Number(e.number))&&Number(e.number)>0).slice(0,10000).map(e=>({number:Number(e.number),absolute:Number(e.absolute)||0,title:String(e.title||'').slice(0,220),aired:String(e.aired||'').slice(0,40),airedAt:String(e.airedAt||'').slice(0,60),summary:String(e.summary||'').slice(0,2500),image:validPoster(e.image||''),url:validPoster(e.url||''),tvmazeEpisodeId:String(e.tvmazeEpisodeId||'').slice(0,30),filler:!!e.filler,recap:!!e.recap,fillerChecked:e.fillerChecked===true,fillerSource:String(e.fillerSource||'').slice(0,18),fillerCheckedAt:String(e.fillerCheckedAt||'').slice(0,40),fillerManual:e.fillerManual===true?true:e.fillerManual===false?false:null,detailsCheckedAt:String(e.detailsCheckedAt||'').slice(0,40),myNote:String(e.myNote||'').slice(0,1500),personalRating:e.personalRating==null?null:Math.max(1,Math.min(10,Number(e.personalRating)||1))})),loadedPages:[...new Set((Array.isArray(raw?.loadedPages)?raw.loadedPages:[]).filter(n=>Number.isInteger(n)&&n>0&&n<=500))],fillerPagesChecked:[...new Set((Array.isArray(raw?.fillerPagesChecked)?raw.fillerPagesChecked:[]).filter(n=>Number.isInteger(n)&&n>0&&n<=500))],epPage:Math.max(0,Math.min(500,parseInt(raw?.epPage,10)||0)),hasMore:!!raw?.hasMore,myRating:raw?.myRating==null||raw.myRating===''?null:Math.min(10,Math.max(0,Number(raw.myRating)||0)),arcRatings:(Array.isArray(raw?.arcRatings)?raw.arcRatings:[]).slice(0,80).map((arc,i)=>window.ATFranchise1212?.normalizeArc?window.ATFranchise1212.normalizeArc(arc,i):arc),communityScore:Number.isFinite(Number(raw?.communityScore))&&raw?.communityScore!=null?Math.max(0,Math.min(100,Number(raw.communityScore))):null,communitySource:String(raw?.communitySource||'').slice(0,25),discoveredAt:String(raw?.discoveredAt||'').slice(0,40),releaseStatus:String(raw?.releaseStatus||'').slice(0,32),releaseStart:String(raw?.releaseStart||'').slice(0,32),nextAiringAt:Math.max(0,Number(raw?.nextAiringAt)||0),nextAiringEpisode:Math.max(0,Number(raw?.nextAiringEpisode)||0),airedCount:raw?.airedCount==null?null:Math.max(0,Number(raw.airedCount)||0),airedCheckedAt:String(raw?.airedCheckedAt||'').slice(0,40),imdbId:/^tt\d{5,12}$/.test(String(raw?.imdbId||''))?String(raw.imdbId):'',imdbSeasonNumber:Math.max(1,Math.min(200,Number(raw?.imdbSeasonNumber)||idx+1)),imdbEpisodeAverage:raw?.imdbEpisodeAverage==null?null:(Number.isFinite(Number(raw.imdbEpisodeAverage))?Math.max(0,Math.min(10,Number(raw.imdbEpisodeAverage))):null),imdbEpisodeCount:Math.max(0,Number(raw?.imdbEpisodeCount)||0),imdbCheckedAt:String(raw?.imdbCheckedAt||'').slice(0,40),hidden:raw?.hidden===true,synopsis:String(raw?.synopsis||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,1800),sourceUrl:validPoster(raw?.sourceUrl||'')};}
// 9.3: "planned" is never the denominator of viewing progress.
function mediaStartIso(d){if(!d?.year)return '';return [String(d.year),String(d.month||1).padStart(2,'0'),String(d.day||1).padStart(2,'0')].join('-')}
function releaseFromMedia(s,m){
 if(!s||!m)return;
 if(String(s.source||'').toLowerCase()==='tvmaze')return;
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
 const tvmazeGuard=window.ATReleaseGuard1352?.tvmazeReleasedCount?.(s,at);
 if(tvmazeGuard!=null)return tvmazeGuard;
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
function releasedTotal(a){return visibleSeasons(a).reduce((sum,s)=>sum+releasedCount(s),0)}
function plannedPending(a){return visibleSeasons(a).reduce((sum,s)=>sum+Math.max(0,(Number(s.total)||0)-releasedCount(s)),0)}
function pendingReleaseText(s){let date=s.nextAiringAt?new Date(s.nextAiringAt*1000):null;let when=date&&Number.isFinite(date.getTime())?' · '+new Intl.DateTimeFormat('sq-AL',{timeZone:'Europe/Tirane',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(date):'';return `E konfirmuar · ${s.total?Math.max(0,s.total-releasedCount(s))+' ep. ende pa dalë':'numri i episodeve ende i panjohur'}${when||((s.releaseStart&&s.releaseStart.length>=10)?' · Fillimi: '+s.releaseStart:'')}`}
function releasedStatusAfterWatch(a,seen){const available=releasedTotal(a),future=visibleSeasons(a).some(s=>(Number(s.total)||0)>releasedCount(s)||(['RELEASING','CURRENTLY_AIRING','NOT_YET_RELEASED','NOT_YET_AIRED'].includes(s.releaseStatus)&&!!s.nextAiringAt));if(available>0&&count(a)>=available)a.status=future?'watching':'completed';else if(['completed','waiting'].includes(a.status)&&count(a)<available)a.status='watching';else if(seen&&a.status==='planning')a.status='watching'}
function syncTotals(a){a.seasons=(Array.isArray(a.seasons)?a.seasons:[]).map(normSeason).slice(0,200);const parts=visibleSeasons(a),allKnown=parts.length>0&&parts.every(s=>s.total>0);a.total=allKnown?parts.reduce((sum,s)=>sum+s.total,0):0;let offset=0;const flat=[];for(const season of parts){for(const n of season.watched){const absolute=season.globalStart?season.globalStart+n-1:offset+n;if(absolute>0&&absolute<=10000)flat.push(absolute)}offset+=season.total||Math.max(0,...season.watched)}a.watched=tidyNums(flat);return a}
function normalized(a){if(!a||typeof a!=='object'||typeof a.title!=='string'||!a.title.trim())return null;const oldTotal=Math.max(0,Math.min(10000,parseInt(a.total,10)||0));const seed={id:a.source==='AniList'&&a.sourceId?'al-'+a.sourceId:a.source==='MyAnimeList'&&a.sourceId?'mal-'+a.sourceId:'manual-1',title:'Sezoni 1',subtitle:a.title,total:oldTotal,watched:tidyNums(a.watched,oldTotal),source:a.source||'',sourceId:a.sourceId||'',malId:a.malId||'',format:a.format||'TV',episodes:[],myRating:null,communityScore:null};let o={id:String(a.id||uuid()),title:String(a.title).trim().slice(0,180),status:STATUS[a.status]?a.status:'planning',total:oldTotal,watched:[],rating:a.rating===''||a.rating==null?null:Math.min(10,Math.max(0,Number(a.rating)||0)),year:Number.isInteger(+a.year)&&+a.year>=1950&&+a.year<=2200?+a.year:null,genre:String(a.genre||'').slice(0,120),cover:validPoster(a.cover||''),notes:String(a.notes||'').slice(0,2500),favorite:!!a.favorite,communityScore:a.communityScore==null?null:Math.max(0,Math.min(100,Number(a.communityScore)||0)),communitySource:String(a.communitySource||'').slice(0,25),source:['AniList','MyAnimeList','TVMaze','TMDB','OMDb','Cinemeta','Wikidata'].includes(a.source)?a.source:'',sourceId:String(a.sourceId||'').slice(0,30),aliases:[...new Set((Array.isArray(a.aliases)?a.aliases:[]).map(x=>String(x).slice(0,180)))].slice(0,40),mergedIds:[...new Set((Array.isArray(a.mergedIds)?a.mergedIds:[]).map(x=>String(x).slice(0,180)))].slice(0,200),providerIds:[...new Set((Array.isArray(a.providerIds)?a.providerIds:[]).map(x=>String(x).slice(0,180)))].slice(0,500),malId:String(a.malId||'').slice(0,30),format:mediaFormat(a.format||'TV'),sourceUrl:validPoster(a.sourceUrl||''),synopsis:String(a.synopsis||'').slice(0,1800),hydrated:!!a.hydrated,franchiseVersion:String(a.franchiseVersion||'').slice(0,20),tvmazeId:String(a.tvmazeId||'').slice(0,30),tvmazeLoaded:!!a.tvmazeLoaded,rewatches:(Array.isArray(a.rewatches)?a.rewatches:[]).slice(-40).map(r=>({id:String(r.id||uuid()).slice(0,90),startedAt:String(r.startedAt||''),completedAt:String(r.completedAt||''),episodes:(Array.isArray(r.episodes)?r.episodes:[]).slice(-10000).filter(e=>e&&Number.isInteger(Number(e.number))&&Number(e.number)>0).map(e=>({eventId:String(e.eventId||'').slice(0,90),seasonId:String(e.seasonId||''),number:Number(e.number),date:String(e.date||''),diaryNote:String(e.diaryNote||'').slice(0,1500),diaryRating:e.diaryRating==null||e.diaryRating===''?null:Math.max(.5,Math.min(10,Math.round(Number(e.diaryRating)*2)/2))}))})),activeRewatchId:String(a.activeRewatchId||'').slice(0,90),imdbId:/^tt\d{5,12}$/.test(String(a.imdbId||''))?String(a.imdbId):'',imdbRating:a.imdbRating==null?null:(Number.isFinite(Number(a.imdbRating))?Math.max(0,Math.min(10,Number(a.imdbRating))):null),imdbVotes:Math.max(0,Number(a.imdbVotes)||0),imdbCheckedAt:String(a.imdbCheckedAt||'').slice(0,40),tmdbId:String(a.tmdbId||'').slice(0,30),runtime:Math.max(0,Math.min(1000,Number(a.runtime)||0)),director:String(a.director||'').slice(0,220),cast:String(a.cast||'').slice(0,1200),backdrop:validPoster(a.backdrop||''),releaseDate:String(a.releaseDate||'').slice(0,20),movieWatchCount:Math.max(0,Math.min(999,Number(a.movieWatchCount)||0)),lastWatchedAt:String(a.lastWatchedAt||'').slice(0,40),collectionId:String(a.collectionId||'').slice(0,30),collectionName:String(a.collectionName||'').slice(0,220),createdAt:String(a.createdAt||now()),updatedAt:String(a.updatedAt||now()),seasons:Array.isArray(a.seasons)&&a.seasons.length?a.seasons:[seed]};return syncTotals(o)}
function count(a){return visibleSeasons(a).reduce((sum,s)=>sum+s.watched.length,0)}
function percentage(a){const aired=releasedTotal(a);return aired?Math.min(100,Math.round(count(a)/aired*100)):0}
function nextSeasonEp(a){for(const s of visibleSeasons(a)){const seen=new Set(s.watched);let n=1;while(seen.has(n))n++;if(n<=releasedCount(s))return {season:s,n}}return null}
function nextEp(a){const next=nextSeasonEp(a);return next?`${next.season.title||'Pjesa'} · ${next.n}`:null}
function updateSeasonEpisode(id,seasonId,n,seen,quiet=false){
 const index=state.anime.findIndex(x=>x.id===id),a=state.anime[index],s=a?.seasons.find(x=>x.id===seasonId);
 if(!s||!Number.isInteger(n)||n<1||n>10000||(s.total&&n>s.total))return false;
 if(s.watched.includes(n)===seen)return false;
 if(seen&&n>releasedCount(s)){notify('Ky episod ende nuk është transmetuar. Do të shtohet pas publikimit të datës.');return false}
 // Commit a single episode only after its local snapshot was persisted. Never show
 // success or queue a cloud upload when localStorage rejected the transaction.
 const before=JSON.parse(JSON.stringify(a)),historyBefore=state.history.slice(),seasonIndex=seasonNumberFor(a,s);
 try{
  s.watched=seen?tidyNums([...s.watched,n],s.total):s.watched.filter(x=>x!==n);
  syncTotals(a);a.updatedAt=now();releasedStatusAfterWatch(a,seen);
  record(id,n,seen?'watched':'unwatched',seasonId);
  if(!save()){state.anime[index]=before;state.history=historyBefore;return false}
 }catch(err){state.anime[index]=before;state.history=historyBefore;console.error('Episode transaction rolled back',err);notify('Episodi nuk u ruajt. Provo përsëri.');return false}
 try{render();if(detailId===id)renderDetail(id);renderHome()}catch(err){console.warn('View refresh after saved episode failed',err)}
 if(!quiet)notify(`${mediaFormat(s.format)==='MOVIE'?(s.title||'Filmi'):'Sezoni '+seasonIndex}, episodi ${n} ${seen?'u shënua ✓':'u hoq'}`);
 return true;
}
function updateEpisode(id,n,seen){let a=state.anime.find(x=>x.id===id);if(!a)return;let offset=0;for(const s of visibleSeasons(a)){const len=s.total||Math.max(...s.watched,24);if(n<=offset+len)return updateSeasonEpisode(id,s.id,n-offset,seen);offset+=len}}
function markNext(id){let a=state.anime.find(x=>x.id===id);if(!a)return false;const ep=nextSeasonEp(a);if(!ep){notify('Nuk ka episode të tjera të transmetuara.');return false}activeSeasonId=ep.season.id;episodePage=Math.floor((ep.n-1)/24);return updateSeasonEpisode(id,ep.season.id,ep.n,true)}
function record(id,episode,action,seasonId='',episodes=null){state.history.push({eventId:uuid(),id,episode,action,seasonId,date:now(),diaryNote:'',diaryRating:null,...(Array.isArray(episodes)?{episodes:episodes.filter(n=>Number.isInteger(n)&&n>0&&n<=10000)}:{})})}
let pendingSeason=null;
function commitSeason(id,seasonId,seen,includePrevious=false){
 const index=state.anime.findIndex(x=>x.id===id),a=state.anime[index],s=a?.seasons.find(x=>x.id===seasonId);if(!a||!s)return;
 const before=JSON.parse(JSON.stringify(a)),historyBefore=state.history.slice();
 const parts=visibleSeasons(a),idx=parts.indexOf(s),targets=includePrevious&&seen?parts.slice(0,idx+1):[s];
 let added=0,removed=0,skipped=0;
 for(const x of targets){const available=releasedCount(x);if(!available){skipped++;continue}
  const before=x.watched.length,next=seen?Array.from({length:available},(_,i)=>i+1):[];
  if(seen)added+=next.length-before;else removed+=before;
  if(before!==next.length||x.watched.some((n,i)=>n!==next[i])){const changed=seen?next.filter(n=>!x.watched.includes(n)):x.watched.filter(n=>!next.includes(n));x.watched=next;record(id,0,seen?'season-watched':'season-unwatched',x.id,changed)}
 }
 if(!added&&!removed){notify('Nuk kishte episode për t’u ndryshuar.');return}
 syncTotals(a);a.updatedAt=now();
 releasedStatusAfterWatch(a,seen);
 if(!save()){state.anime[index]=before;state.history=historyBefore;notify('Sezoni nuk u ruajt. Nuk është ndryshuar progresi.');return}
 render();if(detailId===id)renderDetail(id);renderHome();
 notify(`${seen?'U shënuan '+added:'U hoqën '+removed} episode${skipped?' · '+skipped+' sezone me total të panjohur u lanë pa ndryshuar':''} ✓`);
}
function markSeason(id,seasonId,seen){
 const a=state.anime.find(x=>x.id===id),s=a?.seasons.find(x=>x.id===seasonId);if(!s||!a)return;
 if(!releasedCount(s)){notify('Ky sezon nuk ka ende episode të transmetuara.');return}
 if(!seen){commitSeason(id,seasonId,false);return}
 const parts=visibleSeasons(a),idx=parts.indexOf(s),earlier=parts.slice(0,idx),incomplete=earlier.filter(x=>!releasedCount(x)||x.watched.length<releasedCount(x));
 if(incomplete.length){
  pendingSeason={id,seasonId};$('season-confirm-copy').textContent=`Po shënon “${s.title}” si të parë. Ke ${incomplete.length} sezon${incomplete.length===1?'':'e'} të mëparshme që nuk janë shënuar plotësisht. A dëshiron të shënosh edhe ato? Sezonet me numër episodesh të panjohur nuk do të ndryshohen.`;
  showModal('season-confirm-modal');return;
 }
 commitSeason(id,seasonId,true);
}
function resolveSeasonConfirm(includePrevious){const pending=pendingSeason;closeModal('season-confirm-modal');pendingSeason=null;if(pending)commitSeason(pending.id,pending.seasonId,true,includePrevious)}
function addManualSeason(id){const transactionBefore=JSON.parse(JSON.stringify(state));const a=state.anime.find(x=>x.id===id);if(!a)return;let title=prompt('Emri i sezonit të ri:',`Sezoni ${a.seasons.length+1}`);if(title===null)return;title=title.trim().slice(0,100);if(!title)return;let input=prompt('Sa episode ka sezoni? (0 nëse nuk dihet)','12');if(input===null)return;let total=Number(input);if(!Number.isInteger(total)||total<0||total>10000){notify('Numri i episodeve nuk është i vlefshëm.');return}let s=normSeason({id:'manual-'+uuid(),title,total,subtitle:'Shtuar nga ti'},a.seasons.length);a.seasons.push(s);syncTotals(a);a.updatedAt=now();activeSeasonId=s.id;episodePage=0;if(!save()){state=transactionBefore;return false}render();renderDetail(id)}
function editSeasonCount(id,seasonId){const transactionBefore=JSON.parse(JSON.stringify(state));const a=state.anime.find(x=>x.id===id),s=a?.seasons.find(x=>x.id===seasonId);if(!s)return;let input=prompt('Numri i episodeve për '+s.title+':',String(s.total));if(input===null)return;let n=Number(input);if(!Number.isInteger(n)||n<0||n>10000||n<Math.max(0,...s.watched)){notify('Numër i pavlefshëm ose më i vogël se episodet e shënuara.');return}s.total=n;syncTotals(a);a.updatedAt=now();if(!save()){state=transactionBefore;return false}render();renderDetail(id)}
function setSeasonHidden(id,seasonId,hidden){
 const index=state.anime.findIndex(x=>x.id===id),a=state.anime[index],s=a?.seasons.find(x=>x.id===seasonId);if(!a||!s)return false;
 if(hidden&&visibleSeasons(a).length<=1){notify('Duhet të mbetet të paktën një pjesë e dukshme.');return false}
 const before=JSON.parse(JSON.stringify(a));s.hidden=!!hidden;a.updatedAt=now();syncTotals(a);
 if(hidden&&activeSeasonId===seasonId){const resume=window.ATResume123.resolve(a,state.history,releasedCount);activeSeasonId=resume?.seasonId||visibleSeasons(a)[0]?.id||null;episodePage=resume?.page||0}
 if(!save()){state.anime[index]=before;return false}render();if(detailId===id)renderDetail(id);renderHome();notify(hidden?'Pjesa u fsheh nga seria ✓':'Pjesa u rikthye në seri ✓');return true;
}


/* Keep in-app preferences across refreshes and Supabase cloud pulls. */
function normalizePreferences(raw){
 const p=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const allowed=new Set(['episodes','comments','friends','system']);
 const reminderEntries=Object.entries(p.calendarReminders&&typeof p.calendarReminders==='object'&&!Array.isArray(p.calendarReminders)?p.calendarReminders:{}).filter(([key,val])=>typeof key==='string'&&key.length<=180&&[0,10,30,60,1440].includes(val)).slice(-250);
 const customLists=Array.isArray(p.customLists)?p.customLists.filter(row=>row&&typeof row==='object'&&typeof row.id==='string'&&/^list-[a-zA-Z0-9_-]{3,85}$/.test(row.id)&&typeof row.title==='string').slice(0,12).map(row=>({
  id:row.id,title:row.title.replace(/\s+/g,' ').trim().slice(0,50),
  animeIds:Array.isArray(row.animeIds)?[...new Set(row.animeIds.filter(id=>typeof id==='string'&&id.length<=90))].slice(0,150):[],
  createdAt:typeof row.createdAt==='string'?row.createdAt.slice(0,40):'',
  updatedAt:typeof row.updatedAt==='string'?row.updatedAt.slice(0,40):''
 })).filter(row=>row.title.length>=2):[];
 return{
  weeklyGoal:Math.max(1,Math.min(200,Number(p.weeklyGoal)||10)),
  notificationRead:Array.isArray(p.notificationRead)?p.notificationRead.filter(x=>typeof x==='string'&&x.length<=180).slice(-250):[],
  notificationMuted:Array.isArray(p.notificationMuted)?[...new Set(p.notificationMuted.filter(x=>allowed.has(x)))]:[],
  notificationDismissed:Array.isArray(p.notificationDismissed)?p.notificationDismissed.filter(x=>typeof x==='string'&&x.length<=180).slice(-250):[],
  calendarReminders:Object.fromEntries(reminderEntries),
   reminderLead:[0,10,30,60,1440].includes(Number(p.reminderLead))?Number(p.reminderLead):30,
   pushEnabled:p.pushEnabled===true,
  homeQueue:Array.isArray(p.homeQueue)?[...new Set(p.homeQueue.filter(x=>typeof x==='string'&&x.length<=90))].slice(0,6):[],
  shareFriendActivity:p.shareFriendActivity===true,
  watchRegion:/^[A-Z]{2}$/.test(String(p.watchRegion||'').toUpperCase())?String(p.watchRegion).toUpperCase():'AL',
  providerAutoSync:p.providerAutoSync===true,
  customLists
 };
}
function normalizeTVShows(raw){
 if(!Array.isArray(raw))return [];
 const ids=new Set();
 return raw.slice(0,800).map(show=>{
  if(!show||typeof show!=='object'||!/^tvmaze-[1-9]\d*$/.test(String(show.id||''))||ids.has(show.id)||typeof show.title!=='string')return null;
  ids.add(show.id);
  const seasons=Array.isArray(show.seasons)?show.seasons.slice(0,90).map(season=>({
   number:Math.max(0,Math.min(99,Number(season?.number)||0)),
   episodes:Array.isArray(season?.episodes)?season.episodes.slice(0,500).filter(ep=>Number.isInteger(Number(ep?.id))&&Number(ep.id)>0).map(ep=>({
    id:Number(ep.id),number:Math.max(1,Math.min(9999,Number(ep.number)||1)),title:String(ep.title||'Episodi').slice(0,180),
    airdate:/^\d{4}-\d{2}-\d{2}$/.test(String(ep.airdate||''))?ep.airdate:'',runtime:Math.max(0,Math.min(600,Number(ep.runtime)||0)),
    summary:String(ep.summary||'').slice(0,900),image:validPoster(ep.image||'')
   })):[]
  })):[];
  const validIds=new Set(seasons.flatMap(season=>season.episodes.map(ep=>ep.id)));
  return {id:String(show.id),source:'TVmaze',sourceId:Number(show.sourceId)||Number(String(show.id).slice(7)),title:show.title.trim().slice(0,180),
   image:validPoster(show.image||''),year:Number(show.year)||null,genres:Array.isArray(show.genres)?show.genres.filter(g=>typeof g==='string').slice(0,8).map(g=>g.slice(0,60)):[],
   summary:String(show.summary||'').slice(0,1400),network:String(show.network||'').slice(0,120),rating:Number(show.rating)||null,
   showStatus:String(show.showStatus||'').slice(0,50),url:/^https:\/\/www\.tvmaze\.com\//.test(String(show.url||''))?show.url:'',
   status:STATUS[show.status]?show.status:'planning',watched:Array.isArray(show.watched)?[...new Set(show.watched.map(Number).filter(id=>validIds.has(id)))]:[],
   updatedAt:String(show.updatedAt||'').slice(0,40),seasons};
 }).filter(Boolean);
}
function load(){try{let s=JSON.parse(localStorage.getItem(KEY));if(s&&Array.isArray(s.anime)){if(Array.isArray(s.tvShows)&&s.tvShows.length){try{const backupKey=KEY+'_before_tv_unify_120';if(!localStorage.getItem(backupKey))localStorage.setItem(backupKey,JSON.stringify(s))}catch(err){console.warn('TV backup unavailable',err)}}const merged=window.ATTVUnified120.migrate(s.anime.map(normalized).filter(Boolean),normalizeTVShows(s.tvShows),normalized);return {anime:merged.anime,tvShows:[],history:Array.isArray(s.history)?s.history.filter(h=>h&&typeof h==='object'):[],preferences:normalizePreferences(s.preferences)}}}catch(e){console.warn('Nuk u lexuan të dhënat:',e)}return{anime:[],tvShows:[],history:[],preferences:{weeklyGoal:10,notificationRead:[]}}}
function accountCompact(value){return window.ATCloudLocal12123?.compact?window.ATCloudLocal12123.compact(value):value}
function accountLocalSnapshot(value=state){return accountMode==='cloud'&&accountUser?accountCompact(value):value}
function accountMergeRecovery(remote,local){return window.ATCloudLocal12123?.merge?window.ATCloudLocal12123.merge(remote,local):local}
function accountHydrateRemote(remote,rich=state){return window.ATCloudLocal12123?.hydrate?window.ATCloudLocal12123.hydrate(remote,rich):remote}
function repairLibraryState(){
 const result=window.ATLibraryIdentity137?.repair(state);if(!result?.changed)return false;
 state=result.payload;for(const a of state.anime)syncTotals(a);
 for(const row of result.remap){if(row.from===detailId){detailId=row.to;activeSeasonId=row.seasons?.[activeSeasonId]||activeSeasonId}}
 const active=state.anime.find(a=>a.id===detailId);if(active&&!active.seasons.some(s=>s.id===activeSeasonId)){const resume=window.ATResume123?.resolve(active,state.history,releasedCount);activeSeasonId=resume?.seasonId||active.seasons[0]?.id;episodePage=resume?.page||0}
 return result;
}
function persistLibraryRepair(){
 const before=state,priorDetail=detailId,priorSeason=activeSeasonId,priorPage=episodePage;const result=repairLibraryState();if(!result)return false;
 if(!save()){state=before;detailId=priorDetail;activeSeasonId=priorSeason;episodePage=priorPage;return false}return result;
}
function save(){const beforeRepair=state,priorDetail=detailId,priorSeason=activeSeasonId,priorPage=episodePage;try{repairLibraryState();const localSnapshot=accountLocalSnapshot(state),result=window.ATStorage1274.save(localStorage,KEY,localSnapshot,cloudRevision,accountMode==='cloud'&&!!accountUser,window.ATSync126);if(!result.ok){state=beforeRepair;detailId=priorDetail;activeSeasonId=priorSeason;episodePage=priorPage;if(accountMode==='cloud'){cloudMirrorUnavailable=true;cloudDirty=true;accountUI()}notify('Kopja lokale e rikuperimit nuk u ruajt. Eksporto kopje rezervë dhe provo përsëri.');return false}if(cloudMirrorUnavailable){cloudMirrorUnavailable=false;accountUI()}if(accountMode==='cloud'&&accountUser)accountQueueSave();return true}catch(e){state=beforeRepair;detailId=priorDetail;activeSeasonId=priorSeason;episodePage=priorPage;notify('Ruajtja dështoi. Eksporto kopje rezervë.');console.error(e);return false}}
function notify(message){const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>t.classList.remove('show'),2800)}
function cover(a,cls){const url=validPoster(a.cover);return `<div class="${cls}">${url?`<img src="${escapeHTML(url)}" alt="Posteri i ${escapeHTML(a.title)}" loading="lazy" decoding="async" fetchpriority="low" referrerpolicy="no-referrer" />`:''}</div>`}
function render(){if(view==='library'&&$('at113-library-search'))search=$('at113-library-search').value.trim().toLocaleLowerCase();const totals={all:state.anime.length};Object.keys(STATUS).forEach(s=>totals[s]=state.anime.filter(a=>a.status===s).length);totals.movies=state.anime.filter(isMovieAnime).length;totals.waiting=state.anime.filter(a=>!!futureSeasonOf(a)).length;totals.genres=genreCounts().length;document.querySelectorAll('[data-count]').forEach(el=>el.textContent=totals[el.dataset.count]||0);$('hero-add').textContent=totals.all?'+ Shto anime':'+ Shto animen e parë';$('stat-total').textContent=totals.all;$('favorite-count').textContent=state.anime.filter(a=>a.favorite).length;$('stat-watching').textContent=totals.watching;$('stat-completed').textContent=totals.completed;$('stat-episodes').textContent=state.anime.reduce((s,a)=>s+(isLiveMovie(a)?0:count(a)),0).toLocaleString('sq-AL');const weekAgo=Date.now()-7*86400000;$('stat-week').textContent='+'+activityEpisodes().filter(e=>e.at>=weekAgo).length+' gjatë 7 ditëve';document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter===filter));const looking=state.anime.filter(a=>a.status==='watching').sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,3);$('continue-section').classList.toggle('hidden',looking.length===0||filter!=='all'||!!search);window.ATHTML.renderHTML($('continue-grid'),looking.map(a=>`<article class="continue-card" data-status="${a.status}">${cover(a,'continue-cover')}<div class="continue-info"><strong title="${escapeHTML(a.title)}">${escapeHTML(a.title)}</strong><span class="meta">${count(a)}/${releasedTotal(a)} episode</span><div class="progress"><span class="${window.ATHTML.percentClass(percentage(a),'w')}"></span></div><div class="continue-bottom"><button class="ghost" data-detail="${escapeHTML(a.id)}">Detaje</button><button class="episode-pill" data-next="${escapeHTML(a.id)}" ${nextSeasonEp(a)?'':'disabled'}>+ Episodi ${nextEp(a)??'✓'}</button></div></div></article>`).join(''));const genrePanel=$('genre-controls');genrePanel.classList.toggle('hidden',filter!=='genres');if(filter==='genres'){window.ATHTML.renderHTML($('genre-chips'),`<button type="button" class="genre-chip ${selectedGenre==='all'?'active':''}" data-genre="all">Të gjitha <span>${state.anime.length}</span></button>`+genreCounts().map(g=>`<button type="button" class="genre-chip ${g.name.toLocaleLowerCase()===selectedGenre?'active':''}" data-genre="${escapeHTML(g.name.toLocaleLowerCase())}">${escapeHTML(g.name)} <span>${g.count}</span></button>`).join('')+`<button type="button" class="genre-chip ${selectedGenre==='__unknown'?'active':''}" data-genre="__unknown">Pa zhanër <span>${state.anime.filter(a=>!genresOf(a).length).length}</span></button>`);}let anime=state.anime.filter(a=>(filter==='all'||(filter==='favorites'?a.favorite:filter==='movies'?isMovieAnime(a):filter==='waiting'?!!futureSeasonOf(a):filter==='genres'?(selectedGenre==='all'||(selectedGenre==='__unknown'?!genresOf(a).length:genresOf(a).some(g=>g.toLocaleLowerCase()===selectedGenre))):a.status===filter))&&`${a.title} ${a.genre}`.toLocaleLowerCase().includes(search));if(sort==='year-new'||sort==='year-old')anime=window.ATLibraryYear125.sort(anime,sort);
  else anime.sort((a,b)=>sort==='title'?a.title.localeCompare(b.title):sort==='progress'?percentage(b)-percentage(a):sort==='rating'?(b.rating??-1)-(a.rating??-1):b.updatedAt.localeCompare(a.updatedAt));
  $('at125-sort-hint').hidden=sort!=='year-new'&&sort!=='year-old';$('library-title').textContent=filter==='all'?'Biblioteka ime':filter==='favorites'?'Të preferuarat':filter==='movies'?'Filma anime':filter==='waiting'?'Në pritje të sezonit të ri':filter==='genres'?'Sipas zhanrit':STATUS[filter];$('library-subtitle').textContent=filter==='movies'?`${anime.length} filma anime në bibliotekë`:filter==='waiting'?`${anime.length} anime të përfunduara me vazhdim të konfirmuar`:filter==='genres'?`${anime.length} anime · ${selectedGenre==='all'?'të gjitha zhanret':selectedGenre==='__unknown'?'pa zhanër':selectedGenre}`:`${anime.length} anime në këtë seksion`;window.ATHTML.renderHTML($('anime-grid'),anime.length?anime.map(a=>`<article class="anime-card" data-media="${mediaKind(a)}" data-status="${a.status}" data-release-year="${window.ATLibraryYear125.releaseYear(a)??''}"><button type="button" class="at120-card-poster" data-detail="${escapeHTML(a.id)}" aria-label="Hap ${escapeHTML(a.title)}">${cover(a,'poster')}</button><div class="status-badge">${STATUS[a.status]}</div>${a.favorite?'<div class="favorite-badge">♥</div>':''}${a.rating!=null?`<div class="score-badge">★ ${a.rating}/10</div>`:''}<div class="card-info"><div class="at125-card-year"><span class="at125-year-dot" aria-hidden="true"></span><span>${window.ATLibraryYear125.releaseYear(a)==null?'Viti i premierës nuk dihet':'Premiera · <b>'+window.ATLibraryYear125.releaseYear(a)+'</b>'}</span></div><button type="button" class="card-title at120-card-title" data-detail="${escapeHTML(a.id)}" title="${escapeHTML(a.title)}">${escapeHTML(a.title)} ›</button><div class="card-row"><span>${count(a)}/${releasedTotal(a)} ep.</span><div class="progress"><span class="${window.ATHTML.percentClass(percentage(a),'w')}"></span></div><span>${releasedTotal(a)?percentage(a)+'%':'—'}</span></div><div class="card-actions"><button class="ghost" data-detail="${escapeHTML(a.id)}">Shiko detajet</button><button class="plus" title="Shëno episodin tjetër" aria-label="Episodi tjetër i ${escapeHTML(a.title)}" data-next="${escapeHTML(a.id)}" ${nextSeasonEp(a)?'':'disabled'}>+1</button></div></div></article>`).join(''):`<div class="empty"><div class="symbol">✦</div><h3>${state.anime.length?'Nuk u gjet asnjë anime':'Biblioteka jote është bosh'}</h3><p>${state.anime.length?'Ndrysho filtrin ose kërkimin.':'Shto animen tënde të parë dhe fillo të regjistrosh episodet.'}</p><button class="primary" id="empty-add">+ Shto anime</button></div>`);let empty=$('empty-add');if(empty)empty.addEventListener('click',()=>openForm());window.ATUnified119?.render(state,{filter,search,sort,genre:selectedGenre,owner:accountUser?.id||'guest'}); }
function setFilter(f){filter=f;if(f!=='genres')selectedGenre='all';setView('library');render()}
const modalReturnFocus=new Map();
function showModal(id){
 const node=$(id);if(!node)return;
 modalReturnFocus.set(id,document.activeElement);node.classList.add('show');document.body.classList.add('at-modal-open');
 requestAnimationFrame(()=>{if(!node.classList.contains('show')||node.contains(document.activeElement))return;const dialog=node.querySelector('[role="dialog"]');if(dialog){dialog.tabIndex=-1;dialog.focus({preventScroll:true})}});
}
function closeModal(id){
 const node=$(id);if(!node)return;
 node.classList.remove('show');const another=document.querySelector('.modal-backdrop.show');
 if(!another)document.body.classList.remove('at-modal-open');
 const target=modalReturnFocus.get(id);modalReturnFocus.delete(id);
 if(!another&&target?.isConnected&&!target.closest('.modal-backdrop:not(.show)')&&!target.closest('[hidden]'))requestAnimationFrame(()=>{if(!document.querySelector('.modal-backdrop.show')&&target.isConnected)target.focus({preventScroll:true})});
 if(id==='detail-modal'){detailId=null;activeSeasonId=null;previewKey=null;pendingTVPreview=null;}
 if(id==='confirm-modal')pendingEpisode=null;if(id==='season-confirm-modal')pendingSeason=null;
}
function openForm(id=null){let a=id?state.anime.find(a=>a.id===id):null;$('anime-id').value=a?.id||'';$('anime-title').value=a?.title||'';$('anime-status').value=a?.status||'watching';$('anime-total').value=a?.total??12;$('anime-current').value=a?count(a):0;$('anime-total').readOnly=!!a&&a.seasons.length>1;$('anime-current').readOnly=!!a&&a.seasons.length>1;$('anime-rating').value=a?.rating??'';$('anime-year').value=a?.year??'';$('anime-genre').value=a?.genre||'';$('anime-cover').value=a?.cover||'';$('anime-notes').value=a?.notes||'';$('form-heading').textContent=a?'Ndrysho animen':'Shto anime';$('delete-btn').classList.toggle('hidden',!a);if(detailId)closeModal('detail-modal');showModal('form-modal');$('anime-title').focus()}
function saveForm(e){const transactionBefore=JSON.parse(JSON.stringify(state));e.preventDefault();const id=$('anime-id').value;let a=id?state.anime.find(x=>x.id===id):null;const title=$('anime-title').value.trim(),total=Number($('anime-total').value),current=Number($('anime-current').value);if(!title||!Number.isInteger(total)||total<0||total>10000||!Number.isInteger(current)||current<0||current>10000||(total>0&&current>total)){notify('Kontrollo titullin dhe episodet.');return}let status=$('anime-status').value;if(!STATUS[status])status='planning';let fields={title,status,rating:$('anime-rating').value===''?null:Number($('anime-rating').value),year:$('anime-year').value?Number($('anime-year').value):null,genre:$('anime-genre').value,cover:$('anime-cover').value,notes:$('anime-notes').value,updatedAt:now()};if(a){Object.assign(a,fields);if(a.seasons.length===1){a.seasons[0].total=total;let seen=tidyNums(a.seasons[0].watched,total);while(seen.length<current){let n=1;while(seen.includes(n))n++;seen.push(n)}if(seen.length>current)seen=seen.slice(0,current);a.seasons[0].watched=tidyNums(seen,total)}Object.assign(a,normalized(a))}else{a=normalized({...fields,id:uuid(),total,watched:Array.from({length:current},(_,i)=>i+1),createdAt:now()});state.anime.unshift(a)}if(a.total&&count(a)===a.total&&a.status==='watching')a.status='completed';if(!save()){state=transactionBefore;return false}closeModal('form-modal');render();renderHome();notify('Anime u ruajt me sukses ✓')}
function renderDetail(id){const a=state.anime.find(x=>x.id===id);if(!a){closeModal('detail-modal');return}detailId=id;let s=a.seasons.find(x=>x.id===activeSeasonId)||a.seasons[0];activeSeasonId=s.id;const shownTotal=releasedCount(s),pages=Math.max(1,Math.ceil(shownTotal/24));episodePage=Math.max(0,Math.min(episodePage,pages-1));const first=episodePage*24+1,last=Math.min(shownTotal,first+23),parts=visibleSeasons(a),partIndex=parts.indexOf(s),num=Math.max(1,parts.slice(0,partIndex+1).filter(x=>isSeriesFormat(x.format)).length),full=releasedCount(s)>0&&s.watched.length>=releasedCount(s);const titleMap=new Map(s.episodes.map(ep=>[ep.number,ep]));$('detail-heading').textContent=a.source==='TVMaze'?'Detajet e serialit':'Detajet e anime-s';window.ATHTML.renderHTML($('detail-body'),`<div class="detail-top">${cover(a,'detail-poster')}<div class="detail-content"><div class="eyebrow">${STATUS[a.status]} · ${a.source||'Regjistrim personal'}</div><h3>${escapeHTML(a.title)}</h3><div>${a.year?`<span class="pill">${a.year}</span>`:''}${a.genre?`<span class="pill">${escapeHTML(a.genre)}</span>`:''}${a.rating!=null?`<span class="pill">★ ${a.rating}/10</span>`:''}<span class="pill">${a.seasons.length} pjesë</span></div><div class="rating-deck"><label class="field">Statusi<select class="detail-select" data-status-select="${escapeHTML(id)}">${Object.entries(STATUS).map(([value,label])=>`<option value="${value}" ${a.status===value?'selected':''}>${label}</option>`).join('')}</select></label><label class="field">Vlerësimi im / 10<select class="detail-select" data-anime-rating="${escapeHTML(id)}">${ratingOptions(a.rating)}</select></label><div class="rating-chip"><small>Komuniteti · ${escapeHTML(a.communitySource||'Pa të dhëna')}</small><b>${a.communityScore!=null?'★ '+(a.communityScore/10).toFixed(1)+'/10':'—'}</b></div><div class="rating-chip imdb-chip"><small>IMDb · ${a.imdbCheckedAt?'Përditësuar '+escapeHTML(a.imdbCheckedAt.slice(0,10)):'Nuk është lidhur'}</small><b>${a.imdbRating!=null?'★ '+a.imdbRating.toFixed(1)+'/10':'—'}</b>${a.imdbVotes?`<small>${a.imdbVotes.toLocaleString('en-US')} vota</small>`:''}</div></div><div class="imdb-tools"><label class="field">IMDb ID (opsionale)<input type="text" data-imdb-id="${escapeHTML(id)}" placeholder="tt0388629" value="${escapeHTML(a.imdbId||'')}" autocomplete="off" aria-label="IMDb ID"></label><button class="ghost" data-imdb-fetch="${escapeHTML(id)}" type="button">↻ Merr notën IMDb</button><a target="_blank" rel="noopener noreferrer" href="${a.imdbId?'https://www.imdb.com/title/'+encodeURIComponent(a.imdbId)+'/':'https://www.imdb.com/find/?q='+encodeURIComponent(a.title)}">${a.imdbId?'Hap në IMDb ↗':'Gjej titullin në IMDb ↗'}</a><small>Nota IMDb merret vetëm kur ke lidhur çelësin OMDb. AniList mbetet i shënuar veçmas.</small></div><div class="detail-stats"><span><b>${count(a)}</b> / ${releasedTotal(a)||0} episode të transmetuara</span><span><b>${releasedTotal(a)?percentage(a)+'%':'—'}</b> progres</span></div><div class="progress"><span class="${window.ATHTML.percentClass(percentage(a),'w')}"></span></div><div class="detail-actions"><button class="primary" data-next="${escapeHTML(a.id)}">+ Episodi tjetër</button><button class="ghost" data-edit="${escapeHTML(a.id)}">✎ Ndrysho të dhënat</button><button class="ghost" data-favorite="${escapeHTML(a.id)}">${a.favorite?'♥ Hiq nga të preferuarat':'♡ Shto te të preferuarat'}</button><button class="ghost" data-pro-action="collection-pick" data-id="${escapeHTML(a.id)}">▤ Shto në listë</button><button class="danger" data-remove-anime="${escapeHTML(a.id)}">Hiqe nga biblioteka</button></div></div></div>${a.synopsis?`<div class="details-section"><h4>Përshkrimi</h4><p class="notes">${escapeHTML(a.synopsis)}</p>${a.sourceUrl?`<a class="catalog-link" href="${escapeHTML(a.sourceUrl)}" target="_blank" rel="noopener noreferrer">Shiko te ${escapeHTML(a.source||'katalogu')} ↗</a>`:''}</div>`:''}${a.notes?`<div class="details-section"><h4>Shënimet e mia</h4><p class="notes">${escapeHTML(a.notes)}</p></div>`:''}<div class="seasons-topline"><h4>Rendi kronologjik • ${a.seasons.length} pjesë</h4><div class="season-toolbar">${a.source==='TVMaze'?`<button class="primary" data-tv-sync="${escapeHTML(id)}">↻ Përditëso serinë</button>`:a.source?`<button class="primary" data-sync-seasons="${escapeHTML(id)}">↻ Përditëso serinë</button>`:''}<button class="ghost" data-add-season="${escapeHTML(id)}">+ Shto manualisht</button></div></div><div class="season-scroller">${a.seasons.map((x,i)=>`<button class="season-tab ${x.id===s.id?'active':''}" data-season="${escapeHTML(x.id)}" data-id="${escapeHTML(id)}" aria-pressed="${x.id===s.id}"><strong>${escapeHTML(x.title||'Sezoni '+(i+1))}</strong><small title="${escapeHTML(x.subtitle)}">${escapeHTML(x.subtitle||'Pjesa '+(i+1))}</small><small>${escapeHTML(formatLabel(x.format))}${x.releaseStart?' · '+escapeHTML(x.releaseStart):x.year?' · '+x.year:''}</small><div class="season-total">${x.watched.length}/${releasedCount(x)} episode ${releasedCount(x)>0&&x.watched.length>=releasedCount(x)?' ✓':''}${x.total>releasedCount(x)?` · ${x.total-releasedCount(x)} në pritje`:''}</div><small>★ Im: ${x.myRating??'—'} · ${x.imdbEpisodeAverage!=null?'IMDb ep. mes.: '+x.imdbEpisodeAverage.toFixed(1):x.communityScore!=null?(x.communityScore/10).toFixed(1)+' '+x.communitySource:'Komuniteti: —'}</small><div class="progress"><span class="${window.ATHTML.percentClass(releasedCount(x)?Math.round(x.watched.length/releasedCount(x)*100):0,'w')}"></span></div></button>`).join('')}</div><div class="season-banner"><div><strong>${escapeHTML(s.title)}</strong><p>${escapeHTML(s.subtitle||a.title)} · ${escapeHTML(formatLabel(s.format))}${s.releaseStart?' · '+escapeHTML(s.releaseStart):s.year?' · '+s.year:''} · ${s.watched.length}/${releasedCount(s)} episode të disponueshme</p></div><div class="season-ratings"><label class="field">Vlerësimi im për këtë pjesë<select class="detail-select" data-season-rating="${escapeHTML(s.id)}" data-id="${escapeHTML(id)}">${ratingOptions(s.myRating)}</select></label><span>Komuniteti · ${escapeHTML(s.communitySource||'pa vlerësim')}: <b>${s.communityScore!=null?'★ '+(s.communityScore/10).toFixed(1)+'/10':'—'}</b></span></div><div class="imdb-season-bar"><span>★ Mesatarja e episodeve IMDb: <b>${s.imdbEpisodeAverage!=null?s.imdbEpisodeAverage.toFixed(1)+'/10':'—'}</b> ${s.imdbEpisodeCount?'· '+s.imdbEpisodeCount+' episode me vlerësim':''}</span><div class="imdb-season-form"><label>IMDb ID e serialit<input data-imdb-season-id="${escapeHTML(s.id)}" value="${escapeHTML(s.imdbId||a.imdbId||'')}" placeholder="tt..." autocomplete="off"></label><label>Nr. sezonit IMDb<input data-imdb-season-number="${escapeHTML(s.id)}" type="number" min="1" max="200" value="${s.imdbSeasonNumber||num}"></label><button type="button" class="ghost" data-imdb-season-fetch="${escapeHTML(s.id)}" data-id="${escapeHTML(id)}">↻ Merr vlerësimet</button></div><small>Mesatare e llogaritur nga episodet me nota të disponueshme; jo notë zyrtare e vetme për sezonin. Kontrollo numrin e sezonit IMDb, i cili mund të ndryshojë nga renditja këtu.</small></div><div class="season-actions"><button class="primary" data-season-toggle="${escapeHTML(s.id)}" data-id="${escapeHTML(id)}" data-seen="1" ${!releasedCount(s)||(full&&!parts.slice(0,partIndex).some(x=>!releasedCount(x)||x.watched.length<releasedCount(x)))?'disabled':''}>${mediaFormat(s.format)==='MOVIE'?'✓ Shëno filmin si parë':'✓ Shëno gjithë sezonin'}</button><button class="ghost" data-season-toggle="${escapeHTML(s.id)}" data-id="${escapeHTML(id)}" data-seen="0" ${!s.watched.length?'disabled':''}>Hiq shënimet</button><button class="ghost" data-season-edit="${escapeHTML(s.id)}" data-id="${escapeHTML(id)}">✎ Ep.</button></div></div><div class="episode-jump"><label for="episode-jump-input">Shko direkt te episodi (numri i përgjithshëm)</label><input id="episode-jump-input" type="number" min="1" max="10000" inputmode="numeric" placeholder="p.sh. 1000"><button class="ghost" data-jump-episode="${escapeHTML(id)}">Shko →</button></div>${a.tvmazeLoaded?'<p class="season-note">Sezonet sipas viteve të transmetimit · Burimi: <a href="https://www.tvmaze.com/" target="_blank" rel="noopener noreferrer">TVmaze ↗</a></p>':''}<p class="season-info">Anime: pjesët vijnë vetëm nga lidhjet zyrtare të AniList. TV: franchise lidhet nga Wikidata dhe episodet/sezonet nga TVMaze. Filmat nuk numërohen si sezone; renditja është sipas publikimit.</p><div class="episode-list">${Array.from({length:last-first+1},(_,i)=>{const n=first+i,ep=titleMap.get(n),seen=s.watched.includes(n);return `<button class="ep-row ${seen?'watched':''}" data-ep="${n}" data-season-ep="${escapeHTML(s.id)}" data-id="${escapeHTML(id)}" aria-pressed="${seen}" aria-label="${escapeHTML(s.title)}, episodi ${n}, ${seen?'i parë':'i paparë'}"><span class="ep-num">${seen?'✓':'E'+String(n).padStart(2,'0')}</span><span class="ep-text"><strong>${escapeHTML(ep?.title||'Episodi '+n)}</strong><small>${ep?.aired?escapeHTML(ep.aired.slice(0,10))+' · ':''}${isSeriesFormat(s.format)?'S'+num+' E'+n:escapeHTML(s.title)+' · #'+n}${s.globalStart?' · #'+(s.globalStart+n-1):''}</small></span><span class="ep-check">${seen?'✓':'○'}</span></button>`}).join('')}</div><div class="episode-pages"><button data-page="prev" ${episodePage===0?'disabled':''}>← Më parë</button><span>Faqja ${episodePage+1}/${pages} · ${first}–${last} ${s.total?'nga '+s.total:''}</span><button data-page="next" ${episodePage>=pages-1?'disabled':''}>Më pas →</button></div>${!s.malId?'<p class="season-note">Titujt nuk janë të disponueshëm për këtë sezon; numrat dhe shënimet e episodeve funksionojnë normalisht. Mund të ndryshosh numrin e episodeve me ✎ Ep.</p>':''}${!s.total?'<p class="season-note">Numri total nuk dihet ende. Vendose manualisht për të shënuar gjithë sezonin.</p>':''}</div>`)}
function libraryEntry137(id){return state.anime.find(a=>a.id===id)||state.anime.find(a=>(a.mergedIds||[]).includes(id))}
function openDetail(id){id=libraryEntry137(id)?.id||id;previewKey=null;$('top-results').classList.add('hidden');const a=state.anime.find(x=>x.id===id);if(!a)return;const resume=window.ATResume123.resolve(a,state.history,releasedCount);activeSeasonId=resume?.seasonId||a.seasons[0]?.id||null;episodePage=resume?.page||0;renderDetail(id);showModal('detail-modal');if(a.source==='TVMaze'){if(a.franchiseVersion!==FRANCHISE_SCHEMA)void syncTVFranchise(id,true,true)}else if(isOnePiece(a)&&!a.tvmazeLoaded)void syncTVmaze(id,false,true);else if(a.source&&isFranchiseFormat(a.format)&&(!a.hydrated||a.franchiseVersion!==FRANCHISE_SCHEMA))void hydrateSeasons(id,true,true);const selected=a.seasons.find(x=>x.id===activeSeasonId);if(selected)void loadSeasonEpisodes(id,selected.id,episodePage)}
function deleteAnime(){const transactionBefore=JSON.parse(JSON.stringify(state));const id=$('anime-id').value;let a=state.anime.find(a=>a.id===id);if(!a)return;if(!confirm(`Ta fshijmë “${a.title}” dhe progresin e tij?`))return;state.anime=state.anime.filter(x=>x.id!==id);state.history=state.history.filter(h=>h.id!==id);if(!save()){state=transactionBefore;return false}closeModal('form-modal');render();renderHome();notify('Anime u fshi.')}
function exportData(){const blob=new Blob([JSON.stringify({...state,version:3,exportedAt:now()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='AnimeTrack-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Kopja rezervë u shkarkua ✓')}
async function importData(file){if(!file)return;try{const text=await file.text();if(text.length>8_000_000)throw Error('Skedari është tepër i madh.');const data=JSON.parse(text);if(!data||!Array.isArray(data.anime)||!Array.isArray(data.history))throw Error('Formati i kopjes rezervë nuk është i saktë.');if(!confirm('Importi do të zëvendësojë bibliotekën aktuale. Vazhdo?'))return;const transactionBefore=state;{const merged=window.ATTVUnified120.migrate(data.anime.map(normalized).filter(Boolean),normalizeTVShows(data.tvShows),normalized);state={anime:merged.anime,tvShows:[],history:data.history.filter(h=>h&&typeof h==='object'),preferences:normalizePreferences(data.preferences)};}if(!save()){state=transactionBefore;return}upcomingCheckedAt=0;catalogSyncAt=0;upcomingEntries=[];persistCache();filter='all';search='';$('search').value='';$('global-search').value='';clearCatalog();render();notify('Biblioteka u importua me sukses ✓')}catch(e){notify('Importi dështoi: '+e.message)}finally{$('import-file').value=''}}


/* 11.6 import: append-only, atomic local save. Cross-account data is never reused. */
function importExternal(rows){
 if(!Array.isArray(rows)||rows.length>3000)return {error:'Lista e importit është e pavlefshme.'};
 const original=state.anime.slice(),originalHistory=state.history.slice(),added=[];
 const seen=new Set();
 const keys=a=>[a.malId?'mal:'+a.malId:'',a.sourceId?a.source+':'+a.sourceId:'','title:'+String(a.title||'').toLocaleLowerCase().replace(/\s+/g,' ').trim()].filter(Boolean);
 for(const a of original)for(const key of keys(a))seen.add(key);
 try{
  for(const raw of rows){
   const title=String(raw.title||'').trim().slice(0,180),progress=Math.min(2000,Math.max(0,Math.floor(Number(raw.progress)||0))),total=Math.min(10000,Math.max(progress,Math.floor(Number(raw.total)||0)));
   if(!title)continue;
   const source=['AniList','MyAnimeList'].includes(raw.source)?raw.source:'',sourceId=/^\d{1,12}$/.test(String(raw.sourceId||''))?String(raw.sourceId):'',malId=/^\d{1,12}$/.test(String(raw.malId||''))?String(raw.malId):'';
   const entry=normalized({id:uuid(),title,status:STATUS[raw.status]?raw.status:'planning',source,sourceId,malId,total,watched:Array.from({length:progress},(_,i)=>i+1),rating:raw.rating,year:Number(raw.year)||null,genre:String(raw.genre||'').slice(0,240),cover:String(raw.cover||'').slice(0,1200),sourceUrl:String(raw.sourceUrl||'').slice(0,1200),communityScore:Number.isFinite(Number(raw.communityScore))?Math.max(0,Math.min(100,Number(raw.communityScore))):null,communitySource:source,format:raw.format||'TV',hydrated:false,createdAt:now(),updatedAt:now(),seasons:[{id:(source==='AniList'?'al-':source==='MyAnimeList'?'mal-':'manual-')+(sourceId||uuid()),title:'Sezoni 1',subtitle:title,total,watched:Array.from({length:progress},(_,i)=>i+1),year:Number(raw.year)||null,source,sourceId,malId,format:raw.format||'TV',airedCount:progress,airedCheckedAt:''}]});
   if(!entry)continue;
   if(keys(entry).some(key=>seen.has(key)))continue;
   for(const key of keys(entry))seen.add(key);added.push(entry);
  }
  if(!added.length)return {added:0};
  state.anime=[...added,...original];
  if(!save()){state.anime=original;state.history=originalHistory;return {error:'Ruajtja dështoi; biblioteka e mëparshme nuk u ndryshua.'}}
  render();renderHome();renderUpcoming();notify('U shtuan '+added.length+' anime nga skedari ✓');return {added:added.length};
 }catch(err){state.anime=original;state.history=originalHistory;return {error:String(err.message||err)}}
}

// Search across a live anime catalog. AniList is primary, Jikan (MAL) is fallback.
const API_QUERY=`query ($search:String!, $page:Int!) { Page(page:$page, perPage:12) { pageInfo { hasNextPage } media(search:$search, type:ANIME, sort:SEARCH_MATCH, isAdult:false) { id idMal title { romaji english native } synonyms coverImage { large } episodes seasonYear startDate { year month day } format averageScore description(asHtml:false) genres siteUrl } } }`;
let catalogItems=[],catalogQuery='',catalogPage=0,catalogProvider='',catalogHasNext=false,catalogBusy=false,catalogTimer=null,catalogRequest=0,catalogController=null;

// AniList PREQUEL/SEQUEL links build a series; Jikan provides episode titles.
const SEASON_QUERY=`query ($id:Int!) { Media(id:$id,type:ANIME) { id idMal averageScore episodes status format seasonYear description(asHtml:false) siteUrl startDate { year month day } nextAiringEpisode { episode airingAt } title { romaji english native } relations { edges { relationType node { id idMal averageScore type format episodes status seasonYear description(asHtml:false) siteUrl startDate { year month day } nextAiringEpisode { episode airingAt } title { romaji english } } } } } }`;
const hydrating=new Set(),episodesLoading=new Set();
function mediaSeason(m){const f=mediaFormat(m.format||'TV'),subtitle=m.title?.english||m.title?.romaji||'',aliases=[m.title?.romaji,m.title?.english,m.title?.native].filter(Boolean),releaseStart=mediaStartIso(m.startDate),total=Number(m.episodes)||((f==='MOVIE'||f==='SPECIAL')?1:0);return normSeason({id:'al-'+m.id,title:f==='MOVIE'?'Film':'Sezoni',subtitle,aliases,total,year:m.seasonYear||m.startDate?.year,source:'AniList',sourceId:String(m.id),malId:String(m.idMal||''),format:f,communityScore:m.averageScore,communitySource:'AniList',synopsis:m.description||'',sourceUrl:m.siteUrl||'',releaseStatus:m.status||'',releaseStart,nextAiringEpisode:m.nextAiringEpisode?.episode||0,nextAiringAt:m.nextAiringEpisode?.airingAt||0,airedCount:m.status==='FINISHED'?total:m.nextAiringEpisode?Math.max(0,m.nextAiringEpisode.episode-(Date.now()<m.nextAiringEpisode.airingAt*1000?1:0)):m.status==='NOT_YET_RELEASED'?0:null,airedCheckedAt:now(),episodes:f==='MOVIE'?[{number:1,title:subtitle||'Filmi',aired:releaseStart,airedAt:releaseStart}]:[]})}
async function anilistMedia(id){let r=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query:SEASON_QUERY,variables:{id:Number(id)}})});if(!r.ok)throw Error('AniList HTTP '+r.status);let j=await r.json();if(j.errors?.length||!j.data?.Media)throw Error(j.errors?.[0]?.message||'AniList metadata unavailable');return j.data.Media}
const MAL_LINK_QUERY=`query ($idMal:Int!) { Media(idMal:$idMal,type:ANIME) { id } }`;
async function anilistIdFromMal(idMal){const r=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query:MAL_LINK_QUERY,variables:{idMal:Number(idMal)}})});if(!r.ok)return null;const j=await r.json();return Number(j?.data?.Media?.id)||null}
async function anilistSeasons(seedId,format){
 if(!isFranchiseFormat(format))return [];
 const first=await anilistMedia(seedId),queue=[first],result=new Map(),visited=new Set();
 // 12.13: franchise membership is ID-first. Only official AniList relation edges may add a part.
 // Similar titles never auto-join a franchise.
 while(queue.length&&visited.size<90){
  const short=queue.shift();if(!short?.id||visited.has(short.id))continue;
  visited.add(short.id);
  let media;try{media=short.relations?short:await anilistMedia(short.id)}catch(err){if(!result.size)throw err;console.warn('One linked franchise entry was unavailable',err);continue}
  if(!isFranchiseFormat(media.format))continue;
  result.set(media.id,mediaSeason(media));
  for(const edge of media.relations?.edges||[]){
   const m=edge.node;
   if(!(window.ATFranchise1212?.mainRelation(edge.relationType)??['PREQUEL','SEQUEL'].includes(edge.relationType))||m?.type!=='ANIME'||!isFranchiseFormat(m.format)||visited.has(m.id))continue;
   if(!queue.some(x=>x.id===m.id))queue.push(m);
  }
 }
 return applyTimelineLabels(timelineSort([...result.values()]));
}
async function jikanGet(url){const r=await fetch(url);if(!r.ok)throw Error('MyAnimeList HTTP '+r.status);return r.json()}
async function jikanSeasons(seedId,format){
 if(!isFranchiseFormat(format))return [];
 const known=new Map(),queue=[String(seedId)];
 while(queue.length&&known.size<24){
  const id=queue.shift();if(known.has(id))continue;
  let full;try{full=(await jikanGet('https://api.jikan.moe/v4/anime/'+encodeURIComponent(id)+'/full')).data}catch(err){if(known.size)break;throw err}
  const f=mediaFormat(full?.type||'TV');if(!isFranchiseFormat(f))continue;
  const releaseStart=String(full.aired?.from||'').slice(0,10),total=Number(full.episodes)||((f==='MOVIE'||f==='SPECIAL')?1:0),subtitle=textOnly(full.title_english||full.title||''),aliases=[full.title,full.title_english,full.title_japanese,...(Array.isArray(full.title_synonyms)?full.title_synonyms:[])].filter(Boolean).map(textOnly);
  known.set(id,normSeason({id:'mal-'+id,title:f==='MOVIE'?'Film':'Sezoni',subtitle,aliases,total,year:full.year||full.aired?.prop?.from?.year,source:'MyAnimeList',sourceId:id,malId:id,format:f,communityScore:full.score==null?null:Math.round(full.score*10),communitySource:'MyAnimeList',synopsis:textOnly(full.synopsis||''),sourceUrl:full.url||'',releaseStatus:String(full.status||'').toUpperCase().replace(/\s+/g,'_'),releaseStart,airedCount:/finished/i.test(full.status||'')?total:/not yet/i.test(full.status||'')?0:null,airedCheckedAt:now(),episodes:f==='MOVIE'?[{number:1,title:subtitle||'Filmi',aired:releaseStart,airedAt:releaseStart}]:[]}));
  for(const rel of full.relations||[]){if(!['Prequel','Sequel','Alternative version','Summary','Parent story','Compilation'].includes(rel.relation))continue;for(const ep of rel.entry||[]){if(ep.type==='anime'&&!known.has(String(ep.mal_id))&&!queue.includes(String(ep.mal_id)))queue.push(String(ep.mal_id))}}
 }
 return applyTimelineLabels(timelineSort([...known.values()]));
}
async function hydrateSeasons(id,force=false,silent=false){
 const entry=state.anime.find(x=>x.id===id);
 if(!entry||!entry.source||hydrating.has(id)||(!force&&entry.hydrated))return entry?.id||null;
 if(String(entry.source||'').toLowerCase()==='tvmaze'){
  const ok=await syncTVFranchise(id,force,silent);
  return ok?id:null;
 }
 if(!['AniList','MyAnimeList'].includes(entry.source))return entry.id;
 hydrating.add(id);const owner=accountUser?.id||null;
 if(detailId===id&&!silent)notify('Po rindërtoj rendin kronologjik të serisë...');
 try{
  if(isOnePiece(entry)){const ok=await syncTVmaze(id,false,true);if(ok)return id}
  let remote;if(entry.source==='AniList')remote=await anilistSeasons(entry.sourceId,entry.format);else {const linked=await anilistIdFromMal(entry.malId||entry.sourceId);remote=linked?await anilistSeasons(linked,entry.format):await jikanSeasons(entry.sourceId,entry.format)}
  if(owner!==(accountUser?.id||null)||!state.anime.some(a=>a.id===id))return null;
  if(!remote.length)return id;
  const transactionBefore=JSON.parse(JSON.stringify(state));
  let keeper=reconcileSeriesLibrary(entry,remote);
  repairLocalAnimeDuplicates();
  repairProviderDuplicates(true);
  keeper=state.anime.find(x=>x.id===keeper?.id)||state.anime.find(x=>seriesIdentitySet(x).has('al:'+String(entry.sourceId)))||keeper;
  if(!save()){state=transactionBefore;return id}keeper=state.anime.find(x=>x.id===keeper.id)||state.anime.find(x=>(x.mergedIds||[]).includes(keeper.id))||keeper;render();renderHome();renderCatalog();if(typeof v8RenderSeasonal==='function')v8RenderSeasonal();
  if(detailId===keeper.id){const resume=window.ATResume123.resolve(keeper,state.history,releasedCount);if(!keeper.seasons.some(s=>s.id===activeSeasonId)){activeSeasonId=resume?.seasonId||keeper.seasons[0]?.id;episodePage=resume?.page||0}renderDetail(keeper.id);const selected=keeper.seasons.find(s=>s.id===activeSeasonId)||keeper.seasons[0];if(selected)loadSeasonEpisodes(keeper.id,selected.id,episodePage)}
  if(force&&!silent)notify('Seria u përditësua në rend kronologjik ✓');
  return keeper.id;
 }catch(err){console.warn('Season grouping failed; existing library preserved',err);if(detailId===id&&!silent)notify('S’u verifikuan lidhjet e serisë. Provo përsëri “Përditëso serinë”.');return id}
 finally{hydrating.delete(id)}
}
// A transient upstream error or incomplete record may be retried without stressing Jikan.
const fillerPageRetryUntil=new Map();
async function loadSeasonEpisodes(id,seasonId,uiPage=0,force=false){
 const a=state.anime.find(x=>x.id===id),s=a?.seasons.find(x=>x.id===seasonId);
 if(!s||mediaFormat(s.format)==='MOVIE'||!window.ATFiller1210.validId(s.malId))return;
 const owner=accountUser?.id||null,storageKey=KEY,shared=window.ATFiller1210.sharedCatalog(a,s),pages=window.ATFiller1210.pages(s,uiPage,shared);
 let changed=false;const before=JSON.stringify(s);
 for(const metadataPage of pages){
  const key=storageKey+':'+id+':'+seasonId+':'+metadataPage;
  if(episodesLoading.has(key)||(!force&&(fillerPageRetryUntil.get(key)||0)>Date.now()))continue;
  if(!force&&s.fillerPagesChecked?.includes(metadataPage)&&window.ATFiller1210.storedPageVerified(s,metadataPage,shared))continue;
  episodesLoading.add(key);
  try{
   const j=await jikanGet('https://api.jikan.moe/v4/anime/'+encodeURIComponent(s.malId)+'/episodes?page='+metadataPage);
   if(owner!==(accountUser?.id||null)||storageKey!==KEY||!state.anime.some(x=>x===a)||!a.seasons.includes(s))return;
   if(!Array.isArray(j.data)||!j.data.length)throw Error('Lista e episodeve është bosh ose e paplotë');
   changed=window.ATFiller1210.merge(s,j.data,shared,now())||changed;
   s.loadedPages=[...new Set([...(s.loadedPages||[]),metadataPage])];
   // Only complete source flags can close a page. Old 12.10 partial pages are reopened.
   const verified=window.ATFiller1210.pageVerified(j.data)&&window.ATFiller1210.storedPageVerified(s,metadataPage,shared);
   const priorChecked=JSON.stringify(s.fillerPagesChecked||[]);
   s.fillerPagesChecked=verified?[...new Set([...(s.fillerPagesChecked||[]),metadataPage])]:(s.fillerPagesChecked||[]).filter(p=>p!==metadataPage);
   if(priorChecked!==JSON.stringify(s.fillerPagesChecked))changed=true;
   if(verified)fillerPageRetryUntil.delete(key);
   else fillerPageRetryUntil.set(key,Date.now()+6*60*60*1000);
   s.epPage=Math.max(s.epPage,metadataPage);
   s.hasMore=!!j.pagination?.has_next_page;changed=true;
   if(!s.total&&!s.hasMore&&s.episodes.length)s.total=Math.max(...s.episodes.map(e=>e.number));
  }catch(err){fillerPageRetryUntil.set(key,Date.now()+30*60*1000);console.warn('Jikan episode labels unavailable',err);if(force&&detailId===id)notify('Etiketat Filler nuk u përditësuan. Provo përsëri; shënimet nuk ndryshojnë.')}
  finally{episodesLoading.delete(key)}
 }
 if(changed){
  if(!save()){Object.assign(s,JSON.parse(before));return}
  if(detailId===id&&activeSeasonId===seasonId)renderDetail(id);
 }
}

function textOnly(html){return window.ATSecurity136?.text(html,1800)||String(html||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,1800)}
function canonicalTitle(s){return String(s||'').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()}

function seriesRootTitle(title){
 const normalizedTitle=canonicalTitle(title);
 const suffix=/(?:\s+(?:\d+(?:st|nd|rd|th)\s+season|season\s+\d+|s\d+|part\s+\d+|cour\s+\d+))+$/i;
 return normalizedTitle.replace(suffix,'').trim();
}
function seriesHasSeasonSuffix(title){return seriesRootTitle(title)!==canonicalTitle(title)}
function isSeriesFormat(format){return ['TV','TV_SHORT','ONA','TV_SERIES'].includes(mediaFormat(format))}
function isFranchiseFormat(format){return window.ATFranchise1212?.supportedAnimePart(format)??['TV','TV_SHORT','ONA','OVA','MOVIE','SPECIAL'].includes(mediaFormat(format))}
function seasonNumberFor(a,s){if(!a||!s)return 0;const parts=visibleSeasons(a),idx=parts.indexOf(s);if(idx<0)return 0;return parts.slice(0,idx+1).filter(x=>isSeriesFormat(x.format)).length}
function partProgressLabel(a,s,n){const f=mediaFormat(s?.format);if(f==='MOVIE')return `${s.title||'Film'} · #${n}`;const sn=seasonNumberFor(a,s);return sn?`S${sn} E${n}`:`${s?.title||'Pjesa'} · #${n}`}
function timelineSort(seasons){return window.ATFranchise1212?.sortParts(seasons)||seasons.slice().sort((a,b)=>String(a.releaseStart||a.year||'9999').localeCompare(String(b.releaseStart||b.year||'9999')))}
function applyTimelineLabels(seasons){const labeled=window.ATFranchise1212?.labels(seasons);if(labeled){for(const row of labeled)if(!String(row.part.id||'').startsWith('manual-'))row.part.title=row.title;return labeled.map(x=>x.part)}let n=0;return seasons.map(s=>{if(!String(s.id||'').startsWith('manual-'))s.title=mediaFormat(s.format)==='MOVIE'?'Film':'Sezoni '+(++n);return s})}
function formatLabel(format){const f=mediaFormat(format);return f==='MOVIE'?'FILM':f==='OVA'?'OVA':f==='SPECIAL'?'SPECIAL':f==='ONA'?'ONA':f==='TV_SHORT'?'TV SHORT':'TV'}
function sameSeriesSeason(a,b){
 if(!a||!b)return false;
 const xMal=String(a.malId||''),yMal=String(b.malId||'');
 if(xMal&&yMal&&xMal===yMal)return true;
 const xId=String(a.sourceId||''),yId=String(b.sourceId||'');
 return !!(xId&&yId&&a.source===b.source&&xId===yId);
}
function franchiseTitleKeys(values){const helper=window.ATFranchise1212?.familyTitleKeys;if(helper)return helper(values);return [...new Set((Array.isArray(values)?values:[values]).map(seriesRootTitle).filter(x=>x.length>=4))]}
function seriesIdentitySet(anime){const ids=new Set(),add=(source,id,mal)=>{const sid=String(id||'');const mid=String(mal||'');if(mid)ids.add('mal:'+mid);if(source==='AniList'&&sid)ids.add('al:'+sid);if(source==='MyAnimeList'&&sid)ids.add('mal:'+sid)};if(!anime)return ids;add(anime.source,anime.sourceId,anime.malId);for(const s of anime.seasons||[])add(s.source,s.sourceId,s.malId);return ids}
function strictSeriesOverlap(a,b){const left=seriesIdentitySet(a),right=seriesIdentitySet(b);for(const id of left)if(right.has(id))return true;return false}
function linkedToSeries(anime,remote,reference){
 if(!anime||!isFranchiseFormat(anime.format)||!anime.source)return false;
 if(window.ATProviderBridge12124?.isTVMaze?.(anime))return false;
 return remote.some(s=>sameSeriesSeason(anime,s)||(anime.seasons||[]).some(old=>sameSeriesSeason(old,s)));
}
function catalogGrouped(items){
 const groups=new Map();
 for(const item of items){
  const root=seriesRootTitle(item.title);
  const key=item.kind==='tv'?'tv:'+item.key:isSeriesFormat(item.format)&&root.length>=12?'series:'+root:'item:'+item.key;
  const old=groups.get(key);
  if(!old||(!seriesHasSeasonSuffix(item.title)&&seriesHasSeasonSuffix(old.title))||(seriesHasSeasonSuffix(item.title)===seriesHasSeasonSuffix(old.title)&&(item.year||9999)<(old.year||9999)))groups.set(key,item);
 }
 return [...groups.values()];
}
function mergeSeasonMetadata(old,updated){
 window.ATLibraryIdentity137?.mergePart(old,updated);
 old.total=Math.max(Number(old.total)||0,Number(updated.total)||0,...(old.watched||[]),...(updated.watched||[]));
 old.watched=tidyNums([...(old.watched||[]),...(updated.watched||[])],old.total);
 const episodeMap=new Map((old.episodes||[]).map(e=>[Number(e.number),e]));
 for(const ep of updated.episodes||[]){const prior=episodeMap.get(Number(ep.number));if(!prior){episodeMap.set(Number(ep.number),ep);continue}for(const [k,v] of Object.entries(ep))if((prior[k]==null||prior[k]===''||prior[k]===0||prior[k]===false)&&v!=null&&v!==''&&v!==0)prior[k]=v}
 old.episodes=[...episodeMap.values()].sort((a,b)=>a.number-b.number);
 old.loadedPages=[...new Set([...(old.loadedPages||[]),...(updated.loadedPages||[])])];
 old.aliases=[...new Set([...(old.aliases||[]),...(updated.aliases||[])])].slice(0,12);
 for(const key of ['subtitle','year','source','sourceId','malId','format','communityScore','communitySource','releaseStatus','releaseStart','nextAiringAt','nextAiringEpisode','airedCount','airedCheckedAt','discoveredAt','imdbId','imdbSeasonNumber','imdbEpisodeAverage','imdbEpisodeCount','imdbCheckedAt','synopsis','sourceUrl']){
  if((old[key]==null||old[key]===''||old[key]===0)&&updated[key]!=null&&updated[key]!==''&&updated[key]!==0)old[key]=updated[key];
 }
 if(updated.releaseStatus)old.releaseStatus=updated.releaseStatus;
 if(updated.airedCount!=null)old.airedCount=Math.max(Number(old.airedCount)||0,Number(updated.airedCount)||0);
 if(updated.nextAiringAt){old.nextAiringAt=updated.nextAiringAt;old.nextAiringEpisode=updated.nextAiringEpisode}
 return old;
}
// Passive metadata refresh must never delete other library cards. Explicit "Bashko"
// remains the only pathway that reconciles separate records.
function hydrateSingleCard(reference,remote){
 if(!reference||!Array.isArray(remote)||!remote.length)return reference;
 const seasons=(reference.seasons||[]).map((s,i)=>normSeason(s,i));
 const ids=new Set(seasons.map(s=>s.id));
 for(const update of remote){
  const prior=seasons.find(s=>sameSeriesSeason(s,update));
  if(prior){mergeSeasonMetadata(prior,update);continue}
  const fresh=normSeason(update,seasons.length);
  if(ids.has(fresh.id))fresh.id='manual-'+uuid();
  ids.add(fresh.id);seasons.push(fresh);
 }
 reference.seasons=applyTimelineLabels(timelineSort(seasons));
 seasons.length=0;seasons.push(...reference.seasons);
 reference.seasons=seasons;reference.hydrated=true;reference.franchiseVersion=FRANCHISE_SCHEMA;reference.updatedAt=now();syncTotals(reference);
 return reference;
}
function reconcileSeriesLibrary(reference,remote){
 if(!reference||!Array.isArray(remote)||!remote.length)return reference;
 const matched=state.anime.filter(a=>linkedToSeries(a,remote,reference));
 if(!matched.some(a=>a.id===reference.id))matched.push(reference);
 let expanded=true;while(expanded){expanded=false;for(const candidate of state.anime){if(matched.includes(candidate))continue;if(matched.some(row=>strictSeriesOverlap(candidate,row))){matched.push(candidate);expanded=true}}}
 const root=seriesRootTitle(reference.title);
 const keeper=matched.find(a=>seriesRootTitle(a.title)===root&&!seriesHasSeasonSuffix(a.title))||matched.slice().sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')))[0];
 keeper.mergedIds=[...new Set([...(keeper.mergedIds||[]),...matched.flatMap(a=>[...(a.mergedIds||[]),a.id])])].filter(x=>x!==keeper.id);
 keeper.providerIds=[...new Set(matched.flatMap(a=>window.ATLibraryIdentity137?.providerIds(a)||[]))];
 keeper.aliases=[...new Set(matched.flatMap(a=>[a.title,...(a.aliases||[])]))];
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
  for(const r of a.rewatches||[])for(const ep of r.episodes||[])ep.seasonId=seasonMap.get(ep.seasonId)||ep.seasonId;
  remap.set(a.id,seasonMap);
  if(a!==keeper){
   keeper.rewatches=[...(keeper.rewatches||[]),...(a.rewatches||[]).filter(r=>!(keeper.rewatches||[]).some(x=>x.id===r.id))];
   if(!keeper.activeRewatchId)keeper.activeRewatchId=a.activeRewatchId||'';
   keeper.favorite=keeper.favorite||a.favorite;
   if(keeper.rating==null&&a.rating!=null)keeper.rating=a.rating;
   if(!keeper.cover&&a.cover)keeper.cover=a.cover;
   if(!keeper.synopsis&&a.synopsis)keeper.synopsis=a.synopsis;
   if(a.notes&&keeper.notes!==a.notes)keeper.notes=(keeper.notes?keeper.notes+'\n\n'+a.notes:a.notes).slice(0,2500);
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
 const orderedSeasons=applyTimelineLabels(timelineSort(allSeasons));
 allSeasons.length=0;allSeasons.push(...orderedSeasons);
 keeper.seasons=allSeasons;keeper.hydrated=true;keeper.franchiseVersion=FRANCHISE_SCHEMA;
 if(seriesHasSeasonSuffix(keeper.title)){
  const main=matched.find(a=>!seriesHasSeasonSuffix(a.title));
  if(main)keeper.title=main.title;
  else keeper.title=String(reference.title||keeper.title).replace(/(?:\s+(?:\d+(?:st|nd|rd|th)\s+season|season\s+\d+|s\d+|part\s+\d+|cour\s+\d+))+$/i,'').trim()||keeper.title;
 }
 const first=remote[0];if(first?.year&&(!keeper.year||first.year<keeper.year))keeper.year=first.year;
 const primary=remote.find(x=>isSeriesFormat(x.format))||first;
 if(primary?.source&&primary?.sourceId){keeper.source=primary.source;keeper.sourceId=primary.sourceId;keeper.malId=primary.malId||keeper.malId;keeper.format=mediaFormat(primary.format)}
 keeper.updatedAt=now();
 const removed=new Set(matched.filter(a=>a!==keeper).map(a=>a.id));
 for(const event of state.history||[]){
  const map=remap.get(event.id);if(!map)continue;
  event.seasonId=map.get(event.seasonId)||event.seasonId;
  if(removed.has(event.id))event.id=keeper.id;
 }
 state.anime=state.anime.filter(a=>!removed.has(a.id));for(const list of state.preferences?.customLists||[])list.animeIds=[...new Set((list.animeIds||[]).map(id=>removed.has(id)?keeper.id:id))];syncTotals(keeper);
 if(removed.has(detailId)){const map=remap.get(detailId);activeSeasonId=map?.get(activeSeasonId)||activeSeasonId;detailId=keeper.id}
 return keeper;
}

function repairProviderDuplicates(quiet=true){
 const bridge=window.ATProviderBridge12124;if(!bridge?.repair)return {changed:false,removed:[],bridged:[]};
 const result=bridge.repair(state.anime,state.history);if(!result.changed)return result;
 state.anime=result.library;state.history=result.history;
 for(const a of state.anime)syncTotals(a);
 const moved=result.bridged.find(x=>x.from===detailId);if(moved){detailId=moved.to;const a=state.anime.find(x=>x.id===detailId);const resume=a?window.ATResume123.resolve(a,state.history,releasedCount):null;activeSeasonId=resume?.seasonId||a?.seasons?.[0]?.id||null;episodePage=resume?.page||0}
 if(!quiet)notify(result.removed.length+' karta nga burime të ndryshme u bashkuan në franchise-n e saktë ✓');
 return result;
}

function repairLocalAnimeDuplicates(){
 let changed=false,guard=0;
 while(guard++<80){
  const list=state.anime.filter(a=>!window.ATProviderBridge12124?.isTVMaze?.(a));let pair=null;
  outer:for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++)if(strictSeriesOverlap(list[i],list[j])){pair=[list[i],list[j]];break outer}
  if(!pair)break;
  const canonical=pair.flatMap(a=>(a.seasons||[]).filter(x=>['AniList','MyAnimeList'].includes(x.source)));
  const ordered=timelineSort(canonical),firstTV=ordered.find(x=>isSeriesFormat(x.format));
  const reference=pair.find(a=>firstTV&&((a.source===firstTV.source&&String(a.sourceId)===String(firstTV.sourceId))||(a.malId&&firstTV.malId&&String(a.malId)===String(firstTV.malId))))||pair.find(a=>isSeriesFormat(a.format))||pair[0];
  const remote=canonical.length?canonical:pair.flatMap(a=>a.seasons||[]);
  const before=state.anime.length;reconcileSeriesLibrary(reference,remote);if(state.anime.length===before)break;changed=true;
 }
 for(const a of state.anime){if(window.ATProviderBridge12124?.isTVMaze?.(a))continue;const ordered=applyTimelineLabels(timelineSort(a.seasons||[]));if(JSON.stringify(ordered.map(x=>[x.id,x.title]))!==JSON.stringify((a.seasons||[]).map(x=>[x.id,x.title])))changed=true;a.seasons=ordered;const firstTV=ordered.find(x=>isSeriesFormat(x.format)&&['AniList','MyAnimeList'].includes(x.source));if(firstTV&&mediaFormat(a.format)==='MOVIE'){a.title=firstTV.subtitle||a.title;a.source=firstTV.source;a.sourceId=firstTV.sourceId;a.malId=firstTV.malId||a.malId;a.format=firstTV.format;changed=true}syncTotals(a)}
 return {changed};
}

function inLibrary(item){if(item.kind==='tv'){const bound=state.anime.find(a=>(a.providerIds||[]).includes('tvmaze:'+String(item.sourceId)));if(bound)return bound;const exact=state.anime.find(a=>a.source==='TVMaze'&&(a.sourceId===String(item.sourceId)||a.seasons.some(s=>s.sourceId===String(item.sourceId))));if(exact)return exact;const bridge=window.ATProviderBridge12124;return bridge?.searchEquivalent?state.anime.find(a=>!bridge.isTVMaze(a)&&bridge.searchEquivalent(a,item)):null}if(item.kind==='movie')return state.anime.find(a=>isLiveMovie(a)&&((item.tmdbId&&a.tmdbId===String(item.tmdbId))||(item.imdbId&&a.imdbId===String(item.imdbId))||(a.source===item.source&&a.sourceId===String(item.sourceId))));return state.anime.find(a=>a.seasons.some(s=>(s.source===item.source&&s.sourceId===String(item.sourceId))||(item.malId&&s.malId===String(item.malId)))||(a.source===item.source&&a.sourceId===String(item.sourceId))||(item.malId&&a.malId===String(item.malId)))}
function mapAniList(a){const aliases=[a.title?.romaji,a.title?.english,a.title?.native,...(a.synonyms||[])].filter(Boolean);return {malId:String(a.idMal||''),key:'al-'+a.id,source:'AniList',sourceId:String(a.id),title:a.title?.romaji||a.title?.english||a.title?.native||'Pa titull',english:a.title?.english||'',aliases:[...new Set(aliases)].slice(0,20),total:a.episodes||0,year:a.seasonYear||a.startDate?.year||null,releaseStart:mediaStartIso(a.startDate),genre:(a.genres||[]).join(', '),genres:Array.isArray(a.genres)?a.genres.slice(0,20):[],cover:a.coverImage?.large||'',synopsis:textOnly(a.description),score:a.averageScore,format:mediaFormat(a.format||'ANIME'),sourceUrl:a.siteUrl||''}}
function mapJikan(a){const aliases=[a.title,a.title_english,a.title_japanese,...(a.title_synonyms||[]),...(a.titles||[]).map(x=>x?.title)].filter(Boolean),genres=(a.genres||[]).map(g=>g.name).filter(Boolean);return {malId:String(a.mal_id||''),key:'mal-'+a.mal_id,source:'MyAnimeList',sourceId:String(a.mal_id),title:a.title||a.title_english||'Pa titull',english:a.title_english||'',aliases:[...new Set(aliases)].slice(0,20),total:a.episodes||0,year:a.year||a.aired?.prop?.from?.year||null,releaseStart:String(a.aired?.from||'').slice(0,10),genre:genres.join(', '),genres,cover:a.images?.jpg?.large_image_url||a.images?.jpg?.image_url||'',synopsis:textOnly(a.synopsis),score:a.score?Math.round(a.score*10):null,format:mediaFormat(a.type||'ANIME'),sourceUrl:a.url||''}}
async function fetchAniList(q,page,signal){const response=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query:API_QUERY,variables:{search:q,page}}),signal});if(!response.ok)throw Error('AniList: HTTP '+response.status);const json=await response.json();if(json.errors?.length)throw Error(json.errors[0].message||'AniList error');const data=json.data?.Page;if(!data)throw Error('Përgjigje e paplotë');return {items:(data.media||[]).map(mapAniList),hasNext:!!data.pageInfo?.hasNextPage,provider:'AniList'}}
async function fetchJikan(q,page,signal){const url='https://api.jikan.moe/v4/anime?'+new URLSearchParams({q,page:String(page),limit:'12',sfw:'true'});const response=await fetch(url,{signal});if(!response.ok)throw Error('MyAnimeList: HTTP '+response.status);const json=await response.json();return {items:(json.data||[]).map(mapJikan),hasNext:!!json.pagination?.has_next_page,provider:'MyAnimeList'}}
function clearCatalog(){catalogRequest++;clearTimeout(catalogTimer);catalogController?.abort();catalogController=null;catalogItems=[];catalogQuery='';catalogPage=0;catalogProvider='';catalogHasNext=false;catalogBusy=false;window.ATHTML.renderHTML($('catalog-grid'),'');$('catalog-more').classList.add('hidden');$('catalog-state').textContent='Shkruaj të paktën 2 shkronja për të kërkuar në katalog.';renderTopResults()}
function catalogTile(item){if(item.kind==='tv'){const existing=inLibrary(item),url=validPoster(item.cover),id=escapeHTML(item.sourceId);return `<article class="catalog-card at120-tv-result"><button class="catalog-open" type="button" data-tv-search-preview="${id}" aria-label="Hap ${escapeHTML(item.title)}"><div class="catalog-art">${url?`<img src="${escapeHTML(url)}" alt="Posteri i ${escapeHTML(item.title)}" loading="lazy" referrerpolicy="no-referrer">`:''}<span class="catalog-type">SERIAL TV</span></div></button><div class="catalog-info"><h4><button type="button" class="catalog-title-open" data-tv-search-preview="${id}">${escapeHTML(item.title)} ›</button></h4><div class="catalog-english">${escapeHTML(item.genre||'Serial TV')}</div><div class="catalog-meta">${item.year||'Viti ?'} · ${escapeHTML(item.source)}</div><p class="catalog-synopsis">${escapeHTML(item.synopsis||'Hap serialin për të parë sezonet dhe episodet.')}</p><div class="catalog-action"><button type="button" class="primary" data-tv-search-preview="${id}">${existing?'✓ Në bibliotekë · Hape':'Shiko sezonet & episodet ›'}</button></div></div></article>`}const existing=inLibrary(item),url=validPoster(item.cover),sourceUrl=validPoster(item.sourceUrl),id=escapeHTML(item.key),synopsis=item.synopsis||'Përshkrimi nuk është i disponueshëm për këtë anime.';return `<article class="catalog-card"><button class="catalog-open" data-preview="${id}" aria-label="Hap ${escapeHTML(item.title)}"><div class="catalog-art">${url?`<img src="${escapeHTML(url)}" alt="Posteri i ${escapeHTML(item.title)}" loading="lazy" referrerpolicy="no-referrer"/>`:''}<span class="catalog-type">${escapeHTML(item.format)}</span>${item.score!=null?`<span class="catalog-score">★ ${(Number(item.score)/10).toFixed(1)}</span>`:''}</div></button><div class="catalog-info"><h4><button class="catalog-title-open" data-preview="${id}">${escapeHTML(item.title)}</button></h4><div class="catalog-english" title="${escapeHTML(item.english)}">${escapeHTML(item.english&&item.english!==item.title?item.english:' ')}</div><div class="catalog-meta">${item.year||'Viti ?'} • ${item.total||'?'} ep. • ${escapeHTML(item.source)}</div><p class="catalog-synopsis">${escapeHTML(synopsis)}</p><div class="catalog-action">${existing?`<button class="ghost in-library" data-detail="${escapeHTML(existing.id)}">✓ Në bibliotekë · Hape</button>`:`<button class="primary" data-catalog-add="${id}" data-catalog-status="watching">+ Po shikoj</button><button class="ghost" data-catalog-add="${id}" data-catalog-status="planning">+ Në listë</button>`}</div>${sourceUrl?`<a class="catalog-link" href="${escapeHTML(sourceUrl)}" target="_blank" rel="noopener noreferrer">Detaje te ${escapeHTML(item.source)} ↗</a>`:''}</div></article>`}
function renderCatalog(){const grid=$('catalog-grid');window.ATHTML.renderHTML(grid,catalogItems.length?catalogGrouped(catalogItems).map(catalogTile).join(''):(catalogQuery&&!catalogBusy?'<div class="catalog-empty">Nuk u gjet asnjë rezultat. Provo titullin anglisht ose japonisht.</div>':''));$('catalog-more').classList.toggle('hidden',!catalogHasNext||catalogBusy);renderTopResults()}
async function fetchTVmazeCatalog(q,signal){const res=await fetch('https://api.tvmaze.com/search/shows?q='+encodeURIComponent(q),{signal});if(!res.ok)throw Error('TVMaze HTTP '+res.status);const rows=await res.json();return (Array.isArray(rows)?rows:[]).slice(0,16).map(x=>x.show).filter(x=>x&&Number.isInteger(x.id)).map(x=>({kind:'tv',key:'tv-'+x.id,source:'TVMaze',sourceId:x.id,title:String(x.name||'Serial TV'),cover:x.image?.medium||x.image?.original||'',year:Number(String(x.premiered||'').slice(0,4))||null,releaseStart:String(x.premiered||'').slice(0,10),genre:(x.genres||[]).join(', '),genres:Array.isArray(x.genres)?x.genres.slice(0,20):[],synopsis:String(x.summary||'').replace(/<[^>]*>/g,' ').slice(0,350),format:'TV_SERIES'}))}
async function searchCatalog(q,page=1){
 if(catalogBusy&&page>1)return;
 const token=++catalogRequest;catalogController?.abort();const controller=new AbortController();catalogController=controller;
 catalogBusy=true;catalogQuery=q;catalogPage=page;
 if(page===1){catalogItems=[];catalogProvider='';window.ATHTML.renderHTML($('catalog-grid'),'')}
 $('catalog-state').textContent=page===1?'Po kërkohen anime dhe seriale TV…':'Po ngarkohen rezultate të tjera…';
 $('catalog-more').classList.add('hidden');
 const animeWork=(async()=>{if(catalogProvider==='MyAnimeList'&&page>1)return fetchJikan(q,page,controller.signal);try{return await fetchAniList(q,page,controller.signal)}catch(err){if(controller.signal.aborted)throw err;return fetchJikan(q,page,controller.signal)}})();
 const tvWork=page===1?fetchTVmazeCatalog(q,controller.signal):Promise.resolve([]);
 const [animeResult,tvResult]=await Promise.allSettled([animeWork,tvWork]);
 if(token!==catalogRequest||controller.signal.aborted)return;
 const animeOK=animeResult.status==='fulfilled',tvOK=tvResult.status==='fulfilled';
 if(animeOK){catalogProvider=animeResult.value.provider;catalogHasNext=animeResult.value.hasNext}else catalogHasNext=false;
 const incoming=[...(animeOK?animeResult.value.items:[]),...(tvOK?tvResult.value:[])];
 const combined=[...catalogItems,...incoming],dedupe=window.ATProviderBridge12124?.dedupeSearchResults;
 const providerSafe=dedupe?dedupe(combined):combined,prior=new Set();catalogItems=[];
 for(const item of providerSafe)if(!prior.has(item.key)){catalogItems.push(item);prior.add(item.key)}
 catalogBusy=false;
 if(!animeOK&&!tvOK){$('catalog-state').textContent='Kërkimi online nuk u lidh. Provo përsëri.';renderCatalog();return}
 const sources=[animeOK?catalogProvider:null,tvOK?'TVMaze':null].filter(Boolean).join(' + ');
 $('catalog-state').textContent=catalogItems.length+' rezultate për “'+q+'” · Anime & Seriale TV · '+sources+(catalogHasNext?' · Shfaq më shumë':'');
 renderCatalog();
}
let pendingTVPreview=null,openingTVPreview=false;
async function openUnifiedTV(id){
 const n=Number(id);if(!Number.isInteger(n)||n<1||openingTVPreview)return;
 const found=state.anime.find(a=>a.source==='TVMaze'&&(a.sourceId===String(n)||a.seasons.some(s=>s.sourceId===String(n))));
 if(found){openDetail(found.id);return}
 const item=catalogItems.find(x=>x.kind==='tv'&&Number(x.sourceId)===n),canonical=item?inLibrary(item):null;
 if(canonical&&!window.ATProviderBridge12124?.isTVMaze?.(canonical)){openDetail(canonical.id);return}
 openingTVPreview=true;
 try{
  const [showResponse,epResponse]=await Promise.all([fetch('https://api.tvmaze.com/shows/'+n),fetch('https://api.tvmaze.com/shows/'+n+'/episodes')]);
  if(!showResponse.ok||!epResponse.ok)throw Error('TVMaze nuk u përgjigj.');
  const raw=await showResponse.json(),eps=await epResponse.json();
  const mapped=proApp.modules.tv.mapShow(raw,Array.isArray(eps)?eps:[]);
  const converted=window.ATTVUnified120.convert(mapped);
  if(!converted){notify('Nuk ka të dhëna të mjaftueshme për serialin.');return}
  pendingTVPreview={id:n,mapped,converted};
  previewKey='tv-'+n;detailId=null;$('top-results').classList.add('hidden');
  $('detail-heading').textContent='Serial TV · '+converted.title;
  const poster=validPoster(converted.cover)?'<img src="'+escapeHTML(converted.cover)+'" alt="Posteri i '+escapeHTML(converted.title)+'" loading="lazy">':'';
  const seasonRows=converted.seasons.map(season=…31029 tokens truncated…o Inbox/Spam për '+email+'. Nëse llogaria është konfirmuar tashmë, provo Hyr ose rikupero fjalëkalimin; pranimi nuk garanton mbërritjen e emailit.','ok');
 }catch(e){accountStatus(at116AuthMessage(e,'register'),'error')}
 finally{at116ResendBusy=false;$('at116-resend-email').disabled=false}
}
async function accountSaveRecoveredPassword(){const input=$('at1162-new-password'),confirm=$('at1162-confirm-password'),button=$('at1162-save-password');const password=input.value;if(password.length<10||!/[a-z]/i.test(password)||!/[0-9]/.test(password)){accountStatus('Fjalëkalimi i ri duhet të ketë të paktën 10 karaktere, një shkronjë dhe një numër.','error');return}if(password!==confirm.value){accountStatus('Fjalëkalimet e reja nuk përputhen.','error');return}button.disabled=true;try{const {data,error}=await accountInitClient().auth.updateUser({password});if(error)throw error;if(!data?.user)throw Error('Serveri nuk konfirmoi ndryshimin.');input.value='';confirm.value='';$('at1162-recovery-panel').hidden=true;accountStatus('Fjalëkalimi u ndryshua me sukses. Mund të vazhdosh me llogarinë tënde.','ok')}catch(e){accountStatus(at116AuthMessage(e,'register'),'error')}finally{button.disabled=false}}
async function accountReset(){
 const email=$('account-email').value.trim().toLowerCase(),button=$('account-reset');
 const issue=at116EmailIssue(email);
 if(issue||!$('account-email').checkValidity()){accountStatus(issue||'Korrigjo adresën e emailit.','error');return}
 if(at116ResetBusy)return;
 const wait=Math.ceil((at116ResetAt+60000-Date.now())/1000);
 if(wait>0){accountStatus('Provo sërish rikuperimin pas '+wait+' sekondash.','error');return}
 at116ResetBusy=true;button.disabled=true;
 try{
  const {error}=await accountInitClient().auth.resetPasswordForEmail(email,{redirectTo:accountRedirectURL()});
  if(error)throw error;
  at116ResetAt=Date.now();
  $('at116-pending-email').hidden=true;at116PendingEmail='';
  accountStatus('Nëse kjo adresë ka llogari, serveri pranoi kërkesën e rikuperimit. Kontrollo Inbox/Spam. Hap vetëm linkun më të fundit dhe vendos fjalëkalimin e ri.','ok');
 }catch(e){accountStatus(at116AuthMessage(e,'reset'),'error')}
 finally{at116ResetBusy=false;button.disabled=false}
}
async function accountLogout(){if(accountMode!=='cloud')return;if(cloudDirty){await accountPush(false);if(cloudDirty&&!confirm('Ka ndryshime të paruajtura në cloud. Mund t’i rifitosh nga ky kompjuter. Të dalësh gjithsesi?'))return}accountStopRealtime();try{const {error}=await accountInitClient().auth.signOut();if(error)throw error}catch(e){accountStatus('Dalja dështoi: '+e.message,'error');return}clearTimeout(cloudTimer);accountMode='guest';accountUser=null;cloudConnected=false;cloudDirty=false;cloudRevision=null;cloudConflict=false;cloudBaseKnown=false;cloudMirrorUnavailable=false;KEY=GUEST_KEY;state={anime:[],tvShows:[],history:[],preferences:{weeklyGoal:10,notificationRead:[]}};accountRefreshViews();document.body.classList.add('auth-required');accountToggle(true);accountStatus('Dole nga llogaria. Hyr me një tjetër ose krijo të re.','ok');notify('Dole nga llogaria ✓')}
function accountCopyGuest(){const transactionBefore=JSON.parse(JSON.stringify(state));if(accountMode!=='cloud')return;let guest;try{guest=JSON.parse(localStorage.getItem(GUEST_KEY)||'null')}catch{}if(!guest||!Array.isArray(guest.anime)||!guest.anime.length){accountStatus('Nuk u gjet bibliotekë lokale me anime për import.','error');return}if(!confirm(`Të zëvendësojmë bibliotekën e kësaj llogarie me ${guest.anime.length} anime nga versioni lokal? Eksporto më parë një kopje të të dhënave cloud.`))return;state=accountNormalizePayload(guest);if(!save()){state=transactionBefore;return false}render();renderHome();renderUpcoming();accountStatus('Biblioteka lokale u kopjua. Po sinkronizohet në cloud…','ok')}
async function accountExportAll(){
 if(accountBusy||!accountUser)return;accountBusy=true;accountStatus('Po përgatitet eksporti i plotë…');
 try{const owner=accountUser.id,data=await proContext.accountService.call({action:'export'});if(accountUser?.id!==owner)return;
 const blob=new Blob([JSON.stringify({...data,localLibrary:accountLocalSnapshot(state)},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='AnimeTrack-account-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);accountStatus('Eksporti i plotë u shkarkua ✓','ok');
 }catch(e){accountStatus(e.message,'error')}finally{accountBusy=false}
}
async function accountDelete(){
 if(accountBusy||!accountUser)return;
 if(cloudSaving){accountStatus('Prit të përfundojë ruajtja në cloud.','error');return}
 const confirmation=$('account-delete-confirmation').value.trim(),password=$('account-delete-password').value;
 if(confirmation!=='FSHI LLOGARINE'||!password){accountStatus('Shkruaj FSHI LLOGARINE dhe fjalëkalimin aktual.','error');return}
 if(!confirm('Fshirja e llogarisë, bibliotekës online, profilit dhe komenteve është e përhershme. Ke shkarkuar eksportin? Vazhdo me fshirjen?'))return;
 accountBusy=true;const owner=accountUser.id,email=accountUser.email,key=KEY;accountStopRealtime();clearTimeout(cloudTimer);accountStatus('Po kontrollohet dhe fshihet llogaria…');
 try{
 const r=await accountInitClient().auth.signInWithPassword({email,password});$('account-delete-password').value='';if(r.error)throw r.error;if(r.data?.user?.id!==owner)throw Error('Llogaria ndryshoi.');
 await proContext.accountService.call({action:'delete',confirmation});
 cloudDirty=false;cloudSaving=false;try{await accountInitClient().auth.signOut({scope:'local'})}catch{}
 // Clear this account's recovery copies; never touch another account or guest library.
 for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k===key||k?.startsWith(key+'_'))localStorage.removeItem(k)}
 accountMode='guest';accountUser=null;cloudConnected=false;cloudRevision=null;cloudConflict=false;cloudBaseKnown=false;cloudMirrorUnavailable=false;KEY=GUEST_KEY;state={anime:[],tvShows:[],history:[],preferences:{weeklyGoal:10,notificationRead:[]}};
 $('account-delete-confirmation').value='';accountRefreshViews();proApp.hide();void proApp.onAccount();document.body.classList.add('auth-required');accountToggle(true);accountStatus('Llogaria dhe të dhënat online u fshinë.','ok');
 }catch(e){accountStatus('Fshirja nuk u përfundua: '+e.message,'error');if(accountUser?.id===owner)accountStartRealtime(owner)}finally{accountBusy=false;$('account-delete-password').value=''}
}

async function accountBoot(){let authReturn=null;const recoveryReturn=/\btype=recovery\b/.test(location.hash)||/\btype=recovery\b/.test(location.search);try{const c=accountGetConfig();if(c.url&&c.key&&window.supabase?.createClient){const client=accountInitClient();const {data,error}=await client.auth.getSession();if(error)throw error;if(data?.session?.user)await accountOpenCloud(data.session.user);authReturn=accountAuthReturnNotice()}}catch(e){KEY=GUEST_KEY;accountMode='guest';accountUser=null;state=load();render();renderHome();accountStatus('Llogaria online nuk u hap: '+e.message+' · Biblioteka lokale mbetet e sigurt.','error')}finally{document.body.classList.remove('account-booting');if(accountMode!=='cloud'){document.body.classList.add('auth-required');state={anime:[],tvShows:[],history:[],preferences:{weeklyGoal:10,notificationRead:[]}};render();renderHome();accountToggle(true);}accountUI();if(recoveryReturn&&accountMode==='cloud'){$('at1162-recovery-panel').hidden=false;accountToggle(true);accountStatus('Vendos një fjalëkalim të ri për llogarinë tënde.','ok')}else if(authReturn){if(accountMode==='cloud')notify(authReturn.kind==='error'?'Llogaria është aktive. Mund të vazhdosh; linku i vjetër nuk është më i nevojshëm.':authReturn.message);else accountStatus(authReturn.message,authReturn.kind)}}}
$('at1162-save-password').addEventListener('click',accountSaveRecoveredPassword);
$('account-top-btn').addEventListener('click',()=>accountToggle(true));$('account-sidebar-btn').addEventListener('click',()=>accountToggle(true));
$('account-form').addEventListener('submit',e=>{e.preventDefault();return window.ATMobile113?.signupReady?.()?accountRegister():accountLogin(e)});$('account-email').addEventListener('input',()=>{if(at116PendingEmail&&$('account-email').value.trim().toLowerCase()!==at116PendingEmail){$('at116-pending-email').hidden=true;at116PendingEmail=''}});$('at116-resend-email').addEventListener('click',accountResend);$('account-reset').addEventListener('click',accountReset);$('account-refresh').addEventListener('click',()=>accountPull(true));$('account-push').addEventListener('click',()=>accountPush(true));$('account-copy-guest').addEventListener('click',accountCopyGuest);$('account-logout').addEventListener('click',accountLogout);$('account-export').addEventListener('click',exportData);$('account-export-all').addEventListener('click',accountExportAll);$('account-delete').addEventListener('click',accountDelete);$('account-guest-backup').addEventListener('click',()=>{const current=state;try{const raw=localStorage.getItem(GUEST_KEY);if(raw){state=accountNormalizePayload(JSON.parse(raw));exportData();}else notify('Nuk ka bibliotekë të vjetër në këtë shfletues.')}catch(e){notify('Kopja rezervë nuk u hap.')}finally{state=current}});$('account-use-guest').addEventListener('click',()=>accountToggle(false));
window.addEventListener('focus',()=>accountWakeCloud(false));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')accountWakeCloud(false)});
window.addEventListener('pageshow',()=>accountWakeCloud(true));
window.addEventListener('online',()=>accountWakeCloud(true));
window.addEventListener('pagehide',accountStopRealtime);
setInterval(()=>{if(document.visibilityState!=='visible'||accountMode!=='cloud'||cloudDirty||cloudSaving||accountBusy)return;if(Date.now()-cloudLastPullAt>30000)void accountPullQuiet()},30000);

// 9.3 – season forecast is information only, never a watched episode.
const v93BaseDetail=renderDetail;
renderDetail=function(id){
 v93BaseDetail(id);const a=state.anime.find(x=>x.id===id);if(!a)return;
 const s=a.seasons.find(x=>x.id===activeSeasonId)||a.seasons[0],available=releasedCount(s),pending=Math.max(0,(s.total||0)-available),waiting=s.releaseStatus==='NOT_YET_RELEASED'||s.releaseStatus==='NOT_YET_AIRED',detail=$('detail-body');
 const stat=detail.querySelector('.detail-stats');if(stat){window.ATHTML.renderHTML(stat.querySelectorAll('span')[0],`<b>${count(a)}</b> / ${releasedTotal(a)} episode të transmetuara`);window.ATHTML.renderHTML(stat.querySelectorAll('span')[1],`<b>${releasedTotal(a)?percentage(a)+'%':'—'}</b> progres`);}
 const next=detail.querySelector('[data-next]');if(next){next.disabled=!nextSeasonEp(a);next.title=next.disabled?'Nuk ka episode të tjera të transmetuara':'';}
 const tabs=[...detail.querySelectorAll('.season-tab')];tabs.forEach((tab,i)=>{const x=a.seasons[i];const total=releasedCount(x);const caption=tab.querySelector('.season-total');if(caption)caption.textContent=`${x.watched.length}/${total} episode${total&&x.watched.length===total?' ✓':''}`;if(x.total>total){const small=document.createElement('span');small.className='pending-note';small.textContent=`◷ ${x.total-total} episode ende pa dalë`;tab.appendChild(small)}const bar=tab.querySelector('.progress span');if(bar)window.ATHTML.setPercent(bar,total?Math.min(100,Math.round(x.watched.length/total*100)):0)});
 const banner=detail.querySelector('.season-banner');if(banner&&(pending||waiting)){let note=document.createElement('div');note.className='pending-season';window.ATHTML.renderHTML(note,`<strong>◷ Sezon i konfirmuar, ende në transmetim / në pritje</strong><br>${escapeHTML(pendingReleaseText(s))}<br>Progresi numëron vetëm ${available} episode që kanë dalë. Numri i planifikuar nuk shtohet te episodet e pashikuara.`);banner.insertAdjacentElement('afterend',note)}
 const toggle=detail.querySelector('[data-season-toggle][data-seen="1"]');if(toggle)toggle.disabled=!available||(s.watched.length>=available&&!a.seasons.slice(0,a.seasons.indexOf(s)).some(x=>x.watched.length<releasedCount(x)));
 if(!available){const list=detail.querySelector('.episode-list');if(list)window.ATHTML.renderHTML(list,'<div class="pending-season at-grid-span">📅 Nuk ka ende episode të transmetuara për këtë sezon. Rikontrollohet automatikisht kur të hapësh AnimeTrack.</div>');const pages=detail.querySelector('.episode-pages');if(pages)pages.hidden=true;}
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
 window.ATHTML.setPercent($('stats-goal-fill'),Math.min(100,week.length/goal*100));
 const dayCounts=new Map();for(const e of events){const key=statsLocalKey(new Date(e.at));dayCounts.set(key,(dayCounts.get(key)||0)+1)}
 let streak=0,cursor=new Date(nowDate.getFullYear(),nowDate.getMonth(),nowDate.getDate());if(!dayCounts.get(statsLocalKey(cursor)))cursor.setDate(cursor.getDate()-1);
 while(streak<2000&&dayCounts.get(statsLocalKey(cursor))){streak++;cursor.setDate(cursor.getDate()-1)}$('stats-streak').textContent=streak;
 const days=Array.from({length:7},(_,i)=>{const d=new Date(nowDate.getFullYear(),nowDate.getMonth(),nowDate.getDate());d.setDate(d.getDate()-6+i);return{label:['D','H','M','M','E','P','Sh'][d.getDay()],title:d.toLocaleDateString('sq-AL',{weekday:'long',day:'numeric',month:'long'}),value:dayCounts.get(statsLocalKey(d))||0}});
 const months=Array.from({length:6},(_,i)=>{const d=new Date(nowDate.getFullYear(),nowDate.getMonth()-5+i,1),key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');return{label:d.toLocaleDateString('sq-AL',{month:'short'}),title:d.toLocaleDateString('sq-AL',{month:'long',year:'numeric'}),value:events.filter(e=>statsLocalKey(new Date(e.at)).startsWith(key)).length}});
 function bars(rows){const max=Math.max(1,...rows.map(x=>x.value));return rows.map(x=>`<div class="stats-col" title="${escapeHTML(x.title)}: ${x.value}"><b>${x.value||'·'}</b><div class="stats-bar-track"><span class="stats-bar-fill ${window.ATHTML.percentClass(x.value?Math.max(5,Math.round(x.value/max*100)):0,'h')}"></span></div><small>${escapeHTML(x.label)}</small></div>`).join('')}
 window.ATHTML.renderHTML($('stats-week-bars'),bars(days));window.ATHTML.renderHTML($('stats-month-bars'),bars(months));
 function ranks(rows){const max=Math.max(1,...rows.map(x=>x.count));return rows.length?rows.map(x=>`<div class="stats-rank-row"><strong title="${escapeHTML(x.name)}">${escapeHTML(x.name)}</strong><b>${x.count}</b><div class="stats-rank-track"><span class="${window.ATHTML.percentClass(Math.round(x.count/max*100),'w')}"></span></div></div>`).join(''):'<p class="home-empty">Ende pa të dhëna për këtë seksion.</p>'}
 window.ATHTML.renderHTML($('stats-genre-chart'),ranks(genreCounts().slice(0,7)));
 const top=new Map();for(const e of month)top.set(e.id,(top.get(e.id)||0)+1);
 window.ATHTML.renderHTML($('stats-top-anime'),ranks([...top.entries()].map(([id,count])=>({name:byId.get(id)?.title||'Anime e mëparshme',count})).sort((a,b)=>b.count-a.count).slice(0,7)));
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
 $('stats-goal-save').addEventListener('click',()=>{const value=Number($('stats-weekly-goal').value);if(!Number.isInteger(value)||value<1||value>200){notify('Objektivi duhet të jetë 1–200 episode në javë.');return}const previous=JSON.parse(JSON.stringify(state.preferences||{}));state.preferences=state.preferences||{};state.preferences.weeklyGoal=value;if(!save()){state.preferences=previous;return}renderStatistics();notify('Objektivi javor u ruajt ✓')});
}
initV95();


function v96RecentEpisodes(limit=8){
 const cutoff=Date.now()-7*DAY,found=new Map(),library=new Map(state.anime.map(a=>[a.id,a]));
 const add=(x,season=null,n=null)=>{if(!x||x.when<cutoff||x.when>Date.now())return;const a=library.get(x.animeId);if(!a)return;let s=season||a.seasons.find(v=>v.id===x.seasonId)||null;const ep=Math.max(1,Number(n??x.seasonEpisode??x.episode)||1);if(!s&&x.source==='AniList')s=a.seasons.find(v=>v.sourceId&&x.url?.includes('/anime/'+v.sourceId))||null;if(!s)s=a.seasons.find(v=>releasedCount(v)>=ep)||a.seasons[0]||null;const key=a.id+':'+(s?.id||x.season||'')+':'+ep;if(found.has(key)&&Number(found.get(key).when)>=Number(x.when))return;found.set(key,{...x,anime:a,localSeason:s,localEpisode:ep,seen:!!s?.watched.includes(ep)})};
 for(const x of upcomingEntries)add(x);
 for(const a of state.anime.filter(a=>['watching','waiting','completed'].includes(a.status)))for(const s of visibleSeasons(a))for(const ep of s.episodes||[]){
  const when=Date.parse(ep.airedAt||ep.aired||'');if(!Number.isFinite(when))continue;
  add({animeId:a.id,title:a.title,cover:a.cover,episode:ep.number,season:s.subtitle||s.title,seasonId:s.id,seasonEpisode:ep.number,when,source:'Datë episodi',url:a.sourceUrl||''},s,ep.number);
 }
 return [...found.values()].sort((a,b)=>b.when-a.when).slice(0,Math.max(1,Math.min(40,Number(limit)||8)));
}
function v96RenderReleases(){
 const list=v96RecentEpisodes(),future=upcomingEntries.filter(x=>x.when>Date.now()&&x.when<=Date.now()+30*DAY).sort((a,b)=>a.when-b.when).slice(0,3),unseen=list.filter(x=>!x.seen).length;
 $('v96-release-count').textContent=upcomingBusy?'Po përditësohen datat…':(unseen?unseen+' të reja · ':'')+list.length+' episode gjatë 7 ditëve'+(upcomingCheckedAt?' · kontrolluar '+formatStamp(upcomingCheckedAt):' · ende pa kontroll online');
 $('v96-refresh-airing').disabled=upcomingBusy;
 window.ATHTML.renderHTML($('v96-release-grid'),list.length?list.map(x=>{
  const a=x.anime,image=validPoster(a?.cover||x.cover),when=formatStamp(x.when),s=x.localSeason,index=s?seasonNumberFor(a,s):0;
  return `<article class="v96-release-card ${x.seen?'v96-seen':'v96-unseen'}"><div class="v96-release-cover">${image?`<img src="${escapeHTML(image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:''}</div><div class="v96-release-copy"><div class="v96-release-line"><span class="v96-release-tag">${x.seen?'✓ I PARË':'● I RI'} · ${index?'S'+index+' · ':''}EP ${x.localEpisode}</span><span class="v96-release-source">${escapeHTML(x.source)}</span></div><h4 title="${escapeHTML(a?.title||x.title)}">${escapeHTML(a?.title||x.title)}</h4><small>${escapeHTML(when)}${a?' · '+escapeHTML(STATUS[a.status]):''}</small><div class="v96-release-actions"><button class="ghost" ${s?`data-episode-detail="${escapeHTML(x.animeId)}" data-episode-season="${escapeHTML(s.id)}" data-episode-number="${x.localEpisode}"`:`data-detail="${escapeHTML(x.animeId)}"`}>Detajet e episodit</button>${!x.seen&&s?`<button class="primary" data-v96-watch="${escapeHTML(x.animeId)}" data-v96-season="${escapeHTML(s.id)}" data-v96-episode="${x.localEpisode}">✓ Shëno si parë</button>`:''}</div></div></article>`
 }).join(''):'<div class="v96-empty">Ende nuk ka episode me datë transmetimi të verifikuar gjatë 7 ditëve të fundit. Rifresko orarin ose kontrollo përsëri kur të dalë episodi i radhës.</div>');
 window.ATHTML.renderHTML($('v96-next-grid'),future.length?future.map(x=>`<button class="v96-next-card" data-detail="${escapeHTML(x.animeId)}"><span>◷</span><div><strong>${escapeHTML(x.title)} · EP ${escapeHTML(x.episode)}</strong><small>${escapeHTML(formatStamp(x.when))} · Shqipëri</small></div></button>`).join(''):'<div class="v96-empty">Nuk ka data të tjera të njoftuara për 30 ditët e ardhshme.</div>');
}
function v96OrganizeDashboard(){
 const home=$('home-view'),hero=home.querySelector('.home-hero'),stats=home.querySelector('.home-stats'),quick=document.createElement('div');
 const pulse=document.createElement('div');pulse.className='v96-pulse';pulse.id='v96-pulse';stats.after(pulse);quick.className='v96-quicklinks';window.ATHTML.renderHTML(quick,`<button class="v96-quicklink" data-v96-view="upcoming"><span class="v96-icon">◷</span><span><strong>Episode të reja</strong><small>Transmetimet dhe datat</small></span></button><button class="v96-quicklink" data-v96-filter="waiting"><span class="v96-icon">✦</span><span><strong>Në pritje sezoni</strong><small>Vazhdimet zyrtare</small></span></button><button class="v96-quicklink" data-v96-view="statistics"><span class="v96-icon">▥</span><span><strong>Statistikat e mia</strong><small>Java dhe muaji yt</small></span></button><button class="v96-quicklink" data-v96-filter="genres"><span class="v96-icon">◈</span><span><strong>Zhanret</strong><small>Zbulo sipas shijes</small></span></button>`);
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
function v96RenderPulse(){const box=$('v96-pulse');if(!box)return;const events=activityEpisodes(),week=events.filter(e=>e.at>=statsWeekStart(new Date())).length,goal=Math.max(1,Number(state.preferences?.weeklyGoal)||10),ready=state.anime.filter(a=>a.status==='watching').reduce((n,a)=>n+Math.max(0,releasedTotal(a)-count(a)),0),next7=upcomingEntries.filter(x=>x.when>=Date.now()&&x.when<=Date.now()+7*DAY).length,waiting=state.anime.filter(a=>!!futureSeasonOf(a)).length;window.ATHTML.renderHTML(box,`<button data-v96-view="statistics"><span>Këtë javë</span><strong>${week}</strong><small>${Math.min(100,Math.round(week/goal*100))}% e objektivit</small></button><button data-v96-filter="watching"><span>Gati për t’u parë</span><strong>${ready}</strong><small>episode të transmetuara</small></button><button data-v96-view="upcoming"><span>7 ditët e ardhshme</span><strong>${next7}</strong><small>premiera</small></button><button data-v96-filter="waiting"><span>Vazhdime</span><strong>${waiting}</strong><small>sezone të konfirmuara</small></button>`)}
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
  const candidates=state.anime.filter(a=>['AniList','MyAnimeList'].includes(a.source)&&!window.ATProviderBridge12124?.isTVMaze?.(a)&&isFranchiseFormat(a.format)&&/^\d+$/.test(a.sourceId||'')).map(a=>a.id);
  for(const id of candidates){if((accountUser?.id||null)!==owner)break;const anime=state.anime.find(a=>a.id===id);if(!anime)continue;await hydrateSeasons(id,true,true)}
  const local=repairLocalAnimeDuplicates(),provider=repairProviderDuplicates(true);if(local.changed||provider.changed)save();
  const merged=before-state.anime.length;
  if(!quiet)notify(merged>0?merged+' karta të dyfishuara u bashkuan pa humbur episodet ✓':'Sezonet u kontrolluan. Nuk ka karta të tjera për t’u bashkuar.');
 }finally{seriesRepairBusy=false;if(button){button.disabled=false;button.textContent='↻ Kontrollo & bashko sezonet'}}
}
$('series-repair-btn').addEventListener('click',()=>scanAndMergeSeries(false));
const seriesBaseAccountOpen=accountOpenCloud;
accountOpenCloud=async function(user){
 await seriesBaseAccountOpen(user);
 const local=repairLocalAnimeDuplicates(),fixed=repairProviderDuplicates(true);if(local.changed||fixed.changed){save();accountRefreshViews();accountStatus((fixed.removed.length||0)+' kopje të dyfishta u bashkuan automatikisht · po ruhet në cloud…','ok')}
 const owner=user.id,tv=state.anime.filter(a=>a.source==='TVMaze'&&a.franchiseVersion!==FRANCHISE_SCHEMA).map(a=>a.id);if(tv.length)setTimeout(async()=>{for(const id of tv){if(accountUser?.id!==owner)break;await syncTVFranchise(id,true,true)}},500);
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
 if(synopsis){window.ATHTML.insertHTML(synopsis,'beforebegin','<div class="v98-subheading">PËRSHKRIMI I EPISODIT</div>');if(!s.watched.includes(n)&&!episodeSynopsisRevealed.has(cacheKey)){synopsis.hidden=true;const button=document.createElement('button');button.type='button';button.className='v98-spoiler-reveal';button.dataset.v98Synopsis=cacheKey;button.textContent='⚠ Mund të ketë spoiler · Shfaq përshkrimin';synopsis.before(button)}}
 const epNote=String(ep?.myNote||''),rating=Number(ep?.personalRating)||0;
 const options='<option value="0">Pa vlerësim</option>'+Array.from({length:10},(_,i)=>`<option value="${i+1}" ${rating===i+1?'selected':''}>${i+1}/10 ${i+1>=9?'★':''}</option>`).join('');
 const extra=`<div class="v98-navline"><button class="ghost" data-v98-move="-1" ${n<=1?'disabled':''}>← Episodi ${Math.max(1,n-1)}</button><span>${n} / ${releasedCount(s)} të transmetuara</span><button class="ghost" data-v98-move="1" ${n>=releasedCount(s)?'disabled':''}>Episodi ${n+1} →</button></div><div class="v98-personal"><div class="v98-section-head"><div><span class="eyebrow">VETËM PËR LLOGARINË TËNDE</span><h3>✎ Shënimet & vlerësimi im</h3></div><label>Nota ime <select id="v98-rating">${options}</select></label></div><textarea id="v98-personal-note" maxlength="1500" rows="3" placeholder="Çfarë të pëlqeu? Teoritë e tua për episodin...">${escapeHTML(epNote)}</textarea><div class="v98-personal-bottom"><small>Private · ruhen me bibliotekën tënde në Supabase.</small><button class="ghost" data-v98-save-note="1" type="button">Ruaj shënimin</button></div></div>${v98DiscussionHTML(currentKey)}`;
 window.ATHTML.insertHTML(box,'beforeend',extra);
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
 const previousEpisodes=JSON.parse(JSON.stringify(s.episodes||[]));const ep=episodePersonalRow(s,n),note=String($('v98-personal-note')?.value||'').trim(),rating=Number($('v98-rating')?.value||0);
 const previousUpdatedAt=a.updatedAt;ep.myNote=note.slice(0,1500);ep.personalRating=rating>=1&&rating<=10?rating:null;a.updatedAt=now();if(!save()){s.episodes=previousEpisodes;a.updatedAt=previousUpdatedAt;return}if(detailId===a.id)renderDetail(a.id);v81RenderEpisode('Shënimi dhe nota u ruajtën; sinkronizimi cloud kryhet automatikisht.');
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

/* 11.0: retain only the Episode Hub. Anime detail uses its native season tabs. */
const atJourney=window.ATJourney({
 el:$,esc:escapeHTML,released:releasedCount,episodeParts:v81EpisodeParts,
 openEpisode:(id,sid,n)=>{if($('detail-modal').classList.contains('show'))closeModal('detail-modal');v81OpenEpisode(id,sid,n)}
});
const priorJourneyEpisode=v81RenderEpisode;
v81RenderEpisode=function(message=''){priorJourneyEpisode(message);atJourney.renderEpisode(v81EpisodeParts())};
const priorJourneyOpen=v81OpenEpisode;
v81OpenEpisode=function(id,seasonId,n){if($('detail-modal').classList.contains('show'))closeModal('detail-modal');atJourney.onOpen();return priorJourneyOpen(id,seasonId,n)};
document.addEventListener('click',e=>{const b=e.target.closest('button[data-journey-action]');if(b)atJourney.action(b)});


/* 12.7 — refresh tracked TV episode dates and newly aired seasons without changing watched marks. */
let tv127RefreshBusy=false;
async function refreshTrackedTV127(force=false){
 if(tv127RefreshBusy||!navigator.onLine||accountMode!=='cloud'||!accountUser||cloudDirty||cloudSaving||cloudConflict)return {updated:0};
 const uid=accountUser.id,key=KEY+'_tv_episodes_127',clock=Date.now();
 let checks={};try{checks=JSON.parse(localStorage.getItem(key)||'{}');if(!checks||typeof checks!=='object'||Array.isArray(checks))checks={}}catch{}
 const showIds=new Set();
 for(const a of state.anime.filter(a=>a.source==='TVMaze'&&['watching','waiting','completed'].includes(a.status))){
  for(const id of [a.sourceId,a.tvmazeId,...(a.seasons||[]).filter(s=>String(s.source||'').toLowerCase()==='tvmaze').map(s=>s.sourceId)])if(/^\d{1,10}$/.test(String(id||'')))showIds.add(String(id));
 }
 const ids=[...showIds].filter(id=>force||clock-(Number(checks[id])||0)>24*60*60*1000).sort((a,b)=>(Number(checks[a])||0)-(Number(checks[b])||0)).slice(0,32);
 if(!ids.length)return {updated:0};
 tv127RefreshBusy=true;let updated=0,failed=0;
 try{
  for(let offset=0;offset<ids.length;offset+=3){
   const results=await Promise.allSettled(ids.slice(offset,offset+3).map(async id=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
    try{
     const response=await fetch('https://api.tvmaze.com/shows/'+id+'/episodes',{signal:controller.signal});
     if(!response.ok)throw Error('TVMaze '+response.status);
     const rows=await response.json();if(!Array.isArray(rows))throw Error('Episode list unavailable');
     return {id,rows};
    }finally{clearTimeout(timer)}
   }));
   for(let k=0;k<results.length;k++){
    if(accountMode!=='cloud'||accountUser?.id!==uid||KEY!=='animetrack_user_'+uid)return {updated,failed};
    const result=results[k],showId=ids[offset+k];
    if(result.status!=='fulfilled'){failed++;console.warn('Tracked TV refresh failed',showId,result.reason);continue}
    const entry=state.anime.find(a=>a.source==='TVMaze'&&(String(a.sourceId)===showId||String(a.tvmazeId)===showId||(a.seasons||[]).some(x=>String(x.sourceId)===showId)));
    if(!entry){checks[showId]=Date.now();continue}
    const before=JSON.stringify(entry),index=state.anime.indexOf(entry);
    try{
     if(window.ATTVEpisodes127.merge(entry,showId,result.value.rows,normSeason)){
      syncTotals(entry);
      entry.updatedAt=now();
      // Catalog metadata must not interrupt an editable page; use the same durable per-account journal without a full page repaint.
      let stored=false;try{window.ATSync126.save(localStorage,KEY,accountLocalSnapshot(state),cloudRevision,true);accountQueueSave();stored=true}catch(err){console.warn('TV metadata persistence failed',err)}
      if(!stored){state.anime[index]=JSON.parse(before);failed++;continue}
      updated++;
     }
     checks[showId]=Date.now();
    }catch(err){state.anime[index]=JSON.parse(before);failed++;console.warn('TV episode merge failed',showId,err)}
   }
  }
  try{localStorage.setItem(key,JSON.stringify(checks))}catch(err){console.warn('TV refresh schedule not cached',err)}
  if(updated){render();renderHome();renderUpcoming()}
  return {updated,failed};
 }finally{tv127RefreshBusy=false}
}

/* AnimeTrack 9.9 — composed feature modules. Core user library remains unchanged. */
const proContext={
 el:$,esc:escapeHTML,state:()=>state,user:()=>accountUser,client:()=>accountInitClient(),
 accountService:window.ATAccountService({client:()=>accountInitClient(),user:()=>accountUser}),
 poster:validPoster,count,activity:activityEpisodes,upcoming:()=>upcomingEntries,
 confirm:message=>window.confirm(message),prompt:(message,value)=>window.prompt(message,value),closeDetail:()=>{if($('detail-modal').classList.contains('show'))closeModal('detail-modal')},
 genres:genresOf,seriesRoot:seriesRootTitle,mapAniList,inLibrary,released:releasedCount,isMovie:isMovieAnime,uuid,
 toast:notify,save:()=>save(),openAccount:()=>accountToggle(true),exportLibrary:exportData,importExternal,accountName,openAnime:id=>openDetail(id),
 nextEpisode:nextSeasonEp,seasonNumber:seasonNumberFor,releasedTotal,percent:percentage,markNext,recentAiring:()=>v96RecentEpisodes(40),
 undoEpisode:(id,seasonId,n)=>{const last=state.history[state.history.length-1];if(!last||last.id!==id||last.seasonId!==seasonId||last.episode!==n||last.action!=='watched'){notify('Progresi ka ndryshuar. Zhbërja nuk u krye.');return false}return updateSeasonEpisode(id,seasonId,n,false)},
 openFilter:code=>setFilter(code),

 openEpisode:(id,seasonId,n)=>v81OpenEpisode(id,seasonId,n),
 markEpisode:(id,seasonId,n)=>requestEpisodeToggle(id,seasonId,n),
 refreshAiring:async()=>{await refreshUpcoming(true);proApp.render();await proApp.modules.notifications.refresh()},
 liveRefresh:async(force=false)=>{if(accountMode==='cloud'&&accountUser)await accountPullQuiet();await refreshTrackedTV127(force);await refreshUpcoming(force);if(catalogSyncAt&&Date.now()-catalogSyncAt>DAY)await refreshCatalogDaily(false);await proApp.modules.notifications.refresh();proApp.renderHome();proApp.renderBackground();return {at:upcomingCheckedAt,failed:upcomingFailures,cloud:cloudConnected}},
 liveStatus:()=>({at:upcomingCheckedAt,failed:upcomingFailures,busy:upcomingBusy,cloud:cloudConnected}),
 canReload:()=>!cloudSaving&&!(cloudDirty&&cloudMirrorUnavailable),
 watchSaveStatus:()=>({mode:accountMode,dirty:cloudDirty,saving:cloudSaving,connected:cloudConnected,conflict:cloudConflict}),
 syncReminderJobs:()=>proApp.modules.push.scheduleSync(),
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
 searchOnline:q=>{setView('explore');syncSearch(String(q||''),'catalog');$('global-search')?.focus({preventScroll:true})},
 previewItem:item=>{if(item.kind==='tv'){void openUnifiedTV(item.sourceId);return}v8PrepareCatalog(item);openCatalogPreview(item.key)},
 addItem:async item=>{if(item.kind==='tv'){await openUnifiedTV(item.sourceId);return}v8PrepareCatalog(item);const id=await addCatalogItem(item.key,'planning');if(id)openDetail(id)}
};
window.ATMobile113.state=()=>state;
const proApp=window.AnimeTrackPro(proContext);
proApp.init();
const at124Command=window.ATCommand124({
 esc:escapeHTML,state:()=>state,released:releasedCount,
 resume:a=>window.ATResume123.resolve(a,state.history,releasedCount),
 navigate:page=>setView(page),openAnime:id=>openDetail(id),
 openEpisode:(id,sid,n)=>v81OpenEpisode(id,sid,n),
 online:q=>{setView('explore');syncSearch(q,'catalog');$('global-search').focus({preventScroll:true})}
});
at124Command.mount();
const proPriorHome=renderHome;renderHome=function(){proPriorHome();proApp.renderHome()};
const at113PreviousLibraryRender=render;render=function(...args){const result=at113PreviousLibraryRender(...args);window.ATMobile113.libraryUpdate();return result};
window.addEventListener('at119-library-filter',()=>render());
window.addEventListener('at113-library-search',e=>{search=String(e.detail||'').trim().toLocaleLowerCase();render()});
let at113LastEpisodeKey='';const at113EpisodeRender=v81RenderEpisode;v81RenderEpisode=function(...args){const panel=$('episode-detail-modal')?.querySelector('.modal-body'),parts=v81EpisodeParts(),key=[parts.a?.id,parts.s?.id,parts.n].join(':');const position=key===at113LastEpisodeKey?(panel?.scrollTop||0):0;at113EpisodeRender(...args);window.ATMobile113.enhanceEpisode();if(panel)panel.scrollTop=position;at113LastEpisodeKey=key};
const proPriorView=setView;setView=function(which){if(proApp.open(which))return;proApp.hide();proApp.syncMobile(which);return proPriorView(which)};
const proPriorDetail=renderDetail;renderDetail=function(id){proPriorDetail(id);proApp.renderRewatch(id);const a=state.anime.find(x=>x.id===id),resume=a&&window.ATResume123.resolve(a,state.history,releasedCount),root=$('detail-body');if(!resume||!root)return;const season=a.seasons.find(s=>s.id===resume.seasonId),top=root.querySelector('.seasons-topline');if(!season||!top)return;const button=document.createElement('button');button.type='button';button.className='at123-resume-button';button.dataset.at123Resume=id;window.ATHTML.renderHTML(button,'<span class="at123-resume-icon">▶</span><span><small>VAZHDO NGA KU E LE</small><strong>'+escapeHTML(season.title)+' · Episodi '+resume.episode+'</strong></span><span aria-hidden="true">→</span>');top.after(button)};
document.addEventListener('click',e=>{const b=e.target.closest('button[data-at123-resume]');if(!b)return;const a=state.anime.find(x=>x.id===b.dataset.at123Resume),pos=a&&window.ATResume123.resolve(a,state.history,releasedCount);if(!pos)return;activeSeasonId=pos.seasonId;episodePage=pos.page;renderDetail(a.id);void loadSeasonEpisodes(a.id,pos.seasonId,pos.page);$('detail-body').querySelector('[data-season-ep][data-ep="'+pos.episode+'"]')?.scrollIntoView({block:'center',behavior:'smooth'})});
const proPriorCloud=accountOpenCloud;accountOpenCloud=async function(user){await proPriorCloud(user);void proApp.onAccount().catch(e=>console.warn('Optional account features',e));if(navigator.onLine)void refreshTrackedTV127(false).catch(e=>console.warn('Tracked TV check failed',e))};
const proPriorLogout=accountLogout;accountLogout=async function(){await proPriorLogout();proApp.hide();await proApp.onAccount()};
const proPriorSave=save;save=function(){const result=proPriorSave();if(result)try{proApp.onStateChange()}catch(err){console.warn('Feature refresh after save failed',err)}return result};

render();renderUpcoming();renderHome();setView('home');v8LoadSeason(1);accountBoot();

// AnimeTrack 12.14 — season resume focus, reversible hidden parts and season descriptions.
function at140SeasonDescription(s){return String(s?.synopsis||'').replace(/\s+/g,' ').trim()}
function at140EnhanceSeasonUX(id){
 const a=state.anime.find(x=>x.id===id),root=$('detail-body');if(!a||!root)return;
 const visible=visibleSeasons(a),hidden=hiddenSeasons(a),active=a.seasons.find(x=>x.id===activeSeasonId&&!x.hidden)||visible[0];
 const resume=window.ATResume123.resolve(a,state.history,releasedCount);
 const tabs=[...root.querySelectorAll('.season-tab')];
 tabs.forEach((tab,i)=>{const part=a.seasons[i];if(!part)return;tab.hidden=!!part.hidden;tab.classList.toggle('at140-resume-season',resume?.seasonId===part.id);if(resume?.seasonId===part.id&&!tab.querySelector('.at140-resume-chip')){const chip=document.createElement('span');chip.className='at140-resume-chip';chip.textContent='KU E LE';tab.prepend(chip)}});
 const topline=root.querySelector('.seasons-topline h4');if(topline)topline.textContent=`Rendi kronologjik • ${visible.length} pjesë${hidden.length?' · '+hidden.length+' të fshehura':''}`;
 const partsPill=[...root.querySelectorAll('.detail-content .pill')].at(-1);if(partsPill&&/pjesë/.test(partsPill.textContent||''))partsPill.textContent=`${visible.length} pjesë${hidden.length?' · '+hidden.length+' fshehur':''}`;
 const banner=root.querySelector('.season-banner');if(banner&&active){
  const actions=banner.querySelector('.season-actions');if(actions&&!actions.querySelector('[data-season-hide]')&&visible.length>1){const hide=document.createElement('button');hide.type='button';hide.className='ghost at140-hide-part';hide.dataset.seasonHide=active.id;hide.dataset.id=a.id;hide.textContent='⊘ Fshih këtë pjesë';hide.title='Nuk fshin progresin; vetëm e heq nga timeline-i dhe llogaritjet.';actions.appendChild(hide)}
  const desc=at140SeasonDescription(active);if(desc&&!banner.querySelector('.at140-season-description')){const box=document.createElement('div');box.className='at140-season-description';window.ATHTML.renderHTML(box,`<span>RRETH KËSAJ PJESË</span><p>${escapeHTML(desc)}</p>${active.sourceUrl?`<a href="${escapeHTML(active.sourceUrl)}" target="_blank" rel="noopener noreferrer">Burimi ↗</a>`:''}`);banner.appendChild(box)}
 }
 const scroller=root.querySelector('.season-scroller');if(scroller&&hidden.length&&!root.querySelector('.at140-hidden-parts')){const details=document.createElement('details');details.className='at140-hidden-parts';window.ATHTML.renderHTML(details,`<summary>👁 Pjesë të fshehura (${hidden.length})</summary><div>${hidden.map(x=>`<button type="button" class="ghost" data-season-restore="${escapeHTML(x.id)}" data-id="${escapeHTML(a.id)}"><strong>${escapeHTML(x.title)}</strong><small>${escapeHTML(x.subtitle||formatLabel(x.format))}</small><span>Rikthe</span></button>`).join('')}</div>`);scroller.after(details)}
 const activeTab=tabs.find(tab=>tab.dataset.season===active?.id);if(scroller&&activeTab&&!activeTab.hidden)requestAnimationFrame(()=>{const left=Math.max(0,activeTab.offsetLeft-(scroller.clientWidth-activeTab.offsetWidth)/2);scroller.scrollTo({left,behavior:'smooth'})});
 const resumeRow=resume?.seasonId===active?.id?root.querySelector(`[data-season-ep="${resume.seasonId}"][data-ep="${resume.episode}"]`):null;(resumeRow?.closest('.ep-article')||resumeRow)?.classList.add('at140-resume-episode');
}
const at140PriorRenderDetail=renderDetail;renderDetail=function(id){at140PriorRenderDetail(id);at140EnhanceSeasonUX(id)};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.seasonHide)setSeasonHidden(b.dataset.id,b.dataset.seasonHide,true);if(b.dataset.seasonRestore)setSeasonHidden(b.dataset.id,b.dataset.seasonRestore,false)});


// AnimeTrack 12.15 — Movies as a third first-class media type.
function at150FlushCloud(){
 if(accountMode!=='cloud'||!accountUser||!cloudDirty||cloudSaving||cloudConflict||!navigator.onLine)return;
 clearTimeout(cloudTimer);void accountPush(false);
}

const TMDB_TOKEN_STORAGE='animetrack_tmdb_read_token';
function tmdbToken(){return (localStorage.getItem(TMDB_TOKEN_STORAGE)||'').trim()}
function at150ProviderBadge(){const el=$('movie-provider-badge');if(el)el.textContent=tmdbToken()?'TMDB ✓':omdbKey()?'IMDb/Cinemeta + OMDb ✓':'IMDb/Cinemeta ✓'}
function at150SetTMDB(){const input=$('tmdb-token-input'),token=input?.value.trim()||'';if(token.length<20){notify('Vendos TMDB Read Access Token të vlefshëm.');return}try{localStorage.setItem(TMDB_TOKEN_STORAGE,token);if(input)input.value='';at150ProviderBadge();notify('TMDB u lidh në këtë pajisje ✓')}catch{notify('TMDB token nuk u ruajt në këtë pajisje.')}}
function at150MovieTile(item){const existing=inLibrary(item),url=validPoster(item.cover),id=escapeHTML(item.key),provider=escapeHTML(item.source==='Cinemeta'?'IMDb/Cinemeta':item.source);return '<article class="catalog-card at150-movie-result"><button class="catalog-open" type="button" data-movie-preview="'+id+'" aria-label="Hap '+escapeHTML(item.title)+'"><div class="catalog-art">'+(url?'<img src="'+escapeHTML(url)+'" alt="Posteri i '+escapeHTML(item.title)+'" loading="lazy" referrerpolicy="no-referrer">':'')+'<span class="catalog-type">FILM</span>'+(item.score!=null?'<span class="catalog-score">★ '+(Number(item.score)/10).toFixed(1)+'</span>':'')+'</div></button><div class="catalog-info"><h4><button type="button" class="catalog-title-open" data-movie-preview="'+id+'">'+escapeHTML(item.title)+' ›</button></h4><div class="catalog-english">'+escapeHTML(item.english&&item.english!==item.title?item.english:'Film')+'</div><div class="catalog-meta">'+(item.year||'Viti ?')+' · '+provider+'</div><p class="catalog-synopsis">'+escapeHTML(item.synopsis||'Hap filmin për detaje, rating dhe për ta shtuar në listë.')+'</p><div class="catalog-action">'+(existing?'<button class="ghost in-library" data-detail="'+escapeHTML(existing.id)+'">✓ Në bibliotekë · Hape</button>':'<button class="primary" data-movie-preview="'+id+'">Shiko filmin ›</button>')+'</div></div></article>'}
const at150PriorCatalogTile=catalogTile;catalogTile=function(item){return item?.kind==='movie'?at150MovieTile(item):at150PriorCatalogTile(item)};
const at150PriorSearchCatalog=searchCatalog;searchCatalog=async function(q,page=1){const priorWork=at150PriorSearchCatalog(q,page);if(page!==1||!window.ATMovies12150){await priorWork;return}const request=catalogRequest,signal=catalogController?.signal;const movieWork=window.ATMovies12150.search(q,{tmdbToken:tmdbToken(),omdbKey:omdbKey(),signal}).catch(err=>{if(!signal?.aborted)console.warn('Movie search failed',err);return {items:[],provider:'Wikidata'}});await priorWork;if(request!==catalogRequest||catalogQuery!==q||signal?.aborted)return;const result=await movieWork;if(request!==catalogRequest||catalogQuery!==q||signal?.aborted)return;const prior=new Set(catalogItems.map(x=>x.key));for(const item of result.items||[])if(!prior.has(item.key)){catalogItems.push(item);prior.add(item.key)}renderCatalog();const stateEl=$('catalog-state');if(stateEl){const extra=result.provider?' · Filma: '+result.provider:'';stateEl.textContent=stateEl.textContent.replace('Anime & Seriale TV','Anime · Seriale TV · Filma')+extra}};
let pendingMoviePreview=null,openingMoviePreview=false;
async function at150OpenMovie(item){if(!item||openingMoviePreview)return;const existing=inLibrary(item);if(existing){openDetail(existing.id);return}openingMoviePreview=true;try{const detail=await window.ATMovies12150.details(item,{tmdbToken:tmdbToken(),omdbKey:omdbKey()});pendingMoviePreview=detail;previewKey=item.key;detailId=null;$('top-results').classList.add('hidden');$('detail-heading').textContent='Detajet e filmit';const poster=validPoster(detail.cover)?'<img src="'+escapeHTML(detail.cover)+'" alt="Posteri i '+escapeHTML(detail.title)+'" loading="lazy">':'';window.ATHTML.renderHTML($('detail-body'),'<div class="at150-movie-hero">'+(detail.backdrop?'<div class="at150-backdrop"><img src="'+escapeHTML(validPoster(detail.backdrop))+'" alt="" aria-hidden="true"></div>':'')+'<div class="detail-top at150-preview-top"><div class="detail-poster preview-poster">'+poster+'</div><div class="detail-content preview-info"><span class="eyebrow">'+escapeHTML(detail.source)+' · FILM</span><h3>'+escapeHTML(detail.title)+'</h3><div class="at150-meta">'+(detail.year?'<span class="pill">'+detail.year+'</span>':'')+(detail.runtime?'<span class="pill">'+detail.runtime+' min</span>':'')+(detail.genre?'<span class="pill">'+escapeHTML(detail.genre)+'</span>':'')+(detail.communityScore!=null?'<span class="pill">★ '+(detail.communityScore/10).toFixed(1)+' '+escapeHTML(detail.communitySource)+'</span>':'')+'</div><p class="preview-synopsis">'+escapeHTML(detail.synopsis||'Përshkrimi nuk është i disponueshëm.')+'</p><div class="preview-add-row"><button type="button" class="primary" data-movie-add="completed">✓ E kam parë</button><button type="button" class="ghost" data-movie-add="planning">+ Plan to Watch</button></div></div></div></div><section class="details-section at150-movie-facts"><h4>Detaje</h4><div>'+(detail.director?'<span><b>Regjia</b>'+escapeHTML(detail.director)+'</span>':'')+(detail.cast?'<span><b>Cast</b>'+escapeHTML(detail.cast)+'</span>':'')+(detail.imdbRating!=null?'<span><b>IMDb</b>★ '+detail.imdbRating.toFixed(1)+'/10</span>':'')+(detail.collectionName?'<span><b>Franchise</b>'+escapeHTML(detail.collectionName)+'</span>':'')+'</div></section>');showModal('detail-modal')}catch(err){console.warn('Movie preview failed',err);notify('Filmi nuk u ngarkua: '+String(err.message||'provo përsëri').slice(0,100))}finally{openingMoviePreview=false}}
async function at150OpenMovieByKey(key){const item=catalogItems.find(x=>x.kind==='movie'&&x.key===key);if(item)await at150OpenMovie(item)}
async function at150OpenTMDBMovie(id){await at150OpenMovie({kind:'movie',key:'movie-tmdb-'+id,source:'TMDB',sourceId:String(id),tmdbId:String(id),title:'Film',format:'MOVIE'})}
function at150MovieEntry(detail,status){const seen=status==='completed',seasonId='movie-'+(detail.tmdbId||detail.imdbId||uuid());return normalized({id:(detail.tmdbId?'tmdb-'+detail.tmdbId:detail.imdbId?'imdb-'+detail.imdbId:'wikidata-'+detail.sourceId),title:detail.title,status:seen?'completed':'planning',year:detail.year,genre:detail.genre,cover:detail.cover,communityScore:detail.communityScore,communitySource:detail.communitySource,source:detail.source,sourceId:detail.sourceId,format:'MOVIE',sourceUrl:detail.sourceUrl,synopsis:detail.synopsis,hydrated:true,tmdbId:detail.tmdbId,imdbId:detail.imdbId,imdbRating:detail.imdbRating,imdbVotes:detail.imdbVotes,imdbCheckedAt:detail.imdbRating!=null?now():'',runtime:detail.runtime,director:detail.director,cast:detail.cast,backdrop:detail.backdrop,releaseDate:detail.releaseDate,movieWatchCount:seen?1:0,lastWatchedAt:seen?now():'',collectionId:detail.collectionId,collectionName:detail.collectionName,createdAt:now(),updatedAt:now(),seasons:[{id:seasonId,title:'Film',subtitle:detail.title,total:1,watched:seen?[1]:[],source:detail.source,sourceId:detail.sourceId,format:'MOVIE',year:detail.year,releaseStart:detail.releaseDate,releaseStatus:'FINISHED',airedCount:1,synopsis:detail.synopsis,sourceUrl:detail.sourceUrl,episodes:[{number:1,title:detail.title,aired:detail.releaseDate,airedAt:detail.releaseDate}]}]})}
function at150AddMovie(status){const detail=pendingMoviePreview;if(!detail)return;const before=state.anime.slice(),entry=at150MovieEntry(detail,status);const existing=inLibrary({kind:'movie',source:entry.source,sourceId:entry.sourceId,tmdbId:entry.tmdbId,imdbId:entry.imdbId});if(existing){pendingMoviePreview=null;openDetail(existing.id);return}state.anime.unshift(entry);if(status==='completed')state.history.push({eventId:uuid(),id:entry.id,episode:1,action:'movie-watched',seasonId:entry.seasons[0].id,date:now(),diaryNote:'',diaryRating:null});if(!save()){state.anime=before;return}at150FlushCloud();pendingMoviePreview=null;closeModal('detail-modal');render();renderHome();openDetail(entry.id);notify(status==='completed'?'Filmi u shtua si i parë ✓':'Filmi u shtua te Plan to Watch ✓')}
function at150SetMovieSeen(id,mode){const idx=state.anime.findIndex(x=>x.id===id),a=state.anime[idx];if(!a||!isLiveMovie(a))return;const before=JSON.parse(JSON.stringify(a)),hist=state.history.slice(),s=a.seasons[0];if(!s)return;const stamp=now();if(mode==='unwatch'){s.watched=[];a.status='planning';state.history.push({eventId:uuid(),id:a.id,episode:1,action:'movie-unwatched',seasonId:s.id,date:stamp,diaryNote:'',diaryRating:null})}else{if(!s.watched.includes(1))s.watched=[1];a.status='completed';a.movieWatchCount=Math.max(0,Number(a.movieWatchCount)||0)+1;a.lastWatchedAt=stamp;state.history.push({eventId:uuid(),id:a.id,episode:1,action:mode==='rewatch'?'movie-rewatched':'movie-watched',seasonId:s.id,date:stamp,diaryNote:'',diaryRating:null})}syncTotals(a);a.updatedAt=stamp;if(!save()){state.anime[idx]=before;state.history=hist;return}at150FlushCloud();render();renderHome();renderDetail(id);notify(mode==='rewatch'?'Rewatch u regjistrua ✓':mode==='unwatch'?'Filmi u kthye te Plan to Watch':'Filmi u shënua si parë ✓')}
function at150SaveNotes(id){const a=state.anime.find(x=>x.id===id),el=$('detail-body')?.querySelector('[data-movie-notes]');if(!a||!el)return;a.notes=String(el.value||'').slice(0,2500);a.updatedAt=now();if(save())at150FlushCloud();renderDetail(id);notify('Shënimet u ruajtën ✓')}
async function at150LoadCollection(a){const box=$('movie-collection');if(!box||!a.collectionId||!tmdbToken())return;window.ATHTML.renderHTML(box,'<p class="season-note">Po ngarkohet franchise…</p>');try{const parts=await window.ATMovies12150.collection(a.collectionId,tmdbToken());window.ATHTML.renderHTML(box,parts.length?'<div class="at150-collection-strip">'+parts.map(p=>{const found=inLibrary(p);return '<button type="button" class="at150-collection-card" data-movie-tmdb-id="'+escapeHTML(p.tmdbId)+'">'+(p.cover?'<img src="'+escapeHTML(p.cover)+'" alt="" loading="lazy">':'')+'<strong>'+escapeHTML(p.title)+'</strong><small>'+(p.year||'Viti ?')+(found?' · ✓ Në bibliotekë':'')+'</small></button>'}).join('')+'</div>':'<p class="season-note">Nuk u gjetën filma të tjerë në këtë collection.</p>')}catch(err){window.ATHTML.renderHTML(box,'<p class="season-note">Franchise nuk u ngarkua tani.</p>')}}
function at150RenderMovieDetail(a){detailId=a.id;activeSeasonId=a.seasons[0]?.id||null;const seen=movieWatched(a),watchCount=Math.max(Number(a.movieWatchCount)||0,seen?1:0);$('detail-heading').textContent='Detajet e filmit';window.ATHTML.renderHTML($('detail-body'),'<div class="at150-movie-hero">'+(a.backdrop?'<div class="at150-backdrop"><img src="'+escapeHTML(validPoster(a.backdrop))+'" alt="" aria-hidden="true"></div>':'')+'<div class="detail-top at150-movie-detail">'+cover(a,'detail-poster')+'<div class="detail-content"><div class="eyebrow">'+escapeHTML(a.source)+' · FILM · '+(seen?'PARË':'PLAN TO WATCH')+'</div><h3>'+escapeHTML(a.title)+'</h3><div class="at150-meta">'+(a.year?'<span class="pill">'+a.year+'</span>':'')+(a.runtime?'<span class="pill">'+a.runtime+' min</span>':'')+(a.genre?'<span class="pill">'+escapeHTML(a.genre)+'</span>':'')+(a.collectionName?'<span class="pill">◆ '+escapeHTML(a.collectionName)+'</span>':'')+'</div><div class="rating-deck"><label class="field">Vlerësimi im / 10<select class="detail-select" data-movie-rating="'+escapeHTML(a.id)+'">'+ratingOptions(a.rating)+'</select></label><div class="rating-chip"><small>'+escapeHTML(a.communitySource||'Komuniteti')+'</small><b>'+(a.communityScore!=null?'★ '+(a.communityScore/10).toFixed(1)+'/10':'—')+'</b></div><div class="rating-chip imdb-chip"><small>IMDb</small><b>'+(a.imdbRating!=null?'★ '+Number(a.imdbRating).toFixed(1)+'/10':'—')+'</b></div></div><div class="detail-actions">'+(!seen?'<button class="primary" data-movie-seen="'+escapeHTML(a.id)+'">✓ Shëno si parë</button>':'<button class="primary" data-movie-rewatch="'+escapeHTML(a.id)+'">↻ Rewatch +1</button><button class="ghost" data-movie-unwatch="'+escapeHTML(a.id)+'">Hiq shënimin</button>')+'<button class="ghost" data-favorite="'+escapeHTML(a.id)+'">'+(a.favorite?'♥ Hiq nga të preferuarat':'♡ Shto te të preferuarat')+'</button><button class="ghost" data-pro-action="collection-pick" data-id="'+escapeHTML(a.id)+'">▤ Shto në listë</button><button class="danger" data-remove-anime="'+escapeHTML(a.id)+'">Hiqe nga biblioteka</button></div><div class="at150-watch-stat"><b>'+watchCount+'</b><span>'+(watchCount===1?'shikim':'shikime')+(a.lastWatchedAt?' · fundit '+escapeHTML(a.lastWatchedAt.slice(0,10)):'')+'</span></div></div></div></div>'+(a.synopsis?'<section class="details-section"><h4>Përshkrimi</h4><p class="notes">'+escapeHTML(a.synopsis)+'</p></section>':'')+'<section class="details-section at150-movie-facts"><h4>Filmi</h4><div>'+(a.director?'<span><b>Regjia</b>'+escapeHTML(a.director)+'</span>':'')+(a.cast?'<span><b>Cast</b>'+escapeHTML(a.cast)+'</span>':'')+(a.releaseDate?'<span><b>Publikimi</b>'+escapeHTML(a.releaseDate)+'</span>':'')+(a.imdbId?'<span><b>IMDb</b><a target="_blank" rel="noopener noreferrer" href="https://www.imdb.com/title/'+encodeURIComponent(a.imdbId)+'/">'+escapeHTML(a.imdbId)+' ↗</a></span>':'')+'</div></section><section class="details-section"><h4>Shënimet e mia</h4><textarea class="at150-notes" data-movie-notes="'+escapeHTML(a.id)+'" maxlength="2500" placeholder="Çfarë mendove për filmin?">'+escapeHTML(a.notes||'')+'</textarea><button class="ghost" data-movie-save-notes="'+escapeHTML(a.id)+'">Ruaj shënimet</button></section>'+(a.collectionId?'<section class="details-section"><h4>'+escapeHTML(a.collectionName||'Franchise')+'</h4><div id="movie-collection"></div></section>':'')+'<p class="at150-attribution">Cinemeta përdor IMDb IDs për kërkimin bazë pa key; TMDB/OMDb shtojnë metadata kur janë lidhur.</p>');if(a.collectionId)void at150LoadCollection(a)}
const at150PriorDetail=renderDetail;renderDetail=function(id){const a=state.anime.find(x=>x.id===id);if(a&&isLiveMovie(a))return at150RenderMovieDetail(a);return at150PriorDetail(id)};
const at150PriorOpen=openDetail;openDetail=function(id){const a=state.anime.find(x=>x.id===id);if(a&&isLiveMovie(a)){previewKey=null;$('top-results').classList.add('hidden');detailId=id;activeSeasonId=a.seasons[0]?.id||null;renderDetail(id);showModal('detail-modal');return}return at150PriorOpen(id)};
const at150PriorHomeCard=homeCard;homeCard=function(a){if(!isLiveMovie(a))return at150PriorHomeCard(a);const seen=movieWatched(a);return '<article class="home-anime at150-home-movie">'+cover(a,'home-poster')+'<div class="home-card-body"><span class="eyebrow">🎬 FILM · '+(seen?'PARË':'PLAN TO WATCH')+(a.favorite?' · ♥':'')+'</span><h4>'+escapeHTML(a.title)+'</h4><p>'+(a.runtime?a.runtime+' min · ':'')+(a.year||'Viti ?')+(a.rating!=null?' · ★ '+a.rating+'/10':'')+'</p><div class="home-card-actions"><button class="ghost" data-detail="'+escapeHTML(a.id)+'">Hap filmin</button>'+(!seen?'<button class="primary" data-movie-seen="'+escapeHTML(a.id)+'">✓ Parë</button>':'<button class="primary" data-movie-rewatch="'+escapeHTML(a.id)+'">↻ Rewatch</button>')+'</div></div></article>'};
function at150EnhanceMovieCards(){for(const card of $('anime-grid')?.querySelectorAll('.anime-card')||[]){const id=card.querySelector('[data-detail]')?.dataset.detail,a=state.anime.find(x=>x.id===id);if(!isLiveMovie(a))continue;card.dataset.media='movie';const row=card.querySelector('.card-row');if(row)window.ATHTML.renderHTML(row,'<span>🎬 '+(movieWatched(a)?'Parë':'Në listë')+'</span><div class="progress"><span class="'+window.ATHTML.percentClass((movieWatched(a)?100:0),'w')+'"></span></div><span>'+(a.runtime?a.runtime+' min':'Film')+'</span>');const plus=card.querySelector('.plus');if(plus){plus.removeAttribute('data-next');plus.disabled=false;plus.textContent=movieWatched(a)?'↻':'✓';plus.title=movieWatched(a)?'Regjistro rewatch':'Shëno filmin si parë';if(movieWatched(a))plus.dataset.movieRewatch=a.id;else plus.dataset.movieSeen=a.id}}if(filter==='movies'){$('library-title').textContent='Filma';$('library-subtitle').textContent=state.anime.filter(isMovieAnime).length+' filma në bibliotekë'}}
function at150UpdateStats(){const movies=state.anime.filter(isLiveMovie),seen=movies.filter(movieWatched);$('home-movie-count')?.replaceChildren(document.createTextNode(String(movies.length)));$('stat-movies')?.replaceChildren(document.createTextNode(String(seen.length)));$('account-stat-movies')?.replaceChildren(document.createTextNode(String(movies.length)));at150ProviderBadge()}
const at150PriorRender=render;render=function(){const x=at150PriorRender();at150EnhanceMovieCards();at150UpdateStats();return x};
const at150PriorHome=renderHome;renderHome=function(){const x=at150PriorHome();at150UpdateStats();return x};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.moviePreview)void at150OpenMovieByKey(b.dataset.moviePreview);if(b.dataset.movieAdd)at150AddMovie(b.dataset.movieAdd);if(b.dataset.movieSeen)at150SetMovieSeen(b.dataset.movieSeen,'seen');if(b.dataset.movieRewatch)at150SetMovieSeen(b.dataset.movieRewatch,'rewatch');if(b.dataset.movieUnwatch)at150SetMovieSeen(b.dataset.movieUnwatch,'unwatch');if(b.dataset.movieSaveNotes)at150SaveNotes(b.dataset.movieSaveNotes);if(b.dataset.movieTmdbId)void at150OpenTMDBMovie(b.dataset.movieTmdbId);if(b.id==='tmdb-save-token')at150SetTMDB();if(b.id==='tmdb-clear-token'){localStorage.removeItem(TMDB_TOKEN_STORAGE);$('tmdb-token-input').value='';at150ProviderBadge();notify('TMDB u hoq nga kjo pajisje.')}});
document.addEventListener('change',e=>{const el=e.target;if(el.matches('[data-movie-rating]')){const a=state.anime.find(x=>x.id===el.dataset.movieRating);if(!a)return;a.rating=el.value===''?null:Number(el.value);a.updatedAt=now();if(save())at150FlushCloud();render();renderHome();renderDetail(a.id)}});

/* AnimeTrack 13.1 — Franchise Timeline 2.0 + per-part / arc ratings. */
function at131RatedArcs(a){
 const arcs=[];for(const s of visibleSeasons(a))for(const arc of s.arcRatings||[]){const rating=Number(arc?.rating);if(Number.isFinite(rating)&&rating>0)arcs.push({season:s,arc,rating})}
 if(!arcs.length)return {count:0,average:null,best:null};
 const average=arcs.reduce((n,x)=>n+x.rating,0)/arcs.length,best=arcs.slice().sort((x,y)=>y.rating-x.rating)[0];
 return {count:arcs.length,average:Math.round(average*10)/10,best};
}
function at131PartMeta(s){return window.ATFranchise1212?.partMeta?.(s)||{icon:'◆',label:formatLabel(s?.format),date:String(s?.releaseStart||'').slice(0,10),year:s?.year||null}}
let timelineFilter137='all',timelineOwner137='';
function at131TimelineHTML(a){
 if(timelineOwner137!==a.id){timelineOwner137=a.id;timelineFilter137='all'}
 const parts=timelineSort(visibleSeasons(a)),summary=window.ATFranchise1212?.ratingSummary?.(parts)||{count:0,average:null,best:null},arcs=at131RatedArcs(a);
 const best=summary.best?escapeHTML(summary.best.title)+' · ★ '+Number(summary.best.rating).toFixed(1):'—';
 return `<section class="at131-franchise" aria-label="Franchise Timeline 2.0">
  <div class="at131-head"><div><span class="eyebrow">SERIA E PLOTË</span><h4>Historia e plotë, në rend publikimi</h4><p>Sezonet dhe filmat, nga publikimi i parë te më i fundit. Zgjidh një pjesë për të vazhduar shikimin.</p></div>
   <div class="at131-summary">
    <span><small>Mesatarja e pjesëve</small><b>${summary.average==null?'—':'★ '+summary.average.toFixed(1)}</b><em>${summary.count}/${parts.length} të vlerësuara</em></span>
    <span><small>Arc ratings</small><b>${arcs.average==null?'—':'★ '+arcs.average.toFixed(1)}</b><em>${arcs.count} arc${arcs.count===1?'':'e'}</em></span>
    <span><small>Pjesa më e vlerësuar</small><b class="at131-best">${best}</b></span>
   </div>
  </div>
  <div class="at137-timeline-tools"><div class="at137-timeline-filters" role="group" aria-label="Filtro pjesët e serisë">${[['all','Gjithçka'],['seasons','Sezonet'],['movies','Filmat']].map(([key,label])=>`<button type="button" data-at137-timeline="${key}" data-id="${escapeHTML(a.id)}" aria-pressed="${timelineFilter137===key}">${label} · ${parts.filter(p=>key==='all'||(key==='movies'?mediaFormat(p.format)==='MOVIE':isSeriesFormat(p.format))).length}</button>`).join('')}</div><p>Renditur sipas datës së publikimit</p></div>
  <div class="at131-track">${parts.map((part,index)=>{const meta=at131PartMeta(part),released=releasedCount(part),done=released>0&&part.watched.length>=released,active=part.id===activeSeasonId;return `
   <article class="at131-part ${active?'active':''}" data-at131-part-card="${escapeHTML(part.id)}" data-part-format="${escapeHTML(mediaFormat(part.format))}" data-part-done="${done}" ${timelineFilter137!=='all'&&!(timelineFilter137==='movies'?mediaFormat(part.format)==='MOVIE':isSeriesFormat(part.format))?'hidden':''}>
    <button type="button" class="at131-open" data-at131-part="${escapeHTML(part.id)}" data-id="${escapeHTML(a.id)}" aria-current="${active?'true':'false'}">
     <span class="at131-step">${String(index+1).padStart(2,'0')}</span><span class="at131-icon">${meta.icon}</span>
     <span class="at131-copy"><strong>${escapeHTML(part.title||meta.label+' '+(index+1))}<span class="at137-part-kind">${escapeHTML(meta.label)}</span></strong><small>${escapeHTML(part.subtitle||meta.label)} · ${escapeHTML(meta.date||String(meta.year||'Data ?'))}</small><em>${part.watched.length}/${released||part.total||0} ${mediaFormat(part.format)==='MOVIE'?'film':'episode'}${done?' · ✓ E përfunduar':''}</em><span class="at137-part-progress" aria-hidden="true"><span class="${window.ATHTML.percentClass(released?Math.min(100,Math.round(part.watched.length/released*100)):0,'w')}"></span></span></span>
    </button>
    <label class="at131-rate"><span>Nota ime</span><select data-at131-part-rating="${escapeHTML(part.id)}" data-id="${escapeHTML(a.id)}" aria-label="Vlerësimi për ${escapeHTML(part.title||meta.label)}">${ratingOptions(part.myRating)}</select></label>
    <div class="at131-score"><small>Komuniteti</small><b>${part.communityScore!=null?'★ '+(part.communityScore/10).toFixed(1):'—'}</b></div>
   </article>`}).join('')}${!parts.some(p=>timelineFilter137==='all'||(timelineFilter137==='movies'?mediaFormat(p.format)==='MOVIE':isSeriesFormat(p.format)))?'<p class="at137-timeline-empty">Nuk ka pjesë të këtij lloji në këtë seri.</p>':''}</div>
 </section>`;
}
function at131ArcHTML(a,s){
 const arcs=(Array.isArray(s.arcRatings)?s.arcRatings:[]).slice().sort((x,y)=>Number(x.start)-Number(y.start)||String(x.name).localeCompare(String(y.name)));
 return `<section class="at131-arcs"><div class="at131-arc-head"><div><span class="eyebrow">STORY ARCS · ${escapeHTML(s.title)}</span><h4>Vlerësimet e arc-eve të mia</h4><p>Ndaji episodet në arc-e sipas mënyrës si do t'i mbash mend. Nuk ndryshon progresin.</p></div><span class="at131-arc-count">${arcs.length} arc${arcs.length===1?'':'e'}</span></div>
 <div class="at131-arc-list">${arcs.length?arcs.map(arc=>`<article class="at131-arc" data-at131-arc-row="${escapeHTML(arc.id)}"><button type="button" class="at131-arc-open" data-at131-arc-open="${escapeHTML(arc.id)}" data-id="${escapeHTML(a.id)}" data-season="${escapeHTML(s.id)}"><strong>${escapeHTML(arc.name)}</strong><small>Ep. ${arc.start}${arc.end!==arc.start?'–'+arc.end:''}</small></button><label>Nota<select data-at131-arc-rating="${escapeHTML(arc.id)}" data-id="${escapeHTML(a.id)}" data-season="${escapeHTML(s.id)}">${ratingOptions(arc.rating)}</select></label><button type="button" class="ghost at131-arc-edit" data-at131-arc-edit="${escapeHTML(arc.id)}" data-id="${escapeHTML(a.id)}" data-season="${escapeHTML(s.id)}">✎</button><button type="button" class="ghost at131-arc-delete" data-at131-arc-delete="${escapeHTML(arc.id)}" data-id="${escapeHTML(a.id)}" data-season="${escapeHTML(s.id)}">×</button></article>`).join(''):'<p class="at131-empty">Ende pa arc-e. Shto të parin poshtë.</p>'}</div>
 <div class="at131-arc-add"><input data-at131-arc-name maxlength="120" placeholder="Emri i arc-ut, p.sh. Shibuya Incident"><label>Nga ep.<input data-at131-arc-start type="number" min="1" max="10000" value="1" inputmode="numeric"></label><label>Deri ep.<input data-at131-arc-end type="number" min="1" max="10000" value="${Math.max(1,releasedCount(s)||s.total||1)}" inputmode="numeric"></label><button type="button" class="primary" data-at131-arc-add="${escapeHTML(s.id)}" data-id="${escapeHTML(a.id)}">+ Shto arc</button></div>
 </section>`;
}
function at131EnhanceDetail(id){
 const a=state.anime.find(x=>x.id===id),root=$('detail-body');if(!a||!root||isLiveMovie(a))return;
 const topline=root.querySelector('.seasons-topline'),scroller=root.querySelector('.season-scroller'),active=a.seasons.find(x=>x.id===activeSeasonId);
 if(topline&&!root.querySelector('.at131-franchise'))window.ATHTML.insertHTML(topline,'afterend',at131TimelineHTML(a));
 if(scroller)scroller.classList.add('at131-legacy-tabs');
 if(active){const banner=root.querySelector('.season-banner');if(banner&&!banner.querySelector('.at131-arcs'))window.ATHTML.insertHTML(banner,'beforeend',at131ArcHTML(a,active))}
}
function at131OpenPart(id,seasonId){
 const a=state.anime.find(x=>x.id===id),s=a?.seasons.find(x=>x.id===seasonId&&!x.hidden);if(!s)return;
 activeSeasonId=s.id;const resume=window.ATResume123.resolve(a,state.history,releasedCount);episodePage=resume?.seasonId===s.id?resume.page:0;renderDetail(id);void loadSeasonEpisodes(id,s.id,episodePage);
}
function at131AddArc(id,seasonId){
 const a=state.anime.find(x=>x.id===id),s=a?.seasons.find(x=>x.id===seasonId),root=$('detail-body');if(!a||!s||!root)return;
 const name=String(root.querySelector('[data-at131-arc-name]')?.value||'').replace(/\s+/g,' ').trim().slice(0,120),start=Number(root.querySelector('[data-at131-arc-start]')?.value),end=Number(root.querySelector('[data-at131-arc-end]')?.value),limit=s.total||Math.max(releasedCount(s),start,end);
 if(!name){notify('Vendos emrin e arc-ut.');return}if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>Math.max(1,limit)){notify('Kontrollo intervalin e episodeve të arc-ut.');return}
 const before=JSON.parse(JSON.stringify(s.arcRatings||[]));s.arcRatings=[...(s.arcRatings||[]),window.ATFranchise1212.normalizeArc({id:'arc-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),name,start,end,rating:null},(s.arcRatings||[]).length)];a.updatedAt=now();
 if(!save()){s.arcRatings=before;return}renderDetail(id);notify('Arc-u u shtua ✓');
}
function at131EditArc(id,seasonId,arcId){
 const a=state.anime.find(x=>x.id===id),s=a?.seasons.find(x=>x.id===seasonId),arc=s?.arcRatings?.find(x=>x.id===arcId);if(!a||!s||!arc)return;
 const old=JSON.parse(JSON.stringify(arc)),name=prompt('Emri i arc-ut:',arc.name);if(name===null)return;const start=prompt('Episodi i parë:',String(arc.start));if(start===null)return;const end=prompt('Episodi i fundit:',String(arc.end));if(end===null)return;const note=prompt('Shënim i shkurtër (opsionale):',arc.note||'');if(note===null)return;
 const next=window.ATFranchise1212.normalizeArc({...arc,name,start:Number(start),end:Number(end),note},0),limit=s.total||10000;if(!next.name||next.start<1||next.end<next.start||next.end>limit){notify('Të dhënat e arc-ut nuk janë të vlefshme.');return}
 Object.assign(arc,next);a.updatedAt=now();if(!save()){Object.assign(arc,old);return}renderDetail(id);notify('Arc-u u përditësua ✓');
}
function at131DeleteArc(id,seasonId,arcId){
 const a=state.anime.find(x=>x.id===id),s=a?.seasons.find(x=>x.id===seasonId);if(!a||!s)return;const before=JSON.parse(JSON.stringify(s.arcRatings||[]));s.arcRatings=(s.arcRatings||[]).filter(x=>x.id!==arcId);a.updatedAt=now();if(!save()){s.arcRatings=before;return}renderDetail(id);notify('Arc-u u hoq.');
}
const at131PriorDetail=renderDetail;renderDetail=function(id){const result=at131PriorDetail(id);at131EnhanceDetail(id);return result};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.at137Timeline){timelineFilter137=b.dataset.at137Timeline;renderDetail(b.dataset.id)}if(b.dataset.at131Part)at131OpenPart(b.dataset.id,b.dataset.at131Part);if(b.dataset.at131ArcAdd)at131AddArc(b.dataset.id,b.dataset.at131ArcAdd);if(b.dataset.at131ArcEdit)at131EditArc(b.dataset.id,b.dataset.season,b.dataset.at131ArcEdit);if(b.dataset.at131ArcDelete)at131DeleteArc(b.dataset.id,b.dataset.season,b.dataset.at131ArcDelete);if(b.dataset.at131ArcOpen){const a=state.anime.find(x=>x.id===b.dataset.id),s=a?.seasons.find(x=>x.id===b.dataset.season),arc=s?.arcRatings?.find(x=>x.id===b.dataset.at131ArcOpen);if(a&&s&&arc){activeSeasonId=s.id;episodePage=Math.floor((arc.start-1)/24);renderDetail(a.id);void loadSeasonEpisodes(a.id,s.id,episodePage);requestAnimationFrame(()=>$('detail-body').querySelector('[data-season-ep][data-ep="'+arc.start+'"]')?.scrollIntoView({block:'center',behavior:'smooth'}))}}});
document.addEventListener('change',e=>{const el=e.target;if(el.matches('[data-at131-part-rating]')){const a=state.anime.find(x=>x.id===el.dataset.id);if(a)setPersonalRating(a,el.value,el.dataset.at131PartRating)}if(el.matches('[data-at131-arc-rating]')){const a=state.anime.find(x=>x.id===el.dataset.id),s=a?.seasons.find(x=>x.id===el.dataset.season),arc=s?.arcRatings?.find(x=>x.id===el.dataset.at131ArcRating);if(!a||!s||!arc)return;const before=arc.rating;arc.rating=el.value===''?null:Math.max(.5,Math.min(10,Number(el.value)||.5));a.updatedAt=now();if(!save()){arc.rating=before;return}renderDetail(a.id);notify('Vlerësimi i arc-ut u ruajt ✓')}});

/* AnimeTrack 13.3 — Where to Watch is attached after every detail renderer. */
const at133PriorDetail=renderDetail;renderDetail=function(id){
 const result=at133PriorDetail(id),a=state.anime.find(x=>x.id===id),root=$('detail-body');
 if(a&&root&&proApp?.modules?.watch){const part=a.seasons.find(x=>x.id===activeSeasonId)||a.seasons[0];void proApp.modules.watch.attach(root,a,part)}
 return result;
};

/* AnimeTrack 13.4 — Rich Details, Cast & Staff explorer. */
const at134PriorDetail=renderDetail;renderDetail=function(id){
 const result=at134PriorDetail(id),a=state.anime.find(x=>x.id===id),root=$('detail-body');
 if(a&&root&&proApp?.modules?.rich){const part=a.seasons.find(x=>x.id===activeSeasonId)||a.seasons[0];void proApp.modules.rich.attach(root,a,part)}
 return result;
};

at150ProviderBadge();

})();
