import {htmlHelpers,avatarHelpers} from '../helpers/html.js';
import {test,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import {demonFixture,seq} from '../fixtures/franchise-137.js';
function load(){
 const ctx={window:{ATHTML:htmlHelpers,ATAvatar:avatarHelpers}};
 for(const file of ['franchise','provider-bridge','cloud-local','library-identity'])vm.runInNewContext(fs.readFileSync(new URL('../../src/modules/'+file+'.js',import.meta.url),'utf8'),ctx);
 return ctx.window;
}
const plain=value=>JSON.parse(JSON.stringify(value));
test('Demon Slayer four TV seasons become one complete anime card with films, correct split-arc progress and diary',()=>{
 const {payload}=demonFixture(),original=JSON.stringify(payload),api=load();
 const repaired=api.ATLibraryIdentity137.repair(payload);
 expect(repaired.changed).toBe(true);expect(repaired.payload.anime).toHaveLength(1);
 const anime=repaired.payload.anime[0],parts=anime.seasons;
 expect(parts).toHaveLength(7);expect(parts.filter(p=>p.format==='MOVIE')).toHaveLength(2);
 expect(plain(parts.find(p=>p.id==='al-129874').watched)).toEqual(seq(7));
 expect(plain(parts.find(p=>p.id==='al-142329').watched)).toEqual(seq(11));
 expect(parts.find(p=>p.id==='al-142329').episodes[0].number).toBe(1);
 expect(parts.find(p=>p.id==='al-142329').episodes[0].myNote).toContain('Entertainment District');
 expect(anime.notes).toContain('Shënimi nga TV');expect(anime.notes).toContain('Shënimi nga anime');
 expect(anime.providerIds).toContain('tvmaze:41469');expect(anime.mergedIds).toContain('tvmaze-demon');
 expect(plain(repaired.payload.preferences.customLists[0].animeIds)).toEqual(['anime-demon']);
 expect(repaired.payload.history).toHaveLength(2);expect(new Set(repaired.payload.history.map(x=>x.eventId)).size).toBe(2);
 expect(repaired.payload.history.every(x=>x.id==='anime-demon')).toBe(true);
 expect(JSON.stringify(payload)).toBe(original);
 expect(api.ATLibraryIdentity137.repair(repaired.payload).changed).toBe(false);
});
test('canonical provider copies merge transitively even with different names and retain ratings, hidden parts and rewatches',()=>{
 const api=load(),{anime}=demonFixture();
 const duplicate={id:'older-title',title:'Another official title',source:'MyAnimeList',sourceId:'47778',format:'TV',createdAt:'2025-01-01',seasons:[{id:'mal-47778',source:'MyAnimeList',sourceId:'47778',malId:'47778',format:'TV',total:11,watched:[4,5],myRating:9.5,hidden:true,arcRatings:[{id:'arc1',name:'Arc',start:1,end:11,rating:9}],episodes:[]}],rewatches:[{id:'rewatch1',episodes:[{seasonId:'mal-47778',number:5}]}]};
 const repaired=api.ATLibraryIdentity137.repair({anime:[duplicate,anime],history:[{id:duplicate.id,seasonId:'mal-47778',episode:5,action:'watched',date:'2025-01-01'}]});
 expect(repaired.payload.anime).toHaveLength(1);const target=repaired.payload.anime[0];
 const part=target.seasons.find(p=>p.id==='al-142329');expect(plain(part.watched)).toEqual([4,5]);expect(part.myRating).toBe(9.5);expect(part.hidden).toBe(true);expect(part.arcRatings).toHaveLength(1);
 expect(target.rewatches[0].episodes[0].seasonId).toBe('al-142329');expect(repaired.payload.history[0].seasonId).toBe('al-142329');
});
test('cloud conflict recovery does not resurrect an absorbed TV card and survives compact export/reload',()=>{
 const api=load(),{payload}=demonFixture(),clean=api.ATLibraryIdentity137.repair(payload).payload;
 const compact=api.ATCloudLocal12123.compact(clean);
 expect(compact.anime[0].providerIds).toContain('tvmaze:41469');expect(compact.anime[0].mergedIds).toContain('tvmaze-demon');
 const merged=api.ATCloudLocal12123.merge(payload,compact);
 expect(merged.anime).toHaveLength(1);expect(merged.anime[0].seasons.filter(p=>p.format==='MOVIE')).toHaveLength(2);
 expect(api.ATLibraryIdentity137.repair(merged).changed).toBe(false);
});
test('same-name live action titles, unrelated adaptations and unverified manual cards stay separate',()=>{
 const api=load();
 const anime={id:'monster-anime',title:'Monster',source:'AniList',sourceId:'19',format:'TV',year:2004,seasons:[{id:'al-19',source:'AniList',sourceId:'19',format:'TV',releaseStart:'2004-04-07',total:74,watched:[]}]};
 const tv={id:'monster-tv',title:'Monster',source:'TVMaze',sourceId:'123',format:'TV_SERIES',year:2022,seasons:[{id:'tv-123',source:'TVMaze',sourceId:'123',format:'TV',releaseStart:'2022-09-21',total:10,watched:[]}]};
 const alternate={...anime,id:'different-adaptation',sourceId:'999',seasons:[{...anime.seasons[0],id:'al-999',sourceId:'999'}]};
 const manual={id:'manual',title:'Monster',source:'',seasons:[{id:'manual-1',total:74,watched:[1]}]};
 expect(api.ATLibraryIdentity137.repair({anime:[anime,tv,alternate,manual]}).payload.anime).toHaveLength(4);
});
test('TV bulk undo, episode notes and rewatch references map through a split season without shifting films',()=>{
 const api=load(),{payload,tv}=demonFixture();
 payload.history=[{id:tv.id,seasonId:'tvmaze-41469-s2',episode:0,action:'season-unwatched',date:'2025-01-01'}];
 tv.rewatches=[{id:'tv-rewatch',episodes:[{seasonId:'tvmaze-41469-s2',number:8,diaryNote:'Rewatch'}]}];
 const result=api.ATLibraryIdentity137.repair(payload).payload;
 expect(result.history).toHaveLength(2);expect(result.history[0].episodes).toHaveLength(7);expect(result.history[1].episodes).toHaveLength(11);
 expect(result.anime[0].rewatches[0].episodes[0].seasonId).toBe('al-142329');expect(result.anime[0].rewatches[0].episodes[0].number).toBe(1);
 expect(result.anime[0].seasons.filter(p=>p.format==='MOVIE').every(p=>p.watched.length===1)).toBe(true);
});
test('a second canonical record is merged before cross-provider ambiguity is resolved',()=>{
 const api=load(),{payload,anime}=demonFixture();
 payload.anime.push({...JSON.parse(JSON.stringify(anime)),id:'copy-demon',createdAt:'2025-01-01'});
 const result=api.ATLibraryIdentity137.repair(payload);
 expect(result.payload.anime).toHaveLength(1);expect(result.removed).toHaveLength(2);
});
test('known unknown-count future parts and large full timelines survive identity repair',()=>{
 const api=load(),{payload,anime}=demonFixture();
 anime.seasons.push({id:'al-future',source:'AniList',sourceId:'9999',format:'TV',total:0,watched:[],releaseStatus:'NOT_YET_RELEASED',releaseStart:'2027-01-01'});
 for(let i=0;i<50;i++)anime.seasons.push({id:'al-extra'+i,source:'AniList',sourceId:String(100000+i),format:'SPECIAL',total:1,watched:[],releaseStart:'2026-01-01'});
 const result=api.ATLibraryIdentity137.repair(payload).payload.anime[0];
 expect(result.seasons).toHaveLength(58);expect(result.seasons.at(-1).id).toBe('al-future');expect(result.seasons.at(-1).watched).toHaveLength(0);
});
test('a failed save rolls back automatic identity repair and keeps the original card, history and active detail',()=>{
 const {payload}=demonFixture(),window=load(),original=JSON.stringify(payload);
 const source=fs.readFileSync(new URL('../../src/app.js',import.meta.url),'utf8');
 const transaction=source.slice(source.indexOf('function repairLibraryState()'),source.indexOf('function notify(message)'));
 let queued=0,writes=0;
 window.ATStorage1274={save(){writes++;return{ok:false}}};
 const ctx={window,state:payload,detailId:'tvmaze-demon',activeSeasonId:'tvmaze-41469-s2',episodePage:3,accountMode:'guest',accountUser:null,cloudRevision:null,cloudMirrorUnavailable:false,accountLocalSnapshot:v=>v,syncTotals(){},releasedCount:s=>s.total,localStorage:{},KEY:'test',notify(){},accountUI(){},accountQueueSave(){queued++},console};
 vm.runInNewContext(transaction,ctx);
 expect(ctx.save()).toBe(false);expect(writes).toBe(1);expect(queued).toBe(0);
 expect(JSON.stringify(ctx.state)).toBe(original);expect(ctx.detailId).toBe('tvmaze-demon');expect(ctx.activeSeasonId).toBe('tvmaze-41469-s2');expect(ctx.episodePage).toBe(3);
});
test('an old custom-list reference is repaired even when the duplicate card is already gone',()=>{
 const api=load(),{payload}=demonFixture();const clean=api.ATLibraryIdentity137.repair(payload).payload;
 clean.preferences.customLists[0].animeIds=['tvmaze-demon'];
 const result=api.ATLibraryIdentity137.repair(clean);
 expect(result.changed).toBe(true);expect(plain(result.payload.preferences.customLists[0].animeIds)).toEqual(['anime-demon']);
});
