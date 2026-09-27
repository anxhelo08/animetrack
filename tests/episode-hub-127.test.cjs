const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function load(name){const context={window:{},Date,JSON,Map,Set};vm.runInNewContext(read('assets/'+name+'.js'),context);return context.window}
const DAY=86400000;
function model(now){
 const {ATEpisodeHub127:hub}=load('pro-episode-hub-127');
 const finished={id:'mental',title:'The Mentalist',status:'completed',createdAt:new Date(now-40*DAY).toISOString(),updatedAt:new Date(now).toISOString(),seasons:[{id:'s7',total:14,watched:[1],episodes:[]}]};
 const quiet={id:'quiet',title:'Quiet Anime',status:'watching',createdAt:new Date(now-20*DAY).toISOString(),updatedAt:new Date(now).toISOString(),seasons:[{id:'q',watched:[1],total:12}]};
 const active={id:'active',title:'Active Anime',status:'watching',createdAt:new Date(now-20*DAY).toISOString(),updatedAt:new Date(now).toISOString(),seasons:[{id:'a',watched:[1],total:12}]};
 const history=[{id:'quiet',action:'watched',date:new Date(now-8*DAY).toISOString()},{id:'active',action:'watched',date:new Date(now-DAY).toISOString()}];
 return {hub,finished,quiet,active,history}
}
test('12.7 newly aired unwatched episode promotes even a completed show, without duplicate active card',()=>{
 const now=Date.UTC(2026,8,27),{hub,finished,quiet,active,history}=model(now);
 const release={anime:finished,season:finished.seasons[0],n:14,when:now-3600000,watched:false};
 const group=hub.classify([finished,quiet,active],history,[release],now);
 assert.equal(group.fresh.length,1);assert.equal(group.fresh[0].anime.id,'mental');
 assert.deepEqual(Array.from(group.active,x=>x.id),['active']);assert.deepEqual(Array.from(group.stale,x=>x.id),['quiet']);
 assert.equal(group.active.some(x=>x.id==='mental'),false);
 assert.equal(group.stale.some(x=>x.id==='mental'),false);
});
test('12.7 watched NEW disappears immediately; future and >7-day old dates never become NEW',()=>{
 const now=Date.UTC(2026,8,27),{hub,finished,history}=model(now),season=finished.seasons[0];
 const recent=[{anime:finished,season,n:14,when:now-60*60000,watched:false},{anime:finished,season,n:15,when:now+DAY,watched:false},{anime:finished,season,n:13,when:now-8*DAY,watched:false}];
 assert.equal(hub.classify([finished],history,recent,now).fresh.length,1);
 season.watched.push(14);
 const after=hub.classify([finished],history,recent,now);
 assert.equal(after.fresh.length,0);assert.equal(after.stale.length,1);
});
test('12.7 metadata updatedAt cannot reset the actual seven-day inactivity clock',()=>{
 const now=Date.UTC(2026,8,27),{hub,quiet,active,history}=model(now);
 assert.equal(now-hub.lastTouched(quiet,history,now),8*DAY);
 assert.equal(now-hub.lastTouched(active,history,now),DAY);
 assert.deepEqual(Array.from(hub.classify([quiet,active],history,[],now).stale,x=>x.id),['quiet']);
});
test('12.7 TVMaze adds released episodes/seasons and retains all existing watched marks',()=>{
 const {ATTVEpisodes127:tv}=load('pro-tv-episodes-127');
 const entry={id:'tvmaze-777',source:'TVMaze',title:'Mystery',seasons:[{id:'tvmaze-777-s1',source:'TVMaze',sourceId:'777',imdbSeasonNumber:1,total:2,watched:[1,2],episodes:[{number:1,tvmazeEpisodeId:'1',aired:'2025-01-01'},{number:2,tvmazeEpisodeId:'2',aired:'2025-01-08'}]}]};
 const incoming=[{id:1,season:1,number:1,name:'Pilot',airdate:'2025-01-01'},{id:2,season:1,number:2,name:'Finale',airdate:'2025-01-08'},{id:3,season:1,number:3,name:'Return',airdate:'2026-09-27',airstamp:'2026-09-27T10:00:00Z'},{id:4,season:2,number:1,name:'New season',airdate:'2026-09-27'}];
 assert.equal(tv.merge(entry,'777',incoming,x=>x),true);
 assert.deepEqual(entry.seasons[0].watched,[1,2]);assert.equal(entry.seasons[0].total,3);
 assert.equal(entry.seasons[0].episodes.find(e=>e.number===3).title,'Return');
 assert.equal(entry.seasons[1].id,'tvmaze-777-s2');assert.deepEqual(Array.from(entry.seasons[1].watched),[]);
 assert.equal(tv.merge(entry,'777',incoming,x=>x),false,'repeat refresh does not create duplicate episodes');
 assert.equal(entry.seasons.length,2);
});
test('12.7 TV provider episode renumbering cannot silently transfer watched marks',()=>{
 const {ATTVEpisodes127:tv}=load('pro-tv-episodes-127'),entry={source:'TVMaze',seasons:[{id:'tvmaze-777-s1',source:'TVMaze',sourceId:'777',imdbSeasonNumber:1,total:2,watched:[1],episodes:[{number:1,title:'Original',tvmazeEpisodeId:'1'}]}]};
 const incoming=[{id:99,season:1,number:1,name:'Different episode'},{id:1,season:1,number:2,name:'Renumbered'}];
 tv.merge(entry,'777',incoming,x=>x);
 assert.deepEqual(entry.seasons[0].watched,[1]);assert.equal(entry.seasons[0].episodes.find(e=>e.number===1).title,'Original');
 assert.equal(entry.seasons[0].episodes.length,1,'duplicate source episode cannot create new watched position');
});
test('12.7 new feed scripts and css are precached and original cloud schema is intact',()=>{
 const html=read('index.html'),sw=read('sw.js'),app=read('assets/app.js'),phone=read('assets/pro-iphone.js'),pkg=JSON.parse(read('package.json'));
 for(const file of ['pro-episode-hub-127.js','pro-tv-episodes-127.js','pro-episode-hub-127.css']){
  assert.match(html,new RegExp(file.replaceAll('.','\\.')));assert.match(sw,new RegExp(file.replaceAll('.','\\.')));
 }
 assert.equal(pkg.version,'12.7.0');assert.match(sw,/animetrack-shell-v1270-1/);
 assert.match(phone,/at127-new-pill/);assert.match(phone,/at127-stale-head/);assert.match(phone,/recentFeed\(\),watch=splitWatch\(recent\)/);
 assert.match(app,/refreshTrackedTV127\(force\)/);assert.match(app,/ATEpisodeHub127|ATTVEpisodes127/);
 assert.match(app,/accountUser\?\.id!==uid/);assert.match(app,/ATSync126\.save/);
});
