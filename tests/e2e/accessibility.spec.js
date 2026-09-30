import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openFixture } from '../fixtures/browser-app.js';

const errors = new WeakMap();
test.beforeEach(({ page }) => {
  errors.set(page, []);
  page.on('pageerror', (e) => errors.get(page).push(e.message));
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

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
