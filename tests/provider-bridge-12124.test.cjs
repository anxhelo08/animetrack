const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function load(){const sandbox={window:{}};vm.runInNewContext(read('assets/pro-franchise-1212.js'),sandbox);vm.runInNewContext(read('assets/pro-provider-bridge-12124.js'),sandbox);return sandbox.window.ATProviderBridge12124}
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
test('12.15.2 bridges Demon Slayer TVMaze progress into AniList split arcs and removes duplicate',()=>{
 const api=load(),{tv,al}=demon();assert.equal(api.compatible(tv,al),true);const result=api.repair([tv,al],[{id:tv.id,action:'season-watched',seasonId:'tv-2',episodes:seq(18),episode:0,date:'x'}]);
 assert.equal(result.library.length,1);assert.equal(result.library[0].id,'al-card');assert.equal(result.library[0].title,'Demon Slayer');
 const parts=result.library[0].seasons;assert.deepEqual(Array.from(parts.find(x=>x.id==='al-129874').watched),seq(7));assert.deepEqual(Array.from(parts.find(x=>x.id==='al-142329').watched),seq(11));
 assert.equal(parts.filter(x=>x.format==='MOVIE').length,2);assert.equal(result.history.every(x=>x.id==='al-card'),true);assert.equal(result.history.filter(x=>x.action==='season-watched').length,2);
});
test('12.15.2 Jujutsu Kaisen movie-root card matches TVMaze series by canonical TV totals',()=>{
 const api=load();const tv={id:'tvmaze-jjk',title:'Jujutsu Kaisen',source:'TVMaze',format:'TV_SERIES',year:2020,seasons:[{id:'t1',format:'TV',total:24,watched:seq(24)},{id:'t2',format:'TV',total:23,watched:seq(23)},{id:'t3',format:'TV',total:12,watched:[]}]};
 const al={id:'al-jjk',title:'Jujutsu Kaisen 0',source:'AniList',format:'MOVIE',seasons:[{id:'a1',subtitle:'JUJUTSU KAISEN',aliases:['Jujutsu Kaisen'],source:'AniList',format:'TV',total:24,watched:seq(24),releaseStart:'2020-10-03'},{id:'m0',subtitle:'Jujutsu Kaisen 0',source:'AniList',format:'MOVIE',total:1,watched:[1],releaseStart:'2021-12-24'},{id:'a2',subtitle:'JUJUTSU KAISEN Season 2',source:'AniList',format:'TV',total:23,watched:seq(23),releaseStart:'2023-07-06'},{id:'a3',subtitle:'JUJUTSU KAISEN Season 3',source:'AniList',format:'TV',total:12,watched:[],releaseStart:'2026-01-09'}]};
 const result=api.repair([tv,al],[]);assert.equal(result.library.length,1);assert.equal(result.library[0].title,'Jujutsu Kaisen');assert.equal(result.library[0].format,'TV');assert.equal(result.library[0].seasons.some(x=>x.id==='m0'),true);
});
test('12.15.2 app treats movies as timeline parts, never as season-number increments',()=>{const app=read('assets/app.js'),html=read('index.html'),sw=read('sw.js'),pkg=JSON.parse(read('package.json'));assert.match(app,/function seasonNumberFor/);assert.match(app,/partProgressLabel/);assert.match(app,/repairProviderDuplicates/);assert(html.indexOf('pro-provider-bridge-12124.js')<html.indexOf('/assets/app.js'));assert.match(sw,/pro-provider-bridge-12124\.js/);assert.equal(pkg.version,'12.15.2')});
