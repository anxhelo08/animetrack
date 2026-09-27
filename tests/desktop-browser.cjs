const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const fixture={
  anime:Array.from({length:8},(_,i)=>({
   id:'demo'+i,title:i===7?'Mystery Series 7':'Series '+i,genre:i===7?'Mystery':'Action',status:'watching',
   total:12,watched:[1,2],cover:'',updatedAt:new Date().toISOString(),
   seasons:[{id:'season'+i,title:'Season 1',total:12,watched:[1,2],episodes:[{number:4,title:'Future demo episode',airedAt:new Date(Date.now()+90*60000).toISOString()}],releaseStatus:'FINISHED'}]
  })),history:[],preferences:{weeklyGoal:10,notificationRead:[]}
 };
 const stub='(()=>{const payload='+JSON.stringify(fixture)+';const chain=table=>{const q={};for(const name of ["select","eq","order","limit","in","not","or","insert","upsert","update","delete","range","neq","gte","lte","contains"])q[name]=()=>q;q.maybeSingle=async()=>({data:table==="anime_libraries"?{payload,updated_at:new Date().toISOString()}:null,error:null});q.single=q.maybeSingle;q.then=(yes,no)=>Promise.resolve({data:[],error:null}).then(yes,no);return q;};window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:"desktop-demo",email:"demo@example.com"}}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:chain,rpc:()=>chain("rpc")})};})();';
 await page.route('**/cdn.jsdelivr.net/npm/@supabase/supabase-js@2*',route=>route.fulfill({status:200,contentType:'application/javascript',body:stub}));
 const seasonalMedia=[
  {id:12801,idMal:12801,title:{romaji:'Parallel World',english:'Parallel World'},episodes:12,averageScore:83,format:'TV',genres:['Action','Fantasy'],description:'A new world.',coverImage:{large:''},siteUrl:'https://anilist.co/anime/12801',seasonYear:2026,startDate:{year:2026,month:9,day:3},tags:[{name:'Isekai',rank:95,isMediaSpoiler:false,isGeneralSpoiler:false}]},
  {id:12802,idMal:12802,title:{romaji:'Hidden Truth',english:'Hidden Truth'},episodes:12,averageScore:81,format:'TV',genres:['Drama','Mystery'],description:'A mystery.',coverImage:{large:''},siteUrl:'https://anilist.co/anime/12802',seasonYear:2026,startDate:{year:2026,month:9,day:3},tags:[{name:'Thriller',rank:86,isMediaSpoiler:false,isGeneralSpoiler:false},{name:'Secret culprit',rank:100,isMediaSpoiler:true,isGeneralSpoiler:false}]},
  {id:12803,idMal:12803,title:{romaji:'Sweet Days',english:'Sweet Days'},episodes:1,averageScore:75,format:'MOVIE',genres:['Romance','Slice of Life'],description:'A romance.',coverImage:{large:''},siteUrl:'https://anilist.co/anime/12803',seasonYear:2026,startDate:{year:2026,month:9,day:5},tags:[]}
 ];
 await page.route('https://graphql.anilist.co',route=>{const query=String(route.request().postDataJSON()?.query||'');const media=query.includes('$season:MediaSeason')?seasonalMedia:[];return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:{Page:{media,pageInfo:{hasNextPage:false}}}})});});
 await page.route('https://api.tvmaze.com/search/shows?q=*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{score:1,show:{id:777,name:'Dexter',premiered:'2006-10-01',genres:['Drama'],image:null,url:'https://www.tvmaze.com/shows/777/dexter'}}])}));
 await page.route('https://api.tvmaze.com/shows/777',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:777,name:'Dexter',premiered:'2006-10-01',genres:['Drama'],image:null,url:'https://www.tvmaze.com/shows/777/dexter'})}));
 await page.route('https://api.tvmaze.com/shows/777/episodes?specials=1',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{id:7771,season:1,number:1,name:'Dexter',airdate:'2006-10-01',runtime:55}])}));
 await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
 await page.locator('#at-home-lineup .at-h2-lineup-card').first().waitFor();
 assert.equal(await page.locator('#at-home-lineup .at-h2-lineup-card').count(),6);
 await page.keyboard.press('Control+k');
 assert(await page.locator('#at124-command').isVisible(),'Ctrl K opens command search');
 await page.locator('#at124-command-input').fill('Mystery Series 7');
 assert.match(await page.locator('#at124-command-results').innerText(),/Mystery Series 7/);
 await page.keyboard.press('Enter');
 assert(await page.locator('#detail-modal').isVisible(),'Enter opens the selected library title');
 await page.locator('#detail-modal [data-close="detail-modal"]').first().click();
 assert(await page.locator('#at124-command').isHidden(),'Command palette closes after selection');
 console.log('COMMAND_DESKTOP_PASS');
 // 12.8 seasonal catalog: real genre tags, source-backed filters and normal add actions.
 await page.locator('#seasons-nav').click();
 await page.locator('#season-catalog-grid .seasonal-tile').first().waitFor({timeout:10000});
 assert.equal(await page.locator('#season-catalog-grid .seasonal-tile').count(),3);
 await page.locator('[data-at128-genre="Thriller"]').click();
 assert.equal(await page.locator('#season-catalog-grid .seasonal-tile').count(),1);
 assert.match(await page.locator('#season-catalog-grid').innerText(),/Hidden Truth/);
 assert.doesNotMatch(await page.locator('#season-catalog-grid').innerText(),/Parallel World/);
 await page.locator('[data-at128-genre="Isekai"]').click();
 assert.match(await page.locator('#season-catalog-grid').innerText(),/Parallel World/);
 assert.equal(await page.locator('#season-catalog-grid .seasonal-tile').count(),1);
 await page.locator('[data-at128-genre="all"]').click();
 await page.locator('#season-genre-search').fill('Sweet Days');
 assert.equal(await page.locator('#season-catalog-grid .seasonal-tile').count(),1);
 await page.locator('#season-filter-reset').click();
 assert.equal(await page.locator('#season-catalog-grid .seasonal-tile').count(),3);
 assert.equal(await page.locator('[data-at128-genre="all"]').getAttribute('aria-pressed'),'true');
 await page.locator('#home-nav').click();
 console.log('SEASONAL_DESKTOP_PASS',JSON.stringify({results:3,genres:['Thriller','Isekai'],reset:true}));

 assert(await page.locator('#at-iphone-feed').isHidden(),'Phone feed must not replace PC Home');
 await page.locator('[data-home-action="more-watching"]').click();
 assert.equal(await page.locator('#at-home-lineup .at-h2-lineup-card').count(),8);
 await page.locator('#at-pc-watch-search').fill('Mystery');
 await page.waitForFunction(()=>document.querySelectorAll('#at-home-lineup .at-h2-lineup-card').length===1,null,{timeout:15000}).catch(async err=>{console.error('DESKTOP_SEARCH_DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>({query:document.querySelector('#at-pc-watch-search')?.value,cards:[...document.querySelectorAll('#at-home-lineup .at-h2-lineup-card')].map(x=>x.innerText.slice(0,80)),view:document.querySelector('#home-view')?.className}))));throw err});
 assert.equal(await page.locator('#at-home-lineup .at-h2-lineup-card').count(),1);
 assert.match(await page.locator('#at-home-lineup').innerText(),/Mystery Series 7/);
 assert.equal(await page.locator('#at-pc-watch-search').inputValue(),'Mystery');
 await page.locator('[data-home-action="advance-next"][data-id="demo7"]').click();
 assert.match(await page.locator('#at-home-lineup').innerText(),/S1 · EP 4/);
 await page.locator('[data-home-action="undo-watch"]').click();
 assert.match(await page.locator('#at-home-lineup').innerText(),/S1 · EP 3/);
 await page.evaluate(()=>{window.__atOriginalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(String(k).startsWith('animetrack_user_'))throw new DOMException('quota exceeded','QuotaExceededError');return window.__atOriginalSetItem.call(this,k,v)}});
 await page.locator('[data-home-action="advance-next"][data-id="demo7"]').click();
 assert.match(await page.locator('#at-home-lineup').innerText(),/S1 · EP 3/,'failed storage should not advance progress');
 await page.evaluate(()=>{Storage.prototype.setItem=window.__atOriginalSetItem;delete window.__atOriginalSetItem});
 assert(await page.locator('#at128-storage-warning').isVisible(),'write failure must show safe recovery, not discard progress');
 await page.locator('#at128-storage-warning [data-at128-retry]').click();
 assert(await page.locator('#at128-storage-warning').isHidden(),'recovery retry must restore normal navigation after storage recovers');
 await page.locator('#at-home-lineup .at-h2-lineup-name[data-id="demo7"]').click();
 assert(await page.locator('#detail-modal').isVisible(),'Anime detail should open');
 assert.equal(await page.locator('#detail-body .at108-franchise').count(),0,'Franchise Hub must be absent');
 assert(await page.locator('#detail-body .season-scroller').isVisible(),'Native season selector remains');
 assert.equal(await page.locator('#detail-body .season-tab').count(),1);
 await page.locator('#detail-body .ep-info-btn').first().click();
 assert(await page.locator('#episode-detail-modal').isVisible(),'Episode Hub should open');
 assert(await page.locator('#ep-detail-body .at108-episode-head').isVisible());
 await page.locator('#ep-detail-body [data-journey-action="tab"][data-tab="discussion"]').click();
 assert.equal(await page.locator('#ep-detail-body').getAttribute('data-at108-tab'),'discussion');
 assert(await page.locator('#ep-detail-body .v98-discussion').isVisible(),'Discussion should be visible');
 await page.locator('#ep-detail-body [data-journey-action="tab"][data-tab="episode"]').click();
 assert.equal(await page.locator('#ep-detail-body').getAttribute('data-at108-tab'),'episode');
 await page.locator('#episode-detail-modal [data-close="episode-detail-modal"]').click();
 await page.locator('#pro-nav-collections').click();
 assert(await page.locator('#pro-content .at110-page').isVisible(),'My Lists should open');
 await page.locator('#at110-new-list').fill('My Weekend List');
 await page.locator('#at110-create-form button[type="submit"]').click();
 assert.match(await page.locator('.at110-list-top').innerText(),/My Weekend List/);
 await page.locator('[data-pro-action="collection-toggle"][data-id="demo7"]').first().click();
 assert.match(await page.locator('.at110-list-top').innerText(),/1 anime/);
 await page.locator('[data-pro-action="collection-back"]').click();
 assert(await page.locator('#library-view').isVisible(),'Back to library works');
 assert(await page.locator('#at110-open-lists').isVisible(),'Library offers My Lists shortcut');
 
 await page.locator('#pro-nav-calendar').click();
 assert(await page.locator('#pro-view').isVisible(),'Calendar should open');
 assert(await page.locator('#pro-content .at109-smart-week').isVisible(),'Desktop personal weekly calendar should render');
 assert.match(await page.locator('#pro-content .at109-smart-week').innerText(),/Kjo javë për ty/);
 await page.locator('#at109-default-lead').selectOption('10');
 assert.equal(await page.locator('#at109-default-lead').inputValue(),'10');
 assert(await page.locator('[data-smart-reminder]').count()>0,'Desktop per-event reminder must be available');
 await page.locator('[data-smart-reminder]').first().selectOption('30');
 assert.equal(await page.locator('[data-smart-reminder]').first().inputValue(),'30');
 await page.locator('#library-nav').click();
 assert.equal(await page.locator('#at113-library-head h2').innerText(),'Biblioteka ime');
 await page.locator('#explore-nav').click();
 await page.locator('#global-search').fill('Dexter');
 await page.locator('.at120-tv-result [data-tv-search-preview="777"]').first().waitFor({timeout:12000});
 await page.locator('.at120-tv-result [data-tv-search-preview="777"]').first().click();
 await page.locator('#detail-modal.show').waitFor({timeout:12000});
 assert.match(await page.locator('#detail-body').innerText(),/Dexter/);
 assert(await page.locator('#detail-body .at120-preview-season').count()>0,'TV preview has season overview');
 await page.locator('#detail-body [data-tv-unified-add="watching"]').click();
 assert(await page.locator('#detail-body .season-tab').count()>0,'TV has native season tabs');
 await page.locator('#detail-modal [data-close="detail-modal"]').click();
 // 12.5: anime and TV share the same first-premiere-year ordering.
 await page.evaluate(()=>{
  const entries=window.ATMobile113.state().anime;
  // Control all years in the test fixture, avoiding unrelated 2026 demo cards.
  for(const item of entries.filter(a=>a.id.startsWith('demo'))){item.year=null;for(const season of item.seasons||[]){season.year=null;season.releaseStart='';season.episodes=[]}}
  entries.find(a=>a.id==='demo0').year=1999;
  entries.find(a=>a.id==='demo1').year=2025;
 });
 await page.locator('#library-nav').click();
 await page.locator('#sort').evaluate(el=>{el.value='year-new';el.dispatchEvent(new Event('change',{bubbles:true}))});
 let rows=await page.locator('#anime-grid .anime-card').evaluateAll(cards=>cards.filter(x=>!x.hidden).map(x=>({year:x.dataset.releaseYear,media:x.dataset.media})));
 assert.deepEqual(rows.slice(0,3).map(x=>x.year),['2025','2006','1999'],'newest premiere year first, TV and anime mixed');
 assert.equal(rows.at(-1).year,'','titles without a premiere date remain last');
 assert(await page.locator('#at125-sort-hint').isVisible(),'year-sort rule is explained');
 await page.locator('#sort').evaluate(el=>{el.value='year-old';el.dispatchEvent(new Event('change',{bubbles:true}))});
 rows=await page.locator('#anime-grid .anime-card').evaluateAll(cards=>cards.filter(x=>!x.hidden).map(x=>({year:x.dataset.releaseYear,media:x.dataset.media})));
 assert.deepEqual(rows.slice(0,3).map(x=>x.year),['1999','2006','2025'],'oldest premiere year first');
 assert.equal(rows.at(-1).year,'','unknown years remain last in ascending order');
 await page.locator('#sort').evaluate(el=>{el.value='updated';el.dispatchEvent(new Event('change',{bubbles:true}))});
 assert(await page.locator('#at125-sort-hint').isHidden());
 console.log('YEAR_DESKTOP_PASS',JSON.stringify({newest:['2025','2006','1999'],oldest:['1999','2006','2025'],unknownLast:true}));
 await page.locator('#home-nav').click();
 assert(await page.locator('#at-home-main').isVisible(),'PC Home should remain available');

 // Regression: a 1000+-episode series must reopen the actual latest season and 24-item page.
 await page.evaluate(()=>{
  const state=window.ATMobile113.state(),a=state.anime.find(x=>x.id==='demo0');
  a.title='One Piece';a.source='';a.hydrated=true;
  const season=(id,total,watched)=>({id,title:id.toUpperCase(),total,watched,episodes:[],releaseStatus:'FINISHED'});
  a.seasons=[season('s1',25,Array.from({length:25},(_,i)=>i+1)),season('s2',25,Array.from({length:25},(_,i)=>i+1)),season('s3',75,Array.from({length:49},(_,i)=>i+1))];
  state.history.push({id:a.id,seasonId:'s3',episode:49,action:'watched',date:new Date().toISOString()});
 });
 await page.locator('#library-nav').click();
 await page.locator('#anime-grid [data-detail="demo0"]').first().click();
 assert.equal(await page.locator('#detail-body .season-tab.active').getAttribute('data-season'),'s3','One Piece resumes season 3');
 assert.match(await page.locator('#detail-body .episode-pages').innerText(),/Faqja 3/,'resume must navigate to episode 50 page');
 assert(await page.locator('#detail-body [data-season-ep="s3"][data-ep="50"]').isVisible(),'next episode 50 should be on current page');
 assert(await page.locator('#detail-body [data-at123-resume="demo0"]').isVisible(),'resume shortcut is available');
 await page.locator('#detail-body .ep-info-btn').first().click();
 assert(await page.locator('#ep-detail-body .at123-episode-layout').isVisible(),'desktop episode layout is present');
 const desktopLayout=await page.locator('#ep-detail-body .at123-episode-layout').evaluate(el=>({display:getComputedStyle(el).display,columns:getComputedStyle(el).gridTemplateColumns}));
 assert.equal(desktopLayout.display,'grid','desktop episode uses a dedicated two-column layout');
 assert.equal(desktopLayout.columns.split(' ').length,2,'desktop has two episode columns');
 await page.locator('#episode-detail-modal [data-close="episode-detail-modal"]').click();
 if(await page.locator('#detail-modal').isVisible())await page.locator('#detail-modal [data-close="detail-modal"]').click();
 console.log('RESUME_DESKTOP_PASS',JSON.stringify({title:'One Piece',season:'s3',episode:50,page:3,layout:desktopLayout.display}));


 // 12.6: queued offline episode survives a new session even if cloud has moved on.
 await page.locator('#library-nav').click();
 const beforeOffline=await page.evaluate(()=>window.ATMobile113.state().anime.find(a=>a.id==='demo7').seasons[0].watched.length);
 await page.evaluate(()=>Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false}));
 await page.locator('#anime-grid [data-next="demo7"]').first().click();
 const local=await page.evaluate(()=>{
  const key='animetrack_user_desktop-demo',state=JSON.parse(localStorage.getItem(key)),pending=JSON.parse(localStorage.getItem(key+'_pending_126'));
  return {watched:state.anime.find(a=>a.id==='demo7').seasons[0].watched.length,pending,indicator:document.querySelector('#account-sync-pill').textContent};
 });
 assert.equal(local.watched,beforeOffline+1,'offline +1 must be durably saved to this account');
 assert(local.pending&&local.pending.baseRevision,'pending journal records the original cloud revision');
 assert.match(local.indicator,/Offline/);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!document.body.classList.contains('account-booting')&&window.ATMobile113?.state()?.anime?.some(a=>a.id==='demo7'));
 const recovered=await page.evaluate(()=>{
  const key='animetrack_user_desktop-demo';return {
   watched:window.ATMobile113.state().anime.find(a=>a.id==='demo7').seasons[0].watched.length,
   pending:!!localStorage.getItem(key+'_pending_126'),
   indicator:document.querySelector('#account-sync-pill').textContent
  };
 });
 assert.equal(recovered.watched,local.watched,'stale cloud snapshot cannot overwrite offline progress on login');
 assert.equal(recovered.pending,true,'conflicting progress remains queued');
 assert.match(recovered.indicator,/Konflikt/,'cloud mismatch requires explicit resolution');
 console.log('OFFLINE_RECOVERY_DESKTOP_PASS',JSON.stringify({saved:local.watched,recovered:recovered.watched,conflict:true}));
 // 12.7.4: deliberately exhaust writes to the cloud snapshot while auth still succeeds.
 // The app must show a backup/retry gate instead of returning to the login form.
 const quotaContext=await browser.newContext({viewport:{width:1360,height:840},acceptDownloads:true});
 const quotaPage=await quotaContext.newPage(),quotaErrors=[];
 quotaPage.on('pageerror',e=>quotaErrors.push(e.message));
 await quotaPage.addInitScript(()=>{
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
   if(String(key).startsWith('animetrack_user_'))throw new DOMException('exceeded the quota','QuotaExceededError');
   return original.call(this,key,value);
  };
 });
 await quotaPage.route('**/cdn.jsdelivr.net/npm/@supabase/supabase-js@2*',route=>route.fulfill({status:200,contentType:'application/javascript',body:stub}));
 await quotaPage.route('https://graphql.anilist.co',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:{Page:{media:[],pageInfo:{hasNextPage:false}}}})}));
 await quotaPage.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
 await quotaPage.waitForFunction(()=>!document.body.classList.contains('account-booting'));
 const quotaState=await quotaPage.evaluate(()=>({
  loggedIn:!document.body.classList.contains('auth-required'),
  readOnly:document.body.classList.contains('at128-storage-blocked'),
  backup:!!document.querySelector('[data-at128-export]'),
  retry:!!document.querySelector('[data-at128-retry]'),
  anime:window.ATMobile113?.state()?.anime?.length||0,
  badge:document.querySelector('#account-sync-pill')?.textContent||''
 }));
 assert.equal(quotaState.loggedIn,true,'quota must not reject a valid cloud session');
 assert.equal(quotaState.readOnly,true,'unpersistable cloud data is explicitly read-only');
 assert.equal(quotaState.anime,8,'cloud library remains visible in memory without overwriting local user data');
 assert.equal(quotaState.backup,true,'backup export is available');
 assert.equal(quotaState.retry,true,'safe retry is available');
 assert.match(quotaState.badge,/Hapësirë plot/);
 assert.equal(quotaErrors.length,0,quotaErrors.join(' | '));
 console.log('QUOTA_RECOVERY_DESKTOP_PASS',JSON.stringify(quotaState));
 await quotaContext.close();
 if(errors.length)throw Error('Desktop runtime errors: '+errors.join(' | '));
 console.log('DESKTOP_BROWSER_PASS',JSON.stringify({cards:8,search:'Mystery',advance:'EP4',undo:'EP3',navigation:'ok'}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
