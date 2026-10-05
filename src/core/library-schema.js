export const MAX_IMPORT_BYTES = 8_000_000;
const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
const fail = (path) => {
  throw new Error('Biblioteka ka të dhëna të pavlefshme: ' + path);
};
const integer = (value, max, path) => {
  if (value == null) return;
  const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isInteger(number) || number < 0 || number > max) fail(path);
};

function validateTimestamps(value, max, path, episodes = false) {
  if (value == null) return;
  if (!object(value) || Object.keys(value).length > max) fail(path);
  for (const [key, stamp] of Object.entries(value)) {
    if (
      !key ||
      key.length > 180 ||
      (episodes && (!/^[1-9]\d*$/.test(key) || Number(key) > 10000)) ||
      typeof stamp !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T/.test(stamp) ||
      !Number.isFinite(Date.parse(stamp))
    )
      fail(path);
  }
}

/** Validates the entire input before normalization; never mutates or drops user rows. */
export function validateLibrary(value, { requireHistory = false } = {}) {
  if (!object(value) || !Array.isArray(value.anime) || value.anime.length > 5000) fail('anime');
  validateTimestamps(value.deleted, 5000, 'deleted');
  if (requireHistory && !Array.isArray(value.history)) fail('history');
  if (value.history != null && (!Array.isArray(value.history) || value.history.length > 250000))
    fail('history');
  if (value.preferences != null && !object(value.preferences)) fail('preferences');
  if (value.tvShows != null && (!Array.isArray(value.tvShows) || value.tvShows.length > 800))
    fail('tvShows');
  if (
    value.readingLibrary != null &&
    (!Array.isArray(value.readingLibrary) || value.readingLibrary.length > 3000)
  )
    fail('readingLibrary');
  let nodes = 0;
  const scan = (item, depth = 0) => {
    if (++nodes > 2_000_000 || depth > 24) fail('madhësia/struktura');
    if (typeof item === 'number' && !Number.isFinite(item)) fail('numër');
    if (typeof item === 'string' && item.length > 20000) fail('tekst');
    if (typeof item === 'object' && item !== null) {
      for (const [key, child] of Object.entries(item)) {
        if (['__proto__', 'prototype', 'constructor'].includes(key)) fail(key);
        scan(child, depth + 1);
      }
    }
  };
  scan(value);
  const readingIds = new Set();
  for (const [i, row] of (value.readingLibrary || []).entries()) {
    const path = 'readingLibrary[' + i + ']';
    if (
      !object(row) ||
      typeof row.id !== 'string' ||
      !/^reading-[a-zA-Z0-9_-]{1,100}$/.test(row.id) ||
      readingIds.has(row.id) ||
      typeof row.title !== 'string' ||
      !row.title.trim() ||
      row.title.length > 180 ||
      !['manga', 'manhwa'].includes(row.kind)
    )
      fail(path);
    readingIds.add(row.id);
    integer(row.totalChapters, 10000, path + '.totalChapters');
    integer(row.totalVolumes, 1000, path + '.totalVolumes');
    integer(row.volumesRead, 1000, path + '.volumesRead');
    if (!Array.isArray(row.chaptersRead) || row.chaptersRead.length > 10000)
      fail(path + '.chaptersRead');
    for (const n of row.chaptersRead) {
      integer(n, 10000, path + '.chaptersRead');
      if (Number(n) < 1) fail(path + '.chaptersRead');
    }
    if (row.chapterReleases != null) {
      if (!Array.isArray(row.chapterReleases) || row.chapterReleases.length > 300)
        fail(path + '.chapterReleases');
      for (const entry of row.chapterReleases) {
        if (
          !object(entry) ||
          !Number.isInteger(entry.chapter) ||
          entry.chapter < 1 ||
          entry.chapter > (row.totalChapters || 10000) ||
          !Number.isFinite(Date.parse(entry.date))
        )
          fail(path + '.chapterReleases');
      }
    }
    if (row.volumeRanges != null) {
      if (!Array.isArray(row.volumeRanges) || row.volumeRanges.length > 1000)
        fail(path + '.volumeRanges');
      let end = 0;
      const volumes = new Set();
      for (const group of row.volumeRanges) {
        if (!object(group)) fail(path + '.volumeRanges');
        integer(group.volume, 1000, path + '.volumeRanges');
        integer(group.start, 10000, path + '.volumeRanges');
        integer(group.end, row.totalChapters || 10000, path + '.volumeRanges');
        if (
          !group.volume ||
          group.start <= end ||
          group.end < group.start ||
          volumes.has(group.volume)
        )
          fail(path + '.volumeRanges');
        volumes.add(group.volume);
        end = group.end;
      }
    }
    if (!Array.isArray(row.journal) || row.journal.length > 5000) fail(path + '.journal');
    for (const event of row.journal) {
      if (!object(event) || !event.id || !['read', 'unread'].includes(event.action))
        fail(path + '.journal');
      integer(event.chapter, 10000, path + '.chapter');
      if (!event.chapter || !Number.isFinite(Date.parse(event.date))) fail(path + '.journal');
    }
  }
  for (const [i, anime] of value.anime.entries()) {
    const path = 'anime[' + i + ']';
    if (
      !object(anime) ||
      typeof anime.title !== 'string' ||
      !anime.title.trim() ||
      anime.title.length > 180
    )
      fail(path + '.title');
    if (anime.id != null && (typeof anime.id !== 'string' || !anime.id || anime.id.length > 180))
      fail(path + '.id');
    if (anime.seasons != null && (!Array.isArray(anime.seasons) || anime.seasons.length > 200))
      fail(path + '.seasons');
    integer(anime.total, 10000, path + '.total');
    for (const [j, season] of (anime.seasons || []).entries()) {
      if (!object(season)) fail(path + '.seasons[' + j + ']');
      validateTimestamps(season.unwatched, 10000, path + '.unwatched', true);
      validateTimestamps(season.watchedAt, 10000, path + '.watchedAt', true);
      integer(season.total, 10000, path + '.total');
      if (
        season.watched != null &&
        (!Array.isArray(season.watched) || season.watched.length > 10000)
      )
        fail(path + '.watched');
      for (const n of season.watched || []) {
        integer(n, 10000, path + '.watched');
        if (Number(n) < 1) fail(path + '.watched');
      }
      if (
        season.episodes != null &&
        (!Array.isArray(season.episodes) || season.episodes.length > 10000)
      )
        fail(path + '.episodes');
      for (const ep of season.episodes || []) {
        if (!object(ep)) fail(path + '.episode');
        if (ep.number == null || Number(ep.number) < 1) fail(path + '.episode.number');
        integer(ep.number, 10000, path + '.episode.number');
      }
    }
  }
  for (const row of value.history || []) if (!object(row)) fail('history');
  return value;
}

export function parseLibrary(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES)
    fail('skedari mbi 8 MB');
  return validateLibrary(JSON.parse(text), { requireHistory: true });
}
