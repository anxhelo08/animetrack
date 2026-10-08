import { JSDOM } from 'jsdom';

export const publicOrigin = 'https://animetrack-flax.vercel.app';
export const publicPaths = ['/', '/install.html', '/integrations/player-guide.html', '/help.html'];

// Public responses only: never load a user session or include response bodies in reports.
export async function inspectPublicSite({
  origin = publicOrigin,
  fetcher = fetch,
  now = Date.now,
} = {}) {
  const checks = [];
  const responses = new Map();
  async function get(path) {
    if (responses.has(path)) return responses.get(path);
    const started = now();
    let result;
    try {
      const response = await fetcher(new URL(path, origin), {
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
      });
      const body = await response.text();
      result = { status: response.status, body, headers: response.headers };
      checks.push({
        path,
        check: 'HTTP 200',
        ok: response.status === 200,
        elapsedMs: Math.max(0, now() - started),
      });
    } catch {
      result = { status: 0, body: '', headers: new Headers() };
      checks.push({ path, check: 'HTTP 200', ok: false, elapsedMs: Math.max(0, now() - started) });
    }
    responses.set(path, result);
    return result;
  }
  function check(path, label, ok) {
    checks.push({ path, check: label, ok: Boolean(ok) });
  }
  const titles = [];
  for (const path of publicPaths) {
    const response = await get(path);
    if (response.status !== 200) continue;
    const dom = new JSDOM(response.body);
    try {
      const document = dom.window.document;
      const description = document.querySelector('meta[name="description"]')?.content;
      const canonical = document.querySelectorAll('link[rel="canonical"]');
      titles.push(document.title);
      check(
        path,
        'Public metadata',
        document.documentElement.lang === 'sq' &&
          document.title.length > 10 &&
          description?.length > 80 &&
          canonical.length === 1 &&
          canonical[0].getAttribute('href') === publicOrigin + path &&
          document.querySelector('meta[property="og:url"]')?.content === publicOrigin + path &&
          document.querySelector('meta[name="robots"]')?.content === 'index, follow',
      );
      check(
        path,
        'Indexable response',
        !/noindex/i.test(response.headers.get('x-robots-tag') || ''),
      );
      const content =
        path === '/' ? document.querySelector('#welcome-page') : document.querySelector('main');
      check(path, 'Public content', content?.querySelectorAll('h1').length === 1);
      for (const anchor of content?.querySelectorAll('a[href]') || []) {
        const url = new URL(anchor.getAttribute('href'), publicOrigin + path);
        if (url.origin !== publicOrigin) continue;
        if (url.pathname === path && url.hash) {
          check(
            path,
            'Section ' + url.hash,
            Boolean(document.getElementById(decodeURIComponent(url.hash.slice(1)))),
          );
        } else if (publicPaths.includes(url.pathname)) {
          check(path, 'Link ' + url.pathname, (await get(url.pathname)).status === 200);
        }
      }
      if (path === '/') {
        let application;
        try {
          application = JSON.parse(
            document.querySelector('script[type="application/ld+json"]')?.textContent || '',
          );
        } catch {}
        check(
          path,
          'WebApplication JSON-LD',
          application?.['@type'] === 'WebApplication' &&
            application.url === publicOrigin + '/' &&
            application.inLanguage === 'sq',
        );
      }
    } finally {
      dom.window.close();
    }
  }
  check(
    '/',
    'Distinct public titles',
    titles.length === publicPaths.length && new Set(titles).size === publicPaths.length,
  );
  const sitemap = await get('/sitemap.xml');
  try {
    const dom = new JSDOM(sitemap.body, { contentType: 'application/xml' });
    try {
      const urls = [
        ...dom.window.document.getElementsByTagNameNS(
          'http://www.sitemaps.org/schemas/sitemap/0.9',
          'loc',
        ),
      ].map((node) => node.textContent);
      check(
        '/sitemap.xml',
        'All public URLs',
        urls.length === publicPaths.length &&
          publicPaths.every((path) => urls.includes(publicOrigin + path)),
      );
    } finally {
      dom.window.close();
    }
  } catch {
    check('/sitemap.xml', 'Valid XML', false);
  }
  const robots = await get('/robots.txt');
  check(
    '/robots.txt',
    'Crawler guidance',
    /^Allow:\s*\/$/m.test(robots.body) &&
      robots.body.includes('Sitemap: ' + publicOrigin + '/sitemap.xml'),
  );
  const guide = await get('/llms.txt');
  check(
    '/llms.txt',
    'Public guide links',
    publicPaths.every((path) => guide.body.includes('](' + publicOrigin + path + ')')),
  );
  return {
    ok: checks.every((item) => item.ok),
    scope: 'Public HTTP responses; timings are not Core Web Vitals',
    checks,
  };
}
