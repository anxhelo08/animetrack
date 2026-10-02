import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openFixture } from '../fixtures/browser-app.js';

const stories = Array.from({ length: 13 }, (_, index) => ({
  id: String(index),
  title: `Anime story ${index}: a new world beyond the screen`,
  link: 'https://www.animenewsnetwork.com/news/2026-09-30/story-' + index,
  pubDate: '2026-09-30T09:00:00Z',
  category: ['Industry', 'Releases', 'General'][index % 3],
  snippet: `An interview${index} with anime creators. Discover the story, the craft and the next adventure.`,
  thumbnail:
    index === 0
      ? ''
      : 'https://news-images.animetrack.test/' + (index === 1 ? 'missing.jpg' : 'anime.jpg'),
}));
async function openNews(page, info) {
  if (info.project.name.startsWith('iphone')) {
    await page.locator('[data-mobile-nav="explore"]').click();
    await page.locator('.mobile-news-link').click();
  } else {
    await page.locator('#explore-nav').click();
    await page.locator('#pro-nav-news').click();
  }
  await expect(page.locator('.anime-news')).toBeVisible();
  await expect(page.locator('#page-title')).toHaveText('Lajme anime');
}
async function images(page) {
  await page.route('https://news-images.animetrack.test/**', (route) =>
    route.request().url().endsWith('missing.jpg')
      ? route.fulfill({ status: 404, body: '' })
      : route.fulfill({ contentType: 'image/jpeg', path: 'public/welcome/demon-slayer.jpg' }),
  );
}
async function audit(page) {
  const result = await new AxeBuilder({ page })
    .include('.anime-news')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
    [],
  );
}

test('news loads on demand with skeletons, filters stable cards, loads more and keeps library progress', async ({
  page,
}, info) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openFixture(page);
  await images(page);
  await page.waitForFunction(() => window.ATMobile113?.state().anime.length > 0);
  const before = await page.evaluate(() => window.ATMobile113.state().anime);
  let pending,
    calls = 0;
  await page.route('**/api/news', (route) => {
    calls++;
    pending = route;
  });
  expect(calls).toBe(0);
  await openNews(page, info);
  await expect(page.locator('.news-skeleton')).toHaveCount(8);
  await expect(page.locator('.news-grid')).toHaveAttribute('aria-busy', 'true');
  await pending.fulfill({ json: stories });
  await expect(page.locator('.news-card')).toHaveCount(8);
  await expect(page.locator('.news-card').nth(1).locator('img')).toHaveAttribute(
    'src',
    '/news-placeholder.svg',
  );
  await page.evaluate(() => {
    window.__newsCard = document.querySelector('.news-card');
  });
  await page.locator('[data-news-action="more"]').click();
  await expect(page.locator('.news-card')).toHaveCount(13);
  await expect(page.locator('[data-news-action="more"]')).toBeHidden();
  await page.locator('[data-news-tab="Industry"]').click();
  await expect(page.locator('.news-card')).toHaveCount(5);
  await page.locator('.news-search input').fill('interview3');
  await expect(page.locator('.news-card')).toHaveCount(1);
  await expect(page.locator('.news-card h3')).toContainText('story 3:');
  await page.locator('.news-search input').fill('no matching story');
  await expect(page.locator('.news-state')).toContainText('Asnjë histori');
  await page.getByRole('button', { name: 'Pastro filtrat', exact: true }).click();
  await expect(page.locator('.news-card')).toHaveCount(8);
  expect(
    await page.evaluate(() => window.__newsCard === document.querySelector('.news-card')),
  ).toBe(true);
  const link = page.locator('.news-read').first();
  await expect(link).toHaveAttribute('href', stories[0].link);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  await page
    .locator(
      info.project.name.startsWith('iphone') ? '[data-mobile-nav="library"]' : '#library-nav',
    )
    .click();
  await openNews(page, info);
  expect(calls).toBe(1);
  expect(
    await page.evaluate(() => window.__newsCard === document.querySelector('.news-card')),
  ).toBe(true);
  expect(await page.evaluate(() => window.ATMobile113.state().anime)).toEqual(before);
  for (const width of info.project.name.startsWith('iphone') ? [320, 390] : [1440, 768, 1800]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const columns = await page
      .locator('.news-grid')
      .evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(width < 600 ? 1 : width < 1000 ? 2 : width < 1700 ? 3 : 4);
    await audit(page);
    await page.screenshot({ path: info.outputPath('news-' + width + '.png'), fullPage: false });
  }
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'light';
  });
  await audit(page);
  await page.screenshot({ path: info.outputPath('news-light.png'), fullPage: false });
  expect(errors).toEqual([]);
});

test('news handles network errors and retry, with a valid empty state', async ({ page }, info) => {
  await openFixture(page);
  let failed = true;
  await page.route('**/api/news', (route) =>
    failed
      ? route.fulfill({ status: 502, json: { error: 'Provider blocked' } })
      : route.fulfill({ json: [] }),
  );
  await openNews(page, info);
  await expect(page.locator('.news-state')).toContainText('Lajmet po bëjnë një pushim');
  await audit(page);
  failed = false;
  await page.getByRole('button', { name: 'Provo përsëri', exact: true }).click();
  await expect(page.locator('.news-state')).toContainText('Asnjë histori');
  await expect(page.locator('.news-count')).toHaveText('0 lajme');
});

test('news respects reduced motion and cancels pending requests when navigating away', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openFixture(page);
  await images(page);
  let held;
  await page.route('**/api/news', (route) => {
    held = route;
  });
  await openNews(page, info);
  expect(
    await page
      .locator('.news-skeleton strong')
      .first()
      .evaluate((node) => getComputedStyle(node, '::after').animationName),
  ).toBe('none');
  await page
    .locator(info.project.name.startsWith('iphone') ? '[data-mobile-nav="home"]' : '#home-nav')
    .click();
  await page.route('**/api/news', (route) => route.fulfill({ json: stories }));
  await openNews(page, info);
  await expect(page.locator('.news-card')).toHaveCount(8);
  await expect(page.locator('.news-card.news-pending')).toHaveCount(0);
  expect(
    await page
      .locator('.news-card')
      .first()
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe('none');
  await held.fulfill({ json: stories }).catch(() => {});
  await audit(page);
});

test('featured headlines show article photos and rotate every 20 seconds without rebuilding cards', async ({
  page,
}, info) => {
  await page.clock.install({ time: new Date('2026-09-30T12:00:00Z') });
  await openFixture(page);
  // Freeze before mounting the carousel so network/image assertions do not consume its interval.
  await page.clock.pauseAt(new Date('2026-09-30T12:00:10Z'));
  const illustrated = stories.map((item) => ({
    ...item,
    thumbnail: '/api/news-image?article=' + encodeURIComponent(item.link),
  }));
  await page.route('**/api/news', (route) => route.fulfill({ json: illustrated }));
  await page.route('**/api/news-image?**', (route) =>
    route.fulfill({ contentType: 'image/jpeg', path: 'public/welcome/demon-slayer.jpg' }),
  );
  await openNews(page, info);
  const hero = page.locator('.news-hero');
  const headline = page.locator('.news-feature-slide.is-active h3');
  await expect(hero).toHaveAttribute('data-motion', 'running');
  await expect(headline).toHaveText(stories[0].title);
  await expect(page.locator('.news-feature-slide.is-active img')).toHaveAttribute(
    'src',
    illustrated[0].thumbnail,
  );
  await expect(page.locator('.news-feature-slide.is-active img')).toHaveJSProperty(
    'complete',
    true,
  );
  expect(
    await page.locator('.news-feature-slide.is-active img').evaluate((image) => image.naturalWidth),
  ).toBeGreaterThan(500);
  await page.screenshot({
    path: info.outputPath('news-featured.png'),
    fullPage: false,
    animations: 'disabled',
  });
  await expect(page.locator('.news-feature-slide.is-active a')).toHaveAttribute(
    'href',
    stories[0].link,
  );
  await expect(page.locator('.news-feature-slide.is-active a')).toHaveAttribute('target', '_blank');
  await expect(hero.locator('button')).toHaveCount(0);
  await page.evaluate(() => {
    window.__featuredImages = [...document.querySelectorAll('.news-feature-stage img')];
    window.__featuredCard = document.querySelector('.news-card');
  });
  const height = await hero.evaluate((node) => node.getBoundingClientRect().height);
  if (!info.project.name.startsWith('iphone')) await hero.hover();
  await page.clock.runFor(19000);
  await expect(headline).toHaveText(stories[0].title);
  await page.clock.runFor(1200);
  await expect(headline).toHaveText(stories[1].title);
  expect(await hero.evaluate((node) => node.getBoundingClientRect().height)).toBe(height);
  expect(
    await page.evaluate(
      () =>
        window.__featuredImages.every(
          (image, index) => image === document.querySelectorAll('.news-feature-stage img')[index],
        ) && window.__featuredCard === document.querySelector('.news-card'),
    ),
  ).toBe(true);
  expect(
    await page
      .locator('.news-feature-slide:not(.is-active)')
      .evaluateAll((slides) =>
        slides.every((slide) => slide.inert && slide.getAttribute('aria-hidden') === 'true'),
      ),
  ).toBe(true);
  await page
    .locator(
      info.project.name.startsWith('iphone') ? '[data-mobile-nav="library"]' : '#library-nav',
    )
    .click();
  await page.clock.runFor(25000);
  await openNews(page, info);
  await expect(headline).toHaveText(stories[1].title);
  await page.clock.runFor(20200);
  await expect(headline).toHaveText(stories[2].title);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(hero).toHaveAttribute('data-motion', 'paused');
  await page.clock.runFor(25000);
  await expect(headline).toHaveText(stories[2].title);
  await page.clock.resume();
  await audit(page);
});
