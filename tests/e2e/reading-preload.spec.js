import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';
import { normalizeReadingLibrary } from '../../src/core/reading-model.js';

test('desktop reading covers finish loading before the library is opened', async ({
  page,
}, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Reading remains desktop only');
  const cover = 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/preload-test.jpg';
  const readingLibrary = normalizeReadingLibrary([
    {
      id: 'reading-preload',
      title: 'Prepared manga',
      cover,
      totalChapters: 20,
      publicationStatus: 'FINISHED',
    },
  ]);
  await openFixture(page, { payload: { anime: [], history: [], readingLibrary, preferences: {} } });
  await page.route(cover, (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="150"><rect width="100" height="150" fill="purple"/></svg>',
    }),
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#reading-view .reading-cover img')).toHaveCount(1);
  await expect(page.locator('#reading-view')).toBeHidden();
  await expect
    .poll(() =>
      page
        .locator('#reading-view .reading-cover img')
        .evaluate((image) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);
  await page.evaluate(() => {
    window.__preparedCover = document.querySelector('#reading-view .reading-cover img');
  });
  await page.locator('#pro-nav-reading').click();
  await expect(page.locator('#reading-view')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.querySelector('#reading-view .reading-cover img') === window.__preparedCover,
    ),
  ).toBe(true);
});
