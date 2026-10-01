/** Use supplied episode URLs only; provider routes are never guessed from a title. */
export function watchProvider(anime) {
  const live =
    ['TVMaze', 'TMDB', 'OMDb', 'Cinemeta', 'Wikidata'].includes(anime?.source) ||
    anime?.format === 'TV_SERIES';
  return live
    ? { name: 'CineHD', url: 'https://cinehd.vc/home', icon: '/icons/cinehd.svg' }
    : { name: 'Anisuge', url: 'https://anisuge.org/', icon: '/icons/anisuge.svg' };
}

export function episodeWatchURL(value, provider = null) {
  try {
    if (typeof value !== 'string' || value.length > 2000) return '';
    const url = new URL(value.trim());
    const host = url.hostname.replace(/^www\./, '');
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return '';
    if (!['cinehd.vc', 'anisuge.org'].includes(host)) return '';
    if (provider && host !== new URL(provider.url).hostname) return '';
    return url.href;
  } catch {
    return '';
  }
}

export function animeSeasonLink(value) {
  const safe = episodeWatchURL(value, watchProvider({ source: 'AniList' }));
  return safe && /^\/watch\/[^/]+\/ep-[1-9]\d*\/?$/.test(new URL(safe).pathname) ? safe : '';
}

export function watchEpisodeTarget(anime, season, number, episode) {
  const provider = watchProvider(anime);
  const direct = episodeWatchURL(episode?.watchUrl, provider);
  if (direct) return direct;
  if (provider.name === 'CineHD' && season?.format !== 'MOVIE')
    return cinehdSeriesLink(season?.watchUrl);
  if (
    provider.name !== 'Anisuge' ||
    season?.format === 'MOVIE' ||
    !Number.isInteger(number) ||
    number < 1
  )
    return '';
  const base = animeSeasonLink(season?.watchUrl);
  if (!base) return '';
  const url = new URL(base);
  url.pathname = url.pathname.replace(/\/ep-\d+\/?$/, '/ep-' + number);
  return url.href;
}

export function cinehdSeriesLink(value) {
  const safe = episodeWatchURL(value, watchProvider({ format: 'TV_SERIES' }));
  return safe && /^\/tv\/[1-9]\d*\/?$/.test(new URL(safe).pathname) ? safe : '';
}
