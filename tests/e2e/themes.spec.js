import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openFixture } from '../fixtures/browser-app.js';

async function audit(page, selector) {
  let axe = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']);
  if (selector) axe = axe.include(selector);
  const result = await axe.analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  ).toEqual([]);
}

test('light theme covers home, library, details and settings, persists and follows system', async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('theme-test-seeded')) {
      localStorage.setItem('animetrack_theme_144', 'light');
      sessionStorage.setItem('theme-test-seeded', '1');
    }
  });
  await openFixture(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f4f5fa');
  await audit(page);
  const phone = info.project.name.startsWith('iphone');
  await page.locator(phone ? '[data-mobile-nav="library"]' : '#library-nav').click();
  await audit(page);
  await page.locator('#anime-grid .at120-card-poster').first().click();
  await expect(page.locator('#detail-modal.show')).toBeVisible();
  await audit(page, '#detail-modal');
  await page.keyboard.press('Escape');
  await page.locator('[data-product-action="settings"]').dispatchEvent('click');
  await expect(page.locator('#theme-select')).toBeVisible();
  await audit(page);
  await page.locator('#theme-select').selectOption('auto');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('#theme-select').selectOption('dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('light login and signup retain readable controls', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('animetrack_theme_144', 'light'));
  await openFixture(page, { signedIn: false });
  await expect(page.locator('#account-modal.show')).toBeVisible();
  await audit(page, '#account-modal');
  await page.locator('#at116-tab-signup').click();
  await audit(page, '#account-modal');
});
