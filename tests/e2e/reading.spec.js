import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openFixture } from '../fixtures/browser-app.js';
import { normalizeReadingLibrary } from '../../src/core/reading-model.js';

const titles = normalizeReadingLibrary([
  {
    id: 'reading-al-30013',
    title: 'Berserk',
    sourceId: '30013',
    kind: 'manga',
    cover: 'https://posters.animetrack.test/berserk.jpg',
    totalChapters: 10,
    totalVolumes: 3,
    status: 'reading',
    chaptersRead: [1, 3],
    publicationStatus: 'FINISHED',
    updatedAt: '2026-09-30T10:00:00Z',
    createdAt: '2026-09-30T10:00:00Z',
  },
  {
    id: 'reading-al-105398',
    title: 'Solo Leveling',
    sourceId: '105398',
    kind: 'manhwa',
    cover: 'https://posters.animetrack.test/solo.jpg',
    totalChapters: 179,
    totalVolumes: 14,
    status: 'planning',
    chaptersRead: [],
    updatedAt: '2026-09-29T10:00:00Z',
    createdAt: '2026-09-29T10:00:00Z',
  },
]);
async function setup(page) {
  await openFixture(page, {
    owner: 'reading-test',
    persistWrites: true,
    payload: { anime: [], history: [], readingLibrary: titles, preferences: {} },
  });
  await page.route('https://posters.animetrack.test/**', (route) =>
    route.fulfill({ contentType: 'image/jpeg', path: 'public/welcome/one-piece.jpg' }),
  );
}
const state = (page) => page.evaluate(() => structuredClone(window.ATMobile113.state()));
test('reading is desktop-only and never changes the five phone destinations', async ({
  page,
}, info) => {
  await setup(page);
  const phone = info.project.name.startsWith('iphone');
  if (phone) {
    await expect(page.locator('#pro-nav-reading')).toBeHidden();
    await expect(page.locator('[data-mobile-nav]')).toHaveCount(5);
    await expect(page.locator('#reading-view')).toBeHidden();
    expect((await state(page)).readingLibrary).toEqual(titles);
    return;
  }
  await page.locator('#pro-nav-reading').click();
  await expect(page.locator('#reading-view')).toBeVisible();
  await expect(page.locator('#search')).toBeHidden();
  await expect(page.locator('#pro-nav-reading')).toHaveAttribute('aria-current', 'page');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#reading-view')).toBeHidden();
  await expect(page.locator('#home-view')).toBeVisible();
  expect((await state(page)).readingLibrary).toEqual(titles);
});
test('chapters, notes and journals persist separately from watching data', async ({
  page,
}, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Desktop only');
  await setup(page);
  await page.locator('#pro-nav-reading').click();
  await page.locator('[data-reading-action="detail"][data-id="reading-al-30013"]').first().click();
  await expect(page.locator('#reading-detail-title')).toHaveText('Berserk');
  await page.locator('[data-reading-action="next"]').click();
  expect((await state(page)).readingLibrary[0].chaptersRead).toEqual([1, 2, 3]);
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.locator('[data-reading-action="chapter"][data-chapter="5"]').click();
  expect((await state(page)).readingLibrary[0].chaptersRead).toEqual([1, 2, 3, 5]);
  await page.locator('[data-reading-action="favorite"]').click();
  await page.locator('#reading-personal-form [name="notes"]').fill('Një histori për t’u rilexuar.');
  await page.locator('#reading-personal-form [name="rating"]').fill('9');
  await page.locator('#reading-personal-form [name="volumesRead"]').fill('2');
  await page.locator('#reading-personal-form button[type="submit"]').click();
  await page.locator('#reading-view [data-reading-action="tab"][data-id="activity"]').click();
  await page.locator('[data-reading-action="journal"]').filter({ hasText: 'Kapitulli 5' }).click();
  await page.locator('#reading-journal-form [name="note"]').fill('Kapitulli im i preferuar');
  await page.locator('#reading-journal-form [name="rating"]').fill('8.5');
  await page.locator('#reading-journal-form button[type="submit"]').click();
  const before = await state(page);
  expect(before.anime).toEqual([]);
  expect(before.history).toEqual([]);
  expect(before.readingLibrary[0]).toMatchObject({
    notes: 'Një histori për t’u rilexuar.',
    rating: 9,
    volumesRead: 2,
    favorite: true,
  });
  await page.reload();
  await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
  expect((await state(page)).readingLibrary[0]).toEqual(before.readingLibrary[0]);
  await page.locator('#pro-nav-reading').click();
  await page.locator('#reading-view [data-reading-action="tab"][data-id="activity"]').click();
  await expect(page.locator('.reading-journal')).toContainText('Kapitulli im i preferuar');
});
test('own catalog searches, kind filters and late replies cannot alter anime search', async ({
  page,
}, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Desktop only');
  await setup(page);
  let fail = false,
    requests = [];
  await page.route('https://api.jikan.moe/**', (route) =>
    route.fulfill({
      status: fail ? 503 : 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], pagination: { has_next_page: false } }),
    }),
  );
  await page.route('https://graphql.anilist.co', async (route) => {
    const body = route.request().postDataJSON();
    if (!body.query.includes('ReadingCatalog')) return route.fallback();
    requests.push(body.variables);
    if (body.variables.search === 'Old') await new Promise((resolve) => setTimeout(resolve, 800));
    if (fail) return route.fulfill({ status: 503, body: '{}' });
    const media =
      body.variables.search === 'Old'
        ? [{ id: 77, title: { english: 'Old result' } }]
        : [{ id: 99, title: { english: 'New Manhwa' } }];
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          Page: {
            pageInfo: { hasNextPage: false },
            media: media.map((row) => ({
              ...row,
              type: 'MANGA',
              countryOfOrigin: 'KR',
              coverImage: { large: 'https://posters.animetrack.test/solo.jpg' },
              chapters: 100,
              volumes: 0,
              status: 'RELEASING',
              genres: ['Action'],
            })),
          },
        },
      }),
    });
  });
  await page.locator('#pro-nav-reading').click();
  await page.locator('#reading-view [data-reading-action="tab"][data-id="discover"]').click();
  await expect(page.locator('.reading-card')).toContainText('New Manhwa');
  await page.locator('#reading-query').evaluate((node) => {
    window.readingSearchNode = node;
  });
  await page.locator('#reading-search-form button[type="submit"]').hover();
  await page.locator('#reading-query').fill('Old');
  await page.locator('#reading-search-form').press('Enter');
  await page.locator('#reading-query').fill('New');
  expect(
    await page.locator('#reading-query').evaluate((node) => node === window.readingSearchNode),
  ).toBe(true);
  await page.locator('#reading-kind').selectOption('manhwa');
  await expect(page.locator('.reading-grid')).toContainText('New Manhwa');
  await expect(page.locator('.reading-grid')).not.toContainText('Old result');
  expect(requests.some((query) => query.search === 'New' && query.country === 'KR')).toBe(true);
  expect(await page.locator('#global-search').inputValue()).toBe('');
  await page.locator('[data-reading-action="add"]').click();
  expect((await state(page)).readingLibrary.some((row) => row.title === 'New Manhwa')).toBe(true);
  expect((await state(page)).anime).toEqual([]);
  fail = true;
  await page.locator('#reading-query').fill('Unavailable');
  await page.locator('#reading-search-form').press('Enter');
  await expect(page.locator('[data-reading-action="retry"]')).toBeVisible();
  fail = false;
  await page.locator('[data-reading-action="retry"]').click();
  await expect(page.locator('.reading-grid')).toContainText('New Manhwa');
});
test('manual titles validate totals and preserve deletion after reload', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Desktop only');
  await setup(page);
  await page.locator('#pro-nav-reading').click();
  await page.locator('[data-reading-action="manual"]').click();
  await page.locator('[name="readingTitle"]').fill('My manga');
  await page.locator('[name="totalChapters"]').fill('3');
  await page.locator('[name="publicationStatus"]').selectOption('FINISHED');
  await page.locator('#reading-editor button[type="submit"]').click();
  await page.locator('#reading-progress-form [name="progress"]').fill('3');
  await page.locator('#reading-progress-form button').click();
  expect((await state(page)).readingLibrary.find((row) => row.title === 'My manga').status).toBe(
    'completed',
  );
  await page.locator('[data-reading-action="edit"]').click();
  await page.locator('[name="totalChapters"]').fill('2');
  await page.locator('#reading-editor button[type="submit"]').click();
  await expect(page.locator('#reading-editor')).toBeVisible();
  expect(
    (await state(page)).readingLibrary.find((row) => row.title === 'My manga').totalChapters,
  ).toBe(3);
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('[data-reading-action="delete"]').click();
  await expect(page.locator('.reading-grid')).not.toContainText('My manga');
  await page.reload();
  await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
  await page.locator('#pro-nav-reading').click();
  await expect(page.locator('.reading-grid')).not.toContainText('My manga');
  expect(
    (await state(page)).readingLibrary.find((row) => row.title === 'My manga').deletedAt,
  ).not.toBe('');
});
test('desktop reading layouts remain accessible at 1024 and 1440 pixels', async ({
  page,
}, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Desktop only');
  await setup(page);
  test.setTimeout(60000);
  await page.locator('#pro-nav-reading').click();
  for (const theme of ['dark', 'light']) {
    await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme);
    for (const width of [1440, 1024]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const audit = await new AxeBuilder({ page })
        .include('#reading-view')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        audit.violations.map((row) => ({
          id: row.id,
          nodes: row.nodes.map((node) => node.target),
        })),
      ).toEqual([]);
      await page.screenshot({
        path: info.outputPath(`reading-${theme}-${width}.png`),
        fullPage: true,
        animations: 'disabled',
      });
    }
  }
  await page.locator('[data-reading-action="detail"]').first().click();
  const audit = await new AxeBuilder({ page })
    .include('#reading-view')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    audit.violations.map((row) => ({ id: row.id, nodes: row.nodes.map((node) => node.target) })),
  ).toEqual([]);
  const colors = await page.locator('.reading-chapters').evaluate((root) => ({
    read: getComputedStyle(root.querySelector('.is-read')).backgroundColor,
    unread: getComputedStyle(root.querySelector('button:not(.is-read)')).backgroundColor,
  }));
  expect(colors.read).not.toBe(colors.unread);
  await page.screenshot({
    path: info.outputPath('reading-detail.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page
      .locator('.reading-hero-art > span')
      .first()
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe('none');
});

test('chapter tools, volume ranges, bulk read and hover navigation work', async ({
  page,
}, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Desktop only');
  await setup(page);
  await page.locator('#pro-nav-reading').hover();
  await expect(page.locator('#reading-subnav')).toBeVisible();
  await page.locator('#reading-subnav [data-id="library"]').click();
  await page.locator('[data-reading-action="detail"][data-id="reading-al-105398"]').first().click();
  await page.locator('#reading-chapter-sort').selectOption('desc');
  await expect(page.locator('.reading-chapters button').first()).toHaveText('179');
  await page.locator('#reading-chapter-query').fill('100');
  await expect(page.locator('.reading-chapters button')).toHaveCount(1);
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('[data-chapter="100"]').click();
  expect(
    (await state(page)).readingLibrary.find((row) => row.title === 'Solo Leveling').chaptersRead,
  ).toHaveLength(100);
  await page.locator('[data-reading-action="edit"]').click();
  await page.locator('[name="volumeRanges"]').fill('1:1-10, 2:11-20');
  await page.locator('#reading-editor button[type="submit"]').click();
  await page.locator('#reading-volume').selectOption('2');
  await page.locator('#reading-chapter-query').fill('');
  await expect(page.locator('.reading-chapters button')).toHaveCount(10);
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('[data-reading-action="read-all"]').click();
  expect(
    (await state(page)).readingLibrary.find((row) => row.title === 'Solo Leveling').chaptersRead,
  ).toHaveLength(179);
  await expect(page.locator('#reading-view')).toBeVisible();
  await expect(page.locator('#reading-detail-title')).toHaveText('Solo Leveling');
  await page.waitForTimeout(1000);
  await expect(page.locator('#reading-view')).toBeVisible();
  await page.screenshot({ path: info.outputPath('reading-detail.png'), fullPage: true });
});

test('new chapter checks update metadata while retaining personal reading data', async ({
  page,
}, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Desktop only');
  await setup(page);
  await page.route('https://graphql.anilist.co', (route) => {
    const body = route.request().postDataJSON();
    if (!body.query.includes('ReadingUpdates')) return route.fallback();
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { Media: { chapters: 12, volumes: 4, status: 'RELEASING' } } }),
    });
  });
  await page.locator('#pro-nav-reading').click();
  await page.locator('[data-reading-action="detail"][data-id="reading-al-30013"]').first().click();
  await page.locator('[data-reading-action="refresh"]').click();
  await expect(page.locator('.reading-facts')).toContainText('12 kapituj');
  expect((await state(page)).readingLibrary[0]).toMatchObject({
    totalChapters: 12,
    totalVolumes: 4,
    chaptersRead: [1, 3],
    status: 'reading',
  });
  await page.locator('#reading-view [data-reading-action="tab"][data-id="releases"]').click();
  await expect(page.locator('#reading-content')).toContainText('Berserk');
});
