import {test} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
import {fileURLToPath} from 'node:url';
const __filename=fileURLToPath(import.meta.url),__dirname=require('node:path').dirname(__filename);
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function diary(state){
 const sandbox={window:{},Date,Map,Set,Number,String,JSON};
 vm.runInNewContext(read('src/modules/diary.js'),sandbox);
 const ctx={esc:String,state:()=>state,isMovie:a=>String(a?.format||'').toUpperCase()==='MOVIE',poster:v=>v||'',uuid:()=> 'uuid-test',save:()=>true,rerender:()=>{},toast:()=>{},openEpisode:()=>{},openAnime:()=>{}};
 return sandbox.window.ATDiary132(ctx);
}
function fixture(){
 const tv={id:'a1',title:'Example Anime',source:'AniList',format:'TV',runtime:0,seasons:[{id:'s1',title:'Sezoni 1',format:'TV',watched:[1,2,3]}],rewatches:[{id:'rw1',startedAt:'2026-09-28T16:00:00.000Z',completedAt:'',episodes:[{eventId:'rw-e2',seasonId:'s1',number:2,date:'2026-09-28T20:00:00.000Z',diaryNote:'Rewatch note',diaryRating:9}]}]};
 const movie={id:'m1',title:'Example Movie',source:'TMDB',format:'MOVIE',runtime:120,seasons:[{id:'ms1',title:'Film',format:'MOVIE',watched:[1]}],rewatches:[]};
 return {anime:[tv,movie],history:[
  {eventId:'old-e1',id:'a1',seasonId:'s1',episode:1,action:'watched',date:'2026-09-27T10:00:00.000Z'},
  {eventId:'undo-e1',id:'a1',seasonId:'s1',episode:1,action:'unwatched',date:'2026-09-27T11:00:00.000Z'},
  {eventId:'new-e1',id:'a1',seasonId:'s1',episode:1,action:'watched',date:'2026-09-28T10:00:00.000Z',diaryNote:'Great episode',diaryRating:8.5},
  {eventId:'batch',id:'a1',seasonId:'s1',episode:0,episodes:[2,3],action:'season-watched',date:'2026-09-28T11:00:00.000Z',diaryRating:8},
  {eventId:'movie-first',id:'m1',seasonId:'ms1',episode:1,action:'movie-watched',date:'2026-09-28T12:00:00.000Z',diaryNote:'Cinema'},
  {eventId:'movie-re',id:'m1',seasonId:'ms1',episode:1,action:'movie-rewatched',date:'2026-09-28T13:00:00.000Z',diaryRating:9.5}
 ],preferences:{}};
}
test('13.2 Diary derives one current first-watch entry per episode and preserves batches',()=>{
 const api=diary(fixture()),rows=api.collect();
 assert.equal(rows.length,5);
 const first=rows.find(x=>x.ref?.eventId==='new-e1'),batch=rows.find(x=>x.ref?.eventId==='batch');
 assert.ok(first);assert.equal(first.note,'Great episode');assert.equal(first.rating,8.5);
 assert.ok(batch);assert.deepEqual(Array.from(batch.episodes),[2,3]);assert.equal(batch.units,2);
 assert.equal(rows.some(x=>x.ref?.eventId==='old-e1'),false,'superseded watch event stays out of Diary');
});
test('13.2 Diary filters media and rewatch without mixing entries',()=>{
 const api=diary(fixture()),all=api.collect();
 const movies=api.filterEntries(all,{media:'movie',kind:'all',month:'all',query:''});
 const rewatches=api.filterEntries(all,{media:'all',kind:'rewatch',month:'all',query:''});
 assert.equal(movies.length,2);assert.ok(movies.every(x=>x.media==='movie'));
 assert.equal(rewatches.length,2);assert.ok(rewatches.every(x=>x.kind==='rewatch'));
 assert.equal(api.filterEntries(all,{media:'all',kind:'all',month:'all',query:'great'}).length,1);
});
test('13.2 Diary summary counts units, active days, ratings and estimated time',()=>{
 const api=diary(fixture()),sum=api.summary(api.collect(),Date.parse('2026-09-29T12:00:00Z'));
 assert.equal(sum.entries,5);assert.equal(sum.monthUnits,6);assert.equal(sum.activeDays,1);
 assert.equal(sum.average,8.8);
 assert.equal(sum.hours,5.6);
});
test('13.2 Diary metadata remains inside compact cloud history and rewatches',()=>{
 const sandbox={window:{},JSON};vm.runInNewContext(read('src/modules/cloud-local.js'),sandbox);const cloud=sandbox.window.ATCloudLocal12123;
 const state=fixture(),compact=cloud.compact(state);
 assert.equal(compact.history.find(x=>x.eventId==='new-e1').diaryNote,'Great episode');
 assert.equal(compact.history.find(x=>x.eventId==='new-e1').diaryRating,8.5);
 assert.equal(compact.anime[0].rewatches[0].episodes[0].diaryNote,'Rewatch note');
});
test('13.2 release wires Diary into Pro navigation, mobile navigation and watch records',()=>{
 const app=read('src/app.js'),features=read('src/modules/features.js'),main=read('src/main.js'),styles=read('src/styles/index.css'),html=read('index.html'),sw=read('src/sw.js'),pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.version,'13.7.0');assert.equal(pkg.releaseLabel,'13.7.0');
 assert.match(main,/modules\/diary\.js/);assert.match(styles,/diary\.css/);
 assert.match(features,/['"]diary['"]/);assert.match(features,/data-mobile-nav="diary"/);assert.match(features,/op\.startsWith\('diary-'\)/);assert.match(read('src/modules/diary.js'),/diary-edit/);
 assert.match(app,/eventId:uuid\(\)/);assert.match(app,/diaryNote/);assert.match(app,/diaryRating/);
 assert.match(html,/AnimeTrack 13\.7\.0/);assert.match(html,/AT<span>13\.7\.0<\/span>/);assert.match(sw,/precacheAndRoute\(self\.__WB_MANIFEST/);
});
