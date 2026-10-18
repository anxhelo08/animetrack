import { seriesProgress } from './series-progress.js';

export const rulePresets = {
  short: { status: 'planning', maxTotal: 12 },
  almost: { progress: 'continue', maxRemaining: 3 },
  favorites: { favorite: true },
  movies: { movie: true, excludeCompleted: true },
};
export function cleanRules(input = {}) {
  const out = {};
  if (['watching', 'completed', 'planning', 'paused', 'dropped'].includes(input.status))
    out.status = input.status;
  if (['continue', 'caught-up', 'finished', 'unknown'].includes(input.progress))
    out.progress = input.progress;
  for (const key of ['favorite', 'movie', 'excludeCompleted'])
    if (input[key] === true) out[key] = true;
  for (const key of ['maxTotal', 'maxRemaining'])
    if (Number.isInteger(input[key]) && input[key] > 0 && input[key] <= 10000)
      out[key] = input[key];
  if (typeof input.query === 'string' && input.query.trim())
    out.query = input.query.trim().slice(0, 100);
  if (typeof input.genre === 'string' && input.genre.trim())
    out.genre = input.genre.trim().slice(0, 60);
  return out;
}
export function matchRules(anime, raw, released) {
  const rules = cleanRules(raw),
    progress = seriesProgress(anime, released);
  if (rules.status && anime.status !== rules.status) return false;
  if (rules.progress && progress?.key !== rules.progress) return false;
  if (rules.favorite && !anime.favorite) return false;
  if (rules.movie && anime.format !== 'MOVIE') return false;
  if (rules.excludeCompleted && anime.status === 'completed') return false;
  if (rules.maxTotal && (!anime.total || anime.total > rules.maxTotal)) return false;
  if (rules.maxRemaining && (!progress?.remaining || progress.remaining > rules.maxRemaining))
    return false;
  if (
    rules.query &&
    ![anime.title, ...(anime.aliases || [])]
      .join(' ')
      .toLocaleLowerCase()
      .includes(rules.query.toLocaleLowerCase())
  )
    return false;
  if (
    rules.genre &&
    !(anime.genre || '').toLocaleLowerCase().split(/,\s*/).includes(rules.genre.toLocaleLowerCase())
  )
    return false;
  return true;
}
export function parseTrakt(input) {
  const data = typeof input === 'string' ? JSON.parse(input) : input;
  if (!data || typeof data !== 'object')
    throw Error('Formati i skedarit Trakt nuk është i vlefshëm.');
  const rows = Array.isArray(data)
    ? data
    : [
        ...(data.history || []),
        ...(data.watchlist || []).map((r) => ({ ...r, planned: true })),
        ...(data.ratings || []),
      ];
  if (!Array.isArray(rows) || rows.length > 3000)
    throw Error('Importi pranon deri në 3000 regjistrime për skedar.');
  return rows
    .map((r, index) => {
      if (!r || typeof r !== 'object') return null;
      const media = r.movie || r.show;
      if (!media?.title) return null;
      const ids = media.ids || {},
        stamp = r.watched_at || r.listed_at || r.rated_at || '';
      return {
        key: 'trakt-' + index + '-' + (r.id || ''),
        title: String(media.title).slice(0, 180),
        imdbId: /^tt\d+$/.test(ids.imdb || '') ? ids.imdb : '',
        tmdbId: ids.tmdb ? String(ids.tmdb) : '',
        movie: !!r.movie,
        traktId: Number.isSafeInteger(ids.trakt) && ids.trakt > 0 ? ids.trakt : null,
        traktEpisodeId:
          Number.isSafeInteger(r.episode?.ids?.trakt) && r.episode.ids.trakt > 0
            ? r.episode.ids.trakt
            : null,
        episode: Number.isInteger(r.episode?.number) && r.episode.number > 0 ? r.episode.number : 0,
        season: Number.isInteger(r.episode?.season) && r.episode.season >= 0 ? r.episode.season : 0,
        at: Number.isFinite(Date.parse(stamp)) ? new Date(stamp).toISOString() : '',
        rating: Number(r.rating) >= 1 && Number(r.rating) <= 10 ? Number(r.rating) : null,
        planned: r.planned === true,
        watched: !!r.watched_at && Number.isFinite(Date.parse(r.watched_at)),
      };
    })
    .filter(Boolean);
}
export function matchTrakt(row, library) {
  return (
    library.find(
      (a) => (row.imdbId && a.imdbId === row.imdbId) || (row.tmdbId && a.tmdbId === row.tmdbId),
    ) || null
  );
}
/** Draft only: the caller backs up and saves once, with rollback on any failure. */
export function applyTraktRows(state, entries, selections, stamp) {
  const draft = structuredClone(state),
    counts = { applied: 0, skipped: 0 };
  for (const row of entries) {
    const selection = selections[row.key];
    if (!selection) {
      counts.skipped++;
      continue;
    }
    const [id, partId] = selection.split('|'),
      anime = draft.anime.find((a) => a.id === id),
      part = anime?.seasons?.find((s) => s.id === partId);
    if (!anime || !part || (row.episode && (!part.total || row.episode > part.total))) {
      counts.skipped++;
      continue;
    }
    const n = row.movie ? 1 : row.episode;
    if ((row.movie && part.format !== 'MOVIE') || (!row.movie && n && part.format === 'MOVIE')) {
      counts.skipped++;
      continue;
    }
    if (n && row.at && row.watched && !row.planned) {
      const duplicate = draft.history.some(
        (h) =>
          h.id === id &&
          h.seasonId === part.id &&
          h.episode === n &&
          h.date === row.at &&
          ['watched', 'trakt-watched'].includes(h.action),
      );
      if (!duplicate) {
        part.watched = [...new Set([...(part.watched || []), n])].sort((a, b) => a - b);
        part.watchedAt = { ...(part.watchedAt || {}), [n]: part.watchedAt?.[n] || row.at };
        draft.history.push({
          eventId: 'trakt-' + id + '-' + part.id + '-' + n + '-' + row.at,
          id,
          seasonId: part.id,
          episode: n,
          action: 'watched',
          date: row.at,
          diaryNote: '',
          diaryRating: row.rating,
        });
      }
    }
    if (row.traktId && !anime.traktId) anime.traktId = row.traktId;
    if (row.traktEpisodeId && n && !row.movie) {
      part.episodes ||= [];
      let ep = part.episodes.find((e) => e.number === n);
      if (!ep) {
        ep = { number: n };
        part.episodes.push(ep);
      }
      if (!ep.traktId) ep.traktId = row.traktEpisodeId;
    }
    if (row.rating && n && !row.movie) {
      part.episodes ||= [];
      let episode = part.episodes.find((ep) => ep.number === n);
      if (!episode) {
        episode = { number: n };
        part.episodes.push(episode);
      }
      if (episode.personalRating == null) episode.personalRating = row.rating;
    } else if (row.rating && anime.rating == null) anime.rating = row.rating;
    if (row.planned) {
      draft.preferences ||= {};
      draft.preferences.customLists ||= [];
      let list = draft.preferences.customLists.find((l) => l.id === 'list-trakt-watchlist');
      if (!list) {
        list = {
          id: 'list-trakt-watchlist',
          title: 'Nga Trakt · Në plan',
          animeIds: [],
          createdAt: stamp,
          updatedAt: stamp,
        };
        draft.preferences.customLists.push(list);
      }
      if (!list.animeIds.includes(id)) {
        if (list.animeIds.length >= 150) {
          counts.skipped++;
          continue;
        }
        list.animeIds.push(id);
      }
      list.updatedAt = stamp;
    }
    anime.updatedAt = stamp;
    counts.applied++;
  }
  return { draft, ...counts };
}
