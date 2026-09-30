import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { demonFixture } from '../fixtures/franchise-137.js';

const errors = new WeakMap();
test.beforeEach(({ page }) => {
  errors.set(page, []);
  page.on('pageerror', (e) => errors.get(page).push(e.message));
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

async function openFixture(page, { signedIn = true } = {}) {
  test.setTimeout(30000);

  const { payload } = demonFixture();
  const stub = `const payload=${JSON.stringify(payload)};const chain=table=>{const q={};for(const key of ['select','eq','order','limit','in','not','or','insert','upsert','update','delete','range','neq','gte','lte','contains'])q[key]=()=>q;q.maybeSingle=async()=>({data:table==='anime_libraries'?{payload,updated_at:'2026-09-29T20:00:00Z'}:null,error:null});q.single=q.maybeSingle;q.then=(ok,fail)=>Promise.resolve({data:[],error:null}).then(ok,fail);return q};export default ()=>({auth:{getSession:async()=>({data:{session:${signedIn ? "{user:{id:'accessibility-test',email:'fixture@example.com'}}" : 'null'}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:chain,rpc:()=>chain('rpc')});`;
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
async function audit(page, testInfo, name, selector) {
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']);
  if (selector) builder.include(selector);
  const result = await builder.analyze();
  await testInfo.attach(name + '-axe.json', {
    body: JSON.stringify(result, null, 2),
    contentType: 'application/json',
  });
  expect(
    result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  ).toEqual([]);
}

test('login and signup pass WCAG AA checks', async ({ page }, testInfo) => {
  await openFixture(page, { signedIn: false });
  await expect(page.locator('#account-modal.show')).toBeVisible();
  await audit(page, testInfo, 'login', '#account-modal');
  await page.locator('#at116-tab-signup').click();
  await audit(page, testInfo, 'signup', '#account-modal');
});

test('home, library and details are accessible by keyboard and touch', async ({
  page,
}, testInfo) => {
  await openFixture(page);
  await expect(page.locator('#home-view')).toBeVisible();
  await audit(page, testInfo, 'home');
  const mobile = testInfo.project.name.startsWith('iphone');
  if (mobile) await page.locator('.at-mobile-nav [data-mobile-nav="library"]').click();
  else await page.locator('#library-nav').click();
  await expect(page.locator('#anime-grid .anime-card')).toHaveCount(1);
  await audit(page, testInfo, 'library');
  if (!mobile) {
    await page.locator('.skip-link').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  }
  const poster = page.locator('#anime-grid .at120-card-poster').first();
  await poster.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#detail-modal.show')).toBeVisible();
  await audit(page, testInfo, 'detail', '#detail-modal');
  await page.keyboard.press('Escape');
  await expect(page.locator('#detail-modal')).not.toBeVisible();
  await expect(poster).toBeFocused();
  if (mobile) {
    const small = await page
      .locator('#anime-grid button:visible,.at-mobile-nav button:visible')
      .evaluateAll((nodes) =>
        nodes
          .filter((n) => {
            const r = n.getBoundingClientRect();
            return r.width < 44 || r.height < 44;
          })
          .map((n) => n.outerHTML),
      );
    expect(small).toEqual([]);
  }
  // Frozen time, synthetic data and no external images keep committed baselines stable.
  if (testInfo.project.name === 'iphone-webkit') return;
  await expect(page.locator('#anime-grid')).toHaveScreenshot('library.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.01,
    stylePath: 'tests/fixtures/screenshot.css',
  });
});
