import { createRequestCache } from '../core/request-cache.js';
const cache = createRequestCache();
export const retryWeebCentral = () => cache.retryFailures();
export async function weebCentralCatalog(action, params = {}, signal) {
  const query = new URLSearchParams({ action, ...params });
  // The same fixed public metadata endpoint works in the browser and background Edge checks.
  const url =
    (typeof document === 'undefined' ? 'https://animetrack-flax.vercel.app' : '') +
    '/api/weebcentral?' +
    query;
  return cache(
    url,
    async () => {
      const response = await fetch(url, {
        credentials: 'omit',
        signal: AbortSignal.timeout(action === 'search' ? 6000 : 25000),
      });
      if (!response.ok) throw Error('WeebCentral HTTP ' + response.status);
      return response.json();
    },
    { signal, ttl: 10 * 60000 },
  );
}
