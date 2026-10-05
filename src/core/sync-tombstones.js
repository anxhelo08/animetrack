import { validateLibrary } from './library-schema.js';

export const SYNC_SCHEMA = '14.26.0';
export const TOMBSTONE_TTL = 60 * 86400000;
export function timestampMap(value, now = Date.now(), prune = false) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(
      ([, stamp]) =>
        Number.isFinite(Date.parse(stamp)) && (!prune || Date.parse(stamp) >= now - TOMBSTONE_TTL),
    ),
  );
}
/** Write the untouched payload before adding fields. A failed backup aborts migration. */
export function migrateSyncLibrary(value, storage, key, original = value) {
  validateLibrary(value);
  if (value.syncSchema === SYNC_SCHEMA) return value;
  const backup = key + '_before_sync_1426';
  if (storage.getItem(backup) === null) storage.setItem(backup, JSON.stringify(original));
  return {
    ...value,
    syncSchema: SYNC_SCHEMA,
    deleted: timestampMap(value.deleted),
    anime: value.anime.map((a) => ({
      ...a,
      seasons: (a.seasons || []).map((s) => ({
        ...s,
        unwatched: timestampMap(s.unwatched),
        watchedAt: {
          ...Object.fromEntries(
            (s.watched || []).map((n) => [
              n,
              new Date(
                Number.isFinite(Date.parse(a.updatedAt || a.createdAt))
                  ? Date.parse(a.updatedAt || a.createdAt)
                  : 0,
              ).toISOString(),
            ]),
          ),
          ...timestampMap(s.watchedAt),
        },
      })),
    })),
  };
}
const latestTimes = (a = {}, b = {}) =>
  Object.fromEntries(
    [...new Set([...Object.keys(a), ...Object.keys(b)])].map((k) => [
      k,
      Date.parse(a[k]) > (Date.parse(b[k]) || 0) ? a[k] : b[k] || a[k],
    ]),
  );
export function captureSyncState(value) {
  return {
    deleted: { ...(value.deleted || {}) },
    anime: new Map(
      (value.anime || []).map((a) => [
        a.id,
        new Map(
          (a.seasons || []).map((s) => [
            s.id,
            {
              watched: new Set(s.watched || []),
              unwatched: { ...(s.unwatched || {}) },
              watchedAt: { ...(s.watchedAt || {}) },
            },
          ]),
        ),
      ]),
    ),
  };
}
/** Capture intentional removals centrally, including editor/bulk/undo mutations. */
export function recordSyncChanges(previous, value, stamp) {
  const at = Date.parse(stamp);
  value.deleted = timestampMap(latestTimes(previous.deleted, value.deleted), at, true);
  const current = new Set(value.anime.map((a) => a.id));
  for (const id of previous.anime.keys()) if (!current.has(id)) value.deleted[id] = stamp;
  for (const a of value.anime) {
    for (const s of a.seasons || []) {
      const before = previous.anime.get(a.id)?.get(s.id);
      const old = before?.watched || new Set();
      const watched = new Set(s.watched || []);
      s.unwatched = timestampMap(latestTimes(before?.unwatched, s.unwatched), at, true);
      s.watchedAt = timestampMap(latestTimes(before?.watchedAt, s.watchedAt));
      for (const n of old) if (!watched.has(n)) s.unwatched[n] = stamp;
      for (const n of watched) if (!old.has(n)) s.watchedAt[n] = stamp;
    }
  }
}
