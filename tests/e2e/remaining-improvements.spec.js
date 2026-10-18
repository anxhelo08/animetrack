import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';
test.use({ serviceWorkers: 'block' });
const anime = (id, title, status = 'watching') => ({
  id,
  title,
  status,
  source: 'AniList',
  sourceId: id.replace(/\D/g, ''),
  format: 'TV',
  hydrated: true,
  franchiseVersion: '13.1.0',
  notes: 'private',
  seasons: [
    {
      id: id + '-s',
      title: 'Sezoni 1',
      source: 'AniList',
      sourceId: id.replace(/\D/g, ''),
      format: 'TV',
      releaseStatus: 'FINISHED',
      total: 3,
      watched: [],
    },
  ],
});
async function library(page, info) {
  await page
    .locator(
      info.project.name.startsWith('iphone') ? '[data-mobile-nav="library"]' : '#library-nav',
    )
    .click();
}

test('one filter panel explains active constraints, clears them and loads enrichment only for details', async ({
  page,
}, info) => {
  const scripts = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(r.url());
  });
  await openFixture(page, {
    payload: {
      anime: [anime('a101', 'Alpha'), anime('a102', 'Beta'), anime('a103', 'Planned', 'planning')],
      history: [],
      preferences: {},
    },
  });
  expect(scripts.some((s) => /\/(watch|rich-details)\./.test(s))).toBe(false);
  await library(page, info);
  const before = await page.evaluate(() => JSON.stringify(window.ATMobile113.state()));
  const panel = page.locator('#mobile-library-controls');
  await expect(panel).not.toHaveAttribute('open', '');
  await expect(page.locator('#anime-grid .anime-card')).toHaveCount(2);
  await page.locator('#at113-library-search').fill('Alpha');
  await panel.locator('summary').click();
  await page.locator('#library-progress-filter').selectOption('continue');
  await page.locator('[data-media-filter="anime"]').click();
  await expect(page.locator('#anime-grid .anime-card')).toHaveCount(1);
  await expect(page.locator('#library-active-filters')).toContainText('alpha');
  await expect(page.locator('#library-active-filters')).toContainText('Për të vazhduar');
  await page.locator('[data-clear-library="all"]').click();
  await expect(page.locator('#at113-library-search')).toHaveValue('');
  await expect(page.locator('#library-progress-filter')).toHaveValue('all');
  await expect(page.locator('#anime-grid .anime-card')).toHaveCount(2);
  expect(await page.evaluate(() => JSON.stringify(window.ATMobile113.state()))).toBe(before);
  await page.locator('#library-status-strip [data-filter="planning"]').click();
  await expect(page.locator('#anime-grid .anime-card')).toHaveCount(1);
  await expect(page.locator('#anime-grid')).toContainText('Planned');
  await page.screenshot({ path: info.outputPath('library-filter-panel.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#anime-grid [data-detail]').first().click();
  await expect.poll(() => scripts.some((s) => /\/watch\./.test(s))).toBe(true);
  await expect.poll(() => scripts.some((s) => /\/rich-details\./.test(s))).toBe(true);
  await expect(page.locator('#detail-body .at133-watch')).toBeAttached();
});

test('one mapping per season persists across pages and supports episode exceptions before preview', async ({
  page,
}) => {
  const a = anime('a101', 'Show');
  a.traktId = 1;
  a.seasons = Array.from({ length: 13 }, (_, i) => ({
    ...a.seasons[0],
    id: 's' + (i + 1),
    title: 'Sezoni ' + (i + 1),
    sourceId: String(100 + i),
  }));
  await openFixture(page, {
    payload: { anime: [a], history: [], preferences: {} },
    accessToken: 'fixture-token',
  });
  await page.route('**/functions/v1/anime-connected', (r) =>
    r.fulfill({ json: { records: [], lists: [], feeds: [], traktConfigured: false } }),
  );
  await page.locator('#pro-nav-sync').evaluate((el) => el.click());
  const rows = Array.from({ length: 13 }, (_, i) =>
    [1, 2].map((n) => ({
      show: { title: 'Show', ids: { trakt: 1 } },
      episode: { season: i + 1, number: n, ids: { trakt: (i + 1) * 100 + n } },
      watched_at: `2026-09-${String(i + 1).padStart(2, '0')}T12:00:00Z`,
    })),
  ).flat();
  await expect(page.locator('#connected-trakt-file')).toBeEnabled();
  await page.locator('#connected-trakt-file').setInputFiles({
    name: 'history.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(rows)),
  });
  await expect(page.locator('.connected-import-group')).toHaveCount(10);
  await page.locator('[data-import-map="group-0"]').selectOption('a101|s1');
  await page.locator('[data-connected="import-exceptions"][data-id="group-0"]').click();
  await page.locator('.connected-import-exceptions select').nth(1).selectOption('');
  await page.locator('[data-connected="import-next"]').click();
  await expect(page.locator('.connected-import-group')).toHaveCount(3);
  await page.locator('[data-import-map="group-12"]').selectOption('a101|s13');
  await page.locator('[data-connected="import-prev"]').click();
  await expect(page.locator('[data-import-map="group-0"]')).toHaveValue('a101|s1');
  await expect(page.locator('.connected-import-exceptions select').nth(1)).toHaveValue('');
  const before = await page.evaluate(() => JSON.stringify(window.ATMobile113.state()));
  await page.locator('[data-connected-form="import"] button.primary').click();
  await expect(page.locator('[data-connected-root]')).toContainText('3 shikime të reja');
  expect(await page.evaluate(() => JSON.stringify(window.ATMobile113.state()))).toBe(before);
  await page.screenshot({
    path: test.info().outputPath('grouped-import-preview.png'),
    fullPage: true,
  });
  await page.locator('[data-connected="import-apply"]').click();
  await expect.poll(() => page.evaluate(() => window.ATMobile113.state().history.length)).toBe(3);
  expect(await page.evaluate(() => window.ATMobile113.state().anime[0].notes)).toBe('private');
});
