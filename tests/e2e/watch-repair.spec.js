import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';
const payload = {
  anime: [
    {
      hydrated: true,
      franchiseVersion: '13.1.0',
      id: 'clover',
      title: 'Black Clover',
      source: 'AniList',
      sourceId: 97940,
      malId: 34572,
      year: 2017,
      status: 'watching',
      format: 'TV',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      seasons: [
        {
          id: 'clover-s',
          title: 'Sezoni 1',
          format: 'TV',
          total: 3,
          watched: [1],
          episodes: [{ number: 1 }, { number: 2 }, { number: 3 }],
        },
      ],
    },
    {
      id: 'other',
      title: 'Other Anime',
      status: 'watching',
      format: 'TV',
      createdAt: '2026-01-01',
      updatedAt: '2026-09-30',
      seasons: [{ id: 'other-s', title: 'Sezoni 1', format: 'TV', total: 3, watched: [1] }],
    },
    {
      id: 'planned',
      title: 'Planned Anime',
      status: 'planning',
      format: 'TV',
      createdAt: '2026-09-30',
      seasons: [{ id: 'planned-s', title: 'Sezoni 1', format: 'TV', total: 3, watched: [] }],
    },
  ],
  history: [
    {
      id: 'other',
      seasonId: 'other-s',
      episode: 1,
      action: 'watched',
      date: '2026-09-29T20:00:00Z',
    },
  ],
  preferences: {},
};
async function library(page, info) {
  await page
    .locator(
      info.project.name.startsWith('iphone') ? '[data-mobile-nav="library"]' : '#library-nav',
    )
    .click();
}
test('manual progress appears in Diary, sorts first, persists and planned titles stay in their filter', async ({
  page,
}, info) => {
  await openFixture(page, { payload, persistWrites: true, owner: 'watch-repair' });
  await library(page, info);
  await expect(page.locator('#anime-grid [data-detail="planned"]')).toHaveCount(0);
  await page.locator('#anime-grid [data-detail="clover"]').first().click();
  if (info.project.name.startsWith('iphone'))
    await page.getByRole('button', { name: 'Reviews', exact: true }).click();
  await page.locator('#detail-body [data-edit="clover"]:visible').first().click();
  await page.locator('#anime-current').fill('2');
  await page.locator('#anime-form button[type="submit"]').click();
  await expect
    .poll(async () =>
      page.evaluate(() =>
        window.ATMobile113.state().history.some(
          (h) => h.id === 'clover' && h.action === 'watched' && h.episode === 2,
        ),
      ),
    )
    .toBe(true);

  await expect(page.locator('#anime-grid .anime-card').first()).toContainText('Black Clover');
  await page
    .locator(
      info.project.name.startsWith('iphone') ? '[data-mobile-nav="diary"]' : '#pro-nav-diary',
    )
    .click();
  await expect(page.locator('.at132-timeline')).toContainText('Black Clover');
  await expect(page.locator('.at132-timeline')).toContainText('Episodi 2');
  await expect(page.locator('.at132-undated')).toContainText('Black Clover');
  await page.screenshot({ path: info.outputPath('watch-diary.png') });
  await page.reload();
  await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
  await library(page, info);
  await expect(page.locator('#anime-grid .anime-card').first()).toContainText('Black Clover');
  await expect(page.locator('#anime-grid [data-detail="planned"]')).toHaveCount(0);
  const planned = page.locator('#library-status-strip [data-filter="planning"]');

  await planned.click();
  await expect(page.locator('#anime-grid')).toContainText('Planned Anime');
  await expect(page.locator('#anime-grid [data-detail="clover"]')).toHaveCount(0);
});
test('continuous anime episode image is fetched from the correct numbered provider season', async ({
  page,
}, info) => {
  await openFixture(page, { payload, persistWrites: true, owner: 'watch-art' });
  await page.route('**/api.tvmaze.com/search/shows?*', (r) =>
    r.fulfill({
      json: [
        { show: { id: 90001, name: 'Black Clover', type: 'Animation', premiered: '2017-10-03' } },
      ],
    }),
  );
  await page.route('**/api.tvmaze.com/shows/90001/episodes', (r) =>
    r.fulfill({
      json: [
        { id: 900011, season: 1, number: 1, name: 'First', airdate: '2017-10-03' },
        { id: 900012, season: 1, number: 2, name: 'Second', airdate: '2017-10-10' },
        {
          id: 900013,
          season: 2,
          number: 1,
          name: 'Third',
          airdate: '2017-10-17',
          image: { original: 'https://fixture.test/clover-third.svg' },
        },
      ],
    }),
  );
  await page.route('**/clover-third.svg', (r) =>
    r.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="#473772"/></svg>',
    }),
  );
  await library(page, info);
  await page.locator('#anime-grid [data-detail="clover"]').first().click();
  await page.locator('#detail-body .ep-info-btn[data-episode-number="3"]').click();
  const img = page.locator('.episode-card-art img');
  await expect(img).toHaveAttribute('src', 'https://fixture.test/clover-third.svg');
  await expect.poll(() => img.evaluate((e) => e.naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: info.outputPath('watch-episode-image.png') });
});
