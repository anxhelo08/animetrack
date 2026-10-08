import { expect, test } from 'vitest';
import { inspectPublicSite, publicOrigin, publicPaths } from '../../scripts/public-visibility.mjs';
import { summarizeLighthouse } from '../../scripts/summarize-lighthouse.mjs';

function site(overrides = {}) {
  const bodies = Object.fromEntries(
    publicPaths.map((path, index) => [
      path,
      `<html lang="sq"><head><title>AnimeTrack page ${index}</title><meta name="description" content="${'Public guide description '.repeat(5)}"><meta name="robots" content="index, follow"><meta property="og:url" content="${publicOrigin + path}"><link rel="canonical" href="${publicOrigin + path}"></head><body><main id="welcome-page"><h1>Public title</h1><a href="/help.html">Help</a><a href="#section">Section</a><section id="section">Content</section></main><script type="application/ld+json">${JSON.stringify({ '@type': 'WebApplication', url: publicOrigin + '/', inLanguage: 'sq' })}</script></body></html>`,
    ]),
  );
  bodies['/sitemap.xml'] =
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${publicPaths.map((path) => `<url><loc>${publicOrigin + path}</loc></url>`).join('')}</urlset>`;
  bodies['/robots.txt'] = `User-agent: *\nAllow: /\nSitemap: ${publicOrigin}/sitemap.xml`;
  bodies['/llms.txt'] = publicPaths.map((path) => `[page](${publicOrigin + path})`).join('\n');
  return async (url) => {
    const path = url.pathname;
    const item = overrides[path] || {};
    if (item.error) throw Error('secret session token must never appear in reports');
    return new Response(item.body ?? bodies[path] ?? '', {
      status: item.status || 200,
      headers: item.headers || {},
    });
  };
}

test('public monitor checks available pages, anchors and crawler files without collecting content', async () => {
  let clock = 0;
  const report = await inspectPublicSite({ fetcher: site(), now: () => clock++ });
  expect(report.ok).toBe(true);
  expect(report.checks.filter((item) => item.check === 'HTTP 200')).toHaveLength(7);
  expect(JSON.stringify(report)).not.toContain('Public guide description');
});

test.each([
  { '/help.html': { status: 404 } },
  { '/help.html': { headers: { 'x-robots-tag': 'noindex' } } },
  { '/help.html': { body: '<main><h1>Missing metadata</h1></main>' } },
  { '/sitemap.xml': { body: '<invalid' } },
  { '/sitemap.xml': { body: '<urlset></urlset>' } },
  { '/robots.txt': { body: 'User-agent: *\nDisallow: /' } },
  { '/llms.txt': { body: '# Empty' } },
  { '/': { error: true } },
])('public monitor fails visibly on broken discovery or availability: %j', async (overrides) => {
  const report = await inspectPublicSite({ fetcher: site(overrides) });
  expect(report.ok).toBe(false);
  expect(report.checks.some((item) => !item.ok)).toBe(true);
  expect(JSON.stringify(report)).not.toContain('secret session token');
});

test('Lighthouse report groups URLs and uses the median instead of hiding slow samples', () => {
  const report = (path, value) => ({
    finalUrl: 'http://localhost' + path,
    audits: {
      'largest-contentful-paint': { numericValue: value },
      'total-blocking-time': { numericValue: 20 },
      'cumulative-layout-shift': { numericValue: 0.04 },
    },
    categories: { seo: { score: 0.96 } },
  });
  const summary = summarizeLighthouse([
    report('/', 1000),
    report('/', 9000),
    report('/', 2000),
    report('/help.html', 500),
  ]);
  expect(summary).toContain('| / | 3 | 2000 | 20 | 40 | 96 |');
  expect(summary).toContain('| /help.html | 1 | 500 | 20 | 40 | 96 |');
  expect(summary).toContain('TBT nuk është INP');
  expect(summarizeLighthouse([{ finalUrl: 'http://localhost/', audits: {} }])).toContain('N/A');
});
