const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../assets/app.js'),'utf8');
function fn(name){const start=source.indexOf('function '+name+'('),end=source.indexOf('\n',start);return (source.slice(start-6,start)==='async '?'async ':'')+source.slice(start,end);}
function realm(ok){
 const fields={'anime-id':'a','anime-title':'Changed','anime-total':'12','anime-current':'1','anime-status':'watching','anime-rating':'','anime-year':'','anime-genre':'','anime-cover':'','anime-notes':''};
 const messages=[],closed=[];
 const c={state:{anime:[{id:'a',title:'Original',total:12,status:'watching',seasons:[{watched:[1],total:12}]}],history:[{id:'a',action:'watched'}],preferences:{}},$:(id)=>({value:fields[id]||''}),STATUS:{watching:'Watching'},now:()=>new Date().toISOString(),tidyNums:x=>x,normalized:x=>x,count:()=>1,uuid:()=> 'new',save:()=>ok,notify:m=>messages.push(m),closeModal:m=>closed.push(m),render(){},renderHome(){},renderUpcoming(){},confirm:()=>true,normalizePreferences:x=>x||{},normalizeTVShows:()=>[],window:{ATTVUnified120:{migrate:a=>({anime:a})}},persistCache(){},clearCatalog(){},accountMode:'cloud',accountStatus:m=>messages.push(m),localStorage:{getItem:()=>null}};
 vm.createContext(c);return {c,messages,closed};
}
test('form edit rolls back on rejected storage, retains modal and never reports success',()=>{
 const {c,messages,closed}=realm(false),before=JSON.stringify(c.state);vm.runInContext(fn('saveForm'),c);c.saveForm({preventDefault(){}});
 assert.equal(JSON.stringify(c.state),before);assert.equal(closed.length,0);assert.equal(messages.length,0);
});
test('form edit commits and closes only after persistence succeeds',()=>{
 const {c,messages,closed}=realm(true);vm.runInContext(fn('saveForm'),c);c.saveForm({preventDefault(){}});
 assert.equal(c.state.anime[0].title,'Changed');assert.equal(closed.length,1);assert.match(messages[0],/sukses/);
});
test('failed deletion keeps title and activity history',()=>{
 const {c,messages,closed}=realm(false),before=JSON.stringify(c.state);vm.runInContext(fn('deleteAnime'),c);c.deleteAnime();
 assert.equal(JSON.stringify(c.state),before);assert.equal(messages.length,0);assert.equal(closed.length,0);
});
test('failed import retains original library and does not invalidate caches',async()=>{
 const {c,messages}=realm(false),before=c.state;let invalidated=false;c.persistCache=()=>{invalidated=true};vm.runInContext(fn('importData'),c);
 await c.importData({text:async()=>JSON.stringify({anime:[{id:'b'}],history:[]})});
 assert.equal(c.state,before);assert.equal(invalidated,false);assert.equal(messages.length,0);
});
test('record, import and cloud normalization preserve activity beyond 2000 events',async()=>{
 const {c}=realm(true);c.state.history=Array.from({length:2500},(_,i)=>({id:'a',episode:i+1,action:'watched',date:'2026-01-01'}));
 vm.runInContext(fn('record')+'\n'+fn('accountNormalizePayload')+'\n'+fn('importData'),c);
 c.record('a',2501,'watched');assert.equal(c.state.history.length,2501);assert.equal(c.state.history[0].episode,1);
 assert.equal(c.accountNormalizePayload(c.state).history.length,2501);
 await c.importData({text:async()=>JSON.stringify(c.state)});assert.equal(c.state.history.length,2501);
});
test('single stylesheet and offline shell use the generated cascade bundle',()=>{
 const path=require('node:path'),read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
 const html=read('index.html'),sw=read('sw.js');
 assert.equal((html.match(/rel="stylesheet"/g)||[]).length,1);assert.match(html,/href="\/assets\/styles.css"/);
 assert.match(sw,/'\/assets\/styles.css'/);assert.equal((sw.match(/'\/assets\/[^']+\.css'/g)||[]).length,1);
 const manifest=JSON.parse(read('scripts/styles-manifest.json')),bundle=read('assets/styles.css');let cursor=0;
 for(const file of manifest){const original=read(file),position=bundle.indexOf('/* Source: '+file+' */\n'+original,cursor);assert(position>=cursor,file);cursor=position+original.length;}
});
