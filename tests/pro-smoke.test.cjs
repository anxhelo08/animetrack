const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const names=['pro-recommendations','pro-calendar-wrapped','pro-profiles','pro-friends','pro-moderation','pro-notifications','pro-rewatch','pro-home','pro-features'];
function load(extra={}){
 const sandbox={window:{},console,Date,Map,Set,Promise,setTimeout,clearTimeout,AbortController,...extra};
 vm.createContext(sandbox);
 for(const name of names)vm.runInContext(fs.readFileSync(path.join(root,'assets',name+'.js'),'utf8'),sandbox,{filename:name+'.js'});
 return sandbox.window;
}
function context(){return{el:()=>null,esc:x=>String(x??''),state:()=>({anime:[],history:[],preferences:{weeklyGoal:10,notificationRead:[]}}),user:()=>null,client:()=>null,accountName:()=> 'Guest',poster:()=>'',count:()=>0,activity:()=>[],upcoming:()=>[],genres:()=>[],seriesRoot:()=>'',mapAniList:()=>({}),inLibrary:()=>null,previewItem:()=>{},rerender:()=>{},released:()=>0,releasedTotal:()=>0,percent:()=>0,nextEpisode:()=>null,markNext:()=>{},openFilter:()=>{},markEpisode:()=>{},refreshAiring:()=>{},isMovie:()=>false,uuid:()=> 'test',toast:()=>{},save:()=>true,openAnime:()=>{},refreshDetail:()=>{},navigate:()=>{},setLocalView:()=>{}}}
test('all feature modules parse and export factories',()=>{const w=load();for(const key of ['ATRecommendations','ATCalendarWrapped','ATProfiles','ATFriends','ATModeration','ATNotifications','ATRewatch','AnimeTrackPro'])assert.equal(typeof w[key],'function')});
test('core feature views render with an empty personal library',()=>{const w=load(),c=context(),p=w.ATProfiles(c);assert.match(w.ATRecommendations(c).render(),/Për ty/);assert.match(w.ATCalendarWrapped(c).calendar(),/Kalendari/);assert.match(w.ATCalendarWrapped(c).wrapped(),/Wrapped/);assert.match(p.render(),/Profili/);assert.match(w.ATFriends(c,p).render(),/Hyr/);assert.match(w.ATNotifications(c).render(),/Njoftimet/);assert.equal(w.ATRewatch(c).render('missing'),'');assert.equal(typeof w.ATHome(c).render,'function');assert.equal(typeof w.AnimeTrackPro(c).init,'function')});
test('site references every module, PWA resources, and source files exist',()=>{const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const name of names)assert.ok(html.includes('/assets/'+name+'.js'),name);for(const p of ['assets/app.js','assets/app.css','assets/pro-features.css','assets/pro-visual-101.css','assets/pro-home-102.css','assets/pro-mobile-103.css','assets/pro-compact-104.css','manifest.webmanifest','sw.js','icon.svg'])assert.ok(fs.existsSync(path.join(root,p)),p);assert.match(html,/AnimeTrack 10\.4\.1/);assert.doesNotThrow(()=>JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8')))});
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
 const calendar=w.ATCalendarWrapped(c);
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
 assert.match(css,/\.at-pwa-update/);assert.match(sw,/animetrack-shell-v104-2/);
});
