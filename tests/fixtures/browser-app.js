import { test } from '@playwright/test';
import { demonFixture } from './franchise-137.js';
export async function openFixture(
  page,
  {
    signedIn = true,
    payload: suppliedPayload,
    owner = 'accessibility-test',
    persistWrites = false,
  } = {},
) {
  test.setTimeout(30000);

  const payload = suppliedPayload || demonFixture().payload;
  let stub = `const payload=${JSON.stringify(payload)};window.__ATFixtureLibraryCalls={read:0,write:0};const chain=table=>{const q={};let write=false;for(const key of ['select','eq','order','limit','in','not','or','insert','upsert','update','delete','range','neq','gte','lte','contains'])q[key]=()=>{if(['insert','upsert','update','delete'].includes(key))write=true;return q};q.maybeSingle=async()=>{if(table==='anime_libraries')window.__ATFixtureLibraryCalls[write?'write':'read']++;return {data:table==='anime_libraries'?{payload,updated_at:'2026-09-29T20:00:00Z'}:null,error:null}};q.single=q.maybeSingle;q.then=(ok,fail)=>Promise.resolve({data:[],error:null}).then(ok,fail);return q};export default ()=>({auth:{getSession:async()=>({data:{session:${signedIn ? JSON.stringify({ user: { id: owner, email: 'fixture@example.com' } }) : 'null'}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:chain,rpc:()=>chain('rpc')});`;
  if (persistWrites) {
    const key = JSON.stringify('fixture-server-' + owner);
    stub = stub
      .replace('const payload=', 'let payload=')
      .replace(
        ';window.__ATFixtureLibraryCalls',
        `;payload=JSON.parse(sessionStorage.getItem(${key})||'null')||payload;window.__ATFixtureLibraryCalls`,
      );
    stub = stub
      .replace('let write=false;', 'let write=false,pendingPayload=null;')
      .replace('q[key]=()=>', 'q[key]=(...args)=>')
      .replace(
        'write=true;return q',
        'write=true;if(write&&args[0]?.payload)pendingPayload=args[0].payload;return q',
      );
    stub = stub.replace(
      'q.maybeSingle=async()=>{',
      `q.maybeSingle=async()=>{if(table==='anime_libraries'&&write&&pendingPayload){payload=pendingPayload;sessionStorage.setItem(${key},JSON.stringify(payload));}`,
    );
  }
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
