import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';
const payload = (size) => ({
  anime: Array.from({ length: size }, (_, i) => ({
    id: `profile-${i}`,
    title: `Historia ${String(i).padStart(4, '0')}`,
    status: 'watching',
    format: 'TV',
    genre: 'Drama',
    hydrated: true,
    franchiseVersion: '13.1.0',
    cover: '/welcome/demon-slayer.jpg',
    createdAt: '2026-09-01T12:00:00Z',
    updatedAt: '2026-09-01T12:00:00Z',
    seasons: [
      { id: `part-${i}`, total: 12, watched: [1, 2, 3], format: 'TV', releaseStatus: 'FINISHED' },
    ],
  })),
  history: Array.from({ length: size * 10 }, (_, i) => ({
    id: `profile-${i % size}`,
    seasonId: `part-${i % size}`,
    episode: (i % 3) + 1,
    action: 'watched',
    date: '2026-09-29T12:00:00Z',
  })),
  preferences: {},
});
for (const size of [50, 500, 2000])
  test(`repeatable library profile with ${size} titles and long history`, async ({
    page,
    context,
  }, info) => {
    test.skip(info.project.name !== 'iphone-chromium', 'Controlled Chromium phone profile');
    await openFixture(page, {
      payload: payload(size),
      owner: `profile-${size}`,
      freezeTime: false,
    });
    test.setTimeout(90000);
    await page.locator('[data-mobile-nav="library"]').click();
    await expect(page.locator('#anime-grid .anime-card')).toHaveCount(30);
    await page.goto('/?profile-library=1');
    await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
    await page.locator('[data-mobile-nav="library"]').click();
    const session = await context.newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const samples = await page.evaluate(async () => {
      const result = [];
      for (let iteration = 0; iteration < 22; iteration++) {
        const start = performance.now();
        document.querySelector('#library-view [data-filter="all"]').click();
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        const elapsed = performance.now() - start;
        if (iteration >= 2)
          result.push({
            elapsed,
            phases: performance
              .getEntriesByType('measure')
              .filter((e) => e.name.startsWith('animetrack:library:'))
              .map((e) => ({ name: e.name, duration: e.duration })),
          });
      }
      return result;
    });
    await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const sorted = samples.map((s) => s.elapsed).sort((a, b) => a - b);
    const report = {
      size,
      cpu: 4,
      samples: samples.length,
      median: sorted[10],
      p95: sorted[18],
      timings: samples,
    };
    console.log('Library profile', JSON.stringify({ ...report, timings: undefined }));
    await info.attach(`library-${process.env.AT_PROFILE_LABEL || 'after'}-${size}.json`, {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    });
    expect(samples).toHaveLength(20);
    expect(
      samples.every((s) =>
        ['summary', 'selection', 'commit'].every((phase) =>
          s.phases.some((p) => p.name === 'animetrack:library:' + phase),
        ),
      ),
    ).toBe(true);
    expect(sorted.every(Number.isFinite)).toBe(true);
    await expect(page.locator('#anime-grid .anime-card')).toHaveCount(30);
  });
