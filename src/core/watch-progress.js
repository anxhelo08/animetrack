/** Only deliberate progress differences become dated watch events. */
export function watchProgressChanges(before, after) {
  const old = new Map((before?.seasons || []).map((s) => [s.id, new Set(s.watched || [])]));
  const changes = [];
  for (const season of after.seasons || []) {
    const previous = old.get(season.id) || new Set();
    const next = new Set(season.watched || []);
    const added = [...next].filter((n) => !previous.has(n));
    if (added.length)
      changes.push({
        seasonId: season.id,
        action: added.length === 1 ? 'watched' : 'season-watched',
        episode: added.at(-1),
        episodes: added.length > 1 ? added : null,
      });
    for (const episode of previous)
      if (!next.has(episode)) changes.push({ seasonId: season.id, action: 'unwatched', episode });
  }
  return changes;
}

/** Catalogue refreshes must not outrank the last actual watch or library addition. */
export function libraryWatchTimes(items, history) {
  const byId = new Map(items.map((a) => [a.id, a]));
  const times = new Map(items.map((a) => [a.id, Date.parse(a.createdAt || a.updatedAt) || 0]));
  for (const event of history) {
    if (!['watched', 'season-watched', 'movie-watched', 'movie-rewatched'].includes(event.action))
      continue;
    const a = byId.get(event.id);
    const season =
      a?.seasons?.find((s) => s.id === event.seasonId) ||
      (!event.seasonId ? a?.seasons?.[0] : null);
    const numbers =
      event.action === 'season-watched'
        ? event.episodes || season?.watched || []
        : [Number(event.episode)];
    if (!season || !numbers.some((n) => season.watched?.includes(n))) continue;
    times.set(a.id, Math.max(times.get(a.id) || 0, Date.parse(event.date) || 0));
  }
  return times;
}
