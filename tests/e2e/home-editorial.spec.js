import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openFixture } from '../fixtures/browser-app.js';
import { homeStories } from '../../src/modules/home-spotlight.js';

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
  await page.waitForFunction(() => window.ATMobile113?.state().anime.length === 3);
  const phone = await page.evaluate(() => innerWidth <= 760);
  if (phone) await expect(page.locator('#home-anime-pulse')).toBeHidden();
  else {
    await expect(page.locator('#home-anime-pulse')).toBeVisible();
    await expect(page.locator('.pulse-slide.is-active h3')).toHaveText(daily[0].title);
  }
}
const frozenNow = Date.parse('2026-09-30T12:00:00Z');
const daily = homeStories(candidates, [], frozenNow);
const activeTitle = (page) => page.locator('.pulse-slide.is-active h3');

async function audit(page) {
  const result = await new AxeBuilder({ page })
    .include('#home-anime-pulse')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
    [],
  );
}

test('desktop stories open directly, with no playback controls or progress changes', async ({
  page,
}, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Desktop spotlight is removed on phones.');
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await editorial(page);
  await expect(page.locator('.at124-search-trigger,#at112-open-command')).toHaveCount(0);
  await expect(
    page.locator(
      '[data-pulse-action="next"],[data-pulse-action="previous"],[data-pulse-action="pause"],.pulse-dot',
    ),
  ).toHaveCount(0);
  await expect(page.locator('.top-actions #search')).toBeVisible();
  await page.locator('.header-search-shortcut').click();
  await expect(page.locator('#at124-command')).toBeVisible();
  await page.keyboard.press('Escape');
  const before = await page.evaluate(() => JSON.stringify(window.ATMobile113.state().anime));
  await page.locator('.pulse-story').nth(1).click();
  await expect(page.locator('#detail-modal')).toBeVisible();
  await expect(page.locator('#detail-body')).toContainText(daily[1].title);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => JSON.stringify(window.ATMobile113.state().anime))).toBe(before);
  await expect(activeTitle(page)).toHaveText(daily[0].title);
  for (const width of [1440, 1024]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await audit(page);
    await page.screenshot({ path: info.outputPath('home-' + width + '.png'), fullPage: false });
  }
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'light';
  });
  await audit(page);
  await page.screenshot({ path: info.outputPath('home-light.png'), fullPage: false });
  expect(errors).toEqual([]);
});

test('phone removes the spotlight and its images, retaining the watchlist', async ({
  page,
}, info) => {
  test.skip(!info.project.name.startsWith('iphone'), 'Phone behavior.');
  await editorial(page);
  const before = await page.evaluate(() => JSON.stringify(window.ATMobile113.state().anime));
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator('#home-anime-pulse')).toBeHidden();
    await expect(page.locator('#home-anime-pulse > *')).toHaveCount(0);
    await expect(page.locator('#mobile-continue')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath('home-' + width + '.png'), fullPage: false });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('#home-anime-pulse')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#home-anime-pulse > *')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify(window.ATMobile113.state().anime))).toBe(before);
});

test('reduced motion keeps one static, accessible story', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Desktop spotlight only.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await editorial(page);
  await expect(page.locator('#home-anime-pulse')).toHaveAttribute('data-motion', 'paused');
  expect(
    await page
      .locator('.pulse-slide.is-active .pulse-backdrop')
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe('none');
  expect(
    await page
      .locator('.pulse-slide:not(.is-active)')
      .evaluateAll((panels) =>
        panels.every((p) => p.inert && p.getAttribute('aria-hidden') === 'true'),
      ),
  ).toBe(true);
  await page.locator('.pulse-slide.is-active [data-pulse-action="open"]').click();
  await expect(page.locator('#detail-modal')).toBeVisible();
});

test('automatic crossfade preserves image nodes and layout, and pauses in search and other pages', async ({
  page,
}, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Desktop spotlight only.');
  await page.clock.install({ time: new Date(frozenNow) });
  await editorial(page);
  await page.mouse.move(0, 0);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(page.locator('#home-anime-pulse')).toHaveAttribute('data-motion', 'running');
  const height = await page
    .locator('.pulse-stage')
    .evaluate((node) => node.getBoundingClientRect().height);
  await page.evaluate(() => {
    window.__pulseImages = [...document.querySelectorAll('.pulse-stage img')];
  });
  await page.clock.runFor(11200);
  await expect(activeTitle(page)).toHaveText(daily[1].title);
  expect(
    await page.evaluate(() =>
      window.__pulseImages.every(
        (node, index) => node === document.querySelectorAll('.pulse-stage img')[index],
      ),
    ),
  ).toBe(true);
  expect(
    await page.locator('.pulse-stage').evaluate((node) => node.getBoundingClientRect().height),
  ).toBe(height);
  await page.locator('.pulse-stage').hover();
  await expect(page.locator('#home-anime-pulse')).toHaveAttribute('data-motion', 'running');
  await page.clock.runFor(15000);
  await expect(activeTitle(page)).toHaveText(daily[1].title);
  await page.mouse.move(0, 0);
  await page.keyboard.press('Control+k');
  await expect(page.locator('#home-anime-pulse')).toHaveAttribute('data-motion', 'paused');
  await page.clock.runFor(15000);
  await expect(activeTitle(page)).toHaveText(daily[1].title);
  await page.keyboard.press('Escape');
  await page.locator('#library-nav').click();
  await page.clock.runFor(15000);
  await expect(activeTitle(page)).toHaveText(daily[1].title);
  await page.locator('#home-nav').click();
  await page.mouse.move(0, 0);
  await page.clock.runFor(11200);
  await expect(activeTitle(page)).toHaveText(daily[2].title);
});

test('daily stories change at midnight while the app remains open', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Desktop spotlight only.');
  await page.clock.install({ time: new Date(frozenNow) });
  await editorial(page);
  const endOfDay = new Date('2026-09-30T23:59:50Z');
  await page.clock.setSystemTime(endOfDay);
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.clock.runFor(10500);
  const tomorrow = homeStories(candidates, [], new Date('2026-10-01T00:00:01Z').getTime());
  await expect(activeTitle(page)).toHaveText(tomorrow[0].title);
  expect(tomorrow[0].title).not.toBe(daily[0].title);
});
