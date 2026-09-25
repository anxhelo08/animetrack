const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const names=['pro-recommendations','pro-calendar-wrapped','pro-profiles','pro-friends','pro-moderation','pro-notifications','pro-rewatch','pro-features'];
function load(){
 const sandbox={window:{},console,Date,Map,Set};
 vm.createContext(sandbox);
 for(const name of names)vm.runInContext(fs.readFileSync(path.join(root,'assets',name+'.js'),'utf8'),sandbox,{filename:name+'.js'});
 return sandbox.window;
}
function context(){return{el:()=>null,esc:x=>String(x??''),state:()=>({anime:[],history:[],preferences:{weeklyGoal:10,notificationRead:[]}}),user:()=>null,client:()=>null,accountName:()=> 'Guest',poster:()=>'',count:()=>0,activity:()=>[],upcoming:()=>[],genres:()=>[],seriesRoot:()=>'',mapAniList:()=>({}),inLibrary:()=>null,released:()=>0,isMovie:()=>false,uuid:()=> 'test',toast:()=>{},save:()=>true,openAnime:()=>{},refreshDetail:()=>{},navigate:()=>{},setLocalView:()=>{}}}
test('all feature modules parse and export factories',()=>{const w=load();for(const key of ['ATRecommendations','ATCalendarWrapped','ATProfiles','ATFriends','ATModeration','ATNotifications','ATRewatch','AnimeTrackPro'])assert.equal(typeof w[key],'function')});
test('core feature views render with an empty personal library',()=>{const w=load(),c=context(),p=w.ATProfiles(c);assert.match(w.ATRecommendations(c).render(),/Për ty/);assert.match(w.ATCalendarWrapped(c).calendar(),/Kalendari/);assert.match(w.ATCalendarWrapped(c).wrapped(),/Wrapped/);assert.match(p.render(),/Profili/);assert.match(w.ATFriends(c,p).render(),/Hyr/);assert.match(w.ATNotifications(c).render(),/Njoftimet/);assert.equal(w.ATRewatch(c).render('missing'),'');assert.equal(typeof w.AnimeTrackPro(c).init,'function')});
test('site references every module, PWA resources, and source files exist',()=>{const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const name of names)assert.ok(html.includes('/assets/'+name+'.js'),name);for(const p of ['assets/app.js','assets/app.css','assets/pro-features.css','manifest.webmanifest','sw.js','icon.svg'])assert.ok(fs.existsSync(path.join(root,p)),p);assert.match(html,/AnimeTrack 9\.9/);assert.doesNotThrow(()=>JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8')))});
test('core JS parses after modular extraction',()=>{const src=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');assert.doesNotThrow(()=>new vm.Script(src));assert.match(src,/rewatches:/);assert.match(src,/notificationRead:/)});
