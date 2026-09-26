const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const engine=process.env.BROWSER==='webkit'?webkit:chromium;
 const browser=await engine.launch(process.env.BROWSER==='webkit'?{headless:true}:{headless:true,args:['--no-sandbox']});
 console.log('BROWSER_ENGINE',engine===webkit?'WebKit':'Chromium');
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 Version/17.6 Mobile/15E148 Safari/604.1'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const fixture={anime:[{id:'demo1',title:'Demo Anime',status:'watching',total:12,watched:[1,2],cover:'',updatedAt:new Date().toISOString(),seasons:[{id:'season1',title:'Season 1',total:12,watched:[1,2],episodes:[{number:4,title:'Future demo episode',airedAt:new Date(Date.now()+90*60000).toISOString()}],releaseStatus:'FINISHED'}]}],history:[],preferences:{weeklyGoal:10,notificationRead:[]}};
 const stub=`(()=>{
 const payload=${JSON.stringify(fixture)};
 const chain=table=>{const q={};for(const name of ['select','eq','order','limit','in','not','or','insert','upsert','update','delete','range','neq','gte','lte','contains'])q[name]=()=>q;q.maybeSingle=async()=>({data:table==='anime_libraries'?{payload,updated_at:new Date().toISOString()}:null,error:null});q.single=q.maybeSingle;q.then=(yes,no)=>Promise.resolve({data:[],error:null}).then(yes,no);return q;};
 window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:'demo-user',email:'demo@example.com'}}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:chain,rpc:()=>chain('rpc')})};
 })();`;
 await page.route('**/cdn.jsdelivr.net/npm/@supabase/supabase-js@2*',route=>route.fulfill({status:200,contentType:'application/javascript',body:stub}));
 await page.route('https://graphql.anilist.co',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:{Page:{media:[],pageInfo:{hasNextPage:false}}}})}));
 await page.route('https://api.tvmaze.com/shows/777',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:777,name:'Dexter',premiered:'2006-10-01',genres:['Drama'],rating:{average:8.5},image:null,url:'https://www.tvmaze.com/shows/777/dexter'})}));
 await page.route('https://api.tvmaze.com/search/shows?q=*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{score:1,show:{id:777,name:'Dexter',premiered:'2006-10-01',genres:['Drama'],rating:{average:8.5},image:null,url:'https://www.tvmaze.com/shows/777/dexter'}}])}));
 await page.route('https://api.tvmaze.com/shows/777/episodes?specials=1',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{id:7771,season:1,number:1,name:'Dexter',airdate:'2006-10-01',runtime:55},{id:7772,season:1,number:2,name:'Future',airdate:'2099-01-01',runtime:55}])}));
 await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
 await page.waitForTimeout(1100);
 const info=await page.evaluate(()=>{
 const e=document.querySelector('#at-iphone-feed'),home=document.querySelector('#home-view');
 return {feed:!!e,display:e&&getComputedStyle(e).display,visibility:e&&getComputedStyle(e).visibility,rect:e&&e.getBoundingClientRect().height,home:home?.classList.contains('hidden'),text:e?.innerText,boot:document.body.classList.contains('account-booting'),auth:document.body.classList.contains('auth-required')};
 });
 console.log('IPHONE_RENDER',JSON.stringify(info));
 assert.equal(info.feed,true,'iPhone feed must exist');
 assert.notEqual(info.display,'none','iPhone feed must be visible');
 assert(info.rect>100,'iPhone feed must have visible layout');
 assert.match(info.text,/Demo Anime/,'cloud library should render');
 assert(await page.locator('#at-iphone-feed .at115-day-summary').isVisible(),'Collapsible daily overview should be visible on iPhone');
 assert.match(await page.locator('#at-iphone-feed .at115-day-summary').innerText(),/YOUR ANIME DAY/);
 await page.locator('[data-ios-action="tab"][data-id="upcoming"]').click();
 assert.match(await page.locator('#at-iphone-feed').innerText(),/Episodet që po vijnë/);
 await page.locator('[data-ios-action="horizon"][data-id="30"]').click();
 assert.equal(await page.locator('[data-ios-action="horizon"][data-id="30"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('.at117-upcoming-action').count(),1,'Future episode is not a green watched check');
 await page.locator('[data-ios-action="tab"][data-id="watch"]').click();
 await page.locator('[data-ios-action="advance"][data-id="demo1"]').click();
 await page.waitForTimeout(150);
 assert.match(await page.locator('#at-iphone-feed').innerText(),/E04/,'+1 should update episode');
 assert(await page.locator('[data-ios-action="undo"]').isVisible(),'recent episode should offer Undo');
 await page.locator('[data-ios-action="undo"]').click();
 assert.match(await page.locator('#at-iphone-feed').innerText(),/E03/,'Undo must restore exact episode');
 assert.equal(await page.locator('[data-ios-action="undo"]').count(),0,'Undo should disappear after use');
 const touchInfo=await page.evaluate(()=>({
  touchAction:getComputedStyle(document.body).touchAction,
  font:parseFloat(getComputedStyle(document.querySelector('#at-ios-feed input, #at110-new-list')||document.querySelector('input')).fontSize),
  scale:window.visualViewport?.scale||1
 }));
 assert.equal(touchInfo.touchAction,'manipulation','Touch handling should block accidental double-tap zoom');
 assert(touchInfo.font>=16,'iPhone inputs should not cause Safari focus zoom');
 const zoomTarget=await page.locator('#at-iphone-feed .at114-top-tabs button.active').boundingBox();
 assert(zoomTarget&&zoomTarget.width>0,'Feed heading should be present for zoom regression');
 await page.touchscreen.tap(zoomTarget.x+zoomTarget.width/2,zoomTarget.y+zoomTarget.height/2);
 await page.waitForTimeout(75);
 await page.touchscreen.tap(zoomTarget.x+zoomTarget.width/2,zoomTarget.y+zoomTarget.height/2);
 await page.waitForTimeout(280);
 const postTapScale=await page.evaluate(()=>window.visualViewport?.scale||1);
 assert(postTapScale<1.05,'Double-tap should not enlarge the mobile screen: '+postTapScale);
 console.log('DOUBLE_TAP_SCALE',postTapScale);
 await page.locator('[data-ios-action="episode"][data-id="demo1"]').first().click();
 if(!(await page.locator('#episode-detail-modal').isVisible())){
  await page.waitForTimeout(300);
  if(!(await page.locator('#episode-detail-modal').isVisible()))await page.locator('[data-ios-action="episode"][data-id="demo1"]').first().click();
 }
 await page.locator('#episode-detail-modal').waitFor({state:'visible',timeout:5000});
 assert(await page.locator('#episode-detail-modal').isVisible(),'iPhone Episode Hub should open');
 assert(await page.locator('#ep-detail-body .at108-episode-head').isVisible(),'Episode Hub should render mobile');
 await page.locator('#ep-detail-body [data-journey-action="tab"][data-tab="discussion"]').click();
 assert.equal(await page.locator('#ep-detail-body').getAttribute('data-at108-tab'),'discussion');
 await page.locator('#ep-detail-body [data-journey-action="tab"][data-tab="episode"]').click();
 assert.equal(await page.locator('#ep-detail-body').getAttribute('data-at108-tab'),'episode');
 await page.locator('#episode-detail-modal [data-close="episode-detail-modal"]').click();
 for(const [tab,selector] of [['explore','#explore-view'],['library','#library-view'],['profile','#pro-view'],['home','#at-iphone-feed']]){
   await page.locator('[data-mobile-nav="'+tab+'"]').click();
   await page.waitForTimeout(70);
   const el=page.locator(selector);
   assert(await el.isVisible(),tab+' destination should display');
   if(tab==='explore'){assert(await page.locator('#at117-mobile-discover').isVisible(),'Personal discovery must render on iPhone');assert(await page.locator('#global-search').isVisible(),'Anime search must remain accessible');}
    if(tab==='library'){assert(await page.locator('[data-at117-sort="title"]').isVisible(),'Library sort chips must be visible');await page.locator('[data-at117-sort="title"]').click();assert.equal(await page.locator('#sort').inputValue(),'title');
    assert(await page.locator('#at110-mobile-lists').isVisible(),'My Lists shortcut should appear in iPhone library');
    await page.locator('#at110-mobile-lists').click();
    assert(await page.locator('#pro-content .at110-page').isVisible(),'Lists page should open on iPhone');
    await page.locator('#at110-new-list').fill('For Sunday');
    await page.locator('#at110-create-form button[type="submit"]').click();
    assert.match(await page.locator('.at110-list-top').innerText(),/For Sunday/);
    await page.locator('[data-pro-action="collection-toggle"][data-id="demo1"]').first().click();
    assert.match(await page.locator('.at110-list-top').innerText(),/1 anime/);
    await page.locator('[data-pro-action="collection-back"]').click();
    assert(await page.locator('#library-view').isVisible(),'Back to library should work on iPhone');
   }
   console.log('NAV_OK',tab);
 }

 await page.locator('.at-mobile-nav [data-mobile-nav="library"]').click();
 assert(await page.locator('[data-media-filter="all"]').isVisible(),'Unified library filter must be visible');
 assert.equal(await page.locator('#at113-library-head h2').innerText(),'Biblioteka ime','Library heading must not retain waiting filter title');
 await page.locator('[data-mobile-nav="explore"]').click();
 await page.locator('#global-search').fill('Dexter');
 await page.locator('.at120-tv-result [data-tv-search-preview="777"]').first().waitFor({timeout:12000});
 assert(await page.locator('.at120-tv-result').isVisible(),'Dexter must appear in the SAME global search as anime');
 await page.locator('.at120-tv-result [data-tv-search-preview="777"]').first().click();
 await page.locator('.at118-detail').waitFor();
 assert.match(await page.locator('.at118-detail').innerText(),/Dexter/);
 assert(await page.locator('[data-tv-action="add"][data-id="777"]').isVisible(),'Preview should show add button');
 await page.locator('[data-tv-action="add"][data-id="777"]').click();
 await page.locator('[data-tv-action="episode"][data-ep="7771"]').waitFor();
 await page.locator('[data-tv-action="episode"][data-ep="7771"]').click();
 assert.match(await page.locator('.at118-detail').innerText(),/1 \/ 2 episode/);
 assert(await page.locator('#at118-episode-7771').isVisible(),'All seasons stay expanded');
 assert.equal(await page.locator('[data-tv-action="resume"][data-id="tvmaze-777"]').count(),0,'No resume when only a future episode remains');
 assert(await page.locator('[data-tv-action="episode"][data-ep="7772"]').isDisabled(),'Unaired TV episode must stay locked');
 await page.locator('.at-mobile-nav [data-mobile-nav="library"]').click();
 assert(await page.locator('.at119-tv-card').isVisible(),'Dexter must appear alongside anime in unified library');
 assert(await page.locator('#anime-grid .anime-card').count()>=2,'Unified library must show both anime and TV');
 await page.locator('[data-media-filter="tv"]').click();
 assert.equal(await page.locator('#anime-grid .anime-card:not(.at119-tv-card)').count(),0,'TV filter must hide anime');
 await page.locator('[data-media-filter="anime"]').click();
 assert.equal(await page.locator('#anime-grid .at119-tv-card').count(),0,'Anime filter must hide TV');
 await page.locator('[data-media-filter="all"]').click();
 assert(await page.locator('.at119-tv-card').isVisible(),'All filter restores TV cards');
 await page.locator('[data-at117-sort="title"]').click();
 assert(await page.locator('.at117-library-tools button.active').isVisible(),'Sort control must have active style');
 await page.locator('[data-mobile-nav="home"]').click();
 assert(await page.locator('#at-iphone-feed').isVisible(),'Anime feed remains accessible after TV progress');
 assert(await page.locator('#at-iphone-feed .at115-day-summary').isVisible(),'Daily brief must be collapsed on iPhone');
 assert.equal(await page.locator('#at-iphone-feed .at115-day').count(),0,'Daily content starts closed');
 await page.locator('#at-iphone-feed .at115-day-summary').click();
 assert(await page.locator('#at-iphone-feed .at115-day').isVisible(),'Daily brief opens on tap');
 console.log('TV_BROWSER_PASS',JSON.stringify({show:'Dexter',watched:1,animeIntact:true}));

 for(const [width,height] of [[320,700],[375,812],[390,844],[430,932],[844,390]]){
  await page.setViewportSize({width,height});
  await page.locator('[data-mobile-nav="home"]').click();
  assert(await page.locator('#at-iphone-feed').isVisible(),'iPhone feed should remain visible at '+width+'x'+height);
  const sheet=await page.evaluate(()=>({
   width:document.documentElement.scrollWidth,viewport:window.innerWidth,
   nav:document.querySelector('.at-mobile-nav')?.getBoundingClientRect().height,
   touch:getComputedStyle(document.body).touchAction
  }));
  assert(sheet.width<=sheet.viewport+2,'Unexpected horizontal document overflow at '+width+'x'+height+': '+JSON.stringify(sheet));
  assert(sheet.nav>=44,'Bottom navigation should be usable at '+width+'x'+height);
  assert.equal(sheet.touch,'manipulation');
  await page.locator('#at-iphone-feed [data-ios-action="details"][data-id="demo1"]').first().click();
  assert(await page.locator('#detail-modal').isVisible(),'Anime details must be visible at '+width);
  const safe=await page.evaluate(()=>{
   const back=document.querySelector('#detail-modal .detail-back'),
         nav=document.querySelector('.at-mobile-nav'),
         modal=document.querySelector('#detail-modal'),
         rect=back.getBoundingClientRect(),
         hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
   return {top:rect.top,bottom:rect.bottom,height:rect.height,visible:back.contains(hit),
     modalZ:Number(getComputedStyle(modal).zIndex),navZ:Number(getComputedStyle(nav).zIndex),
     width:window.innerWidth,heightView:window.innerHeight};
  });
  assert(safe.top>=7&&safe.bottom<=safe.heightView+1,'Back button outside visible safe header at '+width+'x'+height+': '+JSON.stringify(safe));
  assert(safe.height>=44,'Back button touch target too small at '+width+'x'+height);
  assert(safe.visible,'Back button blocked by another layer at '+width+'x'+height);
  assert(safe.modalZ>safe.navZ,'Modal must appear above mobile nav at '+width+'x'+height);
  await page.locator('#detail-modal .detail-back').click();
  assert(await page.locator('#detail-modal').isHidden(),'Back button must close details at '+width+'x'+height);
  console.log('IPHONE_SAFE_AREA',width+'x'+height,JSON.stringify(safe));
 }
 await page.setViewportSize({width:390,height:844});
  if(errors.length)throw Error('Browser JavaScript errors: '+errors.join(' | '));
 console.log('IPHONE_BROWSER_PASS',engine===webkit?'WebKit':'Chromium');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
