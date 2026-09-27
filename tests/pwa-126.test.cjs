const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),src=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const cdn='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.58.0';
function create(){
 const listeners=new Map(),files=new Map(),calls={network:[],installed:0,claimed:0,shell:[]};
 const cache={match:async key=>files.get(typeof key==='string'?key:key.url)||null,addAll:async paths=>{calls.shell=paths;for(const key of paths)files.set(key,{key})},add:async request=>{files.set(request.url,{key:request.url})},put:async(key,value)=>{files.set(typeof key==='string'?key:key.url,value)}};
 const self={location:{origin:'https://anime.example'},addEventListener:(name,fn)=>listeners.set(name,fn),skipWaiting:()=>{calls.installed++},clients:{claim:()=>{calls.claimed++}}};
 const ctx={self,caches:{open:async()=>cache,keys:async()=>['animetrack-shell-v1250-1','animetrack-shell-v12100-1'],delete:async()=>true},Request:class{constructor(url){this.url=url}},URL,Response:{error:()=>({failed:true})},fetch:async req=>{calls.network.push(req.url);return {ok:true,clone(){return this}}},console};
 vm.runInNewContext(src,ctx,{filename:'sw.js'});
 return {listeners,files,cache,calls};
}
async function trigger(fn,request){let response=null;fn({request,respondWith:p=>{response=p}});return response&&await response}
test('12.6 install preloads entire shell and optional offline auth SDK without auto activation',async()=>{
 const {listeners,calls,files}=create(),jobs=[];
 listeners.get('install')({waitUntil:work=>jobs.push(work)});
 await Promise.all(jobs);
 assert(calls.shell.includes('/assets/pro-sync-126.js'));
 assert(files.has(cdn),'the pinned Supabase SDK must be cached for offline sessions');
 assert.equal(calls.installed,0,'new worker may not activate until user approval');
 listeners.get('message')({data:{type:'SKIP_WAITING'}});assert.equal(calls.installed,1);
});
test('12.6 PWA navigation and core asset cache stay release-consistent',async()=>{
 const {listeners,files,calls}=create();
 files.set('/index.html',{version:'12.6'});
 files.set('/assets/app.js',{version:'12.6 js'});
 files.set(cdn,{version:'cached auth SDK'});
 let result=await trigger(listeners.get('fetch'),{url:'https://anime.example/?profile=fan',method:'GET',mode:'navigate'});
 assert.equal(result.version,'12.6');
 result=await trigger(listeners.get('fetch'),{url:'https://anime.example/assets/app.js',method:'GET',mode:'no-cors'});
 assert.equal(result.version,'12.6 js');
 result=await trigger(listeners.get('fetch'),{url:cdn,method:'GET',mode:'no-cors'});
 assert.equal(result.version,'cached auth SDK');
 assert.equal(calls.network.length,0,'cached release assets and auth SDK must not fetch a newer version');
});
test('12.6 PWA update preserves user consent and unsynced progress',()=>{
 const features=fs.readFileSync(path.join(root,'assets/pro-features.js'),'utf8'),core=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
 assert.match(features,/if\(ctx\.canReload&&!ctx\.canReload\(\)\)/);
 assert.match(features,/if\(!updateRequested\)return/);
 assert.match(features,/pwaRegistration\.waiting\.postMessage\(\{type:'SKIP_WAITING'\}\)/);
 assert.match(core,/canReload:\(\)=>!cloudDirty&&!cloudSaving/);
});
