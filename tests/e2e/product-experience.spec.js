import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openFixture } from '../fixtures/browser-app.js';
const empty = { anime: [], history: [], preferences: { weeklyGoal: 10, notificationRead: [] } };
async function audit(page, selector) {
  const result = await new AxeBuilder({ page })
    .include(selector)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    result.violations.map((x) => ({
      id: x.id,
      nodes: x.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  ).toEqual([]);
}

test('first account completes three steps without adding demo data and can import its own copy', async ({
  page,
}, info) => {
  await openFixture(page, { payload: empty, owner: 'first-experience' });
  const guide = page.locator('#product-onboarding');
  await expect(guide).toBeVisible();
  await page.screenshot({ path: info.outputPath('first-run.png') });
  await audit(page, '#product-onboarding');
  await expect(guide).toContainText('Hapi 1 nga 3');
  await page.locator('[data-product-action="guide-next"]').click();
  await expect(guide).toContainText('Hapi 2 nga 3');
  await page.locator('[data-product-action="guide-back"]').click();
  await expect(guide).toContainText('Hapi 1 nga 3');
  await page.locator('[data-product-action="guide-next"]').click();
  await page.locator('[data-product-action="guide-next"]').click();
  await expect(guide).toContainText('Hapi 3 nga 3');
  await page.locator('[data-product-action="guide-finish"]').click();
  await expect(page.locator('#explore-view')).toBeVisible();
  expect(await page.evaluate(() => window.ATMobile113.state().anime.length)).toBe(0);
  await page.reload();
  await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
  await expect(guide).not.toBeVisible();
  await expect(
    page.locator(
      info.project.name.startsWith('iphone') ? '#mobile-continue' : '#product-home-empty',
    ),
  ).toBeVisible();
  if (info.project.name.startsWith('iphone'))
    await page.locator('[data-mobile-nav="library"]').click();
  else await page.locator('#library-nav').click();
  await expect(page.locator('#product-library-empty')).toBeVisible();
  const chooser = page.waitForEvent('filechooser');
  await page.locator('[data-product-action="import"]').click();
  await chooser;
});

test('primary destinations retain secondary tools and details put progress first', async ({
  page,
}, info) => {
  await openFixture(page);
  await expect(page.locator('#product-onboarding')).not.toBeVisible();
  await expect(page.locator('#side-nav > button')).toHaveCount(6);
  const mobile = info.project.name.startsWith('iphone');
  async function go(name, id) {
    await page.locator(mobile ? `[data-mobile-nav="${name}"]` : '#' + id).click();
  }
  await go('explore', 'explore-nav');
  await page.locator('#seasons-nav').click();
  await expect(page.locator('#seasons-view')).toBeVisible();
  await go('diary', 'pro-nav-diary');
  await page.locator('#pro-nav-calendar').click();
  await expect(page.locator('#page-title')).toHaveText('Kalendari');
  await go('profile', 'pro-nav-profile');
  await page.locator('[data-product-action="settings"]').click();
  await expect(page.locator('#product-advanced')).toBeVisible();
  await expect(page.locator('#tmdb-token-input')).not.toBeVisible();
  await page.locator('#product-advanced > details > summary').click();
  await page.locator('#movie-provider-settings > summary').click();
  await expect(page.locator('#tmdb-token-input')).toBeVisible();
  await go('library', 'library-nav');
  await expect(page.locator('#product-advanced')).not.toBeVisible();
  const before = await page.evaluate(() => JSON.stringify(window.ATMobile113.state().anime));
  await page.locator('#anime-grid .at120-card-poster').click();
  if (mobile) {
    await expect(page.locator('#detail-body > :first-child')).toHaveClass(/mobile-detail-hero/);
    await expect(page.locator('.mobile-detail-cta')).toContainText('Vazhdo');
    await expect(page.locator('.mobile-watch-next')).toContainText('WATCH NEXT');
  } else {
    await expect(page.locator('#detail-body > :first-child')).toHaveClass('product-progress');
    await expect(page.locator('.product-progress')).toContainText('23 nga 65');
    await expect(page.locator('.product-progress')).toContainText('Episodi');
  }
  await expect(page.locator('.product-secondary')).toHaveCount(2);
  expect(await page.locator('.product-secondary[open]').count()).toBe(mobile ? 1 : 0);
  await page.screenshot({ path: info.outputPath('detail-progress.png') });
  await audit(page, mobile ? '.mobile-watch-next' : '.product-progress');
  await page.locator('#detail-modal [data-close="detail-modal"]').click();
  expect(await page.evaluate(() => JSON.stringify(window.ATMobile113.state().anime))).toBe(before);
  await page.context().setOffline(true);
  await expect(page.locator('#product-sync')).toContainText('Pa internet');
  await page.context().setOffline(false);
  await expect(page.locator('#product-sync')).not.toContainText('Pa internet');
});

test('failed catalogue search exposes retry and removes its loading skeleton', async ({
  page,
}, info) => {
  await openFixture(page);
  let fail = true;
  await page.route('https://**/*', async (route) => {
    const url = route.request().url();
    if (!/graphql|jikan|tvmaze|cinemeta|wikidata/.test(url)) return route.fallback();
    await new Promise((resolve) => setTimeout(resolve, 400));
    return route.fulfill({
      status: fail ? 503 : 200,
      contentType: 'application/json',
      body: JSON.stringify(
        url.includes('graphql')
          ? { data: { Page: { media: [], pageInfo: { hasNextPage: false } } } }
          : { data: [], results: [] },
      ),
    });
  });
  await page
    .locator(
      info.project.name.startsWith('iphone') ? '[data-mobile-nav="explore"]' : '#explore-nav',
    )
    .click();
  await page.locator('#global-search').fill('Missing title');
  await expect(page.locator('.product-skeleton-card').first()).toBeVisible();
  await expect(page.locator('[data-product-action="retry-search"]')).toBeVisible();
  await expect(page.locator('.product-skeleton-card')).toHaveCount(0);
  fail = false;
  await page.locator('[data-product-action="retry-search"]').click();
  await expect(page.locator('#catalog-grid')).toContainText('Nuk u gjet asnjë titull');
  expect(await page.evaluate(() => window.ATMobile113.state().anime.length)).toBe(1);
});
