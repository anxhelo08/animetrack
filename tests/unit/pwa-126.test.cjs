const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),src=fs.readFileSync(path.join(root,'public/sw.js'),'utf8');
const cdn='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.58.0';
function create(){
 const listeners=new Map(),files=new Map(),calls={network:[],installed:0,claimed:0,shell:[]};
 const cache={match:async key=>files.get(typeof key==='string'?key:key.url)||null,add:async request=>{const key=typeof request==='string'?request:request.url;calls.shell.push(key);files.set(key,{key})},put:async(key,value)=>{files.set(typeof key==='string'?key:key.url,value)}};
 const self={location:{origin:'https://anime.example'},addEventListener:(name,fn)=>listeners.set(name,fn),skipWaiting:()=>{calls.installed++},clients:{claim:()=>{calls.claimed++}}};
 const ctx={self,caches:{open:async()=>cache,match:async key=>files.get(typeof key==='string'?key:key.url)||null,keys:async()=>['animetrack-shell-v1300-1','animetrack-shell-v1351-1-runtime'],delete:async()=>true},Request:class{constructor(url){this.url=url}},URL,Response:{error:()=>({failed:true})},fetch:async req=>{calls.network.push(req.url||req);return {ok:true,network:true,clone(){return this}}},console,setTimeout};
 vm.runInNewContext(src,ctx,{filename:'public/sw.js'});return {listeners,files,cache,calls};
}
async function trigger(fn,request){let response=null;fn({request,respondWith:p=>{response=p}});return response&&await response}

test('13.1.a install caches only stable public shell and activates immediately',async()=>{
 const {listeners,calls,files}=create(),jobs=[];listeners.get('install')({waitUntil:work=>jobs.push(work)});await Promise.all(jobs);
 for(const path of ['/','/index.html','/manifest.webmanifest','/icon-192.png','/icon-512.png'])assert(calls.shell.includes(path),path);
 assert(files.has(cdn),'the pinned Supabase SDK remains available for offline auth');
 assert.equal(calls.shell.some(x=>/pro-[a-z-]+-[0-9]+\.(js|css)/.test(String(x))),false,'versioned source chunks are never hard-coded into the shell');
 assert.equal(calls.installed,1);
});

test('13.1.a PWA uses network-first navigation and runtime caching for Vite hashed assets',async()=>{
 const {listeners,files,calls}=create();
 files.set('https://anime.example/assets/app.ABC123.js',{cached:true});
 let result=await trigger(listeners.get('fetch'),{url:'https://anime.example/?profile=fan',method:'GET',mode:'navigate'});
 assert.equal(result.network,true);assert.equal(calls.network.length,1,'navigation checks the network for the newest HTML');
 result=await trigger(listeners.get('fetch'),{url:'https://anime.example/assets/app.ABC123.js',method:'GET',mode:'no-cors'});
 assert.equal(result.cached,true,'hashed assets can be served immediately from runtime cache');
 assert.match(src,/pathname\.startsWith\('\/assets\/'\)/);assert.match(src,/staleWhileRevalidate/);assert.match(src,/networkFirst/);
});

test('13.1.a PWA update preserves durable pending progress while blocking unsafe reloads',()=>{
 const features=fs.readFileSync(path.join(root,'src/modules/features.js'),'utf8'),core=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
 assert.match(features,/if\(ctx\.canReload&&!ctx\.canReload\(\)\)/);assert.match(features,/if\(!updateRequested\)return/);assert.match(features,/pwaRegistration\.waiting\.postMessage\(\{type:'SKIP_WAITING'\}\)/);assert.match(core,/canReload:\(\)=>!cloudSaving&&!\(cloudDirty&&cloudMirrorUnavailable\)/);
});
