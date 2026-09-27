const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function setup(){const store=new Map(),storage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},ctx={window:{},Date,JSON};vm.runInNewContext(read('assets/pro-sync-126.js'),ctx);return {api:ctx.window.ATSync126,storage,store}}
test('12.6 durable journal records base cloud revision before local changes',()=>{
 const {api,storage}=setup(),key='animetrack_user_alpha',a={anime:[{id:'one',seasons:[]}]};
 api.save(storage,key,a,'v1',true);
 assert.deepEqual(JSON.parse(storage.getItem(key)),a);
 assert.equal(api.pending(storage,key).baseRevision,'v1');
 api.save(storage,key,{anime:[{id:'two'}]},'v2',true);
 assert.equal(api.pending(storage,key).baseRevision,'v1','unsynced journal must preserve original CAS revision');
 assert.equal(api.remoteStatus(a,api.pending(storage,key),{payload:{anime:[]},updated_at:'v1'},x=>x),'pending');
 assert.equal(api.remoteStatus(a,api.pending(storage,key),{payload:{anime:[]},updated_at:'v2'},x=>x),'conflict');
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
test('12.6 integration prevents blind offline overwrite and only activates PWA update on consent',()=>{
 const app=read('assets/app.js'),sw=read('sw.js'),features=read('assets/pro-features.js'),html=read('index.html');
 assert.match(app,/ATSync126\.save\(localStorage,KEY,state,cloudRevision/);
 assert.match(app,/ATSync126\.remoteStatus\(cached,journal,data,accountNormalizePayload\)/);
 assert.match(app,/if\(!cloudBaseKnown&&!overwrite\)/);
 assert.match(app,/\.eq\('updated_at',cloudRevision\)\.select\('updated_at'\)\.maybeSingle\(\)/);
 assert.match(app,/if\(accountUser\?\.id!==uid\|\|JSON\.stringify\(state\)!==prior\)/);
 assert.match(sw,/animetrack-shell-v1291-1/);assert.match(sw,/event\.data\?\.type==='SKIP_WAITING'/);
 assert.doesNotMatch(sw,/c\.addAll\(SHELL\)\)\);self\.skipWaiting/);
 assert.match(sw,/c\.match\(url\.pathname\)/);
 assert.match(features,/pwaRegistration\.waiting\.postMessage\(\{type:'SKIP_WAITING'\}\)/);
 assert.match(features,/if\(!updateRequested\)return/);
 assert.match(html,/pro-sync-126\.js/);assert.match(html,/AnimeTrack 12\.9\.1/);
});
