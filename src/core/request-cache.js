const abortError = () => new DOMException('Request cancelled', 'AbortError');
function consume(work, signal) {
  if (!signal) return work.then(structuredClone);
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const abort = () => reject(abortError());
    signal.addEventListener('abort', abort, { once: true });
    work
      .then((value) => {
        if (!signal.aborted) resolve(structuredClone(value));
      }, reject)
      .finally(() => signal.removeEventListener('abort', abort));
  });
}

/** Public metadata only. Bounded memory, TTL, shared in-flight requests and failure cooldown. */
export function createRequestCache({ now = Date.now, limit = 100 } = {}) {
  const entries = new Map();
  function read(key, load, { ttl = 5 * 60000, signal } = {}) {
    if (signal?.aborted) return Promise.reject(abortError());
    let entry = entries.get(key);
    if (entry?.work) return consume(entry.work, signal);
    if (entry?.value !== undefined && entry.expires > now())
      return consume(Promise.resolve(entry.value), signal);
    if (entry?.error && entry.retryAt > now()) return Promise.reject(entry.error);
    entry ||= { failures: 0 };
    entries.delete(key);
    entries.set(key, entry);
    while (entries.size > limit) {
      entries.delete(entries.keys().next().value);
    }
    const work = Promise.resolve()
      .then(load)
      .then(
        (value) => {
          entry.value = structuredClone(value);
          entry.expires = now() + ttl;
          entry.failures = 0;
          entry.error = null;
          return entry.value;
        },
        (error) => {
          entry.value = undefined;
          entry.error = error;
          entry.failures++;
          entry.retryAfterUntil = now() + Math.min(300000, Number(error.retryAfter) || 0);
          entry.retryAt =
            now() +
            Math.max(
              Math.min(30000, 1000 * 2 ** Math.min(entry.failures - 1, 5)),
              Math.min(300000, Number(error.retryAfter) || 0),
            );
          throw error;
        },
      )
      .finally(() => {
        entry.work = null;
      });
    entry.work = work;
    return consume(work, signal);
  }
  read.retryFailures = () => {
    for (const [key, entry] of entries)
      if (entry.error && !entry.work && !(entry.retryAfterUntil > now())) entries.delete(key);
  };
  return read;
}

const read = createRequestCache();
export const retryCatalogRequests = () => read.retryFailures();
export function catalogJSON(url, { signal, ttl, timeoutMs = 15000, ...options } = {}) {
  const endpoint = new URL(url);
  if (
    ![
      'graphql.anilist.co',
      'api.jikan.moe',
      'api.mangadex.org',
      'api.mangaupdates.com',
      'api.tvmaze.com',
      'v3-cinemeta.strem.io',
    ].includes(endpoint.hostname) ||
    endpoint.protocol !== 'https:'
  )
    throw Error('Only public catalog endpoints can use this cache.');
  // Never let a future authenticated caller enter the public metadata cache.
  if (new Headers(options.headers).has('Authorization') || options.credentials === 'include')
    throw Error('Authenticated requests cannot use the catalog cache.');
  const key = JSON.stringify([url, options.method || 'GET', options.body || '']);
  return read(
    key,
    async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, {
          ...options,
          credentials: 'omit',
          signal: controller.signal,
        });
        if (!response.ok) {
          const error = new Error('Catalog HTTP ' + response.status);
          const retry = response.headers.get('Retry-After');
          error.retryAfter = /^\d+$/.test(retry || '')
            ? Number(retry) * 1000
            : Math.max(0, Date.parse(retry) - Date.now()) || 0;
          throw error;
        }
        const value = await response.json();
        if (value?.errors?.length) throw Error(value.errors[0]?.message || 'Catalog query failed');
        return value;
      } finally {
        clearTimeout(timer);
      }
    },
    { signal, ttl },
  );
}
