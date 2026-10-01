import {PrecacheController,PrecacheRoute} from 'workbox-precaching';
import {registerRoute} from 'workbox-routing';

// A worker serves one complete release. Fresh HTML must not reference assets
// absent from the installed worker when a deployment or connection changes.
function precacheAndRoute(manifest){
const revision=manifest.find(entry=>entry.url==='index.html')?.revision;
const cacheName='animetrack-shell-'+revision;
const precache=new PrecacheController({cacheName});
precache.precache(manifest);
registerRoute(
  ({request,url})=>request.mode==='navigate' && url.origin===self.location.origin && ['/', '/index.html'].includes(url.pathname),
  precache.createHandlerBoundToURL('/index.html')
);
registerRoute(new PrecacheRoute(precache,{ignoreURLParametersMatching:[/^utm_/,/^fbclid$/]}));

return cacheName;
}
const cacheName=precacheAndRoute(self.__WB_MANIFEST);

// Keep public hashed assets for older open tabs after another tab updates.
registerRoute(
  ({request,url})=>url.origin===self.location.origin && ['script','style'].includes(request.destination) && /^\/assets\/[^/]+\.[\w-]+\.(?:js|css)$/.test(url.pathname),
  async ({request})=>{
    for(const name of (await caches.keys()).reverse()) {
      if(!name.startsWith('animetrack-shell-')&&!name.startsWith('workbox-precache-'))continue;
      const response=await (await caches.open(name)).match(request);
      if(response)return response;
    }
    return fetch(request);
  }
);
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const previous=(await caches.keys()).filter(name=>name.startsWith('animetrack-shell-')&&name!==cacheName);
  await Promise.all(previous.slice(0,-2).map(name=>caches.delete(name)));
  await caches.delete('animetrack-navigation-v143');
  await caches.delete('animetrack-supabase-sdk');
})()));

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

/* Visible Web Push only: Safari does not allow silent push notifications. */
self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?.json()||{}}catch{data={}}
  const title=String(data.title||'AnimeTrack').slice(0,100);
  const body=String(data.body||'Ke një përditësim anime.').slice(0,180);
  const tag=String(data.tag||'animetrack').slice(0,180);
  const url=typeof data.url==='string'&&data.url.startsWith('/')&&!data.url.startsWith('//')?data.url:'/';
  event.waitUntil(self.registration.showNotification(title,{
    body,tag,icon:'/icon-192.png',badge:'/icon-192.png',data:{url},renotify:false
  }));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const path=event.notification.data?.url||'/';
  const target=new URL(path,self.location.origin);
  if(target.origin!==self.location.origin)return;
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{
    const match=windows.find(x=>new URL(x.url).origin===target.origin);
    if(match){
      await match.focus();
      if('navigate' in match)await match.navigate(target.href);
      return;
    }
    await self.clients.openWindow(target.href);
  }));
});
