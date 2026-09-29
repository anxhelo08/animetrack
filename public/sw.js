const VERSION='animetrack-shell-v1351-1';
const STATIC_CACHE=`${VERSION}-static`;
const RUNTIME_CACHE=`${VERSION}-runtime`;
const CORE=['/','/index.html','/manifest.webmanifest','/icon.svg','/icon-192.png','/icon-512.png','/apple-touch-icon.png'];
const SUPABASE_CDN='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.58.0';

self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(STATIC_CACHE);
  const settled=await Promise.allSettled(CORE.map(path=>cache.add(path)));
  const failed=settled.filter(x=>x.status==='rejected').length;
  if(failed)console.warn('Some optional shell files were not precached',failed);
  try{await cache.add(new Request(SUPABASE_CDN,{mode:'cors'}))}catch(err){console.warn('Optional auth SDK cache unavailable',err)}
  await self.skipWaiting();
 })());
});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('animetrack-shell-')&&!k.startsWith(VERSION)).map(k=>caches.delete(k)));await self.clients.claim()})());
});
async function networkFirst(request,fallback){const cache=await caches.open(RUNTIME_CACHE);try{const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response}catch{return (await cache.match(request))||(fallback?await caches.match(fallback):null)||Response.error()}}
async function staleWhileRevalidate(request){const cache=await caches.open(RUNTIME_CACHE),cached=await cache.match(request);const update=fetch(request).then(async response=>{if(response.ok)await cache.put(request,response.clone());return response}).catch(()=>null);return cached||await update||Response.error()}
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET')return;if(url.href===SUPABASE_CDN){event.respondWith(staleWhileRevalidate(request));return}if(url.origin!==self.location.origin)return;if(request.mode==='navigate'){event.respondWith(networkFirst(request,'/index.html'));return}if(url.pathname.startsWith('/assets/')){event.respondWith(staleWhileRevalidate(request));return}if(CORE.includes(url.pathname)){event.respondWith(staleWhileRevalidate(request));return}});

/* Visible Web Push only: Safari does not allow silent push notifications. */
self.addEventListener('push',event=>{let data={};try{data=event.data?.json()||{}}catch{data={}}const title=String(data.title||'AnimeTrack').slice(0,100),body=String(data.body||'Ke një përditësim anime.').slice(0,180),tag=String(data.tag||'animetrack').slice(0,180),url=typeof data.url==='string'&&data.url.startsWith('/')&&!data.url.startsWith('//')?data.url:'/';event.waitUntil(self.registration.showNotification(title,{body,tag,icon:'/icon-192.png',badge:'/icon-192.png',data:{url},renotify:false}))});
self.addEventListener('notificationclick',event=>{event.notification.close();const path=event.notification.data?.url||'/',target=new URL(path,self.location.origin);if(target.origin!==self.location.origin)return;event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{const match=windows.find(x=>new URL(x.url).origin===target.origin);if(match){await match.focus();if('navigate' in match)await match.navigate(target.href);return}await self.clients.openWindow(target.href)}))});
