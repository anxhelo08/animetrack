const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function load(fetchImpl){const sandbox={window:{},fetch:fetchImpl||(()=>{throw Error('network disabled')}),AbortController,URLSearchParams,setTimeout,clearTimeout,console};vm.runInNewContext(read('src/modules/franchise-engine.js'),sandbox);return sandbox.window.ATFranchiseEngine12130}
const eps=(show,season,count,startYear)=>Array.from({length:count},(_,i)=>({id:Number(String(show)+String(season).padStart(2,'0')+String(i+1).padStart(2,'0')),season,number:i+1,name:'E'+(i+1),airdate:`${startYear}-${String(Math.min(12,i+1)).padStart(2,'0')}-01`,airstamp:`${startYear}-01-01T12:00:00Z`}));
test('12.13 TV timeline continues global season numbers across Dexter franchise and excludes specials',()=>{
 const api=load(),shows=[
  {id:161,name:'Dexter',premiered:'2006-10-01',episodes:[...Array.from({length:8},(_,s)=>eps(161,s+1,12,2006+s)).flat(),{id:999,season:0,number:1,name:'Special'}]},
  {id:58846,name:'Dexter: New Blood',premiered:'2021-11-07',episodes:eps(58846,1,10,2021)},
  {id:67316,name:'Dexter: Original Sin',premiered:'2024-12-13',episodes:eps(67316,1,10,2024)},
  {id:78665,name:'Dexter: Resurrection',premiered:'2025-07-11',episodes:[...eps(78665,1,10,2025),...eps(78665,2,1,2026)]}
 ];
 const built=api.buildTVTimeline(shows,[]),s=built.seasons;
 assert.equal(s.length,12);assert.equal(s[7].title,'Sezoni 8');assert.equal(s[8].title,'Sezoni 9');assert.match(s[8].subtitle,/New Blood/);assert.equal(s[9].title,'Sezoni 10');assert.match(s[9].subtitle,/Original Sin/);assert.equal(s[10].title,'Sezoni 11');assert.match(s[10].subtitle,/Resurrection/);assert.equal(s[11].title,'Sezoni 12');assert.match(s[11].subtitle,/Sezoni 2/);assert.equal(s.some(x=>x.imdbSeasonNumber===0),false);
});
test('12.13 TV timeline preserves watched progress by show ID + local season number',()=>{
 const api=load(),shows=[{id:161,name:'Dexter',premiered:'2006-10-01',episodes:eps(161,1,12,2006)},{id:58846,name:'Dexter: New Blood',premiered:'2021-11-07',episodes:eps(58846,1,10,2021)}],old=[{id:'legacy-dexter',sourceId:'161',imdbSeasonNumber:1,watched:[1,2,3],episodes:[]},{id:'legacy-newblood',sourceId:'58846',imdbSeasonNumber:1,watched:[1,2,3,4,5,6,7,8,9,10],episodes:[]}];
 const built=api.buildTVTimeline(shows,old);assert.deepEqual(Array.from(built.seasons[0].watched),[1,2,3]);assert.equal(built.seasons[1].watched.length,10);assert.equal(built.seasonMap.get('legacy-newblood'),'tvmaze-58846-s1');
});
test('12.13 Wikidata + TVMaze resolver discovers all main Dexter TV series in release order',async()=>{
 const shows={161:{id:161,name:'Dexter',premiered:'2006-10-01'},58846:{id:58846,name:'Dexter: New Blood',premiered:'2021-11-07'},67316:{id:67316,name:'Dexter: Original Sin',premiered:'2024-12-13'},78665:{id:78665,name:'Dexter: Resurrection',premiered:'2025-07-11'}};
 const names=Object.fromEntries(Object.values(shows).map(x=>[x.name,x]));
 const familyRows=Object.values(shows).map((x,i)=>({item:{value:'https://www.wikidata.org/entity/Q'+(i+1)},itemLabel:{value:x.name}}));
 const response=data=>({ok:true,json:async()=>data});
 const fetchMock=async url=>{url=String(url);
  if(url.includes('wbsearchentities'))return response({search:[{id:'Q1',label:'Dexter',description:'2006 television series'}]});
  if(url.includes('Special:EntityData/Q1.json'))return response({entities:{Q1:{labels:{en:{value:'Dexter'}},claims:{P8345:[{mainsnak:{datavalue:{value:{id:'QF'}}}}]}}}});
  if(url.includes('Special:EntityData/QF.json'))return response({entities:{QF:{labels:{en:{value:'Dexter'}}}}});
  if(url.includes('/sparql?'))return response({results:{bindings:familyRows}});
  const searchMatch=url.match(/search\/shows\?q=([^&]+)/);if(searchMatch){const title=decodeURIComponent(searchMatch[1]);return response([{show:names[title]}].filter(x=>x.show));}
  const showMatch=url.match(/shows\/(\d+)$/);if(showMatch)return response(shows[Number(showMatch[1])]);
  const epMatch=url.match(/shows\/(\d+)\/episodes$/);if(epMatch){const id=Number(epMatch[1]);if(id===161)return response(Array.from({length:8},(_,s)=>eps(id,s+1,1,2006+s)).flat());if(id===78665)return response([...eps(id,1,1,2025),...eps(id,2,1,2026)]);return response(eps(id,1,1,id===58846?2021:2024));}
  throw Error('unexpected '+url);
 };
 const api=load(fetchMock),resolved=await api.resolveTVFranchise({title:'Dexter',sourceId:'161',existingShowIds:[161,58846,78665]});assert.deepEqual(Array.from(resolved.shows,x=>x.name),['Dexter','Dexter: New Blood','Dexter: Original Sin','Dexter: Resurrection']);const built=api.buildTVTimeline(resolved.shows,[]);assert.equal(built.seasons.at(-1).title,'Sezoni 12');
});
test('12.13 anime franchise logic is ID-first and movies never increment season numbering',()=>{
 const app=read('src/app.js'),fr=read('src/modules/franchise.js'),html=read('index.html'),main=read('src/main.js'),sw=read('public/sw.js'),pkg=JSON.parse(read('package.json'));
 assert.match(app,/Only official AniList relation edges may add a part/);assert.doesNotMatch(app,/Series title fallback unavailable/);assert.match(app,/return remote\.some\(s=>sameSeriesSeason/);assert.doesNotMatch(app,/localKeys\.some/);assert.doesNotMatch(app,/canonicalTitle\(a\.title\)===canonicalTitle\(item\.title\)/);
 assert.match(fr,/else if\(f==='MOVIE'\)title='Film'/);assert(main.indexOf('./modules/franchise-engine.js')<main.indexOf('./app.js'));assert.match(sw,/pathname\.startsWith\('\/assets\/'\)/);assert.equal(pkg.version,'13.5.1');
});
