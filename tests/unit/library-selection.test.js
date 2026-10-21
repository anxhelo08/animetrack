import { test, expect, vi } from 'vitest';
import { createLibrarySelection } from '../../src/core/library-selection.js';
const watched = (a) => a.seasons.reduce((n, s) => n + s.watched.length, 0);
const deps = () => ({
  isMovieAnime: (a) => a.format === 'MOVIE',
  futureSeasonOf: (a) => a.future,
  count: watched,
  releasedTotal: (a) => a.seasons.reduce((n, s) => n + s.total, 0),
  releasedCount: (s) => s.total,
  genresOf: (a) => a.genre?.split(',') || [],
  hasNewUnwatchedEpisode: (a) => a.newEpisode,
  percentage: vi.fn((a) => (watched(a) / 12) * 100),
  mediaKind: (a) => a.kind || 'anime',
  sortYears: (rows, sort) =>
    rows.sort((a, b) => (sort === 'year-new' ? b.year - a.year : a.year - b.year)),
});
const row = (id, status = 'watching', extra = {}) => ({
  id,
  title: id,
  status,
  year: 2020,
  format: 'TV',
  seasons: [{ id: 's', total: 12, format: 'TV', releaseStatus: 'FINISHED', watched: [1] }],
  ...extra,
});
const options = (rows) => ({
  state: { anime: rows },
  filter: 'all',
  search: '',
  sort: 'title',
  selectedGenre: 'all',
  libraryFocus: 'all',
  libraryProgress: 'all',
  selection: 'all',
  watchTimes: new Map(),
});
test('selection separates Active/Planned and composes aliases, genres, progress and media without modifying rows', () => {
  const rows = [row('B')];
  rows[0].status = 'watching';
  rows[0].aliases = ['Lojtari që ngrihet'];
  rows[0].genre = 'Drama';
  rows.push(row('A', 'planning'), row('C', 'watching', { kind: 'tv' }));
  const before = JSON.stringify(rows),
    select = createLibrarySelection(deps()),
    o = options(rows);
  expect(select(o).map((a) => a.id)).toEqual(['B', 'C']);
  expect(select({ ...o, filter: 'planning' }).map((a) => a.id)).toEqual(['A']);
  expect(
    select({
      ...o,
      search: 'lojtari qe',
      filter: 'genres',
      selectedGenre: 'drama',
      libraryFocus: 'unwatched',
      libraryProgress: 'continue',
      selection: 'anime',
    }),
  ).toEqual([rows[0]]);
  expect(JSON.stringify(rows)).toBe(before);
});
test('progress keys are computed once per row and do not stay stale after in-place updates', () => {
  const rows = [row('A'), row('B'), row('C')],
    d = deps(),
    select = createLibrarySelection(d),
    o = { ...options(rows), sort: 'progress' };
  select(o);
  expect(d.percentage).toHaveBeenCalledTimes(3);
  rows[2].seasons[0].watched.push(2);
  expect(select(o)[0].id).toBe('C');
  expect(d.percentage).toHaveBeenCalledTimes(6);
});
test('recent watch times and year ordering retain original row identity and reset with the supplied owner data', () => {
  const rows = [row('A', 'watching', { year: 2021 }), row('B', 'watching', { year: 2023 })],
    select = createLibrarySelection(deps()),
    o = options(rows);
  expect(
    select({
      ...o,
      sort: 'recent',
      watchTimes: new Map([
        ['B', 20],
        ['A', 10],
      ]),
    }),
  ).toEqual([rows[1], rows[0]]);
  expect(select({ ...o, sort: 'year-old' })).toEqual(rows);
  expect(select({ ...o, state: { anime: [row('Other')] } }).map((a) => a.id)).toEqual(['Other']);
});
