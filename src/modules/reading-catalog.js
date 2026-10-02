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
export async function refreshReadingCatalog(row) {
  if (!/^\d+$/.test(row.sourceId)) throw Error('Titull pa burim.');
  if (row.source === 'jikan') {
    const result = await catalogJSON('https://api.jikan.moe/v4/manga/' + row.sourceId);
    if (!result.data) throw Error('Katalogu nuk u përgjigj.');
    const item = jikanItem(result.data);
    return {
      totalChapters: item.totalChapters,
      totalVolumes: item.totalVolumes,
      publicationStatus: item.publicationStatus,
    };
  }
  const result = await catalogJSON('https://graphql.anilist.co', {
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
