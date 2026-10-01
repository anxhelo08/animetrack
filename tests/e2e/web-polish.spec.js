import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';
const watched = Array.from({ length: 25 }, (_, i) => i + 1);
const payload = {
  anime: [
    {
      id: 'web-show',
      title: 'Seriali i provës',
      source: 'TVMaze',
      sourceId: '123',
      format: 'TV_SERIES',
      franchiseVersion: '13.1.0',
      status: 'watching',
      updatedAt: '2026-09-29T12:00:00Z',
      seasons: [
        {
          id: 'season-one',
          title: 'Sezoni 1',
          format: 'TV',
          total: 30,
          watched,
          episodes: [{ number: 26, title: 'Episodi i ri', airedAt: '2026-09-20T18:00:00Z' }],
        },
        { id: 'season-two', title: 'Sezoni 2', format: 'TV', total: 8, watched: [1, 2] },
      ],
    },
  ],
  history: watched.map((n) => ({
    eventId: 'seen-' + n,
    id: 'web-show',
    seasonId: 'season-one',
    episode: n,
    action: 'watched',
    date: '2026-09-29T12:00:00Z',
  })),
  preferences: { weeklyGoal: 10 },
};
const snapshot = (page) => page.evaluate(() => window.ATMobile113.state());
test('background refreshes preserve the desktop next episode card and do not restart its entrance', async ({
  page,
}, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Desktop feature card');
  await openFixture(page, { payload });
  await expect(page.locator('#at-home-focus')).toContainText('Episodi 26');
  await page.locator('#at-home-focus .at-h3-feature').evaluate((node) => {
    window.__feature = node;
    window.__featureReplacements = 0;
    new MutationObserver(() => {
      if (window.__feature !== document.querySelector('#at-home-focus .at-h3-feature'))
        window.__featureReplacements++;
    }).observe(node.parentNode, { childList: true });
  });
  for (let i = 0; i < 5; i++) {
    await page.locator('[data-home-action="sync-now"]').click();
    await expect(page.locator('body')).not.toHaveClass(/at-live-checking/);
  }
  expect(await page.evaluate(() => window.__featureReplacements)).toBe(0);
  expect(
    await page.evaluate(
      () => window.__feature === document.querySelector('#at-home-focus .at-h3-feature'),
    ),
  ).toBe(true);
});
test('episode feedback records stars, release date and custom date on the existing Diary event', async ({
  page,
}, info) => {
  await openFixture(page, { payload });
  await page
    .locator(
      info.project.name.startsWith('iphone') ? '[data-ios-action="advance"]' : '.at-h3-check-btn',
    )
    .first()
    .click();
  const journal = page.locator('.release-journal');
  await expect(journal).toBeVisible();
  await journal.getByRole('button', { name: '4 yje', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).history.at(-1).diaryRating).toBe(8);
  await journal.getByRole('button', { name: 'Kur doli', exact: true }).click();
  await expect
    .poll(async () => (await snapshot(page)).history.at(-1).date)
    .toBe('2026-09-20T18:00:00.000Z');
  await page.screenshot({ path: info.outputPath('episode-journal.png') });
  await journal.getByRole('button', { name: 'Zgjidh datën', exact: true }).click();
  await journal.locator('input').fill('2026-09-28T20:10');
  await journal.locator('input').dispatchEvent('change');
  await expect
    .poll(async () => (await snapshot(page)).history.at(-1).date)
    .toBe('2026-09-28T20:10:00.000Z');
  await journal.locator('input').fill('2099-01-01T12:00');
  await journal.locator('input').dispatchEvent('change');
  await expect(journal).toContainText('Nuk u ruajt');
  expect((await snapshot(page)).history).toHaveLength(26);
  expect((await snapshot(page)).anime[0].seasons[0].watched).toEqual([...watched, 26]);
  await journal.getByRole('button', { name: 'Mbyll', exact: true }).click();
  await page
    .locator(
      info.project.name.startsWith('iphone')
        ? '.at-mobile-nav [data-mobile-nav="diary"]'
        : '#pro-nav-diary',
    )
    .click();
  await expect(page.locator('.at132-entry').filter({ hasText: 'Episodi 26' })).toContainText(
    '★ 8.0',
  );
});
test('Diary filters scroll with the page and season selection lands on the selected episodes', async ({
  page,
}, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Desktop Diary and detail layout');
  const detailPayload = structuredClone(payload);
  detailPayload.anime[0].seasons.push({
    id: 'season-three',
    title: 'Sezoni 3',
    format: 'TV',
    total: 30,
    watched: [...watched],
  });
  await openFixture(page, { payload: detailPayload });
  await page.locator('[data-pro-page="diary"]').first().click();
  const controls = page.locator('.at132-controls');
  await expect(controls).toBeVisible();
  await expect
    .poll(() => controls.evaluate((node) => getComputedStyle(node).position))
    .toBe('static');
  await page.evaluate(() => window.scrollTo(0, 1800));
  await expect.poll(async () => (await controls.boundingBox()).y).toBeLessThan(0);
  await page.locator('#home-nav').click();
  await page.locator('[data-home-action="open-anime"]').first().click();
  const resume = page.locator('.at123-resume-button');
  await expect(resume).toBeVisible();
  expect(await resume.evaluate((node) => !!node.closest('.detail-content'))).toBe(true);
  await page.locator('[data-at131-part="season-two"]').click();
  const firstUnseen = page.locator('.ep-article:not(.seen)').first();
  await expect(firstUnseen.locator('[data-ep]')).toHaveAttribute('data-ep', '3');
  await expect
    .poll(async () => {
      const card = await firstUnseen.boundingBox(),
        modal = await page.locator('#detail-modal .modal').boundingBox();
      return card && modal && card.y >= modal.y && card.y + card.height <= modal.y + modal.height;
    })
    .toBe(true);
  await page.locator('[data-at131-part="season-three"]').click();
  await expect(page.locator('.ep-article:not(.seen)').first().locator('[data-ep]')).toHaveAttribute(
    'data-ep',
    '26',
  );
  await expect(page.locator('.episode-pages')).toContainText('Faqja 2/2');
});
test('TV and movie watch options work without asking for credentials', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('iphone'), 'Desktop watch details');
  const movie = {
    id: 'web-film',
    title: 'Fight Club',
    source: 'TMDB',
    tmdbId: '550',
    format: 'MOVIE',
    status: 'planning',
    seasons: [{ id: 'film-part', title: 'Film', format: 'MOVIE', total: 1, watched: [] }],
  };
  await openFixture(page, { payload: { ...payload, anime: [...payload.anime, movie] } });
  await page.locator('[data-home-action="open-anime"]').first().click();
  await page
    .locator('.product-secondary')
    .filter({ has: page.locator('.at133-watch') })
    .locator('summary')
    .click();
  await expect(page.locator('.at133-result a[href*="google.com/search"]')).toHaveAttribute(
    'href',
    /Seriali%20i%20prov/,
  );
  await expect(page.locator('.at133-result')).not.toContainText('Lidh TMDB');
  await page.locator('#detail-modal [data-close="detail-modal"]').first().click();
  await page.locator('#library-nav').click();
  await page.locator('[data-detail="web-film"]').first().click();
  await page
    .locator('.product-secondary')
    .filter({ has: page.locator('.at133-watch') })
    .locator('summary')
    .click();
  await expect(page.locator('.at133-result a[href*="google.com/search"]')).toHaveAttribute(
    'href',
    /Fight%20Club/,
  );
});
