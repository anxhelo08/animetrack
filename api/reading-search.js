import { allowProxy } from '../server/http.js';
import { createRequestCache } from '../src/core/request-cache.js';
import { searchAniList, combineCatalogs } from '../src/modules/reading-catalog.js';
import { searchMangaDex } from '../src/modules/mangadex-catalog.js';
const cache = createRequestCache();
export function createHandler({
  limit = allowProxy,
  providers = [searchAniList, searchMangaDex],
  read = cache,
} = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const p = new URL(req.url, 'https://animetrack-flax.vercel.app').searchParams;
    const q = p.get('q') || '',
      kind = p.get('kind') || 'all',
      page = Number(p.get('page') || 1);
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
    if (
      q.length > 100 ||
      !['all', 'manga', 'manhwa'].includes(kind) ||
      !Number.isInteger(page) ||
      page < 1 ||
      page > 1000
    )
      return res.status(400).json({ error: 'Invalid search' });
    if (!(await limit(req, res, 'reading-search'))) return;
    try {
      const result = await read(
        JSON.stringify([q, kind, page, filters]),
        async () => {
          const signal = AbortSignal.timeout(4500);
          const done = await Promise.allSettled(
            providers.map((load) => load(q, kind, page, signal, filters)),
          );
          const good = done.filter((r) => r.status === 'fulfilled').map((r) => r.value);
          if (!good.length) throw Error('Catalog unavailable');
          return { ...combineCatalogs(good), partial: good.length < providers.length };
        },
        { ttl: 5 * 60000 },
      );
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=300');
      return res.status(200).json(result);
    } catch {
      return res.status(502).json({ error: 'Catalog temporarily unavailable' });
    }
  };
}
export default createHandler();
