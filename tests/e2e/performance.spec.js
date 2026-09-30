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
  if (phone) await page.locator('[data-mobile-nav="library"]').click();
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

test('PWA falls back to verified cached HTML when navigation hangs or goes offline', async ({
  page,
  context,
}, info) => {
  test.skip(
    info.project.name === 'iphone-webkit',
    'Chromium supports service worker network interception for this fault injection.',
  );
  await openFixture(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  let blocked = false,
    release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await context.route('**/?slow-navigation=1', async (route) => {
    if (!route.request().serviceWorker()) return route.continue();
    blocked = true;
    await gate;
    await route.abort('failed');
  });
  try {
    const start = Date.now();
    await page.goto('/?slow-navigation=1', { waitUntil: 'domcontentloaded', timeout: 8000 });
    expect(blocked).toBe(true);
    expect(Date.now() - start).toBeLessThan(5500);
    await expect(page).toHaveTitle(/AnimeTrack/);
  } finally {
    release();
  }
  await context.setOffline(true);
  await page.goto('/?offline-navigation=1', { waitUntil: 'domcontentloaded', timeout: 8000 });
  await expect(page).toHaveTitle(/AnimeTrack/);
  await context.setOffline(false);
});
