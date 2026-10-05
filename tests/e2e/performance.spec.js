import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';

test('Diary loads on demand with its styles, preserves progress, and does not capture later navigation', async ({
  page,
}, info) => {
  await openFixture(page);
  expect(await page.evaluate(() => typeof window.ATDiary132)).toBe('undefined');
  await page.locator('#pro-nav-collections').dispatchEvent('click');
  await expect(page.locator('#pro-content .at110-page')).toBeVisible();
  const before = await page.evaluate(() => JSON.stringify(window.ATMobile113.state().anime));
  let release;
  await page.route('**/assets/diary-page.*.js', async (route) => {
    await new Promise((resolve) => {
      release = resolve;
    });
    await route.continue();
  });
  const phone = info.project.name.startsWith('iphone');
  if (phone) await page.locator('[data-mobile-nav="diary"]').click();
  else await page.locator('#pro-nav-diary').dispatchEvent('click');
  await expect(page.locator('#pro-content')).toContainText('Po ngarkohet ditari');
  await expect.poll(() => !!release).toBe(true);
  if (phone) await page.locator('.at-mobile-nav [data-mobile-nav="library"]').click();
  else await page.locator('#library-nav').click();
  release();
  await expect.poll(() => page.evaluate(() => typeof window.ATDiary132)).toBe('function');
  await expect(page.locator('#library-view')).toBeVisible();
  await expect(page.locator('#pro-view')).toBeHidden();
  if (phone) await page.locator('[data-mobile-nav="diary"]').click();
  else await page.locator('#pro-nav-diary').dispatchEvent('click');
  await expect(page.locator('.at132-diary')).toBeVisible();
  await expect
    .poll(() => page.locator('.at132-diary').evaluate((node) => getComputedStyle(node).display))
    .toBe('grid');
  expect(await page.evaluate(() => JSON.stringify(window.ATMobile113.state().anime))).toBe(before);
});

test('PWA navigation uses a complete cached release without waiting for the network', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name === 'iphone-webkit', 'Service worker fault injection uses Chromium.');
  await openFixture(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  let navigationRequests = 0;
  await context.route('**/?slow-navigation=1', (route) => {
    if (!route.request().serviceWorker()) return route.continue();
    navigationRequests++;
    return route.abort('failed');
  });
  const start = Date.now();
  await page.goto('/?slow-navigation=1', { waitUntil: 'domcontentloaded', timeout: 8000 });
  expect(navigationRequests).toBe(0);
  expect(Date.now() - start).toBeLessThan(2500);
  await expect(page).toHaveTitle(/AnimeTrack/);
  const stylesReady = () =>
    page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--at-ui-ready').trim(),
    );
  await expect.poll(stylesReady).toBe('1');
  const names = await page.evaluate(() => caches.keys());
  expect(names.filter((name) => name.startsWith('animetrack-shell-'))).toHaveLength(1);
  expect(names.find((name) => name.startsWith('animetrack-shell-'))).toMatch(
    /animetrack-shell-[a-f0-9]+$/,
  );
  await page.evaluate(async () => {
    const previous = await caches.open('animetrack-shell-previous');
    await previous.put(
      '/assets/diary-page.previous-release.js',
      new Response('window.previousReleaseLoaded = true;', {
        headers: { 'Content-Type': 'application/javascript' },
      }),
    );
  });
  await context.setOffline(true);
  await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/assets/diary-page.previous-release.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.append(script);
      }),
  );
  expect(await page.evaluate(() => window.previousReleaseLoaded)).toBe(true);
  await page.goto('/?offline-navigation=1', { waitUntil: 'domcontentloaded', timeout: 8000 });
  await expect(page).toHaveTitle(/AnimeTrack/);
  await expect.poll(stylesReady).toBe('1');
  await context.setOffline(false);
});

test('an installed PWA keeps HTML and styles from the same version across deployments', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name === 'iphone-webkit', 'Service worker fault injection uses Chromium.');
  await openFixture(page);
  const css = await page
    .locator('link[rel="stylesheet"][href^="/assets/index."]')
    .first()
    .getAttribute('href');
  const html = await (await context.request.get('/')).text();
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.route('**/?another-deployment=1', (route) => {
    if (!route.request().serviceWorker()) return route.continue();
    return route.fulfill({
      contentType: 'text/html',
      body: html.replace(css, '/assets/index.unavailable.css'),
    });
  });
  await page.route('**/assets/index.unavailable.css', (route) => route.abort('failed'));
  await page.goto('/?another-deployment=1', { waitUntil: 'domcontentloaded' });
  await expect(
    page.locator('link[rel="stylesheet"][href^="/assets/index."]').first(),
  ).toHaveAttribute('href', css);
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--at-ui-ready').trim(),
      ),
    )
    .toBe('1');
});

test('a missing release stylesheet keeps the legacy page hidden and can be retried safely', async ({
  page,
}) => {
  await openFixture(page);
  const saved = await page.evaluate(() =>
    localStorage.getItem('animetrack_user_accessibility-test'),
  );
  const failures = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.route('**/assets/index.*.css', (route) => route.abort('failed'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.app')).toHaveAttribute('hidden', '');
  await expect(page.locator('.app')).not.toBeVisible();
  await expect(page.locator('#startup-retry')).toBeVisible();
  await expect(page.locator('#startup-message')).toContainText('Pamja nuk u ngarkua');
  expect(
    await page.evaluate(() => localStorage.getItem('animetrack_user_accessibility-test')),
  ).toBe(saved);
  await page.unroute('**/assets/index.*.css');
  await page.locator('#startup-retry').click();
  await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
  await expect(page.locator('.app')).not.toHaveAttribute('hidden', '');
  await expect(page.locator('.app')).toBeVisible();
  expect(failures).toContain('The application stylesheet did not load.');
});

test('rapid mobile navigation preserves styles, cached cards and progress with 100 titles', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== 'iphone-chromium', 'Mobile rendering stress test.');
  const anime = Array.from({ length: 100 }, (_, i) => ({
    id: `speed-${i}`,
    title: `Historia ${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + (i % 26))}`,
    status: 'watching',
    source: 'Manual',
    cover: '/welcome/demon-slayer.jpg',
    createdAt: '2026-09-29T12:00:00Z',
    updatedAt: '2026-09-30T10:00:00Z',
    seasons: [
      {
        id: `speed-${i}-s`,
        title: 'Sezoni 1',
        format: 'TV',
        total: 12,
        watched: [1],
        releaseStatus: 'FINISHED',
        releaseStart: '2020-01-01',
      },
    ],
  }));
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openFixture(page, {
    payload: { anime, history: [], preferences: {} },
    owner: 'mobile-speed',
  });
  await expect
    .poll(() => page.evaluate(() => document.body.classList.contains('at-live-checking')))
    .toBe(false);
  await page.locator('.at-mobile-nav [data-mobile-nav="library"]').tap();
  await expect(page.locator('#anime-grid .anime-card')).toHaveCount(100);
  await page.evaluate(() => {
    window.hiddenGridWrites = 0;
    window.legacyHomeWrites = 0;
    new MutationObserver((records) => {
      window.legacyHomeWrites += records.length;
    }).observe(document.getElementById('home-last-watched'), { childList: true });
    new MutationObserver((records) => {
      window.hiddenGridWrites += records.filter((record) => record.type === 'childList').length;
    }).observe(document.getElementById('anime-grid'), { childList: true });
  });
  await page.locator('.at-mobile-nav [data-mobile-nav="home"]').tap();
  await page.locator('#mobile-continue [data-ios-action="advance"][data-id="speed-0"]').tap();
  expect(await page.evaluate(() => window.hiddenGridWrites)).toBe(0);
  expect(await page.evaluate(() => window.legacyHomeWrites)).toBe(0);
  await page.locator('[data-close="episode-detail-modal"]').tap();
  await page.locator('.at-mobile-nav [data-mobile-nav="library"]').tap();
  await expect(page.locator('#anime-grid .anime-card:has([data-detail="speed-0"])')).toContainText(
    '2/12',
  );
  await page.evaluate(() => {
    window.cachedLibraryCard = document.querySelector('#anime-grid .anime-card');
  });
  const session = await context.newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let documentRequests = 0;
  page.on('request', (request) => {
    if (request.isNavigationRequest()) documentRequests++;
  });
  const timing = await page.evaluate(() => {
    const durations = [];
    for (let i = 0; i < 10; i++)
      for (const target of ['home', 'explore', 'diary', 'profile', 'library']) {
        const start = performance.now();
        document.querySelector(`.at-mobile-nav [data-mobile-nav="${target}"]`).click();
        durations.push({ target, iteration: i, ms: performance.now() - start });
        if (target === 'explore') {
          const card = document.querySelector('#at117-mobile-discover .at128-mobile-season-link');
          if (i === 0) window.cachedDiscoveryCard = card;
          else if (card !== window.cachedDiscoveryCard)
            throw Error('Unchanged discovery was rebuilt');
        }
        if (
          getComputedStyle(document.documentElement).getPropertyValue('--at-ui-ready').trim() !==
          '1'
        )
          throw Error('Styles disappeared during navigation');
      }
    durations.sort((a, b) => a.ms - b.ms);
    return {
      max: durations.at(-1).ms,
      slowest: durations.slice(-5),
      median: durations[Math.floor(durations.length / 2)].ms,
      iterations: durations.length,
    };
  });
  await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await info.attach('mobile-navigation-timing.json', {
    body: JSON.stringify(timing),
    contentType: 'application/json',
  });
  console.log('Mobile navigation timing (4x CPU)', JSON.stringify(timing));
  expect(timing.max).toBeLessThan(250);
  expect(documentRequests).toBe(0);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => window.cachedLibraryCard === document.querySelector('#anime-grid .anime-card'),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => window.ATMobile113.state().anime.find((a) => a.id === 'speed-0').seasons[0].watched,
    ),
  ).toEqual([1, 2]);
  await expect(page.locator('#library-view')).toBeVisible();
  await expect(page.locator('.at-mobile-nav [data-mobile-nav="library"]')).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('an unavailable release entry offers retry without exposing the old page', async ({
  page,
}) => {
  await openFixture(page);
  await page.clock.install({ time: new Date('2026-09-30T12:00:00Z') });
  await page.route('**/assets/index.*.js', (route) => route.abort('failed'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.clock.runFor(11000);
  await expect(page.locator('.app')).toHaveAttribute('hidden', '');
  await expect(page.locator('.app')).not.toBeVisible();
  await expect(page.locator('#startup-retry')).toBeVisible();
  await page.unroute('**/assets/index.*.js');
  await page.locator('#startup-retry').click();
  await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
  await expect(page.locator('.app')).toBeVisible();
});
