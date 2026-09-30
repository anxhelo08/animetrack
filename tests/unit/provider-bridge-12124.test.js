import {readCoreSource} from '../helpers/core-source.js';
import {htmlHelpers,avatarHelpers} from '../helpers/html.js';
import {test} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
import {fileURLToPath} from 'node:url';
const __filename=fileURLToPath(import.meta.url),__dirname=require('node:path').dirname(__filename);
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function load(){const sandbox={window:{ATHTML:htmlHelpers,ATAvatar:avatarHelpers}};vm.runInNewContext(read('src/modules/franchise.js'),sandbox);vm.runInNewContext(read('src/modules/provider-bridge.js'),sandbox);return sandbox.window.ATProviderBridge12124}
const seq=n=>Array.from({length:n},(_,i)=>i+1);
function demon(){
 const tv={id:'tvmaze-41469',title:'Demon Slayer',source:'TVMaze',format:'TV_SERIES',year:2019,seasons:[
  {id:'tv-1',format:'TV',source:'TVMaze',total:26,watched:seq(26),episodes:[]},
  {id:'tv-2',format:'TV',source:'TVMaze',total:18,watched:seq(18),episodes:[]},
  {id:'tv-3',format:'TV',source:'TVMaze',total:11,watched:seq(7),episodes:[]},
  {id:'tv-4',format:'TV',source:'TVMaze',total:8,watched:[],episodes:[]}
 ]};
 const al={id:'al-card',title:'Kimetsu no Yaiba',source:'AniList',sourceId:'101922',format:'TV',year:2019,status:'watching',seasons:[
  {id:'al-101922',subtitle:'Demon Slayer: Kimetsu no Yaiba',aliases:['Kimetsu no Yaiba','Demon Slayer: Kimetsu no Yaiba'],source:'AniList',sourceId:'101922',format:'TV',total:26,watched:seq(26),releaseStart:'2019-04-06',episodes:[]},
  {id:'al-112151',subtitle:'Demon Slayer -Kimetsu no Yaiba- The Movie: Mugen Train',source:'AniList',sourceId:'112151',format:'MOVIE',total:1,watched:[1],releaseStart:'2020-10-16',episodes:[]},
  {id:'al-129874',subtitle:'Demon Slayer: Kimetsu no Yaiba Mugen Train Arc',source:'AniList',sourceId:'129874',format:'TV',total:7,watched:seq(7),releaseStart:'2021-10-10',episodes:[]},
  {id:'al-142329',subtitle:'Demon Slayer: Kimetsu no Yaiba Entertainment District Arc',source:'AniList',sourceId:'142329',format:'TV',total:11,watched:seq(9),releaseStart:'2021-12-05',episodes:[]},
  {id:'al-145139',subtitle:'Demon Slayer: Kimetsu no Yaiba Swordsmith Village Arc',source:'AniList',sourceId:'145139',format:'TV',total:11,watched:[],releaseStart:'2023-04-09',episodes:[]},
  {id:'al-166240',subtitle:'Demon Slayer: Kimetsu no Yaiba Hashira Training Arc',source:'AniList',sourceId:'166240',format:'TV',total:8,watched:[],releaseStart:'2024-05-12',episodes:[]},
  {id:'al-178788',subtitle:'Demon Slayer: Kimetsu no Yaiba Infinity Castle',source:'AniList',sourceId:'178788',format:'MOVIE',total:1,watched:[],releaseStart:'2025-07-18',episodes:[]}
 ]};
 return {tv,al};
}
test('12.15.3 bridges Demon Slayer TVMaze progress into AniList split arcs and removes duplicate',()=>{
 const api=load(),{tv,al}=demon();assert.equal(api.compatible(tv,al),true);const result=api.repair([tv,al],[{id:tv.id,action:'season-watched',seasonId:'tv-2',episodes:seq(18),episode:0,date:'x'}]);
 assert.equal(result.library.length,1);assert.equal(result.library[0].id,'al-card');assert.equal(result.library[0].title,'Demon Slayer');
 const parts=result.library[0].seasons;assert.deepEqual(Array.from(parts.find(x=>x.id==='al-129874').watched),seq(7));assert.deepEqual(Array.from(parts.find(x=>x.id==='al-142329').watched),seq(11));
 assert.equal(parts.filter(x=>x.format==='MOVIE').length,2);assert.equal(result.history.every(x=>x.id==='al-card'),true);assert.equal(result.history.filter(x=>x.action==='season-watched').length,2);
});
test('12.15.3 Jujutsu Kaisen movie-root card matches TVMaze series by canonical TV totals',()=>{
 const api=load();const tv={id:'tvmaze-jjk',title:'Jujutsu Kaisen',source:'TVMaze',format:'TV_SERIES',year:2020,seasons:[{id:'t1',format:'TV',total:24,watched:seq(24)},{id:'t2',format:'TV',total:23,watched:seq(23)},{id:'t3',format:'TV',total:12,watched:[]}]};
 const al={id:'al-jjk',title:'Jujutsu Kaisen 0',source:'AniList',format:'MOVIE',seasons:[{id:'a1',subtitle:'JUJUTSU KAISEN',aliases:['Jujutsu Kaisen'],source:'AniList',format:'TV',total:24,watched:seq(24),releaseStart:'2020-10-03'},{id:'m0',subtitle:'Jujutsu Kaisen 0',source:'AniList',format:'MOVIE',total:1,watched:[1],releaseStart:'2021-12-24'},{id:'a2',subtitle:'JUJUTSU KAISEN Season 2',source:'AniList',format:'TV',total:23,watched:seq(23),releaseStart:'2023-07-06'},{id:'a3',subtitle:'JUJUTSU KAISEN Season 3',source:'AniList',format:'TV',total:12,watched:[],releaseStart:'2026-01-09'}]};
 const result=api.repair([tv,al],[]);assert.equal(result.library.length,1);assert.equal(result.library[0].title,'Jujutsu Kaisen');assert.equal(result.library[0].format,'TV');assert.equal(result.library[0].seasons.some(x=>x.id==='m0'),true);
});
test('12.15.3 app treats movies as timeline parts, never as season-number increments',()=>{const app=readCoreSource(),html=read('index.html'),main=(read('src/main.js')+read('src/startup-factories.js')),sw=read('src/sw.js'),pkg=JSON.parse(read('package.json'));assert.match(app,/function seasonNumberFor/);assert.match(app,/partProgressLabel/);assert.match(app,/repairProviderDuplicates/);assert(main.indexOf('./startup-factories.js')<main.indexOf('startApp();'));assert.match(sw,/precacheAndRoute\(self\.__WB_MANIFEST/);assert.match(pkg.version,/^\d+\.\d+\.\d+$/)});

test('13.1.b Zenki search dedupes AniList and TVMaze into one result',()=>{
 const api=load();
 const anime={key:'al-1573',source:'AniList',sourceId:'1573',title:'Kishin Douji ZENKI',english:'Zenki',aliases:['Kishin Douji ZENKI','Zenki','Legend of Zenki','Demon Prince Zenki'],format:'TV',year:1995,releaseStart:'1995-01-09',genres:['Action','Adventure'],total:51};
 const tv={kind:'tv',key:'tv-31784',source:'TVMaze',sourceId:31784,title:'Zenki',format:'TV_SERIES',year:1995,releaseStart:'1995-01-09',genres:['Action','Adventure']};
 assert.equal(api.searchEquivalent(anime,tv),true);
 const out=api.dedupeSearchResults([anime,tv]);
 assert.equal(out.length,1);assert.equal(out[0].key,'al-1573');
});
test('13.1.b Zenki library repair accepts provider season split 25+26 vs AniList 51',()=>{
 const api=load();
 const tv={id:'tvmaze-31784',title:'Zenki',source:'TVMaze',format:'TV_SERIES',year:1995,seasons:[
  {id:'tv-z1',subtitle:'Zenki',source:'TVMaze',sourceId:'31784',format:'TV',total:25,watched:seq(25),year:1995,episodes:[]},
  {id:'tv-z2',subtitle:'Zenki',source:'TVMaze',sourceId:'31784',format:'TV',total:26,watched:[1,2],year:1995,episodes:[]}
 ]};
 const al={id:'al-1573-card',title:'Kishin Douji ZENKI',source:'AniList',sourceId:'1573',format:'TV',year:1995,status:'watching',seasons:[
  {id:'al-1573',subtitle:'Zenki',aliases:['Kishin Douji ZENKI','Zenki','Legend of Zenki','Demon Prince Zenki'],source:'AniList',sourceId:'1573',format:'TV',total:51,watched:[],releaseStart:'1995-01-09',episodes:[]}
 ]};
 assert.equal(api.compatible(tv,al),true);
 const result=api.repair([tv,al],[]);
 assert.equal(result.library.length,1);assert.equal(result.library[0].id,'al-1573-card');
 assert.deepEqual(Array.from(result.library[0].seasons[0].watched),[...seq(25),26,27]);
});

test('13.1.a global search dedupe matches canonical aliases across providers',()=>{
 const api=load();
 const cases=[
  [
   {key:'al-aot',source:'AniList',title:'Shingeki no Kyojin',english:'Attack on Titan',aliases:['Shingeki no Kyojin','Attack on Titan'],format:'TV',year:2013,releaseStart:'2013-04-07',genres:['Action','Drama'],total:25},
   {kind:'tv',key:'tv-aot',source:'TVMaze',title:'Attack on Titan',format:'TV_SERIES',year:2013,releaseStart:'2013-04-07',genres:['Action','Drama']}
  ],
  [
   {key:'al-pokemon',source:'AniList',title:'Pokémon',english:'Pokemon',aliases:['Pokémon','Pokemon'],format:'TV',year:1997,releaseStart:'1997-04-01',genres:['Adventure'],total:276},
   {kind:'tv',key:'tv-pokemon',source:'TVMaze',title:'Pokemon',format:'TV_SERIES',year:1997,releaseStart:'1997-04-01',genres:['Adventure']}
  ],
  [
   {key:'al-long',source:'AniList',title:'Boku no Hero Academia',english:'My Hero Academia',aliases:['Boku no Hero Academia','My Hero Academia'],format:'TV',year:2016,releaseStart:'2016-04-03',genres:['Action'],total:13},
   {kind:'tv',key:'tv-long',source:'TVMaze',title:'My Hero Academia',format:'TV_SERIES',year:2016,releaseStart:'2016-04-03',genres:['Action']}
  ]
 ];
 for(const [anime,tv] of cases)assert.equal(api.searchEquivalent(anime,tv),true,anime.title);
 const rows=api.dedupeSearchResults(cases.flat());
 assert.equal(rows.filter(x=>x.kind==='tv').length,0,'all provider duplicates are removed in favor of canonical anime results');
});
test('13.1.a global search dedupe keeps unrelated same-name or similar titles separate',()=>{
 const api=load();
 const cases=[
  [
   {source:'AniList',title:'Monster',aliases:['Monster'],format:'TV',year:2004,releaseStart:'2004-04-07',genres:['Drama'],total:74},
   {kind:'tv',source:'TVMaze',title:'Monster',format:'TV_SERIES',year:2022,releaseStart:'2022-05-13',genres:['Drama']}
  ],
  [
   {source:'AniList',title:'Orange',aliases:['Orange'],format:'TV',year:2016,releaseStart:'2016-07-04',genres:['Drama'],total:13},
   {kind:'tv',source:'TVMaze',title:'Orange',format:'TV_SERIES',year:2015,releaseStart:'2015-01-01',genres:['Comedy']}
  ],
  [
   {source:'AniList',title:'Your Name',aliases:['Your Name'],format:'MOVIE',year:2016,releaseStart:'2016-08-26',genres:['Drama'],total:1},
   {kind:'tv',source:'TVMaze',title:'Your Name',format:'TV_SERIES',year:2016,releaseStart:'2016-08-26',genres:['Drama']}
  ],
  [
   {source:'AniList',title:'Fate/stay night: Unlimited Blade Works',aliases:['Fate/stay night: Unlimited Blade Works'],format:'TV',year:2014,releaseStart:'2014-10-05',genres:['Action'],total:13},
   {kind:'tv',source:'TVMaze',title:'Fate/stay night',format:'TV_SERIES',year:2006,releaseStart:'2006-01-07',genres:['Action']}
  ]
 ];
 for(const [anime,tv] of cases)assert.equal(api.searchEquivalent(anime,tv),false,anime.title+' must stay separate');
});
test('13.1.a global library matcher ignores provider season boundaries when identity and totals agree',()=>{
 const api=load();
 const tv={id:'tvmaze-generic',title:'Provider Split Example',source:'TVMaze',format:'TV_SERIES',year:2020,seasons:[
  {id:'tv-a',source:'TVMaze',format:'TV',total:12,watched:[1,2],releaseStart:'2020-01-10',episodes:[]},
  {id:'tv-b',source:'TVMaze',format:'TV',total:12,watched:[1],releaseStart:'2020-04-10',episodes:[]}
 ]};
 const anime={id:'al-generic',title:'Provider Split Example',source:'AniList',format:'TV',year:2020,seasons:[
  {id:'al-a',subtitle:'Provider Split Example',aliases:['Provider Split Example'],source:'AniList',format:'TV',total:24,watched:[],releaseStart:'2020-01-10',episodes:[]}
 ]};
 assert.equal(api.compatible(tv,anime),true);
 const result=api.repair([tv,anime],[]);
 assert.equal(result.library.length,1);
 assert.deepEqual(Array.from(result.library[0].seasons[0].watched),[1,2,13]);
});
test('13.1.a global library matcher does not merge same-root franchises with incompatible evidence',()=>{
 const api=load();
 const tv={id:'tvmaze-x',title:'Example: New Generation',source:'TVMaze',format:'TV_SERIES',year:2024,seasons:[
  {id:'tv-x1',source:'TVMaze',format:'TV',total:12,watched:[],releaseStart:'2024-01-01',episodes:[]}
 ]};
 const anime={id:'al-x',title:'Example',source:'AniList',format:'TV',year:2020,seasons:[
  {id:'al-x1',subtitle:'Example',aliases:['Example'],source:'AniList',format:'TV',total:12,watched:[],releaseStart:'2020-01-01',episodes:[]}
 ]};
 assert.equal(api.compatible(tv,anime),false);
 assert.equal(api.repair([tv,anime],[]).library.length,2);
});
