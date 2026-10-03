import { catalogJSON } from '../core/request-cache.js';

const QUERY = `query ReadingCatalog($search:String,$page:Int!,$country:CountryCode,$sort:[MediaSort]){Page(page:$page,perPage:18){pageInfo{hasNextPage}media(type:MANGA,isAdult:false,search:$search,countryOfOrigin:$country,sort:$sort){id type countryOfOrigin title{english romaji native}coverImage{extraLarge large}description(asHtml:false)chapters volumes status startDate{year}genres averageScore}}}`;
async function searchAniList(query, kind, page = 1, signal) {
  const result = await catalogJSON('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    signal,
    body: JSON.stringify({
      query: QUERY,
      variables: {
        search: query.trim() || undefined,
        page,
        country: kind === 'manhwa' ? 'KR' : kind === 'manga' ? 'JP' : undefined,
        sort: query.trim() ? ['SEARCH_MATCH'] : ['TRENDING_DESC'],
      },
    }),
  });
  if (!result.data?.Page) throw Error('Katalogu nuk u përgjigj.');
  return {
    hasNext: result.data.Page.pageInfo?.hasNextPage === true,
    items: (result.data.Page.media || [])
      .filter((item) => item.type === 'MANGA')
      .map((item) => ({
        id: 'reading-al-' + item.id,
        sourceId: String(item.id),
        source: 'anilist',
        title: item.title.english || item.title.romaji || item.title.native,
        kind: item.countryOfOrigin === 'KR' ? 'manhwa' : 'manga',
        cover: item.coverImage?.extraLarge || item.coverImage?.large || '',
        synopsis: String(item.description || '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
        totalChapters: item.chapters || 0,
        totalVolumes: item.volumes || 0,
        publicationStatus: item.status,
        genres: (item.genres || []).join(', '),
        year: item.startDate?.year || null,
        communityScore: item.averageScore == null ? null : item.averageScore / 10,
      })),
  };
}

function jikanItem(item) {
  return {
    id: 'reading-mal-' + item.mal_id,
    sourceId: String(item.mal_id),
    source: 'jikan',
    title: item.title_english || item.title,
    kind: item.type === 'Manhwa' ? 'manhwa' : 'manga',
    cover: item.images?.jpg?.large_image_url || '',
    synopsis: item.synopsis || '',
    totalChapters: item.chapters || 0,
    totalVolumes: item.volumes || 0,
    publicationStatus: item.publishing ? 'RELEASING' : item.status === 'Finished' ? 'FINISHED' : '',
    genres: (item.genres || []).map((g) => g.name).join(', '),
    year: Number(String(item.published?.from || '').slice(0, 4)) || null,
    communityScore: item.score ?? null,
  };
}
export async function searchReadingCatalog(query, kind, page = 1, signal) {
  let primaryError;
  try {
    const result = await searchAniList(query, kind, page, signal);
    if (result.items.length || !query.trim()) return result;
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    primaryError = error;
  }
  try {
    const params = new URLSearchParams({
      q: query.trim(),
      page: String(page),
      limit: '18',
      sfw: 'true',
    });
    if (kind !== 'all') params.set('type', kind);
    const result = await catalogJSON('https://api.jikan.moe/v4/manga?' + params, { signal });
    if (!Array.isArray(result.data)) throw Error('Katalogu nuk u përgjigj.');
    return {
      items: result.data
        .filter((item) =>
          ['Manga', 'Manhwa', 'Manhua', 'One-shot', 'Doujinshi'].includes(item.type),
        )
        .map(jikanItem),
      hasNext: result.pagination?.has_next_page === true,
    };
  } catch (error) {
    throw error.name === 'AbortError' ? error : primaryError || error;
  }
}
async function refreshPrimaryCatalog(row, signal) {
  if (!/^\d+$/.test(row.sourceId)) throw Error('Titull pa burim.');
  if (row.source === 'jikan') {
    const result = await catalogJSON('https://api.jikan.moe/v4/manga/' + row.sourceId, { signal });
    if (!result.data) throw Error('Katalogu nuk u përgjigj.');
    const item = jikanItem(result.data);
    return {
      totalChapters: item.totalChapters,
      totalVolumes: item.totalVolumes,
      publicationStatus: item.publicationStatus,
    };
  }
  const result = await catalogJSON('https://graphql.anilist.co', {
    signal,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'query ReadingUpdates($id:Int!){Media(id:$id,type:MANGA){chapters volumes status}}',
      variables: { id: Number(row.sourceId) },
    }),
  });
  const item = result.data?.Media;
  if (!item) throw Error('Katalogu nuk u përgjigj.');
  return {
    totalChapters: item.chapters || 0,
    totalVolumes: item.volumes || 0,
    publicationStatus: item.status || '',
  };
}

const identity = (value) =>
  String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
const uuid = (value) =>
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value || '');
export async function publishedReadingChapters(row, signal) {
  let id = row.mangaDexId;
  if (!uuid(id)) {
    const params = new URLSearchParams({
      title: row.title,
      limit: '10',
      'contentRating[]': 'safe',
    });
    params.append('contentRating[]', 'suggestive');
    const response = await catalogJSON('https://api.mangadex.org/manga?' + params, { signal });
    const matches = (response.data || []).filter(
      (item) =>
        item.attributes?.originalLanguage === (row.kind === 'manhwa' ? 'ko' : 'ja') &&
        [
          ...Object.values(item.attributes?.title || {}),
          ...(item.attributes?.altTitles || []).flatMap(Object.values),
        ].some((title) => identity(title) === identity(row.title)),
    );
    if (matches.length !== 1 || !uuid(matches[0].id)) return {};
    id = matches[0].id;
  }
  const [aggregate, feed] = await Promise.all([
    catalogJSON(`https://api.mangadex.org/manga/${id}/aggregate`, { signal }),
    catalogJSON(
      `https://api.mangadex.org/manga/${id}/feed?limit=100&order[publishAt]=desc&contentRating[]=safe&contentRating[]=suggestive`,
      { signal },
    ),
  ]);
  if (aggregate.result !== 'ok' || !aggregate.volumes) throw Error('Kapitujt nuk u verifikuan.');
  const groups = Object.values(aggregate.volumes).map((group) => ({
    volume: Number(group.volume),
    chapters: Object.values(group.chapters || {})
      .map((chapter) => Number(chapter.chapter))
      .filter((n) => Number.isInteger(n) && n > 0 && n <= 10000),
  }));
  const total = Math.max(0, ...groups.flatMap((group) => group.chapters));
  const ranges = groups
    .filter(
      (group) =>
        Number.isInteger(group.volume) &&
        group.volume > 0 &&
        group.volume <= 1000 &&
        group.chapters.length,
    )
    .map((group) => ({
      volume: group.volume,
      start: Math.min(...group.chapters),
      end: Math.max(...group.chapters),
    }))
    .sort((a, b) => a.start - b.start);
  const safeRanges =
    ranges.every((group, index) => !index || group.start > ranges[index - 1].end) &&
    new Set(ranges.map((group) => group.volume)).size === ranges.length;
  const releases = (feed.data || [])
    .map((entry) => ({
      chapter: Number(entry.attributes?.chapter),
      date: entry.attributes?.publishAt,
      detected: false,
    }))
    .filter(
      (entry) =>
        Number.isInteger(entry.chapter) &&
        entry.chapter > 0 &&
        entry.chapter <= total &&
        Number.isFinite(Date.parse(entry.date)) &&
        Date.parse(entry.date) <= Date.now(),
    );
  return {
    totalChapters: total,
    mangaDexId: id,
    chapterSource: 'MangaDex',
    chapterReleases: releases,
    volumeRanges: safeRanges ? ranges : [],
  };
}
export async function refreshReadingCatalog(row, signal) {
  let primary = {},
    primaryError;
  try {
    primary = await refreshPrimaryCatalog(row, signal);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    primaryError = error;
  }
  if (
    row.mangaDexId ||
    primary.publicationStatus === 'RELEASING' ||
    row.publicationStatus === 'RELEASING' ||
    !primary.totalChapters
  ) {
    try {
      const chapters = await publishedReadingChapters(row, signal);
      if (chapters.totalChapters)
        return {
          ...primary,
          ...chapters,
          totalChapters: Math.max(primary.totalChapters || 0, chapters.totalChapters),
        };
    } catch (error) {
      if (error.name === 'AbortError') throw error;
    }
  }
  if (primaryError) throw primaryError;
  return primary;
}
