/** Group only within one provider identity and season; equal names never imply equal titles. */
export function groupTraktRows(rows) {
  const groups = new Map();
  for (const row of rows) {
    const identity = row.traktId
      ? 'trakt:' + row.traktId
      : row.imdbId
        ? 'imdb:' + row.imdbId
        : row.tmdbId
          ? 'tmdb:' + row.tmdbId
          : 'unidentified:' + row.key;
    const key = JSON.stringify([row.movie, identity, row.season]);
    if (!groups.has(key))
      groups.set(key, {
        key: 'group-' + groups.size,
        title: row.title,
        movie: row.movie,
        season: row.season,
        rows: [],
      });
    groups.get(key).rows.push(row);
  }
  return [...groups.values()];
}
export function suggestedGroupTarget(group, library) {
  const row = group.rows[0];
  const anime = library.find(
    (a) =>
      (row.traktId && a.traktId === row.traktId) ||
      (row.imdbId && a.imdbId === row.imdbId) ||
      (row.tmdbId && String(a.tmdbId) === row.tmdbId),
  );
  const parts = anime?.seasons?.filter((s) => !s.hidden) || [];
  const part = group.movie
    ? parts.find((s) => s.format === 'MOVIE')
    : !group.season && parts.length === 1
      ? parts[0]
      : null;
  return part ? anime.id + '|' + part.id : '';
}
export function resolveTraktGroups(rows, library, selections) {
  const result = {};
  for (const group of groupTraktRows(rows)) {
    const target = Object.hasOwn(selections, group.key)
      ? selections[group.key]
      : suggestedGroupTarget(group, library);
    for (const row of group.rows) {
      const value = selections[row.key];
      result[row.key] = value === undefined || value === 'inherit' ? target : value;
    }
  }
  return result;
}
