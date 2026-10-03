import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';
import { demonFixture } from '../fixtures/franchise-137.js';
test.use({ serviceWorkers: 'block' });
test('supported player mapping marks once after opt-in and sufficient playback', async ({
  page,
}) => {
  const payload = demonFixture().payload,
    anime = payload.anime.find((a) => a.id === 'anime-demon'),
    season = anime.seasons[0];
  season.watched = [];
  payload.history = [];
  payload.preferences = {
    playerTracking: true,
    playerMappings: [
      {
        url: 'https://www.netflix.com/watch/7',
        animeId: anime.id,
        seasonId: season.id,
        episode: 5,
      },
    ],
  };
  await openFixture(page, { owner: 'player-user', persistWrites: true, payload });
  const progress = (playedRatio) =>
    page.evaluate(
      (detail) => document.dispatchEvent(new CustomEvent('animetrack-player-progress', { detail })),
      { url: 'https://www.netflix.com/watch/7', playedRatio },
    );
  await progress(0.5);
  expect(await page.evaluate(() => window.ATMobile113.state().anime[0].seasons[0].watched)).toEqual(
    [],
  );
  await progress(0.95);
  await expect
    .poll(() => page.evaluate(() => window.ATMobile113.state().anime[0].seasons[0].watched))
    .toEqual([5]);
  await progress(0.95);
  expect(await page.evaluate(() => window.ATMobile113.state().anime[0].seasons[0].watched)).toEqual(
    [5],
  );
});
test('detail tabs keep resume visible and save personal notes', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Phone has its own detail flow');
  const payload = demonFixture().payload,
    anime = payload.anime.find((a) => a.id === 'anime-demon');
  await openFixture(page, { owner: 'detail-tab-user', persistWrites: true, payload });
  await page.locator('#library-nav').click();
  await page.locator(`#anime-grid [data-detail="${anime.id}"]`).first().click();
  await expect(page.locator('.detail-section-tabs')).toBeVisible();
  await page.locator('[data-detail-section="notes"]').click();
  await page.locator('[name="personalNotes"]').fill('My personal notes');
  await page.locator('.detail-personal-notes button').click();
  expect(await page.evaluate(() => window.ATMobile113.state().anime[0].notes)).toBe(
    'My personal notes',
  );
  await page.locator('[data-detail-section="episodes"]').click();
  await expect(page.locator('#detail-body .episode-list')).toBeVisible();
  await expect(page.locator('.at123-resume-button')).toBeVisible();
});
