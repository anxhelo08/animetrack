import { test, expect } from '@playwright/test';
import { JSDOM } from 'jsdom';
import { openFixture } from '../fixtures/browser-app.js';

const origin = 'https://animetrack-flax.vercel.app';
const pages = [
  ['/', 'AnimeTrack — Ndiq anime, filma, seriale, manga dhe manhwa'],
  ['/install.html', 'Instalo AnimeTrack falas në iPhone dhe Android'],
  ['/integrations/player-guide.html', 'Lidh player-in dhe gjurmo episodet — AnimeTrack'],
];

for (const [path, title] of pages) {
  test(`public metadata is present in the HTTP response without JavaScript: ${path}`, async ({
    request,
  }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const dom = new JSDOM(await response.text());
    try {
      const document = dom.window.document;
      expect(document.documentElement.lang).toBe('sq');
      expect(document.title).toBe(title);
      expect(document.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe('/icon.svg');
      expect((await request.head('/icon.svg')).status()).toBe(200);
      const description = document.querySelector('meta[name="description"]')?.content;
      expect(description?.length).toBeGreaterThan(80);
      expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1);
      expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
      expect(document.querySelector('link[rel="canonical"]')?.href).toBe(origin + path);
      expect(document.querySelector('meta[property="og:url"]')?.content).toBe(origin + path);
      expect(document.querySelector('meta[property="og:title"]')?.content).toBe(title);
      expect(document.querySelector('meta[property="og:description"]')?.content).toBe(description);
      expect(document.querySelector('meta[name="twitter:title"]')?.content).toBe(title);
      expect(document.querySelector('meta[name="twitter:description"]')?.content).toBe(description);
      expect(document.querySelector('meta[name="twitter:card"]')?.content).toBe('summary');
      const image = document.querySelector('meta[property="og:image"]')?.content;
      expect(image).toBe(origin + '/icon-512.png');
      const artwork = await request.head(new URL(image).pathname);
      expect(artwork.status()).toBe(200);
      expect(artwork.headers()['content-type']).toContain('image/png');
    } finally {
      dom.window.close();
    }
  });
}

test('sitemap contains only reachable public pages with distinct titles', async ({ request }) => {
  const response = await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('xml');
  const dom = new JSDOM(await response.text(), { contentType: 'application/xml' });
  try {
    const document = dom.window.document;
    expect(document.documentElement.namespaceURI).toBe(
      'http://www.sitemaps.org/schemas/sitemap/0.9',
    );
    const urls = [...document.querySelectorAll('loc')].map((node) => node.textContent);
    expect(urls).toEqual(pages.map(([path]) => origin + path));
    const titles = [];
    for (const url of urls) {
      expect(new URL(url).search).toBe('');
      const page = await request.get(new URL(url).pathname);
      expect(page.status()).toBe(200);
      const html = new JSDOM(await page.text());
      titles.push(html.window.document.title);
      html.window.close();
    }
    expect(new Set(titles).size).toBe(urls.length);
  } finally {
    dom.window.close();
  }
});

test('robots points to the sitemap and allows public pages and rendering assets', async ({
  request,
}) => {
  const response = await request.get('/robots.txt');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/plain');
  const text = await response.text();
  expect(text).toContain('User-agent: *\nAllow: /');
  expect(text).toContain('Disallow: /api/');
  expect(text).toContain('Disallow: /downloads/');
  expect(text).toContain('Sitemap: ' + origin + '/sitemap.xml');
  expect(text).not.toMatch(/Disallow:\s*\/(?:assets|install|integrations)/);
});

test('the player guide has working external CSS under the strict CSP and usable links', async ({
  page,
}) => {
  const response = await page.goto('/integrations/player-guide.html');
  expect(response.headers()['content-security-policy']).toContain("style-src-attr 'none'");
  expect(response.headers()['content-security-policy']).toContain("script-src 'self'");
  await expect(page.locator('h1')).toHaveText('Lidh player-in me AnimeTrack');
  await expect(page.locator('main h2')).toHaveCount(3);
  expect(await page.locator('body').evaluate((node) => getComputedStyle(node).fontSize)).toBe(
    '17px',
  );
  await expect(page.locator('style, [style]')).toHaveCount(0);
  await expect(page.locator('nav a[href="/install.html"]')).toHaveCount(1);
  const download = await page.request.head('/integrations/animetrack-player.zip');
  expect(download.status()).toBe(200);
  await page.locator('nav a[href="/install.html"]').click();
  await expect(page).toHaveTitle(pages[1][1]);
});

test('guest welcome links connect the public guides', async ({ page }) => {
  await openFixture(page, { signedIn: false });
  const nav = page.locator('.welcome-public-links');
  await expect(nav).toBeVisible();
  await expect(nav.locator('a')).toHaveCount(2);
  await nav.locator('a[href="/install.html"]').click();
  await expect(page).toHaveTitle(pages[1][1]);
});

test('query variants and account data never become canonical or share metadata', async ({
  page,
  request,
}) => {
  const response = await request.get('/?profile=someone&utm_source=test');
  const dom = new JSDOM(await response.text());
  expect(dom.window.document.querySelector('link[rel="canonical"]').href).toBe(origin + '/');
  dom.window.close();
  await openFixture(page, {
    owner: 'seo-private-owner',
    payload: {
      anime: [
        {
          id: 'private-title',
          title: 'Titulli privat i bibliotekës',
          status: 'watching',
          seasons: [{ id: 'private-season', total: 12, watched: [1] }],
        },
      ],
      history: [],
      preferences: {},
    },
  });
  await expect(page).toHaveTitle(pages[0][1]);
  const metadata = await page
    .locator('head meta')
    .evaluateAll((nodes) => nodes.map((node) => node.content).join('\n'));
  expect(metadata).not.toContain('Titulli privat i bibliotekës');
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', origin + '/');
});

test('the public AI guide links only to the same public pages', async ({ request }) => {
  const response = await request.get('/llms.txt');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/plain');
  const text = await response.text();
  expect(text).toContain('# AnimeTrack');
  const links = [...text.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((match) => match[1]);
  expect(links).toEqual(pages.map(([path]) => origin + path));
});
