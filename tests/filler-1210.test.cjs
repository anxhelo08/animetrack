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
 const partial={total:2,watched:[],episodes:[]};f.merge(partial,[{mal_id:1,filler:false},{mal_id:2,filler:true}],false,'now');
 assert.equal(f.kind(partial.episodes[0]),'unknown','one false field is not enough to call canon');
 assert.equal(f.kind(partial.episodes[1]),'filler','an explicit true remains visible');
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
 for(const file of ['pro-filler-1210.js','pro-filler-1210.css']){assert(html.includes('/assets/'+(file.endsWith('.css')?'styles.css':file)));assert(sw.includes('/assets/'+(file.endsWith('.css')?'styles.css':file)));}
 assert.match(sw,/animetrack-shell-v12151-1/);assert.match(html,/AnimeTrack 12\.15\.1/);
 assert.equal(JSON.parse(read('package.json')).version,'12.15.1');
});

test('12.10.2 Jikan pages are marked complete only when all flags are present',()=>{
 const full=[{mal_id:1,filler:false,recap:false},{mal_id:2,filler:true,recap:false}];
 assert.equal(f.pageVerified(full),true);
 assert.equal(f.pageVerified([]),false,'empty page is retried rather than cached');
 assert.equal(f.pageVerified([{mal_id:1,filler:false}]),false,'missing recap flag must not be counted as verified normal');
 assert.equal(f.pageVerified([{mal_id:1,filler:true,recap:false},{mal_id:2,filler:false}]),false);
 const season={globalStart:1,total:2,episodes:[]};
 f.merge(season,full,false,'now');
 assert.equal(f.storedPageVerified(season,1,false),true);
 season.episodes[1].fillerChecked=false;
 assert.equal(f.storedPageVerified(season,1,false),false,'a cached partial page must be retried');
 season.episodes.pop();
 assert.equal(f.storedPageVerified(season,1,false),false,'missing catalog entries cannot be called a complete page');
 const shared={globalStart:98,total:5,episodes:[]};
 f.merge(shared,[{mal_id:98,filler:false,recap:false},{mal_id:99,filler:false,recap:false},{mal_id:100,filler:false,recap:false}],true,'now');
 assert.equal(f.storedPageVerified(shared,1,true),true,'shared MAL pages verify only their own in-range episode numbers');
 assert.equal(f.storedPageVerified(shared,2,true),false);
});
test('12.10.2 transient and partial API results do not permanently suppress retries or invent canon',()=>{
 const app=read('assets/app.js'),src=read('assets/pro-filler-1210.js');
 assert.match(app,/fillerPageRetryUntil\.set\(key,Date\.now\(\)\+6\*60\*60\*1000\)/);
 assert.match(app,/fillerPageRetryUntil\.set\(key,Date\.now\(\)\+30\*60\*1000\)/);
 assert.match(app,/pageVerified\(j\.data\)&&window\.ATFiller1210\.storedPageVerified/);
 assert.match(app,/fillerPagesChecked=verified\?/);
 assert.match(app,/typeof d\.filler==='boolean'&&typeof d\.recap==='boolean'/);
 assert.match(src,/pageVerified,storedPageVerified/);
});
