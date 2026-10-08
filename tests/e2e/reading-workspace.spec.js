import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';
import { normalizeReadingLibrary } from '../../src/core/reading-model.js';
import { sharedListURL } from '../../src/modules/shared-lists.js';
test.use({ serviceWorkers: 'block' });
const rows = normalizeReadingLibrary([
  {
    id: 'reading-al-7',
    sourceId: '7',
    title: 'My Fantasy',
    kind: 'manga',
    genres: 'Fantasy, Action',
    rating: 9,
    totalChapters: 10,
    chaptersRead: [1],
    notes: 'private',
    publicationStatus: 'FINISHED',
    journal: [],
  },
  {
    id: 'reading-al-8',
    sourceId: '8',
    title: 'A Long Manhwa Title That Should Stay Compact',
    kind: 'manhwa',
    totalChapters: 0,
    chaptersRead: [1, 2, 3],
    journal: [],
  },
]);
async function setup(page) {
  await openFixture(page, {
    owner: 'workspace-user',
    persistWrites: true,
    payload: { anime: [], history: [], readingLibrary: rows, preferences: {} },
  });
  await page.locator('#pro-nav-reading').click();
  await expect(page.locator('#reading-query')).toBeVisible();
}
const tab = (page, name) => ({
  click: () =>
    ['library', 'discover', 'calendar', 'releases'].includes(name)
      ? page.locator(`#reading-view [data-reading-action="tab"][data-id="${name}"]`).click()
      : page.locator('#reading-tools').selectOption(name),
});
test('reading collections, weekly goal, density, scoped keyboard and shared URLs work', async ({
  page,
}, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Reading remains desktop only');
  await setup(page);
  await page.locator('.reading-library-more summary').click();
  await page.locator('#reading-density').selectOption('compact');
  await page.locator('.reading-library-more summary').click();
  await expect(page.locator('#reading-view')).toHaveClass(/reading-density-compact/);
  await tab(page, 'collections').click();
  await page.locator('#reading-collection-create input').fill('Për fundjavë');
  await page.locator('#reading-collection-create button').click();
  await page.locator('[data-reading-collection-item="reading-al-7"]').check();
  await tab(page, 'statistics').click();
  await page.locator('#reading-goal-form input').fill('15');
  await page.locator('#reading-goal-form button').click();
  await expect(page.locator('.reading-goal strong')).toHaveText('0 / 15');
  await page.keyboard.press('Control+k');
  await page.locator('#at124-command-input').fill('My Fantasy');
  await expect(page.locator('#at124-command-results')).toContainText('Manga · Hap kapitujt');
  await expect(page.locator('#at124-command-results')).not.toContainText('anime dhe seriale');
  await page.keyboard.press('Enter');
  await expect(page.locator('#reading-detail-title')).toHaveText('My Fantasy');
  await page
    .locator('.reading-detail-tabs [data-reading-action="detail-tab"][data-id="notes"]')
    .click();
  await page.locator('[name="notes"]').fill('Unfinished note');
  await page.locator('[data-reading-action="detail-tab"][data-id="chapters"]').click();
  await page
    .locator('.reading-detail-tabs [data-reading-action="detail-tab"][data-id="notes"]')
    .click();
  await expect(page.locator('[name="notes"]')).toHaveValue('Unfinished note');
  await page.evaluate(
    (hash) => {
      location.hash = hash;
    },
    new URL(sharedListURL('Për fundjavë', rows)).hash,
  );
  await expect(page.locator('#shared-list-preview')).toBeVisible();
  await expect(page.locator('#shared-list-preview')).toContainText('My Fantasy');
  await expect(page.locator('#shared-list-preview')).not.toContainText('private');
  await page.locator('#shared-list-preview button').click();
});
test('advanced filters reach catalog, preserve controls, recommend taste and reset', async ({
  page,
}, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Reading remains desktop only');
  await setup(page);
  const requests = [];
  await page.route('https://graphql.anilist.co', (route) => {
    const data = route.request().postDataJSON();
    requests.push(data);
    if (data.query.includes('ReadingCatalog'))
      return route.fulfill({
        json: {
          data: {
            Page: {
              pageInfo: { hasNextPage: false },
              media: [
                {
                  id: 12,
                  type: 'MANGA',
                  countryOfOrigin: 'JP',
                  title: { english: 'Next Fantasy' },
                  genres: ['Fantasy'],
                  chapters: 50,
                  volumes: 5,
                  status: 'FINISHED',
                  averageScore: 85,
                },
              ],
            },
          },
        },
      });
    return route.fulfill({ json: { data: { Media: null } } });
  });
  await tab(page, 'discover').click();
  await expect(page.locator('.reading-card-title')).toHaveText('Next Fantasy');
  await page.locator('.reading-advanced summary').click();
  const filter = page.locator('[data-reading-filter="include"][value="Fantasy"]');
  await filter.check();
  await expect
    .poll(() => requests.filter((r) => r.query.includes('ReadingCatalog')).at(-1)?.variables.genres)
    .toEqual(['Fantasy']);
  await expect(filter).toBeChecked();
  await page.locator('[data-reading-filter="exclude"][value="Horror"]').check();
  await expect(page.locator('.reading-filter-chips')).toContainText('Përjashto: Horror');
  await page.locator('[data-reading-action="filter-reset"]').click();
  await expect(page.locator('.reading-filter-chips')).toBeEmpty();
  await page.locator('.reading-advanced summary').click();
  await expect(page.locator('[data-reading-filter="include"][value="Fantasy"]')).not.toBeChecked();
  await tab(page, 'recommendations').click();
  await expect(page.locator('.reading-card')).toContainText('Sepse të pëlqeu My Fantasy');
});
test('compact reading library and filters have usable desktop layout', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Reading remains desktop only');
  await setup(page);
  await page.locator('.reading-library-more summary').click();
  await page.locator('#reading-density').selectOption('compact');
  await page.locator('.reading-library-more summary').click();
  await expect(page.locator('#reading-view')).toHaveClass(/reading-density-compact/);
  for (const width of [1440, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('#reading-view')).toBeVisible();
    expect(
      await page.locator('.reading-hero').evaluate((el) => el.getBoundingClientRect().height),
    ).toBeLessThan(100);
    await page
      .locator('.reading-card')
      .first()
      .evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect
      .poll(() =>
        page
          .locator('.reading-card')
          .first()
          .evaluate((el) => el.getBoundingClientRect().bottom),
      )
      .toBeLessThanOrEqual(await page.evaluate(() => innerHeight));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`library-${width}.png`) });
  }
  await tab(page, 'discover').click();
  await page.locator('.reading-advanced summary').click();
  await page.screenshot({ path: info.outputPath('filters-1024.png') });
});

test('shared list opens for signed-out visitors without disclosing personal fields', async ({
  page,
}) => {
  await openFixture(page, { signedIn: false });
  await page.evaluate(
    (hash) => (location.hash = hash),
    new URL(sharedListURL('Listë publike', rows)).hash,
  );
  await expect(page.locator('#shared-list-preview')).toBeVisible();
  await expect(page.locator('#shared-list-preview')).toContainText('My Fantasy');
  await expect(page.locator('#shared-list-preview')).not.toContainText('private');
});
