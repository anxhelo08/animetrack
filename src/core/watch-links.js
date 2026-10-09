/** Use supplied episode URLs only; provider routes are never guessed from a title. */
export function watchProvider(anime) {
  const live =
    ['TVMaze', 'TMDB', 'OMDb', 'Cinemeta', 'Wikidata'].includes(anime?.source) ||
    anime?.format === 'TV_SERIES';
  return live
    ? { name: 'CineHD', url: 'https://cinehd.vc/home', icon: '/icons/cinehd.svg' }
    : { name: 'Anisuge', url: 'https://anisuge.org/', icon: '/icons/anisuge.svg' };
}

export function watchProviders(anime) {
  const primary = watchProvider(anime);
  return [
    primary,
    primary.name === 'Anisuge'
      ? { name: 'Way2Movies', url: 'https://beta.way2movies.live/', icon: '/icons/way2movies.svg' }
      : { name: 'Atlantic', url: 'https://atlantic.st/', icon: '/icons/atlantic.svg' },
  ];
}

export function watchSearchURL(provider, anime, season, number) {
  const title = String(anime?.title || '')
    .trim()
    .slice(0, 180);
  if (!title) return provider.url;
  const episode =
    season?.format !== 'MOVIE' && Number.isInteger(number) && number > 0
      ? ' ' + String(season?.subtitle || season?.title || '').slice(0, 180) + ' episode ' + number
      : '';
  return (
    'https://www.google.com/search?' +
    new URLSearchParams({ q: 'site:' + new URL(provider.url).hostname + ' ' + title + episode })
  );
}

export function episodeWatchURL(value, provider = null) {
  try {
    if (typeof value !== 'string' || value.length > 2000) return '';
    const url = new URL(value.trim());
    const host = url.hostname.replace(/^www\./, '');
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return '';
    if (!['cinehd.vc', 'anisuge.org', 'atlantic.st', 'beta.way2movies.live'].includes(host))
      return '';
    if (provider && host !== new URL(provider.url).hostname) return '';
    return url.href;
  } catch {
    return '';
  }
}

export function animeSeasonLink(value) {
  const safe = episodeWatchURL(value);
  if (!safe) return '';
  const url = new URL(safe),
    host = url.hostname.replace(/^www\./, '');
  return (host === 'anisuge.org' && /^\/watch\/[^/]+\/ep-[1-9]\d*\/?$/.test(url.pathname)) ||
    (host === 'beta.way2movies.live' &&
      /^\/watch\/tv\/[a-zA-Z0-9_-]{1,200}\/[1-9]\d{0,3}\/[1-9]\d{0,4}\/?$/.test(url.pathname))
    ? safe
    : '';
}

export function watchEpisodeTarget(anime, season, number, episode) {
  const provider = watchProvider(anime);
  const direct = watchProviders(anime)
    .map((source) => episodeWatchURL(episode?.watchUrl, source))
    .find(Boolean);
  if (direct) return direct;
  if (provider.name === 'CineHD' && season?.format !== 'MOVIE')
    return cinehdSeriesLink(season?.watchUrl) || cinehdSeriesLink(anime?.watchUrl);
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
  const offset = Number.isSafeInteger(season?.watchEpisodeOffset) ? season.watchEpisodeOffset : 0;
  const remoteNumber = number + offset;
  if (!Number.isSafeInteger(remoteNumber) || remoteNumber < 1 || remoteNumber > 100000) return '';
  url.pathname = url.pathname.replace(/\d+\/?$/, String(remoteNumber));
  return url.href;
}

export function cinehdSeriesLink(value) {
  const safe = episodeWatchURL(value, watchProvider({ format: 'TV_SERIES' }));
  return safe && /^\/tv\/[1-9]\d*\/?$/.test(new URL(safe).pathname) ? safe : '';
}

/** A pasted link belongs to the currently open episode; retain its numbering for later episodes. */
export function watchLinkPlan(anime, season, number, value) {
  const raw = String(value || '').trim(),
    provider =
      watchProviders(anime).find((source) => episodeWatchURL(raw, source)) || watchProvider(anime),
    url = episodeWatchURL(raw, provider);
  if (raw && !url) return { error: 'Vendos një lidhje HTTPS nga ' + provider.name + '.' };
  if (!url) return { scope: 'clear', url: '' };
  if (
    season?.format !== 'MOVIE' &&
    ['Anisuge', 'Way2Movies'].includes(provider.name) &&
    animeSeasonLink(url)
  ) {
    const remote = Number(new URL(url).pathname.match(/(\d+)\/?$/)[1]);
    if (
      !Number.isSafeInteger(number) ||
      number < 1 ||
      !Number.isSafeInteger(remote) ||
      remote > 100000
    )
      return { error: 'Kontrollo numrin e episodit në lidhje.' };
    return { scope: 'season', url, offset: remote - number };
  }
  if (season?.format !== 'MOVIE' && provider.name === 'CineHD' && cinehdSeriesLink(url))
    return { scope: 'series', url };
  return { scope: 'episode', url };
}
