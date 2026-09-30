import { expect, test } from 'vitest';
import { createLibraryModel } from '../../src/core/library-model.js';

const model = createLibraryModel();
const series = () => ({
  id: 'a',
  title: 'Series',
  status: 'watching',
  seasons: [
    { id: 'tv1', format: 'TV', total: 2, watched: [1, 2] },
    { id: 'film', format: 'MOVIE', total: 1, watched: [1] },
    { id: 'hidden', format: 'TV', total: 10, watched: [1], hidden: true },
    { id: 'tv2', format: 'TV', total: 3, watched: [1] },
  ],
});

test('normalization retains hidden parts, aliases, provider identities and private episode data', () => {
  const raw = series();
  raw.mergedIds = ['old-id'];
  raw.providerIds = ['al:123'];
  raw.seasons[3].episodes = [
    { number: 1, myNote: 'Private', personalRating: 8, fillerManual: false },
  ];
  const before = JSON.stringify(raw),
    normalized = model.normalized(raw);
  expect(JSON.stringify(raw)).toBe(before);
  expect(normalized.mergedIds).toEqual(['old-id']);
  expect(normalized.providerIds).toEqual(['al:123']);
  expect(normalized.seasons[2].hidden).toBe(true);
  expect(normalized.seasons[3].episodes[0]).toMatchObject({
    myNote: 'Private',
    personalRating: 8,
    fillerManual: false,
  });
});

test('hidden parts never inflate progress or shift the next TV season', () => {
  const value = model.normalized(series());
  expect(model.count(value)).toBe(4);
  expect(model.releasedTotal(value)).toBe(6);
  const next = model.nextSeasonEp(value);
  expect(next.n).toBe(2);
  expect(next.season.id).toBe('tv2');
  expect(model.seasonNumberFor(value, next.season)).toBe(2);
});

test('future episodes cannot become available through planned totals', () => {
  const value = model.normalized({
    title: 'Future',
    status: 'watching',
    seasons: [
      {
        id: 's',
        format: 'TV',
        total: 12,
        watched: [1, 2],
        releaseStatus: 'RELEASING',
        airedCount: 3,
      },
    ],
  });
  expect(model.releasedTotal(value)).toBe(3);
  expect(model.nextSeasonEp(value).n).toBe(3);
  value.seasons[0].watched = [1, 2, 3];
  model.releasedStatusAfterWatch(value, true);
  expect(value.status).toBe('watching');
  expect(model.nextSeasonEp(value)).toBeNull();
});

test('release and arc providers are explicit and isolated between model instances', () => {
  const custom = createLibraryModel({
    releasedTV: () => 7,
    normalizeArc: (arc) => ({ ...arc, title: 'Checked' }),
  });
  const value = custom.normalized({
    title: 'TV',
    seasons: [{ total: 10, watched: [], arcRatings: [{ title: 'Raw' }] }],
  });
  expect(custom.releasedCount(value.seasons[0])).toBe(7);
  expect(model.releasedCount(value.seasons[0])).toBe(10);
  expect(value.seasons[0].arcRatings[0].title).toBe('Checked');
});

test('preferences retain valid lists and reminders while excluding invalid imported values', () => {
  const prefs = model.normalizePreferences({
    weeklyGoal: 999,
    homeQueue: ['a', 'a'],
    shareFriendActivity: true,
    customLists: [
      { id: 'list-valid', title: ' My list ', animeIds: ['a', 'a'] },
      { id: 'invalid', title: 'Bad' },
    ],
    calendarReminders: { a: 30, b: 999 },
  });
  expect(prefs.weeklyGoal).toBe(200);
  expect(prefs.homeQueue).toEqual(['a']);
  expect(prefs.shareFriendActivity).toBe(true);
  expect(prefs.customLists).toHaveLength(1);
  expect(prefs.customLists[0].animeIds).toEqual(['a']);
});
