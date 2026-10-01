import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openFixture } from '../fixtures/browser-app.js';

const payload = {
  anime: [
    {
      id: 'ongoing',
      title: 'Overgeared — provë',
      status: 'watching',
      seasons: [
        {
          id: 'ongoing-s',
          format: 'TV',
          total: 12,
          watched: [],
          releaseStatus: 'RELEASING',
          nextAiringEpisode: 3,
          nextAiringAt: 1790856000,
        },
      ],
    },
    {
      id: 'eureka',
      title: 'Eureka',
      status: 'watching',
      seasons: [
        { id: 'tv1', format: 'TV', total: 1, watched: [1], releaseStatus: 'FINISHED' },
        { id: 'tv2', format: 'TV', total: 1, watched: [1], releaseStatus: 'FINISHED' },
        { id: 'tv3', format: 'TV', total: 1, watched: [1], releaseStatus: 'FINISHED' },
        {
          id: 'film2',
          title: 'Film',
          subtitle: 'Eureka — Filmi i dytë',
          format: 'MOVIE',
          total: 1,
          watched: [],
          releaseStatus: 'FINISHED',
        },
      ],
    },
  ],
  history: [],
  preferences: { weeklyGoal: 10 },
};

test('release availability and movie resume remain accurate in the actual home flow', async ({
  page,
}, info) => {
  await openFixture(page, { payload });
  const actual = await page.evaluate(() => window.ATMobile113.state().anime);
  expect(actual.find((a) => a.id === 'ongoing').seasons[0].total).toBe(12);
  if (info.project.name.startsWith('iphone')) {
    await expect(page.locator('.at114-watch-card').filter({ hasText: 'Overgeared' })).toContainText(
      '0/2',
    );
    const film = page.locator('.at114-watch-card').filter({ hasText: 'Eureka' });
    await expect(film).toContainText('Film');
    await expect(film).not.toContainText('S03 | E01');
    await film.locator('.at114-copy').click();
  } else {
    const ongoing = page.locator('.at-h2-lineup-card').filter({ hasText: 'Overgeared' });
    await expect(ongoing).toContainText('2 episode gati');
    const film = page.locator('.at-h2-lineup-card').filter({ hasText: 'Eureka' });
    await expect(film).toContainText('Film · Eureka — Filmi i dytë');
    await film.locator('.at-h4-details').click();
  }
  await expect(page.locator('#ep-detail-heading')).toHaveText('Eureka — Filmi i dytë · Film');
  await expect(page.locator('#ep-detail-body')).not.toContainText('Episodi 1');
  await page.screenshot({ path: info.outputPath('movie-resume.png') });
  await page.locator('[data-episode-mark]').click();
  await expect(page.locator('.release-feedback')).toContainText('Filmi u shënua');
  await expect
    .poll(() =>
      page.evaluate(
        () => window.ATMobile113.state().anime.find((a) => a.id === 'eureka').seasons[3].watched,
      ),
    )
    .toEqual([1]);
});

test('already watched completes released franchise seasons and leaves future parts untouched', async ({
  page,
}, info) => {
  await openFixture(page, { payload });
  const part = (id, title, episodes, status) => ({
    id,
    idMal: id,
    title: { romaji: title, english: title },
    format: 'TV',
    type: 'ANIME',
    episodes,
    status,
    startDate: { year: 2025, month: 1, day: 1 },
    relations: { edges: [] },
  });
  const first = part(269001, 'Complete series', 2, 'FINISHED'),
    second = part(269002, 'Complete series II', 3, 'FINISHED'),
    future = part(269003, 'Complete series III', 12, 'NOT_YET_RELEASED');
  future.startDate = { year: 2027, month: 1, day: 1 };
  first.relations.edges = [{ relationType: 'SEQUEL', node: second }];
  second.relations.edges = [{ relationType: 'SEQUEL', node: future }];
  await page.route('https://graphql.anilist.co', (route) => {
    const body = route.request().postDataJSON(),
      id = body.variables?.id;
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: body.query.includes('$search')
          ? { Page: { media: [first], pageInfo: { hasNextPage: false } } }
          : { Media: [first, second, future].find((m) => m.id === id) || null },
      }),
    });
  });
  await page
    .locator(
      info.project.name.startsWith('iphone') ? '[data-mobile-nav="explore"]' : '#explore-nav',
    )
    .click();
  await page.locator('#global-search').fill('Complete series');
  await page.locator('#catalog-grid [data-preview="al-269001"]').first().click();
  await page.locator('[data-preview-status="completed"]').click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.ATMobile113.state().anime.find((a) =>
            a.seasons.some((s) => s.sourceId === '269001'),
          )?.seasons.length,
      ),
    )
    .toBe(3);
  const added = await page.evaluate(() =>
    window.ATMobile113.state().anime.find((a) => a.seasons.some((s) => s.sourceId === '269001')),
  );
  expect(added.seasons.find((s) => s.sourceId === '269001').watched).toEqual([1, 2]);
  expect(added.seasons.find((s) => s.sourceId === '269002').watched).toEqual([1, 2, 3]);
  expect(added.seasons.find((s) => s.sourceId === '269003').watched).toEqual([]);
  expect(added.status).toBe('watching');
  const history = await page.evaluate(() =>
    window.ATMobile113.state().history.filter(
      (e) =>
        e.id ===
        window.ATMobile113.state().anime.find((a) => a.seasons.some((s) => s.sourceId === '269001'))
          .id,
    ),
  );
  expect(history.every((e) => e.action === 'season-watched')).toBe(true);
});

test('personal views expose confirmed upcoming episodes, Diary filters and accessible achievement art', async ({
  page,
}, info) => {
  const personal = structuredClone(payload);
  personal.anime[0].seasons[0] = {
    ...personal.anime[0].seasons[0],
    source: 'AniList',
    sourceId: '269900',
    watched: [1, 2],
  };
  personal.history = [
    {
      eventId: 'one',
      id: 'ongoing',
      seasonId: 'ongoing-s',
      episode: 1,
      action: 'watched',
      date: '2026-09-28T10:00:00Z',
      diaryNote: 'Shënimi im',
      diaryRating: 8,
    },
    {
      eventId: 'two',
      id: 'ongoing',
      seasonId: 'ongoing-s',
      episode: 2,
      action: 'watched',
      date: '2026-09-29T10:00:00Z',
    },
  ];
  await openFixture(page, { payload: personal });
  await page.route('https://graphql.anilist.co', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          a: {
            media: [
              {
                id: 269900,
                title: { romaji: 'Overgeared — provë' },
                nextAiringEpisode: { episode: 3, airingAt: 1790856000 },
                airingSchedule: { nodes: [] },
                future: {
                  nodes: [
                    { episode: 3, airingAt: 1790856000 },
                    { episode: 4, airingAt: 1790942400 },
                  ],
                },
              },
            ],
          },
          b: { media: [] },
        },
      }),
    }),
  );
  await page.locator('#pro-nav-calendar').evaluate((n) => n.click());
  await page.locator('[data-pro-action="calendar-refresh"]').click();
  await expect(page.locator('#pro-content')).toContainText('EP 3');
  await expect(page.locator('#pro-content')).toContainText('EP 4');
  const calendarAudit = await new AxeBuilder({ page })
    .include('#pro-content')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(
    calendarAudit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
  await page.evaluate(() => document.activeElement?.blur());
  await page.screenshot({ path: info.outputPath('calendar.png'), fullPage: true });
  await page.locator('#pro-nav-diary').evaluate((n) => n.click());
  await expect(page.locator('.at132-entry')).toHaveCount(2);
  await page.locator('#at132-diary-detail').selectOption('notes');
  await expect(page.locator('.at132-entry')).toHaveCount(1);
  await expect(page.locator('.at132-entry')).toContainText('Shënimi im');
  const diaryAudit = await new AxeBuilder({ page })
    .include('#pro-content')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(
    diaryAudit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
  await page.evaluate(() => document.activeElement?.blur());
  await page.screenshot({ path: info.outputPath('diary.png'), fullPage: true });
  await page.locator('#pro-nav-wrapped').evaluate((n) => n.click());
  await expect(page.locator('.at129-badge')).toHaveCount(29);
  await expect(page.locator('.at129-badge svg')).toHaveCount(29);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});

test('upgrade refreshes a saved twelve-episode estimate despite a fresh old daily cache', async ({
  page,
}) => {
  const owner = 'release-upgrade';
  await page.addInitScript(() => {
    localStorage.setItem(
      'animetrack_v6_meta',
      JSON.stringify({ catalogSyncAt: 1790769600000, upcomingCheckedAt: 1790769600000 }),
    );
    localStorage.setItem('animetrack_release_sync_v93_release-upgrade', '1790769600000');
  });
  const data = {
    anime: [
      {
        id: 'old-overgeared',
        title: 'Overgeared',
        source: 'AniList',
        sourceId: '299001',
        status: 'watching',
        format: 'TV',
        year: 2026,
        hydrated: true,
        seasons: [
          {
            id: 'al-299001',
            source: 'AniList',
            sourceId: '299001',
            subtitle: 'Overgeared',
            year: 2026,
            total: 12,
            watched: [1, 2],
            releaseStatus: 'RELEASING',
            airedCount: 12,
          },
        ],
      },
    ],
    history: [],
    preferences: {},
  };
  await openFixture(page, { payload: data, owner });
  let requestedPast = false;
  await page.route('https://graphql.anilist.co', async (route) => {
    const body = route.request().postDataJSON();
    if (body.query.includes('averageScore') && body.query.includes('id_in')) {
      requestedPast = body.query.includes('airingSchedule(notYetAired:false');
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            a: {
              media: [
                {
                  id: 299001,
                  episodes: 12,
                  status: 'RELEASING',
                  format: 'TV',
                  airingSchedule: { nodes: [{ episode: 2, airingAt: 1790670000 }] },
                  relations: { edges: [] },
                },
              ],
            },
            b: { media: [] },
          },
        }),
      });
    }
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { Page: { media: [] } } }),
    });
  });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.ATMobile113?.state().anime.find((a) => a.id === 'old-overgeared')?.seasons[0]
            .airedCount,
      ),
    )
    .toBe(2);
  expect(requestedPast).toBe(true);
  const saved = await page.evaluate(() =>
    window.ATMobile113.state().anime.find((a) => a.id === 'old-overgeared'),
  );
  expect(saved.seasons[0].total).toBe(12);
  expect(saved.seasons[0].watched).toEqual([1, 2]);
  expect(saved.status).toBe('watching');
});

test('a serial shows the exact Cinemeta episode image and description when TVmaze is unavailable', async ({
  page,
}, info) => {
  const data = {
    anime: [
      {
        id: 'serial',
        title: 'Serial fallback',
        source: 'TVMaze',
        sourceId: '99991',
        tvmazeId: '99991',
        imdbId: 'tt1196946',
        status: 'watching',
        format: 'TV_SERIES',
        hydrated: true,
        seasons: [
          {
            id: 'tv-99991-2',
            source: 'TVMaze',
            sourceId: '99991',
            format: 'TV_SERIES',
            total: 2,
            watched: [1],
            episodes: [],
          },
        ],
      },
    ],
    history: [],
    preferences: {},
  };
  await openFixture(page, { payload: data });
  await page.route('https://api.tvmaze.com/**', (route) =>
    route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }),
  );
  await page.route('https://v3-cinemeta.strem.io/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        meta: {
          id: 'tt1196946',
          type: 'series',
          videos: [
            { season: 1, episode: 2, title: 'Wrong season', overview: 'Wrong text' },
            {
              season: 2,
              episode: 2,
              title: 'Verified serial episode',
              overview: 'Description for this exact second-season episode.',
              thumbnail: 'https://images.example.test/serial-2.jpg',
            },
          ],
        },
      }),
    }),
  );
  if (info.project.name.startsWith('iphone'))
    await page
      .locator('.at114-watch-card')
      .filter({ hasText: 'Serial fallback' })
      .locator('.at114-copy')
      .click();
  else
    await page
      .locator('.at-h2-lineup-card')
      .filter({ hasText: 'Serial fallback' })
      .locator('.at-h4-details')
      .click();
  await expect(page.locator('#ep-detail-body')).toContainText(
    'Description for this exact second-season episode.',
  );
  await expect(page.locator('#ep-detail-body')).toContainText('Cinemeta');
  await expect(page.locator('.ep-detail-visual img')).toHaveAttribute(
    'src',
    'https://images.example.test/serial-2.jpg',
  );
  await expect(page.locator('#ep-detail-body')).not.toContainText('Wrong text');
});
