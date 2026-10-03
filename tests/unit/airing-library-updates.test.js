import { it, expect } from 'vitest';
import { createLibraryModel } from '../../src/core/library-model.js';
import {
  applyAiringReleases,
  hasNewUnwatchedEpisode,
} from '../../src/core/airing-library-updates.js';
const model = createLibraryModel(),
  now = Date.parse('2026-10-03T12:00:00Z');
const options = (at = now) => ({
  now: at,
  normalizeSeason: model.normSeason,
  syncTotals: model.syncTotals,
  releasedCount: model.releasedCount,
});
const title = () =>
  model.normalized({
    id: 'series',
    title: 'Series',
    source: 'AniList',
    sourceId: '7',
    status: 'completed',
    notes: 'Private',
    rating: 9,
    seasons: [
      {
        id: 'al-7',
        source: 'AniList',
        sourceId: '7',
        malId: '70',
        format: 'TV',
        total: 2,
        watched: [1, 2],
        releaseStatus: 'FINISHED',
        episodes: [
          { number: 1, airedAt: '2020-01-01T12:00:00Z', myNote: 'Personal', personalRating: 8 },
        ],
      },
    ],
  });
const event = (override = {}) => ({
  animeId: 'series',
  providerKey: 'anilist:7',
  malKey: 'mal:70',
  episode: 3,
  when: now - 60000,
  ...override,
});
it('a released episode reopens a completed series, persists its date and leaves watched notes untouched', () => {
  const original = title(),
    before = structuredClone(original);
  const result = applyAiringReleases([original], [event()], options());
  const row = result.anime[0],
    part = row.seasons[0];
  expect(row.status).toBe('watching');
  expect(part.watched).toEqual([1, 2]);
  expect(part.episodes.find((ep) => ep.number === 1)).toMatchObject({
    myNote: 'Personal',
    personalRating: 8,
  });
  expect(part.episodes.find((ep) => ep.number === 3).airedAt).toBe(
    new Date(now - 60000).toISOString(),
  );
  expect(row.notes).toBe('Private');
  expect(row.rating).toBe(9);
  expect(hasNewUnwatchedEpisode(row, now)).toBe(true);
  expect(original).toEqual(before);
  expect(applyAiringReleases(result.anime, [event()], options()).changedIds).toEqual([]);
});
it('a cached future episode becomes available at its confirmed timestamp without another provider request', () => {
  const upcoming = event({ when: now + 60000 });
  const stored = applyAiringReleases([title()], [upcoming], options());
  expect(stored.anime[0].status).toBe('completed');
  expect(model.releasedCount(stored.anime[0].seasons[0], now)).toBe(2);
  expect(hasNewUnwatchedEpisode(stored.anime[0], now)).toBe(false);
  const aired = applyAiringReleases(stored.anime, [upcoming], options(now + 60000));
  expect(aired.anime[0].status).toBe('watching');
  expect(model.releasedCount(aired.anime[0].seasons[0], now + 60000)).toBe(3);
});
it('adds a provider-confirmed TV sequel to its own season and never inherits old watched flags', () => {
  const sequel = event({
    providerKey: 'anilist:8',
    malKey: 'mal:80',
    episode: 1,
    format: 'TV',
    plannedTotal: 12,
    releaseStatus: 'RELEASING',
    relation: 'SEQUEL',
    linkedFrom: ['anilist:7'],
    partTitle: 'Series 2',
  });
  const result = applyAiringReleases(
    [title()],
    [sequel, { ...sequel, providerKey: 'mal:80' }],
    options(),
  );
  const row = result.anime[0];
  expect(row.seasons).toHaveLength(2);
  expect(row.seasons[1]).toMatchObject({
    id: 'al-8',
    sourceId: '8',
    malId: '80',
    total: 12,
    watched: [],
    airedCount: 1,
  });
  expect(row.seasons[0].watched).toEqual([1, 2]);
  expect(row.status).toBe('watching');
  expect(model.releasedTotal(row)).toBe(3);
});
it('does not add an unrelated, future, untyped or movie sequel', () => {
  const base = event({
    providerKey: 'anilist:8',
    malKey: 'mal:80',
    relation: 'SEQUEL',
    linkedFrom: ['anilist:7'],
    episode: 1,
    format: 'TV',
  });
  for (const override of [
    { relation: undefined },
    { linkedFrom: ['anilist:99'] },
    { format: undefined },
    { format: 'MOVIE' },
    { when: now + 1000 },
  ]) {
    expect(
      applyAiringReleases([title()], [{ ...base, ...override }], options()).changedIds,
    ).toEqual([]);
  }
});
it('MAL fallback matches the exact tracked AniList season and respects paused and dropped statuses', () => {
  for (const status of ['paused', 'dropped', 'planning']) {
    const row = { ...title(), status };
    const result = applyAiringReleases(
      [row],
      [event({ providerKey: 'mal:70', malKey: '' })],
      options(),
    );
    expect(result.anime[0].seasons).toHaveLength(1);
    expect(result.anime[0].status).toBe(status);
  }
});
it('watched, hidden, expired or future releases cannot keep a NEW badge', () => {
  const row = applyAiringReleases([title()], [event()], options()).anime[0];
  expect(hasNewUnwatchedEpisode(row, now + 7 * 86400000)).toBe(false);
  row.seasons[0].watched.push(3);
  expect(hasNewUnwatchedEpisode(row, now)).toBe(false);
  row.seasons[0].watched.pop();
  row.seasons[0].hidden = true;
  expect(hasNewUnwatchedEpisode(row, now)).toBe(false);
});
