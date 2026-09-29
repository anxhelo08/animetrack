const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function module(){const context={window:{},Date,Map,Set,Number,String};vm.runInNewContext(read('src/modules/wrapped.js'),context,{filename:'pro-wrapped-129.js'});return context.window.ATWrapped129}
const DAY=86400000,NOW=new Date(2026,8,27,16,0),now=NOW.getTime();
const stamp=(day,h=10)=>new Date(2026,8,day,h).getTime();
function fixture(){
 const anime=[{id:'a1',title:'Anime Alpha',status:'completed',format:'TV',genre:'Drama,Fantasy',seasons:[{id:'s1',watched:Array.from({length:12},(_,i)=>i+1)}]},
  {id:'tv1',title:'Detective & <Mystery>',status:'watching',source:'TVMaze',format:'TV_SERIES',genre:'Crime,Drama',seasons:[{id:'s1',watched:[1,2,3]}]},
  {id:'a2',title:'Quiet Anime',status:'completed',format:'TV',genre:'Slice of Life',seasons:[{id:'s1',watched:[1]}]}];
 const events=[...Array.from({length:10},(_,i)=>({id:'a1',at:stamp(20,10+i%8),key:'a1|s1|'+(i+1)})),
  {id:'a1',at:stamp(21),key:'a1|s1|11'},{id:'a1',at:stamp(22),key:'a1|s1|12'},
  {id:'tv1',at:stamp(23),key:'tv1|s1|1'},{id:'tv1',at:stamp(24),key:'tv1|s1|2'},{id:'tv1',at:stamp(25),key:'tv1|s1|3'},
  {id:'a2',at:stamp(26),key:'a2|s1|1'}];
 return {state:{anime,history:[]},events,genres:a=>a.genre.split(','),isMovie:()=>false,now:NOW}
}
test('12.9 reports real history, separates TV/anime, preserves input state',()=>{
 const m=module(),f=fixture(),before=JSON.stringify(f.state),all=m.analyze({...f,period:'month',scope:'all'});
 assert.equal(all.events,16);assert.equal(all.totalMarked,16);assert.equal(all.completed,2);
 assert.equal(all.titleCount,3);assert.equal(all.days,7);assert.equal(all.peak[1],10);
 assert.equal(all.media.anime,13);assert.equal(all.media.tv,3);assert.equal(all.minutes,13*24+3*45);
 assert.equal(all.top[0].title,'Anime Alpha');assert.equal(all.top[0].count,12);
 assert.equal(JSON.stringify(f.state),before,'Wrapped must be read-only');
 const tv=m.analyze({...f,period:'year',scope:'tv'}),anime=m.analyze({...f,period:'year',scope:'anime'});
 assert.equal(tv.events,3);assert.equal(anime.events,13);assert.equal(tv.titleCount,1);
 assert.equal(tv.completed,2,'the lifetime completion count is explicitly global, not period-specific');
});
test('12.9 badges: 10 episodes on a single dated day unlocks Binge 10, weekly streak is evidence based',()=>{
 const m=module(),f=fixture(),r=m.analyze({...f,period:'all'});
 const badge=id=>r.badges.find(x=>x.id===id);
 assert.equal(badge('day10').unlocked,true);assert.equal(badge('day20').unlocked,false);
 assert.equal(badge('streak3').unlocked,true);assert.equal(badge('streak7').unlocked,true);
 assert.equal(badge('finish1').unlocked,true);assert.equal(badge('finish5').unlocked,false);
 assert.equal(badge('fifty').unlocked,false);assert.equal(badge('ten').unlocked,true);
 assert.equal(badge('genres5').unlocked,false);
});
test('12.9 no history dates means no invented viewing days or binge medals',()=>{
 const m=module(),f=fixture(),r=m.analyze({...f,events:[],period:'all'});
 assert.equal(r.events,0);assert.equal(r.days,0);assert.equal(r.peak[1],0);assert.equal(r.longestStreak,0);
 assert.equal(r.badges.find(x=>x.id==='day10').unlocked,false);
 assert.equal(r.badges.find(x=>x.id==='ten').unlocked,true,'current checked progress still counts');
 assert.match(m.render(r),/importet pa datë/);
});
test('12.9 filters include month/year/all and badge visibility without changing achievement state',()=>{
 const m=module(),f=fixture(),r=m.analyze({...f,period:'month'});
 const html=m.render(r,{badgeFilter:'unlocked'}),locked=m.render(r,{badgeFilter:'locked'});
 assert.match(html,/wrapped-month/);assert.match(html,/wrapped-year/);assert.match(html,/wrapped-all/);
 assert.match(html,/wrapped-scope/);assert.match(html,/wrapped-badges/);
 assert.match(html,/Binge 10/);assert.doesNotMatch(locked,/Binge 10/);
 assert.match(locked,/Supermaratonë/);assert.match(html,/data-pro-action="wrapped-image"/);
 assert.match(html,/14 ditët e fundit/);assert.match(html,/Zhanret e tua/);
 assert.equal(m.analyze({...f,period:'year'}).events,m.analyze({...f,period:'all'}).events);
});
test('12.9 escapes user supplied title and genre in HTML and copy is plain text',()=>{
 const m=module(),f=fixture(),r=m.analyze({...f,period:'all'});
 const html=m.render(r),mini=m.mini(r),copy=m.copyText(r);
 assert.match(html,/Detective &amp; &lt;Mystery&gt;/);assert.doesNotMatch(html,/Detective & <Mystery>/);
 assert.match(mini,/data-pro-page="wrapped"/);assert.match(copy,/Arritje:/);assert.match(copy,/Kohë e përafërt/);
});
test('12.9 simple graphic share exports without new API calls or personal storage',()=>{
 const m=module(),f=fixture(),r=m.analyze({...f,period:'month'});
 const calls=[];const g={createLinearGradient:()=>({addColorStop(){}}),fillRect(...v){calls.push(['rect',...v])},beginPath(){},arc(){},fill(){},fillText(...v){calls.push(['text',...v])}};
 const canvas={getContext:()=>g,width:0,height:0};assert.equal(m.drawShare(canvas,r),true);
 assert.equal(canvas.width,1080);assert.equal(canvas.height,1350);assert(calls.some(x=>x[0]==='text'&&String(x[1]).includes('Historia jote')));
 const source=read('src/modules/wrapped.js');assert.doesNotMatch(source,/localStorage|sessionStorage|fetch\(/);
});
test('12.9 integrated Wrapped and profile have new assets, period actions, safe update cache',()=>{
 const feature=read('src/modules/features.js'),calendar=read('src/modules/calendar-wrapped.js'),html=read('index.html'),main=read('src/main.js'),styles=read('src/styles/index.css'),sw=read('public/sw.js'),css=read('src/styles/wrapped.css');
 assert.match(feature,/achievementsMini/);assert.match(feature,/trackAchievements\(true\)/);
 assert.match(feature,/function renderBackground\(\)/);assert.match(read('src/app.js'),/proApp\.renderBackground\(\)/);
 assert.match(calendar,/ATWrapped129\.render/);assert.match(calendar,/wrapped-badges/);
 assert.match(main,/modules\/wrapped\.js/);assert.match(styles,/wrapped\.css/);
 assert.match(sw,/pathname\.startsWith\('\/assets\/'\)/);
 assert.match(sw,/animetrack-shell-v1352-1/);assert.match(html,/AnimeTrack 13\.5\.1/);
 assert.match(css,/@media\(max-width:760px\)/);
});

test('12.9.1 selected TV scope keeps daily heatmap and viewing streak TV-only while trophies remain lifetime-global',()=>{
 const m=module(),f=fixture(),all=m.analyze({...f,period:'month',scope:'all'}),tv=m.analyze({...f,period:'month',scope:'tv'}),anime=m.analyze({...f,period:'month',scope:'anime'});
 const sum=r=>r.daily14.reduce((n,x)=>n+x.count,0);
 assert.equal(sum(all),16);assert.equal(sum(tv),3);assert.equal(sum(anime),13);
 assert.equal(tv.days,3);assert.equal(tv.peak[1],1);assert.equal(tv.longestStreak,3,'TV streak is not inflated by anime dates');
 assert.equal(all.longestStreak,7);assert.equal(anime.longestStreak,3,'anime days 20–22,26 are separate streaks');
 assert.equal(tv.unlocked.some(x=>x.id==='day10'),true,'earned badges remain global lifetime achievements');
 assert.match(m.render(tv),/Arritje të përhershme nga gjithë biblioteka/);
});
test('12.9.1 monthly scope does not leak prior-month activity into the last-14-day chart',()=>{
 const m=module(),f=fixture(),now=new Date(2026,9,2,15),events=[{id:'a1',at:new Date(2026,8,30,14).getTime()},{id:'tv1',at:new Date(2026,9,1,14).getTime()}];
 const current=m.analyze({...f,events,period:'month',scope:'tv',now});
 assert.equal(current.events,1);assert.equal(current.daily14.reduce((n,x)=>n+x.count,0),1);
 assert.equal(current.days,1);assert.equal(current.longestStreak,1);
 assert.equal(m.analyze({...f,events,period:'month',scope:'anime',now}).events,0);
});
