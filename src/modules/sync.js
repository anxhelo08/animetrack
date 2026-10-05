/* AnimeTrack 12.6: per-account durable offline journal.
   Journal is written BEFORE the library snapshot so reload/login never silently
   replaces a locally saved but not-yet-uploaded episode. No credentials stored. */
window.ATSync126=(()=>{
 const pendingKey=key=>key+'_pending_126',revisionKey=key=>key+'_revision_126';
 function pending(storage,key){
  let raw=null;
  try{raw=storage.getItem(pendingKey(key))}catch{return {baseRevision:null,invalid:true}}
  if(raw===null)return null;
  try{const data=JSON.parse(raw);if(!data||typeof data!=='object'||!('baseRevision' in data))throw Error('invalid journal');
   return {baseRevision:typeof data.baseRevision==='string'?data.baseRevision:null,savedAt:Number(data.savedAt)||0};
  }catch{return {baseRevision:null,invalid:true}}
 }
 function revision(storage,key){try{const v=storage.getItem(revisionKey(key));return v&&typeof v==='string'?v:null}catch{return null}}
 function mark(storage,key,baseRevision){
  const prior=pending(storage,key);
  if(prior?.invalid)throw Error('Journal lokal i pavlefshëm: eksporto kopje rezervë para se të vazhdosh.');
  const base=prior?prior.baseRevision:(baseRevision||null);
  storage.setItem(pendingKey(key),JSON.stringify({baseRevision:base,savedAt:Date.now()}));
  return prior;
 }
 function save(storage,key,value,baseRevision,cloud){
  const snapshot=JSON.stringify(value);
  if(!cloud){storage.setItem(key,snapshot);return true}
  const prev=storage.getItem(pendingKey(key));
  mark(storage,key,baseRevision);
  try{storage.setItem(key,snapshot)}
  catch(e){try{if(prev===null)storage.removeItem(pendingKey(key));else storage.setItem(pendingKey(key),prev)}catch{}throw e}
  return true;
 }
 function acknowledge(storage,key,newRevision,stillDirty){
  if(newRevision)storage.setItem(revisionKey(key),newRevision);
  if(stillDirty){storage.setItem(pendingKey(key),JSON.stringify({baseRevision:newRevision||null,savedAt:Date.now()}))}
  else storage.removeItem(pendingKey(key));
 }
 function remoteStatus(local,journal,remote,normalize){
  if(!journal||!local)return 'remote';
  const received=remote?.payload?normalize(remote.payload):null;
  if(received&&JSON.stringify(received)===JSON.stringify(local))return 'same';
  const remoteRevision=typeof remote?.updated_at==='string'?remote.updated_at:null;
  if(remoteRevision===(journal.baseRevision||null))return 'pending';

  // Revisions are opaque server tokens. Divergence always merges; phone time
  // and the old journal savedAt field never select a winner.
  return 'diverged';
 }
 return {pendingKey,revisionKey,pending,revision,mark,save,acknowledge,remoteStatus};
})();
