import {test} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
import {fileURLToPath} from 'node:url';
const __filename=fileURLToPath(import.meta.url),__dirname=require('node:path').dirname(__filename);
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),script=fs.readFileSync(path.join(root,'src/modules/resume.js'),'utf8');
const w={window:{}};vm.runInNewContext(script,w);const resolve=w.window.ATResume123.resolve;
const season=(id,total,watched=[])=>({id,title:id,total,watched,releaseStatus:'FINISHED'});
const aired=s=>s.releaseStatus==='NOT_YET_RELEASED'?0:s.total;
test('One Piece resumes at last watched season and correct 24-episode page',()=>{
 const anime={id:'one-piece',seasons:[season('s1',25,Array.from({length:25},(_,i)=>i+1)),season('s2',25,Array.from({length:25},(_,i)=>i+1)),season('s3',75,Array.from({length:49},(_,i)=>i+1))]};
 const before=JSON.stringify(anime),history=[{id:anime.id,seasonId:'s3',episode:49,action:'watched'}];
 const result=resolve(anime,history,aired);
 assert.equal(result.seasonId,'s3');assert.equal(result.episode,50);assert.equal(result.page,2);
 assert.equal(JSON.stringify(anime),before,'reading a resume location must not mutate watched episodes');
});
test('jump to next season after finishing an entire season',()=>{
 const a={id:'show',seasons:[season('s1',24,Array.from({length:24},(_,i)=>i+1)),season('s2',12,[])]};
 assert.deepEqual(JSON.parse(JSON.stringify(resolve(a,[{id:'show',seasonId:'s1',episode:24,action:'watched'}],aired))),{seasonId:'s2',episode:1,page:0,reason:'next'});
});
test('fully caught-up title reopens its last actually watched episode',()=>{
 const a={id:'done',seasons:[season('s1',12,Array.from({length:12},(_,i)=>i+1)),season('s2',48,Array.from({length:48},(_,i)=>i+1))]};
 const result=resolve(a,[{id:'done',seasonId:'s2',action:'season-watched'}],aired);
 assert.equal(result.seasonId,'s2');assert.equal(result.episode,48);assert.equal(result.page,1);assert.equal(result.reason,'last-watched');
});
test('when history is absent use saved watched arrays, never another account history',()=>{
 const a={id:'my-title',seasons:[season('old',24,[1,2]),season('now',30,[1,2,3,4])]};
 assert.equal(resolve(a,[{id:'another-title',seasonId:'old',episode:20,action:'watched'}],aired).seasonId,'now');
 assert.equal(resolve(a,[],aired).episode,5);
});
test('future seasons cannot be mistaken for released episodes',()=>{
 const a={id:'future',seasons:[season('old',12,Array.from({length:12},(_,i)=>i+1)),{...season('future',24),releaseStatus:'NOT_YET_RELEASED'}]};
 assert.equal(resolve(a,[{id:'future',seasonId:'old',episode:12,action:'watched'}],aired).seasonId,'old');
});
test('new title opens first released season and initial episode',()=>{
 const a={id:'new',seasons:[{...season('future',12),releaseStatus:'NOT_YET_RELEASED'},season('aired',12)]};
 assert.equal(resolve(a,[],aired).seasonId,'aired');
});
test('detail and episode UI use the new shared data but separate desktop/mobile layouts',()=>{
 const app=fs.readFileSync(path.join(root,'src/app.js'),'utf8'),mobile=fs.readFileSync(path.join(root,'src/modules/mobile.js'),'utf8'),css=fs.readFileSync(path.join(root,'src/styles/media-workflow.css'),'utf8'),main=fs.readFileSync(path.join(root,'src/main.js'),'utf8');
 assert.match(app,/const resume=window\.ATResume123\.resolve\(a,state\.history,releasedCount\)/);
 assert.match(app,/loadSeasonEpisodes\(id,selected\.id,episodePage\)/);
 assert.match(app,/at123-resume-button/);
 assert.match(mobile,/at123-episode-layout/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1\.05fr\) minmax\(0,\.95fr\)/);
 assert.match(css,/\.at123-episode-layout\{display:flex;flex-direction:column/);
 assert.match(main,/modules\/resume\.js/);
 assert.match(main,/styles\/index\.css/);
});
test('home and personal recommendation refresh are wired',()=>{
 const home=fs.readFileSync(path.join(root,'src/modules/home.js'),'utf8'),rec=fs.readFileSync(path.join(root,'src/modules/recommendations.js'),'utf8');
 assert.match(home,/at123-release-card/);assert.match(home,/data-home-action="open-release"/);assert.match(home,/data-home-action="mark-release"/);
 assert.match(rec,/favoriteTaste/);assert.match(rec,/tab==='favorites'/);assert.match(rec,/tab==='new'/);
 assert.match(rec,/data-pro-action="preview-recommendation"/);assert.match(rec,/preview-recommendation':'add-recommendation'/);
});
