const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function load(){const sandbox={window:{},console,Date,JSON};vm.runInNewContext(read('assets/pro-storage-1274.js'),sandbox);vm.runInNewContext(read('assets/pro-sync-126.js'),sandbox);return sandbox.window}
function store(max=200){
 const map=new Map(),quota=()=>Object.assign(Error('Failed to execute setItem: exceeded the quota'),{name:'QuotaExceededError'});
 const storage={get length(){return map.size},key:i=>Array.from(map.keys())[i]??null,getItem:k=>map.has(k)?map.get(k):null,removeItem:k=>map.delete(k),setItem:(k,v)=>{
  const used=Array.from(map.entries()).reduce((n,[key,val])=>n+(key===k?0:key.length+val.length),0)+k.length+String(v).length;
  if(used>max)throw quota();map.set(k,String(v));
 }};
 return {storage,map}
}
test('12.7.4 quota recovery purges only disposable metadata, not progress or backups',()=>{
 const {ATStorage1274:app}=load(),{storage,map}=store(800);
 map.set('animetrack_v8_season_cache','c'.repeat(480));
 map.set('animetrack_recs_v125_abc','r'.repeat(120));
 map.set('animetrack_user_abc','user-progress');
 map.set('animetrack_user_abc_pending_126','pending-offline');
 map.set('animetrack_user_abc_before_tv_unify_120','old-backup');
 map.set('animetrack_v1','guest-progress');
 map.set('sb-test-auth-token','auth-stays');
 const result=app.write(storage,'animetrack_user_new','library'.repeat(30));
 assert.equal(result.ok,true);assert(result.reclaimed.length>0);
 for(const key of ['animetrack_user_abc','animetrack_user_abc_pending_126','animetrack_user_abc_before_tv_unify_120','animetrack_v1','sb-test-auth-token'])assert(map.has(key),key);
 assert.equal(map.get('animetrack_user_new'),'library'.repeat(30));
 assert.equal(app.disposable('animetrack_recs_v125_user'),true);
 assert.equal(app.disposable('animetrack_rec_prefs_v10_user'),false,'recommendation preferences are personal data');
});
test('12.7.4 unrecoverable full storage returns read-only instead of discarding a library',()=>{
 const {ATStorage1274:app}=load(),{storage,map}=store(130);
 map.set('animetrack_user_main','old'.repeat(32));
 map.set('animetrack_user_main_pending_126','pending');
 const before=map.get('animetrack_user_main');
 const result=app.write(storage,'animetrack_user_main','new'.repeat(50));
 assert.equal(result.ok,false);assert.equal(map.get('animetrack_user_main'),before);
 assert.equal(map.get('animetrack_user_main_pending_126'),'pending');
});
test('12.7.4 retrying a cloud mutation retains its original journal and latest snapshot',()=>{
 const {ATStorage1274:app,ATSync126:sync}=load(),{storage,map}=store(500);
 map.set('animetrack_v8_season_cache','cache'.repeat(50));
 const key='animetrack_user_test',state={anime:[{id:'show',watched:[1,2]}],history:[]};
 const result=app.save(storage,key,state,'r1',true,sync);
 assert.equal(result.ok,true);
 assert.equal(JSON.parse(storage.getItem(key)).anime[0].watched.length,2);
 assert.equal(sync.pending(storage,key).baseRevision,'r1');
 assert.equal(sync.remoteStatus(state,sync.pending(storage,key),{payload:{anime:[]},updated_at:'r2'},x=>x),'conflict');
});
test('12.7.4 persistent recovery gate is wired before app, and no site-data reset exists',()=>{
 const html=read('index.html'),sw=read('sw.js'),core=read('assets/app.js'),css=read('assets/pro-storage-1274.css'),pkg=JSON.parse(read('package.json'));
 assert.match(html,/pro-storage-1274\.js/);assert.match(html,/styles\.css/);
 assert(html.indexOf('/assets/pro-storage-1274.js')<html.indexOf('/assets/app.js'));
 assert.match(sw,/animetrack-shell-v12122-1/);assert.match(sw,/pro-storage-1274\.js/);
 assert.equal(pkg.version,'12.12.2');
 assert.match(core,/cloudMirrorUnavailable=!mirror\.ok/);assert.match(core,/data-at128-export/);
 assert.match(core,/const pending=cloudDirty/);assert.match(core,/ATStorage1274\.save\(localStorage,KEY,state,cloudRevision,true/);
 assert.doesNotMatch(core,/localStorage\.clear\(/);
 assert.match(css,/at128-storage-blocked/);
});
