import { test } from '@playwright/test';
import { demonFixture } from './franchise-137.js';
export async function openFixture(
  page,
  { signedIn = true, payload: suppliedPayload, owner = 'accessibility-test' } = {},
) {
  test.setTimeout(30000);

  const payload = suppliedPayload || demonFixture().payload;
  const stub = `const payload=${JSON.stringify(payload)};const chain=table=>{const q={};for(const key of ['select','eq','order','limit','in','not','or','insert','upsert','update','delete','range','neq','gte','lte','contains'])q[key]=()=>q;q.maybeSingle=async()=>({data:table==='anime_libraries'?{payload,updated_at:'2026-09-29T20:00:00Z'}:null,error:null});q.single=q.maybeSingle;q.then=(ok,fail)=>Promise.resolve({data:[],error:null}).then(ok,fail);return q};export default ()=>({auth:{getSession:async()=>({data:{session:${signedIn ? JSON.stringify({ user: { id: owner, email: 'fixture@example.com' } }) : 'null'}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:chain,rpc:()=>chain('rpc')});`;
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (/\/assets\/supabase-client\.[^/]+\.js$/.test(url.pathname))
      return route.fulfill({ contentType: 'application/javascript', body: stub });
    if (url.hostname === '127.0.0.1') return route.continue();
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        url.hostname === 'graphql.anilist.co'
          ? { data: { Page: { media: [], pageInfo: { hasNextPage: false } }, Media: null } }
          : { data: [], results: [] },
      ),
    });
  });
  await page.clock.setFixedTime(new Date('2026-09-30T12:00:00Z'));
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
}
