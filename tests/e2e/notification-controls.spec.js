import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';
import { normalizeReadingLibrary } from '../../src/core/reading-model.js';
test.use({ serviceWorkers: 'block' });

test('notification bulk controls persist without marking chapters as read, and open on phones', async ({
  page,
}, info) => {
  const rows = normalizeReadingLibrary([
    {
      id: 'reading-notice',
      title: 'Manhwa notices',
      kind: 'manhwa',
      totalChapters: 3,
      chaptersRead: [1],
      chapterReleases: [
        { chapter: 2, date: '2026-09-29T12:00:00Z' },
        { chapter: 3, date: '2026-09-29T13:00:00Z' },
      ],
    },
  ]);
  await openFixture(page, {
    owner: 'notice-test',
    persistWrites: true,
    payload: { anime: [], readingLibrary: rows, history: [], preferences: {} },
  });
  if (info.project.name.startsWith('iphone')) {
    await page.locator('[data-mobile-nav="library"]').click();
    await page.locator('#library-view [data-pro-page="reading"]').click();
  } else await page.locator('#pro-nav-reading').click();
  await page.locator('#reading-view [data-reading-action="tab"][data-id="releases"]').click();
  await page.locator('[data-pro-action="notification-reading"]').click();
  await expect(page.locator('.at-notice.unread')).toHaveCount(2);
  await page.locator('[data-pro-action="notification-read-category"]').click();
  await expect(page.locator('.at-notice.unread')).toHaveCount(0);
  await page.locator('[data-pro-action="notification-mark-unread"]').first().click();
  await expect(page.locator('.at-notice.unread')).toHaveCount(1);
  await page.locator('#pro-content [data-pro-action="notification-read-all"]').click();
  await expect(page.locator('.at-notice.unread')).toHaveCount(0);
  expect(
    await page.evaluate(() => window.ATMobile113.state().readingLibrary[0].chaptersRead),
  ).toEqual([1]);
  expect(
    await page.evaluate(() => window.ATMobile113.state().preferences.notificationRead.length),
  ).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('notification-controls.png'), fullPage: true });
  await page.locator('[data-pro-action="notification-open"]').first().click();
  await expect(page.locator('#reading-detail-title')).toHaveText('Manhwa notices');
  await page.reload();
  await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
  expect(
    await page.evaluate(() => window.ATMobile113.state().preferences.notificationRead.length),
  ).toBe(2);
  expect(
    await page.evaluate(() => window.ATMobile113.state().readingLibrary[0].chaptersRead),
  ).toEqual([1]);
});
