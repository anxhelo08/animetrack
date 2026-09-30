import {test,expect} from '@playwright/test';
import {demonFixture} from '../fixtures/franchise-137.js';

test('one complete Demon Slayer card survives login, realtime, reload and episode updates',async({page},testInfo)=>{
 const {payload}=demonFixture(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 // All account data in this test is synthetic. No request reaches Supabase.
 const stub=`(()=>{let payload=${JSON.stringify(payload)},revision='2026-09-29T20:00:00Z',onRemote=null;const original=JSON.parse(JSON.stringify(payload));
 const chain=table=>{let write=null;const q={};for(const name of ['select','eq','order','limit','in','not','or','range','neq','gte','lte','contains'])q[name]=()=>q;for(const name of ['update','upsert','insert'])q[name]=v=>{write=v;return q};q.delete=()=>q;q.maybeSingle=async()=>{if(table!=='anime_libraries')return{data:null,error:null};if(write){payload=write.payload;revision=new Date().toISOString();return{data:{updated_at:revision},error:null}}return{data:{payload,updated_at:revision},error:null}};q.single=q.maybeSingle;q.then=(yes,no)=>Promise.resolve({data:[],error:null}).then(yes,no);return q;};
 window.__at137Remote=()=>{payload=JSON.parse(JSON.stringify(original));revision=new Date(Date.now()+5000).toISOString();onRemote?.({new:{user_id:'franchise-test',payload,updated_at:revision}})};
 window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:'franchise-test',email:'fixture@example.com'}}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:chain,rpc:()=>chain('rpc'),channel:()=>{const c={on:(_type,_filter,callback)=>{onRemote=callback;return c},subscribe:callback=>{callback?.('SUBSCRIBED');return c},unsubscribe(){}};return c},removeChannel(){}})};})();`;
 await page.route('**/*',route=>{
  const url=route.request().url();
  if(/\/assets\/supabase-client\.[^/]+\.js$/.test(new URL(url).pathname))return route.fulfill({status:200,contentType:'application/javascript',body:stub+'\nexport default window.supabase.createClient;'});
  if(new URL(url).hostname==='127.0.0.1')return route.continue();
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(url.includes('graphql')?{data:{Page:{media:[],pageInfo:{hasNextPage:false}},Media:null}}:{data:[],results:[]})});
 });
 await page.goto('/');
 await page.waitForFunction(()=>!document.body.classList.contains('account-booting')&&window.ATMobile113?.state()?.anime?.length===1);
 await expect.poll(()=>page.evaluate(()=>window.ATMobile113.state().anime.length)).toBe(1);
 const state=await page.evaluate(()=>window.ATMobile113.state());
 expect(state.anime[0].seasons).toHaveLength(7);expect(state.anime[0].providerIds).toContain('tvmaze:41469');
 const mobile=testInfo.project.name.startsWith('iphone');
 if(mobile)await page.locator('.at-mobile-nav [data-mobile-nav="library"]').click();else await page.locator('#library-nav').click();
 await expect(page.locator('#anime-grid .anime-card')).toHaveCount(1);
 await page.locator('#anime-grid [data-detail="anime-demon"]').first().click();
 await expect(page.locator('#detail-modal')).toBeVisible();
 await expect(page.locator('.at131-part')).toHaveCount(7);
 await expect(page.locator('[data-sync-seasons="anime-demon"]')).toHaveCount(1);
 const ordered=await page.locator('.at131-part').evaluateAll(cards=>cards.map(x=>x.dataset.partFormat));
 expect(ordered).toEqual(['TV','MOVIE','TV','TV','TV','TV','MOVIE']);
 await page.locator('[data-at137-timeline="movies"]').click();
 await expect(page.locator('.at131-part:visible')).toHaveCount(2);
 await expect(page.locator('[data-at137-timeline="movies"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-at137-timeline="seasons"]').click();
 await expect(page.locator('.at131-part:visible')).toHaveCount(5);
 await page.locator('[data-at137-timeline="all"]').click();
 await page.locator('[data-at131-part="al-142329"]').click();
 await expect(page.locator('[data-at131-part="al-142329"]')).toHaveAttribute('aria-current','true');
 const overflow=await page.locator('#detail-body').evaluate(el=>el.scrollWidth>el.clientWidth+2);
 expect(overflow).toBe(false);
 await page.locator('.at131-franchise').evaluate(el=>el.scrollIntoView({block:'start'}));
 await page.screenshot({path:testInfo.outputPath('timeline-13.7-'+testInfo.project.name+'.png'),fullPage:false});
 await page.locator('#detail-modal [data-close="detail-modal"]').click();
 // A stale second device sends the original pair through Realtime.
 await expect.poll(()=>page.evaluate(()=>window.ATMobile113.state().anime[0].providerIds.includes('tvmaze:41469'))).toBe(true);
 await page.waitForFunction(()=>!localStorage.getItem('animetrack_user_franchise-test_pending_126'));
 await page.evaluate(()=>window.__at137Remote());
 await expect.poll(()=>page.evaluate(()=>window.ATMobile113.state().anime.length)).toBe(1);
 await page.reload();
 await page.waitForFunction(()=>!document.body.classList.contains('account-booting')&&window.ATMobile113?.state()?.anime?.length===1);
 expect((await page.evaluate(()=>window.ATMobile113.state().anime[0].seasons)).filter(s=>s.format==='MOVIE')).toHaveLength(2);
 expect(errors).toEqual([]);
});
