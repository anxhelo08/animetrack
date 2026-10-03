const hosts=new Set(['www.crunchyroll.com','www.netflix.com','www.disneyplus.com','www.primevideo.com']);
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(message.type!=='played'||!sender.tab||sender.id!==chrome.runtime.id)return;
 let url;try{url=new URL(sender.url);}catch{return;}
 if(url.protocol!=='https:'||!hosts.has(url.hostname)||message.url!==url.origin+url.pathname||!Number.isFinite(message.playedRatio)||message.playedRatio<.9||message.playedRatio>1)return;
 chrome.tabs.query({url:'https://animetrack-flax.vercel.app/*'}).then(async tabs=>{
  let forwarded=false;
  for(const tab of tabs)try{const result=await chrome.tabs.sendMessage(tab.id,{type:'animetrack-played',url:message.url,playedRatio:message.playedRatio});forwarded||=result?.accepted===true;}catch{}
  reply({forwarded});
 }).catch(()=>reply({forwarded:false}));
 return true;
});
