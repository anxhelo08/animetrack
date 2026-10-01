import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';
const payload = {
  anime: [
    {
      id: 'episode-show',
      title: 'Dexter: Resurrection',
      status: 'watching',
      format: 'TV',
      seasons: [
        {
          id: 'season1',
          title: 'Sezoni 1',
          format: 'TV',
          total: 3,
          watched: [1],
          episodes: [
            {
              number: 1,
              title: 'Camera Shy',
              summary: 'Përshkrimi i verifikuar i episodit.',
              image: 'https://fixture.test/episode-test.jpg',
              imageSource: 'TVMaze',
              runtime: 48,
              airedAt: '2026-09-20T18:00:00Z',
              detailsCheckedAt: '2026-09-30T12:00:00Z',
              fillerChecked: true,
            },
            { number: 2, airedAt: '2026-09-21T18:00:00Z' },
            { number: 3, airedAt: '2026-09-22T18:00:00Z' },
          ],
        },
      ],
    },
  ],
  history: [
    {
      eventId: 'episode-seen',
      id: 'episode-show',
      seasonId: 'season1',
      episode: 1,
      action: 'watched',
      date: '2026-09-29T20:00:00Z',
    },
  ],
  preferences: { weeklyGoal: 10 },
};
test('a watched episode opens a centered card with artwork and saves stars without removing progress', async ({
  page,
}, info) => {
  await openFixture(page, { payload });
  await page.route('**/episode-test.jpg', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="#271423"/><circle cx="380" cy="190" r="135" fill="#873d44"/></svg>',
    }),
  );
  if (info.project.name.startsWith('iphone'))
    await page.locator('#mobile-history [data-mobile-action="episode"]').first().click();
  else {
    await page.locator('#library-nav').click();
    await page.locator('#anime-grid [data-detail="episode-show"]').first().click();
    await page.locator('#detail-body .ep-info-btn[data-episode-number="1"]').click();
  }
  const dialog = page.locator('#episode-detail-modal .ep-detail-dialog');
  await expect(dialog).toBeVisible();
  await expect(page.locator('.episode-card-subtitle')).toContainText('Camera Shy');
  await expect(page.locator('.episode-card-badge')).toContainText('I PARË');
  await expect(page.locator('.episode-card-art img')).toBeVisible();
  await expect(page.locator('.episode-card-meta')).toContainText('48 min');
  const viewport = page.viewportSize();
  await expect
    .poll(async () => {
      const rect = await dialog.boundingBox();
      return Math.max(
        Math.abs(rect.x + rect.width / 2 - viewport.width / 2),
        Math.abs(rect.y + rect.height / 2 - viewport.height / 2),
      );
    })
    .toBeLessThan(3);
  await page.locator('[data-episode-stars="4"]').click();
  await expect(page.locator('[data-episode-stars="4"]')).toHaveAttribute('aria-pressed', 'true');
  const state = await page.evaluate(() => window.ATMobile113.state());
  expect(state.anime[0].seasons[0].watched).toEqual([1]);
  expect(state.anime[0].seasons[0].episodes[0].personalRating).toBe(8);
  expect(state.history).toHaveLength(1);
  expect(state.history[0].diaryRating).toBe(8);
  await page.screenshot({ path: info.outputPath('episode-card.png') });
  await page.locator('.episode-card-more summary').click();
  await page.locator('[data-episode-stars="3"]').click();
  await expect(page.locator('.episode-card-more')).toHaveAttribute('open', '');
  await page.locator('.episode-card-navigation [data-v98-move="1"]').click();
  await expect(page.locator('.episode-card-subtitle')).toContainText('Episodi 2');
  await expect(page.locator('.episode-card-badge')).toContainText('PËR T’U PARË');
  await page.locator('[data-close="episode-detail-modal"]').click();
  await expect(dialog).toBeHidden();
});
