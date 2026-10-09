import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';

test('a stalled session offers retry, exits the boot screen and keeps the saved library', async ({
  page,
}) => {
  await openFixture(page);
  const key = 'animetrack_user_accessibility-test';
  const saved = await page.evaluate((key) => localStorage.getItem(key), key);
  await page.clock.install({ time: new Date('2026-10-10T12:00:00Z') });
  await page.route('**/assets/supabase-client.*.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: 'export default ()=>({auth:{getSession:()=>{window.__stalledSession=true;return new Promise(()=>{})}}});',
    }),
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__stalledSession);
  await page.clock.runFor(10500);
  await expect(page.locator('#startup-retry')).toBeVisible();
  await expect(page.locator('#startup-message')).toContainText('Llogaria po vonohet');
  await page.clock.runFor(2000);
  await expect(page.locator('#account-boot-screen')).toBeHidden();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(saved);
  await expect(page.locator('#welcome-page')).toBeVisible();
  await page.unroute('**/assets/supabase-client.*.js');
  await page.reload();
  await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
  expect(await page.evaluate(() => window.ATMobile113.state().anime.length)).toBeGreaterThan(0);
});

test('a stalled cloud read opens the verified local library without replacing progress', async ({
  page,
}) => {
  await openFixture(page);
  const before = await page.evaluate(() =>
    window.ATMobile113.state().anime.map((a) => ({
      id: a.id,
      watched: a.seasons.map((s) => s.watched),
    })),
  );
  await page.clock.install({ time: new Date('2026-10-10T12:00:00Z') });
  await page.route('**/assets/supabase-client.*.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `export default ()=>({auth:{getSession:async()=>({data:{session:{user:{id:'accessibility-test',email:'fixture@example.com'}}},error:null})},rpc:async()=>({data:null,error:null}),from:table=>{const q={};for(const name of ['select','eq','order','limit','in','not','or','update','delete','range','neq','gte','lte','contains'])q[name]=()=>q;q.maybeSingle=()=>{if(table==='anime_libraries'){window.__stalledRead=true;return new Promise(()=>{})}return Promise.resolve({data:null,error:null})};q.single=q.maybeSingle;q.then=(ok,fail)=>Promise.resolve({data:[],error:null}).then(ok,fail);return q}});`,
    }),
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__stalledRead);
  await page.clock.runFor(12500);
  await expect(page.locator('#account-boot-screen')).toBeHidden();
  await expect(page.locator('#welcome-page')).toBeHidden();
  await expect(page.locator('.app')).toBeVisible();
  expect(
    await page.evaluate(() =>
      window.ATMobile113.state().anime.map((a) => ({
        id: a.id,
        watched: a.seasons.map((s) => s.watched),
      })),
    ),
  ).toEqual(before);
  await expect(page.locator('#account-status')).toContainText('kopja lokale');
});
