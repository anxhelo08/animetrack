import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openFixture } from '../fixtures/browser-app.js';

const owner = 'editorial-home';
const candidates = [
  {
    key: 'al-21',
    source: 'AniList',
    sourceId: '21',
    title: 'ONE PIECE',
    cover: 'https://posters.animetrack.test/one-piece.jpg',
    genre: 'Action, Adventure',
    rawGenres: ['action', 'adventure'],
    score: 89,
    popularity: 900000,
    year: 1999,
    format: 'TV',
    releaseStatus: 'RELEASING',
    nextAiringAt: Date.parse('2026-10-04T10:00:00Z') / 1000,
    nextAiringEpisode: 1171,
    synopsis: 'Një aventurë drejt ëndrrave, miqësive dhe detit pa fund.',
  },
  {
    key: 'al-16498',
    source: 'AniList',
    sourceId: '16498',
    title: 'Attack on Titan',
    cover: 'https://posters.animetrack.test/attack-on-titan.jpg',
    genre: 'Action, Drama',
    rawGenres: ['action', 'drama'],
    score: 86,
    popularity: 800000,
    year: 2013,
    format: 'TV',
    releaseStatus: 'FINISHED',
    synopsis: 'Një histori mbi lirinë dhe misteret përtej mureve.',
  },
  {
    key: 'al-101922',
    source: 'AniList',
    sourceId: '101922',
    title: 'Demon Slayer',
    cover: 'https://posters.animetrack.test/demon-slayer.jpg',
    genre: 'Action, Fantasy',
    rawGenres: ['action', 'fantasy'],
    score: 84,
    popularity: 700000,
    year: 2019,
    format: 'TV',
    releaseStatus: 'FINISHED',
    synopsis: 'Një udhëtim plot vendosmëri, emocion dhe beteja të paharrueshme.',
  },
];
const payload = {
  anime: candidates.map((item, index) => ({
    ...item,
    id: 'story-' + index,
    status: 'watching',
    favorite: index === 0,
    seasons: [
      {
        id: 'season-' + index,
        title: 'Sezoni 1',
        format: 'TV',
        total: 24,
        watched: [1, 2, 3, 4, 5, 6],
      },
    ],
    updatedAt: '2026-09-29T12:00:00Z',
  })),
  history: [],
  preferences: { weeklyGoal: 10, homeQueue: ['story-0', 'story-1'] },
};
async function editorial(page) {
  await page.addInitScript(
    ({ owner, candidates }) =>
      localStorage.setItem(
        'animetrack_recs_v125_' + owner,
        JSON.stringify({ at: Date.parse('2026-09-30T12:00:00Z'), candidates }),
      ),
    { owner, candidates },
  );
  await openFixture(page, { owner, payload });
  await page.route('https://posters.animetrack.test/**', (route) =>
    route.fulfill({
      contentType: 'image/jpeg',
      path: 'public/welcome/' + new URL(route.request().url()).pathname.split('/').pop(),
    }),
  );
  await page.reload();
  await expect(page.locator('#home-anime-pulse')).toBeVisible();
  await expect(page.locator('.pulse-copy h3')).toHaveText('ONE PIECE');
}

test('one header search and anime spotlight work without changing library progress', async ({
  page,
}, info) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await editorial(page);
  await expect(page.locator('.at124-search-trigger,#at112-open-command')).toHaveCount(0);
  const mobile = info.project.name.startsWith('iphone');
  if (!mobile) {
    await expect(page.locator('.top-actions #search')).toBeVisible();
    await page.locator('.header-search-shortcut').click();
    await expect(page.locator('#at124-command')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+k');
    await expect(page.locator('#at124-command')).toBeVisible();
    await page.keyboard.press('Escape');
  }
  const before = await page.evaluate(() => JSON.stringify(window.ATMobile113.state().anime));
  await page.locator('[data-pulse-action="next"]').click();
  await expect(page.locator('.pulse-copy h3')).toHaveText('Attack on Titan');
  await page.locator('[data-pulse-action="pause"]').click();
  await expect(page.locator('[data-pulse-action="pause"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#home-anime-pulse')).toHaveAttribute('data-motion', 'paused');
  await page.locator('[data-pulse-action="open"]').click();
  await expect(page.locator('#detail-modal')).toBeVisible();
  await expect(page.locator('#detail-body')).toContainText('Attack on Titan');
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => JSON.stringify(window.ATMobile113.state().anime))).toBe(before);
  for (const width of mobile ? [390, 320] : [1440, 1024]) {
    await page.setViewportSize({ width, height: mobile ? 844 : 1000 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const result = await new AxeBuilder({ page })
      .include('#home-anime-pulse')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      result.violations.map((violation) => ({
        id: violation.id,
        nodes: violation.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
    if (mobile) {
      expect(
        await page.locator('#home-anime-pulse button:visible').evaluateAll((buttons) =>
          buttons
            .filter((button) => {
              const rect = button.getBoundingClientRect();
              return rect.width < 44 || rect.height < 44;
            })
            .map((button) => button.getAttribute('aria-label') || button.textContent),
        ),
      ).toEqual([]);
    }
    await page.screenshot({ path: info.outputPath('home-' + width + '.png'), fullPage: false });
  }
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'light';
  });
  const light = await new AxeBuilder({ page })
    .include('#home-anime-pulse')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    light.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
  await page.screenshot({ path: info.outputPath('home-light.png'), fullPage: false });
  expect(errors).toEqual([]);
});

test('reduced motion disables automatic rotation and cinematic movement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await editorial(page);
  await expect(page.locator('#home-anime-pulse')).toHaveAttribute('data-motion', 'paused');
  expect(
    await page.locator('.pulse-backdrop').evaluate((node) => getComputedStyle(node).animationName),
  ).toBe('none');
  await page.locator('[data-pulse-action="next"]').click();
  await expect(page.locator('.pulse-copy h3')).toHaveText('Attack on Titan');
});

test('automatic spotlight pauses for search, navigation and the pause button', async ({
  page,
}, info) => {
  await page.clock.install({ time: new Date('2026-09-30T12:00:00Z') });
  await editorial(page);
  await page.mouse.move(0, 0);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(page.locator('#home-anime-pulse')).toHaveAttribute('data-motion', 'running');
  await page.clock.runFor(7100);
  await expect(page.locator('.pulse-copy h3')).toHaveText('Attack on Titan');
  await page.keyboard.press('Control+k');
  await expect(page.locator('#home-anime-pulse')).toHaveAttribute('data-motion', 'paused');
  await page.clock.runFor(15000);
  await expect(page.locator('.pulse-copy h3')).toHaveText('Attack on Titan');
  await page.keyboard.press('Escape');
  const mobile = info.project.name.startsWith('iphone');
  await page.locator(mobile ? '[data-mobile-nav="library"]' : '#library-nav').click();
  await page.clock.runFor(15000);
  await expect(page.locator('.pulse-copy h3')).toHaveText('Attack on Titan');
  await page.locator(mobile ? '[data-mobile-nav="home"]' : '#home-nav').click();
  await page.locator('[data-pulse-action="pause"]').click();
  await page.mouse.move(0, 0);
  await page.locator('[data-pulse-action="pause"]').blur();
  await page.clock.runFor(15000);
  await expect(page.locator('.pulse-copy h3')).toHaveText('Attack on Titan');
  await expect(page.locator('#home-anime-pulse')).toHaveAttribute('data-motion', 'paused');
});
