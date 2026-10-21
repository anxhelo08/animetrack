import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';
import AxeBuilder from '@axe-core/playwright';
test.use({ serviceWorkers: 'block' });
const payload = {
  anime: [
    {
      id: 'lot4',
      title: 'Historia ime',
      status: 'watching',
      format: 'TV',
      source: 'Manual',
      cover: 'http://127.0.0.1:8765/welcome/demon-slayer.jpg',
      favorite: true,
      genre: 'Drama',
      seasons: [{ id: 's', total: 12, watched: [1], format: 'TV', releaseStatus: 'FINISHED' }],
    },
  ],
  history: [],
  preferences: {},
};
test('library optimization retains card and poster nodes, private data and themed surfaces', async ({
  page,
}, info) => {
  await openFixture(page, { payload });
  const mobile = info.project.name.startsWith('iphone');
  await page.locator(mobile ? '[data-mobile-nav="library"]' : '#library-nav').click();
  await expect(page.locator('#anime-grid .anime-card')).toHaveCount(1);
  await expect(page.locator('#anime-grid .anime-card img')).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator('#anime-grid .anime-card img')
        .evaluate((img) => img.complete && img.naturalWidth > 0),
    )
    .toBe(true);
  await page.evaluate(() => {
    window.lot4Card = document.querySelector('#anime-grid .anime-card');
    window.lot4Poster = window.lot4Card.querySelector('img');
    window.lot4State = JSON.stringify(window.ATMobile113.state());
  });
  await page.locator('#library-status-strip [data-filter="all"]').click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.lot4Card === document.querySelector('#anime-grid .anime-card') &&
          window.lot4Poster === window.lot4Card.querySelector('img'),
      ),
    )
    .toBe(true);
  for (const theme of ['dark', 'light']) {
    await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme);
    await page.screenshot({ path: info.outputPath(`library-${theme}.png`), fullPage: true });
  }
  await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'));
  for (const name of ['profile', 'diary']) {
    await page.locator(mobile ? `[data-mobile-nav="${name}"]` : `#pro-nav-${name}`).click();
    await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });
  }
  const result = await new AxeBuilder({ page })
    .include('.at132-diary')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  expect(
    await page.evaluate(() => JSON.stringify(window.ATMobile113.state()) === window.lot4State),
  ).toBe(true);
  expect(
    await page.evaluate(
      () =>
        performance
          .getEntriesByType('measure')
          .filter((e) => e.name.startsWith('animetrack:library:')).length,
    ),
  ).toBe(0);
});
