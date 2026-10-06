import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { openFixture } from '../fixtures/browser-app.js';

export function responsivenessLibrary() {
  return {
    anime: Array.from({ length: 500 }, (_, i) => ({
      id: 'responsive-' + i,
      title: 'Historia ' + String(i).padStart(3, '0'),
      status: 'watching',
      format: 'TV',
      hydrated: true,
      franchiseVersion: '13.1.0',
      createdAt: i < 250 ? '2026-09-28T12:00:00Z' : '2026-09-01T12:00:00Z',
      updatedAt: i < 250 ? '2026-09-28T12:00:00Z' : '2026-09-01T12:00:00Z',
      cover: '/welcome/demon-slayer.jpg',
      seasons: [
        {
          id: 'responsive-part-' + i,
          title: 'Sezoni 1',
          total: 12,
          watched: [1, 2, 3],
          format: 'TV',
          releaseStatus: 'FINISHED',
          episodes: [],
        },
      ],
    })),
    history: Array.from({ length: 6 }, (_, i) => ({
      eventId: 'responsive-event-' + i,
      id: 'responsive-' + i,
      seasonId: 'responsive-part-' + i,
      episode: 3,
      action: 'watched',
      date: '2026-09-29T12:00:00Z',
    })),
    preferences: {},
  };
}

const baseline = process.env.AT_MOBILE_BASELINE === '1';
const nav = (page, destination) =>
  page.locator(`.at-mobile-nav [data-mobile-nav="${destination}"]`);

async function navigateAndMeasure(page, destination) {
  return page.evaluate(async (next) => {
    const start = performance.now();
    document.querySelector(`.at-mobile-nav [data-mobile-nav="${next}"]`).click();
    const selector = next === 'library' ? '#anime-grid .anime-card' : '#mobile-continue .watch-row';
    while (document.body.dataset.mobilePage !== next || !document.querySelector(selector)) {
      if (performance.now() - start >= 10000)
        throw new Error(
          `Navigation to ${next} timed out: ${JSON.stringify({
            currentPage: document.body.dataset.mobilePage,
            matches: document.querySelectorAll(selector).length,
            libraryTitles: window.ATMobile113?.state()?.anime?.length,
            homeRows: document.querySelectorAll('#mobile-home .watch-row').length,
          })}`,
        );
      await new Promise(requestAnimationFrame);
    }
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    return performance.now() - start;
  }, destination);
}

test('500-title mobile workload measures home, navigation and episode reaction at 4x CPU', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== 'iphone-chromium');
  const session = await context.newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.addInitScript(() => {
    window.mobileLongTasks = [];
    new PerformanceObserver((list) =>
      window.mobileLongTasks.push(
        ...list.getEntries().map((entry) => ({
          start: entry.startTime,
          duration: entry.duration,
        })),
      ),
    ).observe({ type: 'longtask', buffered: true });
    const observer = new MutationObserver(() => {
      if (!document.querySelector('#mobile-home .watch-row')) return;
      window.firstMobileHomeAt = performance.now();
      observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await openFixture(page, {
    owner: 'responsiveness-measurement',
    payload: responsivenessLibrary(),
    persistWrites: true,
  });
  test.setTimeout(90000);
  await expect(page.locator('#mobile-continue .watch-row')).not.toHaveCount(0);
  const metrics = await page.evaluate(() => ({
    firstHomeMs: window.firstMobileHomeAt,
    initialHomeRows: document.querySelectorAll('#mobile-home .watch-row').length,
    initialActiveRows: document.querySelectorAll('#mobile-continue .watch-row').length,
    initialStaleRows: document.querySelectorAll('#mobile-stale .watch-row').length,
    startupLongTasks: window.mobileLongTasks.slice(),
  }));
  console.log('Mobile responsiveness home ready', JSON.stringify(metrics));
  await page.evaluate(() => {
    window.savedHomeRows = [...document.querySelectorAll('#mobile-home .watch-row')];
  });
  metrics.toLibraryMs = await navigateAndMeasure(page, 'library');
  console.log('Mobile responsiveness library navigation', metrics.toLibraryMs);
  metrics.toHomeMs = await navigateAndMeasure(page, 'home');
  console.log('Mobile responsiveness home navigation', metrics.toHomeMs);
  metrics.sameTabMs = await navigateAndMeasure(page, 'home');
  console.log('Mobile responsiveness before episode reaction', JSON.stringify(metrics));
  expect(await page.evaluate(() => window.savedHomeRows.every((row) => row.isConnected))).toBe(
    true,
  );
  const reaction = await page.evaluate(async () => {
    const start = performance.now();
    const button = document.querySelector('#mobile-continue [data-ios-action="advance"]');
    if (!button) throw new Error('Episode reaction: no advance button in the active home queue');
    const id = button.dataset.id;
    const progress = () =>
      window.ATMobile113.state().anime.find((item) => item.id === id)?.seasons[0]?.watched;
    const requireTime = (stage) => {
      if (performance.now() - start < 10000) return;
      throw new Error(
        `Episode reaction timed out at ${stage}: ${JSON.stringify({
          id,
          watched: progress(),
          currentPage: document.body.dataset.mobilePage,
          activeRows: [...document.querySelectorAll('#mobile-continue .watch-row')].map(
            (row) => row.dataset.watchKey,
          ),
        })}`,
      );
    };
    button.click();
    while (!progress()?.includes(4)) {
      requireTime('progress update');
      await new Promise(requestAnimationFrame);
    }
    while (!document.querySelector(`#mobile-continue [data-id="${id}"][data-mobile-episode="5"]`)) {
      requireTime('render next episode 5');
      await new Promise(requestAnimationFrame);
    }
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    return { id, reactionMs: performance.now() - start, start };
  });
  metrics.episodeReactionMs = reaction.reactionMs;
  metrics.reactionLongTasks = await page.evaluate(
    (start) => window.mobileLongTasks.filter((entry) => entry.start + entry.duration >= start),
    reaction.start,
  );
  console.log('500-title mobile responsiveness', JSON.stringify(metrics));
  await writeFile(
    baseline ? '/tmp/animetrack-mobile-baseline.json' : '/tmp/animetrack-mobile-after.json',
    JSON.stringify(metrics, null, 2),
  );
  await info.attach(baseline ? 'mobile-before.json' : 'mobile-after.json', {
    body: JSON.stringify(metrics, null, 2),
    contentType: 'application/json',
  });
  // Timing ceilings only catch severe hangs. The attached measurements support comparisons;
  // correctness does not depend on timing improvements on this particular host.
  expect(metrics.toLibraryMs).toBeLessThan(10000);
  expect(metrics.toHomeMs).toBeLessThan(10000);
  expect(metrics.episodeReactionMs).toBeLessThan(10000);
  if (!baseline) {
    // Large-library warm interactions must stay below the measured old response times.
    expect(metrics.toHomeMs).toBeLessThan(500);
    expect(metrics.episodeReactionMs).toBeLessThan(3000);
    const episodeClose = page.locator(
      '#episode-detail-modal.show [data-close="episode-detail-modal"]',
    );
    if (await episodeClose.isVisible()) await episodeClose.click();
    expect(metrics.initialHomeRows).toBeLessThanOrEqual(46);
    expect(metrics.initialActiveRows).toBe(20);
    expect(metrics.initialStaleRows).toBe(20);
    expect(
      await page.evaluate(() =>
        Boolean(
          document
            .getElementById('mobile-history')
            .compareDocumentPosition(document.getElementById('mobile-continue')) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      ),
    ).toBe(true);
    const more = page.locator('[data-mobile-action="load-home"][data-mobile-group="active"]');
    await more.click();
    await expect(page.locator('#mobile-continue .watch-row')).toHaveCount(40);
    const keys = await page
      .locator('#mobile-continue .watch-row')
      .evaluateAll((rows) => rows.map((row) => row.dataset.watchKey));
    expect(new Set(keys).size).toBe(keys.length);
    await page.locator('[data-mobile-action="load-home"][data-mobile-group="stale"]').click();
    await expect(page.locator('#mobile-stale .watch-row')).toHaveCount(40);
  }
  await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await expect
    .poll(() => page.evaluate(() => window.__ATFixtureLibraryCalls.write))
    .toBeGreaterThan(0);
  await page.reload();
  await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
  expect(
    await page.evaluate(
      (id) => window.ATMobile113.state().anime.find((item) => item.id === id).seasons[0].watched,
      reaction.id,
    ),
  ).toEqual([1, 2, 3, 4]);
});

test('mobile routes restore each scroll position and all next episodes remain reachable', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'iphone-chromium' || baseline);
  await openFixture(page, {
    owner: 'responsiveness-navigation',
    payload: responsivenessLibrary(),
  });
  test.setTimeout(90000);
  await expect(page.locator('#mobile-continue .watch-row')).toHaveCount(20);
  await page.evaluate(() => window.scrollTo({ top: 320, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  const homeTop = await page.evaluate(() => window.scrollY);
  await nav(page, 'library').click();
  await expect(page.locator('#anime-grid .anime-card')).not.toHaveCount(0);
  await page.evaluate(() => window.scrollTo({ top: 700, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(650);
  const libraryTop = await page.evaluate(() => window.scrollY);
  await nav(page, 'home').click();
  await expect
    .poll(() => page.evaluate((top) => Math.abs(window.scrollY - top), homeTop))
    .toBeLessThan(80);
  await nav(page, 'library').click();
  await expect
    .poll(() => page.evaluate((top) => Math.abs(window.scrollY - top), libraryTop))
    .toBeLessThan(80);
  await nav(page, 'home').click();

  // Leave in the same task as an unwatch action, before its queued presentation update.
  // Later use the existing sidebar route handlers so mobile click capture cannot mask
  // a scroll listener that remains suspended after the interrupted home transition.
  const unmarked = await page.evaluate(() => {
    const button = document.querySelector('#mobile-history [data-mobile-action="unwatch"]');
    const result = {
      id: button.dataset.id,
      season: button.dataset.mobileSeason,
      episode: Number(button.dataset.mobileEpisode),
    };
    button.click();
    document.getElementById('library-nav').click();
    return result;
  });
  await expect(page.locator('body')).toHaveAttribute('data-mobile-page', 'library');
  expect(
    await page.evaluate(
      ({ id, season, episode }) =>
        window.ATMobile113.state()
          .anime.find((item) => item.id === id)
          .seasons.find((part) => part.id === season)
          .watched.includes(episode),
      unmarked,
    ),
  ).toBe(false);
  await page.evaluate(() => document.getElementById('home-nav').click());
  await expect(
    page.locator(
      `#mobile-continue [data-id="${unmarked.id}"][data-mobile-episode="${unmarked.episode}"]`,
    ),
  ).toHaveCount(1);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  await page.evaluate(() => window.scrollTo({ top: 1000, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(980);
  // Allow the native scroll event to update the route's saved position.
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  const afterUnwatchTop = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => document.getElementById('library-nav').click());
  await expect(page.locator('body')).toHaveAttribute('data-mobile-page', 'library');
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  await page.evaluate(() => document.getElementById('home-nav').click());
  await expect
    .poll(() => page.evaluate((top) => Math.abs(window.scrollY - top), afterUnwatchTop))
    .toBeLessThan(80);

  for (const group of ['active', 'stale']) {
    const more = page.locator(`[data-mobile-action="load-home"][data-mobile-group="${group}"]`);
    for (let i = 0; i < 12; i++) await more.dispatchEvent('click');
    await expect(more).not.toBeVisible();
  }
  const queueKeys = await page
    .locator('#mobile-continue .watch-row,#mobile-stale .watch-row')
    .evaluateAll((rows) =>
      rows.map((row) => row.querySelector('[data-ios-action="advance"]').dataset.id),
    );
  expect(queueKeys).toHaveLength(500);
  expect(new Set(queueKeys).size).toBe(500);
});
