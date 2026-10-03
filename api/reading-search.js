import { catalogJSON } from '../src/core/request-cache.js';
import {
  searchMangaUpdates,
  mangaUpdatesDetails,
  muID,
  mangaUpdatesID,
} from '../src/modules/mangaupdates-catalog.js';
import { allowProxy } from '../server/http.js';
import { createRequestCache } from '../src/core/request-cache.js';
import {
  searchAniList,
  combineCatalogs,
  publishedReadingChapters,
} from '../src/modules/reading-catalog.js';
import { searchMangaDex } from '../src/modules/mangadex-catalog.js';
const cache = createRequestCache();
const uuid = (v) => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v || '');
async function chapterDetails(md, mu, signal) {
  const jobs = [];
  if (md) {
    jobs.push(publishedReadingChapters({ mangaDexId: md }, signal));
    if (!mu)
      jobs.push(
        (async () => {
          const meta = await catalogJSON('https://api.mangadex.org/manga/' + md, {
            signal,
            timeoutMs: 2500,
          });
          if (meta.data?.id !== md) throw Error('Identity mismatch');
          const id = mangaUpdatesID(meta.data.attributes?.links?.mu);
          return id ? mangaUpdatesDetails(id, signal) : {};
        })(),
      );
  }
  if (mu) jobs.push(mangaUpdatesDetails(mu, signal));
  const done = await Promise.allSettled(jobs),
    good = done.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (!good.length) throw Error('Chapter metadata unavailable');
  const best = good.reduce((a, b) => ((b.totalChapters || 0) > (a.totalChapters || 0) ? b : a), {});
  return {
    totalChapters: best.totalChapters || 0,
    publicationStatus: best.publicationStatus || '',
    chapterSource: best.chapterSource || '',
    mangaUpdatesId: good.find((r) => r.mangaUpdatesId)?.mangaUpdatesId || '',
    mangaDexId: md || '',
    chapterReleases: good.find((r) => r.chapterReleases)?.chapterReleases || [],
    volumeRanges: good.find((r) => r.volumeRanges)?.volumeRanges || [],
  };
}

export function createHandler({
  limit = allowProxy,
  providers = [searchAniList, searchMangaDex, searchMangaUpdates],
  details = chapterDetails,
  read = cache,
} = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const p = new URL(req.url, 'https://animetrack-flax.vercel.app').searchParams;
    const action = p.get('action') || 'search',
      md = p.get('mangaDexId') || '',
      mu = p.get('mangaUpdatesId') || '';
    if (
      !['search', 'details'].includes(action) ||
      (action === 'details' && ((!md && !mu) || (md && !uuid(md)) || (mu && !muID(mu))))
    )
      return res.status(400).json({ error: 'Invalid chapter identity' });
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
        JSON.stringify([action, q, kind, page, filters, md, mu]),
        async () => {
          const signal = AbortSignal.timeout(4500);
          if (action === 'details') return details(md, mu, signal);
          const done = await Promise.allSettled(
            providers.map((load) => load(q, kind, page, signal, filters)),
          );
          const good = done.filter((r) => r.status === 'fulfilled').map((r) => r.value);
          if (!good.length) throw Error('Catalog unavailable');
          const merged = combineCatalogs(good);
          await Promise.all(
            merged.items.slice(0, 8).map(async (row) => {
              if (row.totalChapters || (!row.mangaDexId && !row.mangaUpdatesId) || signal.aborted)
                return;
              try {
                const fresh = await details(row.mangaDexId || '', row.mangaUpdatesId || '', signal);
                Object.assign(row, fresh);
              } catch {}
            }),
          );
          return { ...merged, partial: good.length < providers.length };
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
