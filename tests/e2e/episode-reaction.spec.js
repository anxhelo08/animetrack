import { test, expect } from '@playwright/test';
import { openFixture } from '../fixtures/browser-app.js';

const payload = {
  anime: [
    {
      id: 'reaction-anime',
      title: 'Historia e episodit',
      status: 'watching',
      source: 'AniList',
      sourceId: '123',
      format: 'TV',
      hydrated: true,
      franchiseVersion: '13.1.0',
      createdAt: '2026-09-29T12:00:00Z',
      updatedAt: '2026-09-29T12:00:00Z',
      seasons: [
        {
          id: 'reaction-season',
          title: 'Sezoni 1',
          total: 12,
          watched: [1, 2, 3],
          source: 'AniList',
          sourceId: '123',
          format: 'TV',
          releaseStatus: 'FINISHED',
          episodes: [
            {
              number: 4,
              title: 'Detajet e ruajtura',
              summary: 'Përshkrimi i episodit',
              image: 'https://static.tvmaze.com/uploads/images/original_untouched/1/1.jpg',
              detailsCheckedAt: '2026-09-30T00:00:00Z',
            },
          ],
        },
      ],
    },
  ],
  history: [],
  preferences: {},
};

for (const closeImmediately of [false, true]) {
  test(`episode save paints once synchronously and preserves progress${closeImmediately ? ' after immediate close' : ''}`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'iphone-chromium');
    await openFixture(page, { owner: 'episode-reaction', payload, persistWrites: true });
    await expect(page.locator('#mobile-continue [data-ios-action="advance"]')).toHaveCount(1);
    const paints = await page.evaluate((close) => {
      window.episodePanelPaints = 0;
      const count = (records) =>
        records.filter((record) =>
          [...record.addedNodes].some((node) => node.classList?.contains('ep-detail-visual')),
        ).length;
      const observer = new MutationObserver((records) => {
        window.episodePanelPaints += count(records);
      });
      observer.observe(document.getElementById('ep-detail-body'), { childList: true });
      document.querySelector('#mobile-continue [data-ios-action="advance"]').click();
      if (close)
        document.querySelector('#episode-detail-modal [data-close="episode-detail-modal"]').click();
      window.episodePanelPaints += count(observer.takeRecords());
      return window.episodePanelPaints;
    }, closeImmediately);
    expect(paints).toBe(1);
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    if (closeImmediately) {
      await expect(page.locator('#episode-detail-modal')).not.toHaveClass(/show/);
      expect(await page.evaluate(() => window.episodePanelPaints)).toBe(1);
    } else {
      await expect(page.locator('#episode-detail-modal')).toHaveClass(/show/);
      await expect(page.locator('.episode-card-subtitle')).toContainText('Detajet e ruajtura');
    }
    const state = await page.evaluate(() => window.ATMobile113.state());
    expect(state.anime[0].seasons[0].watched).toEqual([1, 2, 3, 4]);
    expect(state.history.at(-1)).toMatchObject({
      id: 'reaction-anime',
      episode: 4,
      action: 'watched',
    });
    await expect
      .poll(() => page.evaluate(() => window.__ATFixtureLibraryCalls.write))
      .toBeGreaterThan(0);
    await page.reload();
    await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
    expect(
      await page.evaluate(() => window.ATMobile113.state().anime[0].seasons[0].watched),
    ).toEqual([1, 2, 3, 4]);
  });
}
