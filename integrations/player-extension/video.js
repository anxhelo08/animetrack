// Count played seconds, excluding seeking and pauses. No credentials or video data is collected.
const sessions=new WeakMap();
setInterval(()=>{
 for(const video of document.querySelectorAll('video')){
  const url=location.origin+location.pathname;
  let session=sessions.get(video);
  if(!session||session.url!==url){session={url,last:video.currentTime,played:0,sent:false};sessions.set(video,session);}
  const delta=video.currentTime-session.last;session.last=video.currentTime;
  if(!video.paused&&!video.seeking&&delta>0&&delta<2)session.played+=delta;
  if(!session.sent&&Number.isFinite(video.duration)&&video.duration>60&&session.played/video.duration>=.9){
   session.sent=true;
   chrome.runtime.sendMessage({type:'played',url,playedRatio:Math.min(1,session.played/video.duration)}).then(result=>{if(!result?.forwarded)session.sent=false;}).catch(()=>{session.sent=false;});
  }
 }
},1000);
