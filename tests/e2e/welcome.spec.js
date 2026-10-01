import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openFixture } from '../fixtures/browser-app.js';

test('welcome leads guests into signup and supports motion controls', async ({
  page,
}, testInfo) => {
  await openFixture(page, { signedIn: false });
  await expect(page.locator('#welcome-page')).toBeVisible();
  await expect(page.locator('#account-modal')).not.toHaveClass(/show/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('.welcome-motion')).toHaveCount(0);
  const result = await new AxeBuilder({ page })
    .include('#welcome-page')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('welcome.png') });
  if (page.viewportSize().width > 760) {
    await page.locator('[data-welcome-slide="1"]').click();
    await expect(page.locator('#welcome-selected-title')).toHaveText('Attack on Titan');
    await expect(page.locator('.welcome-poster[data-slot="0"] h2')).toHaveText('Attack on Titan');
  } else {
    await expect(page.locator('.welcome-mosaic')).toBeVisible();
    await expect(page.locator('.welcome-start')).toBeInViewport();
  }
  await page.locator('[data-welcome-auth="signup"]').click();
  await expect(page.locator('#account-modal.show')).toBeVisible();
  await expect(page.locator('[data-social-provider="google"]')).toBeVisible();
  await expect(page.locator('[data-social-provider="apple"]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('sign-in.png') });
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

test('welcome includes nine titles and upgrades additional covers from the public catalog', async ({
  page,
}) => {
  await openFixture(page, { signedIn: false });
  await page.route('https://graphql.anilist.co', async (route) => {
    const ids = route.request().postDataJSON().variables?.ids;
    if (!ids) return route.fallback();
    await route.fulfill({
      json: {
        data: {
          Page: {
            media: ids.map((id) => ({
              id,
              coverImage: {
                extraLarge: `https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/test-${id}.jpg`,
              },
            })),
          },
        },
      },
    });
  });
  await page.route('https://s4.anilist.co/**', (route) =>
    route.fulfill({ path: 'public/welcome/demon-slayer.jpg', contentType: 'image/jpeg' }),
  );
  await page.reload();
  await expect(page.locator('#welcome-page')).toBeVisible();
  await expect(page.locator('.welcome-mosaic img')).toHaveCount(9);
  expect(
    new Set(
      await page
        .locator('.welcome-mosaic img')
        .evaluateAll((images) => images.map((img) => img.dataset.welcomeAnime)),
    ).size,
  ).toBe(9);
  await expect(page.locator('.welcome-mosaic [data-welcome-anime="154587"]')).toHaveAttribute(
    'src',
    /test-154587/,
  );
  await expect
    .poll(() =>
      page
        .locator('.welcome-mosaic [data-welcome-anime="154587"]')
        .evaluate((img) => img.naturalWidth),
    )
    .toBeGreaterThan(800);
  if (page.viewportSize().width > 760) {
    await page.locator('[data-welcome-slide="8"]').click();
    await expect(page.locator('#welcome-selected-title')).toHaveText('Naruto');
  }
});
