export const READING_STATUS = {
  reading: 'Po lexoj',
  completed: 'Përfunduar',
  planning: 'Në listë',
  paused: 'Në pauzë',
  dropped: 'E lënë',
};
const text = (value, limit) =>
  String(value ?? '')
    .trim()
    .slice(0, limit);
const number = (value, limit = 10000) =>
  Math.max(0, Math.min(limit, Math.floor(Number(value) || 0)));
const score = (value) =>
  value === '' || value == null || !Number.isFinite(Number(value))
    ? null
    : Math.max(0, Math.min(10, Number(value)));
const url = (value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed.href : '';
  } catch {
    return '';
  }
};

export function normalizeReadingLibrary(raw) {
  const seen = new Set();
  return (Array.isArray(raw) ? raw : [])
    .slice(0, 3000)
    .filter((row) => {
      if (
        !row ||
        typeof row !== 'object' ||
        !text(row.title, 180) ||
        !/^reading-[a-zA-Z0-9_-]{1,100}$/.test(row.id) ||
        seen.has(row.id)
      )
        return false;
      seen.add(row.id);
      return true;
    })
    .map((row) => {
      const totalChapters = number(row.totalChapters);
      return {
        id: row.id,
        title: text(row.title, 180),
        kind: row.kind === 'manhwa' ? 'manhwa' : 'manga',
        sourceId: /^\d+$/.test(String(row.sourceId || '')) ? text(row.sourceId, 20) : '',
        anilistId: /^\d+$/.test(
          String(row.anilistId || (row.source !== 'jikan' ? row.sourceId : '') || ''),
        )
          ? text(row.anilistId || row.sourceId, 20)
          : '',
        malId: /^\d+$/.test(String(row.malId || (row.source === 'jikan' ? row.sourceId : '') || ''))
          ? text(row.malId || row.sourceId, 20)
          : '',
        cover: url(row.cover),
        synopsis: text(row.synopsis, 1800),
        genres: text(row.genres, 180),
        year: number(row.year, 2200) || null,
        publicationStatus: text(row.publicationStatus, 30),
        totalChapters,
        totalVolumes: number(row.totalVolumes, 1000),
        checkedAt: text(row.checkedAt, 40),
        mangaDexId: /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
          row.mangaDexId || '',
        )
          ? row.mangaDexId
          : '',
        chapterSource: row.chapterSource === 'MangaDex' ? 'MangaDex' : '',
        chapterReleases: (Array.isArray(row.chapterReleases) ? row.chapterReleases : [])
          .slice(-300)
          .filter(
            (entry) =>
              entry &&
              Number.isInteger(entry.chapter) &&
              entry.chapter > 0 &&
              entry.chapter <= (totalChapters || 10000) &&
              Number.isFinite(Date.parse(entry.date)),
          )
          .map((entry) => ({
            chapter: entry.chapter,
            date: text(entry.date, 40),
            detected: entry.detected === true,
          })),
        volumeRanges: (Array.isArray(row.volumeRanges) ? row.volumeRanges : [])
          .slice(0, 1000)
          .filter(
            (v) =>
              v &&
              Number.isInteger(v.volume) &&
              v.volume > 0 &&
              v.volume <= 1000 &&
              Number.isInteger(v.start) &&
              Number.isInteger(v.end) &&
              v.start > 0 &&
              v.end >= v.start &&
              v.end <= (totalChapters || 10000),
          )
          .map(({ volume, start, end }) => ({ volume, start, end })),
        source: row.source === 'jikan' ? 'jikan' : 'anilist',
        volumesRead: number(row.volumesRead, 1000),
        chaptersRead: [
          ...new Set(
            (Array.isArray(row.chaptersRead) ? row.chaptersRead : [])
              .map(Number)
              .filter((n) => Number.isInteger(n) && n > 0 && n <= (totalChapters || 10000)),
          ),
        ].sort((a, b) => a - b),
        status: READING_STATUS[row.status] ? row.status : 'planning',
        rating: score(row.rating),
        communityScore: score(row.communityScore),
        favorite: row.favorite === true,
        notes: text(row.notes, 2500),
        createdAt: text(row.createdAt, 40),
        updatedAt: text(row.updatedAt, 40),
        deletedAt: text(row.deletedAt, 40),
        journal: (Array.isArray(row.journal) ? row.journal : [])
          .slice(-5000)
          .filter(
            (event) =>
              event &&
              typeof event === 'object' &&
              Number.isInteger(event.chapter) &&
              event.chapter > 0 &&
              event.chapter <= 10000,
          )
          .map((event) => ({
            id: text(event.id, 100),
            chapter: event.chapter,
            action: event.action === 'unread' ? 'unread' : 'read',
            date: text(event.date, 40),
            recordedAt: text(event.recordedAt || event.date, 40),
            note: text(event.note, 1500),
            rating: score(event.rating),
          })),
      };
    });
}

/** Reading rows never enter anime counts, schedules or watch history. */
export function markChapter(row, chapter, read, stamp = new Date().toISOString()) {
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > (row.totalChapters || 10000))
    return false;
  if (row.chaptersRead.includes(chapter) === read) return false;
  row.chaptersRead = read
    ? [...row.chaptersRead, chapter].sort((a, b) => a - b)
    : row.chaptersRead.filter((n) => n !== chapter);
  row.journal.push({
    id: crypto.randomUUID(),
    chapter,
    action: read ? 'read' : 'unread',
    date: stamp,
    recordedAt: stamp,
    note: '',
    rating: null,
  });
  row.journal = row.journal.slice(-5000);
  row.updatedAt = stamp;
  if (
    row.totalChapters &&
    row.chaptersRead.length === row.totalChapters &&
    row.publicationStatus === 'FINISHED'
  )
    row.status = 'completed';
  else if ((read && row.status === 'planning') || (!read && row.status === 'completed'))
    row.status = 'reading';
  return true;
}

export function nextChapter(row) {
  let chapter = 1;
  const read = new Set(row.chaptersRead);
  while (read.has(chapter)) chapter++;
  return chapter <= (row.totalChapters || 10000) ? chapter : null;
}

/** Metadata updates never replace personal progress, notes, or manual volume boundaries. */
export function applyReadingUpdate(row, fresh, stamp = new Date().toISOString()) {
  const previous = row.totalChapters;
  const reported = Math.max(number(fresh.totalChapters), previous);
  const total = reported > 0 ? Math.max(reported, ...row.chaptersRead) : 0;
  const events = new Map((row.chapterReleases || []).map((entry) => [entry.chapter, entry]));
  for (const entry of fresh.chapterReleases || []) {
    if (!events.has(entry.chapter)) events.set(entry.chapter, entry);
  }
  // A first unknown-count lookup establishes a baseline, not thousands of fake premieres.
  if (previous > 0 && total > previous) {
    for (let chapter = previous + 1; chapter <= total; chapter++) {
      if (!events.has(chapter)) events.set(chapter, { chapter, date: stamp, detected: true });
    }
  }
  row.chapterReleases = [...events.values()].sort((a, b) => a.chapter - b.chapter).slice(-300);
  row.totalChapters = total;
  row.totalVolumes = Math.max(number(fresh.totalVolumes, 1000), row.totalVolumes);
  row.publicationStatus = fresh.publicationStatus || row.publicationStatus;
  if (fresh.mangaDexId) row.mangaDexId = fresh.mangaDexId;
  if (fresh.chapterSource) row.chapterSource = fresh.chapterSource;
  if (!row.volumeRanges.length && fresh.volumeRanges?.length) row.volumeRanges = fresh.volumeRanges;
  if (
    row.status === 'completed' &&
    (total > row.chaptersRead.length || row.publicationStatus === 'RELEASING')
  )
    row.status = 'reading';
  row.checkedAt = stamp;
  row.updatedAt = stamp;
  return total - previous;
}
