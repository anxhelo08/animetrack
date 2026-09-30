import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
export const userAgent = `AnimeTrack/${version} (+https://animetrack-flax.vercel.app)`;
const cloudURL = 'https://kwherbtspqirfrehqlfd.supabase.co';
const publicKey = 'sb_publishable_PkykF4PN91KTlpflm640Rg_Z0oEER0m';

export function createLocalLimiter({
  limit = 30,
  windowMs = 60000,
  maxKeys = 10000,
  clock = Date.now,
} = {}) {
  const buckets = new Map();
  return (key) => {
    const now = clock();
    for (const [id, b] of buckets) if (b.until <= now) buckets.delete(id);
    let b = buckets.get(key);
    if (!b) {
      // A flood of new identities cannot evict existing limits.
      if (buckets.size >= maxKeys) return false;
      b = { until: now + windowMs, count: 0 };
      buckets.set(key, b);
    }
    return ++b.count <= limit;
  };
}
const localLimit = createLocalLimiter();
export const bearer = (req) => {
  const h = req.headers?.authorization;
  if (typeof h !== 'string' || h.length > 8192) return '';
  return /^Bearer ([^\s]+)$/i.exec(h)?.[1] || '';
};
export async function allowProxy(req, res, scope, { fetchImpl = fetch, local = localLimit } = {}) {
  // Vercel sets this header; arbitrary x-forwarded-for supplied by a client is ignored.
  const ip = req.headers?.['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const id = createHash('sha256')
    .update(scope + ':' + String(ip).slice(0, 256))
    .digest('hex');
  res.setHeader('Cache-Control', 'no-store');
  if (!local(id)) {
    res.setHeader('Retry-After', '60');
    res.status(429).json({ error: 'Too many requests. Try again later.' });
    return false;
  }
  try {
    const r = await fetchImpl(cloudURL + '/rest/v1/rpc/anime_consume_proxy_budget', {
      method: 'POST',
      headers: { apikey: publicKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_scope: scope }),
      signal: AbortSignal.timeout(4000),
      redirect: 'error',
    });
    if (!r.ok) throw new Error('Budget unavailable');
    const allowed = await r.json();
    if (allowed !== true) {
      res.setHeader('Retry-After', '60');
      res.status(429).json({ error: 'Too many requests. Try again later.' });
      return false;
    }
    return true;
  } catch {
    res.setHeader('Retry-After', '30');
    res.status(503).json({ error: 'Service temporarily unavailable. Try again later.' });
    return false;
  }
}
export async function upstreamJSON(target, options = {}, fetchImpl = fetch) {
  const r = await fetchImpl(target, {
    ...options,
    redirect: 'error',
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok)
    return {
      status: [401, 403, 404, 429].includes(r.status) ? r.status : 502,
      data: { error: 'Provider request unavailable' },
    };
  return { status: 200, data: await r.json() };
}
