import { test, expect } from 'vitest';
import { createAccountHandler } from '../../supabase/functions/anime-account/handler.js';
import { seal, open } from '../../supabase/functions/anime-account/vault.js';
const secret = 'synthetic-vault-secret-with-at-least-32-characters';
const uid = '00000000-0000-4000-8000-000000000001';
function setup({
  active = true,
  recent = true,
  budget = true,
  auth = true,
  credential = null,
  fetchImpl = async () => Response.json({ data: { Viewer: { id: 7, name: 'Demo' } } }),
} = {}) {
  const calls = [],
    records = new Map(credential ? [['anilist', credential]] : []);
  const admin = {
    auth: {
      getUser: async (token) => ({
        data: {
          user: auth
            ? { id: uid, email: 'user@example.test', user_metadata: { display_name: 'Demo' } }
            : null,
        },
        error: null,
      }),
      admin: {
        deleteUser: async (id) => {
          calls.push({ deleted: id });
          return { error: null };
        },
      },
    },
    storage: {
      from: (bucket) => ({
        remove: async (names) => {
          calls.push({ bucket, names });
          return { error: null };
        },
      }),
    },
    rpc: async (name, input) => {
      calls.push({ rpc: name, input });
      return { data: [], error: null };
    },
    from: (table) => {
      const filters = {},
        q = {};
      let mutation = null;
      q.select = (columns) => {
        q.columns = columns;
        return q;
      };
      q.eq = (key, value) => {
        filters[key] = value;
        return q;
      };
      q.or = (value) => {
        filters.or = value;
        return q;
      };
      q.order = () => q;
      q.range = () => q;
      q.upsert = (row) => {
        mutation = row;
        records.set(row.provider, row.ciphertext);
        calls.push({ table, row });
        return Promise.resolve({ error: null });
      };
      q.delete = () => {
        q.deleting = true;
        return q;
      };
      q.maybeSingle = async () => {
        calls.push({ table, filters: { ...filters } });
        return {
          data: records.has(filters.provider)
            ? { ciphertext: records.get(filters.provider) }
            : null,
          error: null,
        };
      };
      q.then = (resolve, reject) => {
        calls.push({ table, filters: { ...filters }, columns: q.columns });
        if (q.deleting) records.delete(filters.provider);
        return Promise.resolve({
          data:
            table === 'anime_provider_credentials'
              ? [...records.keys()].map((provider) => ({ provider }))
              : [],
          error: null,
        }).then(resolve, reject);
      };
      return q;
    },
  };
  const caller = {
    rpc: async (name) => ({
      data:
        name === 'anime_has_active_session'
          ? active
          : name === 'anime_recent_session'
            ? recent
            : budget,
      error: null,
    }),
  };
  const handler = createAccountHandler({ admin, clientForToken: () => caller, secret, fetchImpl });
  const send = async (
    input,
    { authorization = 'Bearer test-session', origin = 'https://animetrack-flax.vercel.app' } = {},
  ) => {
    const r = await handler(
      new Request('https://edge.example', {
        method: 'POST',
        headers: {
          Authorization: authorization,
          Origin: origin,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      }),
    );
    return { status: r.status, body: await r.json(), headers: r.headers };
  };
  return { send, calls, records, handler };
}
test('vault encryption authenticates the ciphertext and randomizes every storage write', async () => {
  const first = await seal({ token: 'synthetic-provider-token' }, secret),
    second = await seal({ token: 'synthetic-provider-token' }, secret);
  expect(first).not.toBe(second);
  expect(first).not.toContain('synthetic-provider-token');
  expect((await open(first, secret)).token).toBe('synthetic-provider-token');
  await expect(open(first, 'another-secret-with-at-least-32-characters')).rejects.toThrow();
  const bytes = Uint8Array.from(atob(first), (c) => c.charCodeAt(0));
  bytes[15] ^= 1;
  await expect(open(btoa(String.fromCharCode(...bytes)), secret)).rejects.toThrow();
});
for (const options of [{ auth: false }, { active: false }])
  test(
    'unauthenticated or revoked sessions cannot read, export or delete an account ' +
      JSON.stringify(options),
    async () => {
      const { send, calls } = setup(options);
      for (const action of ['status', 'export', 'delete', 'connect'])
        expect(
          (
            await send({
              action,
              provider: 'anilist',
              token: 'provider-token',
              confirmation: 'FSHI LLOGARINE',
            })
          ).status,
        ).toBe(401);
      expect(calls).toEqual([]);
    },
  );
test('account requests require an allowed origin and enforce server budgets', async () => {
  const { send } = setup();
  expect((await send({ action: 'export' }, { origin: 'https://evil.example' })).status).toBe(403);
  expect((await setup({ budget: false }).send({ action: 'export' })).status).toBe(429);
});
test('provider credentials are assigned only to the verified account and never returned', async () => {
  const { send, calls, records } = setup();
  const result = await send({
    action: 'connect',
    provider: 'anilist',
    token: 'synthetic-provider-token',
    user_id: 'attacker',
  });
  expect(result.status).toBe(200);
  expect(result.body).toEqual({ connected: true, profile: { id: 7, name: 'Demo' } });
  const saved = calls.find((x) => x.row)?.row;
  expect(saved.user_id).toBe(uid);
  expect((await open(records.get('anilist'), secret)).token).toBe('synthetic-provider-token');
  const status = await send({ action: 'status' });
  expect(status.body).toEqual({ providers: ['anilist'] });
  expect(JSON.stringify(status.body)).not.toContain('ciphertext');
});
test('a provider proxy accepts fixed operations and does not execute arbitrary GraphQL', async () => {
  const credential = await seal(
      { token: 'synthetic-provider-token', userId: 7, name: 'Demo' },
      secret,
    ),
    upstream = [];
  const { send } = setup({
    credential,
    fetchImpl: async (url, opt) => {
      upstream.push({ url, body: JSON.parse(opt.body) });
      return Response.json({ data: { MediaListCollection: { lists: [] } } });
    },
  });
  const result = await send({
    action: 'provider',
    provider: 'anilist',
    operation: 'list',
    userId: 999,
    query: 'mutation { evil }',
  });
  expect(result.status).toBe(200);
  expect(upstream[0].url).toBe('https://graphql.anilist.co');
  expect(upstream[0].body.variables).toEqual({ userId: 7 });
  expect(upstream[0].body.query).not.toContain('evil');
  expect(
    (await send({ action: 'provider', provider: 'anilist', operation: 'arbitrary' })).status,
  ).toBe(400);
  expect(
    (
      await send({
        action: 'provider',
        provider: 'anilist',
        operation: 'update',
        id: 1,
        status: 'CURRENT',
        progress: -1,
        score: 5,
      })
    ).status,
  ).toBe(400);
  expect(upstream.length).toBe(1);
});
test('account export filters every table by the authenticated identity and excludes delivery secrets', async () => {
  const { send, calls } = setup();
  const r = await send({ action: 'export', user_id: 'attacker' });
  expect(r.status).toBe(200);
  expect(r.body.account.id).toBe(uid);
  for (const call of calls.filter((x) => x.table)) {
    expect(call.table).not.toBe('anime_provider_credentials');
    if (call.table === 'anime_friendships')
      expect(call.filters.or).toBe(`requester_id.eq.${uid},recipient_id.eq.${uid}`);
    else expect(Object.values(call.filters)).toContain(uid);
  }
  expect(calls.find((x) => x.table === 'anime_push_subscriptions').columns).toBe(
    'id,user_id,created_at,last_seen_at',
  );
});
test('account deletion requires explicit confirmation and recent reauthentication', async () => {
  const { send, calls } = setup();
  expect((await send({ action: 'delete' })).status).toBe(400);
  expect(calls).toEqual([]);
  const stale = setup({ recent: false });
  expect((await stale.send({ action: 'delete', confirmation: 'FSHI LLOGARINE' })).status).toBe(403);
  expect(stale.calls).toEqual([]);
  const result = await send({
    action: 'delete',
    confirmation: 'FSHI LLOGARINE',
    user_id: 'attacker',
  });
  expect(result.body).toEqual({ deleted: true });
  expect(calls.at(-1)).toEqual({ deleted: uid });
});
test('disconnect can remove only the current account credential', async () => {
  const { send, calls } = setup();
  expect((await send({ action: 'disconnect', provider: 'mal', user_id: 'attacker' })).status).toBe(
    200,
  );
  expect(calls.at(-1).filters).toEqual({ user_id: uid, provider: 'mal' });
});

test('manga sync sends MANGA queries and uses manga progress fields without accepting anime statuses', async () => {
  const credential = await seal({ token: 'provider-token', userId: 7, name: 'Demo' }, secret),
    requests = [];
  const { send } = setup({
    credential,
    fetchImpl: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) });
      return Response.json({ data: { MediaListCollection: { lists: [] } } });
    },
  });
  const result = await send({
    action: 'provider',
    provider: 'anilist',
    operation: 'list',
    mediaType: 'MANGA',
  });
  expect(result.status).toBe(200);
  expect(requests[0].body.query).toContain('type:MANGA');
  expect(requests[0].body.query).toContain('chapters');
  const invalid = await send({
    action: 'provider',
    provider: 'anilist',
    operation: 'list',
    mediaType: 'FILM',
  });
  expect(invalid.status).toBe(400);
});

test('MAL manga writes accept reading statuses and update chapters and volumes', async () => {
  const requests = [],
    { send } = setup({
      fetchImpl: async (url, options) => {
        requests.push({ url, options });
        return Response.json({ id: 9, name: 'Demo' });
      },
    });
  expect(
    (await send({ action: 'connect', provider: 'mal', token: 'test-provider-token' })).status,
  ).toBe(200);
  expect(
    (
      await send({
        action: 'provider',
        provider: 'mal',
        operation: 'update',
        mediaType: 'MANGA',
        id: 70,
        status: 'reading',
        progress: 5,
        volumesRead: 2,
        score: 8,
      })
    ).status,
  ).toBe(200);
  const request = requests.at(-1);
  expect(request.url).toContain('/manga/70/my_list_status');
  expect(request.options.body.get('num_chapters_read')).toBe('5');
  expect(request.options.body.get('num_volumes_read')).toBe('2');
  expect(
    (
      await send({
        action: 'provider',
        provider: 'mal',
        operation: 'update',
        mediaType: 'MANGA',
        id: 70,
        status: 'watching',
        progress: 5,
        score: 8,
      })
    ).status,
  ).toBe(400);
});
