import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';

test('saved views and calendar subscriptions preserve the private library', async ({
  page,
}, info) => {
  await openFixture(page, { accessToken: 'fixture-token' });
  const records = [],
    feeds = [];
  await page.route('**/functions/v1/anime-connected', async (route) => {
    const input = route.request().postDataJSON();
    if (input.action === 'rule-create') records.push({ id: 'view-one', ...input });
    if (input.action === 'feed-create') {
      feeds.push({ id: 'feed-one', options: input.options });
      return route.fulfill({
        json: { id: 'feed-one', url: 'https://example.com/calendar?feed=fixture' },
      });
    }
    if (input.action === 'feed-delete') feeds.length = 0;
    await route.fulfill({
      json:
        input.action === 'state'
          ? { records, lists: [], feeds, traktConfigured: false }
          : { ok: true },
    });
  });
  await page
    .locator(
      info.project.name.startsWith('iphone') ? '[data-mobile-nav="library"]' : '#library-nav',
    )
    .click();
  const before = await page.evaluate(() => JSON.stringify(window.ATMobile113.state()));
  await page.locator('[data-save-library-filter]').click();
  const form = page.locator('[data-connected-form="rule"]');
  await expect(form).toBeVisible();
  await expect(form.locator('button')).toBeEnabled();
  await form.locator('[name=cf-title]').fill('Fundjava ime');
  await form.locator('[name=cf-preset]').selectOption('favorites');
  await form.locator('button').click();
  await expect(page.locator('[data-connected="rule-select"]')).toContainText('Fundjava ime');
  await page.locator('[data-connected="rule-select"]').click();
  await expect(page.locator('[data-connected-root]')).toContainText('Vetëm të preferuarat');
  expect(await page.evaluate(() => JSON.stringify(window.ATMobile113.state()))).toBe(before);
  await page.screenshot({ path: info.outputPath('connected-lists.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#pro-nav-calendar').evaluate((el) => el.click());
  const feed = page.locator('[data-connected-form="feed"]');
  await expect(feed).toBeVisible();
  await feed.locator('button').click();
  await expect(page.locator('[data-connected-root] textarea')).toHaveValue(
    'https://example.com/calendar?feed=fixture',
  );
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('[data-connected="feed-delete"]').click();
  await expect(page.locator('[data-connected="feed-delete"]')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify(window.ATMobile113.state()))).toBe(before);
});

test('Trakt JSON requires a preview and keeps repeated imports free of duplicate history', async ({
  page,
}) => {
  const payload = {
    anime: [
      {
        id: 'a1',
        title: 'Series',
        source: 'AniList',
        sourceId: '123',
        status: 'watching',
        format: 'TV',
        hydrated: true,
        franchiseVersion: '13.1.0',
        notes: 'keep private',
        seasons: [
          {
            id: 's1',
            source: 'AniList',
            sourceId: '123',
            title: 'Season 1',
            format: 'TV',
            total: 12,
            watched: [],
            episodes: [],
            releaseStatus: 'FINISHED',
          },
        ],
      },
    ],
    history: [],
    preferences: {},
  };
  await openFixture(page, { payload, accessToken: 'fixture-token' });
  await page.route('**/functions/v1/anime-connected', (route) =>
    route.fulfill({ json: { records: [], lists: [], feeds: [], traktConfigured: false } }),
  );
  await page.locator('#pro-nav-sync').evaluate((el) => el.click());
  await expect(page.locator('#connected-trakt-file')).toBeVisible();
  const rows = [
    {
      show: { title: 'Series', ids: {} },
      episode: { season: 1, number: 2 },
      watched_at: '2026-09-29T12:00:00Z',
    },
  ];
  for (let i = 0; i < 2; i++) {
    await page.locator('#connected-trakt-file').setInputFiles({
      name: 'history.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(rows)),
    });
    const form = page.locator('[data-connected-form="import"]');
    await form.locator('select').selectOption('a1|s1');
    const before = await page.evaluate(() => JSON.stringify(window.ATMobile113.state()));
    await form.locator('button').click();
    expect(await page.evaluate(() => JSON.stringify(window.ATMobile113.state()))).toBe(before);
    await page.locator('[data-connected="import-apply"]').click();
    await expect.poll(() => page.evaluate(() => window.ATMobile113.state().history.length)).toBe(1);
    expect(
      await page.evaluate(() => window.ATMobile113.state().anime[0].seasons[0].watched),
    ).toEqual([2]);
    expect(await page.evaluate(() => window.ATMobile113.state().anime[0].notes)).toBe(
      'keep private',
    );
  }
  rows[0].episode.number = 3;
  await page.locator('#connected-trakt-file').setInputFiles({
    name: 'history.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(rows)),
  });
  await page.locator('[data-connected-form="import"] select').selectOption('a1|s1');
  await page.locator('[data-connected-form="import"] button').click();
  const beforeFailure = await page.evaluate(() => JSON.stringify(window.ATMobile113.state()));
  await page.evaluate(() => {
    window.ATStorage1274.save = () => ({ ok: false });
  });
  await page.locator('[data-connected="import-apply"]').click();
  await expect(page.locator('[data-connected-root] [role=alert]')).toContainText(
    'Importi nuk u ruajt',
  );
  expect(await page.evaluate(() => JSON.stringify(window.ATMobile113.state()))).toBe(beforeFailure);
});
