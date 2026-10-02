import { describe, it, expect, vi } from 'vitest';
import { createHandler } from '../../api/news.js';
import {
  parseNewsFeed,
  readNewsXML,
  NEWS_FEEDS,
  NEWS_PLACEHOLDER,
} from '../../server/news-feed.js';
const xml = (items) =>
  `<?xml version="1.0"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>News</title>${items}</channel></rss>`;
const entry = (id, extra = '') =>
  `<item><title>Anime ${id} &amp; Friends premiere</title><link>https://www.animenewsnetwork.com/news/${id}</link><pubDate>Fri, 02 Oct 2026 09:00:00 GMT</pubDate><description><![CDATA[<p>A <b>new</b> story.</p>]]></description>${extra}</item>`;
const feed = xml(entry(1));
function response() {
  return {
    headers: {},
    code: null,
    body: null,
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(n) {
      this.code = n;
      return this;
    },
    json(v) {
      this.body = v;
      return this;
    },
  };
}
const request = { method: 'GET', headers: {}, socket: { remoteAddress: '127.0.0.1' } };

describe('RSS news parsing', () => {
  it('normalizes CDATA, entities, dates, categories and media images into clean article records', () => {
    const [item] = parseNewsFeed(
      xml(entry(1, '<category>Industry</category><media:thumbnail url="/images/news.jpg"/>')),
    );
    expect(item).toMatchObject({
      title: 'Anime 1 & Friends premiere',
      snippet: 'A new story.',
      pubDate: '2026-10-02T09:00:00.000Z',
      category: 'Industry',
      thumbnail: 'https://www.animenewsnetwork.com/images/news.jpg',
      source: 'Anime News Network',
    });
    expect(item.id).toMatch(/^[a-f0-9]{20}$/);
  });
  it('deduplicates links, rejects missing/hostile article URLs, and uses the local fallback artwork', () => {
    const items = parseNewsFeed(
      xml(
        entry(1) +
          entry(1) +
          entry(2).replace('https://www.animenewsnetwork.com/news/2', 'javascript:alert(1)') +
          '<item><title>Missing link</title></item>',
      ),
    );
    expect(items).toHaveLength(1);
    expect(items[0].thumbnail).toBe(NEWS_PLACEHOLDER);
  });
  it('extracts an enclosure or HTML image and never returns scripts as descriptive text', () => {
    const [item] = parseNewsFeed(
      xml(entry(2, '<enclosure type="image/jpeg" url="https://cdn.animenewsnetwork.com/a.jpg"/>')),
    );
    expect(item.thumbnail).toBe('https://cdn.animenewsnetwork.com/a.jpg');
    const other = parseNewsFeed(
      xml(
        entry(3).replace(
          '<p>A <b>new</b> story.</p>',
          '<script>alert(1)</script><p>Story</p><img src="https://cdn.animenewsnetwork.com/b.jpg">',
        ),
      ),
    )[0];
    expect(other.snippet).toBe('Story');
    expect(other.thumbnail).toBe('https://cdn.animenewsnetwork.com/b.jpg');
  });
  it('rejects entity declarations, HTML challenge responses, malformed XML and empty feeds', () => {
    for (const invalid of [
      '<!DOCTYPE rss [<!ENTITY x "boom">]>' + feed,
      '<html><body>Challenge</body></html>',
      '<rss>',
      xml(''),
    ])
      expect(() => parseNewsFeed(invalid)).toThrow();
  });
  it('bounds streaming RSS downloads even without Content-Length', async () => {
    await expect(readNewsXML(new Response('x'.repeat(100)), 20)).rejects.toThrow('Feed too large');
  });
});
describe('cached news proxy', () => {
  it('collapses concurrent requests and reuses fresh articles with the requested CDN caching headers', async () => {
    const fetchImpl = vi.fn(async () => new Response(feed));
    const handler = createHandler({ fetchImpl, limit: () => true });
    const responses = [response(), response(), response()];
    await Promise.all(responses.map((res) => handler(request, res)));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe(NEWS_FEEDS[0].url);
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({
      redirect: 'manual',
      signal: expect.any(AbortSignal),
    });
    for (const res of responses) {
      expect(res.code).toBe(200);
      expect(res.headers['Cache-Control']).toBe(
        'public, s-maxage=900, stale-while-revalidate=1800',
      );
      expect(res.body).toHaveLength(1);
    }
  });
  it('tries the second publisher on failure and never forwards a client-supplied URL', async () => {
    const fetchImpl = vi.fn(async (url) =>
      url === NEWS_FEEDS[0].url
        ? new Response('Denied', { status: 403 })
        : new Response(
            feed.replaceAll(
              'https://www.animenewsnetwork.com/news/',
              'https://www.crunchyroll.com/news/',
            ),
          ),
    );
    const res = response();
    await createHandler({ fetchImpl, limit: () => true })(
      { ...request, query: { url: 'http://localhost/admin' } },
      res,
    );
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual(NEWS_FEEDS.map((x) => x.url));
    expect(res.code).toBe(200);
    expect(res.body[0].source).toBe('Crunchyroll News');
  });
  it('returns recently cached data on publisher failure, then refuses expired news', async () => {
    let now = 0,
      fail = false;
    const handler = createHandler({
      clock: () => now,
      limit: () => true,
      fetchImpl: async () => new Response(fail ? 'Denied' : feed, { status: fail ? 403 : 200 }),
    });
    await handler(request, response());
    fail = true;
    now = 900001;
    const stale = response();
    await handler(request, stale);
    expect(stale.code).toBe(200);
    expect(stale.headers['X-News-Stale']).toBe('1');
    expect(stale.headers['Cache-Control']).toBe('no-store');
    now = 2700001;
    const expired = response();
    await handler(request, expired);
    expect(expired.code).toBe(502);
    expect(expired.body).toHaveProperty('error');
  });
  it('rejects unsupported methods and throttled clients without an upstream fetch', async () => {
    const fetchImpl = vi.fn();
    const handler = createHandler({ fetchImpl, limit: () => false });
    const denied = response();
    await handler(request, denied);
    expect(denied.code).toBe(429);
    expect(denied.headers['Retry-After']).toBe('60');
    const method = response();
    await handler({ ...request, method: 'POST' }, method);
    expect(method.code).toBe(405);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

it('follows a publisher RSS redirect and blocks cross-host, insecure, or looping redirects', async () => {
  const same = vi.fn(async (target) =>
    target === NEWS_FEEDS[0].url
      ? new Response('', { status: 302, headers: { location: '/news/rss.xml?edition=us' } })
      : new Response(feed),
  );
  const ok = response();
  await createHandler({ fetchImpl: same, feeds: [NEWS_FEEDS[0]], limit: () => true })(request, ok);
  expect(ok.code).toBe(200);
  expect(same.mock.calls[1][0]).toBe('https://www.animenewsnetwork.com/news/rss.xml?edition=us');
  expect(same.mock.calls[0][1].signal).toBe(same.mock.calls[1][1].signal);
  for (const location of [
    'http://www.animenewsnetwork.com/news/rss.xml',
    'https://evil.example/feed',
    'https://www.animenewsnetwork.com:8443/feed',
    'http://127.0.0.1/admin',
  ]) {
    const fetchImpl = vi.fn(async () => new Response('', { status: 302, headers: { location } }));
    const denied = response();
    await createHandler({ fetchImpl, feeds: [NEWS_FEEDS[0]], limit: () => true })(request, denied);
    expect(denied.code).toBe(502);
    expect(denied.headers['X-News-Upstream-Status']).toBe('feed1:REDIRECT');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  }
  const loop = vi.fn(
    async () => new Response('', { status: 302, headers: { location: '/news/rss.xml' } }),
  );
  const res = response();
  await createHandler({ fetchImpl: loop, feeds: [NEWS_FEEDS[0]], limit: () => true })(request, res);
  expect(res.code).toBe(502);
  expect(loop).toHaveBeenCalledTimes(3);
});
