import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';

const watched = (n) => Array.from({ length: n }, (_, i) => i + 1);
const nextAt = Date.parse('2026-09-30T13:00:00Z') / 1000;
const row = (id, part) => ({
  id,
  title: id,
  source: 'AniList',
  sourceId: id.replace(/\D/g, ''),
  format: 'TV',
  status: 'watching',
  hydrated: true,
  franchiseVersion: '13.1.0',
  notes: 'Private ' + id,
  seasons: [
    {
      id: id + '-s1',
      source: 'AniList',
      sourceId: id.replace(/\D/g, ''),
      format: 'TV',
      total: 12,
      watched: watched(8),
      releaseStatus: 'RELEASING',
      nextAiringAt: nextAt,
      nextAiringEpisode: 9,
      ...part,
    },
  ],
});
const payload = {
  anime: [
    row('Series 91001', {}),
    row('Series 91002', { watched: watched(7) }),
    row('Series 91003', {
      watched: watched(12),
      releaseStatus: 'FINISHED',
      nextAiringAt: 0,
      nextAiringEpisode: 0,
    }),
    row('Series 91004', { releaseStatus: '', nextAiringAt: 0, nextAiringEpisode: 0 }),
  ],
  history: [],
  preferences: {},
};

test('derived progress filters separate caught-up, finished and unknown without changing private data', async ({
  page,
}, info) => {
  await openFixture(page, { payload });
  const phone = info.project.name.startsWith('iphone');
  await page.locator(phone ? '[data-mobile-nav="library"]' : '#library-nav').click();
  const before = await page.evaluate(() => JSON.stringify(window.ATMobile113.state()));
  await page.locator('#mobile-library-controls > summary').click();
  const filter = page.locator('#library-progress-filter');
  await expect(filter).toBeVisible();
  for (const [key, title] of [
    ['caught-up', 'Series 91001'],
    ['continue', 'Series 91002'],
    ['finished', 'Series 91003'],
    ['unknown', 'Series 91004'],
  ]) {
    await filter.selectOption(key);
    await expect(page.locator('#anime-grid .anime-card')).toHaveCount(1);
    await expect(page.locator('#anime-grid .card-title')).toHaveText(
      title + ' ›'.repeat(phone ? 0 : 1),
    );
  }
  await filter.selectOption('all');
  await expect(page.locator('#anime-grid .anime-card')).toHaveCount(4);
  expect(await page.evaluate(() => JSON.stringify(window.ATMobile113.state()))).toBe(before);
  await page.screenshot({ path: info.outputPath('series-progress.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await filter.selectOption('caught-up');
  await page.locator('#anime-grid [data-detail]').first().click();
  await expect(page.locator('.title-workspace-summary')).toContainText('Në hap me episodet');
  expect(await page.evaluate(() => JSON.stringify(window.ATMobile113.state()))).toBe(before);
});
