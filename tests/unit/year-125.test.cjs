const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const source=fs.readFileSync(path.join(root,'src/modules/year.js'),'utf8');
function load(){
 const ctx={window:{}};vm.runInNewContext(source,ctx,{filename:'pro-year-125.js'});
 return ctx.window.ATLibraryYear125;
}
test('12.5 release year: uses earliest known premiere across combined TV seasons',()=>{
 const {releaseYear}=load();
 const dexter={title:'Dexter',year:2021,updatedAt:'2026-09-27',seasons:[{year:2006,releaseStart:'2006-10-01',episodes:[]},{year:2021,releaseStart:'2021-11-07'}]};
 assert.equal(releaseYear(dexter),2006);
 assert.equal(releaseYear({title:'One Piece',year:1999,seasons:[{year:2026,releaseStart:'2026-01-01'}]}),1999);
 assert.equal(releaseYear({year:'2024',seasons:[]}),2024);
 assert.equal(releaseYear({year:0,seasons:[{year:null}]}),null);
});
test('12.5 release year: dated episodes are fallback, never date added to library',()=>{
 const {releaseYear}=load();
 assert.equal(releaseYear({createdAt:'2026-09-27',updatedAt:'2026-09-27',seasons:[{episodes:[{airedAt:'2001-07-18T12:00:00Z'},{aired:'1999-10-20'}]}]}),1999);
 assert.equal(releaseYear({createdAt:'2026-09-27',updatedAt:'2026-09-27',seasons:[]}),null);
 assert.equal(releaseYear({year:'unknown',seasons:[{releaseStart:'2099-99-99',episodes:[{aired:'2007-06-30'}]}]}),2007);
 assert.equal(releaseYear({year:'',seasons:[{year:NaN,episodes:[{airedAt:'not-a-date'}]}]}),null);
});
test('12.5 sort: newest/oldest, missing years at the end and stable ties',()=>{
 const api=load(),items=[{id:'unknown',createdAt:'2026-09-27'},{id:'tv',year:2006,seasons:[{year:2021}]},{id:'new-a',year:2025},{id:'new-b',year:2025},{id:'old',year:1999}];
 const before=JSON.stringify(items);
 assert.deepEqual(Array.from(api.sort(items,'year-new'),x=>x.id),['new-a','new-b','tv','old','unknown']);
 assert.deepEqual(Array.from(api.sort(items,'year-old'),x=>x.id),['old','tv','new-a','new-b','unknown']);
 assert.deepEqual(Array.from(api.sort(items,'updated'),x=>x.id),items.map(x=>x.id));
 assert.equal(JSON.stringify(items),before,'sorting may not change or persist the user library');
});
test('12.5 integration: one sorting control for anime and TV in both viewports',()=>{
 const read=p=>fs.readFileSync(path.join(root,p),'utf8');
 const html=read('index.html'),main=read('src/main.js'),styles=read('src/styles/index.css'),core=read('src/app.js'),mobile=read('src/modules/mobile.js'),sw=read('public/sw.js');
 assert.match(html,/value="year-new"/);assert.match(html,/value="year-old"/);
 assert.match(mobile,/data-at117-sort="year-new"/);assert.match(mobile,/data-at117-sort="year-old"/);
 assert.match(core,/ATLibraryYear125\.sort\(anime,sort\)/);assert.match(core,/data-release-year=/);
 assert.match(main,/modules\/year\.js/);assert.match(styles,/year\.css/);
 assert.match(sw,/pathname\.startsWith\('\/assets\/'\)/);
 assert.match(sw,/animetrack-shell-v1352-1/);assert.match(html,/AnimeTrack 13\.5\.2/);
 assert.match(core,/\$\('at125-sort-hint'\)\.hidden/);
});
