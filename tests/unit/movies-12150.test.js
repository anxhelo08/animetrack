import {test} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
import {fileURLToPath} from 'node:url';
const __filename=fileURLToPath(import.meta.url),__dirname=require('node:path').dirname(__filename);
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function load(fetchImpl){const sandbox={window:{},fetch:fetchImpl,URLSearchParams,console};vm.runInNewContext(read('src/modules/movies.js'),sandbox);return sandbox.window.ATMovies12150}
const response=data=>({ok:true,status:200,json:async()=>data});
test('12.15.3 TMDB search maps movies as first-class catalog items',async()=>{
 const api=load(async url=>{assert.match(String(url),/search\/movie/);return response({results:[{id:11,title:'Star Wars',original_title:'Star Wars',release_date:'1977-05-25',poster_path:'/p.jpg',backdrop_path:'/b.jpg',overview:'Space opera',vote_average:8.2}]})});
 const r=await api.search('Star Wars',{tmdbToken:'token-token-token-token'});assert.equal(r.provider,'TMDB');assert.equal(r.items[0].kind,'movie');assert.equal(r.items[0].tmdbId,'11');assert.equal(r.items[0].score,82);assert.match(r.items[0].cover,/image\.tmdb\.org/);
});
test('12.15.3 TMDB details expose runtime, director, cast, IMDb and collection',async()=>{
 const api=load(async url=>{url=String(url);if(url.includes('/movie/11?'))return response({id:11,title:'Star Wars',release_date:'1977-05-25',runtime:121,genres:[{name:'Adventure'}],poster_path:'/p.jpg',backdrop_path:'/b.jpg',overview:'Space opera',vote_average:8.2,credits:{crew:[{job:'Director',name:'George Lucas'}],cast:[{name:'Mark Hamill'},{name:'Carrie Fisher'}]},external_ids:{imdb_id:'tt0076759'},belongs_to_collection:{id:10,name:'Star Wars Collection'}});throw Error(url)});
 const d=await api.details({source:'TMDB',sourceId:'11',title:'Star Wars'},{tmdbToken:'token-token-token-token'});assert.equal(d.runtime,121);assert.equal(d.director,'George Lucas');assert.match(d.cast,/Mark Hamill/);assert.equal(d.imdbId,'tt0076759');assert.equal(d.collectionId,'10');
});
test('12.15.3 app separates Movies from Anime and TV and keeps credentials local',()=>{
 const app=read('src/app.js'),unified=read('src/modules/unified.js'),html=read('index.html'),main=read('src/main.js'),sw=read('src/sw.js'),pkg=JSON.parse(read('package.json'));
 assert.match(app,/function isLiveMovie/);assert.match(app,/TMDB_TOKEN_STORAGE/);assert.match(app,/movie-watched/);assert.match(app,/movie-rewatched/);assert.match(app,/at150RenderMovieDetail/);assert.match(app,/source:\['AniList','MyAnimeList','TVMaze','TMDB','OMDb','Cinemeta','Wikidata'\]/);
 assert.match(unified,/const isMovie=/);assert.match(unified,/movie:movies\.length/);assert.match(html,/data-media-filter="movie"/);assert.match(html,/tmdb-token-input/);assert.match(main,/modules\/movies\.js/);assert.match(sw,/precacheAndRoute\(self\.__WB_MANIFEST/);assert.equal(pkg.version,'13.6.0');
});
test('12.15.3 zero-key search falls back to Wikidata and finds Avengers Endgame',async()=>{
 const api=load(async url=>{url=String(url);if(url.includes('/api/cinemeta?mode=search'))return response({metas:[]});assert.match(url,/wikidata\.org\/w\/api\.php/);assert.match(url,/wbsearchentities/);return response({search:[{id:'Q23781129',label:'Avengers: Endgame',description:'2019 film directed by Anthony and Joe Russo'},{id:'Q123',label:'Avengers',description:'Marvel Comics superhero team'}]})});
 const r=await api.search('Avengers Endgame',{});assert.equal(r.provider,'Wikidata');assert.equal(r.items.length,1);assert.equal(r.items[0].title,'Avengers: Endgame');assert.equal(r.items[0].year,2019);assert.equal(r.items[0].sourceId,'Q23781129');
});
test('12.15.3 Wikidata movie details work without any API key',async()=>{
 const api=load(async url=>{url=String(url);assert.match(url,/wbgetentities/);return response({entities:{Q23781129:{labels:{en:{value:'Avengers: Endgame'}},descriptions:{en:{value:'2019 superhero film'}},claims:{P345:[{mainsnak:{datavalue:{value:'tt4154796'}}}],P577:[{mainsnak:{datavalue:{value:{time:'+2019-04-22T00:00:00Z'}}}}],P18:[{mainsnak:{datavalue:{value:'Avengers Endgame poster.jpg'}}}]}}}})});
 const d=await api.details({source:'Wikidata',sourceId:'Q23781129',title:'Avengers: Endgame'},{});assert.equal(d.title,'Avengers: Endgame');assert.equal(d.imdbId,'tt4154796');assert.equal(d.year,2019);assert.match(d.cover,/commons\.wikimedia\.org/);assert.equal(d.source,'Wikidata');
});

test('12.15.3 zero-key Cinemeta search returns rich IMDb-ID cards with posters',async()=>{
 const api=load(async url=>{url=String(url);assert.match(url,/\/api\/cinemeta\?mode=search&q=/);return response({metas:[{id:'tt4154796',type:'movie',name:'Avengers: Endgame',releaseInfo:'2019',poster:'https://img.example/endgame.jpg',background:'https://img.example/bg.jpg',imdbRating:'8.4',description:'After the devastating events.'}]})});
 const r=await api.search('Avengers Endgame',{});assert.equal(r.provider,'IMDb/Cinemeta');assert.equal(r.items[0].imdbId,'tt4154796');assert.equal(r.items[0].title,'Avengers: Endgame');assert.match(r.items[0].cover,/endgame\.jpg/);assert.equal(r.items[0].score,84);
});
test('12.15.3 zero-key Cinemeta can surface Obsession with IMDb identity and poster',async()=>{
 const api=load(async url=>response({metas:[{id:'tt37287335',type:'movie',name:'Obsession',releaseInfo:'2025',poster:'https://img.example/obsession.jpg',imdbRating:'7.8',description:'A supernatural romantic horror film.'}]}));
 const r=await api.search('Obsession',{});assert.equal(r.provider,'IMDb/Cinemeta');assert.equal(r.items[0].imdbId,'tt37287335');assert.match(r.items[0].cover,/obsession\.jpg/);
});
test('12.15.3 Cinemeta details provide rich metadata without API keys',async()=>{
 const api=load(async url=>{url=String(url);assert.match(url,/\/api\/cinemeta\?mode=meta&id=tt37287335/);return response({meta:{id:'tt37287335',type:'movie',name:'Obsession',year:2025,released:'2026-05-15T00:00:00.000Z',poster:'https://img.example/obsession.jpg',background:'https://img.example/obsession-bg.jpg',description:'A sinister enchantment ensues.',runtime:'109 min',genres:['Horror','Romance','Thriller'],director:['Curry Barker'],cast:['Michael Johnston','Inde Navarrette'],imdbRating:'7.8'}})});
 const d=await api.details({source:'Cinemeta',sourceId:'tt37287335',imdbId:'tt37287335',title:'Obsession'},{});assert.equal(d.source,'Cinemeta');assert.equal(d.runtime,109);assert.match(d.genre,/Horror/);assert.match(d.cast,/Inde Navarrette/);assert.equal(d.imdbRating,7.8);assert.match(d.backdrop,/obsession-bg/);
});

test('12.15.3 Cinemeta browser requests use the same-origin proxy and the proxy is host-locked',()=>{
 const helper=read('src/modules/movies.js'),api=read('api/cinemeta.js');
 assert.match(helper,/\/api\/cinemeta\?mode=search/);assert.match(helper,/\/api\/cinemeta\?mode=meta/);assert.doesNotMatch(helper,/fetch\('https:\/\/v3-cinemeta\.strem\.io/);
 assert.match(api,/https:\/\/v3-cinemeta\.strem\.io\/catalog\/movie\/top\/search=/);assert.match(api,/https:\/\/v3-cinemeta\.strem\.io\/meta\/movie\//);assert.match(api,/\^tt\\d\+\$/);assert.doesNotMatch(api,/req\.query\.url|targetUrl/);
});

test('12.15.3 movie mutations flush cloud immediately after durable local save',()=>{
 const app=read('src/app.js');
 assert.match(app,/function at150FlushCloud/);
 assert.match(app,/if\(!save\(\)\)\{state\.anime=before;return\}at150FlushCloud\(\)/);
 assert.match(app,/if\(!save\(\)\)\{state\.anime\[idx\]=before;state\.history=hist;return\}at150FlushCloud\(\)/);
 assert.match(app,/if\(save\(\)\)at150FlushCloud\(\)/);
});
