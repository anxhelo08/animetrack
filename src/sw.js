import {cleanupOutdatedCaches,matchPrecache,precacheAndRoute} from 'workbox-precaching';
import {registerRoute} from 'workbox-routing';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST,{ignoreURLParametersMatching:[/^utm_/,/^fbclid$/]});

registerRoute(
  ({request})=>request.mode==='navigate',
  async({event})=>{
    try{
      const response=await fetch(event.request);
      if(response?.ok)return response;
    }catch{}
    return (await matchPrecache('/index.html'))||Response.error();
  }
);


self.addEventListener('activate',event=>{event.waitUntil(caches.delete('animetrack-supabase-sdk'))});

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
