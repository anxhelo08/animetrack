import {htmlHelpers,avatarHelpers} from '../helpers/html.js';
import {test} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
import {fileURLToPath} from 'node:url';
const __filename=fileURLToPath(import.meta.url),__dirname=require('node:path').dirname(__filename);
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function load(){const sandbox={window:{ATHTML:htmlHelpers,ATAvatar:avatarHelpers},JSON};vm.runInNewContext(read('src/modules/cloud-local.js'),sandbox);return sandbox.window.ATCloudLocal12123}
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
test('13.6 cloud-first module, generated PWA and release identity are wired before app boot',()=>{
 const html=read('index.html'),sw=read('src/sw.js'),app=read('src/app.js'),main=(read('src/main.js')+read('src/startup-factories.js')),pkg=JSON.parse(read('package.json'));

 assert.match(sw,/precacheAndRoute\(self\.__WB_MANIFEST/);
 assert.match(app,/const payload=accountCompact\(state\)/);assert.match(app,/accountHydrateRemote\(remote,state\)/);assert.match(app,/accountApplyRemoteRecord/);
 assert.match(app,/setTimeout\(\(\)=>accountPush\(false\),120\)/);assert.match(app,/accountMergeRecovery\(remote,cached\)/);
 assert.match(app,/canReload:\(\)=>!cloudSaving&&!\(cloudDirty&&cloudMirrorUnavailable\)/);

});

test('13.6 conflict merge unions watched progress and history from both devices',()=>{
 const api=load(),remote=api.compact(sample()),local=api.compact(sample());
 remote.anime[0].updatedAt='2026-09-29T10:00:00Z';
 local.anime[0].updatedAt='2026-09-29T10:01:00Z';
 remote.anime[0].seasons[0].watched=[1,2,5];
 local.anime[0].seasons[0].watched=[1,2,3,4];
 remote.history=[{id:'al-1',seasonId:'al-1',episode:5,action:'watched',date:'2026-09-29T10:00:00Z'}];
 local.history=[{id:'al-1',seasonId:'al-1',episode:4,action:'watched',date:'2026-09-29T10:01:00Z'}];
 const merged=api.merge(remote,local);
 assert.deepEqual(Array.from(merged.anime[0].seasons[0].watched),[1,2,3,4,5]);
 assert.equal(merged.history.length,2);
});

test('14.2 concurrent bulk events with the same timestamp retain both episode batches and stable event IDs dedupe',()=>{
 const api=load(),stamp='2026-09-30T12:00:00Z',a={id:'a',seasonId:'s',episode:0,action:'season-watched',date:stamp,episodes:[1,2]},b={...a,episodes:[3,4]};
 const merged=api.merge({anime:[],history:[a,{...a,eventId:'fixed'}],preferences:{}},{anime:[],history:[b,{...a,eventId:'fixed'}],preferences:{}});
 assert.equal(merged.history.length,3);assert.deepEqual(Array.from(merged.history[0].episodes),[1,2]);assert.deepEqual(Array.from(merged.history[2].episodes),[3,4]);
});
test('14.2 independent custom lists survive conflicts and the newer shared list wins',()=>{
 const api=load(),remote={anime:[],history:[],preferences:{customLists:[{id:'one',title:'PC',updatedAt:'2026-09-30T12:00:00Z'},{id:'shared',title:'New',updatedAt:'2026-09-30T13:00:00Z'}]}},local={anime:[],history:[],preferences:{customLists:[{id:'two',title:'Phone',updatedAt:'2026-09-30T12:00:00Z'},{id:'shared',title:'Old',updatedAt:'2026-09-30T11:00:00Z'}]}};
 const before=JSON.stringify({remote,local}),merged=api.merge(remote,local);assert.equal(merged.preferences.customLists.length,3);assert.equal(merged.preferences.customLists.find(x=>x.id==='shared').title,'New');assert.equal(JSON.stringify({remote,local}),before);
});
test('14.2 large offline history merge retains independent events without duplicate synchronized events',()=>{
 const api=load(),rows=Array.from({length:12000},(_,i)=>({eventId:'event-'+i,id:'a',seasonId:'s',episode:i%12+1,action:'watched',date:'2026-09-30T12:00:00Z'}));
 const merged=api.merge({anime:[],history:rows.slice(0,9000),preferences:{}},{anime:[],history:rows.slice(3000),preferences:{}});assert.equal(merged.history.length,12000);
});
