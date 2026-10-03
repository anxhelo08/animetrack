import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseSearch, parseDetails, parseChapters } from '../../server/weebcentral.js';
import { normalizeReadingLibrary } from '../../src/core/reading-model.js';
import { openFixture } from '../fixtures/browser-app.js';
test.use({ serviceWorkers: 'block' });
const id = '01J76XYCPSY3C4BNPBRY8JMCBE';
const fixture = (name) =>
  readFileSync(new URL('../fixtures/weebcentral/' + name + '.html', import.meta.url), 'utf8');
const search = { ...parseSearch(fixture('search')), provider: 'WeebCentral' };
const detail = {
  ...parseDetails(fixture('details'), id),
  ...parseChapters(fixture('chapters')),
  checkedAt: new Date().toISOString(),
};
async function setup(page, rows = []) {
  await openFixture(page, {
    owner: 'wc-user',
    persistWrites: true,
    payload: { anime: [], history: [], readingLibrary: rows, preferences: {} },
  });
  await page.route('**/api/weebcentral?**', (route) => {
    const action = new URL(route.request().url()).searchParams.get('action');
    return route.fulfill({ json: action === 'details' || action === 'resolve' ? detail : search });
  });
  await page.route('https://temp.compsci88.com/**', (route) =>
    route.fulfill({ contentType: 'image/jpeg', path: 'public/welcome/one-piece.jpg' }),
  );
  await page.locator('#pro-nav-reading').click();
}
const tab = (page, name) => ({
  click: () =>
    ['library', 'discover', 'calendar', 'releases'].includes(name)
      ? page.locator(`#reading-view [data-reading-action="tab"][data-id="${name}"]`).click()
      : page.locator('#reading-tools').selectOption(name),
});
test('WeebCentral discovery, chapter metadata, recommendations, publications and statistics work together', async ({
  page,
}, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Reading remains desktop only');
  await setup(page);
  await tab(page, 'discover').click();
  await expect(page.locator('.reading-results-meta')).toContainText('WeebCentral');
  await expect(page.locator('.reading-card')).toHaveCount(3);
  await page.locator(`[data-reading-action="detail"][data-id="reading-wc-${id}"]`).first().click();
  await expect(page.locator('.reading-facts')).toContainText('200 kapituj');
  await expect(page.locator('.reading-facts')).toContainText('201 publikime');
  await expect(page.getByRole('link', { name: 'Hap burimin' })).toHaveAttribute(
    'href',
    'https://weebcentral.com/series/' + id,
  );
  await page.locator(`[data-reading-action="add"][data-id="reading-wc-${id}"]`).click();
  await page.locator('[data-reading-action="next"]').first().click();
  const row = await page.evaluate(() => window.ATMobile113.state().readingLibrary[0]);
  expect(row).toMatchObject({
    source: 'weebcentral',
    sourceId: id,
    totalChapters: 200,
    publishedEntries: 201,
    chaptersRead: [1],
  });
  await tab(page, 'recommendations').click();
  await expect(page.locator('.reading-card')).toHaveCount(2);
  await expect(page.locator('.reading-results-meta')).toContainText('WeebCentral');
  await tab(page, 'latest').click();
  await expect(page.locator('.reading-results-meta')).toContainText(
    'Përditësuar së fundmi në WeebCentral',
  );
  await tab(page, 'statistics').click();
  await expect(page.locator('.reading-facts')).toContainText('201 publikime');
  await expect(page.locator('.reading-facts')).toContainText('199 kapituj të numëruar pa lexuar');
});
test('a verified WeebCentral link preserves an existing library identity and personal notes', async ({
  page,
}, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Reading remains desktop only');
  const rows = normalizeReadingLibrary([
    {
      id: 'reading-al-105398',
      source: 'anilist',
      sourceId: '105398',
      title: 'Solo Leveling',
      kind: 'manhwa',
      publicationStatus: 'FINISHED',
      totalChapters: 179,
      status: 'reading',
      chaptersRead: [1, 2],
      notes: 'Shënimi im',
    },
  ]);
  await setup(page, rows);
  await page.locator('[data-reading-action="detail"]').first().click();
  await page.locator('[data-reading-action="refresh"]').click();
  await expect(page.locator('.reading-source-freshness')).toContainText('WeebCentral');
  const row = await page.evaluate(() => window.ATMobile113.state().readingLibrary[0]);
  expect(row).toMatchObject({
    id: 'reading-al-105398',
    source: 'anilist',
    sourceId: '105398',
    weebCentralId: id,
    totalChapters: 200,
    notes: 'Shënimi im',
    chaptersRead: [1, 2],
  });
});
