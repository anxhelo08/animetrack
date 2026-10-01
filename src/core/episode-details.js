import { catalogJSON } from './request-cache.js';

const httpsImage = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password ? u.href : '';
  } catch {
    return '';
  }
};
const plain = (value) =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2500);
const canonical = (value) =>
  String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');

// Never attach a fuzzy search result or a different sequel to an episode.
export function verifiedAnimeShow(results, season) {
  const names = new Set(
    [season.subtitle, ...(season.aliases || [])].filter(Boolean).map(canonical),
  );
  const year = Number(season.year) || Number(String(season.releaseStart || '').slice(0, 4));
  if (!year || !names.size) return null;
  const matches = (results || [])
    .map((row) => row.show)
    .filter(
      (show) =>
        show?.type === 'Animation' &&
        names.has(canonical(show.name)) &&
        Number(String(show.premiered || '').slice(0, 4)) === year,
    );
  return matches.length === 1 ? matches[0] : null;
}

export function tvEpisodeData(remote) {
  return {
    number: Number(remote.number),
    title: plain(remote.name),
    aired: String(remote.airdate || ''),
    airedAt: String(remote.airstamp || ''),
    summary: plain(remote.summary),
    image: httpsImage(remote.image?.original || remote.image?.medium),
    imageSource: 'TVmaze',
    summarySource: 'TVmaze',
    url: httpsImage(remote.url),
    tvmazeEpisodeId: String(remote.id || ''),
  };
}

export async function verifiedTVEpisodes(anime, season) {
  let showId = season.tvmazeShowId;
  let seasonNumber = season.tvmazeSeasonNumber;
  if (!showId && /^tvmaze$/i.test(season.source || '')) {
    showId = season.sourceId || anime.tvmazeId;
    seasonNumber = Number(season.id?.match(/(?:-s|-)(\d+)$/)?.[1]);
    if (seasonNumber > 200) return null; // Year-based tracks need their stored episode IDs.
  }
  if (!showId) {
    const title = season.subtitle;
    if (
      !title ||
      (anime.seasons || []).filter((s) => !s.hidden && /^(TV|TV_SHORT|ONA)$/.test(s.format))
        .length !== 1
    )
      return null;
    const rows = await catalogJSON(
      'https://api.tvmaze.com/search/shows?q=' + encodeURIComponent(title),
    );
    const show = verifiedAnimeShow(rows, season);
    if (!show) return null;
    showId = String(show.id);
    seasonNumber = 1;
  }
  if (!/^\d+$/.test(String(showId)) || !seasonNumber) return null;
  const rows = await catalogJSON('https://api.tvmaze.com/shows/' + showId + '/episodes');
  if (!Array.isArray(rows)) return null;
  const episodes = rows
    .filter((ep) => ep.season === seasonNumber && Number(ep.number) > 0)
    .map(tvEpisodeData);
  if (!episodes.length) return null;
  return { showId: String(showId), seasonNumber, episodes };
}

export function cinemetaEpisode(meta, imdbId, season, episode) {
  if (meta?.id !== imdbId || meta?.type !== 'series') return null;
  const matches = (meta.videos || []).filter(
    (v) => Number(v.season) === season && Number(v.episode) === episode,
  );
  if (matches.length !== 1) return null;
  const ep = matches[0];
  return {
    title: plain(ep.title || ep.name),
    summary: plain(ep.overview),
    summarySource: 'Cinemeta',
    image: httpsImage(ep.thumbnail),
    imageSource: 'Cinemeta',
    aired: String(ep.released || '').slice(0, 10),
    airedAt: String(ep.released || ''),
  };
}

export async function fetchCinemetaEpisode(imdbId, season, episode) {
  if (!/^tt\d{5,12}$/.test(String(imdbId || '')) || !season) return null;
  const result = await catalogJSON('https://v3-cinemeta.strem.io/meta/series/' + imdbId + '.json');
  return cinemetaEpisode(result.meta, imdbId, season, episode);
}

// A streaming thumbnail belongs to this exact provider media ID and episode number.
export function episodeThumbnail(items, episode) {
  for (const item of Array.isArray(items) ? items : []) {
    const numbers = [...String(item?.title || '').matchAll(/\b(?:episode|ep\.?)[\s:#-]*(\d+)\b/gi)];
    if (numbers.length !== 1 || Number(numbers[0][1]) !== episode) continue;
    try {
      const url = new URL(item.thumbnail);
      if (url.protocol !== 'https:' || url.username || url.password) continue;
      return {
        image: url.href,
        imageSource: 'AniList · ' + String(item.site || 'Streaming').slice(0, 60),
      };
    } catch {
      /* A missing thumbnail must never become a cover-image substitute. */
    }
  }
  return null;
}

export async function fetchEpisodeThumbnail({ sourceId, malId, episode }) {
  const id = /^\d+$/.test(String(sourceId || '')) ? Number(sourceId) : null;
  const idMal = /^\d+$/.test(String(malId || '')) ? Number(malId) : null;
  if (!id && !idMal) return null;
  const result = await catalogJSON('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      query:
        'query($id:Int,$idMal:Int){Media(id:$id,idMal:$idMal,type:ANIME){streamingEpisodes{title thumbnail site}}}',
      variables: id ? { id } : { idMal },
    }),
  });
  if (result.errors?.length) throw Error('Episode thumbnails unavailable');
  return episodeThumbnail(result.data?.Media?.streamingEpisodes, episode);
}

export async function fetchJikanThumbnail(malId, episode) {
  if (!/^\d+$/.test(String(malId || ''))) return null;
  const result = await catalogJSON('https://api.jikan.moe/v4/anime/' + malId + '/videos/episodes');
  const matches = (result.data || []).filter(
    (ep) => Number(String(ep.episode || '').match(/^Episode\s+(\d+)$/i)?.[1]) === episode,
  );
  if (matches.length !== 1) return null;
  const image = httpsImage(matches[0].images?.jpg?.image_url);
  return image ? { image, imageSource: 'Jikan · MyAnimeList' } : null;
}

export async function fetchEpisodeFallbacks(anime, season, episode, absolute, prior = {}) {
  const work = [
    verifiedTVEpisodes(anime, season).then((tv) =>
      tv?.episodes.find((ep) => ep.number === episode),
    ),
  ];
  if (!prior.image && season.malId) work.push(fetchJikanThumbnail(season.malId, absolute));
  if (/^tvmaze$/i.test(season.source || ''))
    work.push(
      (async () => {
        let imdb = season.imdbId || anime.imdbId;
        if (!imdb && /^\d+$/.test(season.sourceId || '')) {
          const show = await catalogJSON('https://api.tvmaze.com/shows/' + season.sourceId);
          imdb = show.externals?.imdb;
        }
        const seasonNo = Number(season.id?.match(/(?:-s|-)(\d+)$/)?.[1]);
        return seasonNo > 0 && seasonNo <= 200
          ? fetchCinemetaEpisode(imdb, seasonNo, episode)
          : null;
      })(),
    );
  const results = await Promise.allSettled(work);
  const out = { ...prior };
  for (const result of results) {
    if (result.status !== 'fulfilled' || !result.value) continue;
    const ep = result.value;
    if (!out.summary && ep.summary) {
      out.summary = ep.summary;
      out.summarySource = ep.summarySource;
    }
    if (!out.image && ep.image) {
      out.image = ep.image;
      out.imageSource = ep.imageSource;
    }
    for (const key of ['title', 'aired', 'airedAt', 'url', 'tvmazeEpisodeId'])
      if (!out[key] && ep[key]) out[key] = ep[key];
  }
  return out;
}
