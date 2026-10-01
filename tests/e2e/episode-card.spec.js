import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';
const payload = {
  anime: [
    {
      id: 'episode-show',
      title: 'Dexter: Resurrection',
      status: 'watching',
      format: 'TV_SERIES',
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
  await page.locator('[data-episode-edit]').click();
  await expect(page.locator('.episode-card .release-journal')).toBeVisible();
  expect((await page.evaluate(() => window.ATMobile113.state())).history).toHaveLength(1);
  await page.locator('.episode-card-navigation [data-v98-move="1"]').click();
  await expect(page.locator('.episode-card-subtitle')).toContainText('Episodi 2');
  await expect(page.locator('.release-feedback')).toBeHidden();
  await expect(page.locator('.episode-card-badge')).toContainText('PËR T’U PARË');
  await expect(page.locator('.episode-card-providers a')).toHaveAttribute(
    'href',
    'https://cinehd.vc/home',
  );
  await expect(page.locator('.episode-card-providers img')).toBeVisible();
  await page.locator('.episode-card [data-episode-mark]').click();
  const journal = page.locator('.episode-card .release-journal');
  await expect(journal).toBeVisible();
  await journal.getByRole('button', { name: 'Kur doli', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.ATMobile113.state().history.at(-1).date))
    .toBe('2026-09-21T18:00:00.000Z');
  expect(
    (await page.evaluate(() => window.ATMobile113.state())).anime[0].seasons[0].watched,
  ).toEqual([1, 2]);
  await expect(dialog).toBeHidden();
});

test('anime episode links open Anisuge directly and unknown release dates stay disabled', async ({
  page,
}, info) => {
  const anime = structuredClone(payload);
  anime.anime[0].format = 'TV';
  anime.anime[0].title = 'One Piece';
  delete anime.anime[0].seasons[0].episodes[1].airedAt;
  await openFixture(page, { payload: anime });
  if (info.project.name.startsWith('iphone'))
    await page.locator('#mobile-history [data-mobile-action="episode"]').first().click();
  else {
    await page.locator('#library-nav').click();
    await page.locator('#anime-grid [data-detail="episode-show"]').first().click();
    await page.locator('#detail-body .ep-info-btn[data-episode-number="1"]').click();
  }
  await expect(page.locator('.episode-card-providers a')).toHaveAttribute(
    'href',
    'https://anisuge.org/',
  );
  await expect(page.locator('.episode-card-providers a')).toHaveAttribute('target', '_blank');
  const animeLink = 'https://anisuge.org/watch/fixture-season/ep-1';
  await page.locator('.episode-provider-link summary').click();
  await page.locator('[data-episode-watch-url]').fill(animeLink);
  await page.locator('[data-episode-watch-save]').click();
  await expect(page.locator('.episode-card-providers a')).toHaveAttribute('href', animeLink);

  await page.locator('.episode-card-navigation [data-v98-move="1"]').click();
  await expect(page.locator('.episode-card-providers a')).toHaveAttribute(
    'href',
    animeLink.replace('/ep-1', '/ep-2'),
  );
  await page.locator('.episode-card [data-episode-mark]').click();
  await expect(
    page
      .locator('.episode-card .release-journal')
      .getByRole('button', { name: 'Kur doli', exact: true }),
  ).toBeDisabled();
});

test('a saved episode link survives reload and does not leak into the next episode', async ({
  page,
}, info) => {
  await page.addInitScript((value) => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    if (!sessionStorage.getItem('seeded-watch-link')) {
      const key = 'animetrack_user_accessibility-test';
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem(
        key + '_pending_126',
        JSON.stringify({ baseRevision: '2026-09-29T20:00:00Z', savedAt: Date.now() }),
      );
      localStorage.setItem(key + '_revision_126', '2026-09-29T20:00:00Z');
      sessionStorage.setItem('seeded-watch-link', '1');
    }
  }, payload);
  await openFixture(page, { payload });
  async function openEpisode() {
    if (info.project.name.startsWith('iphone'))
      await page.locator('#mobile-history [data-mobile-action="episode"]').first().click();
    else {
      await page.locator('#library-nav').click();
      await page.locator('#anime-grid [data-detail="episode-show"]').first().click();
      await page.locator('#detail-body .ep-info-btn[data-episode-number="1"]').click();
    }
  }
  await openEpisode();
  await page.locator('.episode-provider-link summary').click();
  const input = page.locator('[data-episode-watch-url]');
  await input.fill('https://anisuge.org/watch/fixture-episode');
  await page.locator('[data-episode-watch-save]').click();
  await expect(page.locator('[data-episode-watch-status]')).toContainText('CineHD');
  const url = 'https://cinehd.vc/watch/fixture?episode=1';
  await input.fill(url);
  await page.locator('[data-episode-watch-save]').click();
  await expect(page.locator('.episode-card-providers a')).toHaveAttribute('href', url);
  await page.reload();
  await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
  await openEpisode();
  await expect(page.locator('.episode-card-providers a')).toHaveAttribute('href', url);
  await page.locator('.episode-card-navigation [data-v98-move="1"]').click();
  await expect(page.locator('.episode-card-providers a')).toHaveAttribute(
    'href',
    'https://cinehd.vc/home',
  );
  await page.locator('.episode-provider-link summary').click();
  await page.locator('[data-episode-watch-url]').fill('https://cinehd.vc/tv/5920');
  await page.locator('[data-episode-watch-save]').click();
  await page.locator('.episode-card-navigation [data-v98-move="-1"]').click();
  await expect(page.locator('.episode-card-providers a')).toHaveAttribute('href', url);
  await page.locator('.episode-card-navigation [data-v98-move="1"]').click();
  await expect(page.locator('.episode-card-providers a')).toHaveAttribute(
    'href',
    'https://cinehd.vc/tv/5920',
  );
  await expect(page.locator('.episode-card-providers')).toContainText('zgjidh episodin në CineHD');
});
