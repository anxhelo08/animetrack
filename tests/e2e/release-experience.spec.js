import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';
const payload = {
  anime: [
    {
      id: 'release-title',
      title: 'Titulli i provës',
      status: 'watching',
      seasons: [{ id: 'release-season', title: 'Sezoni 1', format: 'TV', total: 3, watched: [] }],
    },
  ],
  history: [],
  preferences: { weeklyGoal: 10 },
};
const watched = (page) =>
  page.evaluate(() => window.ATMobile113.state().anime[0].seasons[0].watched);
async function mark(page, info) {
  await page
    .locator(
      info.project.name.startsWith('iphone') ? '[data-ios-action="advance"]' : '.at-h4-advance',
    )
    .first()
    .click();
}
test('successful episode feedback offers keyboard undo and rejects stale history', async ({
  page,
}, info) => {
  await openFixture(page, { payload });
  await mark(page, info);
  await expect.poll(() => watched(page)).toEqual([1]);
  await expect(page.locator('.release-feedback')).toContainText('Episodi 1 u shënua');
  await page.locator('.release-feedback button').focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => watched(page)).toEqual([]);
  await expect(page.locator('.release-feedback')).toContainText('Shënimi u zhbë');
  await mark(page, info);
  await page.evaluate(() =>
    window.ATMobile113.state().history.push({ eventId: 'later-event', action: 'other' }),
  );
  await page.locator('.release-feedback button').click();
  await expect(page.locator('.release-feedback')).toContainText('Progresi ka ndryshuar');
  expect(await watched(page)).toEqual([1]);
});
test('mobile swipe ignores vertical, left and cancelled gestures and marks once with undo', async ({
  page,
}, info) => {
  test.skip(!info.project.name.startsWith('iphone'), 'Touch gesture applies to mobile cards.');
  await openFixture(page, { payload });
  async function swipe(dx, dy = 0, cancel = false) {
    await page
      .locator('#mobile-continue .watch-row')
      .first()
      .evaluate(
        (card, { dx, dy, cancel }) => {
          const point = {
            bubbles: true,
            cancelable: true,
            pointerId: 1,
            pointerType: 'touch',
            isPrimary: true,
          };
          card.dispatchEvent(
            new PointerEvent('pointerdown', { ...point, clientX: 20, clientY: 200 }),
          );
          card.dispatchEvent(
            new PointerEvent(cancel ? 'pointercancel' : 'pointerup', {
              ...point,
              clientX: 20 + dx,
              clientY: 200 + dy,
            }),
          );
        },
        { dx, dy, cancel },
      );
  }
  await swipe(120, 90);
  await swipe(-120);
  await swipe(120, 0, true);
  expect(await watched(page)).toEqual([]);
  await swipe(120);
  await expect.poll(() => watched(page)).toEqual([1]);
  await page.locator('.release-feedback button').click();
  await expect.poll(() => watched(page)).toEqual([]);
});
test('PWA shortcuts open the requested destination after account initialization', async ({
  page,
}) => {
  await openFixture(page);
  for (const [shortcut, selector] of [
    ['library', '#library-view'],
    ['explore', '#discover'],
    ['diary', '.at132-diary'],
  ]) {
    await page.goto('/?source=pwa&shortcut=' + shortcut);
    await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
    await expect(page.locator(selector)).toBeVisible();
    expect(new URL(page.url()).searchParams.has('shortcut')).toBe(false);
  }
});

test('failed persistence rolls back progress without successful episode feedback', async ({
  page,
}, info) => {
  await openFixture(page, { payload });
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (String(key).startsWith('animetrack_user_'))
        throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await mark(page, info);
  expect(await watched(page)).toEqual([]);
  await expect(page.locator('.release-feedback')).toBeHidden();
});
test('installation manifest exposes valid screenshots, separate maskable icon and local shortcuts', async ({
  request,
}) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.icons.filter((icon) => icon.purpose === 'maskable')).toHaveLength(1);
  for (const image of [...manifest.icons, ...manifest.screenshots]) {
    const response = await request.get(image.src);
    expect(response.ok()).toBe(true);
    const bytes = await response.body();
    expect(bytes.subarray(1, 4).toString()).toBe('PNG');
    expect(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`).toBe(image.sizes);
  }
  expect(
    manifest.shortcuts.map((shortcut) =>
      new URL(shortcut.url, 'http://localhost').searchParams.get('shortcut'),
    ),
  ).toEqual(['library', 'explore', 'diary']);
});
