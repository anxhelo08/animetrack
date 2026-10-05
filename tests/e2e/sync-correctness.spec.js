import { test, expect, devices } from '@playwright/test';
import { openSyncDevice, syncServer } from '../fixtures/sync-devices.js';
const seed = () => ({
  anime: [
    {
      id: 'shared',
      title: 'Shared Anime',
      status: 'watching',
      format: 'TV',
      hydrated: true,
      franchiseVersion: '13.1.0',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      seasons: [
        {
          id: 's',
          title: 'Sezoni 1',
          total: 12,
          watched: [1, 2, 3],
          format: 'TV',
          releaseStatus: 'FINISHED',
          episodes: [],
        },
      ],
    },
  ],
  history: [],
  preferences: {},
});
async function library(page, phone) {
  await page.locator(phone ? '.at-mobile-nav [data-mobile-nav="library"]' : '#library-nav').click();
}
async function episode(page, n) {
  await page.locator('#anime-grid [data-detail="shared"]').first().click();
  await page.locator(`#detail-body [data-season-ep][data-ep="${n}"]`).dispatchEvent('click');
  if (await page.locator('#confirm-modal').isVisible()) await page.locator('#confirm-only').click();
}
for (const skew of [0, 600000]) {
  test(`offline episode union, deletion and unmark survive concurrent sync with clock skew ${skew}`, async ({
    browser,
  }, info) => {
    test.skip(info.project.name !== 'iphone-chromium');
    const phoneContext = await browser.newContext({
      ...devices['iPhone 15'],
      browserName: undefined,
    });
    const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const phone = await phoneContext.newPage(),
      pc = await pcContext.newPage(),
      original = seed(),
      server = syncServer(original),
      nativeDialogs = [];
    for (const page of [phone, pc])
      page.on('dialog', (dialog) => {
        nativeDialogs.push(dialog.message());
        dialog.dismiss();
      });
    try {
      await openSyncDevice(phone, server, skew);
      await openSyncDevice(pc, server);
      await expect(phone.locator('#mobile-sync-status')).toBeVisible();
      await library(phone, true);
      await library(pc, false);
      await phoneContext.setOffline(true);
      await expect(phone.locator('#mobile-sync-status')).toHaveAttribute('data-state', 'offline');
      await phone.locator('#anime-grid [data-next="shared"]').click();
      await episode(pc, 5);
      await expect.poll(() => server.payload().anime[0].seasons[0].watched.includes(5)).toBe(true);
      await phoneContext.setOffline(false);
      await expect
        .poll(() => server.payload().anime[0].seasons[0].watched)
        .toEqual([1, 2, 3, 4, 5]);
      await expect
        .poll(() => pc.evaluate(() => window.ATMobile113.state().anime[0].seasons[0].watched))
        .toEqual([1, 2, 3, 4, 5]);
      await expect(phone.locator('#mobile-sync-status')).toHaveAttribute('data-state', 'synced');
      expect(nativeDialogs).toEqual([]);
      await expect(phone.locator('#sync-decision-dialog')).toHaveCount(0);
      // Closing journal/detail modals is a UI operation, not a data mutation.
      for (const page of [phone, pc])
        await page.evaluate(() => {
          for (const b of document.querySelectorAll('.modal-backdrop.show [data-close]')) b.click();
        });
      await episode(phone, 4);
      await expect.poll(() => server.payload().anime[0].seasons[0].watched).toEqual([1, 2, 3, 5]);
      await expect
        .poll(() => pc.evaluate(() => window.ATMobile113.state().anime[0].seasons[0].watched))
        .toEqual([1, 2, 3, 5]);
      await phone.evaluate(() => {
        for (const b of document.querySelectorAll('.modal-backdrop.show [data-close]')) b.click();
      });
      await phone.locator('#anime-grid [data-detail="shared"]').first().click();
      await phone.locator('[data-remove-anime="shared"]').dispatchEvent('click');
      await expect(phone.locator('#sync-decision-dialog')).toBeVisible();
      await expect(
        phone.locator(
          '#sync-decision-dialog [style], #anime-grid [style], #mobile-sync-status[style]',
        ),
      ).toHaveCount(0);
      await phone.locator('[data-decision="cancel"]').click();
      expect(server.payload().anime).toHaveLength(1);
      await phone.locator('[data-remove-anime="shared"]').dispatchEvent('click');
      await phone.locator('[data-decision="accept"]').click();
      await expect.poll(() => server.payload().anime).toHaveLength(0);
      await expect.poll(() => pc.evaluate(() => window.ATMobile113.state().anime)).toHaveLength(0);
      await pc.reload();
      await pc.waitForFunction(() => !document.body.classList.contains('account-booting'));
      expect(await pc.evaluate(() => window.ATMobile113.state().anime)).toEqual([]);
      expect(nativeDialogs).toEqual([]);
      const originalBackup = await phone.evaluate(
        () =>
          new Promise((resolve, reject) => {
            const req = indexedDB.open('animetrack-library');
            req.onerror = () => reject(req.error);
            req.onsuccess = () => {
              const db = req.result,
                read = db.transaction('backups').objectStore('backups').getAll();
              read.onsuccess = () => {
                db.close();
                resolve(read.result.find((row) => row.key.endsWith('_before_sync_1426'))?.snapshot);
              };
              read.onerror = () => {
                db.close();
                reject(read.error);
              };
            };
          }),
      );
      expect(JSON.parse(originalBackup)).toEqual(original);
    } finally {
      await phoneContext.close();
      await pcContext.close();
    }
  });
}
