import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openFixture } from '../fixtures/browser-app.js';

test.use({ serviceWorkers: 'block' });
const title = (i = 1) => ({
  id: 'mobile-' + i,
  title: 'Historia ' + i,
  status: 'watching',
  source: 'AniList',
  sourceId: String(10000 + i * 10),
  format: 'TV',
  hydrated: true,
  franchiseVersion: '13.1.0',
  cover: '/welcome/demon-slayer.jpg',
  notes: 'Shënimi privat mbetet',
  seasons: [101, 102].map((id, index) => ({
    id: 'part-' + id,
    title: 'Sezoni ' + (index + 1),
    source: 'AniList',
    sourceId: String(10000 + i * 10 + index),
    format: 'TV',
    releaseStatus: 'FINISHED',
    total: 12,
    watched: index ? [] : [1],
  })),
});
const nav = (page, mobile, name) =>
  page.locator(
    mobile
      ? `[data-mobile-nav="${name}"]`
      : name === 'profile'
        ? '#pro-nav-profile'
        : '#' + name + '-nav',
  );
// Tracking normalization may omit an optional zero offset; compare its equivalent form.
const state = (page) =>
  page.evaluate(() =>
    JSON.stringify(window.ATMobile113.state(), (key, value) =>
      key === 'watchEpisodeOffset' && value === 0 ? undefined : value,
    ),
  );
async function accessible(page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, reason: n.failureSummary })),
    })),
  ).toEqual([]);
}

test('late detail providers stay in their own mobile panels on cold, warm and season changes', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'iphone-chromium', 'Mobile panels');
  let release;
  const download = new Promise((resolve) => {
    release = resolve;
  });
  await openFixture(page, { payload: { anime: [title()], history: [], preferences: {} } });
  await page.route(/\/assets\/(watch|rich-details)\.[^/]+\.js$/, async (route) => {
    await download;
    await route.continue();
  });
  let fail = true;
  await page.route('https://graphql.anilist.co', (route) => {
    if (fail) return route.fulfill({ status: 503, json: { error: 'unavailable' } });
    const id = route.request().postDataJSON()?.variables?.id || 101;
    return route.fulfill({
      json: {
        data: {
          Media: {
            id,
            format: 'TV',
            genres: [],
            externalLinks: [],
            characters: {
              edges: [
                {
                  role: 'MAIN',
                  node: { name: { full: 'Personazhi' } },
                  voiceActors: [
                    {
                      id,
                      name: { full: 'Aktori ' + id },
                      languageV2: 'Japanese',
                    },
                  ],
                },
              ],
            },
            staff: { edges: [] },
            studios: { nodes: [] },
          },
        },
      },
    });
  });
  await nav(page, true, 'library').click();
  const before = await state(page);
  await page.locator('#anime-grid [data-detail]').first().click();
  await page.locator('[data-mobile-detail-tab="cast"]').click();
  await expect(page.locator('[data-mobile-cast-empty]')).toBeVisible();
  release();
  const cast = page.locator('[data-mobile-panel="cast"] .at134-rich');
  await expect(cast).toBeVisible();
  await expect(cast).toContainText('Detajet e avancuara nuk u ngarkuan');
  await expect(page.locator('[data-mobile-cast-empty]')).toHaveCount(0);
  await expect(page.locator('[data-mobile-panel="episodes"] .at134-rich')).toHaveCount(0);
  await expect(page.locator('[data-mobile-panel="overview"] .at133-watch')).toHaveCount(1);
  fail = false;
  await cast.locator('[data-at134-refresh]').click();
  await expect(cast).toContainText('Aktori 10010');
  await page.locator('[data-mobile-detail-tab="episodes"]').click();
  await page.locator('[data-season="part-102"]').click();
  await page.locator('[data-mobile-detail-tab="cast"]').click();
  await expect(page.locator('[data-mobile-panel="cast"] .at134-rich')).toContainText(
    'Aktori 10011',
  );
  await page.locator('#detail-modal [data-close]').click();
  await page.locator('#anime-grid [data-detail]').first().click();
  await page.locator('[data-mobile-detail-tab="cast"]').click();
  await expect(cast).toBeVisible();
  await expect(cast).toContainText('Aktori');
  await expect(page.locator('[data-mobile-panel="episodes"] .at134-rich')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('actors.png') });
  expect(await state(page)).toBe(before);
});

test('profile heatmap, active filters and large active counts have accessible semantics and contrast', async ({
  page,
}, info) => {
  const mobile = info.project.name === 'iphone-chromium';
  await openFixture(page, {
    payload: {
      anime: Array.from({ length: 500 }, (_, i) => title(i)),
      history: [],
      preferences: {},
    },
  });
  const before = await state(page);
  await nav(page, mobile, 'library').click();
  await expect(page.locator('#library-active-filters')).toHaveAttribute('role', 'group');
  await expect(page.locator('#library-status-strip [data-filter="all"]')).toContainText('500');
  await accessible(page);
  await page.screenshot({ path: info.outputPath('library.png') });
  await nav(page, mobile, 'profile').click();
  await expect(page.locator('.at-profile-activity')).toHaveAttribute('tabindex', '0');
  await expect(page.locator('.at-heatmap')).toHaveAccessibleName(/12 javëve.*episode.*ditë aktive/);
  await expect(page.locator('.at-heatmap [aria-label]')).toHaveCount(0);
  await expect(page.locator('ul[aria-label="Aktiviteti sipas ditëve"] li')).toHaveCount(84);
  await page.locator('.at-profile-activity').focus();
  await expect(page.locator('.at-profile-activity')).toBeFocused();
  await accessible(page);
  await page.screenshot({ path: info.outputPath('profile.png') });
  expect(await state(page)).toBe(before);
});

for (const width of [320, 390, 430])
  test(`phone keeps next-episode home and navigation after rotation from ${width}px`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'iphone-chromium', 'Phone orientation');
    await page.setViewportSize({ width, height: 844 });
    await openFixture(page, { payload: { anime: [title()], history: [], preferences: {} } });
    const before = await state(page);
    await expect(page.locator('#mobile-continue .watch-row')).toHaveCount(1);
    await page.setViewportSize({ width: 844, height: width });
    await expect(page.locator('.at-mobile-nav')).toBeVisible();
    await expect(page.locator('#mobile-home')).toBeVisible();
    await expect(page.locator('#at-iphone-feed')).not.toBeVisible();
    await expect(page.locator('.at-mobile-nav > button')).toHaveCount(5);
    await nav(page, true, 'library').click();
    await expect(page.locator('#anime-grid .media-card')).toHaveCount(1);
    await nav(page, true, 'home').click();
    await expect(page.locator('#mobile-continue .watch-row')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await accessible(page);
    await page.screenshot({ path: info.outputPath('landscape-' + width + '.png') });
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator('.at-mobile-nav')).toBeVisible();
    await expect(page.locator('#mobile-continue .watch-row')).toHaveCount(1);
    expect(await state(page)).toBe(before);
  });
