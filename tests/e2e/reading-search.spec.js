import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';
import fixtures from '../fixtures/reading-search-live.json' with { type: 'json' };
import muFixtures from '../fixtures/mangaupdates-live.json' with { type: 'json' };
import { mangaUpdatesItem } from '../../src/modules/mangaupdates-catalog.js';
import { mangaDexItem } from '../../src/modules/mangadex-catalog.js';
test.use({ serviceWorkers: 'block' });
for (const key of ['doom', 'player', 'tbate'])
  test(`${key}: server results appear promptly when browser catalogs fail, remain usable, and persist`, async ({
    page,
  }, info) => {
    test.skip(info.project.name.startsWith('iphone'), 'Reading is desktop only');
    const entry = mangaDexItem(key === 'tbate' ? muFixtures.mdTbate : fixtures[key].mangadex);
    const meta = mangaUpdatesItem(muFixtures[key]);
    Object.assign(entry, {
      totalChapters: meta.totalChapters,
      mangaUpdatesId: meta.mangaUpdatesId,
      chapterSource: 'MangaUpdates',
    });
    await openFixture(page, {
      owner: 'search-' + key,
      persistWrites: true,
      payload: { anime: [], history: [], readingLibrary: [], preferences: {} },
    });
    await page.route('https://graphql.anilist.co', (route) =>
      route.fulfill({ status: 503, json: {} }),
    );
    await page.route('https://api.jikan.moe/**', (route) =>
      route.fulfill({ status: 503, json: {} }),
    );
    let releaseSlow;
    const slow = new Promise((resolve) => {
      releaseSlow = resolve;
    });
    await page.route('**/api/weebcentral?**', async (route) => {
      await slow;
      await route.fulfill({ status: 502, json: {} }).catch(() => {});
    });
    const searches = [];
    await page.route('**/api/reading-search?**', (route) => {
      const params = new URL(route.request().url()).searchParams;
      if (params.get('action') === 'details') return route.fulfill({ json: entry });
      const q = params.get('q');
      searches.push(q);
      return route.fulfill({
        json: {
          items: q
            ? key === 'tbate'
              ? [
                  {
                    ...entry,
                    id: 'reading-al-1',
                    source: 'anilist',
                    sourceId: '1',
                    anilistId: '1',
                    malId: '',
                    mangaDexId: '',
                    mangaUpdatesId: '',
                    title: entry.title + ' (Book Version)',
                    aliases: [],
                    totalChapters: 0,
                  },
                  entry,
                ]
              : [entry]
            : [],
          provider: 'MangaDex',
          hasNext: false,
        },
      });
    });
    await page.locator('#pro-nav-reading').click();
    await page.locator('#reading-view [data-reading-action="tab"][data-id="discover"]').click();
    if (key === 'tbate')
      await page.locator('#reading-view [data-reading-action="scope"][data-id="manga"]').click();
    const title = entry.title;
    const started = Date.now();
    await page.locator('#reading-query').fill(title.replace("'", '’'));
    await expect(page.locator('.reading-card-title').first()).toHaveText(title, { timeout: 3000 });
    expect(Date.now() - started).toBeLessThan(3000);
    expect(searches).toContain(title);
    await expect(page.locator('.reading-catalog-chapters').first()).toContainText(
      String(meta.totalChapters) + ' kapituj',
    );
    await expect(page.locator('.reading-grid')).toHaveAttribute('aria-busy', 'false');
    await page.locator('.reading-card [data-reading-action="add"]').first().click();
    await expect
      .poll(() => page.evaluate(() => window.ATMobile113.state().readingLibrary.length))
      .toBe(1);
    expect(await page.evaluate(() => window.ATMobile113.state().readingLibrary[0].mangaDexId)).toBe(
      entry.mangaDexId,
    );
    releaseSlow();
    await expect
      .poll(() => page.evaluate(() => window.__ATFixtureLibraryCalls.write))
      .toBeGreaterThan(0);
    await page.reload();
    await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
    const saved = await page.evaluate(() => window.ATMobile113.state().readingLibrary[0]);
    expect(saved.title).toBe(title);
    expect(saved.anilistId).toBe(entry.anilistId);
    expect(saved.mangaDexId).toBe(entry.mangaDexId);
    expect(saved.chaptersRead).toEqual([]);
    expect(saved.totalChapters).toBe(meta.totalChapters);
    expect(saved.mangaUpdatesId).toBe(meta.mangaUpdatesId);
  });
