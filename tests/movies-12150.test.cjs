const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function load(fetchImpl){const sandbox={window:{},fetch:fetchImpl,URLSearchParams,console};vm.runInNewContext(read('assets/pro-movies-12150.js'),sandbox);return sandbox.window.ATMovies12150}
const response=data=>({ok:true,status:200,json:async()=>data});
test('12.15.1 TMDB search maps movies as first-class catalog items',async()=>{
 const api=load(async url=>{assert.match(String(url),/search\/movie/);return response({results:[{id:11,title:'Star Wars',original_title:'Star Wars',release_date:'1977-05-25',poster_path:'/p.jpg',backdrop_path:'/b.jpg',overview:'Space opera',vote_average:8.2}]})});
 const r=await api.search('Star Wars',{tmdbToken:'token-token-token-token'});assert.equal(r.provider,'TMDB');assert.equal(r.items[0].kind,'movie');assert.equal(r.items[0].tmdbId,'11');assert.equal(r.items[0].score,82);assert.match(r.items[0].cover,/image\.tmdb\.org/);
});
test('12.15.1 TMDB details expose runtime, director, cast, IMDb and collection',async()=>{
 const api=load(async url=>{url=String(url);if(url.includes('/movie/11?'))return response({id:11,title:'Star Wars',release_date:'1977-05-25',runtime:121,genres:[{name:'Adventure'}],poster_path:'/p.jpg',backdrop_path:'/b.jpg',overview:'Space opera',vote_average:8.2,credits:{crew:[{job:'Director',name:'George Lucas'}],cast:[{name:'Mark Hamill'},{name:'Carrie Fisher'}]},external_ids:{imdb_id:'tt0076759'},belongs_to_collection:{id:10,name:'Star Wars Collection'}});throw Error(url)});
 const d=await api.details({source:'TMDB',sourceId:'11',title:'Star Wars'},{tmdbToken:'token-token-token-token'});assert.equal(d.runtime,121);assert.equal(d.director,'George Lucas');assert.match(d.cast,/Mark Hamill/);assert.equal(d.imdbId,'tt0076759');assert.equal(d.collectionId,'10');
});
test('12.15.1 app separates Movies from Anime and TV and keeps credentials local',()=>{
 const app=read('assets/app.js'),unified=read('assets/pro-unified-119.js'),html=read('index.html'),sw=read('sw.js'),pkg=JSON.parse(read('package.json'));
 assert.match(app,/function isLiveMovie/);assert.match(app,/TMDB_TOKEN_STORAGE/);assert.match(app,/movie-watched/);assert.match(app,/movie-rewatched/);assert.match(app,/at150RenderMovieDetail/);assert.match(app,/source:\['AniList','MyAnimeList','TVMaze','TMDB','OMDb'\]/);
 assert.match(unified,/const isMovie=/);assert.match(unified,/movie:movies\.length/);assert.match(html,/data-media-filter="movie"/);assert.match(html,/tmdb-token-input/);assert.match(sw,/pro-movies-12150\.js/);assert.equal(pkg.version,'12.15.1');
});
test('12.15.1 zero-key search falls back to Wikidata and finds Avengers Endgame',async()=>{
 const api=load(async url=>{url=String(url);assert.match(url,/wikidata\.org\/w\/api\.php/);assert.match(url,/wbsearchentities/);return response({search:[{id:'Q23781129',label:'Avengers: Endgame',description:'2019 film directed by Anthony and Joe Russo'},{id:'Q123',label:'Avengers',description:'Marvel Comics superhero team'}]})});
 const r=await api.search('Avengers Endgame',{});assert.equal(r.provider,'Wikidata');assert.equal(r.items.length,1);assert.equal(r.items[0].title,'Avengers: Endgame');assert.equal(r.items[0].year,2019);assert.equal(r.items[0].sourceId,'Q23781129');
});
test('12.15.1 Wikidata movie details work without any API key',async()=>{
 const api=load(async url=>{url=String(url);assert.match(url,/wbgetentities/);return response({entities:{Q23781129:{labels:{en:{value:'Avengers: Endgame'}},descriptions:{en:{value:'2019 superhero film'}},claims:{P345:[{mainsnak:{datavalue:{value:'tt4154796'}}}],P577:[{mainsnak:{datavalue:{value:{time:'+2019-04-22T00:00:00Z'}}}}],P18:[{mainsnak:{datavalue:{value:'Avengers Endgame poster.jpg'}}}]}}}})});
 const d=await api.details({source:'Wikidata',sourceId:'Q23781129',title:'Avengers: Endgame'},{});assert.equal(d.title,'Avengers: Endgame');assert.equal(d.imdbId,'tt4154796');assert.equal(d.year,2019);assert.match(d.cover,/commons\.wikimedia\.org/);assert.equal(d.source,'Wikidata');
});
