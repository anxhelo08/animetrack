import { airingIdentities } from './airing-schedule.js';
import { isNewRelease } from './release-window.js';

const keysFor = (row) => [
  ...airingIdentities({ ...row, seasons: [] }).map((id) => id.provider + ':' + id.id),
  ...(/^\d+$/.test(String(row.malId || '')) ? ['mal:' + row.malId] : []),
];
/** Apply confirmed provider episodes without modifying watched flags, notes or history. */
export function applyAiringReleases(
  anime,
  events,
  { now = Date.now(), normalizeSeason, syncTotals, releasedCount } = {},
) {
  const drafts = new Map(),
    originals = new Map(anime.map((row) => [row.id, row]));
  for (const event of events) {
    const original = originals.get(event.animeId);
    if (
      !original ||
      !Number.isInteger(event.episode) ||
      event.episode < 1 ||
      event.episode > 10000 ||
      !Number.isFinite(event.when)
    )
      continue;
    const row = drafts.get(original.id) || structuredClone(original);
    const keys = [event.providerKey, event.malKey].filter(Boolean);
    let season = row.seasons.find(
      (part) =>
        (keys.length
          ? keysFor(part).some((key) => keys.includes(key))
          : part.id === event.seasonId) &&
        (!event.seasonNumber ||
          Number(part.tvmazeSeasonNumber || part.imdbSeasonNumber) === event.seasonNumber),
    );
    if (!season) {
      const parents = [row, ...row.seasons].flatMap(keysFor);
      if (
        event.when > now ||
        event.relation !== 'SEQUEL' ||
        !['TV', 'TV_SHORT', 'ONA'].includes(event.format) ||
        !(event.linkedFrom || []).some((key) => parents.includes(key)) ||
        row.seasons.length >= 200
      )
        continue;
      const [provider, id] = String(event.providerKey || '').split(':');
      if (!['anilist', 'mal'].includes(provider) || !/^\d{1,9}$/.test(id)) continue;
      season = normalizeSeason({
        id: (provider === 'anilist' ? 'al-' : 'mal-') + id,
        source: provider === 'anilist' ? 'AniList' : 'MyAnimeList',
        sourceId: id,
        malId: provider === 'mal' ? id : String(event.malKey || '').replace(/^mal:/, ''),
        title:
          'Sezoni ' +
          (row.seasons.filter((s) => ['TV', 'TV_SHORT', 'ONA'].includes(s.format)).length + 1),
        subtitle: event.partTitle || '',
        format: event.format,
        watched: [],
        episodes: [],
        total: Math.max(event.episode, Number(event.plannedTotal) || 0),
        releaseStatus: event.releaseStatus || 'RELEASING',
        releaseEvidence: true,
        airedCount: 0,
        sourceUrl: event.url || '',
        discoveredAt: new Date(now).toISOString(),
      });
      row.seasons.push(season);
    }
    const episode = season.episodes.find((ep) => ep.number === event.episode);
    const stamp = new Date(event.when).toISOString();
    if (episode) episode.airedAt = stamp;
    else
      season.episodes.push({
        number: event.episode,
        airedAt: stamp,
        title: event.episodeTitle || '',
      });
    season.episodes.sort((a, b) => a.number - b.number);
    season.total = Math.max(
      Number(season.total) || 0,
      event.episode,
      Number(event.plannedTotal) || 0,
    );
    season.releaseEvidence = true;
    if (event.when <= now) {
      season.airedCount = Math.max(Number(season.airedCount) || 0, event.episode);
      if (['NOT_YET_RELEASED', 'NOT_YET_AIRED'].includes(season.releaseStatus))
        season.releaseStatus = 'RELEASING';
    }
    drafts.set(row.id, row);
  }
  const changedIds = [];
  const updated = anime.map((original) => {
    const row = drafts.get(original.id);
    if (!row) return original;
    for (const season of row.seasons) {
      const future = season.episodes
        .filter((ep) => Date.parse(ep.airedAt || ep.aired || '') > now)
        .sort((a, b) => Date.parse(a.airedAt || a.aired) - Date.parse(b.airedAt || b.aired))[0];
      if (future) {
        season.nextAiringEpisode = future.number;
        season.nextAiringAt = Date.parse(future.airedAt || future.aired) / 1000;
      } else if (season.nextAiringAt && season.nextAiringAt * 1000 <= now) {
        season.nextAiringAt = 0;
        season.nextAiringEpisode = 0;
      }
    }
    if (
      row.status === 'completed' &&
      row.seasons.some((s) => !s.hidden && releasedCount(s, now) > (s.watched || []).length)
    )
      row.status = 'watching';
    syncTotals(row);
    if (JSON.stringify(row) === JSON.stringify(original)) return original;
    row.updatedAt = new Date(now).toISOString();
    changedIds.push(row.id);
    return row;
  });
  return { anime: updated, changedIds };
}
export function hasNewUnwatchedEpisode(anime, now = Date.now()) {
  return (anime.seasons || []).some(
    (s) =>
      !s.hidden &&
      (s.episodes || []).some(
        (ep) => !(s.watched || []).includes(ep.number) && isNewRelease(ep.airedAt || ep.aired, now),
      ),
  );
}
