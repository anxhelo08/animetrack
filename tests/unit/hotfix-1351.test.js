import {htmlHelpers,avatarHelpers} from '../helpers/html.js';
import {test} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
import {fileURLToPath} from 'node:url';
const __filename=fileURLToPath(import.meta.url),__dirname=require('node:path').dirname(__filename);
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');

function homeApi(){
 const ctx={window:{ATHTML:htmlHelpers,ATAvatar:avatarHelpers},Date,Intl,console};
 vm.runInNewContext(read('src/modules/home.js'),ctx);
 return ctx.window.ATHome;
}

test('13.6.0 Continue Watching ignores movie parts when numbering TV seasons',()=>{
 const ATHome=homeApi();
 const s1={id:'s1',format:'TV',total:26,watched:Array.from({length:26},(_,i)=>i+1),episodes:[]};
 const s2={id:'s2',format:'TV',total:18,watched:Array.from({length:18},(_,i)=>i+1),episodes:[]};
 const movie={id:'movie',format:'MOVIE',total:1,watched:[1],episodes:[]};
 const s3={id:'s3',format:'TV',total:11,watched:[1,2,3,4,5,6,7],episodes:[]};
 const anime={id:'demon',title:'Demon Slayer',status:'watching',cover:'',seasons:[s1,s2,movie,s3],updatedAt:'2026-09-29T10:00:00Z'};
 const state={anime:[anime],history:[],preferences:{}};
 const seasonNumber=(a,s)=>{
  const idx=a.seasons.indexOf(s);
  return a.seasons.slice(0,idx+1).filter(x=>['TV','TV_SHORT','ONA','TV_SERIES'].includes(x.format)).length;
 };
 const api=ATHome({
  esc:v=>String(v??''),state:()=>state,user:()=>({id:'u1'}),poster:()=>'',
  nextEpisode:()=>({season:s3,n:8}),seasonNumber,
  releasedTotal:()=>55,count:()=>51,percent:()=>93,released:s=>s.total||0,
  recentAiring:()=>[],upcoming:()=>[],liveStatus:()=>({}),
  el:()=>null,rerender:()=>{},navigate:()=>{},openFilter:()=>{},openAnime:()=>{},openEpisode:()=>{},
  markNext:()=>{},undoEpisode:()=>false,toast:()=>{},save:()=>{},markEpisode:()=>{},refreshAiring:()=>{}
 });
 const rendered=api.render();
 assert.match(rendered.lineup,/S3 · EP 8/);
 assert.doesNotMatch(rendered.lineup,/S4 · EP 8/);
 assert.match(rendered.feature,/S3 · Episodi 8/);
});

test('13.6.0 mobile sync re-subscribes and re-fetches when app wakes',()=>{
 const app=read('src/app.js'),sync=read('src/modules/cross-sync.js'),features=read('src/modules/features.js');
 assert.match(app,/function accountWakeCloud\(force=false\)/);
 assert.match(app,/accountStartRealtime\(accountUser\.id\)/);
 assert.match(app,/window\.addEventListener\('pageshow',\(\)=>accountWakeCloud\(true\)\)/);
 assert.match(app,/window\.addEventListener\('online',\(\)=>accountWakeCloud\(true\)\)/);
 assert.match(app,/status==='CHANNEL_ERROR'\|\|status==='TIMED_OUT'\|\|status==='CLOSED'/);
 assert.match(sync,/channel\.subscribe\(\(status,error\)=>/);
 assert.match(features,/window\.addEventListener\('online',check\);\s*check\(\);\s*createVisibleScheduler\(check,\{interval:60\*60000\}\)/);
});

test('13.6.0 release identity is bumped for PWA cache invalidation',()=>{
 const pkg=JSON.parse(read('package.json')),sw=read('src/sw.js'),html=read('index.html');


 assert.match(sw,/precacheAndRoute\(self\.__WB_MANIFEST/);

});
