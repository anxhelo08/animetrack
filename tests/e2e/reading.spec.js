import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openFixture } from '../fixtures/browser-app.js';
import { normalizeReadingLibrary } from '../../src/core/reading-model.js';

// These mocked catalog checks should not be navigated by background PWA updates.
test.use({ serviceWorkers: 'block' });

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
test('reading is available from both layouts while retaining five phone destinations', async ({
  page,
}, info) => {
  await setup(page);
  const phone = info.project.name.startsWith('iphone');
  if (phone) {
    await expect(page.locator('#pro-nav-reading')).toBeHidden();
    await expect(page.locator('[data-mobile-nav]')).toHaveCount(5);
    await page.locator('[data-mobile-nav="library"]').click();
    await page.locator('#library-view [data-pro-page="reading"]').click();
    await expect(page.locator('#reading-view')).toBeVisible();
    expect((await state(page)).readingLibrary).toEqual(titles);
    return;
  }
  await page.locator('#pro-nav-reading').click();
  await expect(page.locator('#reading-view')).toBeVisible();
  await expect(page.locator('#search')).toBeHidden();
  await expect(page.locator('#pro-nav-reading')).toHaveAttribute('aria-current', 'page');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#reading-view')).toBeVisible();
  await expect(page.locator('#home-view')).toBeHidden();
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
  await page.locator('#reading-tools').selectOption('activity');
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
  await page.locator('#reading-tools').selectOption('activity');
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
  await page.locator('.reading-scope [data-id="manhwa"]').click();
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
  await expect(page.locator('.reading-library-shelves')).not.toContainText('My manga');
  await page.reload();
  await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
  await page.locator('#pro-nav-reading').click();
  await expect(page.locator('.reading-library-shelves')).not.toContainText('My manga');
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
  await page.locator('[data-reading-action="detail"][data-id="reading-al-30013"]').first().click();
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
  await expect(page.locator('.reading-hero-art')).toHaveCount(0);
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

test('ongoing manhwa finds published counts automatically and NEW expires without extending dates', async ({
  page,
}, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Desktop only');
  const ongoing = normalizeReadingLibrary([
    {
      id: 'reading-al-42',
      sourceId: '42',
      title: 'Story',
      kind: 'manhwa',
      publicationStatus: 'RELEASING',
      status: 'reading',
      totalChapters: 0,
      chaptersRead: [1],
      notes: 'My private note',
    },
  ]);
  await openFixture(page, {
    owner: 'reading-live-counts',
    persistWrites: true,
    payload: { anime: [], history: [], readingLibrary: ongoing, preferences: {} },
  });
  await page.route('https://graphql.anilist.co', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: { Media: { chapters: null, volumes: null, status: 'RELEASING' } },
      }),
    }),
  );
  const id = '12345678-1234-1234-1234-123456789abc';
  await page.route('https://api.mangadex.org/**', (route) => {
    const url = new URL(route.request().url());
    const body = url.pathname.endsWith('/aggregate')
      ? {
          result: 'ok',
          volumes: {
            1: {
              volume: '1',
              chapters: { 1: { chapter: '1' }, 2: { chapter: '2' }, 3: { chapter: '3' } },
            },
          },
        }
      : url.pathname.endsWith('/feed')
        ? {
            data: [
              { attributes: { chapter: '1', publishAt: '2026-09-20T12:00:00Z' } },
              { attributes: { chapter: '2', publishAt: '2026-09-29T12:00:00Z' } },
              { attributes: { chapter: '3', publishAt: '2026-09-30T10:00:00Z' } },
            ],
          }
        : { data: [{ id, attributes: { title: { en: 'Story' }, originalLanguage: 'ko' } }] };
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.locator('#pro-nav-reading').click();
  await expect(page.locator('.reading-card-progress')).toContainText('3 publikuar');
  await expect(page.locator('.reading-new-badge')).toHaveText('NEW · 2 kapituj');
  let row = (await state(page)).readingLibrary[0];
  expect(row).toMatchObject({
    totalChapters: 3,
    chaptersRead: [1],
    notes: 'My private note',
    mangaDexId: id,
    volumeRanges: [{ volume: 1, start: 1, end: 3 }],
  });
  const dates = row.chapterReleases.map((event) => event.date);
  await page.locator('[data-reading-action="detail"]').first().click();
  await expect(page.locator('[data-chapter="3"]')).toContainText('NEW');
  await page.clock.setFixedTime(new Date('2026-10-08T12:00:00Z'));
  await page.locator('#reading-view [data-reading-action="tab"][data-id="library"]').click();
  await expect(page.locator('.reading-new-badge')).toHaveCount(0);
  row = (await state(page)).readingLibrary[0];
  expect(row.chapterReleases.map((event) => event.date)).toEqual(dates);
});

test('long reading titles and unknown totals use wide compact cards', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Desktop reading only');
  const unknown = normalizeReadingLibrary([
    {
      id: 'reading-player',
      title: "The Player Who Can't Level Up",
      kind: 'manhwa',
      publicationStatus: 'RELEASING',
      totalChapters: 0,
      chaptersRead: Array.from({ length: 132 }, (_, i) => i + 1),
      cover: 'https://posters.animetrack.test/player.jpg',
      checkedAt: '2026-09-30T12:00:00Z',
    },
  ]);
  await openFixture(page, {
    owner: 'reading-compact-cards',
    persistWrites: true,
    payload: { anime: [], history: [], readingLibrary: [titles[0], ...unknown], preferences: {} },
  });
  await page.route('https://posters.animetrack.test/**', (route) =>
    route.fulfill({
      contentType: 'image/jpeg',
      path: 'public/welcome/one-piece.jpg',
    }),
  );
  await page.locator('#pro-nav-reading').click();
  const card = page.locator('.reading-card').filter({
    has: page.getByRole('button', { name: "The Player Who Can't Level Up", exact: true }),
  });
  await expect(card.locator('.reading-card-progress')).toHaveText('132 kapituj të lexuar');
  await expect(card).toContainText('Totali ende i pakonfirmuar');
  await expect(card).not.toContainText('?');
  for (const theme of ['dark', 'light']) {
    await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme);
    for (const width of [1440, 1024]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(card).toBeVisible();
      await expect
        .poll(async () => {
          const bounds = await card.boundingBox();
          return Boolean(bounds && bounds.width >= 300 && bounds.height < bounds.width);
        })
        .toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  }
  const stored = (await state(page)).readingLibrary.find((row) => row.id === 'reading-player');
  expect(stored.totalChapters).toBe(0);
  expect(stored.chaptersRead).toHaveLength(132);
});

test('title management removes, restores and restarts a reading without losing personal notes', async ({
  page,
}, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Desktop reading workspace');
  await setup(page);
  await page.locator('#pro-nav-reading').click();
  await page.locator('[data-reading-action="detail"][data-id="reading-al-30013"]').first().click();
  await expect(page.locator('.reading-personal-summary')).toContainText('2 / 10');
  if (!(await page.locator('.reading-manage').evaluate((node) => node.open)))
    await page.locator('.reading-manage summary').click();
  await page.locator('[data-reading-action="last-chapter"]').click();
  await expect(page.locator('#reading-chapter-query')).toHaveValue('10');
  if (!(await page.locator('.reading-manage').evaluate((node) => node.open)))
    await page.locator('.reading-manage summary').click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('.reading-manage [data-reading-action="delete"]').click();
  await expect(page.locator('.reading-library-shelves')).not.toContainText('Berserk');
  await page.locator('[data-reading-action="restore"]').click();
  await expect(page.locator('#reading-detail-title')).toHaveText('Berserk');
  expect((await state(page)).readingLibrary[0].chaptersRead).toEqual([1, 3]);
  if (!(await page.locator('.reading-manage').evaluate((node) => node.open)))
    await page.locator('.reading-manage summary').click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('[data-reading-action="restart"]').click();
  expect((await state(page)).readingLibrary[0].chaptersRead).toEqual([]);
  await page.reload();
  await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
  await page.locator('#pro-nav-reading').click();
  expect((await state(page)).readingLibrary[0].deletedAt).toBe('');
  expect((await state(page)).readingLibrary[0].chaptersRead).toEqual([]);
});

test('mobile reading preserves chapters and notes with responsive library, details and calendar', async ({
  page,
}, info) => {
  test.skip(!info.project.name.startsWith('iphone'), 'Mobile reading flow');
  await setup(page);
  await page.locator('[data-mobile-nav="library"]').click();
  await page.locator('#library-view [data-pro-page="reading"]').click();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator('#reading-view')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath('reading-mobile-library-' + width + '.png') });
  }
  await page.locator('[data-reading-action="detail"][data-id="reading-al-30013"]').first().click();
  await expect(page.locator('#reading-detail-title')).toHaveText('Berserk');
  await page.locator('[data-reading-action="chapter"][data-chapter="2"]').click();
  await page.locator('.reading-detail-tabs [data-id="notes"]').click();
  await page.locator('#reading-personal-form [name="notes"]').fill('Lexim në telefon');
  await page.locator('#reading-personal-form button[type="submit"]').click();
  expect((await state(page)).readingLibrary[0].chaptersRead).toEqual([1, 2, 3]);
  expect((await state(page)).readingLibrary[0].notes).toBe('Lexim në telefon');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('reading-mobile-detail.png'), fullPage: true });
  await page.locator('#reading-view [data-reading-action="tab"][data-id="calendar"]').click();
  await expect(page.locator('.reading-calendar')).toBeVisible();
  await page.locator('[data-mobile-nav="home"]').click();
  await expect(page.locator('#home-view')).toBeVisible();
  await expect(page.locator('#reading-view')).toBeHidden();
  await page.reload();
  await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
  await page.locator('[data-mobile-nav="library"]').click();
  await page.locator('#library-view [data-pro-page="reading"]').click();
  expect((await state(page)).readingLibrary[0].chaptersRead).toEqual([1, 2, 3]);
  expect((await state(page)).readingLibrary[0].notes).toBe('Lexim në telefon');
  const audit = await new AxeBuilder({ page })
    .include('#reading-view')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
});
