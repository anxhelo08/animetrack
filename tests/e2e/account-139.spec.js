/* Synthetic account only: no production identity, token or deletion is used. */
import {test,expect} from '@playwright/test';
test('server provider connection, full export and confirmed account deletion',async({page},testInfo)=>{
 const errors=[],requests=[],providers=new Set();page.on('pageerror',e=>errors.push(e.message));
 const sdk=`const user={id:'00000000-0000-4000-8000-000000000001',email:'synthetic@example.test',user_metadata:{display_name:'Synthetic'}};
 let session={user,access_token:'synthetic-supabase-session'};
 const query=table=>{const q={};for(const name of ['select','eq','order','limit','in','not','or','update','delete','range','neq','gte','lte','contains'])q[name]=()=>q;q.insert=row=>{q.row=row;return q};q.upsert=q.insert;
 q.maybeSingle=async()=>({data:table==='anime_profiles'?{user_id:user.id,handle:'synthetic',display_name:'Synthetic',is_public:false,snapshot:{anime:[]}}:null,error:null});q.single=q.maybeSingle;q.then=(ok,fail)=>Promise.resolve({data:[],error:null}).then(ok,fail);return q};
 const client={from:query,rpc:async()=>({data:[],error:null}),auth:{getSession:async()=>({data:{session},error:null}),signInWithPassword:async()=>({data:{user,session},error:null}),signOut:async()=>{session=null;return {error:null}}}};
 export default ()=>client;`;
 await page.route('**/assets/supabase-client.*.js',r=>r.fulfill({contentType:'application/javascript',body:sdk}));
 await page.route('**/functions/v1/anime-account',async route=>{
  if(route.request().method()==='OPTIONS')return route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'http://127.0.0.1:8765','Access-Control-Allow-Headers':'authorization,apikey,content-type'}});
  const input=route.request().postDataJSON();requests.push({input,authorization:route.request().headers().authorization});let body={};
  if(input.action==='status')body={providers:[...providers]};
  if(input.action==='connect'){providers.add(input.provider);body={connected:true,profile:{id:7,name:'Synthetic'}}}
  if(input.action==='provider'&&input.operation==='me')body={id:7,name:'Synthetic'};
  if(input.action==='provider'&&input.operation==='list')body={MediaListCollection:{lists:[]}};
  if(input.action==='export')body={format:'animetrack-account-v1',account:{id:'00000000-0000-4000-8000-000000000001'},tables:{anime_libraries:[]}};
  if(input.action==='delete')body={deleted:true};
  await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'http://127.0.0.1:8765'},body:JSON.stringify(body)});
 });
 await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('body')).not.toHaveClass(/account-booting|auth-required/);
 await expect(page.locator('#pro-nav-sync')).toBeAttached();
 // The profile's provider link is available on desktop and mobile.
 await page.evaluate(()=>document.querySelector('[data-pro-page="sync"]')?.click());
 // Navigation buttons have stable IDs even when their desktop group is hidden.
 if(!await page.locator('#at135-anilist').isVisible())await page.evaluate(()=>document.querySelector('#pro-nav-sync')?.click());
 await expect(page.locator('#at135-anilist')).toBeVisible();
 await page.locator('#at135-anilist [data-at135-token]').fill('synthetic-provider-token');
 await page.locator('#at135-anilist [data-at135-action="save"]').click();
 await expect(page.locator('#at135-anilist')).toContainText('token në server');
 const storage=await page.evaluate(()=>({anilist:localStorage.getItem('animetrack_anilist_token_135'),mal:localStorage.getItem('animetrack_mal_token_135')}));
 expect(storage).toEqual({anilist:null,mal:null});expect(requests.find(x=>x.input.action==='connect').authorization).toBe('Bearer synthetic-supabase-session');
 await page.evaluate(()=>document.querySelector('[data-pro-page="profile"]')?.click());
 await page.locator('#pro-content [data-pro-action="profile-tab"][data-id="settings"]:visible').first().click();
 await page.locator('#pro-content [data-pro-action="account-open"]').click();
 const downloaded=page.waitForEvent('download');await page.locator('#account-export-all').click();const download=await downloaded;expect(download.suggestedFilename()).toMatch(/^AnimeTrack-account-/);
 await page.locator('#account-cloud-user summary').click();
 await page.locator('#account-delete').click();expect(requests.filter(x=>x.input.action==='delete')).toHaveLength(0);
 await page.locator('#account-delete-confirmation').fill('FSHI LLOGARINE');await page.locator('#account-delete-password').fill('synthetic-password');
 page.once('dialog',dialog=>dialog.accept());await page.locator('#account-delete').click();
 await expect(page.locator('#account-status')).toContainText('u fshinë');expect(requests.filter(x=>x.input.action==='delete')).toHaveLength(1);
 expect(errors).toEqual([]);console.log('ACCOUNT_SERVER_UI_PASS',testInfo.project.name);
});
