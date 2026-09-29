/* AnimeTrack 12.15.3 — cross-device Supabase Realtime helper. */
window.ATCrossSync12153=(()=>{
 'use strict';
 function start(client,userId,onRemote,onStatus){
  const uid=String(userId||'').trim();
  if(!uid||!client||typeof client.channel!=='function'||typeof onRemote!=='function')return null;
  const channel=client.channel('animetrack-library-'+uid);
  if(!channel||typeof channel.on!=='function')return null;
  channel.on('postgres_changes',{event:'*',schema:'public',table:'anime_libraries',filter:'user_id=eq.'+uid},payload=>onRemote(payload));
  if(typeof channel.subscribe==='function')channel.subscribe((status,error)=>{if(typeof onStatus==='function')onStatus(status,error)});
  return channel;
 }
 function stop(client,channel){
  if(!channel)return false;
  let stopped=false;
  try{if(typeof channel.unsubscribe==='function'){channel.unsubscribe();stopped=true}}catch{}
  try{if(client&&typeof client.removeChannel==='function'){client.removeChannel(channel);stopped=true}}catch{}
  return stopped;
 }
 return {start,stop};
})();
