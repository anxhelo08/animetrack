const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function load(){const ctx={window:{}};vm.runInNewContext(read('src/modules/franchise.js'),ctx);return ctx.window.ATFranchise1212}
test('13.1 Franchise Timeline 2.0 summarizes per-part ratings and metadata',()=>{
 const api=load(),parts=[
  {id:'s1',title:'Sezoni 1',format:'TV',releaseStart:'2020-01-03',myRating:8},
  {id:'m1',title:'Film',format:'MOVIE',releaseStart:'2021-12-24',myRating:9.5},
  {id:'s2',title:'Sezoni 2',format:'TV',releaseStart:'2023-07-06',myRating:null}
 ];
 const summary=api.ratingSummary(parts),movie=api.partMeta(parts[1]);
 assert.equal(summary.count,2);assert.equal(summary.average,8.8);assert.equal(summary.best.id,'m1');assert.equal(summary.best.rating,9.5);
 assert.equal(movie.label,'Film');assert.equal(movie.icon,'🎬');assert.equal(movie.date,'2021-12-24');
});
test('13.1 arc ratings normalize safe names, ranges and ratings',()=>{
 const api=load(),arc=api.normalizeArc({id:'a1',name:'  Shibuya   Incident  ',start:32,end:47,rating:9.7,note:'great'},0);
 assert.equal(arc.id,'a1');assert.equal(arc.name,'Shibuya Incident');assert.equal(arc.start,32);assert.equal(arc.end,47);assert.equal(arc.rating,9.7);assert.equal(arc.note,'great');
 const clamped=api.normalizeArc({name:'Arc',start:8,end:3,rating:99},1);assert.equal(clamped.start,8);assert.equal(clamped.end,8);assert.equal(clamped.rating,10);
});
test('13.1 arc and season ratings are persisted through normalization, cloud and TV rebuilds',()=>{
 const app=read('src/app.js'),cloud=read('src/modules/cloud-local.js'),engine=read('src/modules/franchise-engine.js');
 assert.match(app,/FRANCHISE_SCHEMA='13\.1\.0'/);assert.match(app,/arcRatings:\(Array\.isArray/);assert.match(app,/at131EnhanceDetail/);assert.match(app,/data-at131-part-rating/);assert.match(app,/data-at131-arc-rating/);
 assert.match(cloud,/['"]arcRatings['"]/);assert.match(engine,/arcRatings:Array\.isArray\(old\?\.arcRatings\)/);
});
test('13.1 release identity and PWA cache are consistent',()=>{
 const html=read('index.html'),sw=read('public/sw.js'),pkg=JSON.parse(read('package.json')),css=read('src/styles/franchise.css');
 assert.equal(pkg.version,'13.4.0');assert.match(html,/AnimeTrack 13\.4/);assert.match(html,/AT<span>13\.4<\/span>/);assert.match(sw,/animetrack-shell-v1340-1/);
 assert.match(css,/\.at131-franchise/);assert.match(css,/\.at131-arc-add/);
});
