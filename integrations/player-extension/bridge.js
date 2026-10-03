chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(sender.id!==chrome.runtime.id||message.type!=='animetrack-played')return;
 document.dispatchEvent(new CustomEvent('animetrack-player-progress',{detail:{url:message.url,playedRatio:message.playedRatio}}));
 reply({accepted:true});
});
