const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function load(){const sandbox={window:{},JSON};vm.runInNewContext(read('assets/pro-cloud-local-12123.js'),sandbox);return sandbox.window.ATCloudLocal12123}
function sample(){return {anime:[{id:'al-1',title:'Demo',status:'watching',favorite:true,rating:9,notes:'private',synopsis:'x'.repeat(2000),seasons:[{id:'al-1',title:'Sezoni 1',subtitle:'Demo',total:12,watched:[1,2,3],loadedPages:[1,2],fillerPagesChecked:[1],episodes:Array.from({length:12},(_,i)=>({number:i+1,title:'Episode '+(i+1),aired:'2026-01-'+String(i+1).padStart(2,'0'),airedAt:'2026-01-'+String(i+1).padStart(2,'0')+'T10:00:00Z',summary:'plot '.repeat(80),image:'https://img.example/'+i+'.jpg',url:'https://episode.example/'+i,filler:i===4,fillerChecked:true,fillerSource:'Jikan',fillerCheckedAt:'2026-01-01T00:00:00Z',myNote:i===1?'my note':'',personalRating:i===1?8:null}))}]}],history:[{id:'al-1',episode:3,action:'watched',date:'2026-01-03T00:00:00Z'}],preferences:{weeklyGoal:10}}}
test('12.14.0 cloud recovery snapshot keeps progress and user data while dropping reproducible episode payload',()=>{
 const api=load(),full=sample(),compact=api.compact(full);
 assert.deepEqual(Array.from(compact.anime[0].seasons[0].watched),[1,2,3]);
 assert.equal(compact.anime[0].status,'watching');assert.equal(compact.anime[0].favorite,true);assert.equal(compact.anime[0].notes,'private');
 assert.equal(compact.anime[0].seasons[0].episodes[1].myNote,'my note');assert.equal(compact.anime[0].seasons[0].episodes[1].personalRating,8);
 assert.equal('synopsis' in compact.anime[0],false);assert.equal('summary' in compact.anime[0].seasons[0].episodes[0],false);assert.equal('image' in compact.anime[0].seasons[0].episodes[0],false);assert.equal('url' in compact.anime[0].seasons[0].episodes[0],false);
 assert.equal('loadedPages' in compact.anime[0].seasons[0],false);assert.equal('fillerPagesChecked' in compact.anime[0].seasons[0],false);
 assert.ok(JSON.stringify(compact).length<JSON.stringify(full).length*0.55,'recovery snapshot should be substantially smaller');
});
test('12.14.0 pending compact progress merges onto rich server metadata without erasing it',()=>{
 const api=load(),remote=sample(),local=api.compact(remote);
 local.anime[0].seasons[0].watched=[1,2,3,4];local.anime[0].seasons[0].episodes[1].myNote='changed locally';local.history.push({id:'al-1',episode:4,action:'watched',date:'2026-01-04T00:00:00Z'});
 const merged=api.merge(remote,local),ep=merged.anime[0].seasons[0].episodes[1];
 assert.deepEqual(Array.from(merged.anime[0].seasons[0].watched),[1,2,3,4]);assert.equal(ep.myNote,'changed locally');
 assert.match(ep.summary,/plot/);assert.match(ep.image,/img\.example/);assert.equal(merged.history.length,2);
});
test('12.14.0 cloud-first recovery module is loaded before the app and cached by the PWA',()=>{
 const html=read('index.html'),sw=read('sw.js'),app=read('assets/app.js'),pkg=JSON.parse(read('package.json'));
 assert(html.indexOf('/assets/pro-cloud-local-12123.js')<html.indexOf('/assets/app.js'));
 assert.match(sw,/pro-cloud-local-12123\.js/);assert.match(sw,/animetrack-shell-v12140-1/);
 assert.match(app,/accountLocalSnapshot\(state\)/);assert.match(app,/accountCompact\(remote\)/);assert.match(app,/accountMergeRecovery\(remote,cached\)/);
 assert.match(app,/canReload:\(\)=>!cloudSaving&&!\(cloudDirty&&cloudMirrorUnavailable\)/);
 assert.equal(pkg.version,'12.14.0');
});
