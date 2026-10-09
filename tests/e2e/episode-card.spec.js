import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';
const payload = {
  anime: [
    {
      id: 'episode-show',
      title: 'Dexter: Resurrection',
      status: 'watching',
      format: 'TV_SERIES',
      seasons: [
        {
          id: 'season1',
          title: 'Sezoni 1',
          format: 'TV',
          total: 3,
          watched: [1],
          episodes: [
            {
              number: 1,
              title: 'Camera Shy',
              summary: 'Përshkrimi i verifikuar i episodit.',
              image: 'https://fixture.test/episode-test.jpg',
              imageSource: 'TVMaze',
              runtime: 48,
              airedAt: '2026-09-20T18:00:00Z',
              detailsCheckedAt: '2026-09-30T12:00:00Z',
              fillerChecked: true,
            },
            { number: 2, airedAt: '2026-09-21T18:00:00Z' },
            { number: 3, airedAt: '2026-09-22T18:00:00Z' },
          ],
        },
      ],
    },
  ],
  history: [
    {
      eventId: 'episode-seen',
      id: 'episode-show',
      seasonId: 'season1',
      episode: 1,
      action: 'watched',
      date: '2026-09-29T20:00:00Z',
    },
  ],
  preferences: { weeklyGoal: 10 },
};
test('a watched episode opens a centered card with artwork and saves stars without removing progress', async ({
  page,
}, info) => {
  await openFixture(page, { payload });
  await page.route('**/episode-test.jpg', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="#271423"/><circle cx="380" cy="190" r="135" fill="#873d44"/></svg>',
    }),
  );
  if (info.project.name.startsWith('iphone'))
    await page.locator('#mobile-history [data-mobile-action="episode"]').first().click();
  else {
    await page.locator('#library-nav').click();
    await page.locator('#anime-grid [data-detail="episode-show"]').first().click();
    await page.locator('#detail-body .ep-info-btn[data-episode-number="1"]').click();
  }
  const dialog = page.locator('#episode-detail-modal .ep-detail-dialog');
  await expect(dialog).toBeVisible();
  await expect(page.locator('.episode-card-subtitle')).toContainText('Camera Shy');
  await expect(page.locator('.episode-card-badge')).toContainText('I PARË');
  await expect(page.locator('.episode-card-art img')).toBeVisible();
  await expect(page.locator('.episode-card-meta')).toContainText('48 min');
  const viewport = page.viewportSize();
  await expect
    .poll(async () => {
      const rect = await dialog.boundingBox();
      return Math.max(
        Math.abs(rect.x + rect.width / 2 - viewport.width / 2),
        Math.abs(rect.y + rect.height / 2 - viewport.height / 2),
      );
    })
    .toBeLessThan(3);
  await page.locator('[data-episode-stars="4"]').click();
  await expect(page.locator('[data-episode-stars="4"]')).toHaveAttribute('aria-pressed', 'true');
  const state = await page.evaluate(() => window.ATMobile113.state());
  expect(state.anime[0].seasons[0].watched).toEqual([1]);
  expect(state.anime[0].seasons[0].episodes[0].personalRating).toBe(8);
  expect(state.history).toHaveLength(1);
  expect(state.history[0].diaryRating).toBe(8);
  await page.screenshot({ path: info.outputPath('episode-card.png') });
  await page.locator('.episode-card-more summary').click();
  await page.locator('[data-episode-stars="3"]').click();
  await expect(page.locator('.episode-card-more')).toHaveAttribute('open', '');
  await page.locator('[data-episode-edit]').click();
  await expect(page.locator('.episode-card .release-journal')).toBeVisible();
  expect((await page.evaluate(() => window.ATMobile113.state())).history).toHaveLength(1);
  await page.locator('.episode-card-navigation [data-v98-move="1"]').click();
  await expect(page.locator('.episode-card-subtitle')).toContainText('Episodi 2');
  await expect(page.locator('.release-feedback')).toBeHidden();
  await expect(page.locator('.episode-card-badge')).toContainText('PËR T’U PARË');
  await expect(page.locator('.episode-card-providers > a')).toHaveAttribute(
    'href',
    'https://cinehd.vc/home',
  );
  await expect(page.locator('.episode-card-providers > a img')).toBeVisible();
  await page.locator('.episode-card [data-episode-mark]').click();
  const journal = page.locator('.episode-card .release-journal');
  await expect(journal).toBeVisible();
  await journal.getByRole('button', { name: 'Kur doli', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.ATMobile113.state().history.at(-1).date))
    .toBe('2026-09-21T18:00:00.000Z');
  expect(
    (await page.evaluate(() => window.ATMobile113.state())).anime[0].seasons[0].watched,
  ).toEqual([1, 2]);
  await expect(dialog).toBeHidden();
});

test('anime episode links open Anisuge directly and unknown release dates stay disabled', async ({
  page,
}, info) => {
  const anime = structuredClone(payload);
  anime.anime[0].format = 'TV';
  anime.anime[0].title = 'One Piece';
  delete anime.anime[0].seasons[0].episodes[1].airedAt;
  await openFixture(page, { payload: anime });
  if (info.project.name.startsWith('iphone'))
    await page.locator('#mobile-history [data-mobile-action="episode"]').first().click();
  else {
    await page.locator('#library-nav').click();
    await page.locator('#anime-grid [data-detail="episode-show"]').first().click();
    await page.locator('#detail-body .ep-info-btn[data-episode-number="1"]').click();
  }
  await expect(page.locator('.episode-card-providers > a')).toHaveAttribute(
    'href',
    'https://anisuge.org/',
  );
  await expect(page.locator('.episode-card-providers > a')).toHaveAttribute('target', '_blank');
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.__copiedTitle = value;
        },
      },
    }),
  );
  await page.locator('[data-episode-copy-title]').click();
  await expect.poll(() => page.evaluate(() => window.__copiedTitle)).toBe('One Piece');
  await expect(page.locator('[data-episode-watch-status]')).toContainText('u kopjua');
  const animeLink = 'https://anisuge.org/watch/fixture-season/ep-1';
  await page.locator('.episode-provider-link summary').click();
  await page.locator('[data-episode-watch-url]').fill(animeLink);
  await page.locator('[data-episode-watch-save]').click();
  await expect(page.locator('.episode-card-providers > a')).toHaveAttribute('href', animeLink);

  await page.locator('.episode-card-navigation [data-v98-move="1"]').click();
  await expect(page.locator('.episode-card-providers > a')).toHaveAttribute(
    'href',
    animeLink.replace('/ep-1', '/ep-2'),
  );
  await page.locator('.episode-provider-link summary').click();
  await page
    .locator('[data-episode-watch-url]')
    .fill('https://anisuge.org/watch/fixture-season/ep-1170');
  await page.locator('[data-episode-watch-save]').click();
  await expect(page.locator('.episode-card-providers > a')).toHaveAttribute(
    'href',
    'https://anisuge.org/watch/fixture-season/ep-1170',
  );
  await page.locator('.episode-card-navigation [data-v98-move="1"]').click();
  await expect(page.locator('.episode-card-providers > a')).toHaveAttribute(
    'href',
    'https://anisuge.org/watch/fixture-season/ep-1171',
  );
  await page.locator('.episode-card-navigation [data-v98-move="-1"]').click();
  await page.locator('.episode-card [data-episode-mark]').click();
  await expect(
    page
      .locator('.episode-card .release-journal')
      .getByRole('button', { name: 'Kur doli', exact: true }),
  ).toBeDisabled();
});

test('a saved episode link survives reload and does not leak into the next episode', async ({
  page,
}, info) => {
  await page.addInitScript((value) => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    if (!sessionStorage.getItem('seeded-watch-link')) {
      const key = 'animetrack_user_accessibility-test';
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem(
        key + '_pending_126',
        JSON.stringify({ baseRevision: '2026-09-29T20:00:00Z', savedAt: Date.now() }),
      );
      localStorage.setItem(key + '_revision_126', '2026-09-29T20:00:00Z');
      sessionStorage.setItem('seeded-watch-link', '1');
    }
  }, payload);
  await openFixture(page, { payload });
  async function openEpisode() {
    if (info.project.name.startsWith('iphone'))
      await page.locator('#mobile-history [data-mobile-action="episode"]').first().click();
    else {
      await page.locator('#library-nav').click();
      await page.locator('#anime-grid [data-detail="episode-show"]').first().click();
      await page.locator('#detail-body .ep-info-btn[data-episode-number="1"]').click();
    }
  }
  await openEpisode();
  await page.locator('.episode-provider-link summary').click();
  const input = page.locator('[data-episode-watch-url]');
  await input.fill('https://anisuge.org/watch/fixture-episode');
  await page.locator('[data-episode-watch-save]').click();
  await expect(page.locator('[data-episode-watch-status]')).toContainText('CineHD');
  const url = 'https://cinehd.vc/watch/fixture?episode=1';
  await input.fill(url);
  await page.locator('[data-episode-watch-save]').click();
  await expect(page.locator('.episode-card-providers > a')).toHaveAttribute('href', url);
  await page.reload();
  await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
  await openEpisode();
  await expect(page.locator('.episode-card-providers > a')).toHaveAttribute('href', url);
  await page.locator('.episode-card-navigation [data-v98-move="1"]').click();
  await expect(page.locator('.episode-card-providers > a')).toHaveAttribute(
    'href',
    'https://cinehd.vc/home',
  );
  await page.locator('.episode-provider-link summary').click();
  await page.locator('[data-episode-watch-url]').fill('https://cinehd.vc/tv/5920');
  await page.locator('[data-episode-watch-save]').click();
  await page.locator('.episode-card-navigation [data-v98-move="-1"]').click();
  await expect(page.locator('.episode-card-providers > a')).toHaveAttribute('href', url);
  await page.locator('.episode-card-navigation [data-v98-move="1"]').click();
  await expect(page.locator('.episode-card-providers > a')).toHaveAttribute(
    'href',
    'https://cinehd.vc/tv/5920',
  );
  await expect(page.locator('.episode-card-providers')).toContainText('zgjidh episodin në CineHD');
  expect(await page.evaluate(() => window.ATMobile113.state().anime[0].watchUrl)).toBe(
    'https://cinehd.vc/tv/5920',
  );
  await page.reload();
  await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
  await openEpisode();
  await page.locator('.episode-card-navigation [data-v98-move="1"]').click();
  await expect(page.locator('.episode-card-providers > a')).toHaveAttribute(
    'href',
    'https://cinehd.vc/tv/5920',
  );
});

for (const kind of ['anime', 'tv']) {
  test(`${kind}: episode artwork survives compact cloud saves and reload when catalogs are unavailable`, async ({
    page,
  }, info) => {
    const initial = structuredClone(payload);
    const anime = initial.anime[0];
    if (kind === 'anime') {
      anime.title = 'Anime fixture';
      anime.format = 'TV';
    }
    const owner = `episode-art-${kind}`;
    await openFixture(page, { payload: initial, owner, persistWrites: true });
    await page.route('**/episode-test.jpg', (route) =>
      route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="#873d44"/></svg>',
      }),
    );
    const openEpisode = async () => {
      if (info.project.name.startsWith('iphone'))
        await page.locator('#mobile-history [data-mobile-action="episode"]').first().click();
      else {
        await page.locator('#library-nav').click();
        await page.locator('#anime-grid [data-detail="episode-show"]').first().click();
        await page.locator('#detail-body .ep-info-btn[data-episode-number="1"]').click();
      }
    };
    await openEpisode();
    const image = page.locator('.episode-card-art img');
    await expect.poll(() => image.evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true);
    await page.locator('[data-episode-stars="4"]').click();
    await expect
      .poll(() =>
        page.evaluate((id) => {
          const cloud = JSON.parse(sessionStorage.getItem('fixture-server-' + id) || 'null');
          return cloud?.anime[0]?.seasons[0]?.episodes[0]?.personalRating;
        }, owner),
      )
      .toBe(8);
    // The server remains compact; keeping the image is a device persistence responsibility.
    expect(
      await page.evaluate(
        (id) =>
          JSON.parse(sessionStorage.getItem('fixture-server-' + id)).anime[0].seasons[0].episodes[0]
            .image,
        owner,
      ),
    ).toBeUndefined();
    for (const host of [
      'graphql.anilist.co',
      'api.jikan.moe',
      'api.tvmaze.com',
      'v3-cinemeta.strem.io',
    ])
      await page.route(`https://${host}/**`, (route) =>
        route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }),
      );
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
    await openEpisode();
    await expect(image).toHaveAttribute('src', 'https://fixture.test/episode-test.jpg');
    await expect.poll(() => image.evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true);
    const restored = await page.evaluate(() => window.ATMobile113.state());
    expect(restored.anime[0].seasons[0].episodes[0].summary).toBe(
      'Përshkrimi i verifikuar i episodit.',
    );
    expect(restored.anime[0].seasons[0].watched).toEqual([1]);
    expect(restored.anime[0].seasons[0].episodes[0].personalRating).toBe(8);
  });
}

for (const [source, format, name, url, mapped] of [
  ['AniList', 'TV', 'Way2Movies', 'https://beta.way2movies.live/watch/example?episode=1'],
  ['TVMaze', 'TV_SERIES', 'Atlantic', 'https://atlantic.st/watch/example?episode=1'],
  [
    'AniList',
    'TV',
    'Way2Movies',
    'https://beta.way2movies.live/watch/tv/fixture-title/1/1?server=53',
    true,
  ],
]) {
  test(`${name} ${mapped ? 'season mapping' : 'episode links'} are scoped, searchable and persist without changing progress`, async ({
    page,
  }, info) => {
    const data = structuredClone(payload);
    Object.assign(data.anime[0], { source, format, hydrated: true });
    await openFixture(page, { payload: data, persistWrites: true, owner: 'watch-source-' + name });
    async function openEpisode() {
      if (info.project.name.startsWith('iphone'))
        await page.locator('#mobile-history [data-mobile-action="episode"]').first().click();
      else {
        await page.locator('#library-nav').click();
        await page.locator('#anime-grid [data-detail="episode-show"]').first().click();
        await page.locator('#detail-body .ep-info-btn[data-episode-number="1"]').click();
      }
    }
    const before = await page.evaluate(() => window.ATMobile113.state());
    await openEpisode();
    await expect(page.locator('.episode-extra-sources')).toContainText(name);
    const search = new URL(
      await page
        .locator('.episode-extra-sources a[href^="https://www.google.com/search?"]')
        .getAttribute('href'),
    );
    expect(search.searchParams.get('q')).toContain('episode 1');
    expect(search.searchParams.get('q')).toContain(new URL(url).hostname);
    await page.locator('.episode-provider-link summary').click();
    await page.locator('[data-episode-watch-url]').fill(url);
    await page.locator('[data-episode-watch-save]').click();
    await expect(page.locator('.episode-card-providers > a')).toHaveAttribute('href', url);
    await expect(page.locator('.episode-card-providers > a')).toContainText(name);
    await expect
      .poll(() => page.evaluate(() => window.__ATFixtureLibraryCalls.write))
      .toBeGreaterThan(0);
    const state = await page.evaluate(() => window.ATMobile113.state());
    expect(state.anime[0].seasons[0].watched).toEqual([1]);
    expect(state.history).toEqual(before.history);
    await page.locator('.episode-card-navigation [data-v98-move="1"]').click();
    if (mapped)
      await expect(page.locator('.episode-card-providers > a')).toHaveAttribute(
        'href',
        url.replace('/1/1?', '/1/2?'),
      );
    else await expect(page.locator('.episode-card-providers > a')).not.toHaveAttribute('href', url);
    await page.reload();
    await openEpisode();
    await expect(page.locator('.episode-card-providers > a')).toHaveAttribute('href', url);
  });
}
