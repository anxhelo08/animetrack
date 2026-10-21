import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';
import AxeBuilder from '@axe-core/playwright';
test.use({ serviceWorkers: 'block' });
test('secondary reading tools remain reachable and browsing groups preserve all destinations', async ({
  page,
}, info) => {
  await openFixture(page, { payload: { anime: [], history: [], preferences: {} } });
  await page.locator('#pro-nav-reading').dispatchEvent('click');
  await expect(page.locator('.reading-tabs > button')).toHaveCount(2);
  await page.locator('.reading-extra > summary').click();
  await page.locator('#reading-tools').selectOption('calendar');
  await expect(page.locator('#reading-content')).toContainText('Kalendari');
  await page.locator('#pro-nav-diary').dispatchEvent('click');
  await expect(page.locator('#diary-filters')).not.toHaveAttribute('open');
  await expect(page.locator('#diary-stats')).not.toHaveAttribute('open');
  await page.locator('#diary-filters > summary').click();
  await page.locator('#at132-diary-media').selectOption('movie');
  await expect(page.locator('#diary-filters')).toHaveAttribute('open');
  await expect(page.locator('#at132-diary-media')).toHaveValue('movie');
  await page.screenshot({ path: test.info().outputPath('activity.png'), fullPage: true });
  const axe = await new AxeBuilder({ page })
    .include('.at132-diary')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(axe.violations).toEqual([]);
});

test('mobile discovery and profile keep primary content ahead of secondary statistics', async ({
  page,
}, info) => {
  test.skip(!info.project.name.startsWith('iphone'), 'Mobile presentation');
  await openFixture(page, { payload: { anime: [], history: [], preferences: {} } });
  const before = await page.evaluate(() => JSON.stringify(window.ATMobile113.state()));
  await page.locator('[data-mobile-nav="explore"]').click();
  await expect(page.locator('.mobile-browse-grid button')).toHaveCount(9);
  await expect(page.locator('.mobile-browse-heading')).toHaveText('Për të zbuluar');
  await page.screenshot({ path: test.info().outputPath('discover.png'), fullPage: true });
  await page.locator('[data-mobile-nav="profile"]').click();
  await expect(page.locator('.mobile-profile-main .at-profile-favorites')).toBeVisible();
  await expect(page.locator('.mobile-profile-settings')).toHaveText('Cilësimet');
  await page.screenshot({ path: test.info().outputPath('profile.png'), fullPage: true });
  await page.locator('.mobile-profile-settings').click();
  await expect(page.locator('.at-profile-settings a[href="/install.html"]')).toBeVisible();
  await expect(page.locator('.at-profile-settings [data-pro-action="profile-share"]')).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(window.ATMobile113.state()))).toBe(before);
});
