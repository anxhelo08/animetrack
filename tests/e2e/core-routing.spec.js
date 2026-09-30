import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';

test('one nested-icon click commits exactly one episode through the extracted library router', async ({
  page,
}, info) => {
  const owner = 'core-router';
  await openFixture(page, {
    owner,
    payload: {
      anime: [
        {
          id: 'core-title',
          title: 'Router fixture',
          status: 'watching',
          format: 'TV',
          seasons: [{ id: 's1', title: 'Sezoni 1', format: 'TV', total: 5, watched: [1] }],
        },
      ],
      history: [],
      preferences: { weeklyGoal: 10 },
    },
  });
  await page
    .locator(
      info.project.name.startsWith('iphone') ? '[data-mobile-nav="library"]' : '#library-nav',
    )
    .click();
  const next = page.locator('#anime-grid button[data-next="core-title"]').first();
  await expect(next).toBeVisible();
  await next.evaluate((button) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('data-test-router-icon', '');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '16');
    rect.setAttribute('height', '16');
    svg.append(rect);
    button.append(svg);
  });
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }),
  );
  await next.locator('[data-test-router-icon] rect').click();
  const saved = await page.evaluate(
    (owner) => ({
      state: window.ATMobile113.state(),
      local: JSON.parse(localStorage.getItem('animetrack_user_' + owner)),
    }),
    owner,
  );
  expect(saved.state.anime[0].seasons[0].watched).toEqual([1, 2]);
  expect(saved.local.anime[0].seasons[0].watched).toEqual([1, 2]);
  expect(saved.state.history.filter((event) => event.action === 'watched')).toHaveLength(1);
  await expect(page.locator('#product-sync')).toContainText('Pa internet');
});
