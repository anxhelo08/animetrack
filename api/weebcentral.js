import { allowProxy } from '../server/http.js';
import { createWeebCentral, seriesID } from '../server/weebcentral.js';

export function createHandler({ provider = createWeebCentral(), limit = allowProxy } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const p = new URL(req.url, 'https://animetrack-flax.vercel.app').searchParams;
    const action = p.get('action') || 'search';
    const query = p.get('q') || '',
      kind = p.get('kind') || 'all',
      page = Number(p.get('page') || 1),
      id = p.get('id');
    if (
      !['search', 'details', 'resolve', 'latest'].includes(action) ||
      query.length > 100 ||
      !['all', 'manga', 'manhwa'].includes(kind) ||
      !Number.isInteger(page) ||
      page < 1 ||
      page > 1000 ||
      (['details'].includes(action) && !seriesID(id))
    )
      return res.status(400).json({ error: 'Invalid catalog request' });
    let filters;
    try {
      filters = JSON.parse(p.get('filters') || '{}');
      if (
        !filters ||
        typeof filters !== 'object' ||
        Array.isArray(filters) ||
        p.get('filters')?.length > 2000
      )
        throw Error();
    } catch {
      return res.status(400).json({ error: 'Invalid filters' });
    }
    const anilistId = p.get('anilistId') || '',
      malId = p.get('malId') || '';
    if ([anilistId, malId].some((v) => v && !/^\d{1,20}$/.test(v)))
      return res.status(400).json({ error: 'Invalid tracker identity' });
    if (!(await limit(req, res, 'weebcentral'))) return;
    try {
      const result =
        action === 'details'
          ? await provider.details(id)
          : action === 'resolve'
            ? await provider.resolve({ title: query, kind, anilistId, malId })
            : await provider.search(
                query,
                kind,
                page,
                filters,
                action === 'latest' ? 'Latest Updates' : '',
              );
      res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=300');
      return res.status(200).json(result);
    } catch {
      return res.status(502).json({ error: 'WeebCentral temporarily unavailable' });
    }
  };
}
export default createHandler();
