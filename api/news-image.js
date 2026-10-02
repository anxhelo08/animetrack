import { createLocalLimiter } from '../server/http.js';
import { NEWS_PLACEHOLDER } from '../server/news-feed.js';
import { createNewsPhotoResolver, newsArticleURL } from '../server/news-photo.js';

export function createHandler({
  resolve = createNewsPhotoResolver(),
  limit = createLocalLimiter({ limit: 160 }),
} = {}) {
  return async (req, res) => {
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
    const query = new URL(req.url || '', 'https://animetrack.invalid').searchParams;
    const article = newsArticleURL(req.query?.article ?? query.get('article'));
    if (!article) return res.status(400).json({ error: 'Invalid news article' });
    const photo = await resolve(article);
    res.setHeader('Cache-Control', `public, max-age=${photo.ttl}, s-maxage=${photo.ttl}`);
    res.setHeader('X-News-Image-Status', photo.status);
    res.setHeader('Location', photo.image || NEWS_PLACEHOLDER);
    return res.status(302).end();
  };
}

export default createHandler();
