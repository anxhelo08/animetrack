import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openFixture } from '../fixtures/browser-app.js';
const payload = {
  version: 14,
  anime: [
    {
      id: 'black-clover',
      title: 'Black Clover',
      source: 'AniList',
      sourceId: '97940',
      malId: '34572',
      status: 'completed',
      total: 170,
      format: 'TV',
      cover: '/covers/one-piece.jpg',
      seasons: [
        {
          id: 'black-old',
          title: 'Sezoni 1',
          source: 'AniList',
          sourceId: '97940',
          malId: '34572',
          total: 170,
          watched: [1],
          releaseStatus: 'FINISHED',
        },
      ],
    },
  ],
  history: [],
  preferences: {},
};
test.use({ serviceWorkers: 'block' });
test('completed titles, confirmed sequels, source coverage and calendar controls work', async ({
  page,
}, info) => {
  await openFixture(page, { payload, owner: 'calendar-user', persistWrites: true });
  const now = await page.evaluate(() => Date.now());
  await page.route('https://graphql.anilist.co', (route) => {
    const query = route.request().postDataJSON().query;
    const body = query.includes('Media(id:$id,idMal:$idMal')
      ? {
          data: {
            Media: {
              id: 97940,
              idMal: 34572,
              title: { english: 'Black Clover' },
              airingSchedule: { nodes: [{ episode: 170, airingAt: (now - 3600000) / 1000 }] },
              relations: {
                edges: [
                  {
                    relationType: 'SEQUEL',
                    node: {
                      id: 999001,
                      idMal: 999002,
                      title: { english: 'Black Clover continuation' },
                      future: { nodes: [{ episode: 1, airingAt: (now + 3600000) / 1000 }] },
                    },
                  },
                ],
              },
            },
          },
        }
      : {
          data: {
            a: { media: [] },
            b: { media: [] },
            Page: { media: [], pageInfo: { hasNextPage: false } },
            Media: null,
          },
        };
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.route('https://api.jikan.moe/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        route.request().url().endsWith('/full')
          ? { data: { title: 'Black Clover', relations: [] } }
          : { data: [], pagination: { last_visible_page: 1 } },
      ),
    }),
  );
  await page.evaluate(() => document.querySelector('#pro-nav-calendar').click());
  const refresh = page.locator('[data-pro-action="calendar-refresh"]').first();
  await expect(refresh).toBeEnabled();
  await refresh.click();
  await expect(page.locator('.at-cal-stage')).toHaveAttribute('aria-busy', 'false');
  await page.locator('[data-pro-action="calendar-view"][data-id="agenda"]').click();
  await expect(page.locator('.at-cal-agenda')).toContainText('Black Clover');
  await expect(
    page.locator('[data-pro-action="calendar-filter"][data-id="following"]'),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.at-cal-untracked').first()).toBeVisible();
  await page.locator('#calendar-release').selectOption('upcoming');
  await expect(page.locator('.at-cal-agenda [data-pro-action="calendar-mark"]')).toHaveCount(0);
  await page.locator('#calendar-query').fill('not a title');
  await expect(page.locator('.at-cal-empty')).toBeVisible();
  await page.locator('#calendar-query').fill('Black');
  await expect(page.locator('.at-cal-agenda')).toContainText('Black Clover');
  await expect(page.locator('#calendar-query')).toHaveAttribute('autocomplete', 'off');
  await expect(page.locator('#calendar-query')).toHaveAttribute('name', 'at-search-calendar-query');
  await page.locator('.at-cal-coverage summary').click();
  await expect(page.locator('.at-cal-coverage')).toContainText('MyAnimeList / Jikan');
  await expect(page.locator('.at-cal-coverage')).toContainText('Orar i konfirmuar');
  const original = await page.evaluate(
    () => window.ATMobile113.state().anime[0].seasons[0].watched,
  );
  expect(original).toEqual([1]);
  for (const width of info.project.name.startsWith('iphone') ? [320, 390] : [1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(
      true,
    );
    if (!process.env.AT_CAL_NO_SCREENSHOTS)
      await page.screenshot({
        path: info.outputPath('calendar-' + width + '.png'),
        fullPage: true,
      });
  }
  const audit = await new AxeBuilder({ page })
    .include('.at-calendar-modern')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page.locator('.at-cal-stage').evaluate((e) => getComputedStyle(e).animationName),
  ).toBe('none');
});
test('all main search fields carry search-only autofill semantics', async ({ page }) => {
  await openFixture(page);
  const top = page.locator('#search');
  await expect(top).toHaveAttribute('type', 'search');
  await expect(top).toHaveAttribute('name', 'at-search-search');
  await page.evaluate(() => document.querySelector('#library-nav').click());
  for (const input of await page.locator('input[type="search"]').all()) {
    await expect(input).toHaveAttribute('autocomplete', 'off');
    await expect(input).toHaveAttribute('data-lpignore', 'true');
  }
  await expect(page.locator('#account-email')).toHaveAttribute('type', 'email');
});
