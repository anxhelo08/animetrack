import {test} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
import {fileURLToPath} from 'node:url';
const __filename=fileURLToPath(import.meta.url),__dirname=require('node:path').dirname(__filename);
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function setup(fetchImpl,{state=null,seed={}}={}){
 const store=new Map(Object.entries(seed));
 const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 const sandbox={window:{addEventListener(){}},localStorage,sessionStorage:{setItem(){},getItem(){return null}},fetch:fetchImpl||(()=>{throw Error('unexpected network')}),URL,URLSearchParams,AbortController,setTimeout,clearTimeout,setInterval:()=>0,Date,JSON,Map,Set,console,document:{visibilityState:'visible',addEventListener(){},getElementById(){return null}},navigator:{onLine:true},location:{hash:'',pathname:'/',search:'',href:''},history:{replaceState(){}}};
 vm.runInNewContext(read('src/modules/provider-sync.js'),sandbox,{filename:'provider-sync.js'});
 const data=state||{anime:[],history:[],preferences:{}};
 const ctx={esc:String,state:()=>data,uuid:()=> 'uuid-sync',save:()=>true,rerender:()=>{},toast:()=>{},importExternal:()=>({added:0})};
 return{api:sandbox.window.ATProviderSync135(ctx),store,state};
}
const localFixture=()=>({anime:[{id:'root',title:'Example Anime',status:'watching',rating:null,updatedAt:'2026-09-29T10:00:00Z',seasons:[
 {id:'al-10',title:'Season 1',subtitle:'Example Anime',source:'AniList',sourceId:'10',malId:'20',total:12,watched:[1,2,3],myRating:8.5},
 {id:'al-11',title:'Season 2',subtitle:'Example Anime S2',source:'AniList',sourceId:'11',malId:'21',total:12,watched:[],myRating:null}
]}],history:[],preferences:{}});
test('13.5 local provider snapshots use contiguous progress and per-season rating',()=>{
 const {api}=setup(null,{state:localFixture()}),al=api.localEntries('anilist'),mal=api.localEntries('mal');
 assert.equal(al.length,2);assert.equal(al[0].providerId,'10');assert.equal(al[0].snapshot.progress,3);assert.equal(al[0].snapshot.score,8.5);assert.equal(al[0].snapshot.status,'watching');
 assert.equal(mal[0].providerId,'20');assert.equal(api.contiguous([1,2,4,5]),2);
});
test('13.5 status mapping stays reversible for AniList and MAL core statuses',()=>{
 const {api}=setup();
 assert.equal(api.appStatus('CURRENT'),'watching');assert.equal(api.appStatus('on_hold'),'paused');assert.equal(api.appStatus('plan_to_watch'),'planning');
 assert.equal(api.remoteStatus('anilist','completed'),'COMPLETED');assert.equal(api.remoteStatus('mal','paused'),'on_hold');
});
test('13.5 first mismatch is a conflict; baseline detects pull vs push safely',()=>{
 const {api,store}=setup();
 const local={key:'anilist:10',providerId:'10',malId:'20',title:'A',snapshot:{status:'watching',progress:3,score:8}};
 const remote={providerId:'10',malId:'20',title:'A',snapshot:{status:'watching',progress:4,score:8}};
 let rows=api.analyzeSnapshots('anilist',[local],[remote]);assert.equal(rows[0].decision,'conflict');
 store.set('animetrack_provider_baseline_135',JSON.stringify({'anilist:10':{local:JSON.stringify({status:'watching',progress:3,score:8}),remote:JSON.stringify({status:'watching',progress:3,score:8})}}));
 rows=api.analyzeSnapshots('anilist',[local],[remote]);assert.equal(rows[0].decision,'pull');
 const local2={...local,snapshot:{status:'watching',progress:5,score:8}},remote2={...remote,snapshot:{status:'watching',progress:3,score:8}};
 rows=api.analyzeSnapshots('anilist',[local2],[remote2]);assert.equal(rows[0].decision,'push');
});
test('13.5 AniList authenticated list fetch reads Viewer then MediaListCollection',async()=>{
 const calls=[],fetch=(url,opt)=>{calls.push(JSON.parse(opt.body).query);if(calls.length===1)return Promise.resolve({ok:true,status:200,json:async()=>({data:{Viewer:{id:7,name:'demo',avatar:{large:'x'}}}})});return Promise.resolve({ok:true,status:200,json:async()=>({data:{MediaListCollection:{lists:[{entries:[{id:99,mediaId:10,status:'CURRENT',score:8.5,progress:4,repeat:0,updatedAt:100,media:{id:10,idMal:20,title:{romaji:'Example',english:'Example'},episodes:12,format:'TV',seasonYear:2026,coverImage:{large:'c'},genres:['Action'],averageScore:80,siteUrl:'https://anilist.co/anime/10'}}]}]}}})})};
 const {api}=setup(fetch,{seed:{animetrack_anilist_token_135:'token'}});
 const result=await api.fetchRemote('anilist');assert.equal(result.profile.name,'demo');assert.equal(result.canWrite,true);assert.equal(result.entries[0].providerId,'10');assert.equal(result.entries[0].snapshot.progress,4);assert.match(calls[1],/MediaListCollection/);
});
test('13.5 read-only provider-only entries are classified for manual import',()=>{
 const {api}=setup(),remote={providerId:'55',malId:'55',title:'Remote Only',snapshot:{status:'completed',progress:12,score:9}};
 const rows=api.analyzeSnapshots('mal',[],[remote]);assert.equal(rows[0].decision,'remote-only');
});
test('13.5 MAL proxy never embeds tokens and exposes only me/list/update actions',()=>{
 const src=read('api/mal.js');assert.match(src,/Missing MAL access token/);assert.match(src,/action==='me'/);assert.match(src,/action==='list'/);assert.match(src,/action==='update'/);assert.match(src,/my_list_status/);assert.doesNotMatch(src,/client_secret|MAL_CLIENT_SECRET|Bearer\s+[A-Za-z0-9_-]{20,}/);
});
test('13.5 release wires provider sync into Pro profile/navigation and PWA version',()=>{
 const main=read('src/main.js'),styles=read('src/styles/index.css'),features=read('src/modules/features.js'),app=read('src/app.js'),html=read('index.html'),sw=read('src/sw.js'),pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.version,'13.6.0');assert.equal(pkg.releaseLabel,'13.6.0');assert.match(main,/modules\/provider-sync\.js/);assert.match(styles,/provider-sync\.css/);
 assert.match(features,/providerSync:window\.ATProviderSync135/);assert.match(features,/MAL \/ AniList Sync/);assert.match(features,/providerSync\.profileCard/);assert.match(app,/providerAutoSync/);assert.match(html,/AnimeTrack 13\.6\.0/);assert.match(sw,/precacheAndRoute\(self\.__WB_MANIFEST/);
});
