const words = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase()
    .match(/[\p{L}\p{N}]+/gu) || [];
/** Personal-library search also recognizes aliases, accents and season titles. */
export function matchesLibraryQuery(item, query) {
  const terms = words(query);
  if (!terms.length) return true;
  const haystack = words(
    [
      item.title,
      item.genre,
      item.genres,
      ...(item.aliases || []),
      ...(item.seasons || []).map((s) => s.title),
    ].join(' '),
  ).join(' ');
  return terms.every((term) => haystack.includes(term));
}
export function weebCentralLink(item) {
  const id = item.weebCentralId || (item.source === 'weebcentral' ? item.sourceId : '');
  if (/^[0-9A-HJKMNP-TV-Z]{26}$/.test(id || ''))
    return { url: 'https://weebcentral.com/series/' + id, exact: true };
  return {
    url: 'https://weebcentral.com/search?text=' + encodeURIComponent(item.title || ''),
    exact: false,
  };
}
export function titleCatalogLinks(item) {
  const links = [],
    add = (name, id, base) => {
      if (/^[1-9]\d{0,9}$/.test(String(id || ''))) links.push({ name, url: base + id });
    };
  if (item.source === 'TVMaze' || item.format === 'TV_SERIES')
    add('TVmaze', item.tvmazeId || item.sourceId, 'https://www.tvmaze.com/shows/');
  else {
    add(
      'AniList',
      item.anilistId ||
        (item.source === 'AniList' || item.source === 'anilist' ? item.sourceId : ''),
      'https://anilist.co/anime/',
    );
    add('MyAnimeList', item.malId, 'https://myanimelist.net/anime/');
  }
  if (/^tt\d{1,12}$/.test(item.imdbId || ''))
    links.push({ name: 'IMDb', url: 'https://www.imdb.com/title/' + item.imdbId + '/' });
  return links;
}
