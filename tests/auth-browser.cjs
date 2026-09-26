/* Auth browser regression — no real user accounts created. Supabase is mocked at network boundary. */
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const engine=process.env.BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true,args:process.env.BROWSER==='webkit'?[]:['--no-sandbox']});
 const viewport=process.env.BROWSER==='desktop'?{width:1365,height:900}:{width:390,height:844};
 const context=await browser.newContext({viewport,deviceScaleFactor:3,isMobile:viewport.width<760,hasTouch:viewport.width<760,userAgent:viewport.width<760?'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 Version/17.6 Mobile/15E148 Safari/604.1':undefined});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const stub=`(()=>{
 const store={verified:false,signup:0,resend:0,login:0,profile:null,latestEmail:'',session:null};window.__at116Stub=store;
 const query=(table,mode)=>{const q={};for(const name of ['select','eq','order','limit','in','not','or','update','delete','range','neq','gte','lte','contains'])q[name]=(...args)=>q;
 q.insert=row=>{q._insert=row;return q};q.upsert=row=>{q._insert=row;return q};
 q.maybeSingle=async()=>({data:table==='anime_profiles'?store.profile:table==='anime_libraries'?null:null,error:null});
 q.single=async()=>{if(table==='anime_profiles'&&q._insert){store.profile={...q._insert,created_at:new Date().toISOString()};return {data:store.profile,error:null}}return q.maybeSingle()};
 q.then=(ok,fail)=>Promise.resolve({data:table==='anime_friendships'?[]:[],error:null}).then(ok,fail);return q;};
 const client={auth:{getSession:async()=>({data:{session:store.session},error:null}),
 signUp:async x=>{store.signup++;store.latestEmail=x.email;return {data:{user:{id:'5f4c96eb-1773-4cdd-bbb5-56b510332a37',email:x.email,user_metadata:{display_name:x.options.data.display_name}},session:null},error:null}},
 resend:async()=>{store.resend++;return {error:null}},
 signInWithPassword:async x=>{store.login++;if(!store.verified)return {data:{user:null},error:{code:'email_not_confirmed',message:'Email not confirmed'}};store.session={user:{id:'5f4c96eb-1773-4cdd-bbb5-56b510332a37',email:x.email,user_metadata:{display_name:'Test Friend'}}};return {data:{user:store.session.user},error:null}},
 signOut:async()=>{store.session=null;return {error:null}}},from:query,rpc:async()=>({data:[],error:null})};
 window.supabase={createClient:()=>client};
 })();`;
 await page.route('**/cdn.jsdelivr.net/npm/@supabase/supabase-js@2*',route=>route.fulfill({status:200,contentType:'application/javascript',body:stub}));
 await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
 await page.locator('#account-modal.show').waitFor({timeout:12000});
 const signupTab=page.locator('#at116-tab-signup'),submit=page.locator('#account-login');
 await signupTab.click();
 assert(await page.locator('#at113-confirm-password').isVisible());
 assert(await page.locator('#account-name').isVisible());
 assert.match(await submit.innerText(),/Krijo llogarinë/);
 await page.locator('#account-name').fill('Test Friend');
 await page.locator('#account-email').fill('friend@example.com');
 await page.locator('#account-password').fill('StrongPassword123');
 await page.locator('#at113-confirm-password').fill('StrongPassword123');
 await submit.click();
 await page.waitForFunction(()=>window.__at116Stub.signup===1);
 assert(await page.locator('#at116-pending-email').isVisible(),'pending confirmation must display');
 assert.match(await page.locator('#account-status').innerText(),/konfirmim|Inbox/i);
 await page.locator('#at116-resend-email').click();
 await page.waitForFunction(()=>window.__at116Stub.resend===1);
 await page.locator('#at116-pending-login').click();
 assert.match(await submit.innerText(),/Hyr në llogari/);
 await page.locator('#account-password').fill('StrongPassword123');
 await submit.click();
 assert.match(await page.locator('#account-status').innerText(),/konfirmuar|konfirmimit/i);
 assert(await page.locator('#at116-pending-email').isVisible());
 await page.evaluate(()=>window.__at116Stub.verified=true);
 await submit.click();
 await page.waitForFunction(()=>!!window.__at116Stub.profile,{timeout:12000});
 await page.waitForFunction(()=>!document.querySelector('#account-modal').classList.contains('show'));
 const data=await page.evaluate(()=>({signup:window.__at116Stub.signup,resend:window.__at116Stub.resend,login:window.__at116Stub.login,profile:window.__at116Stub.profile,authRequired:document.body.classList.contains('auth-required'),scroll:document.documentElement.scrollWidth,width:innerWidth}));
 assert.equal(data.signup,1);assert.equal(data.resend,1);assert.equal(data.login,2);
 assert.equal(data.profile.is_public,false);assert.match(data.profile.handle,/^fan_[a-f0-9]{12}$/);
 assert.equal(data.authRequired,false);assert(data.scroll<=data.width+2,'auth view horizontal overflow');
 assert.equal(errors.length,0,'browser errors: '+errors.join(' | '));
 console.log('AUTH_BROWSER_PASS',process.env.BROWSER||'chromium',JSON.stringify({signup:data.signup,resend:data.resend,login:data.login,handle:data.profile.handle,private:!data.profile.is_public}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
