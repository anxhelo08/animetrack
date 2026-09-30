import { test, expect, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { createLocalLimiter, allowProxy, upstreamJSON } from '../../server/http.js';
import { createHandler as cinema } from '../../api/cinemeta.js';
import { createHandler as mal } from '../../api/mal.js';
import { seal, open } from '../../supabase/functions/anime-account/vault.js';
import { createAccountHandler } from '../../supabase/functions/anime-account/handler.js';
const response=()=>({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(v){this.body=v;return this}});
test('rate budgets expire without allowing identity floods to evict active limits',()=>{
 let now=0;const limit=createLocalLimiter({limit:2,windowMs:10,maxKeys:2,clock:()=>now});
 expect(limit('a')).toBe(true);expect(limit('a')).toBe(true);expect(limit('a')).toBe(false);expect(limit('b')).toBe(true);expect(limit('c')).toBe(false);expect(limit('a')).toBe(false);now=10;expect(limit('a')).toBe(true);
});
test('proxy fails closed when shared budget is unavailable',async()=>{
 const res=response();const f=vi.fn().mockRejectedValue(Error('offline'));
 expect(await allowProxy({headers:{},socket:{remoteAddress:'1'}},res,'mal',{fetchImpl:f,local:()=>true})).toBe(false);
 expect(res.statusCode).toBe(503);expect(res.headers['Retry-After']).toBe('30');
});
test('shared global budget denial prevents upstream request',async()=>{
 const res=response();expect(await allowProxy({headers:{}},res,'mal',{fetchImpl:async()=>({ok:true,json:async()=>false}),local:()=>true})).toBe(false);expect(res.statusCode).toBe(429);
});
test('Cinemeta validates targets before spending budget or fetching',async()=>{
 const fetchImpl=vi.fn(),limit=vi.fn(),h=cinema({fetchImpl,limit});
 for(const query of [{mode:'meta',id:'https://evil.test'},{mode:'meta',id:'tt1/../../admin'},{mode:'search',q:'x'}]){const r=response();await h({method:'GET',query},r);expect(r.statusCode).toBe(400)}
 expect(fetchImpl).not.toHaveBeenCalled();expect(limit).not.toHaveBeenCalled();
});
test('MAL updates reject injected IDs and out-of-range progress',async()=>{
 const fetchImpl=vi.fn(),h=mal({fetchImpl,limit:async()=>true});
 for(const [id,num] of [['1/admin',3],['1',-1],['1',10001]]){const r=response();await h({method:'PATCH',headers:{authorization:'Bearer example'},query:{action:'update',id},body:{status:'watching',num_watched_episodes:num,score:8}},r);expect(r.statusCode).toBe(400)}expect(fetchImpl).not.toHaveBeenCalled();
});
test('upstream transport disables redirects and hides provider error bodies',async()=>{
 const f=vi.fn(async()=>({ok:false,status:500,json:async()=>({token:'secret'})}));
 expect(await upstreamJSON('https://provider.test',{},f)).toEqual({status:502,data:{error:'Provider request unavailable'}});expect(f.mock.calls[0][1].redirect).toBe('error');
});
test('encrypted credentials round-trip, differ each time and reject wrong keys or tampering',async()=>{
 const secret='test-secret-longer-than-thirty-two-characters',data={token:'private-provider-token'};
 const a=await seal(data,secret,webcrypto),b=await seal(data,secret,webcrypto);expect(a).not.toBe(b);expect(a).not.toContain(data.token);expect(await open(a,secret,webcrypto)).toEqual(data);await expect(open(a,'different-secret-longer-than-thirty-two-characters',webcrypto)).rejects.toThrow();const bytes=Buffer.from(a,'base64');bytes[15]^=1;await expect(open(bytes.toString('base64'),secret,webcrypto)).rejects.toThrow();
});
const req=(body,token='test-session',origin='https://animetrack-flax.vercel.app')=>new Request('https://example.test',{method:'POST',headers:{origin,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
function setup({active=true,budget=true,recent=true}={}){
 const admin={auth:{getUser:vi.fn(async()=>({data:{user:{id:'owner',email:'a@example.test'}}})),admin:{deleteUser:vi.fn(async()=>({data:{},error:null}))}},rpc:vi.fn(async()=>({data:[],error:null})),from:vi.fn(),storage:{from:vi.fn()}};
 const caller={rpc:vi.fn(async(name)=>({data:name==='anime_has_active_session'?active:name==='anime_recent_session'?recent:budget,error:null}))};
 return {admin,caller,handle:createAccountHandler({admin,clientForToken:()=>caller,secret:'test-secret-longer-than-thirty-two-characters',fetchImpl:vi.fn()})};
}
test('account handler rejects absent authentication and foreign origins before database access',async()=>{
 const {handle,admin}=setup();expect((await handle(req({action:'status'},''))).status).toBe(401);expect((await handle(req({action:'status'},'token','https://evil.test'))).status).toBe(403);expect(admin.auth.getUser).not.toHaveBeenCalled();
});
test('revoked session and exhausted budget stop privileged account operations',async()=>{
 for(const options of [{active:false},{budget:false}]){const {handle,admin}=setup(options);expect((await handle(req({action:'delete',confirmation:'FSHI LLOGARINE'}))).status).toBe(options.active===false?401:429);expect(admin.auth.admin.deleteUser).not.toHaveBeenCalled();expect(admin.from).not.toHaveBeenCalled()}
});
test('account deletion requires confirmation and fresh login',async()=>{
 const first=setup();expect((await first.handle(req({action:'delete'}))).status).toBe(400);expect(first.admin.auth.admin.deleteUser).not.toHaveBeenCalled();
 const second=setup({recent:false});expect((await second.handle(req({action:'delete',confirmation:'FSHI LLOGARINE'}))).status).toBe(403);expect(second.admin.auth.admin.deleteUser).not.toHaveBeenCalled();
});
test('deletion derives the user from authentication, ignoring a caller supplied ID',async()=>{
 const {handle,admin}=setup();const r=await handle(req({action:'delete',confirmation:'FSHI LLOGARINE',user_id:'victim'}));expect(r.status).toBe(200);expect(admin.rpc).toHaveBeenCalledWith('anime_account_storage_objects',{p_user_id:'owner'});expect(admin.auth.admin.deleteUser).toHaveBeenCalledWith('owner');
});
