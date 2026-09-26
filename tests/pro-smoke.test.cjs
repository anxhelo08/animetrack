const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const names=['pro-recommendations','pro-calendar-wrapped','pro-profiles','pro-friends','pro-moderation','pro-notifications','pro-rewatch','pro-home','pro-iphone','pro-daily-115','pro-journey-108','pro-smart-airing-109','pro-push-109','pro-collections-110','pro-experience-112','pro-features'];
function load(extra={}){
 const sandbox={window:{},console,Date,Map,Set,Promise,setTimeout,clearTimeout,AbortController,...extra};
 vm.createContext(sandbox);
 for(const name of names)vm.runInContext(fs.readFileSync(path.join(root,'assets',name+'.js'),'utf8'),sandbox,{filename:name+'.js'});
 return sandbox.window;
}
function context(){return{el:()=>null,esc:x=>String(x??''),state:()=>({anime:[],history:[],preferences:{weeklyGoal:10,notificationRead:[]}}),user:()=>null,client:()=>null,accountName:()=> 'Guest',poster:()=>'',count:()=>0,activity:()=>[],upcoming:()=>[],genres:()=>[],seriesRoot:()=>'',mapAniList:()=>({}),inLibrary:()=>null,previewItem:()=>{},rerender:()=>{},released:()=>0,releasedTotal:()=>0,percent:()=>0,nextEpisode:()=>null,markNext:()=>{},openFilter:()=>{},markEpisode:()=>{},refreshAiring:()=>{},isMovie:()=>false,uuid:()=> 'test',toast:()=>{},save:()=>true,openAnime:()=>{},refreshDetail:()=>{},navigate:()=>{},setLocalView:()=>{}}}
test('all feature modules parse and export factories',()=>{const w=load();for(const key of ['ATRecommendations','ATCalendarWrapped','ATProfiles','ATFriends','ATModeration','ATNotifications','ATRewatch','ATSmartAiring','ATPush109','ATCollections110','AnimeTrackPro','ATExperience112'])assert.equal(typeof w[key],'function')});
test('core feature views render with an empty personal library',()=>{const w=load(),c=context(),p=w.ATProfiles(c);assert.match(w.ATRecommendations(c).render(),/Për ty/);assert.match(w.ATCalendarWrapped(c).calendar(),/Kalendari/);assert.match(w.ATCalendarWrapped(c).wrapped(),/Wrapped/);assert.match(p.render(),/Profili/);assert.match(w.ATFriends(c,p).render(),/Hyr/);assert.match(w.ATNotifications(c).render(),/Njoftimet/);assert.equal(w.ATRewatch(c).render('missing'),'');assert.equal(typeof w.ATHome(c).render,'function');assert.equal(typeof w.AnimeTrackPro(c).init,'function')});
test('site references every module, PWA resources, and source files exist',()=>{const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const name of names)assert.ok(html.includes('/assets/'+name+'.js'),name);for(const p of ['assets/app.js','assets/app.css','assets/pro-features.css','assets/pro-visual-101.css','assets/pro-home-102.css','assets/pro-mobile-103.css','assets/pro-compact-104.css','assets/pro-iphone-105.css','assets/pro-desktop-106.css','assets/pro-quality-107.css','assets/pro-journey-108.css','assets/pro-airing-109.css','assets/pro-collections-110.css','assets/pro-ios-polish-1101.css','assets/pro-social-111.css','assets/pro-experience-112.css','assets/pro-daily-115.css','assets/pro-daily-115.js','manifest.webmanifest','sw.js','icon.svg'])assert.ok(fs.existsSync(path.join(root,p)),p);assert.match(html,/AnimeTrack 11\.6\.1/);assert.doesNotThrow(()=>JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8')))});
test('core JS parses after modular extraction',()=>{const src=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');assert.doesNotThrow(()=>new vm.Script(src));assert.match(src,/rewatches:/);assert.match(src,/notificationRead:/)});

test('personal discovery filters duplicates, opens preview and remembers hidden series',async()=>{
 const store=new Map(),media=[
  {id:11,idMal:101,title:{romaji:'Astral Journey'},genres:['Fantasy','Action'],averageScore:88,popularity:140000,episodes:12,format:'TV',seasonYear:2024,coverImage:{large:'https://example.com/11.jpg'}},
  {id:12,idMal:102,title:{romaji:'Astral Journey Season 2'},genres:['Fantasy','Action'],averageScore:91,popularity:100000,episodes:12,format:'TV',seasonYear:2025,coverImage:{large:'https://example.com/12.jpg'}},
  {id:13,idMal:103,title:{romaji:'Quiet Rain'},genres:['Slice of Life'],averageScore:82,popularity:12000,episodes:12,format:'TV',seasonYear:2023,coverImage:{large:'https://example.com/13.jpg'}},
  {id:14,idMal:104,title:{romaji:'Space Mystery'},genres:['Mystery'],averageScore:86,popularity:55000,episodes:24,format:'TV',seasonYear:2022,coverImage:{large:'https://example.com/14.jpg'}}
 ];
 const remote=async()=>({ok:true,json:async()=>({data:{Page:{media}}})});
 const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 const w=load({fetch:remote,localStorage:storage}),c=context();
 let opened=null,added=null;
 c.rerender=()=>{};
 c.poster=x=>x;
 c.state=()=>({anime:[{title:'My Fantasy',genre:'Fantasy, Action',rating:9,favorite:true,status:'completed',source:'AniList',sourceId:'90',seasons:[]}],history:[],preferences:{}});
 c.genres=a=>String(a.genre||'').split(',').map(x=>x.trim());
 c.seriesRoot=x=>x.toLowerCase().replace(/ season \d+$/,'');
 c.mapAniList=m=>({key:'al-'+m.id,source:'AniList',sourceId:String(m.id),malId:String(m.idMal),title:m.title.romaji,genre:m.genres.join(', '),score:m.averageScore,cover:m.coverImage.large,total:m.episodes,format:m.format,year:m.seasonYear,synopsis:'A fantasy story'});
 c.inLibrary=()=>null;
 c.previewItem=x=>{opened=x.key};
 c.addItem=async x=>{added=x.key};
 const rec=w.ATRecommendations(c);
 await rec.refresh(true);
 const html=rec.render();
 assert.match(html,/Çfarë ke qejf sot/);
 assert.match(html,/Pse kjo/);
 assert.match(html,/Quiet Rain/);
 assert.equal((html.match(/class="pro-rec pro-rec-v10"/g)||[]).length,3,'same franchise seasons grouped');
 rec.preview('al-13');assert.equal(opened,'al-13');
 await rec.add('al-13');assert.equal(added,'al-13');
 rec.hide('al-13');assert.doesNotMatch(rec.render(),/Quiet Rain/);
 rec.restore();assert.match(rec.render(),/Quiet Rain/);
 rec.setTab('movies');assert.match(rec.render(),/Nuk ka sugjerime/);
 rec.setTab('personal');rec.setLength('short');assert.match(rec.render(),/Astral Journey/);
 assert.ok([...store.keys()].some(k=>k.includes('animetrack_rec_prefs_v10')));
});

test('compact home cards and redesigned profile render on empty library',()=>{
 const w=load(),c=context(),p=w.ATProfiles(c);
 assert.match(w.ATRecommendations(c).home(),/at-home-rec-grid|at-home-rec-empty/);
 assert.match(p.render(),/at-profile-header/);
 assert.match(p.render(),/12 javëve/);
 p.setTab('settings');
 assert.match(p.render(),/pro-public/);
 assert.match(w.ATNotifications(c).render(),/at-notice-hero/);
});
test('calendar week/month/timeline, opt-in reminder and notification categories',async()=>{
 const w=load();
 const now=Date.now(),e={animeId:'a1',title:'Calendar Test',episode:3,seasonEpisode:3,seasonId:'s1',season:'Sezoni 1',when:now+10*60000,source:'AniList',cover:''};
 const state={anime:[{id:'a1',title:'Calendar Test',genre:'Drama',status:'watching',favorite:true,seasons:[{id:'s1',watched:[],total:12}]}],history:[],preferences:{notificationRead:[]}};
 const c=context();c.state=()=>state;c.upcoming=()=>[e];c.released=x=>x.total;c.rerender=()=>{};c.poster=()=>'';c.save=()=>true;
 let opened=false;c.openEpisode=()=>{opened=true};
 const calendar=w.ATCalendarWrapped(c);c.setCalendarReminder=(key,value)=>w.ATSmartAiring(c).setReminder(key,value);
 assert.match(calendar.calendar(),/at-cal-grid/);
 calendar.action('calendar-view','month');assert.match(calendar.calendar(),/at-cal-day-open/);
 calendar.action('calendar-view','agenda');assert.match(calendar.calendar(),/at-cal-agenda/);
 const key=[e.animeId,e.seasonId,e.episode,e.when].join(':');
 calendar.action('calendar-remind',key);assert.equal(state.preferences.calendarReminders[key],30);
 calendar.action('calendar-open',key);assert.equal(opened,true);
 const inbox=w.ATNotifications(c);
 await inbox.refresh();assert.match(inbox.render(),/Kujtesa e episodit/);
 await inbox.action('notification-unread');assert.match(inbox.render(),/Vetëm të palexuara/);
 await inbox.action('notification-filter','episodes');assert.match(inbox.render(),/at-notice-filters/);
 await inbox.action('notification-read-all');assert.equal(state.preferences.notificationRead.length,1);
});
test('profile show-and-edit does not change library state',()=>{
 const w=load(),c=context(),s={anime:[{id:'one',title:'Example',status:'completed',favorite:true,rating:9,genre:'Fantasy',cover:'',seasons:[]}],history:[],preferences:{}};
 c.state=()=>s;c.genres=a=>a.genre.split(',');c.count=()=>12;c.activity=()=>[];c.isMovie=()=>false;c.rerender=()=>{};
 const p=w.ATProfiles(c);
 assert.match(p.render(),/at-profile-stats/);assert.match(p.render(),/Example/);
 p.setTab('settings');assert.match(p.render(),/Ndrysho profilin/);
 assert.equal(s.anime.length,1);
});

test('watch-first home replaces duplicate stats without removing legacy render nodes',()=>{
 const w=load(),c=context(),a={id:'a1',title:'Mystery Voyage',cover:'',status:'watching',favorite:false,updatedAt:'2026-09-24T12:00:00Z',seasons:[{id:'s1',title:'Sezoni 1',total:12,watched:[1,2]}]};
 const data={anime:[a],history:[],preferences:{weeklyGoal:10,notificationRead:[]}};
 c.state=()=>data;c.nextEpisode=()=>({season:a.seasons[0],n:3});c.releasedTotal=()=>12;c.count=()=>2;c.percent=()=>17;c.poster=()=>'';c.rerender=()=>{};
 let opened=null,marked=null;c.openEpisode=(id,s,n)=>{opened=[id,s,n]};c.markNext=id=>{marked=id};c.save=()=>true;
 const home=w.ATHome(c),parts=home.render();
 assert.match(parts.hero,/Çfarë do të shikosh sot/);
 assert.match(parts.feature,/Mystery Voyage/);assert.match(parts.feature,/10 për t’u parë/);assert.match(parts.feature,/Episodi 3/);
 assert.match(parts.lineup,/S1 · EP 3/);assert.match(parts.lineup,/\+1 episod/);
 assert.doesNotMatch(parts.hero,/Anime gjithsej/);
 home.action('queue-toggle','a1');assert.equal(JSON.stringify(data.preferences.homeQueue),'["a1"]');
 assert.match(home.render().session,/Mystery Voyage/);
 home.action('continue');assert.deepEqual(opened,['a1','s1',3]);
 home.action('advance-next','a1');assert.equal(marked,'a1');
 home.action('queue-toggle','a1');assert.equal(data.preferences.homeQueue.length,0);
});
test('profile stats tab and goal stay inside profile',()=>{
 const w=load(),c=context(),data={anime:[],history:[],preferences:{weeklyGoal:10,notificationRead:[]}};
 c.state=()=>data;c.rerender=()=>{};c.el=id=>id==='at-profile-goal-input'?{value:'15'}:null;c.save=()=>true;
 const profile=w.ATProfiles(c);profile.setTab('stats');
 assert.match(profile.render(),/OBJEKTIVI JAVOR/);
 assert.match(profile.render(),/7 ditët e javës/);
 profile.goalSave();assert.equal(data.preferences.weeklyGoal,15);
});
test('home module is included ahead of pro app, styles and service worker cache updated',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8'),css=fs.readFileSync(path.join(root,'assets/pro-home-102.css'),'utf8');
 assert.ok(html.indexOf('/assets/pro-home.js')<html.indexOf('/assets/pro-features.js'));
 assert.match(html,/pro-home-102\.css/);assert.match(sw,/pro-home\.js/);
 assert.match(css,/#home-view\.at-home-rebuilt > :not\(#at-home-main\)/);
});

test('mobile-first shell includes bottom navigation and swipe-friendly home CSS',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),css=fs.readFileSync(path.join(root,'assets/pro-mobile-103.css'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.match(html,/pro-mobile-103\.css/);
 assert.match(css,/\.at-mobile-nav/);
 assert.match(css,/scroll-snap-type:x mandatory/);
 assert.match(css,/\.at-h3-feature/);
 assert.match(sw,/pro-mobile-103\.css/);
});
test('up-next exposes backlog, quick episode strip and one-click watched action',()=>{
 const w=load(),c=context(),season={id:'s1',title:'Season 1',total:12,watched:[1,2]};
 const a={id:'a1',title:'Episode Focus',cover:'',status:'watching',favorite:true,updatedAt:'2026-09-25T10:00:00Z',seasons:[season]};
 c.state=()=>({anime:[a],history:[],preferences:{}});c.nextEpisode=()=>({season,n:3});c.releasedTotal=()=>6;c.count=()=>2;c.percent=()=>33;c.released=()=>6;c.poster=()=>'';c.rerender=()=>{};
 const h=w.ATHome(c).render().feature;
 assert.match(h,/4 episode gati/);
 assert.match(h,/data-ep="3"/);assert.match(h,/data-ep="6"/);
 assert.match(h,/E pashë/);
});

test('compact 10.4 desktop focus and clearer advancing cards are wired',()=>{
 const css=fs.readFileSync(path.join(root,'assets/pro-compact-104.css'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8'),home=fs.readFileSync(path.join(root,'assets/pro-home.js'),'utf8');
 assert.match(css,/height:300px/);assert.match(css,/at-h4-advance/);
 assert.match(home,/advance-next/);assert.match(home,/sync-now/);
 assert.match(html,/pro-compact-104\.css/);assert.match(sw,/pro-compact-104\.css/);
});
test('cloud round-trip preserves watch session and reminder preferences',()=>{
 const core=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
 assert.match(core,/preferences:normalizePreferences\(data.preferences\)/);
 assert.match(core,/homeQueue:Array.isArray\(p.homeQueue\)/);
 assert.match(core,/calendarReminders:Object.fromEntries/);
 assert.match(core,/async function accountPullQuiet/);
 assert.match(core,/upcomingCheckedAt<30\*60000/);
});
test('watched notifications are excluded and foreground sync refreshes views',()=>{
 const notify=fs.readFileSync(path.join(root,'assets/pro-notifications.js'),'utf8'),features=fs.readFileSync(path.join(root,'assets/pro-features.js'),'utf8');
 assert.match(notify,/alreadyWatched\(e\)/);
 assert.match(features,/visibilitychange/);assert.match(features,/liveRefresh\(force\)/);
 assert.match(features,/render\(\);renderHome\(\)/);
});

test('PWA update notification checks new workers and avoids reload during unsaved cloud writes',()=>{
 const features=fs.readFileSync(path.join(root,'assets/pro-features.js'),'utf8'),core=fs.readFileSync(path.join(root,'assets/app.js'),'utf8'),css=fs.readFileSync(path.join(root,'assets/pro-compact-104.css'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.match(features,/controllerchange/);assert.match(features,/reg.update\(\)/);assert.match(features,/reload-update/);
 assert.match(features,/ctx.canReload/);assert.match(core,/canReload:\(\)=>!cloudDirty&&!cloudSaving/);
 assert.match(css,/\.at-pwa-update/);assert.match(sw,/animetrack-shell-v1162-1/);
});

test('iPhone app shell replaces mobile home and supports install instructions',()=>{
 const core=fs.readFileSync(path.join(root,'assets/pro-features.js'),'utf8'),css=fs.readFileSync(path.join(root,'assets/pro-iphone-105.css'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8'),manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
 assert.match(css,/#at-iphone-feed/);assert.match(css,/at-ios-enabled #home-view/);assert.match(css,/env\(safe-area-inset-bottom\)/);
 assert.match(core,/modules.iphone.mount\(\)/);assert.match(core,/data-mobile-nav="home"[^>]*>.*Episodet/);
 assert.match(core,/Add to Home Screen/);assert.match(html,/viewport-fit=cover/);assert.match(html,/apple-mobile-web-app-title/);
 assert.match(html,/pro-iphone-105\.css/);assert.match(sw,/pro-iphone\.js/);
 assert.equal(manifest.display,'standalone');
 assert.match(html,/apple-touch-icon\.png/);
 assert.ok(manifest.icons.some(x=>x.src==='/icon-192.png'&&x.type==='image/png'));
 for(const file of ['apple-touch-icon.png','icon-192.png','icon-512.png']){
  const bytes=fs.readFileSync(path.join(root,file));
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 }
});
test('iPhone feed uses same watch data and quick marking without duplicating library',()=>{
 const w=load({navigator:{userAgent:'iPhone'},window:{matchMedia:()=>({matches:false})},localStorage:{getItem:()=>null,setItem:()=>{}}}),c=context(),season={id:'s1',watched:[1,2],total:12},a={id:'a1',title:'Anime Alpha',status:'watching',cover:'',seasons:[season],updatedAt:'2026-09-24T10:00:00Z'};
 const data={anime:[a],preferences:{},history:[]};let advanced='',opened='';
 c.state=()=>data;c.nextEpisode=()=>({season,n:3});c.releasedTotal=()=>12;c.count=()=>2;c.percent=()=>17;c.accountName=()=> 'Tester';c.markNext=id=>advanced=id;c.openEpisode=(id,s,n)=>opened=[id,s,n];c.recentAiring=()=>[];c.poster=()=>'';c.upcoming=()=>[];
 const feed=w.ATiPhone(c);const page=feed.render();
 assert.match(page,/TO WATCH/);assert.match(page,/S01 \| E03/);assert.match(page,/data-ios-action="advance"/);assert.match(page,/Fill my shows list/);assert.doesNotMatch(page,/dashboard personal/i);
 feed.action('advance','a1');assert.equal(advanced,'a1');
 feed.action('episode','a1');assert.equal(JSON.stringify(opened),'["a1","s1",3]');
 feed.action('tab','upcoming');assert.match(feed.render(),/Nuk ka episode të planifikuara/);
});

test('desktop Watchlist has search, show more, and a guarded +1 undo',()=>{
 const w=load(),c=context();
 const anime=Array.from({length:8},(_,i)=>({id:'watch'+i,title:'Series '+i,genre:i===7?'Mystery':'Action',status:'watching',favorite:false,updatedAt:'2026-09-25T12:00:00Z',seasons:[{id:'season'+i,watched:[1],total:12}]}));
 const data={anime,history:[],preferences:{weeklyGoal:10,notificationRead:[]}};
 c.state=()=>data;c.releasedTotal=()=>12;c.count=a=>a.seasons[0].watched.length;c.percent=a=>Math.round(c.count(a)/12*100);c.released=()=>12;
 c.nextEpisode=a=>{const season=a.seasons[0];return {season,n:Math.max(1,...season.watched)+1}};
 c.rerender=()=>{};c.poster=()=>'';c.user=()=>null;c.toast=()=>{};
 let undone=0;
 c.markNext=id=>{const a=data.anime.find(x=>x.id===id);a.seasons[0].watched.push(c.nextEpisode(a).n);data.history.push({id,seasonId:a.seasons[0].id,episode:2,action:'watched'})};
 c.undoEpisode=(id,seasonId,n)=>{undone++;const a=data.anime.find(x=>x.id===id),ss=a.seasons.find(x=>x.id===seasonId);ss.watched=ss.watched.filter(v=>v!==n);return true};
 const home=w.ATHome(c);
 let page=home.render().lineup;
 assert.match(page,/at-pc-watch-search/);assert.equal((page.match(/class="at-h2-lineup-card"/g)||[]).length,6);
 assert.match(page,/more-watching/);
 home.action('more-watching');page=home.render().lineup;assert.equal((page.match(/class="at-h2-lineup-card"/g)||[]).length,8);
 home.search('mystery');page=home.render().lineup;assert.equal((page.match(/class="at-h2-lineup-card"/g)||[]).length,1);assert.match(page,/Series 7/);
 home.search('');home.action('advance-next','watch0');page=home.render().lineup;
 assert.match(page,/Zhbëj S1 · EP 2/);assert.equal(data.anime[0].seasons[0].watched.includes(2),true);
 home.action('undo-watch');assert.equal(undone,1);assert.equal(data.anime[0].seasons[0].watched.includes(2),false);
 assert.doesNotMatch(home.render().lineup,/Zhbëj S1 · EP 2/);
});
test('desktop controls are isolated from iPhone and cache includes their stylesheet',()=>{
 const css=fs.readFileSync(path.join(root,'assets/pro-desktop-106.css'),'utf8'),
 html=fs.readFileSync(path.join(root,'index.html'),'utf8'),
 sw=fs.readFileSync(path.join(root,'sw.js'),'utf8'),
 core=fs.readFileSync(path.join(root,'assets/app.js'),'utf8'),
 pro=fs.readFileSync(path.join(root,'assets/pro-features.js'),'utf8');
 assert.match(css,/@media \(min-width:761px\)/);
 assert.match(css,/at-pc-watch-search/);
 assert.match(html,/pro-desktop-106\.css/);assert.match(sw,/pro-desktop-106\.css/);
 assert.match(core,/undoEpisode:/);
 assert.match(pro,/setSelectionRange\(caret,caret\)/);
});

test('episode transactions roll back on failed local persistence',()=>{
 const src=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
 assert.match(src,/if\(!save\(\)\)\{state\.anime\[index\]=before;state\.history=historyBefore;return false\}/);
 assert.match(src,/return updateSeasonEpisode\(id,ep\.season\.id,ep\.n,true\)/);
 assert.match(src,/Episode transaction rolled back/);
 assert.match(src,/cloudTimer=setTimeout\(\(\)=>\{if\(accountMode==='cloud'/);
 assert.match(src,/window\.addEventListener\('online'/);
});
test('iPhone quick +1 supports a real guarded Undo and distinct sync states',async()=>{
 const storage={getItem:()=>null,setItem:()=>{}};
 const w=load({navigator:{userAgent:'iPhone',onLine:true},window:{matchMedia:()=>({matches:false})},localStorage:storage});
 const c=context(),s={id:'s1',total:12,watched:[1,2]},a={id:'t1',title:'Series',cover:'',status:'watching',updatedAt:'2026-09-25',seasons:[s]},data={anime:[a],history:[],preferences:{}};
 c.state=()=>data;c.user=()=>({id:'owner'});c.nextEpisode=x=>({season:x.seasons[0],n:Math.max(...x.seasons[0].watched)+1});
 c.releasedTotal=()=>12;c.count=x=>x.seasons[0].watched.length;c.percent=x=>Math.round(x.seasons[0].watched.length/12*100);
 c.accountName=()=> 'Viewer';c.recentAiring=()=>[];c.poster=()=>'';c.upcoming=()=>[];
 c.watchSaveStatus=()=>({mode:'cloud',connected:true,dirty:false});
 c.markNext=id=>{s.watched.push(3);return true};
 c.undoEpisode=(id,seasonId,n)=>{s.watched=s.watched.filter(v=>v!==n);return true};
 const f=w.ATiPhone(c);
 assert.match(f.render(),/Biblioteka në cloud/);
 await f.action('advance','t1');
 assert.match(f.render(),/Zhbëj EP 3/);
 assert.match(f.render(),/E04/);
 await f.action('undo');
 assert.match(f.render(),/E03/);
 assert.doesNotMatch(f.render(),/Zhbëj EP 3/);
 c.liveRefresh=async()=>{throw Error('offline upstream')};c.liveStatus=()=>({failed:1});
 await f.action('sync');
 assert.match(f.render(),/Nuk u lidh burimi/);
});
test('10.7 recoverable widgets, status text, and stylesheet are wired',()=>{
 const pro=fs.readFileSync(path.join(root,'assets/pro-features.js'),'utf8'),
 phone=fs.readFileSync(path.join(root,'assets/pro-iphone.js'),'utf8'),
 html=fs.readFileSync(path.join(root,'index.html'),'utf8'),
 sw=fs.readFileSync(path.join(root,'sw.js'),'utf8'),
 css=fs.readFileSync(path.join(root,'assets/pro-quality-107.css'),'utf8');
 assert.match(pro,/retry-home/);
 assert.match(pro,/status:'offline'/);
 assert.match(pro,/Home widget recovery/);
 assert.match(phone,/data-ios-action="undo"/);
 assert.match(phone,/data-ios-action="sync"|Po kontrollohen episodet/);
 assert.match(css,/at-ios-watch-feedback/);
 assert.match(html,/pro-quality-107\.css/);
 assert.match(sw,/pro-quality-107\.css/);
});

test('11.0 removes Franchise Hub, keeps native seasons and cross-season episode navigation',()=>{
 const w=load(),c=context(),s1={id:'s1',title:'Sezoni 1',total:12,watched:[1,2]},s2={id:'s2',title:'Sezoni 2',total:12,watched:[]},a={id:'a',title:'Sample Series',seasons:[s1,s2]};
 c.released=s=>s.total;
 const journey=w.ATJourney(c),before=JSON.stringify(a),src=fs.readFileSync(path.join(root,'assets/app.js'),'utf8'),css=fs.readFileSync(path.join(root,'assets/pro-journey-108.css'),'utf8');
 assert.equal(typeof journey.detail,'undefined');
 assert.equal(typeof journey.family,'undefined');
 assert.doesNotMatch(src,/atJourney\\.renderDetail/);
 assert.doesNotMatch(css,/\\.at108-franchise|\\.at108-season-grid/);
 assert.match(src,/class="season-scroller"/);
 assert.deepEqual(JSON.parse(JSON.stringify(journey.adjacent(a,s1,12,1))),{season:s2,n:1});
 assert.deepEqual(JSON.parse(JSON.stringify(journey.adjacent(a,s2,1,-1))),{season:s1,n:12});
 assert.equal(JSON.stringify(a),before);
});
test('10.8 Episode Hub tab/next navigation hooks preserve existing spoiler comments',()=>{
 const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8'),
 journey=fs.readFileSync(path.join(root,'assets/pro-journey-108.js'),'utf8'),
 css=fs.readFileSync(path.join(root,'assets/pro-journey-108.css'),'utf8'),
 html=fs.readFileSync(path.join(root,'index.html'),'utf8'),
 sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.match(app,/atJourney\.renderEpisode\(v81EpisodeParts\(\)\)/);
 assert.match(app,/hydrateSingleCard\(entry,remote\)/);
 assert.doesNotMatch(app,/setTimeout\(\(\)=>\{if\(accountUser\?\.id===user\.id\)scanAndMergeSeries\(true\)\}/);
 assert.match(journey,/data-journey-action="tab"/);assert.match(journey,/if\(op===\x27prev\x27\|\|op===\x27next\x27\)/);
 assert.match(css,/data-at108-tab="discussion"/);
 assert.match(html,/pro-journey-108\.js/);assert.match(sw,/pro-journey-108\.css/);
 assert.match(app,/v98-spoiler-reveal/);assert.match(app,/v98DiscussionHTML\(currentKey\)/);
});

test('10.9 personal airing keeps watched episodes out and supports exact per-event lead times',async()=>{
 const w=load(),c=context(),now=Date.now(),
 anime={id:'a',title:'New Galaxy',status:'watching',favorite:false,seasons:[{id:'s',watched:[1],total:12}]},
 seen={animeId:'a',seasonId:'s',episode:1,seasonEpisode:1,when:now+15*60000,title:'New Galaxy'},
 next={animeId:'a',seasonId:'s',episode:2,seasonEpisode:2,when:now+15*60000,title:'New Galaxy'},
 untracked={animeId:'outsider',seasonId:'none',episode:1,when:now+15*60000,title:'Other'};
 const data={anime:[anime],history:[],preferences:{calendarReminders:{}}};
 let saves=0;c.state=()=>data;c.upcoming=()=>[seen,next,untracked];c.save=()=>{saves++;return true};
 const smart=w.ATSmartAiring(c),key=smart.eventKey(next);
 assert.equal(smart.summary().total,1);assert.equal(smart.upcomingPersonal(7)[0].episode,2);
 assert.match(smart.panel(),/New Galaxy/);assert.doesNotMatch(smart.panel(),/Other/);
 assert.equal(smart.setReminder(key,'10'),true);assert.equal(data.preferences.calendarReminders[key],10);
 let inbox=w.ATNotifications(c);await inbox.refresh();
 assert.equal(inbox.get().some(n=>n.key==='reminder:'+key),false,'10 min reminder should not fire early');
 assert.equal(smart.setReminder(key,'30'),true);inbox=w.ATNotifications(c);await inbox.refresh();
 assert.equal(inbox.get().some(n=>n.key==='reminder:'+key),true,'30 min reminder is due');
 assert.equal(smart.setReminder(key,'0'),true);assert.equal(data.preferences.calendarReminders[key],0);
 assert.equal(smart.setDefault('60'),true);assert.equal(data.preferences.reminderLead,60);
 assert.equal(smart.setReminder(key,'off'),true);assert.equal(Object.prototype.hasOwnProperty.call(data.preferences.calendarReminders,key),false);
 assert.equal(saves,5);
});
test('10.9 push is explicitly opt-in and staged server secrets never ship in the browser',()=>{
 const w=load(),c=context(),push=w.ATPush109(c),html=push.banner(),
 sw=fs.readFileSync(path.join(root,'sw.js'),'utf8'),
 src=fs.readFileSync(path.join(root,'assets/pro-push-109.js'),'utf8'),
 backend=fs.readFileSync(path.join(root,'supabase/functions/anime-push-dispatch/index.ts'),'utf8'),
 sql=fs.readFileSync(path.join(root,'supabase/migrations/20260925235000_anime_push_reminders.sql'),'utf8'),
 index=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/Njoftimet jashtë aplikacionit/);
 assert.doesNotMatch(src,/VAPID_PRIVATE_KEY|SUPABASE_SERVICE_ROLE_KEY|ANIMETRACK_CRON_SECRET/);
 assert.match(src,/Notification\.requestPermission\(\)/);
 assert.match(backend,/X-Cron-Secret/);assert.match(backend,/stillWanted\(job, library\?\.payload\)/);
 assert.match(sql,/enable row level security/);assert.match(sql,/with check \(user_id=\(select auth\.uid\(\)\)\)/);
 const config=fs.readFileSync(path.join(root,'supabase/functions/anime-push-config/index.ts'),'utf8');
 assert.match(config,/request\.method === "OPTIONS"/);
 assert.match(config,/Access-Control-Allow-Headers/);
 assert.match(config,/Access-Control-Allow-Origin/);
 assert.match(sql,/public\.anime_push_subscriptions to service_role/);
 assert.match(sql,/public\.anime_push_reminders to service_role/);
 assert.match(sw,/addEventListener\('push'/);assert.match(sw,/showNotification/);
 assert.match(index,/pro-smart-airing-109\.js/);assert.match(index,/pro-push-109\.js/);
 assert.match(index,/pro-airing-109\.css/);
 assert.match(sw,/animetrack-shell-v1162-1/);
 assert.doesNotThrow(()=>new vm.Script(sw));
});

test('11.0 private lists survive saves, never alter watch progress, and share title only',async()=>{
 const w=load(),c=context(),data={anime:[
  {id:'a1',title:'Anime Alpha',status:'watching',rating:10,notes:'SECRET NOTE',seasons:[{id:'s1',watched:[1,2]}]},
  {id:'a2',title:'Anime Beta',status:'planning',seasons:[{id:'s2',watched:[]}]}
 ],history:[{id:'a1',episode:2,action:'watched'}],preferences:{}};
 let commits=0,repaint=0,copies='',confirmed=false;
 c.state=()=>data;c.user=()=>({id:'owner'});c.uuid=()=>String(++commits).padStart(6,'0');
 c.save=()=>true;c.rerender=()=>{repaint++};c.confirm=()=>confirmed;c.prompt=()=>null;c.count=a=>a.seasons.reduce((n,s)=>n+s.watched.length,0);
 c.el=()=>null;c.poster=()=>'';c.toast=()=>{};
 const lists=w.ATCollections110(c),original=JSON.stringify({anime:data.anime,history:data.history});
 assert.equal(lists.make('For the weekend'),true);
 assert.equal(data.preferences.customLists.length,1);
 assert.equal(lists.toggle('a1'),true);
 assert.equal(lists.toggle('a2'),true);
 const current=lists.lists()[0],summary=lists.shareText(current);
 assert.match(summary,/Anime Alpha/);assert.match(summary,/Anime Beta/);
 assert.doesNotMatch(summary,/SECRET NOTE|10\/10|watched|progress/i);
 assert.equal(lists.rename(current.id,'Top picks'),true);
 assert.equal(lists.lists()[0].title,'Top picks');
 assert.equal(lists.toggle('a1'),true);
 assert.equal(lists.lists()[0].animeIds.includes('a1'),false);
 assert.equal(lists.remove(current.id),false);
 confirmed=true;assert.equal(lists.remove(current.id),true);
 assert.equal(data.preferences.customLists.length,0);
 assert.equal(JSON.stringify({anime:data.anime,history:data.history}),original);
 assert(repaint>0);
});
test('11.0 collections roll back failed saves and are linked on phone/desktop',()=>{
 const w=load(),c=context(),data={anime:[{id:'a1',title:'Sample',seasons:[]}],history:[],preferences:{}};
 c.state=()=>data;c.user=()=>({id:'u1'});c.uuid=()=> 'safe-01';c.save=()=>false;c.toast=()=>{};c.rerender=()=>{};
 const lists=w.ATCollections110(c);assert.equal(lists.make('Saved title'),false);
 assert.equal(data.preferences.customLists.length,0);
 const src=fs.readFileSync(path.join(root,'assets/app.js'),'utf8'),
 pro=fs.readFileSync(path.join(root,'assets/pro-features.js'),'utf8'),
 index=fs.readFileSync(path.join(root,'index.html'),'utf8'),
 sw=fs.readFileSync(path.join(root,'sw.js'),'utf8'),
 file=fs.readFileSync(path.join(root,'assets/pro-collections-110.js'),'utf8');
 assert.match(src,/customLists/);assert.match(src,/data-pro-action="collection-pick"/);
 assert.match(pro,/collections:modules\.collections\.render/);
 assert.match(pro,/modules\.collections\.mountLibrary\(\)/);
 assert.match(index,/pro-collections-110\.js/);
 assert.match(sw,/pro-collections-110\.css/);
 assert.match(file,/Listat e mia/);
});

test('iPhone 11.0.1 safe-area, touch targets and PWA caching are present',()=>{
 const css=fs.readFileSync(path.join(root,'assets/pro-ios-polish-1101.css'),'utf8'),
 html=fs.readFileSync(path.join(root,'index.html'),'utf8'),
 sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.match(css,/#detail-modal \.modal-header/);
 assert.match(css,/safe-area-inset-top/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/#detail-modal \.detail-back/);
 assert.match(css,/min-height:46px/);
 assert.match(css,/touch-action:manipulation/);
 assert.match(css,/pointer:coarse/);
 assert.match(css,/orientation:landscape/);
 assert.match(css,/#episode-detail-modal \{z-index:1170/);
 assert.match(css,/\.at-mobile-nav \{[\s\S]*z-index:900/);
 assert.match(html,/pro-ios-polish-1101\.css/);
 assert.match(sw,/pro-ios-polish-1101\.css/);
 assert.match(sw,/animetrack-shell-v1162-1/);
 assert.match(html,/viewport-fit=cover/);
 assert.doesNotMatch(html,/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/);
});

test('11.2 desktop command search matches personal library without changing it',()=>{
 const w=load(),c=context(),data={anime:[{id:'a1',title:'One Piece',status:'watching'},{id:'a2',title:'Blue Lock',status:'completed'}],history:[],preferences:{}};
 c.state=()=>data;
 const pro=w.ATExperience112(c),items=pro.data('one piece');
 assert.equal(items.length,1);assert.equal(items[0].id,'a1');assert.equal(items[0].type,'anime');
 assert.ok(pro.data('miqtë').some(x=>x.id==='friends'));
 assert.equal(data.anime.length,2);
 assert.match(fs.readFileSync(path.join(root,'assets/pro-experience-112.js'),'utf8'),/aria-modal="true"/);
});

test('11.2 phone filters and order are UI-only and are cached in the PWA shell',()=>{
 const phone=fs.readFileSync(path.join(root,'assets/pro-iphone.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.match(phone,/at114-top-tabs/);assert.match(phone,/at114-view-actions/);
 assert.match(phone,/WATCH HISTORY/);assert.match(phone,/NOT WATCHED IN A WHILE|STALE_MS/);
 assert.match(html,/pro-experience-112\.css/);assert.match(html,/pro-experience-112\.js/);
 assert.match(sw,/pro-experience-112\.css/);assert.match(sw,/pro-experience-112\.js/);
});

test('11.2 exact-handle private friends invite does not expose library snapshots',()=>{
 const sql=fs.readFileSync(path.join(root,'supabase/migrations/20260926153000_private_friend_invites_112.sql'),'utf8');
 const friends=fs.readFileSync(path.join(root,'assets/pro-friends.js'),'utf8');
 assert.match(sql,/security definer set search_path = ''/);
 assert.match(sql,/revoke all on function public\.anime_find_friend_by_handle\(text\) from public, anon/);
 assert.match(sql,/grant execute on function public\.anime_request_friend_by_handle\(text\) to authenticated/);
 assert.match(sql,/p\.handle = lower\(btrim\(p_handle\)\)/);
 assert.doesNotMatch(sql,/select\s+p\.\*/i);
 assert.doesNotMatch(sql,/drop table|truncate|delete from public\.anime_profiles/i);
 assert.match(friends,/anime_find_friend_by_handle/);assert.match(friends,/anime_request_friend_by_handle/);
 assert.match(friends,/relation\(found\.user_id\)/);
});

test('11.2 iPhone glance renders next released episode with a read-only list',()=>{
 const s={anime:[{id:'a',title:'Mystery Quest',status:'watching',updatedAt:'2026-09-26',seasons:[{id:'s',total:12,watched:[1,2]}]}],history:[],preferences:{}};
 const w=load({navigator:{onLine:true,userAgent:'Desktop'},localStorage:{getItem:()=>null}}),c=context();
 c.state=()=>s;c.nextEpisode=a=>({season:a.seasons[0],n:3});c.releasedTotal=()=>12;c.count=()=>2;c.percent=()=>17;c.poster=()=>'';
 const html=w.ATiPhone(c).render();
 assert.match(html,/at114-topbar/);assert.match(html,/TO WATCH/);
 assert.match(html,/S01 \| E03/);assert.match(html,/data-ios-action="advance"/);
 assert.match(html,/Fill my shows list/);
 assert.deepEqual(s.anime[0].seasons[0].watched,[1,2]);
});

test('11.2 private friends can be located only by exact handle and invited through guarded RPC',async()=>{
 const p={user_id:'user-2',handle:'secretfan',display_name:'Secret Fan',avatar_emoji:'🎌',avatar_url:'',is_public:false};
 let relationships=[],requests=0;const slot={innerHTML:''},notifications=[];
 const client={
  from:table=>{const q={};for(const n of ['select','eq','ilike','limit','or','in','insert','delete','update'])q[n]=()=>q;q.then=(resolve,reject)=>Promise.resolve({data:table==='anime_friendships'?relationships:[],error:null}).then(resolve,reject);return q},
  rpc:async(name,params)=>{if(name==='anime_find_friend_by_handle')return {data:params.p_handle==='secretfan'?[p]:[],error:null};if(name==='anime_request_friend_by_handle'){requests++;relationships=[{id:1,requester_id:'user-1',recipient_id:'user-2',status:'pending'}];return {data:'sent',error:null}}throw Error(name)}
 };
 const w=load(),c=context();c.client=()=>client;c.user=()=>({id:'user-1'});c.el=id=>id==='pro-find-results'?slot:null;c.toast=x=>notifications.push(x);c.rerender=()=>{};c.poster=()=>'';
 const mod=w.ATFriends(c,{get:()=>({handle:'myhandle'}),snapshot:()=>({anime:[]})});
 await mod.find('secretfan');assert.match(slot.innerHTML,/Secret Fan/);assert.match(slot.innerHTML,/Profil privat/);
 assert.doesNotMatch(slot.innerHTML,/snapshot|private notes|email/i);
 await mod.action('friend-add','user-2');assert.equal(requests,1);assert.match(notifications.join('|'),/dërgua/);assert.equal(relationships[0].status,'pending');
});


test('11.3 mobile experience, calendar, library and account features are included in PWA shell',()=>{
 const js=fs.readFileSync(path.join(root,'assets/pro-mobile-113.js'),'utf8'),css=fs.readFileSync(path.join(root,'assets/pro-mobile-113.css'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.doesNotThrow(()=>new vm.Script(js));
 for(const name of ['pro-mobile-113.js','pro-mobile-113.css']){assert.match(html,new RegExp(name.replace('.','\\.')));assert.match(sw,new RegExp(name.replace('.','\\.')))}
 assert.match(js,/function enhanceEpisode/);assert.match(js,/function signupReady/);assert.match(js,/function signup\(on\)/);assert.doesNotMatch(js,/stopImmediatePropagation/);assert.match(js,/function mountLibrary/);
 assert.match(css,/grid-template-columns:112px minmax\(0,1fr\)/);assert.match(css,/safe-area-inset-top/);assert.match(css,/at113-cal-days/);assert.match(html,/at113-confirm-password/);
});
test('11.3 registration explicitly validates confirmation and stronger new passwords',()=>{const src=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');assert.match(src,/password.length<10/);assert.match(src,/password!==confirmPassword/);assert.match(src,/signupReady/);assert.match(src,/account-password/);});

test('11.4 mobile To Watch advances atomically and shows watch history',async()=>{
 const store={getItem:()=>null,setItem:()=>{}},w=load({navigator:{onLine:true,userAgent:'iPhone'},window:{matchMedia:()=>({matches:false})},localStorage:store}),c=context();
 const s={id:'s1',title:'Sezoni 1',total:5,watched:[1],episodes:[{number:2,title:'Mystery Begins'},{number:3,title:'The Return'}]};
 const a={id:'a',title:'Mystery Show',status:'watching',cover:'',updatedAt:new Date().toISOString(),seasons:[s]};
 const data={anime:[a],history:[],preferences:{}};
 c.state=()=>data;c.accountName=()=>'Tester';c.poster=()=>'';c.nextEpisode=x=>({season:x.seasons[0],n:x.seasons[0].watched.length+1});c.count=x=>x.seasons[0].watched.length;c.releasedTotal=()=>5;c.percent=x=>x.seasons[0].watched.length*20;
 c.markNext=()=>{const n=s.watched.length+1;s.watched.push(n);data.history.push({id:a.id,seasonId:s.id,episode:n,action:'watched',date:new Date().toISOString()});return true};
 const f=w.ATiPhone(c);assert.match(f.render(),/S01 \| E02/);assert.match(f.render(),/Mystery Begins/);
 await f.action('advance','a');const page=f.render();assert.match(page,/S01 \| E03/);assert.match(page,/The Return/);assert.match(page,/WATCH HISTORY/);assert.match(page,/S01 \| E02/);assert.deepEqual(s.watched,[1,2]);
});

test('11.4 mobile separates shows untouched for at least 7 days',()=>{
 const w=load({navigator:{onLine:true,userAgent:'iPhone'},window:{matchMedia:()=>({matches:false})},localStorage:{getItem:()=>null}}),c=context();
 const today=new Date().toISOString(),old=new Date(Date.now()-8*86400000).toISOString();
 const a={id:'fresh',title:'Fresh Anime',status:'watching',updatedAt:today,seasons:[{id:'sf',total:8,watched:[]}]};
 const b={id:'old',title:'Old Anime',status:'watching',updatedAt:old,seasons:[{id:'so',total:8,watched:[]}]};
 c.state=()=>({anime:[a,b],history:[],preferences:{}});c.nextEpisode=x=>({season:x.seasons[0],n:1});c.releasedTotal=()=>8;c.count=()=>0;c.percent=()=>0;c.poster=()=>'';c.accountName=()=>'Tester';
 const page=w.ATiPhone(c).render();assert.match(page,/NOT WATCHED IN A WHILE/);
 assert.ok(page.indexOf('Fresh Anime')<page.indexOf('NOT WATCHED IN A WHILE'));
 assert.ok(page.indexOf('Old Anime')>page.indexOf('NOT WATCHED IN A WHILE'));
});

test('11.4 Upcoming uses scheduled releases and never marks unreleased episodes',async()=>{
 const w=load({navigator:{onLine:true,userAgent:'iPhone'},window:{matchMedia:()=>({matches:false})},localStorage:{getItem:()=>null}}),c=context();
 const season={id:'s',title:'Season 1',total:12,watched:[1],episodes:[{number:4,title:'The Actual Episode Title'}]};
 const anime={id:'a',title:'Anime Series',status:'watching',cover:'',updatedAt:new Date().toISOString(),seasons:[season]};
 const now=Date.now();let marked=0,opened='';
 c.state=()=>({anime:[anime],history:[],preferences:{}});c.nextEpisode=()=>({season,n:2});c.releasedTotal=()=>3;c.count=()=>1;c.percent=()=>33;c.poster=()=>'';c.accountName=()=>'Viewer';
 c.upcoming=()=>[{animeId:'a',title:'Anime Series',seasonId:'s',seasonEpisode:4,when:now+86400000}];c.openAnime=id=>opened=id;c.markEpisode=()=>marked++;
 const f=w.ATiPhone(c);f.render();await f.action('tab','upcoming');const html=f.render();assert.match(html,/UPCOMING/);assert.match(html,/S01 \| E04/);assert.match(html,/The Actual Episode Title/);
 assert.match(html,/Del/);assert.doesNotMatch(html,/data-ios-action="advance"/);
 await f.action('details','a');assert.equal(opened,'a');assert.equal(marked,0);
});


test('11.4.1 unwatched is neutral, watched history is green, upcoming cannot be marked',async()=>{
 const w=load({navigator:{onLine:true,userAgent:'iPhone'},window:{matchMedia:()=>({matches:true})},localStorage:{getItem:()=>null}}),c=context();
 const s={id:'s',watched:[1],total:12,episodes:[{number:2,title:'Next Chapter'}]},a={id:'a',title:'Test Anime',status:'watching',cover:'',updatedAt:new Date().toISOString(),seasons:[s]};
 c.state=()=>({anime:[a],history:[{id:'a',seasonId:'s',episode:1,action:'watched',date:new Date().toISOString()}],preferences:{}});c.nextEpisode=()=>({season:s,n:2});c.releasedTotal=()=>12;c.count=()=>1;c.percent=()=>8;c.poster=()=>'';c.accountName=()=>'Tester';c.upcoming=()=>[{animeId:'a',seasonId:'s',episode:3,when:Date.now()+3600000}];
 const feed=w.ATiPhone(c);let html=feed.render();assert.match(html,/at114-check pending/);assert.match(html,/at114-check done/);assert.doesNotMatch(html,/at114-check ready/);
 await feed.action('tab','upcoming');html=feed.render();assert.match(html,/at114-check upcoming/);assert.doesNotMatch(html,/data-ios-action="advance"/);assert.match(html,/Premierat e radhës/);
});
test('11.4.1 watches ignored metadata update for seven-day inactivity and filters old releases',async()=>{
 const w=load({navigator:{onLine:true,userAgent:'iPhone'},window:{matchMedia:()=>({matches:true})},localStorage:{getItem:()=>null}}),c=context();
 const old=new Date(Date.now()-9*86400000).toISOString(),fresh=new Date().toISOString(),s={id:'s',total:8,watched:[1]},a={id:'old',title:'Old Series',status:'watching',updatedAt:fresh,createdAt:old,seasons:[s]};
 c.state=()=>({anime:[a],history:[{id:'old',seasonId:'s',episode:1,action:'watched',date:old}],preferences:{}});c.nextEpisode=()=>({season:s,n:2});c.releasedTotal=()=>8;c.count=()=>1;c.percent=()=>12;c.poster=()=>'';c.accountName=()=>'Tester';c.upcoming=()=>[{animeId:'old',seasonId:'s',episode:4,when:Date.now()-3600000},{animeId:'old',seasonId:'s',episode:5,when:Date.now()+3600000}];
 const feed=w.ATiPhone(c);assert.match(feed.render(),/NOT WATCHED IN A WHILE/);
 await feed.action('tab','upcoming');const html=feed.render();assert.match(html,/E05/);assert.doesNotMatch(html,/E04/);
});
test('11.4.1 mobile polish is scoped to small screens and keeps iOS status bar clear',()=>{
 const css=fs.readFileSync(path.join(root,'assets/pro-mobile-113.css'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.match(css,/at114-check\.pending/);assert.match(css,/at114-check\.done/);assert.match(css,/at114-upcoming-intro/);assert.match(css,/display-mode:standalone/);assert.match(css,/safe-area-inset-top/);assert.match(sw,/animetrack-shell-v1162-1/);
});

test('11.5 daily experience uses shared library, real weekly history and existing episode actions',()=>{
 const w=load(),c=context(),season={id:'s1',total:12,watched:[1,2],releaseStatus:'FINISHED'},a={id:'anime1',title:'Daily Journey',cover:'',status:'watching',seasons:[season],updatedAt:new Date().toISOString()};
 const events=[{id:'anime1',episode:2,action:'watched',date:new Date().toISOString()}];
 c.state=()=>({anime:[a],history:events,preferences:{weeklyGoal:6}});
 c.nextEpisode=()=>({season,n:3});c.releasedTotal=()=>12;c.count=()=>season.watched.length;
 c.accountName=()=> 'Tester';c.watchSaveStatus=()=>({mode:'cloud',connected:true});
 c.upcoming=()=>[{animeId:'anime1',seasonId:'s1',episode:4,when:Date.now()+60000,title:'Daily Journey'}];
 let opened=null,marked=0,undone=0,route='';
 c.openEpisode=(...args)=>{opened=args};c.markNext=()=>{marked++;season.watched.push(3);return true};c.undoEpisode=()=>{undone++;season.watched.pop();return true};c.navigate=x=>{route=x};
 const day=w.ATDaily115(c);c.dayBrief=x=>day.render(x);
 const pc=day.render(false),phone=day.render(true);
 assert.match(pc,/YOUR ANIME DAY/);assert.match(pc,/Daily Journey/);assert.match(phone,/at115-day-summary/);day.action('toggle');assert.match(day.render(true),/at115-day-more/);assert.match(pc,/1<small> \/ 6 episode/);assert.match(pc,/SOT NË KALENDAR/);
 day.action('open-next','anime1');assert.deepEqual(opened,['anime1','s1',3]);
 day.action('mark-next','anime1');assert.equal(marked,1);assert.match(day.render(true),/Zhbëj EP 3/);
 day.action('undo');assert.equal(undone,1);day.action('calendar');assert.equal(route,'calendar');
});
test('11.5 ongoing seasons remain watching and surface the next released episode',()=>{
 const core=fs.readFileSync(path.join(root,'assets/app.js'),'utf8'),phone=fs.readFileSync(path.join(root,'assets/pro-iphone.js'),'utf8'),home=fs.readFileSync(path.join(root,'assets/pro-home.js'),'utf8');
 assert.match(core,/a\.status=future\?'watching':'completed'/);assert.match(phone,/\['watching','waiting','completed'\]\.includes\(a\?\.status\)/);assert.match(home,/\['watching','waiting','completed'\]\.includes\(a\.status\)/);
});
test('11.5 guarded cloud write uses updated_at CAS and does not silently overwrite other devices',()=>{
 const core=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
 assert.match(core,/\.eq\('updated_at',cloudRevision\)\.select\('updated_at'\)\.maybeSingle\(\)/);
 assert.match(core,/if\(!result\.data\?\.updated_at\)throw Object\.assign/);
 assert.match(core,/cloudConflict=true/);assert.match(core,/cloudDirty&&!cloudSaving&&!cloudConflict/);
 assert.match(core,/cloudRevision=data\.updated_at/);
});

test('11.6 auth has explicit login/signup tabs and no event capture to suppress form submission',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');const core=fs.readFileSync(path.join(root,'assets/app.js'),'utf8'),mobile=fs.readFileSync(path.join(root,'assets/pro-mobile-113.js'),'utf8');
 for(const id of ['at116-tab-login','at116-tab-signup','at116-back-login','at116-pending-email','at116-resend-email'])assert.match(html,new RegExp(id));
 assert.match(core,/signupReady\?\.\(\)\?accountRegister\(\):accountLogin\(e\)/);
 assert.match(core,/auth\.resend\(\{type:'signup'/);
 assert.match(core,/!data\?\.user/);
 assert.match(mobile,/password\.minLength=on\?10:0/);
 assert.doesNotMatch(mobile,/stopImmediatePropagation/);
});

test('11.6 signup and login implement backend responses independently, including pending confirmation',async()=>{
 const src=fs.readFileSync(path.join(root,'assets/app.js'),'utf8'),section=src.slice(src.indexOf('/* 11.6 auth:'),src.indexOf('async function accountReset()',src.indexOf('/* 11.6 auth:')));
 const elements=new Map(),calls=[],messages=[];
 function elem(id){if(!elements.has(id))elements.set(id,{value:'',disabled:false,hidden:true,checkValidity:()=>true});return elements.get(id)}
 elem('account-email').value='friend@example.com';elem('account-password').value='StrongPass123';elem('account-name').value='Friend';elem('at113-confirm-password').value='StrongPass123';
 let mode=true,result={data:{user:{id:'new-user'},session:null},error:null},signedIn=false;
 const client={auth:{signUp:async options=>{calls.push(['signup',options]);return result},signInWithPassword:async options=>{calls.push(['login',options]);return {data:{user:{id:'new-user'}},error:null}},resend:async options=>{calls.push(['resend',options]);return {error:null}}}};
 const sandbox={window:{ATMobile113:{signupReady:()=>mode,signup:()=>{mode=true}}},location:{protocol:'https:',origin:'https://animetrack.example',pathname:'/'},Date,
  $:elem,accountBusy:false,accountInitClient:()=>client,accountStatus:(msg,kind)=>messages.push([msg,kind]),accountOpenCloud:async()=>{signedIn=true},accountToggle:()=>{},accountName:()=> 'Friend',notify:()=>{},console};
 vm.createContext(sandbox);vm.runInContext(section,sandbox);
 await vm.runInContext('accountRegister()',sandbox);
 assert.equal(calls.length,1);assert.equal(calls[0][0],'signup');assert.equal(calls[0][1].options.emailRedirectTo,'https://animetrack.example/');
 assert.equal(elem('at116-pending-email').hidden,false);assert.equal(signedIn,false);assert.match(messages.at(-1)[0],/konfirmim|konfirmimit|Inbox/i);
 await vm.runInContext('accountResend()',sandbox);assert.equal(calls.at(-1)[0],'resend');
 mode=false;elem('account-password').value='StrongPass123';await vm.runInContext('accountLogin()',sandbox);assert.equal(signedIn,true);assert.equal(elem('at116-pending-email').hidden,true);
 result={data:{user:null,session:null},error:{code:'signup_disabled',message:'Signup disabled'}};
 mode=true;elem('account-password').value='StrongPass123';elem('at113-confirm-password').value='StrongPass123';await vm.runInContext('accountRegister()',sandbox);
 assert.match(messages.at(-1)[0],/çaktivizuar/i);
});

test('11.6 importer parses quoted AniList CSV and protects existing entries',()=>{
 const sandbox={window:{}};vm.createContext(sandbox);const src=fs.readFileSync(path.join(root,'assets/pro-import-116.js'),'utf8');vm.runInContext(src,sandbox);
 const importer=sandbox.window.ATImport116;
 const csv='Title,Media ID,Status,Progress,Score,Total Episodes\n"One Piece, New Arc",21,CURRENT,4,9,12\n"Another ""Great"" Show",22,COMPLETED,10,8,10\n';
 const rows=importer.parse(csv,'list.csv');assert.equal(rows.length,2);assert.equal(rows[0].title,'One Piece, New Arc');assert.equal(rows[1].title,'Another "Great" Show');assert.equal(rows[0].status,'watching');assert.equal(rows[0].progress,4);assert.equal(rows[0].sourceId,'21');
 assert.match(src,/if\(!window\.confirm/);assert.match(src,/ctx\.importExternal\(pending\)/);assert.match(src,/existing/);
});

test('11.6 social activity is opt-in and only accepted friends enter the activity feed',()=>{
 const profile=fs.readFileSync(path.join(root,'assets/pro-profiles.js'),'utf8'),friends=fs.readFileSync(path.join(root,'assets/pro-friends.js'),'utf8'),core=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
 assert.match(core,/shareFriendActivity:p\.shareFriendActivity===true/);
 assert.match(profile,/state\(\)\.preferences\?\.shareFriendActivity===true/);assert.match(profile,/visibility===false/);
 assert.match(profile,/at116-share-activity/);
 assert.match(friends,/const activity=accepted\.flatMap/);
 assert.match(friends,/FRIENDS · OPT-IN/);
 assert.doesNotMatch(friends,/\bemail\b.*activity/i);
});

test('11.6 profile onboarding creates private handle for newly confirmed accounts',()=>{
 const src=fs.readFileSync(path.join(root,'assets/pro-profiles.js'),'utf8');
 assert.match(src,/handle='fan_'/);assert.match(src,/is_public:false/);assert.match(src,/\.from\('anime_profiles'\)\.insert\(row\)/);
 assert.match(src,/r\.data\|\|null/);
});


test('11.6.1 mobile profile uses real library data and keeps email confirmation',()=>{const p=fs.readFileSync(path.join(root,'assets/pro-profiles.js'),'utf8'),a=fs.readFileSync(path.join(root,'assets/app.js'),'utf8'),h=fs.readFileSync(path.join(root,'index.html'),'utf8'),c=fs.readFileSync(path.join(root,'assets/pro-mobile-profile-1161.css'),'utf8');for(const v of ['at1161-profile','at1161-posters','at1161-metrics','profile-anime'])assert.match(p,new RegExp(v));assert.match(a,/email_address_not_authorized/);assert.match(a,/identities\.length===0/);assert.match(a,/nuk garanton mbërritjen/);assert.match(h,/pro-mobile-profile-1161\.css/);assert.match(c,/safe-area-inset-bottom/);});

test('11.6.2 signup uses canonical production redirect and handles consumed links safely',()=>{const src=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.match(src,/ANIMETRACK_AUTH_REDIRECT='https:\/\/animetrack-flax\.vercel\.app\/'/);assert.match(src,/emailRedirectTo:accountRedirectURL\(\)/);assert.match(src,/redirectTo:accountRedirectURL\(\)/);assert.match(src,/otp_expired/);assert.match(src,/provo Hyr/);assert.match(html,/11\.6\.2/)});
