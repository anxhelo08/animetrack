const VERSION='animetrack-shell-v1120-1',SHELL=['/','/index.html','/assets/app.css','/assets/app.js','/assets/pro-features.css','/assets/pro-visual-101.css','/assets/pro-home-102.css','/assets/pro-mobile-103.css','/assets/pro-compact-104.css','/assets/pro-iphone-105.css','/assets/pro-desktop-106.css','/assets/pro-quality-107.css','/assets/pro-journey-108.css','/assets/pro-airing-109.css','/assets/pro-collections-110.css','/assets/pro-ios-polish-1101.css','/assets/pro-social-111.css','/assets/pro-experience-112.css','/assets/pro-experience-112.js','/assets/pro-features.js','/assets/pro-recommendations.js','/assets/pro-calendar-wrapped.js','/assets/pro-profiles.js','/assets/pro-friends.js','/assets/pro-moderation.js','/assets/pro-notifications.js','/assets/pro-rewatch.js','/assets/pro-home.js','/assets/pro-iphone.js','/assets/pro-journey-108.js','/assets/pro-smart-airing-109.js','/assets/pro-push-109.js','/assets/pro-collections-110.js','/icon.svg','/apple-touch-icon.png','/icon-192.png','/icon-512.png','/manifest.webmanifest'];self.addEventListener('install',event=>{event.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)));self.skipWaiting()});self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('animetrack-shell-')&&k!==VERSION).map(k=>caches.delete(k)))));self.clients.claim()});self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;if(request.mode==='navigate'){event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(VERSION).then(c=>c.put('/index.html',copy))}return response}).catch(()=>caches.match('/index.html').then(r=>r||Response.error())));return}if(!SHELL.includes(url.pathname))return;event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(VERSION).then(c=>c.put(request,copy))}return response}).catch(()=>caches.match(request).then(cached=>cached||Response.error()))) });

/* Visible Web Push only: Safari does not allow silent push notifications. */
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json()||{}}catch{data={}}
 const title=String(data.title||'AnimeTrack').slice(0,100),body=String(data.body||'Ke një përditësim anime.').slice(0,180);
 const tag=String(data.tag||'animetrack').slice(0,180);
 const url=typeof data.url==='string'&&data.url.startsWith('/')&&!data.url.startsWith('//')?data.url:'/';
 event.waitUntil(self.registration.showNotification(title,{body,tag,icon:'/icon-192.png',badge:'/icon-192.png',data:{url},renotify:false}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const path=event.notification.data?.url||'/';
 const target=new URL(path,self.location.origin);
 if(target.origin!==self.location.origin)return;
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{
  const match=windows.find(x=>new URL(x.url).origin===target.origin);
  if(match){await match.focus();if('navigate' in match)await match.navigate(target.href);return}
  await self.clients.openWindow(target.href);
 }));
});
