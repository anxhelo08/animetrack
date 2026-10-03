import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';

test.use({ serviceWorkers: 'block' });
const payload = {
  version: 14,
  anime: [
    {
      id: 'returning-series',
      title: 'Returning Series',
      source: 'AniList',
      sourceId: '7',
      malId: '70',
      status: 'completed',
      format: 'TV',
      notes: 'Private notes',
      rating: 9,
      cover: '/covers/one-piece.jpg',
      seasons: [
        {
          id: 'al-7',
          title: 'Sezoni 1',
          source: 'AniList',
          sourceId: '7',
          malId: '70',
          format: 'TV',
          total: 2,
          watched: [1, 2],
          releaseStatus: 'FINISHED',
        },
      ],
    },
  ],
  history: [],
  preferences: {},
};
const row = (page) => page.evaluate(() => window.ATMobile113.state().anime[0]);
async function mockSchedule(page, { sequel = false, when }) {
  await page.route('https://graphql.anilist.co', (route) => {
    const query = route.request().postDataJSON().query;
    const media = {
      id: 7,
      idMal: 70,
      type: 'ANIME',
      format: 'TV',
      episodes: 2,
      status: 'FINISHED',
      title: { english: 'Returning Series' },
      relations: { edges: [] },
    };
    if (sequel)
      media.relations.edges.push({
        relationType: 'SEQUEL',
        node: {
          id: 8,
          idMal: 80,
          type: 'ANIME',
          format: 'TV',
          episodes: 12,
          status: 'RELEASING',
          title: { english: 'Returning Series 2' },
          nextAiringEpisode: null,
        },
      });
    const data = query.includes('airingSchedules(mediaId_in:')
      ? {
          Page: {
            pageInfo: { hasNextPage: false },
            airingSchedules: [
              { mediaId: sequel ? 8 : 7, episode: sequel ? 1 : 3, airingAt: when / 1000 },
            ],
          },
        }
      : query.includes('Media(id:$id,idMal:$idMal')
        ? { Media: media }
        : { Media: null, Page: { media: [], pageInfo: { hasNextPage: false } } };
    return route.fulfill({ json: { data } });
  });
  await page.route('https://api.jikan.moe/**', (route) => route.fulfill({ status: 503, json: {} }));
}
async function calendar(page) {
  await page.evaluate(() => document.querySelector('#pro-nav-calendar').click());
  await expect(page.locator('.at-cal-stage')).toHaveAttribute('aria-busy', 'false');
  await page.locator('[data-pro-action="calendar-refresh"]').first().click();
  await expect(page.locator('.at-cal-stage')).toHaveAttribute('aria-busy', 'false');
}
async function library(page) {
  await page.evaluate(() => document.querySelector('#library-nav').click());
}

test('a new release restores Watching, shows NEW on both devices and survives reload without changing progress', async ({
  page,
}) => {
  await openFixture(page, { payload, owner: 'returning-release', persistWrites: true });
  const now = await page.evaluate(() => Date.now());
  await mockSchedule(page, { when: now - 60000 });
  await calendar(page);
  await expect.poll(async () => (await row(page)).status).toBe('watching');
  const current = await row(page);
  expect(current.seasons[0].watched).toEqual([1, 2]);
  expect(current.seasons[0].episodes.find((ep) => ep.number === 3).airedAt).toBe(
    new Date(now - 60000).toISOString(),
  );
  expect(current.notes).toBe('Private notes');
  expect(current.rating).toBe(9);
  await library(page);
  await expect(page.locator('#anime-grid .anime-new-episode')).toBeVisible();
  await page
    .locator('#anime-grid .anime-card')
    .screenshot({ path: test.info().outputPath('new-episode-library.png') });
  await page.evaluate(() => document.querySelector('#home-nav').click());
  await expect(
    page
      .locator(
        test.info().project.name.startsWith('iphone')
          ? '#mobile-continue .watch-row-new'
          : '.at-h2-lineup-card .anime-new-inline',
      )
      .first(),
  ).toBeVisible();
  await library(page);
  await expect
    .poll(() => page.evaluate(() => window.__ATFixtureLibraryCalls.write))
    .toBeGreaterThan(0);
  await page.reload();
  await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
  expect((await row(page)).seasons[0].watched).toEqual([1, 2]);
  await library(page);
  await expect(page.locator('#anime-grid .anime-new-episode')).toBeVisible();
  await page.locator('#anime-grid [data-next="returning-series"]').click();
  await expect.poll(async () => (await row(page)).seasons[0].watched).toEqual([1, 2, 3]);
  await expect(page.locator('#anime-grid .anime-new-episode')).toHaveCount(0);
});

test('a verified sequel adds its first episode to its own season, preserving the completed original', async ({
  page,
}) => {
  await openFixture(page, { payload, owner: 'returning-sequel', persistWrites: true });
  const now = await page.evaluate(() => Date.now());
  await mockSchedule(page, { sequel: true, when: now - 60000 });
  await calendar(page);
  await expect.poll(async () => (await row(page)).seasons.length).toBe(2);
  const current = await row(page);
  expect(current.status).toBe('watching');
  expect(current.seasons[0].watched).toEqual([1, 2]);
  expect(current.seasons[1]).toMatchObject({
    id: 'al-8',
    sourceId: '8',
    watched: [],
    airedCount: 1,
  });
  await library(page);
  await page.locator('#anime-grid [data-next="returning-series"]').click();
  await expect.poll(async () => (await row(page)).seasons[1].watched).toEqual([1]);
  expect((await row(page)).seasons[0].watched).toEqual([1, 2]);
});

for (const sequel of [false, true])
  test(`the visible clock applies a confirmed ${sequel ? 'sequel' : 'episode'} while providers are offline`, async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-09-30T12:00:00Z') });
    await openFixture(page, { payload, owner: 'returning-clock', persistWrites: true });
    const now = await page.evaluate(() => Date.now());
    await mockSchedule(page, { sequel, when: now + 60000 });
    await calendar(page);
    if (sequel) await expect(page.locator('.at-cal-followed')).toContainText('EP 1');
    else await expect.poll(async () => (await row(page)).seasons[0].episodes.length).toBe(1);
    expect((await row(page)).status).toBe('completed');
    await library(page);
    await expect(page.locator('#anime-grid .anime-new-episode')).toHaveCount(0);
    await page.route('https://graphql.anilist.co', (route) =>
      route.fulfill({ status: 503, json: {} }),
    );
    await page.clock.setSystemTime(new Date(now + 60001));
    await page.clock.runFor(31000);
    await expect.poll(async () => (await row(page)).status).toBe('watching');
    expect((await row(page)).seasons[0].watched).toEqual([1, 2]);
    if (sequel) expect((await row(page)).seasons[1]).toMatchObject({ id: 'al-8', watched: [] });
    await expect(page.locator('#anime-grid .anime-new-episode')).toBeVisible();
  });
