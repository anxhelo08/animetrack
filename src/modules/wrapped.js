/* AnimeTrack 12.9 — private Wrapped & achievements, derived from the existing library.
   No persistent badge state, extra storage keys, cross-account analytics, or remote requests. */
window.ATWrapped129=(()=>{
 const DAY=86400000;
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=n=>Math.max(0,Number(n)||0).toLocaleString('sq-AL');
 const kind=a=>String(a?.source||'').toLowerCase()==='tvmaze'||a?.format==='TV_SERIES'||String(a?.id||'').startsWith('tvmaze-')?'tv':'anime';
 const keyDay=ms=>{const d=new Date(ms);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
 const keyMonth=ms=>keyDay(ms).slice(0,7);
 const dayTime=key=>Date.parse(key+'T00:00:00Z'); // civil-day ordinal, unaffected by DST
 const top=(map,n)=>[...map].sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0]))).slice(0,n);
 const periodStart=(period,now)=>period==='month'?new Date(now.getFullYear(),now.getMonth(),1).getTime():period==='year'?new Date(now.getFullYear(),0,1).getTime():0;
 const scopeTitle=scope=>scope==='tv'?'Seriale TV':scope==='anime'?'Anime dhe filma':'Anime + seriale';
 const defs=[
  ['first','✦','Hapi i parë','Shëno episodin e parë',1,'marked'],
  ['ten','⚡','Nxehja','10 episode në bibliotekë',10,'marked'],
  ['fifty','◈','Maratonist','50 episode në bibliotekë',50,'marked'],
  ['hundred','🏅','Njëqind','100 episode në bibliotekë',100,'marked'],
  ['twofifty','🏆','Legjendë e re','250 episode në bibliotekë',250,'marked'],
  ['fivehundred','👑','Koleksionist','500 episode në bibliotekë',500,'marked'],
  ['thousand','✧','Universi yt','1 000 episode në bibliotekë',1000,'marked'],
  ['finish1','✓','Fundi i parë','Përfundo 1 titull',1,'completed'],
  ['finish5','🎬','Finalet','Përfundo 5 tituj',5,'completed'],
  ['finish10','◆','Mjeshtër i finaleve','Përfundo 10 tituj',10,'completed'],
  ['finish25','♛','Arkivist','Përfundo 25 tituj',25,'completed'],
  ['titles5','▣','Eksplorues','Shiko episode nga 5 tituj',5,'titles'],
  ['titles10','◉','Horizonte të reja','Shiko episode nga 10 tituj',10,'titles'],
  ['genres3','◇','Shije të ndryshme','Shiko 3 zhanre të ndryshme',3,'genres'],
  ['genres5','✺','Pa kufij','Shiko 5 zhanre të ndryshme',5,'genres'],
  ['genres10','🌌','Multivers','Shiko 10 zhanre të ndryshme',10,'genres'],
  ['day5','🔥','Ditë intensive','Shëno 5 episode në një ditë',5,'peak'],
  ['day10','⚡','Binge 10','Shëno 10 episode në një ditë',10,'peak'],
  ['day20','🚀','Supermaratonë','Shëno 20 episode në një ditë',20,'peak'],
  ['streak3','◷','Ritëm i mirë','3 ditë rresht me episode',3,'streak'],
  ['streak7','🗓','Java e plotë','7 ditë rresht me episode',7,'streak'],
  ['streak30','💎','Konsekuencë','30 ditë rresht me episode',30,'streak'],
  ['week25','★','Java intensive','25 episode në një javë',25,'week'],
  ['month50','☾','Muaji yt','50 episode në një muaj',50,'month']
 ];
 function analyze({state={},events=[],genres=()=>[],isMovie=()=>false,period='month',scope='all',now=new Date()}={}){
  const time=now instanceof Date?now:new Date(now),end=time.getTime(),start=periodStart(period,time);
  const anime=Array.isArray(state.anime)?state.anime:[],byId=new Map(anime.map(a=>[a.id,a]));
  const all=(Array.isArray(events)?events:[]).filter(e=>e&&Number.isFinite(Number(e.at))&&e.at<=end&&byId.has(e.id));
  const selected=all.filter(e=>scope==='all'||kind(byId.get(e.id))===scope),current=selected.filter(e=>e.at>=start);
  const totalMarked=anime.reduce((v,a)=>v+(a.seasons||[]).reduce((n,s)=>n+(Array.isArray(s.watched)?s.watched.length:0),0),0);
  const completed=anime.filter(a=>a.status==='completed').length;
  const titleEvents=new Map(),genreEvents=new Map(),daily=new Map(),recentDaily=new Map(),monthly=new Map(),weekday=Array(7).fill(0),typeCounts={anime:0,tv:0},days=new Map(),allGenres=new Set(),allTitles=new Set(),weeks=new Map(),months=new Map();
  const addGenre=(ev,map,set)=>{const entry=byId.get(ev.id);let list=[];try{list=genres(entry)||[]}catch{}for(const g of list){const text=String(g||'').trim();if(!text)continue;map.set(text,(map.get(text)||0)+1);if(set)set.add(text.toLocaleLowerCase())}};
  for(const e of all){
   const day=keyDay(e.at),month=keyMonth(e.at),d=new Date(e.at),dow=(d.getDay()+6)%7,weekDay=new Date(d.getFullYear(),d.getMonth(),d.getDate()-(d.getDay()+6)%7).getTime(),week=keyDay(weekDay);
   days.set(day,(days.get(day)||0)+1);weeks.set(week,(weeks.get(week)||0)+1);months.set(month,(months.get(month)||0)+1);allTitles.add(e.id);addGenre(e,new Map(),allGenres);
  }
  for(const e of current){
   const a=byId.get(e.id),day=keyDay(e.at),month=keyMonth(e.at),dow=(new Date(e.at).getDay()+6)%7;
   titleEvents.set(e.id,(titleEvents.get(e.id)||0)+1);daily.set(day,(daily.get(day)||0)+1);recentDaily.set(day,(recentDaily.get(day)||0)+1);monthly.set(month,(monthly.get(month)||0)+1);weekday[dow]++;typeCounts[kind(a)]++;
   addGenre(e,genreEvents);
  }
  function streak(source){
   const keys=[...source.keys()].sort();let longest=0,run=0,previous=0;
   for(const key of keys){const stamp=dayTime(key);run=previous&&stamp-previous===DAY?run+1:1;longest=Math.max(longest,run);previous=stamp}
   const today=keyDay(end),yesterday=keyDay(end-DAY),last=keys.at(-1);
   return {longest,active:last===today||last===yesterday?run:0};
  }
  const lifetimeStreak=streak(days),visibleStreak=streak(daily);
  const peak=top(days,1)[0]||['',0],maxWeek=top(weeks,1)[0]?.[1]||0,maxMonth=top(months,1)[0]?.[1]||0;
  const metric={marked:totalMarked,completed,titles:allTitles.size,genres:allGenres.size,peak:peak[1],streak:lifetimeStreak.longest,week:maxWeek,month:maxMonth};
  const badges=defs.map(([id,icon,name,description,target,measure])=>({id,icon,name,description,target,measure,value:Math.max(0,metric[measure]||0),unlocked:(metric[measure]||0)>=target}));
  const unlocked=badges.filter(b=>b.unlocked);
  const minutes=current.reduce((v,e)=>{const a=byId.get(e.id);return v+(isMovie(a)?100:kind(a)==='tv'?45:24)},0);
  const previous14=Array.from({length:14},(_,i)=>{const when=new Date(time.getFullYear(),time.getMonth(),time.getDate()-(13-i)).getTime();return {day:keyDay(when),count:recentDaily.get(keyDay(when))||0}});
  const range=period==='month'?time.toLocaleDateString('sq-AL',{month:'long',year:'numeric'}):period==='year'?String(time.getFullYear()):'Nga historiku i ruajtur';
  const names=['Hënë','Martë','Mërkurë','Enjte','Premte','Shtunë','Diel'];
  return {period,scope,range,scopeLabel:scopeTitle(scope),events:current.length,allEvents:all.length,minutes,completed,totalMarked,
   titleCount:titleEvents.size,genreCount:genreEvents.size,days:daily.size,peak:top(daily,1)[0]||['',0],lifetimePeak:peak,weekday:names.map((label,i)=>({label,count:weekday[i]})),
   top:top(titleEvents,5).map(([id,count])=>({id,title:byId.get(id)?.title||'Titull',count,kind:kind(byId.get(id))})),
   genres:top(genreEvents,6).map(([label,count])=>({label,count})),daily14:previous14,monthly:top(monthly,12),
   longestStreak:visibleStreak.longest,activeStreak:visibleStreak.active,lifetimeLongestStreak:lifetimeStreak.longest,allTitles:allTitles.size,badges,unlocked,media:typeCounts,
   hasHistory:all.length>0,earliest:all.reduce((n,e)=>Math.min(n,e.at),Infinity),recordNote:'Vetëm historiku i datuar; importet pa datë nuk numërohen si ditë shikimi.'};
 }
 function render(report,{badgeFilter='all'}={}){
  const r=report,num=fmt(r.events),unlocked=r.unlocked.length,maximum=Math.max(1,...r.daily14.map(x=>x.count)),maxGenre=Math.max(1,...r.genres.map(x=>x.count)),
  visible=r.badges.filter(b=>badgeFilter==='all'||(badgeFilter==='unlocked'?b.unlocked:!b.unlocked));
  const stat=(icon,value,label)=>'<div class="at129-stat"><span aria-hidden="true">'+icon+'</span><strong>'+esc(value)+'</strong><small>'+esc(label)+'</small></div>';
  const best=r.peak[1]?new Date(r.peak[0]+'T12:00:00').toLocaleDateString('sq-AL',{day:'numeric',month:'short'}):'—';
  return '<section class="at129-wrapped" aria-label="Anime Wrapped dhe arritjet">'+
   '<div class="at129-hero"><div class="at129-stars" aria-hidden="true">✦ ✧ ✦</div><span class="at129-kicker">ANIMETRACK • THE STORY SO FAR</span><h2>Historia jote.<br><em>Në numra.</em></h2><p>Një kapitull i ri për çdo episod që shënon. Statistika dhe arritje private nga biblioteka jote.</p><div class="at129-hero-bottom"><span>'+esc(r.range)+' · '+esc(r.scopeLabel)+'</span><span>✦ WRAPPED</span></div></div>'+
   '<div class="at129-toolbar"><div class="at129-switch" role="group" aria-label="Periudha e Wrapped">'+[['month','Ky muaj'],['year','Ky vit'],['all','Gjithë historiku']].map(([id,label])=>'<button type="button" data-pro-action="wrapped-'+id+'" aria-pressed="'+(r.period===id)+'" class="'+(r.period===id?'active':'')+'">'+label+'</button>').join('')+'</div><div class="at129-switch" role="group" aria-label="Lloji i titullit">'+[['all','Gjithçka'],['anime','Anime'],['tv','Seriale']].map(([id,label])=>'<button type="button" data-pro-action="wrapped-scope" data-id="'+id+'" aria-pressed="'+(r.scope===id)+'" class="'+(r.scope===id?'active':'')+'">'+label+'</button>').join('')+'</div></div>'+
   '<div id="pro-wrapped-card" class="at129-story"><div class="at129-number"><small>EPISODE TË SHËNUARA</small><strong>'+num+'</strong><span>'+esc(r.range)+'</span></div><div class="at129-stats">'+
    stat('◷',(r.minutes/60).toLocaleString('sq-AL',{maximumFractionDigits:1})+' h','kohë e përafërt')+
    stat('◈',fmt(r.titleCount),'tituj të ndjekur')+
    stat('☼',fmt(r.days),'ditë me aktivitet')+
    stat('✧',fmt(r.genreCount),'zhanre në këtë periudhë')+'</div>'+
    '<div class="at129-split"><section class="at129-panel"><span class="at129-eyebrow">RITMI YT</span><h3>14 ditët e fundit</h3><div class="at129-heat" aria-label="Episode të shënuara në 14 ditët e fundit">'+r.daily14.map(x=>'<div class="at129-heat-col" title="'+esc(x.day+': '+x.count+' episode')+'"><div class="at129-heat-fill" style="height:'+Math.max(5,Math.round(x.count/maximum*100))+'%;opacity:'+(x.count?1:0.18)+'"></div><small>'+esc(x.day.slice(8))+'</small></div>').join('')+'</div><div class="at129-facts"><div><span>Dita më aktive</span><b>'+esc(best)+' · '+fmt(r.peak[1])+' ep.</b></div><div><span>Seria e ditëve rresht</span><b>'+fmt(r.activeStreak)+' tani · '+fmt(r.longestStreak)+' rekord</b></div></div></section>'+
    '<section class="at129-panel"><span class="at129-eyebrow">TOP STORIES</span><h3>Titujt që ndoqe më shumë</h3><div class="at129-top">'+(r.top.map((x,i)=>'<div class="at129-top-item"><span class="at129-rank">'+String(i+1).padStart(2,'0')+'</span><div><b>'+esc(x.title)+'</b><small>'+esc(x.kind==='tv'?'Serial':'Anime / film')+'</small></div><strong>'+fmt(x.count)+' <small>ep.</small></strong></div>').join('')||'<p class="at129-empty">Shëno episodin e parë për të nisur historinë.</p>')+'</div></section></div>'+
    '<div class="at129-split"><section class="at129-panel"><span class="at129-eyebrow">PREFERENCAT</span><h3>Zhanret e tua</h3>'+(r.genres.length?r.genres.map(x=>'<div class="at129-genre"><div><span>'+esc(x.label)+'</span><b>'+fmt(x.count)+'</b></div><i><span style="width:'+Math.round(x.count/maxGenre*100)+'%"></span></i></div>').join(''):'<p class="at129-empty">Nuk ka zhanre të regjistruara për këtë periudhë.</p>')+'</section>'+
    '<section class="at129-panel"><span class="at129-eyebrow">NJË JAVË NË SHIFRA</span><h3>Kur shënon më shumë episode?</h3><div class="at129-weekdays">'+r.weekday.map(x=>'<div><span>'+esc(x.label.slice(0,3))+'</span><b>'+fmt(x.count)+'</b></div>').join('')+'</div><div class="at129-facts"><div><span>Anime / filma</span><b>'+fmt(r.media.anime)+' ep.</b></div><div><span>Seriale TV</span><b>'+fmt(r.media.tv)+' ep.</b></div></div></section></div>'+
    '</div>'+
    '<section class="at129-achievements" id="at129-achievements"><header><div><span class="at129-eyebrow">YOUR TROPHY ROOM</span><h2>Arritjet e tua <span aria-hidden="true">✦</span></h2><p>Arritje të përhershme nga gjithë biblioteka jote — nuk ndryshojnë kur filtron muajin apo llojin e titullit.</p></div><div class="at129-achievement-count"><strong>'+unlocked+'<small> / '+r.badges.length+'</small></strong><span>të zhbllokuara</span></div></header>'+
    '<div class="at129-badge-toolbar" role="group" aria-label="Filtro arritjet">'+[['all','Të gjitha'],['unlocked','Të fituara'],['locked','Për t’u fituar']].map(([id,label])=>'<button type="button" data-pro-action="wrapped-badges" data-id="'+id+'" aria-pressed="'+(badgeFilter===id)+'" class="'+(badgeFilter===id?'active':'')+'">'+label+'</button>').join('')+'</div>'+
    '<div class="at129-badge-grid">'+visible.map(b=>'<article class="at129-badge '+(b.unlocked?'earned':'locked')+'" aria-label="'+esc(b.name+(b.unlocked?', e fituar':', ende jo'))+'"><div class="at129-badge-icon" aria-hidden="true">'+b.icon+'</div><div class="at129-badge-body"><strong>'+esc(b.name)+'</strong><small>'+esc(b.description)+'</small><div class="at129-progress"><i style="width:'+Math.min(100,Math.round(b.value/b.target*100))+'%"></i></div><span>'+(b.unlocked?'✓ E FITUAR':fmt(Math.min(b.value,b.target))+' / '+fmt(b.target))+'</span></div></article>').join('')+'</div>'+
    '<p class="at129-disclaimer">Episode në bibliotekë dhe tituj të përfunduar maten nga gjendja aktuale. Rekordet ditore, javore dhe streak-u përdorin vetëm shënime me datë; importet pa datë nuk krijojnë arritje kohore. Kohëzgjatja është vlerësim, jo kohë e matur.</p></section>'+
    '<div class="at129-share"><div><strong>Kjo është historia jote.</strong><small>Shkarko kartën ose kopjo përmbledhjen. Asgjë nuk publikohet automatikisht.</small></div><div><button type="button" class="pro-btn primary" data-pro-action="wrapped-image">↓ Ruaj kartën PNG</button><button type="button" class="pro-btn" data-pro-action="wrapped-copy">Kopjo statistikat</button></div></div></section>';
 }
 function mini(report){
  const icons=report.unlocked.slice(-6).reverse();
  return '<section class="at129-profile-preview"><div><span class="at129-eyebrow">TROPHY ROOM</span><h3>Arritjet e mia</h3><p>'+fmt(report.unlocked.length)+' nga '+fmt(report.badges.length)+' ikona të fituara</p></div><div class="at129-mini-icons">'+(icons.length?icons.map(x=>'<span title="'+esc(x.name)+'" aria-label="'+esc(x.name)+'">'+x.icon+'</span>').join(''):'<span aria-label="Fillimi i aventurës">✦</span>')+'</div><button type="button" data-pro-page="wrapped">Shiko Wrapped & arritjet ↗</button></section>';
 }
 function copyText(r){
  return ['AnimeTrack Wrapped · '+r.range+' · '+r.scopeLabel,'Episode të shënuara: '+r.events,'Kohë e përafërt: '+(r.minutes/60).toFixed(1)+' orë','Tituj: '+r.titleCount,'Ditë aktive: '+r.days,'Rekordi ditor: '+r.peak[1],'Seria më e gjatë: '+r.longestStreak+' ditë','Arritje: '+r.unlocked.length+'/'+r.badges.length,'Top titujt: '+r.top.map(x=>x.title+' ('+x.count+')').join(', '),'Shifrat janë nga historiku personal i datuar.'].join('\n');
 }
 function drawShare(canvas,r){
  const g=canvas.getContext('2d');if(!g)return false;
  const W=1080,H=1350;canvas.width=W;canvas.height=H;
  const gradient=g.createLinearGradient(0,0,W,H);gradient.addColorStop(0,'#1e173b');gradient.addColorStop(.53,'#241c3e');gradient.addColorStop(1,'#0b2533');g.fillStyle=gradient;g.fillRect(0,0,W,H);
  g.fillStyle='#7750c8';g.beginPath();g.arc(1000,80,350,0,Math.PI*2);g.fill();g.fillStyle='#122d48';g.beginPath();g.arc(-120,1260,330,0,Math.PI*2);g.fill();
  g.fillStyle='#d0b9ff';g.font='bold 26px system-ui';g.fillText('✦ ANIMETRACK · WRAPPED',66,92);
  g.fillStyle='#fff';g.font='bold 75px system-ui';g.fillText('Historia jote.',66,190);
  g.fillStyle='#c7aaff';g.font='bold 74px system-ui';g.fillText('Në numra.',66,270);
  g.fillStyle='#d5c8ef';g.font='29px system-ui';g.fillText((r.range+' · '+r.scopeLabel).slice(0,54),66,326);
  g.fillStyle='#f7f4ff';g.font='bold 225px system-ui';g.fillText(String(r.events),60,555);
  g.font='bold 25px system-ui';g.fillStyle='#c9b5e8';g.fillText('EPISODE TË SHËNUARA',74,610);
  g.fillStyle='#ab85ee';g.fillRect(68,644,940,3);
  const cards=[[(r.minutes/60).toFixed(1)+' h','Kohë e përafërt'],[String(r.titleCount),'Tituj'],[String(r.days),'Ditë aktive']];
  cards.forEach(([v,label],i)=>{const x=69+i*315;g.fillStyle='#ffffff16';g.fillRect(x,678,293,139);g.fillStyle='#fff';g.font='bold 51px system-ui';g.fillText(v,x+19,742);g.fillStyle='#c4b5d9';g.font='20px system-ui';g.fillText(label,x+20,779)});
  g.fillStyle='#cbb4fa';g.font='bold 25px system-ui';g.fillText('TOP STORIES',70,893);
  r.top.slice(0,3).forEach((x,i)=>{g.fillStyle='#e8e2f7';g.font='bold 27px system-ui';g.fillText((i+1)+'. '+x.title.slice(0,31),72,946+i*64);g.font='24px system-ui';g.fillStyle='#b6a3ce';g.fillText(x.count+' ep.',895,946+i*64)});
  g.fillStyle='#ccb4fc';g.font='bold 25px system-ui';g.fillText('ARRITJE · '+r.unlocked.length+'/'+r.badges.length,70,1193);
  g.fillStyle='#fff';g.font='33px system-ui';g.fillText(r.unlocked.slice(-5).map(x=>x.icon).join('  ')||'✦',70,1245);
  g.fillStyle='#ad9cc6';g.font='18px system-ui';g.fillText('Nga historiku personal · nuk publikohet automatikisht',70,1306);
  return true;
 }
 return {analyze,render,mini,copyText,drawShare,kind,keyDay};
})();
