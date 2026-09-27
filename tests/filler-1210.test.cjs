const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ctx={window:{},Date,JSON,Map,Set,Number,String};vm.runInNewContext(read('assets/pro-filler-1210.js'),ctx);
const f=ctx.window.ATFiller1210;
test('filler flags: verified, unknown, recap and manual overrides',()=>{
 assert.equal(f.kind(null),'unknown');assert.equal(f.kind({filler:false}),'unknown');
 assert.equal(f.kind({fillerChecked:true,filler:false,recap:false}),'normal');
 assert.equal(f.kind({filler:true}),'filler');assert.equal(f.kind({recap:true}),'recap');
 assert.equal(f.kind({filler:true,fillerManual:false}),'normal');
 assert.equal(f.kind({filler:false,fillerManual:true}),'filler');
});
test('Jikan classification merges without changing watched marks or personal fields',()=>{
 const season={total:6,watched:[1,2],episodes:[{number:1,title:'Original',fillerManual:true,personalRating:8,myNote:'Keep'},{number:2,title:'Second'}]},watched=JSON.stringify(season.watched);
 const rows=[{mal_id:1,title:'Remote',filler:false,recap:false},{mal_id:2,title:'Filler',filler:true,recap:false},{mal_id:3,filler:false,recap:true},{mal_id:4,title:'Unknown'}];
 assert.equal(f.merge(season,rows,false,'2026-09-28T00:00:00Z'),true);
 assert.equal(JSON.stringify(season.watched),watched);
 assert.equal(season.episodes[0].title,'Original');
 assert.equal(season.episodes[0].personalRating,8);assert.equal(season.episodes[0].myNote,'Keep');
 assert.equal(f.kind(season.episodes[0]),'filler');
 assert.equal(f.kind(season.episodes[1]),'filler');
 assert.equal(f.kind(season.episodes[2]),'recap');
 assert.equal(f.kind(season.episodes[3]),'unknown');
 assert.equal(season.episodes[1].fillerChecked,true);assert.equal(season.episodes[1].fillerSource,'Jikan');
});
test('separate MAL IDs use local numbering; long shared MAL IDs use absolute numbering',()=>{
 const distinct={seasons:[{malId:'1',globalStart:1},{malId:'2',globalStart:25}]};
 assert.equal(f.sharedCatalog(distinct,distinct.seasons[1]),false);
 assert.equal(f.absolute(distinct.seasons[1],1,false),1);
 assert.deepEqual(Array.from(f.pages({...distinct.seasons[1],total:24},0,false)),[1]);
 const same={seasons:[{malId:'20',globalStart:1},{malId:'20',globalStart:95}]};
 assert.equal(f.sharedCatalog(same,same.seasons[1]),true);
 assert.deepEqual(Array.from(f.pages({...same.seasons[1],total:24},0,true)),[1,2]);
 assert.equal(f.local(same.seasons[1],101,true),7);
 const season={...same.seasons[1],total:24,watched:[1,2],episodes:[]};
 f.merge(season,[{mal_id:95,filler:true,recap:false},{mal_id:101,filler:false,recap:false}],true,'now');
 assert.equal(season.episodes.find(e=>e.number===1).filler,true);
 assert.equal(season.episodes.find(e=>e.number===7).filler,false);
 assert.deepEqual(season.watched,[1,2]);
});
test('unverified providers and incomplete payloads are never labelled by guessing',()=>{
 assert.equal(f.validId(''),false);assert.equal(f.validId('TVMaze'),false);assert.equal(f.validId('20'),true);
 assert.equal(f.kind({title:'Filler-like',filler:false}),'unknown');
 assert.throws(()=>f.merge({episodes:[]},null,false),/Invalid Jikan/);
});
test('UI and PWA integration preserve all existing routes',()=>{
 const app=read('assets/app.js'),html=read('index.html'),css=read('assets/pro-filler-1210.css'),sw=read('sw.js');
 assert.doesNotThrow(()=>new vm.Script(app));
 assert.match(app,/ATFiller1210\.merge\(s,j\.data,shared,now\(\)\)/);
 assert.doesNotMatch(app,/s\.episodes\.length>=s\.total\)return/);
 assert.match(app,/at1210-filler/);assert.match(app,/at1210-legend/);
 assert.match(app,/fillerManual:e\.fillerManual===true/);
 assert.match(app,/fillerPagesChecked:/);
 assert.match(app,/!force&&s\.fillerPagesChecked\?\.includes\(metadataPage\)/);
 assert.match(app,/data-filler-manual/);
 assert.match(css,/at1210-chip\.filler/);assert.match(css,/at1210-manual/);
 for(const file of ['pro-filler-1210.js','pro-filler-1210.css']){assert(html.includes('/assets/'+file));assert(sw.includes('/assets/'+file));}
 assert.match(sw,/animetrack-shell-v12100-1/);assert.match(html,/AnimeTrack 12\.10\.0/);
 assert.equal(JSON.parse(read('package.json')).version,'12.10.0');
});
