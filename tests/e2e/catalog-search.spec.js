import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openFixture } from '../fixtures/browser-app.js';
import { demonFixture } from '../fixtures/franchise-137.js';

const media = (id, title, year, format = 'TV') => ({
  id,
  idMal: id,
  type: 'ANIME',
  title: { romaji: title, english: title },
  format,
  episodes: format === 'MOVIE' ? 1 : 12,
  status: 'FINISHED',
  seasonYear: year,
  startDate: { year, month: 1, day: 1 },
  genres: ['Action'],
  coverImage: {},
  relations: { edges: [] },
});
const first = media(269401, 'Attack on Titan', 2013),
  second = media(269402, 'Attack on Titan Season 2', 2017),
  film = media(269403, 'The Last Attack', 2024, 'MOVIE');
first.relations.edges = [{ relationType: 'SEQUEL', node: second }];
second.relations.edges = [{ relationType: 'SEQUEL', node: film }];
const unrelated = media(269490, 'Attack on Titan: unrelated title', 2020);
const naruto = media(269500, 'Naruto', 2002);
async function ready(page) {
  await openFixture(page);
  await page.waitForFunction(
    () =>
      typeof window.ATMobile113?.state === 'function' &&
      window.ATMobile113.state().anime.length > 0,
  );
}
async function browse(page, info) {
  await page
    .locator(
      info.project.name.startsWith('iphone') ? '[data-mobile-nav="explore"]' : '#explore-nav',
    )
    .click();
}

test('search shows linked seasons immediately without waiting for TV, preserves nodes and ignores stale requests', async ({
  page,
}, info) => {
  await ready(page);
  const before = await page.evaluate(() => window.ATMobile113.state().anime);
  let tv,
    searches = 0;
  await page.route('https://graphql.anilist.co', (route) => {
    const body = route.request().postDataJSON();
    if (body.variables?.search) searches++;
    return route.fulfill({
      json: {
        data: {
          Page: {
            media:
              body.variables?.search === 'Naruto' ? [naruto] : [first, second, film, unrelated],
            pageInfo: { hasNextPage: false },
          },
        },
      },
    });
  });
  await page.route('https://api.tvmaze.com/search/shows?**', (route) => {
    if (new URL(route.request().url()).searchParams.get('q') === 'Attack') tv = route;
    else return route.fulfill({ json: [] });
  });
  if (info.project.name.startsWith('iphone')) {
    await browse(page, info);
    await page.locator('#global-search').pressSequentially('Attack', { delay: 25 });
  } else {
    await page.evaluate(() => {
      window.__homeStage = document.querySelector('.pulse-stage');
    });
    await page.locator('#search').pressSequentially('Attack', { delay: 25 });
    await expect(page.locator('#home-view')).toBeVisible();
    await expect(page.locator('#top-results')).toBeVisible();
    await expect(page.locator('#top-results')).toContainText('Attack on Titan');
    expect(
      await page.evaluate(() => window.__homeStage === document.querySelector('.pulse-stage')),
    ).toBe(true);
    await page.locator('#see-all-search').click();
  }
  await expect(page.locator('#catalog-grid .catalog-card')).toHaveCount(2);
  expect(searches).toBe(1);
  await expect.poll(() => !!tv).toBe(true);
  const card = page.locator('#catalog-grid .catalog-card').first();
  await expect(card).toContainText('2 sezone · 1 film');
  await page.evaluate(() => {
    window.__catalogFirst = document.querySelector('#catalog-grid .catalog-card');
  });
  await card.locator('.catalog-family-summary button').click();
  await expect(page.locator('.catalog-family-part')).toHaveCount(3);
  await expect(page.locator('.catalog-family-part strong')).toHaveText([
    'Sezoni 1',
    'Sezoni 2',
    'Film',
  ]);
  await page.locator('.catalog-family-part[data-preview="al-269403"]').click();
  await expect(page.locator('#detail-body h3').first()).toHaveText('The Last Attack');
  const axe = await new AxeBuilder({ page })
    .include('#detail-modal')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(axe.violations.map((item) => item.id)).toEqual([]);
  await page.screenshot({ path: info.outputPath('grouped-seasons.png'), fullPage: false });
  await page.keyboard.press('Escape');
  await tv.fulfill({ json: [] });
  expect(
    await page.evaluate(
      () => window.__catalogFirst === document.querySelector('#catalog-grid .catalog-card'),
    ),
  ).toBe(true);
  await page.locator('#global-search').fill('Naruto');
  await expect(page.locator('#catalog-grid .catalog-card')).toHaveCount(1);
  await expect(page.locator('#catalog-grid')).toContainText('Naruto');
  await expect(page.locator('#catalog-grid')).not.toContainText('Attack');
  expect(await page.evaluate(() => window.ATMobile113.state().anime)).toEqual(before);
});

test('saved-email autofill cannot populate any catalogue search or start an online search', async ({
  page,
}, info) => {
  await ready(page);
  let searches = 0;
  await page.route('https://graphql.anilist.co', (route) => {
    if (route.request().postDataJSON().variables?.search) searches++;
    return route.fulfill({
      json: { data: { Page: { media: [], pageInfo: { hasNextPage: false } } } },
    });
  });
  await browse(page, info);
  await page.locator('#seasons-nav').dispatchEvent('click');
  await expect(page.locator('#seasons-view')).toBeVisible();
  for (const id of ['search', 'global-search', 'season-genre-search']) {
    const input = page.locator('#' + id);
    await input.evaluate((node) => {
      node.value = 'fixture@example.com';
      node.dispatchEvent(
        new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }),
      );
    });
    await expect(input).toHaveValue('');
    await expect(input).toHaveAttribute('type', 'search');
    await expect(input).toHaveAttribute('autocomplete', 'off');
    expect(
      await input.evaluate((node) => node.form?.querySelector('input[type="password"]') === null),
    ).toBe(true);
  }
  await page.waitForTimeout(400);
  expect(searches).toBe(0);
  await page.locator('#season-genre-search').fill('Attack');
  await expect(page.locator('#season-genre-search')).toHaveValue('Attack');
});

test('a late response to an old query cannot replace the current results', async ({
  page,
}, info) => {
  await ready(page);
  let old;
  await page.route('https://graphql.anilist.co', (route) => {
    const query = route.request().postDataJSON().variables?.search;
    if (query === 'Attack') {
      old = route;
      return;
    }
    return route.fulfill({
      json: {
        data: {
          Page: { media: query === 'Naruto' ? [naruto] : [], pageInfo: { hasNextPage: false } },
        },
      },
    });
  });
  await browse(page, info);
  await page.locator('#global-search').fill('Attack');
  await expect.poll(() => !!old).toBe(true);
  await page.locator('#global-search').fill('Naruto');
  await expect(page.locator('#catalog-grid')).toContainText('Naruto');
  await old.fulfill({
    json: { data: { Page: { media: [first, second, film], pageInfo: { hasNextPage: false } } } },
  });
  await page.waitForTimeout(100);
  await expect(page.locator('#catalog-grid .catalog-card')).toHaveCount(1);
  await expect(page.locator('#catalog-grid')).not.toContainText('Attack');
});

for (const action of ['click', 'Enter']) {
  test(`a film in header search opens its movie details with ${action}`, async ({ page }, info) => {
    test.skip(info.project.name.startsWith('iphone'), 'Header search is desktop-only.');
    await ready(page);
    await page.route('**/api/cinemeta?**', (route) => {
      const item = {
        id: 'tt1375666',
        type: 'movie',
        name: 'Inception',
        releaseInfo: '2010',
        runtime: '148 min',
        director: ['Christopher Nolan'],
        description: 'A movie about dreams.',
      };
      return route.fulfill({
        json:
          new URL(route.request().url()).searchParams.get('mode') === 'meta'
            ? { meta: item }
            : { metas: [item] },
      });
    });
    await page.locator('#search').fill('Inception');
    const result = page.locator('#top-results .top-result').filter({ hasText: 'Inception' });
    await expect(result).toBeVisible();
    if (action === 'click') await result.click();
    else await page.locator('#search').press('Enter');
    await expect(page.locator('#detail-modal')).toBeVisible();
    await expect(page.locator('#detail-heading')).toHaveText('Detajet e filmit');
    await expect(page.locator('#detail-body')).toContainText('148 min');
    await expect(page.locator('#detail-body')).toContainText('Christopher Nolan');
    await expect(page.locator('[data-preview-add]')).toHaveCount(0);
    await expect(page.locator('[data-movie-add="planning"]')).toBeVisible();
  });
}

test('pagination preserves pending movies and a new query discards old movie responses', async ({
  page,
}, info) => {
  await ready(page);
  await page.route('https://graphql.anilist.co', (route) => {
    const { page: number, search } = route.request().postDataJSON().variables || {};
    return route.fulfill({
      json: {
        data: {
          Page: {
            media: search === 'Naruto' ? [naruto] : number === 2 ? [unrelated] : [first],
            pageInfo: { hasNextPage: search !== 'Naruto' && number === 1 },
          },
        },
      },
    });
  });
  await page.evaluate(() => {
    window.__movieQueries = [];
    window.ATMovies12150.search = (query, { signal }) =>
      new Promise((resolve) => {
        window.__movieQueries.push({ query, signal, resolve });
      });
  });
  await browse(page, info);
  await page.locator('#global-search').fill('Attack');
  await expect(page.locator('#catalog-more')).toBeVisible();
  await page.locator('#catalog-more').click();
  await expect(page.locator('#catalog-grid')).toContainText('unrelated title');
  expect(await page.evaluate(() => window.__movieQueries[0].signal.aborted)).toBe(false);
  await page.evaluate(() =>
    window.__movieQueries[0].resolve({
      provider: 'Cinemeta',
      items: [
        {
          kind: 'movie',
          key: 'movie-cinemeta-tt1375666',
          source: 'Cinemeta',
          sourceId: 'tt1375666',
          title: 'Inception',
          year: 2010,
          format: 'MOVIE',
        },
      ],
    }),
  );
  await expect(page.locator('#catalog-grid')).toContainText('Inception');
  await expect(page.locator('#catalog-grid')).not.toHaveAttribute('aria-busy', 'true');
  expect(await page.evaluate(() => window.__movieQueries.length)).toBe(1);
  await page.locator('#global-search').fill('Old movie');
  await expect.poll(() => page.evaluate(() => window.__movieQueries.length)).toBe(2);
  await page.locator('#global-search').fill('Naruto');
  await expect.poll(() => page.evaluate(() => window.__movieQueries.length)).toBe(3);
  expect(await page.evaluate(() => window.__movieQueries[1].signal.aborted)).toBe(true);
  await page.evaluate(() => {
    window.__movieQueries[1].resolve({
      provider: 'Cinemeta',
      items: [
        {
          kind: 'movie',
          key: 'stale-movie',
          source: 'Cinemeta',
          sourceId: 'tt1',
          title: 'Stale film',
        },
      ],
    });
    window.__movieQueries[2].resolve({ provider: 'Cinemeta', items: [] });
  });
  await expect(page.locator('#catalog-grid')).toContainText('Naruto');
  await expect(page.locator('#catalog-grid')).not.toContainText('Stale film');
  await expect(page.locator('#catalog-grid')).not.toContainText('Inception');
});

test('catalogue families show missing parts when a season is already in the library', async ({
  page,
}, info) => {
  const saved = demonFixture().anime;
  const payload = { anime: [saved], history: [], preferences: {} };
  Object.assign(saved, {
    source: 'AniList',
    sourceId: String(first.id),
    malId: String(first.idMal),
  });
  Object.assign(saved.seasons[0], {
    source: 'AniList',
    sourceId: String(first.id),
    malId: String(first.idMal),
  });
  await openFixture(page, { payload });
  await page.waitForFunction(() => window.ATMobile113?.state().anime.length > 0);
  const before = await page.evaluate(() => window.ATMobile113.state().anime);
  await page.route('https://graphql.anilist.co', (route) =>
    route.fulfill({
      json: {
        data: { Page: { media: [first, second, film], pageInfo: { hasNextPage: false } } },
      },
    }),
  );
  await browse(page, info);
  await page.locator('#global-search').fill('Attack');
  await page.locator('.catalog-family-summary button').click();
  await expect(page.locator('.catalog-family-part')).toHaveCount(3);
  await expect(page.locator('.catalog-family-part').first()).toContainText('Në bibliotekë');
  await page.locator(`.catalog-family-part[data-preview="al-${film.id}"]`).click();
  await expect(page.locator('#detail-body h3').first()).toHaveText('The Last Attack');
  await expect(page.locator(`[data-preview-add="al-${film.id}"]`).first()).toBeVisible();
  expect(await page.evaluate(() => window.ATMobile113.state().anime)).toEqual(before);
});
