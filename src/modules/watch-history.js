/** Last watched episodes, oldest above newest; progress is the source of truth. */
export function recentWatchedEpisodes(items, history, limit = 6) {
  const byId = new Map(items.map((a) => [a.id, a]));
  const recent = new Map();
  const key = (a, season, n) => JSON.stringify([a.id, season.id, n]);
  let order = 0;
  for (const event of history) {
    if (!['watched', 'season-watched'].includes(event.action)) continue;
    const a = byId.get(event.id);
    const season = a?.seasons.find((s) => s.id === event.seasonId);
    if (!season || season.hidden) continue;
    const numbers =
      event.action === 'season-watched'
        ? event.episodes || season.watched
        : [Number(event.episode)];
    for (const n of numbers) {
      if (!season.watched.includes(n)) continue;
      const id = key(a, season, n),
        at = Date.parse(event.date) || 0;
      const previous = recent.get(id);
      if (!previous || at >= previous.at) recent.set(id, { a, season, n, at, order: order++ });
    }
  }
  // Imported progress has no event dates. Keep its last unlogged watched episode
  // without inventing a watch event or replacing the actual episode history.
  for (const a of items) {
    const season = a.seasons
      .slice()
      .reverse()
      .find((s) => !s.hidden && s.watched.length);
    if (!season) continue;
    const n = Math.max(0, ...season.watched.filter((n) => !recent.has(key(a, season, n))));
    if (n) recent.set(key(a, season, n), { a, season, n, at: 0, order: order++ });
  }
  return [...recent.values()]
    .sort((a, b) => b.at - a.at || b.order - a.order)
    .slice(0, limit)
    .reverse();
}
