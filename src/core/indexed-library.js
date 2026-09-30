import { validateLibrary } from './library-schema.js';

const mainKey = (key) =>
  key === 'animetrack_v1' || /^animetrack_user_[A-Za-z0-9-]{1,100}$/.test(key);
const ownerKey = (key) => {
  const base = key.replace(/_(pending|revision)_126$/, '');
  return mainKey(base) ? base : null;
};
const request = (req) =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
const done = (tx) =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(tx.error || Error('IndexedDB transaction aborted'));
  });
const content = (record) =>
  JSON.stringify({
    key: record.key,
    snapshot: record.snapshot,
    pending: record.pending,
    revision: record.revision,
  });
async function digest(record) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content(record)));
  return [...new Uint8Array(bytes)].map((n) => n.toString(16).padStart(2, '0')).join('');
}
async function valid(record) {
  if (
    !record ||
    record.version !== 1 ||
    !mainKey(record.key) ||
    typeof record.snapshot !== 'string'
  )
    return false;
  try {
    validateLibrary(JSON.parse(record.snapshot));
    if (record.pending !== null) {
      const pending = JSON.parse(record.pending);
      if (
        !pending ||
        typeof pending !== 'object' ||
        !('baseRevision' in pending) ||
        !(pending.baseRevision === null || typeof pending.baseRevision === 'string') ||
        !Number.isFinite(pending.savedAt)
      )
        return false;
    }
    if (!(record.revision === null || typeof record.revision === 'string')) return false;
    return record.hash === (await digest(record));
  } catch {
    return false;
  }
}

/** IndexedDB snapshots + synchronous write-ahead recovery journal. No credentials are copied. */
export function createIndexedLibrary(
  legacy,
  { indexedDB = globalThis.indexedDB, name = 'animetrack-library' } = {},
) {
  let db = null,
    serial = Promise.resolve(),
    queued = false,
    state = 'legacy',
    problem = '';
  const cleared = new Set();
  const records = new Map(),
    dirty = new Set(),
    removed = new Set(),
    listeners = new Set();
  const notify = () => {
    for (const listener of listeners)
      try {
        listener();
      } catch {}
  };
  const report = (error) => {
    state = 'legacy';
    problem = String(error?.message || error);
    notify();
  };
  function keys() {
    const found = new Set();
    for (let i = 0; i < legacy.length; i++) found.add(legacy.key(i));
    for (const key of records.keys())
      if (!removed.has(key)) {
        found.add(key);
        found.add(key + '_revision_126');
        if (records.get(key).pending) found.add(key + '_pending_126');
      }
    return [...found].filter(Boolean);
  }
  function getItem(key) {
    const raw = legacy.getItem(key);
    if (raw !== null) return raw;
    if (cleared.has(key)) return null;
    const owner = ownerKey(key),
      record = records.get(owner);
    if (!record || removed.has(owner)) return null;
    if (key !== owner && legacy.getItem(owner) !== null) return null;
    return key === owner
      ? record.snapshot
      : key.endsWith('_pending_126')
        ? record.pending
        : record.revision;
  }
  function bundle(key) {
    return {
      key,
      snapshot: getItem(key),
      pending: getItem(key + '_pending_126'),
      revision: getItem(key + '_revision_126'),
      version: 1,
    };
  }
  function schedule(key) {
    const owner = ownerKey(key);
    if (!owner) return;
    dirty.add(owner);
    notify();
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      serial = serial.then(flushDirty).catch(report);
    });
  }
  const storage = {
    getItem,
    setItem(key, value) {
      if (mainKey(key)) validateLibrary(JSON.parse(value));
      legacy.setItem(key, value);
      cleared.delete(key);
      if (mainKey(key)) removed.delete(key);
      schedule(key);
    },
    removeItem(key) {
      legacy.removeItem(key);
      const owner = ownerKey(key);
      if (mainKey(key)) {
        records.delete(key);
        removed.add(key);
      } else if (owner) cleared.add(key);
      schedule(key);
    },
    key(i) {
      return keys()[i] ?? null;
    },
    get length() {
      return keys().length;
    },
  };
  async function read(key, store = 'libraries') {
    if (!db) return null;
    return request(db.transaction(store).objectStore(store).get(key));
  }
  async function write(key) {
    if (!db) return;
    if (removed.has(key)) {
      const tx = db.transaction(['libraries', 'recovery'], 'readwrite'),
        complete = done(tx);
      tx.objectStore('libraries').delete(key);
      tx.objectStore('recovery').delete(key);
      await complete;
      legacy.removeItem(key + '_deleted_142');
      return;
    }
    const record = bundle(key);
    if (record.snapshot === null) return;
    validateLibrary(JSON.parse(record.snapshot));
    record.hash = await digest(record);
    record.savedAt = Date.now();
    if (!(await valid(record))) throw Error('Kopja lokale nuk kaloi verifikimin.');
    // Capture all three fields in one transaction, never snapshot and journal separately.
    const prior = await read(key);
    if (prior && prior.hash === record.hash && (await valid(prior))) {
      records.set(key, prior);
      return;
    }
    if (content(record) !== content(bundle(key))) {
      dirty.add(key);
      return;
    }
    const previousValid = await valid(prior);
    const tx = db.transaction(['libraries', 'recovery'], 'readwrite'),
      complete = done(tx);
    let stale = false;
    const check = tx.objectStore('libraries').get(key);
    check.onsuccess = () => {
      const live = check.result;
      if (content(record) !== content(bundle(key)) || live?.hash !== prior?.hash) {
        stale = true;
        tx.abort();
        return;
      }
      if (previousValid) tx.objectStore('recovery').put(prior);
      tx.objectStore('libraries').put(record);
    };
    await complete.catch((error) => {
      if (!stale) throw error;
    });
    if (stale) {
      dirty.add(key);
      return;
    }
    const verified = await read(key);
    if (!(await valid(verified)) || verified.hash !== record.hash) {
      dirty.add(key);
      throw Error('Kopja në IndexedDB nuk u verifikua.');
    }
    records.set(key, verified);
    state = 'verified';
    problem = '';
    notify();
  }
  async function flushDirty() {
    if (!db) return;
    // Re-read the write-ahead storage for each queued owner. A newer local save wins.
    for (let pass = 0; pass < 8 && dirty.size; pass++) {
      const owners = [...dirty];
      dirty.clear();
      for (const key of owners)
        try {
          await write(key);
        } catch (error) {
          dirty.add(key);
          report(error);
        }
      if (problem) break;
    }
  }
  async function prepare() {
    if (!indexedDB) {
      report(Error('IndexedDB nuk është e disponueshme.'));
      return;
    }
    try {
      if (!db)
        db = await new Promise((resolve, reject) => {
          const req = indexedDB.open(name, 1);
          let expired = false;
          const timer = setTimeout(() => {
            expired = true;
            reject(Error('IndexedDB është bllokuar; kopja ekzistuese ruhet.'));
          }, 1500);
          req.onupgradeneeded = () => {
            for (const store of ['libraries', 'recovery'])
              if (!req.result.objectStoreNames.contains(store))
                req.result.createObjectStore(store, { keyPath: 'key' });
          };
          req.onsuccess = () => {
            clearTimeout(timer);
            if (expired) {
              req.result.close();
              return;
            }
            resolve(req.result);
          };
          req.onerror = () => {
            clearTimeout(timer);
            reject(req.error);
          };
          req.onblocked = () => {
            clearTimeout(timer);
            expired = true;
            reject(Error('Mbyll skedën e vjetër për të hapur IndexedDB.'));
          };
        });
      problem = '';
      db.onversionchange = () => {
        db.close();
        db = null;
        report(Error('Ruajtja ndryshoi në një skedë tjetër. Rihap aplikacionin.'));
      };
      const rows = await request(db.transaction('libraries').objectStore('libraries').getAll());
      for (const record of rows) {
        if (legacy.getItem(record.key + '_deleted_142')) {
          removed.add(record.key);
          records.delete(record.key);
          dirty.add(record.key);
          continue;
        }
        if (await valid(record)) records.set(record.key, record);
        else {
          const recovery = await read(record.key, 'recovery');
          if (await valid(recovery)) {
            records.set(record.key, recovery);
            state = 'recovered';
            problem = 'Kopja e fundit kishte problem; u përdor kopja e rikuperimit.';
          } else report(Error('Një kopje e IndexedDB nuk kaloi kontrollin e integritetit.'));
        }
      }
      for (const key of keys()) if (mainKey(key) && legacy.getItem(key) !== null) dirty.add(key);
      await flushDirty();
      if (!problem) state = 'verified';
      notify();
    } catch (error) {
      report(error);
    }
  }
  async function flush() {
    for (let pass = 0; pass < 8; pass++) {
      await Promise.resolve();
      const work = serial;
      await work;
      if (work === serial) break;
    }
    await flushDirty();
    return status();
  }
  function status(key) {
    const record = records.get(key);
    const current = record && content(record) === content(bundle(key));
    return {
      mode: key && state === 'verified' && !current ? 'pending' : state,
      problem,
      pending: dirty.size,
      copies: records.size,
    };
  }
  async function cleanup(key) {
    if (!mainKey(key)) throw Error('Kopja nuk i përket bibliotekës.');
    await flush();
    const record = await read(key);
    if (!(await valid(record)) || getItem(key + '_pending_126') || record.snapshot !== getItem(key))
      throw Error('Kopja nuk është e verifikuar ose ka ndryshime në pritje.');
    // Only append-only historical copies can be pruned. Never remove the live WAL,
    // auth, pending journal or a distinct backup that contains recoverable data.
    const historical = key + '_before_tv_unify_120';
    if (legacy.getItem(historical) !== record.snapshot) return 0;
    legacy.removeItem(historical);
    notify();
    return 1;
  }
  async function refresh(key) {
    if (!mainKey(key) || !db) return;
    const record = await read(key);
    if (await valid(record)) records.set(key, record);
  }
  async function recovery(key) {
    const record = await read(key, 'recovery');
    if (!(await valid(record)))
      throw Error('Nuk ka kopje të verifikuar rikuperimi për këtë llogari.');
    return JSON.parse(record.snapshot);
  }
  async function forget(key) {
    if (!mainKey(key)) throw Error('Llogaria lokale nuk është e vlefshme.');
    legacy.setItem(key + '_deleted_142', '1');
    storage.removeItem(key);
    storage.removeItem(key + '_pending_126');
    storage.removeItem(key + '_revision_126');
    await flush();
  }
  return {
    storage,
    prepare,
    flush,
    status,
    cleanup,
    refresh,
    recovery,
    forget,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close: () => {
      db?.close();
      db = null;
    },
  };
}
