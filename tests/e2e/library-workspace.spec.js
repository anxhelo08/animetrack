import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';
import { normalizeReadingLibrary } from '../../src/core/reading-model.js';
const reading = normalizeReadingLibrary([
  {
    id: 'reading-wc-01JABCDEF0123456789ABCDEFG',
    source: 'weebcentral',
    sourceId: '01JABCDEF0123456789ABCDEFG',
    weebCentralId: '01JABCDEF0123456789ABCDEFG',
    title: 'The Beginning After the End',
    kind: 'manhwa',
    cover: 'https://posters.animetrack.test/solo.jpg',
    totalChapters: 255,
    status: 'reading',
    chaptersRead: [1, 2],
    updatedAt: '2026-09-29T12:00:00Z',
  },
  {
    id: 'reading-al-1',
    title: 'Berserk',
    aliases: ['Beruseruku'],
    kind: 'manga',
    cover: 'https://posters.animetrack.test/one-piece.jpg',
    totalChapters: 380,
    status: 'planning',
    chaptersRead: [],
  },
]);
const anime = [
  {
    id: 'workspace-anime',
    title: 'Demon Slayer',
    aliases: ['Kimetsu no Yaiba'],
    genre: 'Action',
    source: 'AniList',
    sourceId: '101922',
    cover: 'https://posters.animetrack.test/demon-slayer.jpg',
    status: 'watching',
    hydrated: true,
    franchiseVersion: '13.1.0',
    seasons: [
      {
        id: 'workspace-season',
        title: 'Sezoni 1',
        format: 'TV',
        total: 12,
        watched: [1, 2],
        releaseStatus: 'FINISHED',
      },
    ],
  },
  {
    id: 'tvmaze-1',
    title: 'Under the Dome',
    source: 'TVMaze',
    sourceId: '1',
    tvmazeId: '1',
    cover: 'https://posters.animetrack.test/one-piece.jpg',
    format: 'TV_SERIES',
    status: 'completed',
    hydrated: true,
    tvmazeLoaded: true,
    seasons: [
      {
        id: 'tvmaze-1-s1',
        title: 'Sezoni 1',
        format: 'TV_SERIES',
        total: 13,
        watched: Array.from({ length: 13 }, (_, i) => i + 1),
        releaseStatus: 'FINISHED',
      },
    ],
  },
];
test('reading and watching workspaces keep source handoffs separate from progress', async ({
  page,
}, info) => {
  const phone = info.project.name.startsWith('iphone');
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.copiedTitle = value;
        },
      },
    }),
  );
  await openFixture(page, {
    owner: 'workspace',
    persistWrites: true,
    payload: { anime, readingLibrary: reading, history: [], preferences: {} },
  });
  await page.route('https://posters.animetrack.test/**', (route) =>
    route.fulfill({ contentType: 'image/jpeg', path: 'public/welcome/demon-slayer.jpg' }),
  );
  await page.locator(phone ? '[data-mobile-nav="library"]' : '#library-nav').click();
  await page.screenshot({
    path:
      '/tmp/workspace-' +
      (process.env.AT_UI_BASELINE ? 'before' : 'after') +
      '-' +
      info.project.name +
      '-watching.png',
    fullPage: true,
  });
  await page
    .locator(phone ? '#library-view [data-pro-page="reading"]' : '#pro-nav-reading')
    .click();
  await expect(page.locator('#reading-view')).toBeVisible();
  await page.screenshot({
    path:
      '/tmp/workspace-' +
      (process.env.AT_UI_BASELINE ? 'before' : 'after') +
      '-' +
      info.project.name +
      '-reading.png',
    fullPage: true,
  });
  if (process.env.AT_UI_BASELINE) return;
  const before = await page.evaluate(() =>
    JSON.stringify(window.ATMobile113.state().readingLibrary),
  );
  const resume = page.locator('.reading-resume');
  await expect(resume).toContainText('Kapitulli i radhës: 3');
  const source = resume.getByRole('link', { name: 'Lexo në WeebCentral' });
  await expect(source).toHaveAttribute(
    'href',
    'https://weebcentral.com/series/01JABCDEF0123456789ABCDEFG',
  );
  await expect(source).toHaveAttribute('target', '_blank');
  await page
    .context()
    .route('https://weebcentral.com/series/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<main>Reader fixture</main>' }),
    );
  const popupPromise = page.waitForEvent('popup');
  await source.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL('https://weebcentral.com/series/01JABCDEF0123456789ABCDEFG');
  await popup.close();
  expect(await page.evaluate(() => JSON.stringify(window.ATMobile113.state().readingLibrary))).toBe(
    before,
  );
  await page.locator('.reading-quick-filters [data-id="planning"]').click();
  await expect(page.locator('.reading-card')).toHaveCount(1);
  await expect(page.locator('.reading-card')).toContainText('Berserk');
  await expect(page.locator('.reading-card .reading-source-action')).toHaveAttribute(
    'href',
    'https://weebcentral.com/search?text=Berserk',
  );
  await page.locator('.reading-quick-filters [data-id="all"]').click();
  await page.locator('#reading-query').fill('beruseruku');
  await expect(page.locator('.reading-card')).toHaveCount(1);
  await page.locator('#reading-query').fill('');
  await page
    .locator(
      '[data-reading-title="reading-wc-01JABCDEF0123456789ABCDEFG"] [data-reading-action="detail"]',
    )
    .first()
    .click();
  await expect(page.locator('.reading-detail .reading-source-action')).toHaveAttribute(
    'href',
    'https://weebcentral.com/series/01JABCDEF0123456789ABCDEFG',
  );
  await page.screenshot({
    path: '/tmp/workspace-after-' + info.project.name + '-reading-detail.png',
    fullPage: true,
  });
  await page
    .locator(
      phone ? '#reading-view .reading-mobile-switch [data-pro-page="library"]' : '#library-nav',
    )
    .click();
  await page.locator('[data-library-focus="unwatched"]').click();
  await expect(page.locator('#anime-grid .anime-card')).toHaveCount(1);
  await expect(page.locator('#anime-grid .card-title')).toBeVisible();
  const search = page.locator(phone ? '#at113-library-search' : '#search');
  await search.fill('kimetsu');
  await expect(page.locator('#anime-grid .anime-card')).toHaveCount(1);
  await page.locator('#anime-grid [data-detail="workspace-anime"]').first().click();
  await expect(page.locator('.title-workspace-summary')).toContainText('2 nga 12');
  if (info.project.name.startsWith('iphone'))
    await page.locator('[data-mobile-detail-tab="overview"]').click();
  await expect(page.locator('.title-workspace-summary [data-title-copy]')).toBeVisible();
  await page.locator('.title-workspace-summary [data-title-copy]').click();
  await expect.poll(() => page.evaluate(() => window.copiedTitle)).toBe('Demon Slayer');
  await expect(page.locator('.title-workspace-summary a')).toHaveAttribute(
    'href',
    'https://anilist.co/anime/101922',
  );
  await page.screenshot({
    path: '/tmp/workspace-after-' + info.project.name + '-watching-detail.png',
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );
});
