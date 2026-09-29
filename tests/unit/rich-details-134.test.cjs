const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function response(data,status=200){return Promise.resolve({ok:status>=200&&status<300,status,json:async()=>data})}
function setup(fetchImpl,{token='',state=null}={}){
 const store=new Map(token?[['animetrack_tmdb_read_token',token]]:[]);
 const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 const sandbox={window:{},localStorage,fetch:fetchImpl||(()=>{throw Error('unexpected network')}),URL,URLSearchParams,AbortController,setTimeout,clearTimeout,Date,JSON,Map,Set,console};
 vm.runInNewContext(read('src/modules/rich-details.js'),sandbox,{filename:'rich-details.js'});
 const data=state||{anime:[],preferences:{}};
 const ctx={esc:String,state:()=>data,poster:v=>v||'',inLibrary:()=>null,openAnime:()=>{},previewItem:()=>{},searchOnline:()=>{},closeDetail:()=>{},navigate:()=>{}};
 return{api:sandbox.window.ATRich134(ctx),store,state};
}
test('13.4 AniList rich details maps Japanese voice cast, staff and studio metadata',async()=>{
 const fetch=(url,opts)=>{assert.match(String(url),/graphql\.anilist\.co/);const q=opts.body;assert.match(q,/Media\(id:\$id/);return response({data:{Media:{id:1,format:'TV',status:'FINISHED',seasonYear:1998,episodes:26,duration:24,genres:['Action','Sci-Fi'],averageScore:86,siteUrl:'https://anilist.co/anime/1',trailer:{id:'abc',site:'youtube'},tags:[{name:'Space',rank:90,isMediaSpoiler:false}],studios:{nodes:[{id:14,name:'Sunrise',siteUrl:'https://anilist.co/studio/14'}]},staff:{edges:[{role:'Director',node:{id:10,name:{full:'Shinichiro Watanabe'},image:{large:'https://img/director.jpg'},primaryOccupations:['Director'],siteUrl:'https://anilist.co/staff/10'}}]},characters:{edges:[{role:'MAIN',node:{id:20,name:{full:'Spike Spiegel'}},voiceActors:[{id:30,name:{full:'English Actor'},image:{large:'https://img/en.jpg'},languageV2:'English'},{id:31,name:{full:'Koichi Yamadera'},image:{large:'https://img/jp.jpg'},languageV2:'Japanese',siteUrl:'https://anilist.co/staff/31'}]}]}}}})};
 const {api}=setup(fetch),anime={id:'al-1',source:'AniList',sourceId:'1',format:'TV',seasons:[{id:'al-1',source:'AniList',sourceId:'1'}]};
 const data=await api.loadTitle(anime,anime.seasons[0],{force:true});
 assert.equal(data.cast[0].name,'Koichi Yamadera');assert.match(data.cast[0].role,/Spike Spiegel/);assert.equal(data.staff[0].name,'Shinichiro Watanabe');assert.equal(data.studios[0].name,'Sunrise');assert.equal(data.trailer,'https://www.youtube.com/watch?v=abc');
});
test('13.4 AniList person profile merges staff and voice-actor works',async()=>{
 const fetch=(url,opts)=>{const body=JSON.parse(opts.body),q=body.query;assert.match(q,/Staff\(id:\$id/);return response({data:{Staff:{id:31,name:{full:'Koichi Yamadera'},image:{large:'https://img/jp.jpg'},description:'Voice actor',primaryOccupations:['Voice Actor'],homeTown:'Miyagi',yearsActive:[1985],siteUrl:'https://anilist.co/staff/31',staffMedia:{edges:[{staffRole:'Theme Song Performance',node:{id:2,idMal:2,title:{english:'Work Two',romaji:'Work Two'},coverImage:{large:'https://img/2.jpg'},seasonYear:2000,format:'TV',averageScore:80,siteUrl:'https://anilist.co/anime/2'}}]},characterMedia:{edges:[{characterRole:'MAIN',node:{id:1,idMal:1,title:{english:'Cowboy Bebop',romaji:'Cowboy Bebop'},coverImage:{large:'https://img/1.jpg'},seasonYear:1998,format:'TV',averageScore:86,siteUrl:'https://anilist.co/anime/1'}},{characterRole:'SUPPORTING',node:{id:2,idMal:2,title:{english:'Work Two',romaji:'Work Two'},coverImage:{large:'https://img/2.jpg'},seasonYear:2000,format:'TV',averageScore:80,siteUrl:'https://anilist.co/anime/2'}}]}}}})};
 const {api}=setup(fetch),p=await api.loadPerson('anilist','31','Spike Spiegel · Japanese',{force:true});
 assert.equal(p.name,'Koichi Yamadera');assert.equal(p.works.length,2);assert.match(p.works.find(x=>x.sourceId==='2').credit,/Voice Actor/);assert.equal(p.works[0].kind,'anime');
});
test('13.4 TVMaze loads cast crew and person credits as direct TV works',async()=>{
 const calls=[],fetch=url=>{const u=String(url);calls.push(u);
  if(/\/shows\/777\/cast$/.test(u))return response([{person:{id:1,name:'Michael C. Hall',image:{medium:'https://img/mch.jpg'}},character:{name:'Dexter Morgan'}}]);
  if(/\/shows\/777\/crew$/.test(u))return response([{type:'Creator',person:{id:2,name:'James Manos Jr.',image:null}}]);
  if(/\/shows\/777$/.test(u))return response({id:777,name:'Dexter',status:'Ended',premiered:'2006-10-01',runtime:55,genres:['Drama'],rating:{average:8.6},url:'https://tvmaze.com/777'});
  if(/\/people\/1\/castcredits/.test(u))return response([{_embedded:{show:{id:778,name:'Six Feet Under',premiered:'2001-06-03',image:{medium:'https://img/sfu.jpg'},rating:{average:8.4},url:'https://tvmaze.com/778'},character:{name:'David Fisher'}}}]);
  if(/\/people\/1\/crewcredits/.test(u))return response([]);
  if(/\/people\/1$/.test(u))return response({id:1,name:'Michael C. Hall',birthday:'1971-02-01',country:{name:'United States'},gender:'Male',image:{medium:'https://img/mch.jpg'},url:'https://tvmaze.com/people/1'});
  throw Error('unexpected '+u);
 };
 const {api}=setup(fetch),show={id:'tvmaze-777',source:'TVMaze',sourceId:'777',format:'TV_SERIES',seasons:[{id:'s1'}]};
 const data=await api.loadTitle(show,show.seasons[0],{force:true});assert.equal(data.cast[0].name,'Michael C. Hall');assert.equal(data.staff[0].role,'Creator');
 const p=await api.loadPerson('tvmaze','1','Dexter Morgan',{force:true});assert.equal(p.works[0].sourceId,'778');assert.equal(p.works[0].kind,'tv');assert.match(p.works[0].credit,/David Fisher/);
});
test('13.4 movie rich details keep basic cast/director without TMDB token',async()=>{
 let calls=0;const {api}=setup(()=>{calls++;throw Error('network')});
 const movie={id:'imdb-tt1',source:'Cinemeta',format:'MOVIE',cast:'Actor One, Actor Two',director:'Director One',runtime:120,year:2026,imdbRating:7.4,seasons:[{id:'m1'}]};
 const data=await api.loadTitle(movie,movie.seasons[0],{force:true});assert.equal(data.needsToken,true);assert.deepEqual(Array.from(data.castText),['Actor One','Actor Two']);assert.deepEqual(Array.from(data.staffText),['Director One']);assert.equal(calls,0);
});
test('13.4 TMDB person combined credits include movies and TV for cross-title navigation',async()=>{
 const fetch=url=>{const u=String(url);
  if(/\/movie\/550\?/.test(u))return response({id:550,release_date:'1999-10-15',runtime:139,status:'Released',vote_average:8.4,budget:63000000,genres:[{name:'Drama'}],production_companies:[{name:'Fox 2000'}],credits:{cast:[{id:287,name:'Brad Pitt',character:'Tyler Durden',profile_path:'/p.jpg'}],crew:[{id:7467,name:'David Fincher',job:'Director',department:'Directing',profile_path:'/d.jpg'}]},keywords:{keywords:[{name:'insomnia'}]},videos:{results:[]}});
  if(/\/person\/7467\?/.test(u))return response({id:7467,name:'David Fincher',profile_path:'/d.jpg',biography:'Director biography',known_for_department:'Directing',birthday:'1962-08-28',place_of_birth:'Denver',external_ids:{imdb_id:'nm0000399'},combined_credits:{cast:[],crew:[{media_type:'movie',id:550,title:'Fight Club',release_date:'1999-10-15',poster_path:'/fc.jpg',vote_average:8.4,popularity:90,job:'Director',adult:false},{media_type:'tv',id:100,name:'Mindhunter',first_air_date:'2017-10-13',poster_path:'/mh.jpg',vote_average:8.1,popularity:70,job:'Executive Producer',adult:false}]}});
  throw Error('unexpected '+u);
 };
 const {api}=setup(fetch,{token:'x'.repeat(80)}),movie={id:'tmdb-550',source:'TMDB',sourceId:'550',tmdbId:'550',format:'MOVIE',seasons:[{id:'m1'}]};
 const data=await api.loadTitle(movie,movie.seasons[0],{force:true});assert.equal(data.cast[0].name,'Brad Pitt');assert.equal(data.staff[0].name,'David Fincher');
 const p=await api.loadPerson('tmdb','7467','Director',{force:true});assert.equal(p.works.length,2);assert.equal(p.works[0].kind,'movie');assert.equal(p.works[1].kind,'tv');assert.match(read('src/modules/rich-details.js'),/searchOnline\?\.\(w\.title\)/);
});
test('13.4 release wiring loads rich details after Where to Watch with hashed Vite assets',()=>{
 const main=read('src/main.js'),styles=read('src/styles/index.css'),features=read('src/modules/features.js'),app=read('src/app.js'),html=read('index.html'),sw=read('public/sw.js'),pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.version,'13.5.2');assert.equal(pkg.releaseLabel,'13.5.2');assert.match(main,/modules\/rich-details\.js/);assert.match(styles,/rich-details\.css/);assert.match(features,/rich:window\.ATRich134/);assert.match(features,/modules\.rich\.mount/);assert.match(app,/at134PriorDetail/);assert.match(app,/searchOnline:q/);assert.match(html,/AnimeTrack 13\.5\.1/);assert.match(sw,/animetrack-shell-v1352-1/);
});
