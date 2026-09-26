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
 await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
 await page.locator('#at-home-lineup .at-h2-lineup-card').first().waitFor();
 assert.equal(await page.locator('#at-home-lineup .at-h2-lineup-card').count(),6);
 assert(await page.locator('#at-iphone-feed').isHidden(),'Phone feed must not replace PC Home');
 await page.locator('[data-home-action="more-watching"]').click();
 assert.equal(await page.locator('#at-home-lineup .at-h2-lineup-card').count(),8);
 await page.locator('#at-pc-watch-search').fill('Mystery');
 await page.waitForTimeout(300);
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
 await page.locator('#home-nav').click();
 assert(await page.locator('#at-home-main').isVisible(),'PC Home should remain available');
 if(errors.length)throw Error('Desktop runtime errors: '+errors.join(' | '));
 console.log('DESKTOP_BROWSER_PASS',JSON.stringify({cards:8,search:'Mystery',advance:'EP4',undo:'EP3',navigation:'ok'}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
