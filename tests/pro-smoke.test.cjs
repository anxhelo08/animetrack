const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const names=['pro-recommendations','pro-calendar-wrapped','pro-profiles','pro-friends','pro-moderation','pro-notifications','pro-rewatch','pro-features'];
function load(extra={}){
 const sandbox={window:{},console,Date,Map,Set,Promise,setTimeout,clearTimeout,AbortController,...extra};
 vm.createContext(sandbox);
 for(const name of names)vm.runInContext(fs.readFileSync(path.join(root,'assets',name+'.js'),'utf8'),sandbox,{filename:name+'.js'});
 return sandbox.window;
}
function context(){return{el:()=>null,esc:x=>String(x??''),state:()=>({anime:[],history:[],preferences:{weeklyGoal:10,notificationRead:[]}}),user:()=>null,client:()=>null,accountName:()=> 'Guest',poster:()=>'',count:()=>0,activity:()=>[],upcoming:()=>[],genres:()=>[],seriesRoot:()=>'',mapAniList:()=>({}),inLibrary:()=>null,previewItem:()=>{},released:()=>0,isMovie:()=>false,uuid:()=> 'test',toast:()=>{},save:()=>true,openAnime:()=>{},refreshDetail:()=>{},navigate:()=>{},setLocalView:()=>{}}}
test('all feature modules parse and export factories',()=>{const w=load();for(const key of ['ATRecommendations','ATCalendarWrapped','ATProfiles','ATFriends','ATModeration','ATNotifications','ATRewatch','AnimeTrackPro'])assert.equal(typeof w[key],'function')});
test('core feature views render with an empty personal library',()=>{const w=load(),c=context(),p=w.ATProfiles(c);assert.match(w.ATRecommendations(c).render(),/Për ty/);assert.match(w.ATCalendarWrapped(c).calendar(),/Kalendari/);assert.match(w.ATCalendarWrapped(c).wrapped(),/Wrapped/);assert.match(p.render(),/Profili/);assert.match(w.ATFriends(c,p).render(),/Hyr/);assert.match(w.ATNotifications(c).render(),/Njoftimet/);assert.equal(w.ATRewatch(c).render('missing'),'');assert.equal(typeof w.AnimeTrackPro(c).init,'function')});
test('site references every module, PWA resources, and source files exist',()=>{const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const name of names)assert.ok(html.includes('/assets/'+name+'.js'),name);for(const p of ['assets/app.js','assets/app.css','assets/pro-features.css','manifest.webmanifest','sw.js','icon.svg'])assert.ok(fs.existsSync(path.join(root,p)),p);assert.match(html,/AnimeTrack 10\.0/);assert.doesNotThrow(()=>JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8')))});
test('core JS parses after modular extraction',()=>{const src=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');assert.doesNotThrow(()=>new vm.Script(src));assert.match(src,/rewatches:/);assert.match(src,/notificationRead:/)});

test('personal discovery filters duplicates, opens preview and remembers hidden series',async()=>{
 const store=new Map(),media=[
  {id:11,idMal:101,title:{romaji:'Astral Journey'},genres:['Fantasy','Action'],averageScore:88,popularity:140000,episodes:12,format:'TV',seasonYear:2024,coverImage:{large:'https://example.com/11.jpg'}},
  {id:12,idMal:102,title:{romaji:'Astral Journey Season 2'},genres:['Fantasy','Action'],averageScore:91,popularity:100000,episodes:12,format:'TV',seasonYear:2025,coverImage:{large:'https://example.com/12.jpg'}},
  {id:13,idMal:103,title:{romaji:'Quiet Rain'},genres:['Slice of Life'],averageScore:82,popularity:12000,episodes:12,format:'TV',seasonYear:2023,coverImage:{large:'https://example.com/13.jpg'}},
  {id:14,idMal:104,title:{romaji:'Space Mystery'},genres:['Mystery'],averageScore:86,popularity:55000,episodes:24,format:'TV',seasonYear:2022,coverImage:{large:'https://example.com/14.jpg'}}
 ];
 const remote=async()=>({ok:true,json:async()=>({data:{Page:{media}}})});
 const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 const w=load({fetch:remote,localStorage:storage}),c=context();
 let opened=null,added=null;
 c.poster=x=>x;
 c.state=()=>({anime:[{title:'My Fantasy',genre:'Fantasy, Action',rating:9,favorite:true,status:'completed',source:'AniList',sourceId:'90',seasons:[]}],history:[],preferences:{}});
 c.genres=a=>String(a.genre||'').split(',').map(x=>x.trim());
 c.seriesRoot=x=>x.toLowerCase().replace(/ season \d+$/,'');
 c.mapAniList=m=>({key:'al-'+m.id,source:'AniList',sourceId:String(m.id),malId:String(m.idMal),title:m.title.romaji,genre:m.genres.join(', '),score:m.averageScore,cover:m.coverImage.large,total:m.episodes,format:m.format,year:m.seasonYear,synopsis:'A fantasy story'});
 c.inLibrary=()=>null;
 c.previewItem=x=>{opened=x.key};
 c.addItem=async x=>{added=x.key};
 const rec=w.ATRecommendations(c);
 await rec.refresh(true);
 const html=rec.render();
 assert.match(html,/Çfarë ke qejf sot/);
 assert.match(html,/Pse kjo/);
 assert.match(html,/Quiet Rain/);
 assert.equal((html.match(/class="pro-rec pro-rec-v10"/g)||[]).length,3,'same franchise seasons grouped');
 rec.preview('al-13');assert.equal(opened,'al-13');
 await rec.add('al-13');assert.equal(added,'al-13');
 rec.hide('al-13');assert.doesNotMatch(rec.render(),/Quiet Rain/);
 rec.restore();assert.match(rec.render(),/Quiet Rain/);
 rec.setTab('movies');assert.match(rec.render(),/Nuk ka sugjerime/);
 rec.setTab('personal');rec.setLength('short');assert.match(rec.render(),/Astral Journey/);
 assert.ok([...store.keys()].some(k=>k.includes('animetrack_rec_prefs_v10')));
});
