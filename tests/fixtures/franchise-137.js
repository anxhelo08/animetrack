export const seq=n=>Array.from({length:n},(_,i)=>i+1);
export function demonFixture(){
 const dates=['2019-04-06','2021-10-10','2023-04-09','2024-05-12'];
 const tv={id:'tvmaze-demon',title:'Demon Slayer',source:'TVMaze',sourceId:'41469',format:'TV_SERIES',year:2019,genre:'Action, Anime, Fantasy',status:'watching',notes:'Shënimi nga TV',createdAt:'2024-01-01',seasons:[26,18,11,8].map((total,i)=>({id:'tvmaze-41469-s'+(i+1),source:'TVMaze',sourceId:'41469',format:'TV_SERIES',imdbSeasonNumber:i+1,title:'Sezoni '+(i+1),subtitle:'Demon Slayer',total,watched:i===1?seq(18):i===2?[1,2,3]:[],releaseStart:dates[i],releaseStatus:'FINISHED',episodes:i===1?[{number:8,myNote:'Fillimi i Entertainment District',personalRating:9}]:[]}))};
 const rows=[
  ['101922','38000','TV',26,'2019-04-06','Demon Slayer: Kimetsu no Yaiba'],
  ['112151','40456','MOVIE',1,'2020-10-16','Demon Slayer: Mugen Train'],
  ['129874','49926','TV',7,'2021-10-10','Demon Slayer: Mugen Train Arc'],
  ['142329','47778','TV',11,'2021-12-05','Demon Slayer: Entertainment District Arc'],
  ['145139','51019','TV',11,'2023-04-09','Demon Slayer: Swordsmith Village Arc'],
  ['166240','55701','TV',8,'2024-05-12','Demon Slayer: Hashira Training Arc'],
  ['178788','59062','MOVIE',1,'2025-07-18','Demon Slayer: Infinity Castle']
 ];
 const anime={id:'anime-demon',title:'Kimetsu no Yaiba',source:'AniList',sourceId:'101922',malId:'38000',format:'TV',year:2019,genre:'Action, Fantasy',status:'watching',notes:'Shënimi nga anime',hydrated:true,franchiseVersion:'13.1.0',createdAt:'2023-01-01',seasons:rows.map(([id,mal,format,total,releaseStart,subtitle])=>({id:'al-'+id,source:'AniList',sourceId:id,malId:mal,format,total,releaseStart,subtitle,aliases:[subtitle],watched:format==='MOVIE'?[1]:[],releaseStatus:'FINISHED',episodes:[]}))};
 return {tv,anime,payload:{anime:[tv,anime],history:[{eventId:'bulk-1',id:tv.id,seasonId:'tvmaze-41469-s2',episode:0,episodes:seq(18),action:'season-watched',date:'2025-08-01T20:00:00Z'}],preferences:{customLists:[{id:'list-favorite',title:'Më të mirat',animeIds:[tv.id,anime.id]}]}}};
}
