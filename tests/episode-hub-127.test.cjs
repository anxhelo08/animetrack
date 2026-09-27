const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function moduleAt(file,name){const ctx={window:{},Date,Map,Set,Number,String};vm.runInNewContext(read(file),ctx,{filename:file});return ctx.window[name]}
const hub=moduleAt('assets/pro-episode-hub-127.js','ATEpisodeHub127'),tv=moduleAt('assets/pro-tv-episodes-127.js','ATTVEpisodes127');
const DAY=86400000,now=Date.parse('2026-09-27T12:00:00Z');
const iso=t=>new Date(t).toISOString();
function entry(id,status,age=0){return {id,title:id,status,createdAt:iso(now-age*DAY),updatedAt:iso(now),seasons:[{id:id+'-s1',watched:[1],total:5,episodes:[]}]}}
test('12.7.3: completed title with a new episode appears inside regular watching, with no special category',()=>{
 const mentalist=entry('The Mentalist','completed',20),other=entry('Active Anime','watching',1);
 const recent=[{anime:mentalist,season:mentalist.seasons[0],n:2,when:now-3600000,watched:false,title:'New episode'}];
 const before=JSON.stringify([mentalist,other]),out=hub.classify([mentalist,other],[],recent,now);
 assert.equal(out.newEpisodes.size,1);assert.equal(out.newEpisodes.get(mentalist.id).n,2);
 assert.deepEqual(Array.from(out.active,x=>x.id),['The Mentalist','Active Anime']);
 assert.equal(out.stale.length,0);assert.equal(out.active.filter(a=>a.id===mentalist.id).length,1,'single ordinary card');
 assert.equal(JSON.stringify([mentalist,other]),before,'render grouping cannot change status, watched or metadata');
});
test('12.7.3: Re Zero is not NEW EP while Watching, even when airing today',()=>{
 const reZero=entry('Re:Zero','watching',1),old=entry('The Mentalist','completed',30);
 const recent=[{anime:reZero,season:reZero.seasons[0],n:2,when:now-1000,watched:false},
  {anime:old,season:old.seasons[0],n:2,when:now-1000,watched:false}];
 const out=hub.classify([reZero,old],[],recent,now);
 assert.equal(out.newEpisodes.has(reZero.id),false);
 assert.equal(out.newEpisodes.has(old.id),true);
 assert.equal(out.active.some(x=>x.id===reZero.id),true);
});
test('12.7.3: watched, future, and older than a week never receive a NEW EP badge',()=>{
 const a=entry('The Mentalist','completed',30),s=a.seasons[0],aired={anime:a,season:s,n:2,when:now-DAY,watched:false};
 assert.equal(hub.classify([a],[],[aired],now).newEpisodes.size,1);
 s.watched.push(2);
 assert.equal(hub.classify([a],[],[aired],now).newEpisodes.size,0,'watched event is no longer new');
 s.watched.pop();
 assert.equal(hub.classify([a],[],[{...aired,when:now+1000}],now).newEpisodes.size,0);
 assert.equal(hub.classify([a],[],[{...aired,when:now-8*DAY}],now).newEpisodes.size,0);
 assert.equal(hub.classify([a],[],[aired,{...aired}],now).newEpisodes.size,1,'duplicate release only one badge');
});
test('12.7.3: seven-day inactivity uses viewing history, not catalog updates',()=>{
 const old=entry('Old Series','watching',20),active=entry('Active Series','watching',20);
 const history=[{id:old.id,action:'watched',date:iso(now-9*DAY)},{id:active.id,action:'season-watched',date:iso(now-DAY)}];
 let out=hub.classify([old,active],history,[],now);
 assert.deepEqual(Array.from(out.stale,x=>x.id),['Old Series']);
 assert.deepEqual(Array.from(out.active,x=>x.id),['Active Series']);
 history.push({id:old.id,action:'watched',date:iso(now-5000)});
 out=hub.classify([old,active],history,[],now);
 assert.equal(out.stale.length,0);assert.deepEqual(Array.from(out.active,x=>x.id),['Old Series','Active Series']);
 assert.equal(old.status,'watching');
});
test('12.7.3: returning completed title stays in regular active list despite old history',()=>{
 const a=entry('Finished Series','completed',50),recent=[{anime:a,season:a.seasons[0],n:2,when:now-3*DAY,watched:false}];
 const out=hub.classify([a],[{id:a.id,date:iso(now-15*DAY),action:'watched'}],recent,now);
 assert.equal(out.newEpisodes.size,1);assert.equal(out.active.length,1);assert.equal(out.stale.length,0);
});
test('12.7: TVMaze discovery adds a new season without losing watched marks, rating or status',()=>{
 const a={id:'tvmaze-40',source:'TVMaze',sourceId:'40',status:'completed',rating:9,seasons:[{id:'tvmaze-40-s1',source:'TVMaze',sourceId:'40',imdbSeasonNumber:1,total:2,watched:[1,2],episodes:[{number:1,tvmazeEpisodeId:'4001',aired:'2024-01-01'},{number:2,tvmazeEpisodeId:'4002',aired:'2024-01-08'}]}]};
 const originalWatched=JSON.stringify(a.seasons[0].watched);
 const rows=[{id:4001,season:1,number:1,name:'Old Pilot',airdate:'2024-01-01'},{id:4002,season:1,number:2,name:'Old Final',airdate:'2024-01-08'},{id:4003,season:2,number:1,name:'The Return',airdate:'2026-09-27',airstamp:'2026-09-27T11:00:00Z'}];
 assert.equal(tv.merge(a,40,rows,x=>x),true);assert.equal(a.seasons.length,2);
 assert.equal(JSON.stringify(a.seasons[0].watched),originalWatched);
 assert.equal(a.seasons[1].watched.length,0);assert.equal(a.seasons[1].episodes[0].title,'The Return');
 assert.equal(a.status,'completed');assert.equal(a.rating,9);
 assert.equal(tv.merge(a,40,rows,x=>x),false,'subsequent sync does not duplicate or write');
});
test('12.7: TVMaze catalog update never moves watched numbers when remote episode ids change',()=>{
 const a={source:'TVMaze',seasons:[{id:'tvmaze-10-s1',source:'TVMaze',sourceId:'10',imdbSeasonNumber:1,total:2,watched:[1],episodes:[{number:1,tvmazeEpisodeId:'111',title:'Original'},{number:2,tvmazeEpisodeId:'222',title:'Second'}]}]};
 const rows=[{id:999,season:1,number:1,name:'Conflicting ID',airdate:'2026-09-27'},{id:333,season:1,number:3,name:'Third',airdate:'2026-09-27'}];
 assert.equal(tv.merge(a,10,rows,x=>x),true);
 assert.deepEqual(a.seasons[0].watched,[1]);assert.equal(a.seasons[0].episodes.find(x=>x.number===1).tvmazeEpisodeId,'111');
 assert.equal(a.seasons[0].total,3);
});
test('12.7 mobile and cache integration of all release-first assets',()=>{
 const iphone=read('assets/pro-iphone.js'),app=read('assets/app.js'),sw=read('sw.js'),html=read('index.html'),css=read('assets/pro-episode-hub-127.css');
 assert.match(iphone,/ATEpisodeHub127\.classify/);assert.match(iphone,/at127-new-ep/);assert.match(iphone,/at127-stale-head/);assert.doesNotMatch(iphone,/at127-fresh-list/);
 assert.match(iphone,/ctx\.markEpisode\(a\.id,s\.id,n\);if\(s\.watched\.includes\(n\)\)/);
 assert.match(app,/refreshTrackedTV127\(force\)/);assert.match(app,/ATTVEpisodes127\.merge/);
 assert.match(app,/accountUser\?\.id!==uid/);
 for(const file of ['pro-episode-hub-127.js','pro-tv-episodes-127.js','pro-episode-hub-127.css']){assert.match(html,new RegExp(file.replaceAll('.','\\.')));assert.match(sw,new RegExp(file.replaceAll('.','\\.')))}
 assert.match(css,/at127-new-ep/);assert.match(sw,/animetrack-shell-v12100-1/);
 assert.match(html,/AnimeTrack 12\.10\.0/);
});

test('12.7.2 background TV checks preserve editable pages without bypassing cloud journal',()=>{
 const feature=read('assets/pro-features.js'),app=read('assets/app.js');
 assert.match(app,/ATSync126\.save\(localStorage,KEY,state,cloudRevision,true\);accountQueueSave\(\)/);
 assert.match(feature,/finally\{liveBusy=false;document\.body\.classList\.remove\('at-live-checking'\);if\(!\['collections','profile','friends','moderation'\]\.includes\(active\)\)render\(\);renderHome\(\)\}/);
 assert.match(feature,/function onStateChange\(\)\{[\s\S]*?if\(!\['collections','profile','friends','moderation'\]\.includes\(active\)\)render\(\);renderHome\(\)/);
});
