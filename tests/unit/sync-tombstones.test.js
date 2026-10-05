// @vitest-environment jsdom
import { test, expect } from 'vitest';
import '../../src/modules/cloud-local.js';
import { validateLibrary } from '../../src/core/library-schema.js';
import {
  migrateSyncLibrary,
  captureSyncState,
  recordSyncChanges,
} from '../../src/core/sync-tombstones.js';
import { createLibraryModel } from '../../src/core/library-model.js';
const api = window.ATCloudLocal12123;
const old = () => ({
  anime: [
    {
      id: 'a',
      title: 'Anime',
      updatedAt: '2026-10-01T12:00:00.000Z',
      seasons: [{ id: 's', total: 12, watched: [1, 2, 3, 4], episodes: [] }],
    },
  ],
  history: [],
  preferences: {},
});
const now = Date.parse('2026-10-05T12:00:00.000Z');
function migrate(value) {
  const data = new Map();
  return migrateSyncLibrary(
    value,
    { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) },
    'owner',
  );
}
test('old payload is backed up unchanged and normalization/compaction/hydration preserve sync fields', () => {
  const data = new Map(),
    original = old(),
    before = JSON.stringify(original);
  const migrated = migrateSyncLibrary(
    original,
    { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) },
    'owner',
  );
  expect(data.get('owner_before_sync_1426')).toBe(before);
  expect(JSON.stringify(original)).toBe(before);
  expect(migrated.anime[0].seasons[0].watched).toEqual([1, 2, 3, 4]);
  const baseline = captureSyncState(migrated);
  migrated.anime[0].seasons[0].watched = [1, 2, 3];
  recordSyncChanges(baseline, migrated, new Date(now).toISOString());
  const normalized = createLibraryModel().normalized(migrated.anime[0]);
  expect(normalized.seasons[0].unwatched[4]).toBe(new Date(now).toISOString());
  const compact = api.compact(migrated, now),
    rich = api.hydrate(compact, old(), now);
  validateLibrary(rich);
  expect(rich.anime[0].seasons[0].unwatched).toEqual(compact.anime[0].seasons[0].unwatched);
});
test('backup failure aborts migration without mutating the original library', () => {
  const value = old(),
    before = JSON.stringify(value);
  expect(() =>
    migrateSyncLibrary(
      value,
      {
        getItem: () => null,
        setItem: () => {
          throw Error('quota');
        },
      },
      'owner',
    ),
  ).toThrow('quota');
  expect(JSON.stringify(value)).toBe(before);
});
test('deletions win over old copies in both merge directions and newer explicit additions survive', () => {
  const a = migrate(old()),
    b = structuredClone(a),
    baseline = captureSyncState(a);
  a.anime = [];
  recordSyncChanges(baseline, a, new Date(now).toISOString());
  expect(api.merge(a, b, now).anime).toHaveLength(0);
  expect(api.merge(b, a, now).anime).toHaveLength(0);
  b.anime[0].updatedAt = new Date(now + 1000).toISOString();
  expect(api.merge(a, b, now).anime).toHaveLength(1);
});
test('unmark wins over stale progress; an independent newer watch does not restore it; a newer rewatch does', () => {
  const a = migrate(old()),
    b = structuredClone(a),
    baseline = captureSyncState(a);
  a.anime[0].seasons[0].watched = [1, 2, 3];
  recordSyncChanges(baseline, a, new Date(now).toISOString());
  const pc = captureSyncState(b);
  b.anime[0].seasons[0].watched.push(5);
  b.anime[0].updatedAt = new Date(now + 1000).toISOString();
  recordSyncChanges(pc, b, new Date(now + 1000).toISOString());
  for (const merged of [api.merge(a, b, now), api.merge(b, a, now)])
    expect(merged.anime[0].seasons[0].watched).toEqual([1, 2, 3, 5]);
  b.anime[0].seasons[0].watchedAt[4] = new Date(now + 2000).toISOString();
  expect(api.merge(a, b, now).anime[0].seasons[0].watched).toEqual([1, 2, 3, 4, 5]);
});
test('tombstones older than 60 days are pruned and malformed timestamps are rejected', () => {
  const value = old();
  value.deleted = {
    old: new Date(now - 61 * 86400000).toISOString(),
    recent: new Date(now - 59 * 86400000).toISOString(),
  };
  expect(api.compact(value, now).deleted).toEqual({ recent: value.deleted.recent });
  value.anime[0].seasons[0].unwatched = { '-1': 'bad' };
  expect(() => validateLibrary(value)).toThrow();
});
