import {test} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
import {fileURLToPath} from 'node:url';
const __filename=fileURLToPath(import.meta.url),__dirname=require('node:path').dirname(__filename);
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ctx={window:{},String,Number,Set,Array};vm.runInNewContext(read('src/modules/franchise.js'),ctx);const f=ctx.window.ATFranchise1212;

test('anime franchise timeline supports TV, films, OVA and specials but not unrelated media formats',()=>{
 for(const fmt of ['TV','TV_SHORT','ONA','OVA','MOVIE','SPECIAL','Movie','TV Special'])assert.equal(f.supportedAnimePart(fmt),true,fmt);
 for(const fmt of ['MANGA','MUSIC','NOVEL'])assert.equal(f.supportedAnimePart(fmt),false,fmt);
 assert.equal(f.mainRelation('PREQUEL'),true);assert.equal(f.mainRelation('SEQUEL'),true);assert.equal(f.mainRelation('ALTERNATIVE'),true);assert.equal(f.mainRelation('SUMMARY'),true);assert.equal(f.mainRelation('COMPILATION'),true);assert.equal(f.mainRelation('SIDE_STORY'),false);assert.equal(f.mainRelation('SPIN_OFF'),false);
});



test('12.15.3 alternate English and romaji franchise names share stable family keys',()=>{
 const english=Array.from(f.familyTitleKeys(['Demon Slayer: Kimetsu no Yaiba']));
 const romaji=Array.from(f.familyTitleKeys(['Kimetsu no Yaiba']));
 assert.ok(english.includes('demon slayer'));
 assert.ok(english.includes('demon slayer kimetsu no yaiba'));
 assert.ok(romaji.includes('kimetsu no yaiba'));
 assert.ok(Array.from(f.familyTitleKeys(['One Piece Film: Red'])).includes('one piece'));
});

test('JJK-style movie sits between seasons by real release date and does not steal season numbering',()=>{
 const parts=[
  {id:'s2',format:'TV',releaseStart:'2023-07-06',subtitle:'Jujutsu Kaisen 2nd Season',sourceId:'2'},
  {id:'movie',format:'MOVIE',releaseStart:'2021-12-24',subtitle:'Jujutsu Kaisen 0',sourceId:'3'},
  {id:'s1',format:'TV',releaseStart:'2020-10-03',subtitle:'Jujutsu Kaisen',sourceId:'1'}
 ];
 const rows=f.labels(parts);
 assert.deepEqual(Array.from(rows,r=>r.part.id),['s1','movie','s2']);
 assert.deepEqual(Array.from(rows,r=>r.title),['Sezoni 1','Film','Sezoni 2']);
});

test('multiple Demon-Slayer-style films receive stable film labels inside the release timeline',()=>{
 const rows=f.labels([
  {id:'tv1',format:'TV',releaseStart:'2019-04-06'},
  {id:'m1',format:'MOVIE',releaseStart:'2020-10-16'},
  {id:'tv2',format:'TV',releaseStart:'2021-10-10'},
  {id:'m2',format:'MOVIE',releaseStart:'2025-07-18'}
 ]);
 assert.deepEqual(Array.from(rows,r=>r.title),['Sezoni 1','Film 1','Sezoni 2','Film 2']);
});

test('TV family grouping is generic instead of hard-coded to Dexter',()=>{
 assert.equal(f.tvFamilyKey('Dexter'),'dexter');
 assert.equal(f.tvFamilyKey('Dexter: New Blood'),'dexter');
 assert.equal(f.tvFamilyKey('Dexter: Original Sin'),'dexter');
 assert.equal(f.tvFamilyName('dexter',[{title:'Dexter: New Blood'},{title:'Dexter'}]),'Dexter');
 assert.equal(f.tvFamilyKey('The Mentalist'),'the mentalist');
});

test('12.12 integration exposes one update action and caches the new helper',()=>{
 const app=read('src/app.js'),tv=read('src/modules/tv.js'),html=read('index.html'),main=read('src/main.js'),sw=read('src/sw.js'),pkg=JSON.parse(read('package.json'));
 assert.doesNotThrow(()=>new vm.Script(app));assert.doesNotThrow(()=>new vm.Script(tv));
 assert.match(app,/isFranchiseFormat/);assert.match(app,/strictSeriesOverlap/);assert.match(app,/franchiseTitleKeys/);assert.match(app,/FRANCHISE_SCHEMA='13\.1\.0'/);assert.match(app,/Përditëso serinë/);assert.match(app,/Rendi kronologjik/);
 assert.doesNotMatch(app,/Ndarja si serial \(TV\)/);
 assert.match(tv,/function refreshShow/);assert.match(tv,/SERIA E PLOTË/);assert.doesNotMatch(tv,/dexterTitles/);
 assert.match(main,/modules\/franchise\.js/);assert.match(html,/AnimeTrack 13\.5\.2/);
 assert.match(sw,/precacheAndRoute\\(self\\.__WB_MANIFEST/);assert.match(sw,/pathname\.startsWith\('\/assets\/'\)/);
 assert.equal(pkg.version,'13.6.0');
});
