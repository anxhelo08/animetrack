import { createLocalLimiter, userAgent } from '../server/http.js';
import { NEWS_FEEDS, parseNewsFeed, readNewsXML, fetchNewsFeed } from '../server/news-feed.js';

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
    const failures = [];
    for (const [index, feed] of feeds.entries()) {
      try {
        // Fixed publishers only; visitors cannot turn this endpoint into an arbitrary proxy.
        const response = await fetchNewsFeed(feed, fetchImpl, {
          Accept: 'application/rss+xml, application/xml, text/xml',
          'User-Agent': userAgent,
        });
        if (!response.ok) {
          failures.push(`feed${index + 1}:HTTP${response.status}`);
          await response.body?.cancel().catch(() => {});
          continue;
        }
        const items = parseNewsFeed(await readNewsXML(response), feed);
        cache = { items, at: clock() };
        return items;
      } catch (error) {
        const kind = ['TimeoutError', 'AbortError'].includes(error.name)
          ? 'TIMEOUT'
          : error.message === 'Unsafe feed redirect'
            ? 'REDIRECT'
            : /XML|RSS|articles|Feed too large|Empty feed/.test(error.message)
              ? 'INVALID_RSS'
              : 'NETWORK';
        failures.push(`feed${index + 1}:${kind}`);
      }
    }
    const error = new Error('News publishers unavailable');
    error.feedStatus = failures.join(',');
    throw error;
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
    } catch (error) {
      // Public status codes aid operations without exposing publisher response bodies or credentials.
      res.setHeader('X-News-Upstream-Status', error.feedStatus || 'unavailable');
      if (cache && clock() - cache.at < STALE) {
        res.setHeader('X-News-Stale', '1');
        return res.status(200).json(cache.items);
      }
      return res.status(502).json({ error: 'Anime news temporarily unavailable' });
    }
  };
}
export default createHandler();
