const VERSION='animetrack-shell-v12123-1',SUPABASE_CDN='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.58.0',SHELL=['/assets/styles.css','/assets/config.js','/assets/pro-resume-123.js','/assets/pro-command-124.js','/assets/pro-year-125.js','/assets/pro-sync-126.js','/assets/pro-storage-1274.js','/assets/pro-seasonal-128.js','/assets/pro-wrapped-129.js','/assets/pro-tv-episodes-127.js','/assets/pro-filler-1210.js','/assets/pro-franchise-1212.js','/assets/pro-cloud-local-12123.js','/assets/pro-episode-hub-127.js','/','/index.html','/assets/app.js','/assets/pro-daily-115.js','/assets/pro-mobile-113.js','/assets/pro-experience-112.js','/assets/pro-features.js','/assets/pro-tv-118.js','/assets/pro-unified-119.js','/assets/pro-tv-unified-120.js','/assets/pro-recommendations.js','/assets/pro-calendar-wrapped.js','/assets/pro-profiles.js','/assets/pro-friends.js','/assets/pro-import-116.js','/assets/pro-moderation.js','/assets/pro-notifications.js','/assets/pro-rewatch.js','/assets/pro-home.js','/assets/pro-iphone.js','/assets/pro-journey-108.js','/assets/pro-smart-airing-109.js','/assets/pro-push-109.js','/assets/pro-collections-110.js','/icon.svg','/apple-touch-icon.png','/icon-192.png','/icon-512.png','/manifest.webmanifest'];self.addEventListener('install',event=>{event.waitUntil(caches.open(VERSION).then(async c=>{await c.addAll(SHELL);try{await c.add(new Request(SUPABASE_CDN,{mode:'cors'}))}catch(err){console.warn('Optional offline auth SDK cache unavailable',err)}}).then(()=>self.skipWaiting()))});self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('animetrack-shell-')&&k!==VERSION).map(k=>caches.delete(k)))));self.clients.claim()});self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET')return;if(url.href===SUPABASE_CDN){event.respondWith(caches.open(VERSION).then(async c=>{const cached=await c.match(request);if(cached)return cached;try{const response=await fetch(request);if(response.ok)await c.put(request,response.clone());return response}catch{return Response.error()}}));return}if(url.origin!==self.location.origin)return;if(request.mode==='navigate'&&(url.pathname==='/'||url.pathname==='/index.html')){event.respondWith(caches.open(VERSION).then(async c=>(await c.match('/index.html'))||fetch(request).catch(()=>Response.error())));return}if(!SHELL.includes(url.pathname))return;event.respondWith(caches.open(VERSION).then(async c=>{const cached=await c.match(url.pathname);if(cached)return cached;try{const response=await fetch(request);if(response.ok)await c.put(url.pathname,response.clone());return response}catch{return Response.error()}})) });

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
