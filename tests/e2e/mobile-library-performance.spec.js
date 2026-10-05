import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';
export const largeLibrary = () => ({
  anime: Array.from({ length: 500 }, (_, i) => ({
    id: 'large-' + i,
    title: 'Historia ' + String(i).padStart(3, '0'),
    status: 'watching',
    format: 'TV',
    hydrated: true,
    franchiseVersion: '13.1.0',
    createdAt: '2026-09-28T12:00:00Z',
    updatedAt: '2026-09-28T12:00:00Z',
    cover: '/welcome/demon-slayer.jpg',
    seasons: [
      {
        id: 'part-' + i,
        total: 12,
        watched: [1, 2, 3],
        format: 'TV',
        releaseStatus: 'FINISHED',
        episodes: [],
      },
    ],
  })),
  history: [],
  preferences: {},
});
test('500-title phone library records first render and long tasks and retains unchanged cards', async ({
  page,
  context,
}, info) => {
  test.skip(!info.project.name.startsWith('iphone'));
  const baseline = process.env.AT_PERF_BASELINE === '1';
  await page.addInitScript(() => {
    window.libraryLongTasks = [];
    new PerformanceObserver((list) =>
      window.libraryLongTasks.push(
        ...list.getEntries().map((e) => ({ start: e.startTime, duration: e.duration })),
      ),
    ).observe({ type: 'longtask', buffered: true });
  });
  await openFixture(page, { payload: largeLibrary(), owner: 'large-library', persistWrites: true });
  const session = await context.newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const result = await page.evaluate(async () => {
    const start = performance.now();
    document.querySelector('.at-mobile-nav [data-mobile-nav="library"]').click();
    while (!document.querySelector('#anime-grid .anime-card'))
      await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    return {
      firstRenderMs: performance.now() - start,
      initialCards: document.querySelectorAll('#anime-grid .anime-card').length,
      start,
    };
  });
  await page.waitForTimeout(200);
  result.longTasks = await page.evaluate(
    (start) => window.libraryLongTasks.filter((e) => e.start + e.duration >= start),
    result.start,
  );
  console.log('500-title mobile measurement', JSON.stringify(result));
  await info.attach(baseline ? 'before.json' : 'after.json', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  if (baseline) {
    expect(result.initialCards).toBe(500);
    return;
  }
  expect(result.initialCards).toBeGreaterThanOrEqual(30);
  expect(result.initialCards).toBeLessThanOrEqual(60);
  await page.locator('#library-load-more').scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('#anime-grid .anime-card').count()).toBeGreaterThan(30);
  await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await page.evaluate(() => {
    for (let i = 0; i < 16; i++) document.getElementById('library-load-more').click();
  });
  await expect(page.locator('#anime-grid .anime-card')).toHaveCount(500);
  await page.evaluate(() => {
    window.libraryCards = [...document.querySelectorAll('#anime-grid .anime-card')];
  });
  await page.locator('#anime-grid [data-next="large-0"]').click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.ATMobile113.state()
          .anime.find((a) => a.id === 'large-0')
          .seasons[0].watched.includes(4),
      ),
    )
    .toBe(true);
  await expect(page.locator('#anime-grid .anime-card:has([data-next="large-0"])')).toContainText(
    '4/12',
  );
  expect(
    await page.evaluate(() =>
      window.libraryCards.every(
        (card) =>
          card.isConnected &&
          card ===
            [...document.querySelectorAll('#anime-grid .anime-card')].find(
              (n) =>
                n.querySelector('[data-detail]')?.dataset.detail ===
                card.querySelector('[data-detail]')?.dataset.detail,
            ),
      ),
    ),
  ).toBe(true);
});
