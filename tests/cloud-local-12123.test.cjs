const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function load(){const sandbox={window:{},JSON};vm.runInNewContext(read('assets/pro-cloud-local-12123.js'),sandbox);return sandbox.window.ATCloudLocal12123}
function sample(){return {anime:[{id:'al-1',title:'Demo',status:'watching',favorite:true,rating:9,notes:'private',synopsis:'x'.repeat(2000),cover:'https://img.example/poster.jpg',seasons:[{id:'al-1',title:'Sezoni 1',subtitle:'Demo',total:12,watched:[1,2,3],loadedPages:[1,2],fillerPagesChecked:[1],synopsis:'season '.repeat(100),episodes:Array.from({length:12},(_,i)=>({number:i+1,title:'Episode '+(i+1),aired:'2026-01-'+String(i+1).padStart(2,'0'),airedAt:'2026-01-'+String(i+1).padStart(2,'0')+'T10:00:00Z',summary:'plot '.repeat(80),image:'https://img.example/'+i+'.jpg',url:'https://episode.example/'+i,filler:i===4,fillerChecked:true,fillerSource:'Jikan',fillerCheckedAt:'2026-01-01T00:00:00Z',myNote:i===1?'my note':'',personalRating:i===1?8:null,fillerManual:null}))}]}],history:[{id:'al-1',episode:3,action:'watched',date:'2026-01-03T00:00:00Z'}],preferences:{weeklyGoal:10}}}
test('13.0 online payload keeps personal state and drops reproducible episode metadata',()=>{
 const api=load(),full=sample(),compact=api.compact(full),season=compact.anime[0].seasons[0];
 assert.equal(compact.cloudSchema,'13.0');assert.deepEqual(Array.from(season.watched),[1,2,3]);
 assert.equal(compact.anime[0].status,'watching');assert.equal(compact.anime[0].favorite,true);assert.equal(compact.anime[0].notes,'private');
 assert.equal(season.episodes.length,1);assert.equal(season.episodes[0].number,2);assert.equal(season.episodes[0].myNote,'my note');assert.equal(season.episodes[0].personalRating,8);
 assert.equal('summary' in season.episodes[0],false);assert.equal('image' in season.episodes[0],false);assert.equal('url' in season.episodes[0],false);
 assert.equal('loadedPages' in season,false);assert.equal('fillerPagesChecked' in season,false);assert.equal('synopsis' in season,false);
 assert.ok(JSON.stringify(compact).length<JSON.stringify(full).length*0.35,'online payload should be much smaller than rich metadata state');
});
test('13.0 pending compact progress merges onto rich metadata without erasing it',()=>{
 const api=load(),remote=sample(),local=api.compact(remote);
 local.anime[0].seasons[0].watched=[1,2,3,4];local.anime[0].seasons[0].episodes[0].myNote='changed locally';local.history.push({id:'al-1',episode:4,action:'watched',date:'2026-01-04T00:00:00Z'});
 const merged=api.merge(remote,local),ep=merged.anime[0].seasons[0].episodes.find(x=>x.number===2);
 assert.deepEqual(Array.from(merged.anime[0].seasons[0].watched),[1,2,3,4]);assert.equal(ep.myNote,'changed locally');
 assert.match(ep.summary,/plot/);assert.match(ep.image,/img\.example/);assert.equal(merged.history.length,2);
});
test('13.0 realtime hydration treats remote personal state as authoritative but preserves cached metadata',()=>{
 const api=load(),rich=sample(),remote=api.compact(rich);
 remote.anime[0].favorite=false;remote.anime[0].rating=null;remote.anime[0].notes='';remote.anime[0].seasons[0].watched=[1,2,3,4];
 remote.anime[0].seasons[0].episodes=[];
 const hydrated=api.hydrate(remote,rich),season=hydrated.anime[0].seasons[0],ep2=season.episodes.find(x=>x.number===2);
 assert.equal(hydrated.anime[0].favorite,false);assert.equal(hydrated.anime[0].rating,null);assert.equal(hydrated.anime[0].notes,'');
 assert.deepEqual(Array.from(season.watched),[1,2,3,4]);assert.match(ep2.summary,/plot/);assert.match(ep2.image,/img\.example/);
 assert.equal(ep2.myNote,'');assert.equal(ep2.personalRating,null);
});
test('13.0 cloud-first module, compact writes and PWA revision are wired before app boot',()=>{
 const html=read('index.html'),sw=read('sw.js'),app=read('assets/app.js'),pkg=JSON.parse(read('package.json'));
 assert(html.indexOf('/assets/pro-cloud-local-12123.js')<html.indexOf('/assets/app.js'));
 assert.match(sw,/pro-cloud-local-12123\.js/);assert.match(sw,/animetrack-shell-v1310-1/);
 assert.match(app,/const payload=accountCompact\(state\)/);assert.match(app,/accountHydrateRemote\(remote,state\)/);assert.match(app,/accountApplyRemoteRecord/);
 assert.match(app,/setTimeout\(\(\)=>accountPush\(false\),120\)/);assert.match(app,/accountMergeRecovery\(remote,cached\)/);
 assert.match(app,/canReload:\(\)=>!cloudSaving&&!\(cloudDirty&&cloudMirrorUnavailable\)/);
 assert.equal(pkg.version,'13.1.0');assert.match(html,/AnimeTrack 13\.1\.0/);
});
