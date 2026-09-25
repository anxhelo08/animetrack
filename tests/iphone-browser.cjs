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
 assert(await page.locator('#at-iphone-feed .at109-smart-week.compact').isVisible(),'Smart weekly panel should be visible on iPhone');
 assert.match(await page.locator('#at-iphone-feed .at109-smart-week').innerText(),/Kjo javë për ty/);
 await page.locator('[data-ios-action="tab"][data-id="upcoming"]').click();
 assert.match(await page.locator('#at-iphone-feed').innerText(),/Së shpejti/);
 await page.locator('[data-ios-action="tab"][data-id="pending"]').click();
 await page.locator('[data-ios-action="advance"][data-id="demo1"]').click();
 await page.waitForTimeout(150);
 assert.match(await page.locator('#at-iphone-feed').innerText(),/EP 4/,'+1 should update episode');
 assert(await page.locator('[data-ios-action="undo"]').isVisible(),'recent episode should offer Undo');
 await page.locator('[data-ios-action="undo"]').click();
 assert.match(await page.locator('#at-iphone-feed').innerText(),/EP 3/,'Undo must restore exact episode');
 assert.equal(await page.locator('[data-ios-action="undo"]').count(),0,'Undo should disappear after use');
 await page.locator('[data-ios-action="episode"][data-id="demo1"]').click();
 assert(await page.locator('#episode-detail-modal').isVisible(),'iPhone Episode Hub should open');
 assert(await page.locator('#ep-detail-body .at108-episode-head').isVisible(),'Episode Hub should render mobile');
 await page.locator('#ep-detail-body [data-journey-action="tab"][data-tab="discussion"]').click();
 assert.equal(await page.locator('#ep-detail-body').getAttribute('data-at108-tab'),'discussion');
 await page.locator('#ep-detail-body [data-journey-action="tab"][data-tab="episode"]').click();
 assert.equal(await page.locator('#ep-detail-body').getAttribute('data-at108-tab'),'episode');
 await page.locator('#episode-detail-modal [data-close="episode-detail-modal"]').click();
 for(const [tab,selector] of [['calendar','#pro-view'],['explore','#explore-view'],['library','#library-view'],['profile','#pro-view'],['home','#at-iphone-feed']]){
   await page.locator('[data-mobile-nav="'+tab+'"]').click();
   await page.waitForTimeout(70);
   const el=page.locator(selector);
   assert(await el.isVisible(),tab+' destination should display');
   if(tab==='library'){
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
   if(tab==='calendar'){
    assert(await page.locator('.at109-settings').isVisible(),'Notification settings should render');
    await page.locator('#at109-default-lead').selectOption('60');
    assert.equal(await page.locator('#at109-default-lead').inputValue(),'60');
    const choices=page.locator('[data-smart-reminder]');
    assert(await choices.count()>0,'Per-episode reminder select should render');
    await choices.first().selectOption('10');
    assert.equal(await page.locator('[data-smart-reminder]').first().inputValue(),'10');
    assert.match(await page.locator('#pro-content').innerText(),/Njoftimet jashtë aplikacionit/);
   }
   console.log('NAV_OK',tab);
 }
 if(errors.length)throw Error('Browser JavaScript errors: '+errors.join(' | '));
 console.log('IPHONE_BROWSER_PASS',engine===webkit?'WebKit':'Chromium');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
