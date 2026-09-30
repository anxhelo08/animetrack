import { allowProxy, upstreamJSON, userAgent } from '../server/http.js';

export function createHandler({ fetchImpl = fetch, limit = allowProxy } = {}) {
  return async function handler(req, res) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const mode = req.query?.mode;
    let target, ttl;
    if (mode === 'search') {
      const q = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
      if (q.length < 2 || q.length > 120)
        return res.status(400).json({ error: 'Invalid search query' });
      target =
        'https://v3-cinemeta.strem.io/catalog/movie/top/search=' + encodeURIComponent(q) + '.json';
      ttl = 900;
    } else if (mode === 'meta') {
      const id = req.query?.id;
      if (typeof id !== 'string' || !/^tt\d{1,12}$/.test(id))
        return res.status(400).json({ error: 'Invalid IMDb ID' });
      target = 'https://v3-cinemeta.strem.io/meta/movie/' + id + '.json';
      ttl = 86400;
    } else return res.status(400).json({ error: 'Invalid mode' });
    if (!(await limit(req, res, 'cinemeta', { fetchImpl }))) return;
    try {
      const { status, data } = await upstreamJSON(
        target,
        { headers: { Accept: 'application/json', 'User-Agent': userAgent } },
        fetchImpl,
      );
      if (status === 200)
        res.setHeader('Cache-Control', `public, s-maxage=${ttl}, stale-while-revalidate=86400`);
      return res.status(status).json(data);
    } catch {
      return res.status(502).json({ error: 'Movie metadata temporarily unavailable' });
    }
  };
}
export default createHandler();
