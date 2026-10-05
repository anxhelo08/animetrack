import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import vercel from '../../vercel.json' with { type: 'json' };
import { openFixture } from '../fixtures/browser-app.js';
test('Phase 1 retains the strict deployed CSP and renders mobile controls without inline styles', async ({
  page,
}, info) => {
  const csp = vercel.headers[0].headers.find(
    (h) => h.key.toLowerCase() === 'content-security-policy',
  ).value;
  expect(createHash('sha256').update(csp).digest('hex')).toBe(
    'bb0c80ee015ad71652287f49ffb5f04974533d63076dd57217ac1dc51c129b7f',
  );
  await openFixture(page);
  const response = await page.request.get('/');
  expect(response.headers()['content-security-policy']).toBe(
    csp.replace('; upgrade-insecure-requests', ''),
  );
  await page
    .locator(
      info.project.name.startsWith('iphone')
        ? '.at-mobile-nav [data-mobile-nav="library"]'
        : '#library-nav',
    )
    .click();
  await expect(page.locator('#anime-grid .anime-card').first()).toBeVisible();
  await expect(
    page.locator('#anime-grid [style], #library-load-more[style], #mobile-sync-status[style]'),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => {
      const probe = document.createElement('script');
      probe.textContent = 'window.__inlineScriptExecuted = true';
      document.body.append(probe);
      probe.remove();
      return window.__inlineScriptExecuted === true;
    }),
  ).toBe(false);
});
