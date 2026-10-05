import { expect, test } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { createIndexedLibrary } from '../../src/core/indexed-library.js';
const key = 'animetrack_user_owner';
const payload = (n) => ({
  anime: [
    {
      id: 'a',
      title: 'Stored',
      seasons: [{ id: 's', total: 12, watched: Array.from({ length: n }, (_, i) => i + 1) }],
    },
  ],
  history: [],
  preferences: {},
});
function legacy() {
  const values = new Map();
  return {
    values,
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, String(v)),
    removeItem: (k) => values.delete(k),
    key: (i) => [...values.keys()][i] ?? null,
    get length() {
      return values.size;
    },
  };
}
async function setup() {
  const raw = legacy(),
    indexedDB = new IDBFactory(),
    repo = createIndexedLibrary(raw, { indexedDB });
  return { raw, indexedDB, repo };
}
async function row(indexedDB, store, key, change) {
  const db = await new Promise((ok, no) => {
    const r = indexedDB.open('animetrack-library');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
  const result = await new Promise((ok, no) => {
    const tx = db.transaction(store, change ? 'readwrite' : 'readonly'),
      r = tx.objectStore(store).get(key);
    r.onsuccess = () => {
      if (change) tx.objectStore(store).put(change(r.result));
      else ok(r.result);
    };
    tx.oncomplete = () => change && ok();
    tx.onerror = () => no(tx.error);
  });
  db.close();
  return result;
}

test('legacy migration verifies one atomic per-owner snapshot with journal and revision', async () => {
  const { raw, indexedDB, repo } = await setup();
  raw.setItem(key, JSON.stringify(payload(2)));
  raw.setItem(key + '_pending_126', JSON.stringify({ baseRevision: 'base', savedAt: 123 }));
  raw.setItem(key + '_revision_126', 'base');
  await repo.prepare();
  const record = await row(indexedDB, 'libraries', key);
  expect(record.hash).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.parse(record.snapshot)).toEqual(payload(2));
  expect(JSON.parse(record.pending).baseRevision).toBe('base');
  expect(record.revision).toBe('base');
  expect(raw.getItem(key)).not.toBeNull();
  repo.close();
});
test('IndexedDB can recover when the legacy snapshot is missing without borrowing another owner', async () => {
  const { raw, indexedDB, repo } = await setup();
  raw.setItem(key, JSON.stringify(payload(3)));
  raw.setItem('animetrack_user_other', JSON.stringify(payload(8)));
  await repo.prepare();
  repo.close();
  raw.removeItem(key);
  const next = createIndexedLibrary(raw, { indexedDB });
  await next.prepare();
  expect(JSON.parse(next.storage.getItem(key))).toEqual(payload(3));
  expect(next.storage.getItem('animetrack_user_unknown')).toBeNull();
  next.close();
});
test('corrupt main record uses a checksum-verified recovery copy and retains the corrupt record', async () => {
  const { raw, indexedDB, repo } = await setup();
  raw.setItem(key, JSON.stringify(payload(1)));
  await repo.prepare();
  repo.storage.setItem(key, JSON.stringify(payload(2)));
  await repo.flush();
  repo.close();
  raw.removeItem(key);
  await row(indexedDB, 'libraries', key, (value) => ({
    ...value,
    snapshot: JSON.stringify(payload(11)),
  }));
  const next = createIndexedLibrary(raw, { indexedDB });
  await next.prepare();
  expect(JSON.parse(next.storage.getItem(key))).toEqual(payload(1));
  expect(next.status().mode).toBe('recovered');
  expect((await row(indexedDB, 'libraries', key)).snapshot).toBe(JSON.stringify(payload(11)));
  next.close();
});
test('failed write-ahead storage never reaches IndexedDB or announces a successful save', async () => {
  const { raw, indexedDB, repo } = await setup();
  raw.setItem(key, JSON.stringify(payload(1)));
  await repo.prepare();
  raw.setItem = () => {
    throw new DOMException('Full', 'QuotaExceededError');
  };
  expect(() => repo.storage.setItem(key, JSON.stringify(payload(2)))).toThrow();
  await repo.flush();
  expect(JSON.parse((await row(indexedDB, 'libraries', key)).snapshot)).toEqual(payload(1));
  repo.close();
});
test('cleanup refuses dirty state, preserves distinct backup/auth, removes only verified identical history', async () => {
  const { raw, repo } = await setup();
  raw.setItem(key, JSON.stringify(payload(1)));
  raw.setItem('sb-auth', 'private');
  await repo.prepare();
  const backup = key + '_before_tv_unify_120';
  raw.setItem(backup, JSON.stringify(payload(0)));
  expect(await repo.cleanup(key)).toBe(0);
  raw.setItem(backup, raw.getItem(key));
  expect(await repo.cleanup(key)).toBe(1);
  expect(raw.getItem(key)).not.toBeNull();
  expect(raw.getItem('sb-auth')).toBe('private');
  repo.storage.setItem(
    key + '_pending_126',
    JSON.stringify({ baseRevision: null, savedAt: Date.now() }),
  );
  await expect(repo.cleanup(key)).rejects.toThrow(/pritje/);
  repo.close();
});
test('queued rapid saves commit the newest snapshot and account deletion removes its DB copies only', async () => {
  const { raw, indexedDB, repo } = await setup();
  await repo.prepare();
  for (let i = 1; i <= 20; i++) repo.storage.setItem(key, JSON.stringify(payload(i)));
  repo.storage.setItem('animetrack_user_other', JSON.stringify(payload(4)));
  await repo.flush();
  expect(JSON.parse((await row(indexedDB, 'libraries', key)).snapshot)).toEqual(payload(20));
  await repo.forget(key);
  expect(await row(indexedDB, 'libraries', key)).toBeUndefined();
  expect(await row(indexedDB, 'recovery', key)).toBeUndefined();
  expect(await row(indexedDB, 'libraries', 'animetrack_user_other')).toBeTruthy();
  repo.close();
});
test('unavailable IndexedDB leaves the legacy library and pending journal usable', async () => {
  const raw = legacy();
  raw.setItem(key, JSON.stringify(payload(2)));
  const repo = createIndexedLibrary(raw, { indexedDB: null });
  await repo.prepare();
  expect(repo.status().mode).toBe('legacy');
  expect(JSON.parse(repo.storage.getItem(key))).toEqual(payload(2));
  repo.storage.setItem(key, JSON.stringify(payload(3)));
  expect(JSON.parse(raw.getItem(key))).toEqual(payload(3));
});

test('deletion while IndexedDB is unavailable cannot resurrect its recovery copy on a later boot', async () => {
  const { raw, indexedDB, repo } = await setup();
  raw.setItem(key, JSON.stringify(payload(2)));
  await repo.prepare();
  repo.close();
  const blocked = createIndexedLibrary(raw, { indexedDB: null });
  await blocked.prepare();
  await blocked.forget(key);
  expect(raw.getItem(key + '_deleted_142')).toBe('1');
  const next = createIndexedLibrary(raw, { indexedDB });
  await next.prepare();
  expect(next.storage.getItem(key)).toBeNull();
  expect(await row(indexedDB, 'libraries', key)).toBeUndefined();
  expect(raw.getItem(key + '_deleted_142')).toBeNull();
  next.close();
});

test('two tabs racing to flush shared write-ahead data keep the newest save', async () => {
  const { raw, indexedDB, repo } = await setup();
  raw.setItem(key, JSON.stringify(payload(1)));
  await repo.prepare();
  const second = createIndexedLibrary(raw, { indexedDB });
  await second.prepare();
  repo.storage.setItem(key, JSON.stringify(payload(2)));
  second.storage.setItem(key, JSON.stringify(payload(3)));
  await Promise.all([repo.flush(), second.flush()]);
  expect(JSON.parse((await row(indexedDB, 'libraries', key)).snapshot)).toEqual(payload(3));
  repo.close();
  second.close();
});
test('snapshot and pending base are recovered together after all legacy owner keys disappear', async () => {
  const { raw, indexedDB, repo } = await setup();
  raw.setItem(key, JSON.stringify(payload(2)));
  raw.setItem(key + '_pending_126', JSON.stringify({ baseRevision: 'original', savedAt: 123 }));
  raw.setItem(key + '_revision_126', 'original');
  await repo.prepare();
  repo.close();
  raw.values.clear();
  const next = createIndexedLibrary(raw, { indexedDB });
  await next.prepare();
  expect(JSON.parse(next.storage.getItem(key))).toEqual(payload(2));
  expect(JSON.parse(next.storage.getItem(key + '_pending_126')).baseRevision).toBe('original');
  expect(next.storage.getItem(key + '_revision_126')).toBe('original');
  next.close();
});

test('v1 database upgrades with exact original backups before freeing localStorage copies', async () => {
  const { raw, indexedDB, repo } = await setup();
  const old = JSON.stringify(payload(2)),
    historical = JSON.stringify(payload(1));
  raw.setItem(key, old);
  raw.setItem(key + '_before_sync_1426', historical);
  raw.setItem('sb-auth', 'untouched-token');
  const v1 = await new Promise((ok, no) => {
    const req = indexedDB.open('animetrack-library', 1);
    req.onupgradeneeded = () => {
      for (const name of ['libraries', 'recovery'])
        req.result.createObjectStore(name, { keyPath: 'key' });
    };
    req.onsuccess = () => ok(req.result);
    req.onerror = () => no(req.error);
  });
  v1.close();
  await repo.prepare();
  expect(raw.getItem(key + '_before_sync_1426')).toBeNull();
  expect(repo.storage.getItem(key + '_before_sync_1426')).toBe(historical);
  expect((await row(indexedDB, 'backups', key + '_before_storage_14261')).snapshot).toBe(old);
  expect(raw.getItem('sb-auth')).toBe('untouched-token');
  await repo.backup(key + '_before_sync_1426', JSON.stringify(payload(9)));
  expect(repo.storage.getItem(key + '_before_sync_1426')).toBe(historical);
  repo.close();
  const next = createIndexedLibrary(raw, { indexedDB });
  await next.prepare();
  expect(next.storage.getItem(key + '_before_sync_1426')).toBe(historical);
  next.close();
});

test('quota-limited write-ahead storage keeps full episode artwork, notes, progress and journal after reload', async () => {
  const { raw, indexedDB, repo } = await setup();
  const rich = payload(2);
  rich.anime[0].notes = 'Shënimi im 日本語 💜';
  rich.anime[0].seasons[0].episodes = Array.from({ length: 100 }, (_, i) => ({
    number: i + 1,
    title: 'Episodi ' + i,
    synopsis: 'Përshkrimi i episodit dhe historia. '.repeat(45),
    image: 'https://cdn.example.com/episode-' + i + '.jpg',
    myNote: 'Shënim personal ' + i,
  }));
  const original = JSON.stringify(rich);
  raw.setItem(key, original);
  raw.setItem(key + '_before_sync_1426', original);
  const write = raw.setItem;
  raw.setItem = (k, v) => {
    const size =
      [...raw.values].reduce((n, [name, value]) => n + (name === k ? 0 : value.length), 0) +
      String(v).length;
    if (size > 24000) throw new DOMException('iPhone quota', 'QuotaExceededError');
    write(k, v);
  };
  await repo.prepare();
  expect(repo.status(key).mode).toBe('verified');
  expect(raw.getItem(key)).toMatch(/^ATLS1:/);
  expect(raw.getItem(key).length).toBeLessThan(original.length / 4);
  expect(repo.storage.getItem(key)).toBe(original);
  rich.anime[0].seasons[0].watched.push(3);
  repo.storage.setItem(
    key + '_pending_126',
    JSON.stringify({ baseRevision: 'server-before', savedAt: 123 }),
  );
  repo.storage.setItem(key, JSON.stringify(rich));
  await repo.flush();
  repo.close();
  const next = createIndexedLibrary(raw, { indexedDB });
  await next.prepare();
  expect(JSON.parse(next.storage.getItem(key))).toEqual(rich);
  expect(JSON.parse(next.storage.getItem(key + '_pending_126')).baseRevision).toBe('server-before');
  expect(next.storage.getItem(key + '_before_storage_14261')).toBe(original);
  expect(next.storage.getItem(key + '_before_sync_1426')).toBe(original);
  next.close();
});

test('unavailable IndexedDB never removes a historical backup to make space', async () => {
  const raw = legacy(),
    old = JSON.stringify(payload(2));
  raw.setItem(key, old);
  raw.setItem(key + '_before_sync_1426', old);
  const repo = createIndexedLibrary(raw, { indexedDB: null });
  await repo.prepare();
  expect(raw.getItem(key)).toBe(old);
  expect(raw.getItem(key + '_before_sync_1426')).toBe(old);
});

test('a damaged archived original blocks conversion and leaves the readable library untouched', async () => {
  const { raw, indexedDB, repo } = await setup();
  const original = JSON.stringify(payload(2));
  raw.setItem(key, original);
  await repo.prepare();
  repo.close();
  await row(indexedDB, 'backups', key + '_before_storage_14261', (value) => ({
    ...value,
    snapshot: JSON.stringify(payload(9)),
  }));
  const next = createIndexedLibrary(raw, { indexedDB });
  await next.prepare();
  expect(next.status().mode).toBe('legacy');
  expect(raw.getItem(key)).toBe(original);
  expect(next.storage.getItem(key)).toBe(original);
  expect((await row(indexedDB, 'backups', key + '_before_storage_14261')).snapshot).toBe(
    JSON.stringify(payload(9)),
  );
  next.close();
});
