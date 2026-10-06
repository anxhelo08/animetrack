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
const state = (page) => page.evaluate(() => window.ATMobile113.state().anime);

for (const width of [320, 375, 390, 430]) {
  test(`mobile navigation, discovery, detail and tracking remain usable at ${width}px`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'iphone-chromium', 'Phone-specific presentation.');
    await page.setViewportSize({ width, height: 844 });
    await openFixture(page, { payload, owner: 'mobile-premium-' + width });
    const initial = await state(page);
    await expect(page.locator('#mobile-history .watch-row-seen')).toHaveCount(1);
    await expect(page.locator('#mobile-history')).toContainText('S2 EP1');
    await expect(page.locator('#mobile-history .watch-row-copy p')).toHaveText('Episod i parë');
    await expect(page.locator('#mobile-continue .watch-row-seen')).toHaveCount(0);
    expect(
      await page.locator('.at-mobile-nav').evaluate((node) => node.getBoundingClientRect().height),
    ).toBeLessThanOrEqual(64);
    expect(
      await page
        .locator('.at-mobile-nav')
        .evaluate((node) => Math.round(node.getBoundingClientRect().bottom)),
    ).toBe(844);
    await page.evaluate(() => {
      window.mobileRowBeforeTap = document.querySelector('#mobile-continue .watch-row');
    });
    await page.locator('[data-mobile-nav="home"]').tap();
    await page.locator('[data-mobile-nav="home"]').tap();
    expect(await page.evaluate(() => visualViewport.scale)).toBe(1);
    expect(
      await page.evaluate(
        () => window.mobileRowBeforeTap === document.querySelector('#mobile-continue .watch-row'),
      ),
    ).toBe(true);
    await page.locator('[data-mobile-nav="diary"]').tap();
    await expect(page.locator('.at132-diary')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.locator('[data-mobile-nav="home"]').tap();
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
    await expect(page.locator('#mobile-upcoming .watch-row-mark')).toHaveCount(0);
    await expect(page.locator('#mobile-upcoming .watch-row-pending')).toBeVisible();
    expect(await state(page)).toEqual(initial);
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
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1),
    ).toBe(true);
    expect(
      await page
        .locator('#discover .big-search')
        .evaluate((node) => node.getBoundingClientRect().top),
    ).toBeLessThan(135);
    expect(
      await page.locator('#mobile-browse').evaluate((node) => node.getBoundingClientRect().top),
    ).toBeLessThan(220);
    expect(
      await page.locator('#product-tools').evaluate((node) =>
        [...node.querySelectorAll('button:not([hidden])')].every((button) => {
          const r = button.getBoundingClientRect();
          return r.left >= 0 && r.right <= innerWidth;
        }),
      ),
    ).toBe(true);
    await page.locator('#global-search').fill('Demon');
    await expect(page.locator('#mobile-search-filters')).toBeVisible();
    await page.locator('[data-mobile-filter="people"]').click();
    await expect(page.locator('#mobile-people')).toBeVisible();
    await page.locator('#clear-global').click();
    await expect(page.locator('#mobile-browse')).toBeVisible();
    await page.screenshot({ path: info.outputPath(`discover-${width}.png`), fullPage: true });

    await page.locator('[data-mobile-nav="library"]').click();
    await expect
      .poll(() =>
        page.locator('#library-status-strip').evaluate((node) => {
          const buttons = [...node.querySelectorAll('button')].filter(
            (b) => getComputedStyle(b).display !== 'none',
          );
          const top = buttons[0].getBoundingClientRect().top;
          return buttons
            .filter((button) => {
              const rect = button.getBoundingClientRect();
              return Math.round(rect.height) < 44 || Math.abs(rect.top - top) > 1;
            })
            .map((button) => button.textContent.trim());
        }),
      )
      .toEqual([]);
    expect(
      await page.locator('#library-status-strip').evaluate((node) => {
        const bounds = node.getBoundingClientRect();
        return (
          bounds.height <= 60 && bounds.right <= innerWidth && node.scrollWidth > node.clientWidth
        );
      }),
    ).toBe(true);
    const planned = page.locator('#library-status-strip [data-filter="planning"]');
    await planned.focus();
    await planned.press('Enter');
    await expect(planned).toHaveClass(/active/);
    expect(
      await page.locator('#library-status-strip').evaluate((node) => node.scrollLeft),
    ).toBeGreaterThan(0);
    await page.locator('#library-status-strip [data-filter="all"]').click();
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
    expect(await state(page)).toEqual(initial);
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
    await page
      .locator('.release-feedback:visible')
      .getByRole('button', { name: 'Zhbëj', exact: true })
      .click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.ATMobile113.state().anime[0].seasons.find((s) => s.id === 'season-two').watched,
        ),
      )
      .toEqual([1]);
    await expect(page.locator('.release-feedback:visible')).toContainText('Shënimi u zhbë');
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
  expect(await state(page)).toEqual(before);
});

test('older titles move out of watching and return after an episode is marked', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'iphone-chromium', 'Mobile watch groups.');
  const old = structuredClone(payload.anime[0]);
  old.id = 'older-story';
  old.title = 'Një histori e lënë prej kohësh';
  old.sourceId = '999';
  old.seasons.find((s) => s.id === 'season-two').episodes.find((e) => e.number === 3).airedAt =
    '2021-10-24T10:00:00Z';
  await openFixture(page, {
    payload: {
      ...payload,
      anime: [payload.anime[0], old],
      history: [
        {
          id: old.id,
          seasonId: 'season-two',
          episode: 1,
          action: 'watched',
          date: '2026-09-01T10:00:00Z',
        },
        {
          id: 'mobile-story',
          seasonId: 'season-two',
          episode: 1,
          action: 'watched',
          date: '2026-09-30T10:00:00Z',
        },
      ],
    },
  });
  await expect(page.locator('#mobile-continue .watch-row')).toHaveCount(1);
  await expect(page.locator('#mobile-stale')).toContainText(old.title);
  await expect(page.locator('#mobile-history .watch-row-seen')).toHaveCount(2);
  await page.locator('#mobile-stale .watch-row-mark').click();
  await expect(page.locator('#mobile-continue')).toContainText(old.title);
  await expect(page.locator('#mobile-stale .watch-row')).toHaveCount(0);
});

test('a completed airing series surfaces episode seven at its confirmed release time', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'iphone-chromium', 'Mobile airing transition.');
  await page.clock.install({ time: new Date('2026-09-30T12:00:00Z') });
  const release = '2026-09-30T12:00:10Z';
  await openFixture(page, {
    payload: {
      anime: [
        {
          id: 'airing-2026',
          title: 'Historia e vitit 2026',
          status: 'completed',
          source: 'AniList',
          sourceId: '777',
          hydrated: true,
          franchiseVersion: '13.1.0',
          seasons: [
            {
              id: 'airing-season',
              title: 'Sezoni 1',
              format: 'TV',
              total: 12,
              releaseStatus: 'RELEASING',
              releaseStart: '2026-08-01',
              airedCount: 6,
              releaseEvidence: true,
              nextAiringEpisode: 7,
              nextAiringAt: Date.parse(release) / 1000,
              watched: [1, 2, 3, 4, 5, 6],
              episodes: [{ number: 7, title: 'Historia vazhdon', airedAt: release }],
            },
          ],
        },
      ],
      history: [
        {
          id: 'airing-2026',
          seasonId: 'airing-season',
          episode: 6,
          action: 'watched',
          date: '2026-09-20T10:00:00Z',
        },
      ],
      preferences: {},
    },
  });
  await expect(page.locator('#mobile-continue .watch-row')).toHaveCount(0);
  await page.locator('[data-mobile-home-tab="upcoming"]').click();
  await expect(page.locator('#mobile-upcoming')).toContainText('S1 EP7');
  await page.locator('[data-mobile-home-tab="watch"]').click();
  await page.clock.setSystemTime(new Date('2026-09-30T12:00:00Z'));
  await page.clock.runFor(11000);
  await expect(page.locator('#mobile-continue')).toContainText('S1 EP7');
  await expect(page.locator('#mobile-continue .watch-row-new')).toHaveText('NEW · EP');
  await expect(page.locator('#mobile-stale .watch-row')).toHaveCount(0);
  expect(await page.evaluate(() => window.ATMobile113.state().anime[0].seasons[0].watched)).toEqual(
    [1, 2, 3, 4, 5, 6],
  );
  await page.locator('#mobile-continue .watch-row-mark').click();
  await expect(page.locator('#mobile-history')).toContainText('S1 EP7');
  await expect(page.locator('#mobile-continue .watch-row-new')).toHaveCount(0);
  expect(await page.evaluate(() => window.ATMobile113.state().anime[0].seasons[0].watched)).toEqual(
    [1, 2, 3, 4, 5, 6, 7],
  );
});

test('recent episodes lead the home, resume works, history can be unmarked and navigation does not sync the library', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'iphone-chromium', 'Phone-specific presentation.');
  const second = structuredClone(payload.anime[0]);
  second.id = 'another-story';
  second.title = 'Another story';
  second.sourceId = '2222';
  const library = {
    ...structuredClone(payload),
    anime: [structuredClone(payload.anime[0]), second],
    history: [
      {
        id: second.id,
        seasonId: 'season-two',
        episode: 1,
        action: 'watched',
        date: '2026-09-30T11:00:00Z',
      },
    ],
  };
  await openFixture(page, { payload: library, owner: 'mobile-fluid-tracking' });
  const watching = page.locator('#mobile-continue');
  const history = page.locator('#mobile-history');
  await expect(history).toBeAttached();
  expect(
    await history.evaluate((node) =>
      Boolean(
        node.compareDocumentPosition(document.getElementById('mobile-continue')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ),
  ).toBe(true);
  await expect(history.locator('.watch-row').first()).toContainText('Another story');
  const resume = history.locator('.watch-row-resume').first();
  await expect(resume).toHaveText(/Vazhdo me S2 EP2/);
  await resume.click();
  await expect(page.locator('.episode-card-subtitle')).toContainText('Episodi 2');
  await page.locator('#episode-detail-modal.show [data-close="episode-detail-modal"]').click();
  await expect
    .poll(() =>
      history.evaluate((n) => {
        const top = n.getBoundingClientRect().top;
        return top >= 0 && top < innerHeight - 150;
      }),
    )
    .toBe(true);
  await expect(page.locator('#product-sync')).toHaveAttribute('data-state', 'synced');
  await expect(page.locator('#product-sync')).not.toBeVisible();
  const calls = () => page.evaluate(() => ({ ...window.__ATFixtureLibraryCalls }));
  // Complete the startup metadata save before measuring read-only navigation.
  await expect.poll(async () => (await calls()).write).toBeGreaterThan(0);
  await expect(page.locator('#product-sync')).toHaveAttribute('data-state', 'synced');
  const before = await calls();
  const initial = await state(page);
  for (const destination of ['explore', 'library', 'diary', 'profile', 'home']) {
    await page.locator(`[data-mobile-nav="${destination}"]`).tap();
    await expect(page.locator(`[data-mobile-nav="${destination}"]`)).toHaveAttribute(
      'aria-current',
      'page',
    );
  }
  expect(await calls()).toEqual(before);
  expect(await state(page)).toEqual(initial);
  await expect
    .poll(() =>
      history.evaluate((n) => {
        const top = n.getBoundingClientRect().top;
        return top >= 0 && top < innerHeight - 150;
      }),
    )
    .toBe(true);
  await page.locator('[data-mobile-home-tab="upcoming"]').tap();
  await page.locator('[data-mobile-nav="home"]').tap();
  await expect(page.locator('[data-mobile-nav="home"]')).toHaveClass(/mobile-tap-feedback/);
  await expect(page.locator('[data-mobile-home-tab="watch"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect
    .poll(() =>
      history.evaluate((n) => {
        const top = n.getBoundingClientRect().top;
        return top >= 0 && top < innerHeight - 150;
      }),
    )
    .toBe(true);
  await page.evaluate(() => {
    window.retainedWatchRow = document.querySelector(
      '#mobile-continue [data-watch-key="another-story:season-two:2:next"]',
    );
  });
  await watching.locator('[data-ios-action="advance"][data-id="mobile-story"]').tap();
  await page
    .locator('.release-journal')
    .getByRole('button', { name: 'E pashë tani', exact: true })
    .click();
  const recent = page.locator('#mobile-history .watch-row').first();
  await expect(recent).toHaveAttribute('data-watch-key', 'mobile-story:season-two:2:seen');
  await expect(recent).toHaveClass(/watch-row--seen/);
  expect(
    await page.evaluate(
      () =>
        window.retainedWatchRow ===
        document.querySelector(
          '#mobile-continue [data-watch-key="another-story:season-two:2:next"]',
        ),
    ),
  ).toBe(true);
  await expect.poll(async () => (await calls()).write).toBeGreaterThan(before.write);
  const progress = () =>
    page.evaluate(
      () =>
        window.ATMobile113.state()
          .anime.find((a) => a.id === 'mobile-story')
          .seasons.find((s) => s.id === 'season-two').watched,
    );
  expect(await progress()).toEqual([1, 2]);
  await recent.locator('[data-mobile-action="unwatch"]').tap();
  await expect.poll(progress).toEqual([1]);
  await expect(watching).toContainText('S2 EP2');
  await expect
    .poll(() =>
      watching.evaluate((n) => {
        const top = n.getBoundingClientRect().top;
        return top >= 0 && top < innerHeight - 150;
      }),
    )
    .toBe(true);
  await expect(page.locator('body > .watch-row[aria-hidden="true"]')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await watching.locator('[data-ios-action="advance"][data-id="mobile-story"]').tap();
  await page
    .locator('.release-journal')
    .getByRole('button', { name: 'E pashë tani', exact: true })
    .click();
  await expect.poll(progress).toEqual([1, 2]);
  await expect(page.locator('body > .watch-row[aria-hidden="true"]')).toHaveCount(0);
  await expect(page.locator('#mobile-home .mobile-tap-feedback')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('watching-and-history.png'), fullPage: true });
});

test('watched episodes enter at the bottom, older episodes rise and rapid navigation clears transition cards', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'iphone-chromium', 'Mobile episode movement.');
  const story = structuredClone(payload.anime[0]);
  story.seasons = [
    {
      id: 'episode-order',
      title: 'Sezoni 1',
      format: 'TV',
      total: 10,
      watched: [1],
      releaseStatus: 'FINISHED',
      releaseStart: '2020-01-01',
    },
  ];
  await openFixture(page, {
    payload: { anime: [story], history: [], preferences: {} },
    owner: 'mobile-episode-order',
  });
  for (let n = 2; n <= 8; n++) {
    await page.locator('#mobile-continue .watch-row-mark').tap();
    await page
      .locator('.release-journal')
      .getByRole('button', { name: 'E pashë tani', exact: true })
      .click();
    await expect(page.locator('#mobile-history .watch-row').first()).toHaveAttribute(
      'data-watch-key',
      `mobile-story:episode-order:${n}:seen`,
    );
  }
  expect(await page.locator('#mobile-history .watch-row-episode').allTextContents()).toEqual([
    'S1 EP8',
    'S1 EP7',
    'S1 EP6',
    'S1 EP5',
    'S1 EP4',
    'S1 EP3',
  ]);
  expect(await page.evaluate(() => window.ATMobile113.state().anime[0].seasons[0].watched)).toEqual(
    [1, 2, 3, 4, 5, 6, 7, 8],
  );
  const ghostsAfterNavigation = await page.evaluate(() => {
    document.querySelector('#mobile-continue .watch-row-mark').click();
    document.querySelector('[data-mobile-nav="library"]').click();
    return document.querySelectorAll('body > .watch-row[aria-hidden="true"]').length;
  });
  expect(ghostsAfterNavigation).toBe(0);
  await page
    .locator('.release-journal')
    .getByRole('button', { name: 'E pashë tani', exact: true })
    .click();
  await expect(page.locator('#library-view')).toBeVisible();
  await page.locator('[data-mobile-nav="home"]').tap();
  await expect(page.locator('#mobile-history .watch-row').first()).toHaveAttribute(
    'data-watch-key',
    'mobile-story:episode-order:9:seen',
  );
  await page
    .locator('#mobile-history .watch-row')
    .first()
    .locator('[data-mobile-action="unwatch"]')
    .tap();
  await expect(page.locator('#mobile-continue')).toContainText('S1 EP9');
  expect(await page.evaluate(() => window.ATMobile113.state().anime[0].seasons[0].watched)).toEqual(
    [1, 2, 3, 4, 5, 6, 7, 8],
  );
});
