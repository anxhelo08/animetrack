const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('12.14 season UX persists hidden parts and excludes them from resume/progress helpers',()=>{
 const app=read('src/app.js'),resume=read('src/modules/resume.js'),css=read('src/styles/season-ux.css'),pkg=JSON.parse(read('package.json'));
 assert.match(app,/hidden:raw\?\.hidden===true/);assert.match(app,/function visibleSeasons/);assert.match(app,/function setSeasonHidden/);assert.match(app,/Pjesë të fshehura/);assert.match(app,/at140-resume-chip/);assert.match(app,/at140-season-description/);
 assert.match(resume,/\.filter\(s=>!s\.hidden\)/);assert.match(css,/\.at140-resume-chip/);assert.match(css,/\.at140-hidden-parts/);assert.equal(pkg.version,'13.1.1');
});
test('12.14 resume selects the next visible season and never a hidden part',()=>{
 const sandbox={window:{}};vm.runInNewContext(read('src/modules/resume.js'),sandbox);const api=sandbox.window.ATResume123;
 const a={id:'x',seasons:[{id:'s1',hidden:true,watched:[1,2],total:2},{id:'s2',watched:[1],total:3},{id:'s3',watched:[],total:2}]};
 const out=api.resolve(a,[{id:'x',seasonId:'s1',episode:2,action:'watched'},{id:'x',seasonId:'s2',episode:1,action:'watched'}],s=>s.total);
 assert.equal(out.seasonId,'s2');assert.equal(out.episode,2);
});
test('12.14 season metadata includes descriptions and hidden TV choice survives rebuild',()=>{
 const app=read('src/app.js'),engine=read('src/modules/franchise-engine.js'),cloud=read('src/modules/cloud-local.js');
 assert.match(app,/description\(asHtml:false\)/);assert.match(cloud,/const SEASON_FIELDS=/);assert.doesNotMatch(cloud,/SEASON_FIELDS=\[[^\]]*'synopsis'/);assert.match(app,/synopsis:m\.description/);assert.match(app,/synopsis:full\.synopsis/);assert.match(engine,/synopsis:String\(show\.summary/);assert.match(engine,/hidden:old\?\.hidden===true/);
});
