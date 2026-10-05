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
        const req = indexedDB.open('animetrack-library');
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

test('iPhone quota recovery preserves episode photos and offline +1 after reload without a blocking warning', async ({
  page,
}, info) => {
  test.skip(!info.project.name.startsWith('iphone'));
  const owner = 'iphone-quota',
    key = 'animetrack_user_' + owner,
    value = payload(2);
  Object.assign(value.anime[0], {
    format: 'TV',
    hydrated: true,
    franchiseVersion: '13.1.0',
    updatedAt: '2026-09-29T20:00:00Z',
    notes: 'Shënime personale 💜',
  });
  Object.assign(value.anime[0].seasons[0], {
    total: 100,
    format: 'TV',
    releaseStatus: 'FINISHED',
    episodes: Array.from({ length: 100 }, (_, i) => ({
      number: i + 1,
      title: 'Episodi ' + (i + 1),
      synopsis: 'Historia e episodit. '.repeat(100),
      image: 'https://cdn.example.com/photo-' + (i + 1) + '.jpg',
      myNote: 'Shënimi ' + i,
    })),
  });
  await page.addInitScript(
    ({ key, value }) => {
      const nativeSet = Storage.prototype.setItem;
      if (!sessionStorage.getItem('quota-seeded')) {
        nativeSet.call(localStorage, key, JSON.stringify(value));
        nativeSet.call(localStorage, key + '_before_sync_1426', JSON.stringify(value));
        nativeSet.call(localStorage, 'quota-auth-sentinel', 'preserved');
        sessionStorage.setItem('quota-seeded', '1');
      }
      Storage.prototype.setItem = function (k, v) {
        if (this === localStorage) {
          let size = String(v).length;
          for (let i = 0; i < this.length; i++) {
            const name = this.key(i);
            if (name !== String(k)) size += this.getItem(name).length;
          }
          if (size > 24000) throw new DOMException('iPhone quota', 'QuotaExceededError');
        }
        return nativeSet.call(this, k, v);
      };
      Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    },
    { key, value },
  );
  await openFixture(page, { owner, payload: value, persistWrites: true });
  await expect(page.locator('#at128-storage-warning')).toHaveCount(0);
  await page.locator('[data-mobile-nav="library"]').click();
  await page.locator('#anime-grid [data-next="storage-title"]').click();
  await expect
    .poll(() => page.evaluate(() => window.ATMobile113.state().anime[0].seasons[0].watched))
    .toEqual([1, 2, 3]);
  await expect
    .poll(
      async () =>
        JSON.parse((await readDB(page, key))?.snapshot || '{}').anime?.[0]?.seasons?.[0]?.watched,
    )
    .toEqual([1, 2, 3]);
  expect(await page.evaluate((key) => localStorage.getItem(key).startsWith('ATLS1:'), key)).toBe(
    true,
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
  await expect(page.locator('#at128-storage-warning')).toHaveCount(0);
  const saved = await page.evaluate(() => window.ATMobile113.state());
  expect(saved.anime[0].seasons[0].watched).toEqual([1, 2, 3]);
  expect(saved.anime[0].seasons[0].episodes[0].image).toBe(
    value.anime[0].seasons[0].episodes[0].image,
  );
  expect(saved.anime[0].seasons[0].episodes[0].myNote).toBe('Shënimi 0');
  expect(saved.anime[0].notes).toBe('Shënime personale 💜');
  expect(await page.evaluate(() => localStorage.getItem('quota-auth-sentinel'))).toBe('preserved');
});
