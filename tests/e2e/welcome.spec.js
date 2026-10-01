import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openFixture } from '../fixtures/browser-app.js';

test('welcome leads guests into signup and supports motion controls', async ({ page }) => {
  await openFixture(page, { signedIn: false });
  await expect(page.locator('#welcome-page')).toBeVisible();
  await expect(page.locator('#account-modal')).not.toHaveClass(/show/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const result = await new AxeBuilder({ page })
    .include('#welcome-page')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.locator('.welcome-motion').click();
  await expect(page.locator('.welcome-motion')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-welcome-auth="signup"]').click();
  await expect(page.locator('#account-modal.show')).toBeVisible();
  await expect(page.locator('#account-name')).toBeVisible();
  await expect(page.locator('#account-login')).toContainText('Krijo llogarinë');
});

test('signed in users bypass welcome', async ({ page }) => {
  await openFixture(page);
  await expect(page.locator('#welcome-page')).toBeHidden();
});
