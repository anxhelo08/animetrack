import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openFixture } from '../fixtures/browser-app.js';
test.use({ serviceWorkers: 'block' });
const story = (id, title, status) => ({
  id,
  title,
  status,
  source: 'AniList',
  sourceId: String(id),
  format: 'TV',
  hydrated: true,
  franchiseVersion: '13.1.0',
  notes: 'Shënimi ekzistues',
  seasons: [1, 2].map((n) => ({
    id: id + '-s' + n,
    source: 'AniList',
    sourceId: String(Number(id) + n),
    title: 'Sezoni ' + n,
    format: 'TV',
    releaseStatus: 'FINISHED',
    total: 12,
    watched:
      status === 'completed'
        ? Array.from({ length: 12 }, (_, i) => i + 1)
        : n === 1 && status === 'watching'
          ? [1]
          : [],
  })),
});
const data = () => ({
  anime: [
    story('1000', 'Aktivi', 'watching'),
    story('2000', 'Për më vonë', 'planning'),
    story('3000', 'I përfunduar', 'completed'),
  ],
  history: [],
  preferences: {},
});
const library = (page, info) =>
  page
    .locator(
      info.project.name.startsWith('iphone') ? '[data-mobile-nav="library"]' : '#library-nav',
    )
    .click();
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

test('active and planned titles stay visible as destinations while filtering and maintenance stay separate', async ({
  page,
}, info) => {
  if (info.project.name.startsWith('iphone'))
    await page.setViewportSize({ width: 320, height: 844 });
  await openFixture(page, { payload: data() });
  await library(page, info);
  const before = await page.evaluate(() => JSON.stringify(window.ATMobile113.state()));
  const active = page.locator('#library-status-strip [data-filter="all"]'),
    planned = page.locator('#library-status-strip [data-filter="planning"]');
  await expect(active).toContainText('Aktive 2');
  await expect(planned).toContainText('Në plan 1');
  const boxes = await Promise.all([active.boundingBox(), planned.boundingBox()]);
  expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThan(2);
  expect(boxes[1].x + boxes[1].width).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  await expect(page.locator('#anime-grid .anime-card')).toHaveCount(2);
  await planned.click();
  await expect(planned).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#anime-grid')).toContainText('Për më vonë');
  await expect(page.locator('#anime-grid .anime-card')).toHaveCount(1);
  await expect(page.locator('#at113-library-head h2')).toHaveText('Në plan');
  const filters = page.locator('#mobile-library-controls'),
    tools = page.locator('#library-tools');
  await expect(filters).not.toHaveAttribute('open', '');
  await expect(tools).not.toHaveAttribute('open', '');
  await filters.locator('summary').click();
  await expect(filters.locator('#at116-import,.series-repair-panel')).toHaveCount(0);
  await expect(tools.locator('#at116-import')).toHaveCount(1);
  await expect(tools.locator('.series-repair-panel')).toHaveCount(1);
  await filters.locator('.library-status-options [data-filter="watching"]').click();
  await expect(page.locator('#anime-grid')).toContainText('Aktivi');
  await page.locator('[data-clear-library="all"]').click();
  await expect(page.locator('#anime-grid .anime-card')).toHaveCount(2);
  await filters.locator('summary').click();
  await tools.locator('summary').click();
  await expect(tools.locator('#at116-import')).toBeVisible();
  await expect(active).toBeVisible();
  await expect(planned).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(window.ATMobile113.state()))).toBe(before);
  await tools.locator('summary').click();
  await audit(page);
  await page.screenshot({ path: info.outputPath('library-destinations.png'), fullPage: true });
});

test('mobile notes come first, retain a draft across tabs and season refresh, and save without changing tracking', async ({
  page,
}, info) => {
  test.skip(!info.project.name.startsWith('iphone'), 'Mobile composition');
  await openFixture(page, { payload: data(), owner: 'lot2-notes', persistWrites: true });
  await library(page, info);
  await page.locator('#anime-grid [data-detail="1000"]').first().click();
  const hero = page.locator('.mobile-detail-hero'),
    expanded = (await hero.boundingBox()).height;
  await page.locator('[data-mobile-detail-tab="reviews"]').click();
  const panel = page.locator('[data-mobile-panel="reviews"]'),
    form = panel.locator('form.detail-personal-notes');
  await expect(form).toBeVisible();
  expect((await form.locator('textarea').boundingBox()).width).toBeGreaterThan(
    (await panel.boundingBox()).width * 0.9,
  );
  await expect(panel.locator(':scope > :first-child')).toHaveClass(/detail-personal-notes/);
  expect((await hero.boundingBox()).height).toBeLessThan(expanded - 80);
  await expect(page.locator('[data-mobile-panel="reviews"] .pro-rewatch')).toHaveCount(0);
  await expect(page.locator('[data-mobile-panel="episodes"] .pro-rewatch')).toHaveCount(1);
  await form.locator('textarea').fill('Draft i ri <privat>');
  await page.locator('[data-mobile-detail-tab="episodes"]').click();
  await page.locator('[data-season="1000-s2"]').click();
  await page.locator('[data-mobile-detail-tab="reviews"]').click();
  await expect(form.locator('textarea')).toHaveValue('Draft i ri <privat>');
  const before = await page.evaluate(() => ({
    history: window.ATMobile113.state().history,
    watched: window.ATMobile113.state().anime.map((a) => a.seasons.map((s) => s.watched)),
  }));
  const writes = await page.evaluate(() => window.__ATFixtureLibraryCalls.write);
  await form.getByRole('button', { name: 'Ruaj shënimet', exact: true }).click();
  await expect(form.locator('[data-notes-status]')).toContainText('u ruajtën');
  await expect
    .poll(() => page.evaluate(() => window.__ATFixtureLibraryCalls.write))
    .toBeGreaterThan(writes);
  expect(
    await page.evaluate(() => ({
      history: window.ATMobile113.state().history,
      watched: window.ATMobile113.state().anime.map((a) => a.seasons.map((s) => s.watched)),
    })),
  ).toEqual(before);
  await audit(page, '#detail-modal');
  await page.screenshot({ path: info.outputPath('notes-compact.png') });
  await page.locator('[data-mobile-detail-cover]').click();
  await expect(page.locator('#detail-body')).not.toHaveClass(/mobile-detail-compact/);
  await page.locator('#detail-modal [data-close]').click();
  await page.reload();
  await page.waitForFunction(() => !document.body.classList.contains('account-booting'));
  await library(page, info);
  await page.locator('#anime-grid [data-detail="1000"]').first().click();
  await page.locator('[data-mobile-detail-tab="reviews"]').click();
  await expect(form.locator('textarea')).toHaveValue('Draft i ri <privat>');
});

test('movie notes remain in their own mobile tab with the existing movie save action', async ({
  page,
}, info) => {
  test.skip(!info.project.name.startsWith('iphone'), 'Mobile movie');
  const movie = {
    ...story('4000', 'Filmi', 'completed'),
    format: 'MOVIE',
    source: 'Cinemeta',
    sourceId: 'tt1234567',
    imdbId: 'tt1234567',
    seasons: [
      {
        id: 'film-part',
        title: 'Film',
        format: 'MOVIE',
        total: 1,
        watched: [1],
        releaseStatus: 'FINISHED',
      },
    ],
  };
  await openFixture(page, { payload: { anime: [movie], history: [], preferences: {} } });
  await library(page, info);
  await page.locator('#anime-grid [data-detail]').first().click();
  await page.locator('[data-mobile-detail-tab="reviews"]').click();
  const input = page.locator('[data-mobile-panel="reviews"] [data-movie-notes]');
  await expect(input).toBeVisible();
  await input.fill('Shënim për filmin');
  await page.locator('[data-movie-save-notes]').click();
  await expect
    .poll(() => page.evaluate(() => window.ATMobile113.state().anime[0].notes))
    .toBe('Shënim për filmin');
  await expect(page.locator('[data-mobile-panel="reviews"] [data-movie-notes]')).toBeVisible();
  await page.locator('[data-mobile-detail-tab="episodes"]').click();
  await expect(page.locator('[data-mobile-panel="episodes"] [data-movie-rewatch]')).toBeVisible();
  await page.locator('[data-mobile-detail-tab="reviews"]').click();
  await expect(input).toHaveValue('Shënim për filmin');
  await audit(page, '#detail-modal');
});
