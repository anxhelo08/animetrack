import { mangaUpdatesID } from './mangaupdates-catalog.js';
import { catalogJSON } from '../core/request-cache.js';
import { matchesReadingFilters } from '../core/reading-discovery.js';

export function mangaDexItem(item) {
  const a = item.attributes || {},
    links = a.links || {};
  const al = /^\d+$/.test(links.al || '') ? links.al : '';
  const mal = /^\d+$/.test(links.mal || '') ? links.mal : '';
  const source = al ? 'anilist' : mal ? 'jikan' : 'mangadex';
  const sourceId = al || mal || item.id;
  const file = item.relationships?.find((r) => r.type === 'cover_art')?.attributes?.fileName;
  return {
    id: `reading-${al ? 'al' : mal ? 'mal' : 'md'}-${sourceId}`,
    source,
    sourceId,
    anilistId: al,
    malId: mal,
    mangaDexId: item.id,
    mangaUpdatesId: mangaUpdatesID(links.mu),
    title: a.title?.en || Object.values(a.title || {})[0] || '',
    aliases: (a.altTitles || []).flatMap(Object.values).slice(0, 30),
    kind: a.originalLanguage === 'ko' ? 'manhwa' : 'manga',
    cover: /^[\w-]+\.(jpg|png|webp)$/.test(file || '')
      ? `https://uploads.mangadex.org/covers/${item.id}/${file}.256.jpg`
      : '',
    synopsis: String(a.description?.en || '')
      .replace(/<[^>]*>/g, ' ')
      .slice(0, 1800),
    genres: (a.tags || [])
      .map((t) => t.attributes?.name?.en)
      .filter(Boolean)
      .join(', '),
    year: a.year || null,
    publicationStatus:
      { ongoing: 'RELEASING', completed: 'FINISHED', hiatus: 'HIATUS', cancelled: 'CANCELLED' }[
        a.status
      ] || '',
    totalChapters: 0,
    totalVolumes: 0,
    chapterSource: 'MangaDex',
  };
}
export async function searchMangaDex(query, kind, page = 1, signal, filters = {}) {
  const p = new URLSearchParams({
    title: query,
    limit: '30',
    offset: String((page - 1) * 30),
    'includes[]': 'cover_art',
    'contentRating[]': 'safe',
    'order[relevance]': 'desc',
  });
  p.append('contentRating[]', 'suggestive');
  if (kind === 'manhwa') p.set('originalLanguage[]', 'ko');
  if (!query) {
    p.delete('title');
    p.delete('order[relevance]');
    p.set('order[followedCount]', 'desc');
  }
  if (page > 333) return { items: [], hasNext: false, provider: 'MangaDex' };
  const result = await catalogJSON('https://api.mangadex.org/manga?' + p, {
    signal,
    timeoutMs: 4500,
  });
  if (!Array.isArray(result.data)) throw Error('MangaDex unavailable');
  return {
    provider: 'MangaDex',
    hasNext: result.offset + result.limit < result.total,
    items: result.data
      .filter((r) => ['ja', 'ko', 'zh', 'zh-hk', 'en'].includes(r.attributes?.originalLanguage))
      .map(mangaDexItem)
      .filter((r) => (kind === 'all' || r.kind === kind) && matchesReadingFilters(r, filters)),
  };
}
