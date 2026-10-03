import { catalogJSON } from '../core/request-cache.js';
import { matchesReadingFilters } from '../core/reading-discovery.js';
export const muID = (value) =>
  /^\d{1,14}$/.test(String(value || '')) && Number.isSafeInteger(Number(value));
export function mangaUpdatesID(value) {
  const slug = String(value || '').match(
    /^(?:https:\/\/(?:www\.)?mangaupdates\.com\/series\/)?([a-z0-9]{5,10})(?:\/.*)?$/i,
  )?.[1];
  const id = slug ? parseInt(slug, 36) : 0;
  return Number.isSafeInteger(id) && id > 0 ? String(id) : '';
}
export function mangaUpdatesItem(record) {
  const original =
    Number(String(record.status || '').match(/^\s*(\d+)\s*\+?\s*chapters?\b/i)?.[1]) || 0;
  const total = Math.max(original, Number(record.latest_chapter) || 0);
  return {
    id: 'reading-mu-' + record.series_id,
    source: 'mangaupdates',
    sourceId: String(record.series_id),
    mangaUpdatesId: String(record.series_id),
    title: record.title || '',
    aliases: (record.associated || []).map((a) => a.title).filter(Boolean),
    kind: record.type === 'Manhwa' ? 'manhwa' : 'manga',
    cover: record.image?.url?.original || '',
    synopsis: String(record.description || '')
      .replace(/<[^>]*>/g, ' ')
      .slice(0, 1800),
    genres: (record.genres || []).map((g) => g.genre).join(', '),
    year: Number(record.year) || null,
    communityScore: Number(record.bayesian_rating) || null,
    totalChapters: Number.isFinite(total) && total > 0 && total <= 10000 ? Math.floor(total) : 0,
    totalVolumes: 0,
    publicationStatus: record.completed
      ? 'FINISHED'
      : /hiatus/i.test(record.status || '')
        ? 'HIATUS'
        : record.status
          ? 'RELEASING'
          : '',
    chapterSource: 'MangaUpdates',
  };
}
export async function mangaUpdatesDetails(id, signal) {
  if (!muID(id)) throw Error('Invalid MangaUpdates ID');
  const result = await catalogJSON('https://api.mangaupdates.com/v1/series/' + id, {
    signal,
    timeoutMs: 3500,
  });
  if (
    String(result.series_id) !== String(id) ||
    !['Manga', 'Manhwa', 'Manhua', 'OEL', 'Doujinshi', 'Artbook'].includes(result.type)
  )
    throw Error('Invalid comic metadata');
  return mangaUpdatesItem(result);
}
export async function searchMangaUpdates(query, kind, page = 1, signal, filters = {}) {
  const result = await catalogJSON('https://api.mangaupdates.com/v1/series/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ search: query, page, perpage: 30 }),
    signal,
    timeoutMs: 2500,
  });
  if (!Array.isArray(result.results)) throw Error('MangaUpdates unavailable');
  const items = result.results
    .map((r) => r.record)
    .filter((r) => ['Manga', 'Manhwa', 'Manhua', 'OEL', 'Doujinshi'].includes(r.type))
    .map(mangaUpdatesItem)
    .filter((r) => kind === 'all' || r.kind === kind);
  // Only the first visible results need detail calls; all work shares the search deadline.
  await Promise.all(
    items.slice(0, 8).map(async (row) => {
      try {
        const details = await mangaUpdatesDetails(row.mangaUpdatesId, signal);
        Object.assign(row, details);
      } catch {}
    }),
  );
  return {
    provider: 'MangaUpdates',
    items: items.filter((r) => matchesReadingFilters(r, filters)),
    hasNext: page * 30 < result.total_hits,
  };
}
