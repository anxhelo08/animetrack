import { recentWatchedEpisodes } from './watch-history.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Build the phone home feed once per saved library revision, then reuse its selectors. */
export function createMobileHomeModel() {
  let cached;

  return function select({
    owner,
    revision,
    items,
    history,
    entries,
    nextEpisode,
    now,
    includeUpcoming,
  }) {
    const timeBucket = Math.floor(now / 60000);
    if (
      cached &&
      cached.owner === owner &&
      cached.revision === revision &&
      cached.items === items &&
      cached.history === history &&
      cached.entries === entries &&
      cached.timeBucket === timeBucket &&
      cached.includeUpcoming === includeUpcoming
    )
      return cached.value;

    const byId = new Map(items.map((item) => [item.id, item]));
    const touchedAt = new Map();
    for (const event of history) {
      if (!['watched', 'season-watched'].includes(event.action)) continue;
      touchedAt.set(event.id, Math.max(touchedAt.get(event.id) || 0, Date.parse(event.date) || 0));
    }

    const touched = (item) =>
      touchedAt.get(item.id) || Date.parse(item.createdAt || item.updatedAt) || now;
    const releaseTimes = new Map(
      entries.map((entry) => [
        `${entry.animeId}:${entry.seasonId || entry.localSeason?.id}:${entry.seasonEpisode || entry.localEpisode || entry.episode}`,
        Number(entry.when),
      ]),
    );
    const candidates = items
      .filter((item) => ['watching', 'waiting'].includes(item.status))
      .map((item) => {
        const next = nextEpisode(item);
        if (!next) return null;
        const metadata = next.season.episodes?.find((episode) => episode.number === next.n);
        const releasedAt =
          Date.parse(metadata?.airedAt || metadata?.aired || '') ||
          releaseTimes.get(`${item.id}:${next.season.id}:${next.n}`) ||
          (Number(next.season.nextAiringEpisode) === next.n
            ? Number(next.season.nextAiringAt) * 1000
            : 0);
        const age = now - releasedAt;
        const fresh = releasedAt > 0 && age >= 0 && age <= WEEK_MS;
        return { a: item, next, releasedAt, fresh };
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          Number(b.fresh) - Number(a.fresh) ||
          (b.fresh ? b.releasedAt - a.releasedAt : touched(b.a) - touched(a.a)),
      );

    const active = candidates.filter(({ a, fresh }) => fresh || now - touched(a) <= WEEK_MS);
    const stale = candidates.filter(({ a, fresh }) => !fresh && now - touched(a) > WEEK_MS);
    let upcoming = [];
    if (includeUpcoming) {
      const known = new Set(
        entries.map(
          (entry) =>
            `${entry.animeId}:${entry.seasonId || entry.localSeason?.id}:${entry.seasonEpisode || entry.localEpisode || entry.episode}`,
        ),
      );
      upcoming = entries.slice();
      for (const item of items) {
        if (!['watching', 'waiting', 'completed'].includes(item.status)) continue;
        for (const season of item.seasons.filter((part) => !part.hidden)) {
          for (const metadata of season.episodes || []) {
            const when = Date.parse(metadata.airedAt || metadata.aired || ''),
              number = Number(metadata.number),
              key = `${item.id}:${season.id}:${number}`;
            if (
              when > now &&
              number > 0 &&
              Number.isInteger(number) &&
              !season.watched.includes(number) &&
              !known.has(key)
            ) {
              known.add(key);
              upcoming.push({ animeId: item.id, seasonId: season.id, seasonEpisode: number, when });
            }
          }
        }
      }
      upcoming = upcoming
        .filter((entry) => entry.when > now)
        .sort((a, b) => a.when - b.when)
        .slice(0, 40);
    }

    const value = {
      byId,
      active,
      stale,
      recent: recentWatchedEpisodes(items, history),
      upcoming,
    };
    cached = {
      owner,
      revision,
      items,
      history,
      entries,
      timeBucket,
      includeUpcoming,
      value,
    };
    return value;
  };
}
