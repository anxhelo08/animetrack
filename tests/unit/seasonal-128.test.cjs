const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const realm={window:{},Date,Map,Set,Number,String};vm.runInNewContext(read('src/modules/seasonal.js'),realm,{filename:'pro-seasonal-128.js'});
const genre=realm.window.ATSeasonal128;
const items=[
 {key:'a',title:'Parallel World',english:'Alternate World',format:'TV',genre:'Action, Fantasy',seasonTags:['Isekai','Adventure']},
 {key:'b',title:'Hidden Truth',format:'TV',genre:'Drama, Mystery',seasonTags:['Thriller','Psychological']},
 {key:'c',title:'Sweet Days',format:'MOVIE',genre:'Romance, Slice of Life',seasonTags:[]},
 {key:'d',title:'Robot Dawn',format:'TV',genre:'Sci-Fi, Mecha',seasonTags:[]}
];
test('12.8 genre chips select authentic provider tags and genres, never infer from synopsis',()=>{
 assert.equal(genre.includes(items[0],'Isekai'),true);
 assert.equal(genre.includes(items[1],'Thriller'),true);
 assert.equal(genre.includes(items[1],'Drama'),true);
 assert.equal(genre.includes(items[0],'Thriller'),false);
 assert.equal(genre.includes({genre:'Drama',synopsis:'An isekai thriller'},'Isekai'),false);
 assert.equal(genre.includes(items[3],'Science Fiction'),true);
 assert.equal(genre.includes(items[2],'Slice of Life'),true);
});
test('12.8 combined format, title, added-to-library and genre filters never mutate account progress',()=>{
 const before=JSON.stringify(items);
 assert.deepEqual(Array.from(genre.list(items,{genre:'Drama'}),x=>x.key),['b']);
 assert.deepEqual(Array.from(genre.list(items,{genre:'Isekai',format:'TV'}),x=>x.key),['a']);
 assert.deepEqual(Array.from(genre.list(items,{genre:'Romance',format:'TV'}),x=>x.key),[]);
 assert.deepEqual(Array.from(genre.list(items,{genre:'Thriller',query:'TRUTH'}),x=>x.key),['b']);
 assert.deepEqual(Array.from(genre.list(items,{genre:'all',unadded:true,inLibrary:item=>item.key==='a'}),x=>x.key),['b','c','d']);
 assert.deepEqual(Array.from(genre.list([items[0],items[0],items[1]],{}),x=>x.key),['a','b']);
 assert.equal(JSON.stringify(items),before);
});
test('12.8 genre count lists cover entire loaded season and preserve multiple memberships',()=>{
 const c=genre.counts(items);
 assert.equal(c.all,4);assert.equal(c.Drama,1);assert.equal(c.Thriller,1);assert.equal(c.Isekai,1);
 assert.equal(c.Fantasy,1);assert.equal(c['Sci-Fi'],1);assert.equal(c.Horror,0);
 assert(genre.presets.some(([k])=>k==='Isekai'));
 assert(genre.presets.some(([k])=>k==='Thriller'));
 assert.deepEqual(Array.from(genre.tags(items[1],3)),['Drama','Mystery','Thriller']);
});
test('12.8 AniList tag handling removes spoiler tags and low-confidence tags',()=>{
 const tags=genre.safeTags({tags:[
  {name:'Isekai',rank:90,isMediaSpoiler:false,isGeneralSpoiler:false},
  {name:'Thriller',rank:71,isMediaSpoiler:false,isGeneralSpoiler:false},
  {name:'Secret Ending',rank:97,isMediaSpoiler:true,isGeneralSpoiler:false},
  {name:'Other Secret',rank:94,isMediaSpoiler:false,isGeneralSpoiler:true},
  {name:'Low Ranking',rank:24,isMediaSpoiler:false,isGeneralSpoiler:false}
 ]});
 assert.deepEqual(Array.from(tags),['Isekai','Thriller']);
});
test('12.8 seasonal UI, mobile entry, provider queries and bounded regenerative caches',()=>{
 const app=read('src/app.js'),html=read('index.html'),features=read('src/modules/features.js'),main=read('src/main.js'),styles=read('src/styles/index.css'),sw=read('public/sw.js'),css=read('src/styles/seasonal.css');
 for(const ref of ['season-genres','season-genre-search','season-filter-reset'])assert(html.includes(ref),ref);assert.match(main,/modules\/seasonal\.js/);assert.match(styles,/seasonal\.css/);
 assert(main.indexOf('./modules/seasonal.js')<main.indexOf('./app.js'));
 assert.match(app,/ATSeasonal128\.list/);assert.match(app,/ATSeasonal128\.safeTags/);
 assert.match(app,/tags\{name rank isMediaSpoiler isGeneralSpoiler\}/);
 assert.match(app,/slice\(0,8\)/);
 assert.match(app,/Object\.entries\(v8SeasonCache\)\.filter/);
 assert.match(features,/data-at128-open-seasons/);assert.match(features,/ctx\.navigate\('seasons'\)/);
 assert.match(css,/at128-season-search/);assert.match(css,/min-height:44px/);
 assert.match(sw,/animetrack-shell-v1351-1/);
 assert.match(sw,/pathname\.startsWith\('\/assets\/'\)/);
 assert.match(html,/AnimeTrack 13\.5\.1/);
 assert.equal(JSON.parse(read('package.json')).version,'13.5.1');
});
test('12.8 auth/storage and PWA update protection stay enabled',()=>{
 const app=read('src/app.js'),sw=read('public/sw.js'),storage=read('src/modules/storage.js');
 assert.match(app,/ATStorage1274\.save\(localStorage,KEY,localSnapshot,cloudRevision/);
 assert.match(app,/ATSync126\.remoteStatus/);
 assert.match(app,/cloudMirrorUnavailable=!mirror\.ok/);
 assert.match(app,/data-at128-export/);
 assert.match(storage,/Never remove a library/);
 assert.match(sw,/SKIP_WAITING/);
 assert.doesNotMatch(app,/localStorage\.clear\(/);
});
