import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openFixture } from '../fixtures/browser-app.js';

const payload = {
  anime: [
    {
      id: 'mobile-story',
      title: 'Demon Slayer',
      status: 'watching',
      source: 'AniList',
      sourceId: '101922',
      hydrated: true,
      franchiseVersion: '13.1.0',
      cover: 'http://127.0.0.1:8765/welcome/demon-slayer.jpg',
      genre: 'Action, Fantasy',
      year: 2019,
      updatedAt: '2026-09-30T10:00:00Z',
      seasons: [
        {
          id: 'season-one',
          title: 'Sezoni 1',
          format: 'TV',
          total: 2,
          watched: [1, 2],
          releaseStatus: 'FINISHED',
          releaseStart: '2019-04-06',
        },
        {
          id: 'movie-part',
          title: 'Filmi',
          format: 'MOVIE',
          total: 1,
          watched: [1],
          releaseStatus: 'FINISHED',
          releaseStart: '2020-10-16',
        },
        {
          id: 'ova-part',
          title: 'Bonus',
          format: 'OVA',
          total: 1,
          watched: [1],
          releaseStatus: 'FINISHED',
          releaseStart: '2021-01-01',
        },
        {
          id: 'special-part',
          title: 'Special',
          format: 'SPECIAL',
          total: 1,
          watched: [1],
          releaseStatus: 'FINISHED',
          releaseStart: '2021-02-01',
        },
        {
          id: 'season-two',
          title: 'Sezoni 2',
          format: 'TV',
          total: 3,
          watched: [1],
          releaseStatus: 'FINISHED',
          releaseStart: '2021-10-10',
          episodes: [
            {
              number: 2,
              title: 'Një fillim i ri',
              aired: '2021-10-17',
              image: 'http://127.0.0.1:8765/welcome/demon-slayer.jpg',
            },
            { number: 3, title: 'Premiera e ardhshme', airedAt: '2099-10-10T10:00:00Z' },
          ],
        },
      ],
    },
  ],
  history: [],
  preferences: {},
};
const state = (page) => page.evaluate(() => JSON.stringify(window.ATMobile113.state().anime));

for (const width of [375, 390, 430]) {
  test(`mobile navigation, discovery, detail and tracking remain usable at ${width}px`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'iphone-chromium', 'Phone-specific presentation.');
    await page.setViewportSize({ width, height: 844 });
    await openFixture(page, { payload, owner: 'mobile-premium-' + width });
    const initial = await state(page);
    await expect(page.locator('.at-mobile-nav > button')).toHaveCount(5);
    await expect(page.locator('[data-mobile-nav="home"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#mobile-continue')).toContainText('S2 EP2');
    await expect(page.locator('#mobile-continue')).toBeVisible();
    await expect(page.locator('#at-iphone-feed')).not.toBeVisible();
    expect(
      await page
        .locator('.at-mobile-nav')
        .evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length),
    ).toBe(5);
    await expect(page.locator('[data-mobile-home-tab="watch"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('#mobile-continue .watch-row')).toHaveCount(1);
    await page.locator('[data-mobile-home-layout="grid"]').click();
    await expect(page.locator('.watch-home-content')).toHaveAttribute('data-layout', 'grid');
    await page.locator('[data-mobile-home-layout="list"]').click();
    await page.locator('[data-mobile-home-tab="upcoming"]').click();
    await expect(page.locator('#mobile-upcoming')).toBeVisible();
    await expect(page.locator('#mobile-upcoming')).toContainText('2099');
    await expect(page.locator('#mobile-upcoming .watch-row-mark')).toBeDisabled();
    expect(await state(page)).toBe(initial);
    await page.locator('[data-mobile-home-tab="watch"]').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`home-${width}.png`), fullPage: true });
    await page.screenshot({ path: info.outputPath(`home-screen-${width}.png`) });
    const axe = await new AxeBuilder({ page })
      .include('#mobile-home')
      .include('.at-mobile-nav')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(axe.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
      [],
    );

    await page.locator('[data-mobile-nav="explore"]').click();
    await expect(page.locator('#mobile-browse .mobile-browse-grid button')).toHaveCount(9);
    await page.locator('#global-search').fill('Demon');
    await expect(page.locator('#mobile-search-filters')).toBeVisible();
    await page.locator('[data-mobile-filter="people"]').click();
    await expect(page.locator('#mobile-people')).toBeVisible();
    await page.locator('#clear-global').click();
    await expect(page.locator('#mobile-browse')).toBeVisible();
    await page.screenshot({ path: info.outputPath(`discover-${width}.png`), fullPage: true });

    await page.locator('[data-mobile-nav="library"]').click();
    await expect(page.locator('#mobile-library-controls')).not.toHaveAttribute('open', '');
    await page.locator('#mobile-library-controls summary').click();
    await expect(page.locator('#sort')).toBeVisible();
    await expect(page.locator('#at116-import-file')).toBeVisible();
    await page.locator('#sort').selectOption('title');
    await page.locator('#mobile-library-controls summary').click();
    await expect(page.locator('#at116-import-file')).not.toBeVisible();
    await page.screenshot({ path: info.outputPath(`library-${width}.png`) });
    await page.locator('#anime-grid [data-detail]').first().click();
    await expect(page.locator('.mobile-detail-cta')).toHaveText('Vazhdo • S2 EP2');
    await expect(page.locator('.mobile-watch-next')).toContainText('Një fillim i ri');
    await expect(page.locator('.mobile-season-count')).toHaveCount(5);
    expect(await page.locator('.season-tab strong').allTextContents()).toEqual([
      'Sezoni 1',
      'Film',
      'OVA',
      'Special',
      'Sezoni 2',
    ]);
    await expect
      .poll(() =>
        page
          .locator('#detail-modal .modal')
          .evaluate((node) => Math.round(node.getBoundingClientRect().top)),
      )
      .toBe(0);
    await page.screenshot({ path: info.outputPath(`detail-${width}.png`) });
    await page.locator('[data-mobile-detail-tab="timeline"]').click();
    await expect(page.locator('.mobile-timeline')).toBeVisible();
    await page.locator('[data-mobile-detail-tab="reviews"]').click();
    await expect(page.locator('[data-anime-rating]')).toBeVisible();
    await page.locator('[data-mobile-detail-tab="overview"]').click();
    await expect(page.locator('[data-edit]').first()).toBeVisible();
    expect(await state(page)).toBe(initial);
    await page.locator('#detail-modal [data-close]').click();

    await page.locator('[data-mobile-nav="home"]').click();
    await page.locator('#mobile-continue .media-card-mark').click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.ATMobile113.state().anime[0].seasons.find((s) => s.id === 'season-two').watched,
        ),
      )
      .toEqual([1, 2]);
    await page.locator('.release-feedback button').click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.ATMobile113.state().anime[0].seasons.find((s) => s.id === 'season-two').watched,
        ),
      )
      .toEqual([1]);
    await expect(page.locator('.release-feedback')).toContainText('Shënimi u zhbë');
    expect(await page.evaluate(() => window.ATMobile113.state().anime[0].status)).toBe('watching');
    await page.locator('[data-mobile-nav="profile"]').click();
    await expect(page.locator('.at-profile-tabs')).toContainText('Ditari');
    await expect(page.locator('.at-profile-tabs')).toContainText('Miqtë');
    await expect(page.locator('.mobile-profile-settings')).toBeVisible();
    await page.locator('.mobile-profile-settings').click();
    await expect(page.locator('.at-profile-settings')).toBeVisible();
    await page.locator('.at-profile-tabs [data-id="overview"]').click();
    await page.screenshot({ path: info.outputPath(`profile-${width}.png`) });
    for (const destination of ['calendar', 'notifications', 'friends']) {
      await page.locator('[data-mobile-nav="home"]').click();
      await page.locator(`#mobile-home [data-mobile-target="${destination}"]`).first().click();
      await expect(page.locator('#pro-view')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: info.outputPath(`${destination}-${width}.png`) });
    }
  });
}

test('mobile discovery filters real results and studio failure can be retried', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'iphone-chromium', 'Mobile discovery.');
  await page.setViewportSize({ width: 390, height: 844 });
  await openFixture(page, { payload });
  const before = await state(page);
  let studiosFail = true;
  const media = {
    id: 16498,
    idMal: 16498,
    title: { romaji: 'Attack on Titan', english: 'Attack on Titan' },
    coverImage: { large: 'http://127.0.0.1:8765/welcome/attack-on-titan.jpg' },
    episodes: 25,
    format: 'TV',
    status: 'FINISHED',
    genres: ['Action'],
    averageScore: 88,
    seasonYear: 2013,
  };
  await page.route('https://graphql.anilist.co', (route) => {
    const query = route.request().postDataJSON()?.query || '';
    if (query.includes('studios('))
      return route.fulfill({
        status: studiosFail ? 503 : 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { Page: { studios: [{ id: 1, name: 'Wit Studio', media: { nodes: [media] } }] } },
        }),
      });
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: { Page: { media: [media], pageInfo: { hasNextPage: false } } },
      }),
    });
  });
  await page.route('https://api.tvmaze.com/search/shows?**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          show: {
            id: 777,
            name: 'Dexter',
            premiered: '2006-10-01',
            genres: ['Drama'],
            summary: 'A detective series.',
          },
        },
      ]),
    }),
  );
  await page.locator('[data-mobile-nav="explore"]').click();
  await page.locator('#global-search').fill('Titan');
  await expect(page.locator('#catalog-grid [data-media-kind="anime"]')).toBeVisible();
  await expect(page.locator('#catalog-grid [data-media-kind="tv"]')).toBeVisible();
  await page.locator('[data-mobile-filter="anime"]').click();
  await expect(page.locator('#catalog-grid [data-media-kind="tv"]')).not.toBeVisible();
  await page.locator('[data-mobile-filter="tv"]').click();
  await expect(page.locator('#catalog-grid [data-media-kind="anime"]')).not.toBeVisible();
  await expect(page.locator('#catalog-grid [data-media-kind="tv"]')).toBeVisible();
  await page.locator('[data-mobile-filter="movie"]').click();
  await expect(page.locator('#mobile-filter-empty')).toBeVisible();
  await page.locator('#clear-global').click();
  await page.locator('[data-mobile-browse="studios"]').click();
  await expect(page.locator('#mobile-browse-content')).toContainText('Studiot nuk u ngarkuan.');
  studiosFail = false;
  await page.locator('#mobile-browse-content [data-mobile-browse="studios"]').click();
  await expect(page.locator('.mobile-studio summary')).toHaveText('Wit Studio');
  await page.locator('.mobile-studio summary').click();
  await expect(page.locator('.mobile-studio .media-card-title')).toHaveText('Attack on Titan');
  await page.locator('.mobile-studio .media-card-title').click();
  await expect(page.locator('#detail-modal.show')).toBeVisible();
  await expect(page.locator('#detail-modal .mobile-detail-hero')).toContainText('Attack on Titan');
  expect(await state(page)).toBe(before);
});
