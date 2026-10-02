import { createLocalLimiter, userAgent } from '../server/http.js';
import { NEWS_FEEDS, parseNewsFeed, readNewsXML } from '../server/news-feed.js';

const FRESH = 900000,
  STALE = FRESH + 1800000;
const cacheHeader = 'public, s-maxage=900, stale-while-revalidate=1800';
export function createHandler({
  fetchImpl = fetch,
  clock = Date.now,
  feeds = NEWS_FEEDS,
  limit = createLocalLimiter(),
} = {}) {
  let cache = null,
    pending = null;
  async function refresh() {
    for (const feed of feeds) {
      try {
        // Fixed publishers only; visitors cannot turn this endpoint into an arbitrary proxy.
        const response = await fetchImpl(feed.url, {
          headers: {
            Accept: 'application/rss+xml, application/xml, text/xml',
            'User-Agent': userAgent,
          },
          redirect: 'error',
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) continue;
        const items = parseNewsFeed(await readNewsXML(response), feed);
        cache = { items, at: clock() };
        return items;
      } catch {
        /* Try the second publisher without fabricating cached news. */
      }
    }
    throw Error('News publishers unavailable');
  }
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const ip = String(
      req.headers?.['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unknown',
    ).slice(0, 256);
    if (!limit(ip)) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({ error: 'Too many requests' });
    }
    if (cache && clock() - cache.at < FRESH) {
      res.setHeader('Cache-Control', cacheHeader);
      return res.status(200).json(cache.items);
    }
    // Concurrent cold requests share one upstream attempt, rather than multiplying RSS traffic.
    if (!pending)
      pending = refresh().finally(() => {
        pending = null;
      });
    try {
      const items = await pending;
      res.setHeader('Cache-Control', cacheHeader);
      return res.status(200).json(items);
    } catch {
      if (cache && clock() - cache.at < STALE) {
        res.setHeader('X-News-Stale', '1');
        return res.status(200).json(cache.items);
      }
      return res.status(502).json({ error: 'Anime news temporarily unavailable' });
    }
  };
}
export default createHandler();
