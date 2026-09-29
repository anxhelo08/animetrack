const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function setup(fetchImpl,{token='',state=null}={}){
 const store=new Map(token?[['animetrack_tmdb_read_token',token]]:[]);
 const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 const sandbox={window:{},localStorage,fetch:fetchImpl||(()=>{throw Error('unexpected network')}),URL,URLSearchParams,AbortController,setTimeout,clearTimeout,Date,JSON,console};
 vm.runInNewContext(read('src/modules/watch.js'),sandbox,{filename:'watch.js'});
 const data=state||{anime:[],preferences:{watchRegion:'AL'}};
 const ctx={esc:String,state:()=>data,save:()=>true,rerender:()=>{},openAnime:()=>{},navigate:()=>{},poster:v=>v||''};
 return{api:sandbox.window.ATWatch133(ctx),state:data,store};
}
const response=data=>Promise.resolve({ok:true,status:200,json:async()=>data});
test('13.3 anime availability prefers official AniList streaming links and dedupes providers',async()=>{
 const calls=[],fetch=url=>{calls.push(String(url));return response({data:{Media:{externalLinks:[
  {site:'Crunchyroll',url:'https://www.crunchyroll.com/series/abc',type:'STREAMING',isDisabled:false},
  {site:'Crunchyroll',url:'https://www.crunchyroll.com/series/abc2',type:'STREAMING',isDisabled:false},
  {site:'Official Site',url:'https://example.com',type:'INFO',isDisabled:false}
 ]}}})};
 const {api}=setup(fetch),anime={id:'a1',source:'AniList',sourceId:'1',title:'Cowboy Bebop',format:'TV',seasons:[{id:'al-1',source:'AniList',sourceId:'1',malId:'1'}]};
 const result=await api.load(anime,anime.seasons[0],{force:true,reg:'AL'});
 assert.equal(result.kind,'anime');assert.equal(result.providers.length,1);assert.equal(result.providers[0].name,'Crunchyroll');assert.equal(result.categories[0].label,'Streaming zyrtar');assert.match(calls[0],/graphql\.anilist\.co/);
});
test('13.3 anime availability falls back to Jikan MAL streaming links without a key',async()=>{
 const fetch=url=>{assert.match(String(url),/api\.jikan\.moe\/v4\/anime\/21\/streaming/);return response({data:[{name:'Netflix',url:'https://www.netflix.com/title/1'}]})};
 const {api}=setup(fetch),anime={id:'mal-21',source:'MyAnimeList',sourceId:'21',malId:'21',title:'Example',format:'TV',seasons:[{id:'mal-21',source:'MyAnimeList',sourceId:'21',malId:'21'}]};
 const result=await api.load(anime,anime.seasons[0],{force:true,reg:'AL'});
 assert.equal(result.providers[0].name,'Netflix');assert.match(result.source,/MyAnimeList\/Jikan/);
});
test('13.3 TMDB watch providers map stream/free/rent/buy for the selected region',async()=>{
 const fetch=url=>{
  assert.match(String(url),/api\.themoviedb\.org\/3\/movie\/550\/watch\/providers/);
  return response({results:{AL:{link:'https://www.themoviedb.org/movie/550/watch?locale=AL',flatrate:[{provider_id:8,provider_name:'Netflix',logo_path:'/netflix.jpg',display_priority:1}],rent:[{provider_id:3,provider_name:'Google Play Movies',logo_path:'/gp.jpg',display_priority:2}],buy:[{provider_id:3,provider_name:'Google Play Movies',logo_path:'/gp.jpg',display_priority:2}]}}});
 };
 const {api}=setup(fetch,{token:'x'.repeat(80)}),movie={id:'tmdb-550',source:'TMDB',tmdbId:'550',title:'Fight Club',format:'MOVIE',seasons:[{id:'m1'}]};
 const result=await api.load(movie,movie.seasons[0],{force:true,reg:'AL'});
 assert.equal(result.kind,'movie');assert.equal(result.region,'AL');assert.deepEqual(Array.from(result.categories,x=>x.key),['stream','rent','buy']);assert.equal(result.providers.length,2);assert.match(result.source,/JustWatch/);
});
test('13.3 TV availability resolves TVMaze -> IMDb -> TMDB before watch/providers',async()=>{
 const calls=[],fetch=url=>{
  const u=String(url);calls.push(u);
  if(/api\.tvmaze\.com\/shows\/123/.test(u))return response({externals:{imdb:'tt0903747'}});
  if(/themoviedb\.org\/3\/find\/tt0903747/.test(u))return response({tv_results:[{id:1396}]});
  if(/themoviedb\.org\/3\/tv\/1396\/watch\/providers/.test(u))return response({results:{US:{link:'https://www.themoviedb.org/tv/1396/watch?locale=US',flatrate:[{provider_id:1899,provider_name:'Max',logo_path:'/max.jpg'}]}}});
  throw Error('unexpected '+u);
 };
 const {api}=setup(fetch,{token:'x'.repeat(80)}),show={id:'tvmaze-123',source:'TVMaze',sourceId:'123',title:'Breaking Bad',format:'TV_SERIES',year:2008,seasons:[{id:'s1'}]};
 const result=await api.load(show,show.seasons[0],{force:true,reg:'US'});
 assert.equal(result.tmdbId,'1396');assert.equal(result.providers[0].name,'Max');assert.equal(calls.length,3);
});
test('13.3 movie/TV availability fails closed without exposing or requiring a bundled TMDB secret',async()=>{
 let calls=0;const {api}=setup(()=>{calls++;throw Error('network')});
 const movie={id:'m',source:'TMDB',tmdbId:'1',format:'MOVIE',seasons:[{id:'m1'}]},result=await api.load(movie,movie.seasons[0],{force:true,reg:'AL'});
 assert.equal(result.needsToken,true);assert.equal(calls,0);
});
test('13.3 region preference is synced through app preferences',()=>{
 const state={anime:[],preferences:{}},{api}=setup(null,{state});
 assert.equal(api.region(),'AL');assert.equal(api.setRegion('IT',false),true);assert.equal(state.preferences.watchRegion,'IT');
});
test('13.3 release wires Where to Watch into source, detail renderer and Pro navigation',()=>{
 const main=read('src/main.js'),styles=read('src/styles/index.css'),features=read('src/modules/features.js'),app=read('src/app.js'),html=read('index.html'),sw=read('public/sw.js'),pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.version,'13.5.1');assert.equal(pkg.releaseLabel,'13.5.1');assert.match(main,/modules\/watch\.js/);assert.match(styles,/watch\.css/);
 assert.match(features,/watch:window\.ATWatch133/);assert.match(features,/Ku ta shoh/);assert.match(features,/op\.startsWith\('watch-'\)/);assert.match(read('src/modules/watch.js'),/watch-open/);
 assert.match(app,/watchRegion/);assert.match(app,/at133PriorDetail/);assert.match(html,/AnimeTrack 13\.5\.1/);assert.match(sw,/animetrack-shell-v1351-1/);
});
