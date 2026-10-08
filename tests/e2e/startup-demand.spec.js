import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { openFixture } from '../fixtures/browser-app.js';
const responsivenessLibrary = () => ({
  anime: Array.from({ length: 500 }, (_, i) => ({
    id: 'startup-' + i,
    title: 'Historia ' + i,
    status: 'watching',
    format: 'TV',
    hydrated: true,
    franchiseVersion: '13.1.0',
    cover: '/welcome/demon-slayer.jpg',
    createdAt: '2026-09-28T12:00:00Z',
    updatedAt: '2026-09-28T12:00:00Z',
    seasons: [
      {
        id: 'startup-season-' + i,
        title: 'Sezoni 1',
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

test.describe('feature demand', () => {
  test.use({ serviceWorkers: 'block' });
  test('reading and news code and styles wait for demand and preserve later navigation', async ({
    page,
  }) => {
    const requested = [];
    page.on('request', (request) => {
      if (/\/assets\/(?:reading|news)\.[^/]+\.(?:js|css)$/.test(new URL(request.url()).pathname))
        requested.push(request.url());
    });
    await openFixture(page);
    expect(requested).toEqual([]);
    const before = await page.evaluate(() => JSON.stringify(window.ATMobile113.state()));
    let release;
    await page.route('**/assets/reading.*.js', async (route) => {
      await new Promise((resolve) => {
        release = resolve;
      });
      await route.continue();
    });
    await page.locator('#pro-nav-reading').dispatchEvent('click');
    await expect(page.locator('#reading-view [role="status"]')).toContainText('Po ngarkohet');
    await expect.poll(() => Boolean(release)).toBe(true);
    await page.locator('#library-nav').dispatchEvent('click');
    release();
    await expect.poll(() => page.locator('#reading-query').count()).toBe(0);
    await page.locator('#pro-nav-reading').dispatchEvent('click');
    await expect(page.locator('#reading-query')).toBeVisible();
    await expect(page.locator('#reading-view')).toBeVisible();
    expect(
      await page.locator('#reading-view').evaluate((node) => getComputedStyle(node).paddingBottom),
    ).not.toBe('0px');
    await page.locator('#library-nav').dispatchEvent('click');
    await expect(page.locator('#library-view')).toBeVisible();
    expect(await page.evaluate(() => JSON.stringify(window.ATMobile113.state()))).toBe(before);
    expect(requested.some((url) => /reading\..*\.css$/.test(url))).toBe(true);
    expect(requested.some((url) => /news\./.test(url))).toBe(false);
  });

  test('cold phone startup with 500 titles under a slower connection', async ({
    page,
    context,
  }, info) => {
    test.skip(info.project.name !== 'iphone-chromium');
    const session = await context.newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await session.send('Network.enable');
    await session.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: 250000,
      uploadThroughput: 125000,
    });
    const assets = [];
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname;
      if (/\/assets\/.*\.(?:js|css)$/.test(path)) assets.push(path);
    });
    const started = Date.now();
    await openFixture(page, { owner: 'startup-demand', payload: responsivenessLibrary() });
    await expect(page.locator('#mobile-continue .watch-row')).toHaveCount(20);
    const metrics = {
      homeReadyMs: Date.now() - started,
      assets,
      cpuRate: 4,
      latencyMs: 150,
      downloadBytesPerSecond: 250000,
    };
    const label = process.env.AT_STARTUP_BASELINE === '1' ? 'before' : 'after';
    await writeFile(`/tmp/animetrack-startup-${label}.json`, JSON.stringify(metrics, null, 2));
    await info.attach(`startup-${label}.json`, {
      body: JSON.stringify(metrics),
      contentType: 'application/json',
    });
    console.log('Cold startup', label, metrics.homeReadyMs, 'ms');
    await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  });

  test('a reading download failure offers retry without losing library progress', async ({
    page,
  }) => {
    await openFixture(page);
    const personal = () =>
      page.evaluate(() =>
        window.ATMobile113.state().anime.map(({ id, notes, rating, seasons }) => ({
          id,
          notes,
          rating,
          seasons: seasons.map(({ id, watched, myRating }) => ({ id, watched, myRating })),
        })),
      );
    const before = await personal();
    let attempts = 0;
    await page.route('**/assets/reading.*.js', (route) =>
      ++attempts === 1 ? route.abort('failed') : route.continue(),
    );
    await page.locator('#pro-nav-reading').dispatchEvent('click');
    await expect(page.locator('#reading-view [role="alert"]')).toContainText('nuk u ngarkua');
    await page.locator('[data-reading-retry]').click();
    await expect(page.locator('#reading-query')).toBeVisible();
    expect(await personal()).toEqual(before);
  });
});

test('PWA excludes unopened features and retains an on-demand chunk offline after use', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name === 'iphone-webkit');
  await openFixture(page);
  const manifest = await (await context.request.get('/.vite/manifest.json')).json();
  const readingURL = new URL(manifest['src/modules/reading.js'].file, page.url()).href;
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  const cachedFeatures = await page.evaluate(async () => {
    const names = await caches.keys();
    const keys = await Promise.all(
      names
        .filter((name) => name.startsWith('animetrack-shell-'))
        .map(async (name) =>
          (await (await caches.open(name)).keys()).map((request) => request.url),
        ),
    );
    return keys
      .flat()
      .filter((url) => /\/assets\/(reading|news)\.[^/]+\.(js|css)$/.test(new URL(url).pathname));
  });
  expect(cachedFeatures).toEqual([]);
  // A fresh page has no fixture routing that could bypass the native worker.
  const native = await context.newPage();
  await native.goto('/');
  await expect
    .poll(() => native.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  await native.evaluate(
    (url) =>
      new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = url;
        script.onload = () => resolve(true);
        script.onerror = reject;
        document.head.append(script);
      }),
    readingURL,
  );
  // Cached release assets can be loaded even when remote account services are unavailable.
  await expect.poll(() => Boolean(readingURL)).toBe(true);
  await expect
    .poll(() =>
      page.evaluate(
        async (url) => Boolean(await caches.match(url, { ignoreVary: true })),
        readingURL,
      ),
    )
    .toBe(true);
  await context.setOffline(true);
  const offline = await context.newPage();
  await offline.goto('/');
  const loaded = await offline.evaluate(
    (url) =>
      new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = url;
        script.onload = () => resolve(true);
        script.onerror = reject;
        document.head.append(script);
      }),
    readingURL,
  );
  expect(loaded).toBe(true);
  await context.setOffline(false);
  await native.close();
  await offline.close();
});
