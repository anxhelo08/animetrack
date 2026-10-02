import {htmlHelpers,avatarHelpers} from '../helpers/html.js';
import {test} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
import {fileURLToPath} from 'node:url';
const __filename=fileURLToPath(import.meta.url),__dirname=require('node:path').dirname(__filename);
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const source=fs.readFileSync(path.join(root,'src/modules/recommendations.js'),'utf8');
function fixture(){
 const store=new Map(),calls=[],previews=[];
 const library=[{id:'mine',title:'Drama Favorite',status:'completed',genre:'Drama, Mystery',rating:9,favorite:true,source:'TVMaze',sourceId:'111',seasons:[{sourceId:'111'}]}],owner={id:'test-user'};
 const shows=[{id:777,name:'Dexter',type:'Scripted',genres:['Drama','Mystery'],premiered:'2006-10-01',rating:{average:8.6},image:{medium:'https://example.com/dexter.jpg',original:'https://example.com/dexter-original.jpg'},summary:'<p>A mystery series</p>'},{id:111,name:'Drama Favorite',type:'Scripted',genres:['Drama'],premiered:'2005-01-01',rating:{average:9},image:{medium:'https://example.com/favorite.jpg'}}];
 const media=[{id:21,idMal:121,title:{romaji:'Fantasy Journey'},genres:['Drama','Fantasy'],averageScore:86,popularity:25000,episodes:12,format:'TV',seasonYear:2025,coverImage:{large:'https://example.com/anime.jpg',extraLarge:'https://example.com/anime-original.jpg'},description:'Anime about a journey',relations:{edges:[]}}];
 const fetch=async url=>{
  calls.push(String(url));
  if(String(url).includes('tvmaze.com/shows?page='))return {ok:true,json:async()=>shows};
  return {ok:true,json:async()=>({data:{Page:{media}}})};
 };
 const sandbox={window:{ATHTML:htmlHelpers,ATAvatar:avatarHelpers},localStorage:{getItem:key=>store.get(key)||null,setItem:(key,v)=>store.set(key,v)},fetch,Date,Map,Set,Promise,setTimeout,clearTimeout,AbortController};vm.runInNewContext(source,sandbox);
 const ctx={esc:x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;'),user:()=>owner,state:()=>({anime:library}),poster:x=>x,genres:a=>String(a.genre||'').split(',').map(x=>x.trim()),seriesRoot:x=>String(x||'').toLowerCase(),mapAniList:m=>({key:'al-'+m.id,source:'AniList',sourceId:String(m.id),malId:String(m.idMal),title:m.title.romaji,genre:m.genres.join(', '),cover:m.coverImage.large,score:m.averageScore,format:m.format,year:m.seasonYear,total:m.episodes,synopsis:m.description}),inLibrary:x=>library.find(a=>a.title.toLowerCase()===String(x.title||'').toLowerCase()||x.kind==='tv'&&a.sourceId===String(x.sourceId)),rerender:()=>{},toast:()=>{},previewItem:x=>previews.push(x),addItem:async()=>{}};
 return {rec:sandbox.window.ATRecommendations(ctx),store,calls,previews,library,owner};
}
test('12.5 mixed discovery: TV shows and anime in one list, duplicates excluded',async()=>{
 const fx=fixture(),snapshot=JSON.stringify(fx.library);await fx.rec.refresh(true);
 const html=fx.rec.render();
 assert.match(html,/Dexter/);assert.match(html,/Fantasy Journey/);
 assert.match(html,/dexter-original\.jpg/);
 assert.equal(fx.rec.getUpdates()[0].cover,'https://example.com/anime-original.jpg');
 assert.doesNotMatch(html,/Drama Favorite/);
 assert.match(html,/Burimi: AniList \+ TVMaze/);
 assert.match(html,/Gjithçka/);assert.match(html,/Seriale TV/);
 assert.equal(fx.calls.filter(x=>x.includes('tvmaze.com/shows?page=')).length,2);
 assert.equal(JSON.stringify(fx.library),snapshot,'discovery must not change user library');
});
test('12.5 media filters: TV, anime and movie categories and safe TV preview',async()=>{
 const fx=fixture();await fx.rec.refresh(true);
 fx.rec.setMedia('tv');const tv=fx.rec.render();
 assert.match(tv,/Dexter/);assert.doesNotMatch(tv,/Fantasy Journey/);
 assert.match(tv,/Shiko \/ shto në listë/);
 fx.rec.preview('tv-777');assert.equal(fx.previews[0].sourceId,'777');assert.equal(fx.previews[0].kind,'tv');
 fx.rec.setMedia('anime');assert.match(fx.rec.render(),/Fantasy Journey/);assert.doesNotMatch(fx.rec.render(),/Dexter/);
 fx.rec.setMedia('movies');assert.match(fx.rec.render(),/Nuk ka sugjerime/);
 fx.rec.setMedia('all');fx.rec.hide('tv-777');assert.doesNotMatch(fx.rec.render(),/Dexter/);fx.rec.restore();assert.match(fx.rec.render(),/Dexter/);
 assert([...fx.store.keys()].some(x=>x.includes('animetrack_rec_prefs_v10_test-user')));
});
test('12.5 integration: TV preview is routed through native TVMaze flow without forced add',()=>{
 const app=fs.readFileSync(path.join(root,'src/app.js'),'utf8'),pro=fs.readFileSync(path.join(root,'src/modules/features.js'),'utf8'),css=fs.readFileSync(path.join(root,'src/styles/media-workflow.css'),'utf8');
 assert.match(app,/if\(item\.kind==='tv'\)\{void openUnifiedTV\(item\.sourceId\);return\}/);
 assert.match(pro,/rec-media/);
 assert.match(css,/at125-rec-media-btn/);
 assert.match(source,/data-pro-action="\$\{x\.kind==='tv'\?'preview-recommendation':'add-recommendation'\}"/);
});
