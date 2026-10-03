export const READING_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Thriller',
];
export function cleanReadingFilters(raw = {}) {
  const genres = (key) => [
    ...new Set(
      (Array.isArray(raw[key]) ? raw[key] : []).filter((value) => READING_GENRES.includes(value)),
    ),
  ];
  const positive = (value, max) => Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));
  return {
    include: genres('include'),
    exclude: genres('exclude'),
    year: positive(raw.year, 2200),
    publication: ['RELEASING', 'FINISHED', 'HIATUS', 'CANCELLED'].includes(raw.publication)
      ? raw.publication
      : '',
    score: positive(raw.score, 10),
    minChapters: positive(raw.minChapters, 10000),
    maxChapters: positive(raw.maxChapters, 10000),
  };
}
export function matchesReadingFilters(row, raw) {
  const f = cleanReadingFilters(raw),
    genres = String(row.genres || '')
      .split(',')
      .map((s) => s.trim());
  return (
    f.include.every((g) => genres.includes(g)) &&
    !f.exclude.some((g) => genres.includes(g)) &&
    (!f.year || row.year === f.year) &&
    (!f.publication || row.publicationStatus === f.publication) &&
    (!f.score || Number(row.communityScore) >= f.score) &&
    (!f.minChapters || row.totalChapters >= f.minChapters) &&
    (!f.maxChapters || (row.totalChapters > 0 && row.totalChapters <= f.maxChapters))
  );
}
export function readingTaste(rows) {
  const candidates = rows.filter(
    (r) => !r.deletedAt && (r.favorite || r.rating >= 7 || r.chaptersRead.length),
  );
  const weights = new Map();
  for (const row of candidates)
    for (const genre of String(row.genres || '')
      .split(',')
      .map((g) => g.trim())
      .filter((g) => READING_GENRES.includes(g))) {
      weights.set(genre, (weights.get(genre) || 0) + (row.favorite ? 3 : row.rating >= 7 ? 2 : 1));
    }
  return {
    genres: [...weights]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre),
    seeds: candidates,
  };
}
export function rankReadingRecommendations(items, rows) {
  const taste = readingTaste(rows),
    ids = new Set(rows.filter((r) => !r.deletedAt).map((r) => `${r.source}:${r.sourceId}`));
  return items
    .filter(
      (row) =>
        !ids.has(`${row.source}:${row.sourceId}`) &&
        !rows.some(
          (owned) =>
            !owned.deletedAt &&
            ((row.weebCentralId && row.weebCentralId === owned.weebCentralId) ||
              (row.anilistId && row.anilistId === owned.anilistId) ||
              (row.malId && row.malId === owned.malId)),
        ),
    )
    .map((row) => {
      const genres = String(row.genres || '')
        .split(',')
        .map((g) => g.trim());
      const seed = taste.seeds.find((s) =>
        String(s.genres)
          .split(',')
          .some((g) => genres.includes(g.trim())),
      );
      return {
        ...row,
        recommendationReason: seed ? `Sepse të pëlqeu ${seed.title}` : 'Popullor në katalog',
        affinity: taste.genres.filter((g) => genres.includes(g)).length,
      };
    })
    .sort((a, b) => b.affinity - a.affinity || (b.communityScore || 0) - (a.communityScore || 0));
}
export function readingWeeklyStats(rows, now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const genres = new Map(),
    titles = [];
  let chapters = 0;
  for (const row of rows.filter((r) => !r.deletedAt)) {
    const events = row.journal.filter(
      (e) => Date.parse(e.date) >= start.getTime() && Date.parse(e.date) <= now.getTime(),
    );
    // Count the final action for each chapter this week, avoiding repeated toggle inflation.
    const final = new Map(
      events
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))
        .map((e) => [e.chapter, e.action]),
    );
    const read = [...final].filter(
      ([n, action]) => action === 'read' && row.chaptersRead.includes(n),
    ).length;
    chapters += read;
    if (read) titles.push({ title: row.title, chapters: read });
    for (const g of String(row.genres || '')
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean))
      genres.set(g, (genres.get(g) || 0) + row.chaptersRead.length);
  }
  return {
    chapters,
    titles: titles.sort((a, b) => b.chapters - a.chapters),
    genres: [...genres].sort((a, b) => b[1] - a[1]).slice(0, 8),
  };
}
