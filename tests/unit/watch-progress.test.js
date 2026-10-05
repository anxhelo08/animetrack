import { test, expect } from 'vitest';
import { watchProgressChanges, libraryWatchTimes } from '../../src/core/watch-progress.js';
import {
  episodeProviderIdentity,
  continuousAnimeEpisodes,
} from '../../src/core/episode-details.js';
test('manual progress logs additions and removals without re-dating previous episodes', () => {
  const before = { seasons: [{ id: 's', watched: [1, 2] }] },
    after = { seasons: [{ id: 's', watched: [1, 3, 4] }] };
  expect(watchProgressChanges(before, after)).toEqual([
    { seasonId: 's', action: 'season-watched', episode: 4, episodes: [3, 4] },
    { seasonId: 's', action: 'unwatched', episode: 2 },
  ]);
  expect(watchProgressChanges(after, after)).toEqual([]);
});
test('catalogue refreshes cannot displace recent viewing and unwatched history is ignored', () => {
  const items = [
    {
      id: 'a',
      createdAt: '2026-01-01',
      updatedAt: '2026-10-05',
      seasons: [{ id: 's', watched: [1] }],
    },
    {
      id: 'b',
      createdAt: '2026-01-02',
      updatedAt: '2026-10-04',
      seasons: [{ id: 't', watched: [1, 2] }],
    },
  ];
  const times = libraryWatchTimes(items, [
    { id: 'a', seasonId: 's', episode: 2, action: 'watched', date: '2026-10-05' },
    { id: 'b', seasonId: 't', episode: 2, action: 'watched', date: '2026-10-03' },
  ]);
  expect(times.get('b')).toBeGreaterThan(times.get('a'));
  expect(times.get('a')).toBe(Date.parse('2026-01-01'));
});
test('one track inherits missing provider identity but sequels and multi-track shows never do', () => {
  const season = { id: 's', format: 'TV' },
    anime = {
      title: 'Black Clover',
      source: 'AniList',
      sourceId: 97940,
      malId: 34572,
      year: 2017,
      seasons: [season],
    };
  expect(episodeProviderIdentity(anime, season)).toMatchObject({
    subtitle: 'Black Clover',
    malId: 34572,
    sourceId: 97940,
    year: 2017,
  });
  const sequel = { ...season, sourceId: 999 };
  expect(episodeProviderIdentity({ ...anime, seasons: [sequel] }, sequel)).toBe(sequel);
  expect(
    episodeProviderIdentity({ ...anime, seasons: [season, { id: 's2', format: 'TV' }] }, season),
  ).toBe(season);
});
test('continuous anime numbering spans seasons, skips specials, and rejects missing or duplicate episodes', () => {
  const rows = [
    { season: 1, number: 1, name: 'First' },
    { season: 2, number: 1, name: 'Third', image: { original: 'https://example.test/3.jpg' } },
    { season: 1, number: 2, name: 'Second' },
    { season: 1, number: null, name: 'Special' },
  ];
  const result = continuousAnimeEpisodes(rows);
  expect(result.map((e) => e.number)).toEqual([1, 2, 3]);
  expect(result[2].image).toBe('https://example.test/3.jpg');
  expect(
    continuousAnimeEpisodes([
      { season: 1, number: 1 },
      { season: 2, number: 2 },
    ]),
  ).toBeNull();
  expect(
    continuousAnimeEpisodes([
      { season: 1, number: 1 },
      { season: 1, number: 1 },
    ]),
  ).toBeNull();
});
