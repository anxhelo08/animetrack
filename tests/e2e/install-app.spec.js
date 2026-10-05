import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';

test('iPhone guide and Android download are accessible and APK matches release metadata', async ({
  page,
}, info) => {
  await page.goto('/install.html');
  await expect(page.getByRole('heading', { name: 'AnimeTrack në telefonin tënd.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Shtoje në ekranin kryesor.' })).toBeVisible();
  await expect(page.locator('main')).toContainText('Add to Home Screen');
  await expect(page.locator('#apk-version')).toContainText('Versioni 14.24.0');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#apk-download').click(),
  ]);
  expect(download.suggestedFilename()).toBe('AnimeTrack.apk');
  const meta = await (await page.request.get('/downloads/android.json')).json();
  const apk = await page.request.get('/downloads/AnimeTrack.apk');
  expect(apk.ok()).toBe(true);
  const body = await apk.body();
  expect(body.length).toBe(meta.bytes);
  expect(createHash('sha256').update(body).digest('hex')).toBe(meta.sha256);
  const associations = await (await page.request.get('/.well-known/assetlinks.json')).json();
  expect(associations[0].target.package_name).toBe('com.animetrack.app');
  await page.screenshot({ path: info.outputPath('install-app.png'), fullPage: true });
});
test('web installation asks the browser once and handles accepting and dismissing', async ({
  page,
}) => {
  await page.goto('/install.html');
  await page.locator('details summary').click();
  const button = page.locator('#pwa-install');
  await expect(button).toBeHidden();
  for (const outcome of ['dismissed', 'accepted']) {
    await page.evaluate((choice) => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      event.prompt = async () => {
        window.__installCalls = (window.__installCalls || 0) + 1;
      };
      event.userChoice = Promise.resolve({ outcome: choice });
      window.dispatchEvent(event);
      window.__installPrevented = event.defaultPrevented;
    }, outcome);
    await expect(button).toBeVisible();
    await button.click();
    await expect(button).toBeHidden();
    await expect(page.locator('#pwa-status')).toContainText(
      outcome === 'accepted' ? 'Instalimi u pranua' : 'Mund ta instalosh më vonë',
    );
  }
  expect(await page.evaluate(() => window.__installCalls)).toBe(2);
  expect(await page.evaluate(() => window.__installPrevented)).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await expect(page.locator('#pwa-status')).toContainText('AnimeTrack u instalua');
});

test('installation page is reachable from the profile on desktop and phone', async ({
  page,
}, info) => {
  const { openFixture } = await import('../fixtures/browser-app.js');
  await openFixture(page);
  await page
    .locator(
      info.project.name.startsWith('iphone') ? '[data-mobile-nav="profile"]' : '#pro-nav-profile',
    )
    .click();
  const link = page.getByRole('link', {
    name: '📱 Instalo AnimeTrack · iPhone / Android',
    exact: true,
  });
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/install\.html$/);
  await expect(page.locator('#apk-download')).toBeVisible();
});
