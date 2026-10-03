/** Group confirmed source dates in the viewer's local calendar. Detection dates remain labelled. */
export function readingCalendarEntries(rows, { month, query = '' } = {}) {
  const needle = query.trim().toLocaleLowerCase(),
    entries = new Map();
  for (const row of rows) {
    if (row.deletedAt || (needle && !row.title.toLocaleLowerCase().includes(needle))) continue;
    for (const entry of row.chapterReleases || []) {
      const when = Date.parse(entry.date);
      if (!Number.isFinite(when) || !Number.isInteger(entry.chapter) || entry.chapter <= 0)
        continue;
      const day = new Date(when).toLocaleDateString('sv-SE');
      if (month && !day.startsWith(month + '-')) continue;
      const key = row.id + ':' + entry.chapter,
        old = entries.get(key);
      if (!old || (old.entry.detected && !entry.detected))
        entries.set(key, { row, entry, day, when });
    }
  }
  return [...entries.values()].sort((a, b) => b.when - a.when || a.entry.chapter - b.entry.chapter);
}
