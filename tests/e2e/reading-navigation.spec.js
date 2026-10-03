import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openFixture } from '../fixtures/browser-app.js';
import { normalizeReadingLibrary } from '../../src/core/reading-model.js';
test.use({ serviceWorkers: 'block' });
const rows = normalizeReadingLibrary([
  {
    id: 'reading-al-1',
    sourceId: '1',
    title: 'Manga Story',
    kind: 'manga',
    totalChapters: 10,
    publicationStatus: 'FINISHED',
    chapterReleases: [{ chapter: 10, date: '2026-09-29T12:00:00Z', detected: false }],
  },
  {
    id: 'reading-al-2',
    sourceId: '2',
    title: 'Manhwa Story',
    kind: 'manhwa',
    totalChapters: 20,
    publicationStatus: 'FINISHED',
    chapterReleases: [{ chapter: 20, date: '2026-09-28T12:00:00Z', detected: true }],
  },
]);
test('reading destinations retain Manga or Manhwa scope and calendar publication meaning', async ({
  page,
}, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Reading remains desktop only');
  await openFixture(page, {
    payload: { anime: [], history: [], readingLibrary: rows, preferences: {} },
  });
  await page.locator('#pro-nav-reading').click();
  await expect(page.locator('.reading-tabs [data-reading-action="tab"]')).toHaveCount(4);
  await page.locator('.reading-scope [data-id="manhwa"]').click();
  await expect(page.locator('.reading-card')).toHaveCount(1);
  await expect(page.locator('.reading-card')).toContainText('Manhwa Story');
  await page.locator('.reading-tabs [data-id="calendar"]').click();
  await expect(page.locator('.reading-calendar')).toContainText('Manhwa Story');
  await expect(page.locator('.reading-calendar')).toContainText('Zbuluar në katalog');
  await expect(page.locator('.reading-calendar')).not.toContainText('Manga Story');
  await page.locator('.reading-scope [data-id="manga"]').click();
  await expect(page.locator('.reading-calendar')).toContainText('Publikuar në burim');
  await page.locator('#reading-calendar-month').fill('2026-10');
  await expect(page.locator('.reading-calendar')).toContainText('Pa publikime në këtë muaj');
  await page.locator('[data-reading-action="calendar-today"]').click();
  await expect(page.locator('#reading-calendar-month')).toHaveValue('2026-09');
  await expect(page.locator('.reading-calendar')).toContainText('Manga Story');
  await page.locator('.reading-tabs [data-id="releases"]').click();
  await expect(page.locator('.reading-card')).toHaveCount(1);
  await expect(page.locator('.reading-card')).toContainText('Manga Story');
  await page.locator('#reading-tools').selectOption('collections');
  await expect(page.locator('#reading-collection-create')).toBeVisible();
  await page.locator('.reading-tabs [data-id="library"]').click();
  const audit = await new AxeBuilder({ page })
    .include('#reading-view')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  for (const width of [1440, 1024, 800]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page
        .locator('.reading-navigation')
        .evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath('reading-navigation-' + width + '.png'),
      fullPage: true,
    });
  }
});
test('fast search results remain usable while another catalog is delayed or blocked', async ({
  page,
}, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Reading remains desktop only');
  await openFixture(page, {
    payload: { anime: [], history: [], readingLibrary: [], preferences: {} },
  });
  let finish;
  await page.route('**/api/weebcentral?**', async (route) => {
    const q = new URL(route.request().url()).searchParams.get('q');
    if (q)
      await new Promise((resolve) => {
        finish = resolve;
        setTimeout(resolve, 10000);
      });
    await route.fulfill({ status: 403, json: { error: 'Provider unavailable' } });
  });
  await page.route('https://graphql.anilist.co', (route) =>
    route.fulfill({
      json: {
        data: {
          Page: {
            pageInfo: { hasNextPage: false },
            media: [
              {
                id: 100,
                idMal: 50,
                type: 'MANGA',
                countryOfOrigin: 'KR',
                title: { english: 'Omniscient Reader' },
                chapters: 0,
              },
            ],
          },
        },
      },
    }),
  );
  await page.route('https://api.jikan.moe/v4/manga?**', (route) =>
    route.fulfill({
      json: {
        data: [
          { mal_id: 50, title: 'Omniscient Reader', type: 'Manhwa' },
          { mal_id: 51, title: 'Reader Side Story', type: 'Manhwa' },
        ],
        pagination: { has_next_page: false },
      },
    }),
  );
  await page.locator('#pro-nav-reading').click();
  await page.locator('.reading-tabs [data-id="discover"]').click();
  await page.locator('.reading-scope [data-id="manhwa"]').click();
  await page.locator('#reading-query').fill('Reader');
  await expect(page.locator('.reading-card')).toHaveCount(2);
  await expect(page.locator('.reading-results-meta')).toContainText(
    'Po kontrolloj burimet e tjera',
  );
  await expect.poll(() => Boolean(finish)).toBe(true);
  finish();
  await expect(page.locator('.reading-grid')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.reading-card')).toHaveCount(2);
  await expect(page.locator('.reading-results-meta')).toContainText('AniList');
  await page.getByRole('button', { name: 'Omniscient Reader', exact: true }).click();
  await expect(page.locator('#reading-detail-title')).toHaveText('Omniscient Reader');
});
