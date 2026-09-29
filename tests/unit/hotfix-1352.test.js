import {test} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
import {fileURLToPath} from 'node:url';
const __filename=fileURLToPath(import.meta.url),__dirname=require('node:path').dirname(__filename);
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');

function guard(){
 const sandbox={window:{},Date};
 vm.runInNewContext(read('src/modules/release-guard.js'),sandbox,{filename:'release-guard.js'});
 return sandbox.window.ATReleaseGuard1352;
}
const eps=(count,past)=>{
 const now=Date.now(),day=86400000;
 return Array.from({length:count},(_,i)=>({
  number:i+1,
  airedAt:new Date(now+(i<past?-30*day:30*day)).toISOString(),
  tvmazeEpisodeId:String(1000+i)
 }));
};

test('13.5.2 Mentalist regression: incomplete TVMaze metadata never hides known remaining episodes',()=>{
 const api=guard();
 const season={source:'TVMaze',total:24,watched:Array.from({length:14},(_,i)=>i+1),episodes:[],releaseStatus:'CURRENTLY_AIRING',airedCount:14,nextAiringEpisode:15,nextAiringAt:Date.now()/1000+86400};
 assert.equal(api.tvmazeReleasedCount(season),24);
});

test('13.5.2 partial foreign episode metadata cannot turn historical TV episodes into upcoming',()=>{
 const api=guard();
 const season={source:'TVMaze',total:24,watched:Array.from({length:14},(_,i)=>i+1),episodes:eps(14,14),releaseStatus:'RELEASING',airedCount:14};
 assert.equal(api.tvmazeReleasedCount(season),24);
});

test('13.5.2 complete TVMaze schedule still protects genuine future episodes',()=>{
 const api=guard();
 const season={source:'TVMaze',total:12,watched:[1,2,3,4,5],episodes:eps(12,5),releaseStatus:'CURRENTLY_AIRING',airedCount:5};
 assert.equal(api.tvmazeReleasedCount(season),5);
});

test('13.5.2 future TVMaze season with a verified start date remains unavailable',()=>{
 const api=guard(),future=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
 const season={source:'TVMaze',total:12,watched:[],episodes:[],releaseStart:future};
 assert.equal(api.tvmazeReleasedCount(season),0);
});

test('13.5.2 guard only owns TVMaze seasons',()=>{
 assert.equal(guard().tvmazeReleasedCount({source:'AniList',total:12,watched:[]}),null);
});

test('13.5.2 app routes TVMaze away from MAL/Jikan hydration and loads guard before app',()=>{
 const app=read('src/app.js'),main=read('src/main.js');
 assert.match(app,/String\(entry\.source\|\|''\)\.toLowerCase\(\)==='tvmaze'/);
 assert.match(app,/syncTVFranchise\(id,force,silent\)/);
 assert.match(app,/ATReleaseGuard1352\?\.tvmazeReleasedCount/);
 assert.match(app,/String\(s\.source\|\|''\)\.toLowerCase\(\)==='tvmaze'\)return;/);
 assert.ok(main.indexOf('./modules/release-guard.js')<main.indexOf('./app.js'));
});

test('13.5.2 scroll performance keeps visual design while reducing offscreen work',()=>{
 const css=read('src/styles/performance.css'),styles=read('src/styles/index.css'),app=read('src/app.js'),home=read('src/modules/home.js');
 assert.match(styles,/performance\.css/);
 assert.match(css,/content-visibility:auto/);
 assert.match(css,/contain:layout style/);
 assert.doesNotMatch(css,/\.at114-card[,\{]/,'iPhone interactive cards must never be content-visibility targets');
 assert.doesNotMatch(css,/\.at-pc-card[,\{]/,'dynamic phone cards must stay fully painted');
 assert.match(css,/backdrop-filter:none!important/);
 assert.match(app,/decoding="async"/);
 assert.match(home,/decoding="async"/);
});

test('13.5.2 release identity is consistent',()=>{
 const pkg=JSON.parse(read('package.json')),sw=read('public/sw.js'),html=read('index.html');
 assert.equal(pkg.version,'13.5.2');
 assert.equal(pkg.releaseLabel,'13.5.2');
 assert.match(sw,/animetrack-shell-v1352-1/);
 assert.match(html,/AnimeTrack 13\.5\.2/);
});
