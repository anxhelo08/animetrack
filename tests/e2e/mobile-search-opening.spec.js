import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';

test('phone search opens and accepts typing before discovery refreshes finish', async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== 'iphone-chromium',
    'Mobile interaction with Chromium CPU throttling.',
  );
  await openFixture(page, {
    owner: 'search-opening',
    payload: {
      anime: Array.from({ length: 500 }, (_, index) => ({
        id: 'search-library-' + index,
        title: 'Historia ' + index,
        status: 'watching',
        format: 'TV',
        hydrated: true,
        franchiseVersion: '13.1.0',
        createdAt: '2026-09-29T12:00:00Z',
        updatedAt: '2026-09-29T12:00:00Z',
        seasons: [
          {
            id: 'search-part-' + index,
            title: 'Sezoni 1',
            format: 'TV',
            total: 12,
            watched: [1],
            releaseStatus: 'FINISHED',
            releaseStart: '2020-01-01',
          },
        ],
      })),
      history: [],
      preferences: {},
    },
  });
  test.setTimeout(90000);
  await expect(page.locator('#mobile-continue .watch-row')).toHaveCount(20);
  let releaseNetwork;
  const held = new Promise((resolve) => {
    releaseNetwork = resolve;
  });
  await page.route('https://graphql.anilist.co', async (route) => {
    await held;
    await route.fulfill({
      contentType: 'application/json',
      body: '{"data":{"Page":{"media":[]}}}',
    });
  });
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  try {
    await page.evaluate(() => {
      window.hiddenDiscoveryChanges = 0;
      new MutationObserver((records) => {
        window.hiddenDiscoveryChanges += records.length;
      }).observe(document.getElementById('at117-mobile-discover'), {
        childList: true,
        subtree: true,
      });
    });
    for (const selector of [
      '[data-mobile-action="search"]',
      '.at-mobile-nav [data-mobile-nav="explore"]',
    ]) {
      const milliseconds = await page.evaluate(async (target) => {
        const start = performance.now();
        document.querySelector(target).click();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const field = document.getElementById('global-search');
        const rect = field.getBoundingClientRect();
        if (
          document.body.dataset.mobilePage !== 'explore' ||
          rect.width <= 0 ||
          rect.top < 0 ||
          rect.top >= innerHeight
        )
          throw Error('Search did not open in the viewport');
        return performance.now() - start;
      }, selector);
      console.log('Mobile search opening at 4x CPU:', Math.round(milliseconds), 'ms');
      expect(milliseconds).toBeLessThan(750);
      if (selector.startsWith('[data-mobile-action'))
        await expect(page.locator('#global-search')).toBeFocused();
      await page.locator('#global-search').fill('Naruto');
      await expect(page.locator('#global-search')).toHaveValue('Naruto');
      await page.locator('[data-mobile-nav="home"]').click();
      await expect(page.locator('#mobile-continue')).toBeVisible();
    }
    expect(await page.evaluate(() => window.hiddenDiscoveryChanges)).toBe(0);
    expect(await page.evaluate(() => window.ATMobile113.state().anime.length)).toBe(500);
  } finally {
    releaseNetwork();
    await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
});
