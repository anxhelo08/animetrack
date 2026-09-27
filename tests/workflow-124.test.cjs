const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const commandSource=read('assets/pro-command-124.js'),iphoneSource=read('assets/pro-iphone.js');
test('12.4 command search: anime, episodes, pages and online fallback without cloud writes',()=>{
 const realm={window:{}};vm.runInNewContext(commandSource,realm);
 const a={id:'op',title:'One Piece',genre:'Action',seasons:[{id:'east',title:'East Blue',total:24,watched:[1],episodes:[{number:1,title:'Romance Dawn'},{number:2,title:'Luffy vs Alvida'},{number:30,title:'Future data'}]}]};
 const ctx={esc:x=>String(x).replace(/</g,'&lt;'),state:()=>({anime:[a]}),released:s=>s.total,resume:()=>({seasonId:'east',episode:2})};
 const palette=realm.window.ATCommand124(ctx);
 assert.equal(palette.index('one piece').some(x=>x.kind==='anime'&&x.id==='op'),true);
 assert.equal(palette.index('Romance').some(x=>x.kind==='episode'&&x.n===1),true);
 assert.equal(palette.index('Future data').some(x=>x.kind==='episode'),false,'no future episodes');
 assert.equal(palette.index('calendar').some(x=>x.kind==='page'&&x.id==='calendar'),true);
 assert.equal(palette.index('Dexter').some(x=>x.kind==='online'),true);
 assert.equal(palette.index('One Piece').some(x=>x.kind==='anime'),true);
 assert.deepEqual(a.seasons[0].watched,[1],'search does not alter watched progress');
 assert.doesNotMatch(commandSource,/\.from\(['"]anime_libraries/);
});
test('12.4 mobile: recently aired is a distinct tab and keeps future dates out',async()=>{
 const realm={window:{matchMedia:()=>({matches:false})},navigator:{userAgent:'Android'},localStorage:{getItem:()=>null}};
 vm.runInNewContext(read('assets/pro-episode-hub-127.js'),realm);vm.runInNewContext(iphoneSource,realm);const now=Date.now();
 const anime={id:'op',title:'One Piece',status:'watching',seasons:[{id:'s1',title:'Season 1',total:5,watched:[1],episodes:[{number:1,title:'Past watched'},{number:2,title:'Fresh episode'}]}]};
 const data={anime:[anime],history:[]},feed={innerHTML:''},calls=[];
 const ctx={esc:String,el:id=>id==='at-iphone-feed'?feed:null,state:()=>data,user:()=>({id:'test'}),accountName:()=> 'Anime Fan',count:()=>1,released:()=>5,releasedTotal:()=>5,percent:()=>20,nextEpisode:()=>({season:anime.seasons[0],n:2}),poster:()=>'',upcoming:()=>[],recentAiring:()=>[
  {animeId:'op',seasonId:'s1',localEpisode:1,when:now-3600000,seen:true},
  {animeId:'op',seasonId:'s1',localEpisode:2,when:now-7200000,seen:false},
  {animeId:'op',seasonId:'s1',localEpisode:3,when:now+3600000,seen:false}
 ],unreadCount:()=>0,watchSaveStatus:()=>({}),dayBrief:()=>'',openEpisode:(...v)=>calls.push(['open',...v]),markEpisode:(...v)=>calls.push(['mark',...v])};
 const m=realm.window.ATiPhone(ctx);m.refresh();await m.action('tab','released');assert.match(feed.innerHTML,/Sapo dolën/);
 assert.match(feed.innerHTML,/Fresh episode/);assert.doesNotMatch(feed.innerHTML,/Past watched/);assert.doesNotMatch(feed.innerHTML,/data-ep="3"/);
 await m.action('recent-filter','all');assert.match(feed.innerHTML,/Past watched/);assert.match(feed.innerHTML,/Fresh episode/);
 await m.action('open-recent','op',{dataset:{season:'s1',ep:'2'}});await m.action('mark-recent','op',{dataset:{season:'s1',ep:'2'}});
 assert.equal(JSON.stringify(calls),JSON.stringify([['open','op','s1',2],['mark','op','s1',2]]));
 assert.deepEqual(anime.seasons[0].watched,[1],'render and filtering do not mutate progress');
});
test('12.4 markup: quick search and phone release controls are wired and escaped',()=>{
 const html=read('index.html'),app=read('assets/app.js'),mobile=read('assets/pro-mobile-113.js'),css=read('assets/pro-workflow-124.css'),sw=read('sw.js');
 for(const file of ['pro-command-124.js','pro-workflow-124.css'])assert.match(html,new RegExp(file.replaceAll('.','\\.')));
 for(const file of ['pro-command-124.js','pro-workflow-124.css'])assert.match(sw,new RegExp(file.replaceAll('.','\\.')));
 assert.match(app,/ATCommand124/);assert.match(app,/modalReturnFocus/);assert.match(app,/e\.key!=='Tab'/);
 assert.match(mobile,/at124-episode-quickbar/);assert.match(mobile,/action\.dataset\.episodeMark='1'/);
 assert.match(css,/at124-command-panel/);assert.match(css,/at124-episode-mark/);assert.match(css,/at114-top-tabs/);
 assert.match(iphoneSource,/data-ios-action="recent-filter"/);assert.match(iphoneSource,/data-ios-action="open-recent"/);
 assert.match(commandSource,/esc\(x\.label\)/);assert.match(commandSource,/esc\(x\.desc\|\|''\)/);
 assert.match(sw,/animetrack-shell-v12100-1/);assert.match(html,/AnimeTrack 12\.10\.0/);
});
