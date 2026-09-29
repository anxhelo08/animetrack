import {test} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
import {fileURLToPath} from 'node:url';
const __filename=fileURLToPath(import.meta.url),__dirname=require('node:path').dirname(__filename);
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function setup(){const store=new Map(),storage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},ctx={window:{},Date,JSON};vm.runInNewContext(read('src/modules/sync.js'),ctx);return {api:ctx.window.ATSync126,storage,store}}
test('12.6 durable journal records base cloud revision before local changes',()=>{
 const {api,storage}=setup(),key='animetrack_user_alpha',a={anime:[{id:'one',seasons:[]}]};
 api.save(storage,key,a,'v1',true);
 assert.deepEqual(JSON.parse(storage.getItem(key)),a);
 assert.equal(api.pending(storage,key).baseRevision,'v1');
 api.save(storage,key,{anime:[{id:'two'}]},'v2',true);
 assert.equal(api.pending(storage,key).baseRevision,'v1','unsynced journal must preserve original CAS revision');
 assert.equal(api.remoteStatus(a,api.pending(storage,key),{payload:{anime:[]},updated_at:'v1'},x=>x),'pending');
 const journal=api.pending(storage,key);
 assert.equal(api.remoteStatus(a,journal,{payload:{anime:[]},updated_at:new Date(journal.savedAt+1000).toISOString()},x=>x),'remote-newer');
 assert.equal(api.remoteStatus(a,journal,{payload:{anime:[]},updated_at:new Date(Math.max(1,journal.savedAt-1000)).toISOString()},x=>x),'local-newer');
 assert.equal(api.remoteStatus(a,api.pending(storage,key),{payload:a,updated_at:'v2'},x=>x),'same');
});
test('12.6 local storage failure restores previous marker and does not claim success',()=>{
 const {api,storage}=setup(),key='animetrack_user_beta';
 api.save(storage,key,{anime:[{id:1}]},'r0',true);const before=storage.getItem(api.pendingKey(key));
 const failing={...storage,setItem:(k,v)=>{if(k===key)throw Error('quota exceeded');storage.setItem(k,v)}};
 assert.throws(()=>api.save(failing,key,{anime:[{id:2}]},'r1',true),/quota exceeded/);
 assert.equal(storage.getItem(api.pendingKey(key)),before);
 assert.equal(JSON.parse(storage.getItem(key)).anime[0].id,1);
 const newcomer={...storage,setItem:(k,v)=>{if(k==='animetrack_user_new')throw Error('quota exceeded');storage.setItem(k,v)}};
 assert.throws(()=>api.save(newcomer,'animetrack_user_new',{anime:[]},null,true),/quota exceeded/);
 assert.equal(storage.getItem(api.pendingKey('animetrack_user_new')),null);
});
test('12.6 acknowledge only removes journal after success, retains pending edits in-flight',()=>{
 const {api,storage}=setup(),key='animetrack_user_gamma';
 api.save(storage,key,{anime:[1]},'v1',true);
 api.acknowledge(storage,key,'v2',true);
 assert.equal(api.pending(storage,key).baseRevision,'v2');assert.equal(api.revision(storage,key),'v2');
 api.acknowledge(storage,key,'v3',false);
 assert.equal(api.pending(storage,key),null);assert.equal(api.revision(storage,key),'v3');
 assert.equal(api.remoteStatus({anime:[1]},null,{payload:{anime:[2]}},x=>x),'remote');
});
test('12.6 account records remain isolated and invalid journals refuse silent replacement',()=>{
 const {api,storage}=setup();
 api.save(storage,'animetrack_user_one',{anime:[{id:1}]},'one-r1',true);
 api.save(storage,'animetrack_user_two',{anime:[{id:2}]},'two-r1',true);
 api.acknowledge(storage,'animetrack_user_one','one-r2',false);
 assert.equal(api.pending(storage,'animetrack_user_one'),null);
 assert.equal(api.pending(storage,'animetrack_user_two').baseRevision,'two-r1');
 storage.setItem(api.pendingKey('animetrack_user_two'),'{corrupt');
 assert.equal(api.pending(storage,'animetrack_user_two').invalid,true);
 assert.throws(()=>api.save(storage,'animetrack_user_two',{anime:[]},'new',true),/Journal lokal/);
});
test('13.6 integration merges divergent updated_at revisions before conditional cloud writes',()=>{
 const app=read('src/app.js'),sync=read('src/modules/sync.js'),features=read('src/modules/features.js'),html=read('index.html');
 assert.match(app,/ATSync126\.save\(localStorage,KEY,accountLocalSnapshot\(state\),cloudRevision/);
 assert.match(app,/check==='remote-newer'\|\|check==='local-newer'/);
 assert.match(app,/state=accountMergeRecovery\(remoteBase,state\)/);
 assert.match(app,/\.eq\('updated_at',cloudRevision\)\.select\('updated_at'\)\.maybeSingle\(\)/);
 assert.match(sync,/remoteAt>localAt\?'remote-newer':'local-newer'/);
 assert.match(features,/await pwaUpdater\(true\)/);
 assert.match(read('src/sw.js'),/precacheAndRoute\(self\.__WB_MANIFEST/);
 assert.match(read('src/main.js'),/modules\/sync\.js/);
 assert.match(html,/AnimeTrack 13\.7\.0/);
});

test('13.0 realtime helper subscribes only to the signed-in user library row',()=>{
 const code=read('src/modules/cross-sync.js'),ctx={window:{}};vm.runInNewContext(code,ctx);const api=ctx.window.ATCrossSync12153;
 let event=null,opts=null,callback=null,statusCallback=null,subscribed=false,removed=false;
 let unsubscribed=false;
 const channel={on:(e,o,cb)=>{event=e;opts=o;callback=cb;return channel},subscribe:cb=>{subscribed=true;statusCallback=cb;return channel},unsubscribe:()=>{unsubscribed=true}};
 const client={channel:name=>{assert.equal(name,'animetrack-library-user-123');return channel},removeChannel:ch=>{assert.equal(ch,channel);removed=true}};
 let payload=null,status=null;const returned=api.start(client,'user-123',p=>payload=p,s=>status=s);
 assert.equal(returned,channel);assert.equal(event,'postgres_changes');assert.equal(opts.table,'anime_libraries');assert.equal(opts.filter,'user_id=eq.user-123');assert.equal(subscribed,true);
 statusCallback('SUBSCRIBED');assert.equal(status,'SUBSCRIBED');
 callback({new:{updated_at:'2026-09-28T18:00:00Z'}});assert.equal(payload.new.updated_at,'2026-09-28T18:00:00Z');assert.equal(api.stop(client,channel),true);assert.equal(unsubscribed,true);assert.equal(removed,true);
});
test('13.6 app cleans realtime on account switches and page lifecycle boundaries',()=>{
 const app=read('src/app.js'),cross=read('src/modules/cross-sync.js');
 assert.match(app,/function accountStartRealtime/);assert.match(app,/accountStopRealtime\(\)/);assert.match(app,/accountStartRealtime\(uid\)/);
 assert.match(app,/addEventListener\('pagehide',accountStopRealtime\)/);
 assert.match(app,/visibilitychange/);assert.match(app,/pageshow/);assert.match(app,/30000/);
 assert.match(cross,/channel\.unsubscribe/);assert.match(cross,/client\.removeChannel/);
 assert.match(read('src/main.js'),/modules\/cross-sync\.js/);
});
