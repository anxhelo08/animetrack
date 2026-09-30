import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';
const payload = (n) => ({
  anime: [
    {
      id: 'storage-title',
      title: 'Storage fixture',
      status: 'watching',
      seasons: [
        {
          id: 's1',
          title: 'Sezoni 1',
          format: 'TV',
          total: 5,
          watched: Array.from({ length: n }, (_, i) => i + 1),
        },
      ],
    },
  ],
  history: [],
  preferences: { weeklyGoal: 10 },
});
async function readDB(page, key) {
  return page.evaluate(
    (key) =>
      new Promise((ok, no) => {
        const req = indexedDB.open('animetrack-library', 1);
        req.onerror = () => no(req.error);
        req.onsuccess = () => {
          const db = req.result,
            r = db.transaction('libraries').objectStore('libraries').get(key);
          r.onsuccess = () => {
            db.close();
            ok(r.result);
          };
          r.onerror = () => no(r.error);
        };
      }),
    key,
  );
}
async function settings(page, info) {
  await page
    .locator(
      info.project.name.startsWith('iphone') ? '[data-mobile-nav="profile"]' : '#pro-nav-profile',
    )
    .click();
  await page.locator('[data-product-action="settings"]').click();
  await page.locator('#product-advanced > details > summary').click();
}

test('verified IndexedDB migration restores this owner after legacy snapshot loss and rejects malformed import', async ({
  page,
}, info) => {
  const owner = 'storage-test',
    key = 'animetrack_user_' + owner;
  await page.addInitScript(
    ({ key, value }) => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
      if (!sessionStorage.getItem('seeded-storage')) {
        localStorage.setItem(key, JSON.stringify(value));
        localStorage.setItem(
          key + '_pending_126',
          JSON.stringify({ baseRevision: '2026-09-29T20:00:00Z', savedAt: Date.now() }),
        );
        localStorage.setItem(key + '_revision_126', '2026-09-29T20:00:00Z');
        sessionStorage.setItem('seeded-storage', '1');
      }
    },
    { key, value: payload(2) },
  );
  await openFixture(page, { owner, payload: payload(1) });
  await expect
    .poll(
      async () =>
        JSON.parse((await readDB(page, key))?.snapshot || '{}').anime?.[0]?.seasons?.[0]?.watched,
    )
    .toEqual([1, 2]);
  const record = await readDB(page, key);
  expect(record.hash).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.parse(record.pending).baseRevision).toBe('2026-09-29T20:00:00Z');
  await settings(page, info);
  await expect(page.locator('#library-storage-status')).toContainText('verifikuar');
  await page.locator('[data-storage-action="cleanup"]').click();
  await expect(page.locator('#toast')).toContainText('pritje');
  await page.evaluate((key) => localStorage.removeItem(key), key);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
  expect(await page.evaluate(() => window.ATMobile113.state().anime[0].seasons[0].watched)).toEqual(
    [1, 2],
  );
  const before = await page.evaluate(() => JSON.stringify(window.ATMobile113.state()));
  let dialogs = 0;
  page.on('dialog', async (dialog) => {
    dialogs++;
    await dialog.dismiss();
  });
  await page.locator('#import-file').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ anime: [{ title: { bad: true } }], history: [] })),
  });
  await expect(page.locator('#toast')).toContainText('pavlefshme');
  expect(dialogs).toBe(0);
  expect(await page.evaluate(() => JSON.stringify(window.ATMobile113.state()))).toBe(before);
});

test('invalid cloud input preserves the verified local owner library', async ({ page }, info) => {
  const owner = 'invalid-cloud',
    key = 'animetrack_user_' + owner;
  await page.addInitScript(
    ({ key, value }) => {
      if (!sessionStorage.getItem('seeded-invalid')) {
        localStorage.setItem(key, JSON.stringify(value));
        sessionStorage.setItem('seeded-invalid', '1');
      }
    },
    { key, value: payload(3) },
  );
  await openFixture(page, {
    owner,
    payload: { anime: [{ title: { broken: true } }], history: [] },
  });
  expect(await page.evaluate(() => window.ATMobile113.state().anime[0].seasons[0].watched)).toEqual(
    [1, 2, 3],
  );
  await settings(page, info);
  await expect(page.locator('#library-storage-status')).toContainText('verifikuar');
  await expect(page.locator('#product-sync')).toContainText('Lidhja nuk u krye');
});
