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
test('opening an offline calendar immediately shows stored dates and tracked titles outside this week', async ({
  page,
}) => {
  const row = structuredClone(payload.anime[0]);
  row.seasons[0].nextAiringEpisode = 171;
  row.seasons[0].nextAiringAt = Date.parse('2026-11-29T15:00:00Z') / 1000;
  await openFixture(page, {
    payload: { ...payload, anime: [row] },
    owner: 'offline-calendar',
    persistWrites: true,
  });
  await page.route('https://graphql.anilist.co', (route) =>
    route.fulfill({ status: 503, json: { error: 'offline' } }),
  );
  await page.route('https://api.jikan.moe/**', (route) =>
    route.fulfill({ status: 503, json: { error: 'offline' } }),
  );
  await page.evaluate(() => document.querySelector('#pro-nav-calendar').click());
  await expect(page.locator('.at-cal-followed')).toContainText('Black Clover');
  await expect(page.locator('.at-cal-followed')).toContainText('EP 171');
  await expect(page.locator('.at-cal-stage')).toHaveAttribute('aria-busy', 'false');
  await page.locator('.at-cal-followed [data-pro-action="calendar-day"]').click();
  await expect(page.locator('.at-cal-agenda')).toContainText('Black Clover');
  await expect(page.locator('.at-cal-agenda')).toContainText('EP 171');
  await page.locator('[data-pro-action="calendar-refresh"]').first().click();
  await expect(page.locator('.at-cal-stage')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.at-cal-agenda .at-cal-event')).toHaveCount(1);
  await expect(page.locator('.at-cal-freshness')).toContainText('Disa burime nuk u arritën');
});
test('completed titles, confirmed sequels, source coverage and calendar controls work', async ({
  page,
}, info) => {
  await openFixture(page, { payload, owner: 'calendar-user', persistWrites: true });
  const now = await page.evaluate(() => Date.now());
  await page.route('https://graphql.anilist.co', (route) => {
    const query = route.request().postDataJSON().query;
    const body = query.includes('airingSchedules(mediaId_in:')
      ? {
          data: {
            Page: {
              pageInfo: { hasNextPage: false },
              airingSchedules: [
                { mediaId: 97940, episode: 170, airingAt: (now - 3600000) / 1000 },
                { mediaId: 999001, episode: 1, airingAt: (now + 3600000) / 1000 },
              ],
            },
          },
        }
      : query.includes('Media(id:$id,idMal:$idMal')
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
  await expect(page.locator('[data-pro-action="calendar-filter"][data-id="all"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
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
    await page.evaluate(() => {
      document.activeElement?.blur();
      window.scrollTo(0, 0);
    });
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

test('new airing anime enter the calendar immediately without a manual refresh', async ({
  page,
}, info) => {
  await openFixture(page, { payload, owner: 'calendar-new-title', persistWrites: true });
  const now = await page.evaluate(() => Date.now());
  const ongoing = {
    id: 269802,
    idMal: 269802,
    type: 'ANIME',
    title: { english: 'Airing Calendar Fixture', romaji: 'Airing Calendar Fixture' },
    format: 'TV',
    episodes: 12,
    status: 'RELEASING',
    startDate: { year: 2026, month: 9, day: 1 },
    seasonYear: 2026,
    genres: ['Action'],
    coverImage: {},
    relations: { edges: [] },
    nextAiringEpisode: { episode: 3, airingAt: (now + 3600000) / 1000 },
  };
  let scheduleChecks = 0;
  await page.route('https://graphql.anilist.co', (route) => {
    const { query, variables } = route.request().postDataJSON();
    if (variables?.search)
      return route.fulfill({
        json: { data: { Page: { media: [ongoing], pageInfo: { hasNextPage: false } } } },
      });
    if (
      variables?.id === ongoing.id &&
      query.includes('nextAiringEpisode') &&
      !query.includes('description')
    )
      scheduleChecks++;
    if (query.includes('airingSchedules(mediaId_in:'))
      return route.fulfill({
        json: {
          data: {
            Page: {
              pageInfo: { hasNextPage: false },
              airingSchedules: [
                { mediaId: ongoing.id, episode: 3, airingAt: (now + 3600000) / 1000 },
              ],
            },
          },
        },
      });
    return route.fulfill({
      json: {
        data: {
          Media: variables?.id === ongoing.id ? ongoing : null,
          a: { media: [] },
          b: { media: [] },
          Page: { media: [], pageInfo: { hasNextPage: false } },
        },
      },
    });
  });
  await page
    .locator(
      info.project.name.startsWith('iphone') ? '[data-mobile-nav="explore"]' : '#explore-nav',
    )
    .click();
  await page.locator('#global-search').fill('Airing Calendar Fixture');
  await page.locator('#global-search').dispatchEvent('input');
  await page.locator('#catalog-grid [data-preview="al-269802"]').first().click();
  await page.locator('[data-preview-add="al-269802"][data-preview-status="planning"]').click();
  await expect
    .poll(() =>
      page.evaluate(() => window.ATMobile113.state().anime.some((a) => a.sourceId === '269802')),
    )
    .toBe(true);
  await expect.poll(() => scheduleChecks).toBeGreaterThan(0);
  await page.locator('#detail-modal [data-close="detail-modal"]').first().click();
  await page.evaluate(() => document.querySelector('#pro-nav-calendar').click());
  await expect(page.locator('[data-pro-action="calendar-filter"][data-id="all"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.locator('[data-pro-action="calendar-view"][data-id="agenda"]').click();
  await expect(page.locator('.at-cal-agenda')).toContainText('Airing Calendar Fixture');
  await expect(page.locator('.at-cal-agenda')).toContainText('EP 3');
  const added = await page.evaluate(() =>
    window.ATMobile113.state().anime.find((a) => a.sourceId === '269802'),
  );
  expect(added.status).toBe('planning');
  expect(added.seasons[0].watched).toEqual([]);
});

test('the default calendar includes planned, paused and dropped titles with confirmed dates', async ({
  page,
}) => {
  const now = Date.parse('2026-09-30T12:00:00Z');
  const rows = ['planning', 'paused', 'dropped'].map((status, index) => ({
    ...structuredClone(payload.anime[0]),
    id: 'calendar-' + status,
    title: 'Calendar ' + status,
    status,
    sourceId: String(300001 + index),
    malId: '',
    seasons: [
      {
        id: 'part-' + status,
        title: 'Sezoni 1',
        source: 'AniList',
        sourceId: String(300001 + index),
        total: 12,
        watched: [],
        nextAiringEpisode: 2,
        nextAiringAt: (now + 3600000) / 1000,
      },
    ],
  }));
  await openFixture(page, { payload: { ...payload, anime: rows }, owner: 'calendar-all-statuses' });
  await page.evaluate(() => document.querySelector('#pro-nav-calendar').click());
  await page.locator('[data-pro-action="calendar-view"][data-id="agenda"]').click();
  for (const status of ['planning', 'paused', 'dropped'])
    await expect(page.locator('.at-cal-agenda')).toContainText('Calendar ' + status);
  await page.locator('[data-pro-action="calendar-filter"][data-id="watching"]').click();
  await expect(page.locator('.at-cal-empty')).toBeVisible();
  expect(await page.evaluate(() => window.ATMobile113.state().anime.map((a) => a.status))).toEqual([
    'planning',
    'paused',
    'dropped',
  ]);
});
