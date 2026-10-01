import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openFixture } from '../fixtures/browser-app.js';

test('welcome leads guests into signup and supports motion controls', async ({ page }) => {
  await openFixture(page, { signedIn: false });
  await expect(page.locator('#welcome-page')).toBeVisible();
  await expect(page.locator('#account-modal')).not.toHaveClass(/show/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.welcome-motion').click();
  await expect(page.locator('.welcome-motion')).toHaveAttribute('aria-pressed', 'true');
  const result = await new AxeBuilder({ page })
    .include('#welcome-page')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.locator('[data-welcome-slide="1"]').click();
  await expect(page.locator('#welcome-selected-title')).toHaveText('Attack on Titan');
  await expect(page.locator('.welcome-poster[data-slot="0"] h2')).toHaveText('Attack on Titan');
  await page.locator('[data-welcome-auth="signup"]').click();
  await expect(page.locator('#account-modal.show')).toBeVisible();
  await expect(page.locator('[data-social-provider="google"]')).toBeVisible();
  await expect(page.locator('[data-social-provider="apple"]')).toBeVisible();
  await expect(page.locator('#account-name')).toBeVisible();
  await expect(page.locator('#account-login')).toContainText('Krijo llogarinë');
  await page.locator('#account-modal [data-close]').click();
  await expect(page.locator('#account-modal')).not.toHaveClass(/show/);
  await expect(page.locator('#welcome-page')).toBeVisible();
});

test('signed in users bypass welcome', async ({ page }) => {
  await openFixture(page);
  await expect(page.locator('#welcome-page')).toBeHidden();
});
