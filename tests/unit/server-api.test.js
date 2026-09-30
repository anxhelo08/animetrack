import { test, expect } from 'vitest';
import { createHandler as cinemeta } from '../../api/cinemeta.js';
import { createHandler as mal } from '../../api/mal.js';
import { allowProxy, createLocalLimiter, bearer, userAgent } from '../../server/http.js';
const response = () => ({
  headers: {},
  code: 0,
  body: null,
  setHeader(k, v) {
    this.headers[k] = v;
  },
  status(code) {
    this.code = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});
const request = (query = {}, method = 'GET', body) => ({
  query,
  method,
  body,
  headers: { authorization: 'Bearer synthetic-token' },
  socket: { remoteAddress: '127.0.0.1' },
});
const yes = async () => true;

test('Cinemeta locks the upstream host and escapes hostile search input', async () => {
  const calls = [],
    handler = cinemeta({
      limit: yes,
      fetchImpl: async (url, opt) => {
        calls.push({ url, opt });
        return Response.json({ metas: [] });
      },
    }),
    res = response();
  await handler(request({ mode: 'search', q: 'ab/https://evil.example?#' }), res);
  expect(res.code).toBe(200);
  expect(calls[0].url).toBe(
    'https://v3-cinemeta.strem.io/catalog/movie/top/search=ab%2Fhttps%3A%2F%2Fevil.example%3F%23.json',
  );
  expect(calls[0].opt.redirect).toBe('error');
  expect(calls[0].opt.signal).toBeInstanceOf(AbortSignal);
  expect(calls[0].opt.headers['User-Agent']).toBe(userAgent);
});
for (const query of [
  { mode: 'meta', id: 'tt123/../x' },
  { mode: 'meta', id: ['tt123'] },
  { mode: 'meta', id: 'tt' + '1'.repeat(13) },
  { mode: 'search', q: 'x' },
  { mode: 'search', q: 'x'.repeat(121) },
  { mode: 'unknown' },
])
  test('Cinemeta rejects malformed inputs ' + JSON.stringify(query), async () => {
    const res = response();
    await cinemeta({
      limit: () => {
        throw Error('must not consume a budget');
      },
      fetchImpl: () => {
        throw Error('must not fetch');
      },
    })(request(query), res);
    expect(res.code).toBe(400);
  });
test('rate-limited requests do not contact the provider or become publicly cached', async () => {
  const res = response();
  await cinemeta({ fetchImpl: async () => Response.json(false) })(
    request({ mode: 'meta', id: 'tt123' }),
    res,
  );
  expect(res.code).toBe(429);
  expect(res.headers['Retry-After']).toBe('60');
  expect(res.headers['Cache-Control']).toBe('no-store');
});
test('distributed quota fails closed during database failure', async () => {
  const res = response();
  expect(
    await allowProxy(request(), res, 'cinemeta', {
      local: () => true,
      fetchImpl: async () => {
        throw Error('private error');
      },
    }),
  ).toBe(false);
  expect(res.code).toBe(503);
  expect(JSON.stringify(res.body)).not.toContain('private error');
});
test('local limits cannot be evicted by identity flooding and expire', () => {
  let now = 0;
  const limited = createLocalLimiter({ limit: 2, maxKeys: 1, windowMs: 60, clock: () => now });
  expect(limited('a')).toBe(true);
  expect(limited('a')).toBe(true);
  expect(limited('a')).toBe(false);
  expect(limited('b')).toBe(false);
  now = 60;
  expect(limited('b')).toBe(true);
});
test('MAL requires a bounded bearer token', async () => {
  const req = request({ action: 'me' });
  req.headers = {};
  const res = response();
  await mal({
    limit: yes,
    fetchImpl: () => {
      throw Error('must not fetch');
    },
  })(req, res);
  expect(res.code).toBe(401);
  expect(bearer({ headers: { authorization: 'Bearer a b' } })).toBe('');
  expect(bearer({ headers: { authorization: 'Bearer ' + 'a'.repeat(8200) } })).toBe('');
});
for (const body of [
  { status: 'completed', score: 8.5, num_watched_episodes: 1 },
  { status: 'completed', score: 8, num_watched_episodes: -1 },
  { status: 'admin', score: 1, num_watched_episodes: 1 },
  'bad JSON',
])
  test('MAL rejects invalid updates ' + JSON.stringify(body), async () => {
    const res = response();
    await mal({
      limit: () => {
        throw Error('must not consume a budget');
      },
    })(request({ action: 'update', id: '20' }, 'PATCH', body), res);
    expect(res.code).toBe(400);
  });
test('MAL forwards only approved update fields to the fixed provider endpoint', async () => {
  let sent;
  const res = response();
  await mal({
    limit: yes,
    fetchImpl: async (url, opt) => {
      sent = { url, opt };
      return Response.json({ status: 'completed' });
    },
  })(
    request({ action: 'update', id: '20' }, 'PATCH', {
      status: 'completed',
      score: 8,
      num_watched_episodes: 12,
      url: 'https://evil.example',
      is_rewatching: true,
    }),
    res,
  );
  expect(res.code).toBe(200);
  expect(sent.url).toBe('https://api.myanimelist.net/v2/anime/20/my_list_status');
  expect([...sent.opt.body.keys()]).toEqual(['status', 'num_watched_episodes', 'score']);
  expect(res.headers['Cache-Control']).toBe('no-store');
});
test('upstream redirects and errors do not expose provider details', async () => {
  const res = response();
  await mal({
    limit: yes,
    fetchImpl: async () => Response.json({ message: 'secret-provider-detail' }, { status: 500 }),
  })(request({ action: 'me' }), res);
  expect(res.code).toBe(502);
  expect(JSON.stringify(res.body)).not.toContain('secret-provider-detail');
});
