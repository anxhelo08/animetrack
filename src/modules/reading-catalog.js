import { catalogJSON } from '../core/request-cache.js';

const QUERY = `query ReadingCatalog($search:String,$page:Int!,$country:CountryCode,$sort:[MediaSort]){Page(page:$page,perPage:18){pageInfo{hasNextPage}media(type:MANGA,format_in:[MANGA,ONE_SHOT],isAdult:false,search:$search,countryOfOrigin:$country,sort:$sort){id type countryOfOrigin title{english romaji native}coverImage{extraLarge large}description(asHtml:false)chapters volumes status startDate{year}genres averageScore}}}`;
export async function searchReadingCatalog(query, kind, page = 1, signal) {
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
      .filter((item) => item.type === 'MANGA' && ['JP', 'KR'].includes(item.countryOfOrigin))
      .map((item) => ({
        id: 'reading-al-' + item.id,
        sourceId: String(item.id),
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
