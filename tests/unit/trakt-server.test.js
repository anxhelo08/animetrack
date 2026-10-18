import { expect, it } from 'vitest';
import {
  createTraktService,
  exportCandidates,
} from '../../supabase/functions/anime-connected/trakt.js';
import { seal, open } from '../../supabase/functions/anime-account/vault.js';
const uid = '11111111-1111-4111-8111-111111111111',
  secret = 'test-only-secret-'.repeat(4);
function fixture() {
  const tables = { anime_trakt_connections: [], anime_trakt_plans: [], anime_libraries: [] },
    calls = [];
  let clock = Date.parse('2026-10-18T12:00:00Z'),
    handler = async () => new Response('{}');
  const admin = {
    from(name) {
      let filters = [],
        operation = 'read',
        value,
        one = false,
        conflict = 'id';
      const q = {
        select() {
          return q;
        },
        eq(k, v) {
          filters.push((r) => r[k] === v);
          return q;
        },
        maybeSingle() {
          one = true;
          return q;
        },
        update(v) {
          operation = 'update';
          value = v;
          return q;
        },
        insert(v) {
          operation = 'insert';
          value = v;
          return q;
        },
        upsert(v, opts) {
          operation = 'upsert';
          value = v;
          conflict = opts?.onConflict || 'id';
          return q;
        },
        delete() {
          operation = 'delete';
          return q;
        },
        then(resolve) {
          let rows = tables[name].filter((r) => filters.every((f) => f(r)));
          if (operation === 'update') rows.forEach((r) => Object.assign(r, value));
          if (operation === 'insert') {
            rows = [{ status: 'pending', ...value }];
            tables[name].push(...rows);
          }
          if (operation === 'upsert') {
            const found = tables[name].find((r) => r[conflict] === value[conflict]);
            if (found) {
              Object.assign(found, value);
              rows = [found];
            } else {
              rows = [value];
              tables[name].push(value);
            }
          }
          if (operation === 'delete') tables[name] = tables[name].filter((r) => !rows.includes(r));
          return Promise.resolve({ data: one ? rows[0] || null : rows, error: null }).then(resolve);
        },
      };
      return q;
    },
  };
  const service = createTraktService({
    admin,
    storage: async (q) => (await q).data,
    env: (k) =>
      k === 'SUPABASE_SERVICE_ROLE_KEY'
        ? secret
        : k === 'TRAKT_CLIENT_ID'
          ? 'client'
          : k === 'TRAKT_CLIENT_SECRET'
            ? 'client-secret'
            : '',
    now: () => clock,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return handler(url, options);
    },
  });
  return {
    service,
    tables,
    calls,
    advance: (n) => (clock += n),
    now: () => clock,
    fetch: (fn) => (handler = fn),
    connect: async () =>
      tables.anime_trakt_connections.push({
        owner_id: uid,
        revision: 1,
        encrypted: await seal(
          {
            owner: uid,
            access_token: 'private-access',
            refresh_token: 'private-refresh',
            expiresAt: clock + 3600000,
          },
          secret,
        ),
      }),
  };
}
it('device flow keeps credentials encrypted, enforces polling interval and reports public state only', async () => {
  const f = fixture();
  f.fetch(
    async (url) =>
      new Response(
        JSON.stringify(
          url.endsWith('/code')
            ? { device_code: 'private-device', user_code: 'ABCD1234', interval: 5, expires_in: 600 }
            : {
                access_token: 'private-access',
                refresh_token: 'private-refresh',
                expires_in: 3600,
              },
        ),
      ),
  );
  const start = await f.service.action(uid, { action: 'trakt-connect' });
  expect(start.userCode).toBe('ABCD1234');
  expect(JSON.stringify(start)).not.toContain('private-device');
  expect(f.tables.anime_trakt_connections[0].encrypted).not.toContain('private-device');
  expect((await f.service.action(uid, { action: 'trakt-poll' })).pending).toBe(true);
  expect(f.calls).toHaveLength(1);
  f.advance(5000);
  expect((await f.service.action(uid, { action: 'trakt-poll' })).connected).toBe(true);
  const status = await f.service.status(uid);
  expect(status).toEqual({ configured: true, connected: true, pending: false });
  expect(JSON.stringify(status)).not.toContain('private-');
  const data = await open(f.tables.anime_trakt_connections[0].encrypted, secret);
  expect(data.access_token).toBe('private-access');
});
it('export requires exact episode identities and never guesses a show season from an episode number', () => {
  const payload = {
    anime: [
      {
        id: 'a',
        title: 'Anime',
        imdbId: 'tt1234',
        format: 'TV',
        seasons: [{ id: 's', episodes: [{ number: 1, traktId: 77, personalRating: 8 }] }],
      },
    ],
    history: [
      { id: 'a', seasonId: 's', episode: 1, action: 'watched', date: '2026-10-01T12:00:00Z' },
      { id: 'a', seasonId: 's', episode: 2, action: 'watched', date: '2026-10-02T12:00:00Z' },
    ],
  };
  expect(exportCandidates(payload)).toHaveLength(1);
  expect(exportCandidates(payload)[0].ids).toEqual({ trakt: 77 });
  expect(exportCandidates(payload, 'ratings')).toEqual([
    expect.objectContaining({ type: 'episodes', ids: { trakt: 77 }, rating: 8 }),
  ]);
});
it('preview excludes existing remote history and consumes a selected export plan once', async () => {
  const f = fixture();
  await f.connect();
  f.tables.anime_libraries.push({
    user_id: uid,
    payload: {
      anime: [{ id: 'a', title: 'Movie', format: 'MOVIE', imdbId: 'tt1234' }],
      history: [
        { eventId: 'old', id: 'a', action: 'watched', date: '2026-10-01T12:00:00Z' },
        { eventId: 'new', id: 'a', action: 'watched', date: '2026-10-02T12:00:00Z' },
      ],
    },
  });
  f.fetch(
    async (url, opts) =>
      new Response(
        JSON.stringify(
          opts.method === 'GET'
            ? [{ movie: { ids: { imdb: 'tt1234' } }, watched_at: '2026-10-01T12:00:00Z' }]
            : { added: { movies: 1 }, existing: { movies: 0 }, not_found: { movies: [] } },
        ),
      ),
  );
  const plan = await f.service.action(uid, { action: 'trakt-export-preview' });
  expect(plan.rows).toHaveLength(1);
  expect(plan.skipped).toBe(1);
  expect(
    await f.service.action(uid, {
      action: 'trakt-export-apply',
      planId: plan.planId,
      keys: ['new'],
    }),
  ).toEqual({ added: 1, existing: 0, missing: 0 });
  await expect(
    f.service.action(uid, { action: 'trakt-export-apply', planId: plan.planId, keys: ['new'] }),
  ).rejects.toThrow('përdorur');
  expect(f.calls.filter((c) => c.options.method === 'POST')).toHaveLength(1);
});
it('expired tokens rotate server-side and a failed export cannot automatically retry an ambiguous write', async () => {
  const f = fixture();
  await f.connect();
  f.advance(3600000);
  f.fetch(
    async (url) =>
      new Response(
        JSON.stringify(
          url.endsWith('/oauth/token')
            ? { access_token: 'rotated', refresh_token: 'rotated-refresh', expires_in: 3600 }
            : [],
        ),
      ),
  );
  await f.service.action(uid, { action: 'trakt-private-page', kind: 'history' });
  const value = await open(f.tables.anime_trakt_connections[0].encrypted, secret);
  expect(value.refresh_token).toBe('rotated-refresh');
  expect(f.calls[1].options.headers.Authorization).toBe('Bearer rotated');
  f.tables.anime_trakt_plans.push({
    id: 'plan',
    owner_id: uid,
    status: 'pending',
    expires_at: new Date(f.now() + 60000).toISOString(),
    payload: {
      kind: 'history',
      rows: [
        { key: 'k', type: 'episodes', ids: { trakt: 77 }, watched_at: '2026-10-01T12:00:00Z' },
      ],
    },
  });
  f.fetch(async () => {
    throw Error('network outcome unknown');
  });
  await expect(
    f.service.action(uid, { action: 'trakt-export-apply', planId: 'plan', keys: ['k'] }),
  ).rejects.toThrow();
  expect(f.tables.anime_trakt_plans[0].status).toBe('running');
  await expect(
    f.service.action(uid, { action: 'trakt-export-apply', planId: 'plan', keys: ['k'] }),
  ).rejects.toThrow('përdorur');
});

it('a plan from another account cannot be applied and expired authorization never polls Trakt', async () => {
  const f = fixture();
  await f.connect();
  f.tables.anime_trakt_plans.push({
    id: 'foreign',
    owner_id: 'another-user',
    status: 'pending',
    expires_at: new Date(f.now() + 60000).toISOString(),
    payload: { kind: 'history', rows: [] },
  });
  await expect(
    f.service.action(uid, { action: 'trakt-export-apply', planId: 'foreign', keys: ['x'] }),
  ).rejects.toThrow('skadoi');
  expect(f.calls).toHaveLength(0);
  f.tables.anime_trakt_connections[0].encrypted = await seal(
    { owner: uid, device_code: 'expired', expiresAt: f.now() - 1, interval: 5 },
    secret,
  );
  await expect(f.service.action(uid, { action: 'trakt-poll' })).rejects.toThrow('skadoi');
  expect(f.calls).toHaveLength(0);
});

it('parallel provider requests acquire a single lease before rotating a refresh token', async () => {
  const f = fixture();
  await f.connect();
  f.advance(3600000);
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  f.fetch(async (url) => {
    if (url.endsWith('/oauth/token')) {
      await gate;
      return new Response(
        JSON.stringify({ access_token: 'next', refresh_token: 'next-refresh', expires_in: 3600 }),
      );
    }
    return new Response('[]');
  });
  const first = f.service.action(uid, { action: 'trakt-private-page', kind: 'history' });
  await expect.poll(() => f.calls.length).toBe(1);
  await expect(
    f.service.action(uid, { action: 'trakt-private-page', kind: 'history' }),
  ).rejects.toThrow('proces');
  release();
  await first;
  expect(f.calls.filter((c) => c.url.endsWith('/oauth/token'))).toHaveLength(1);
});
