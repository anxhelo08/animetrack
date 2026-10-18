import { expect, it } from 'vitest';
import { createConnectedHandler } from '../../supabase/functions/anime-connected/handler.js';
const uid = '11111111-1111-4111-8111-111111111111',
  other = '22222222-2222-4222-8222-222222222222',
  listId = '33333333-3333-4333-8333-333333333333';
function fixture() {
  const tables = {
    anime_shared_lists: [{ id: listId, owner_id: uid, title: 'List', items: [], revision: 1 }],
    anime_list_members: [],
    anime_feature_records: [],
    anime_calendar_feeds: [],
    anime_profiles: [],
    anime_friendships: [],
    anime_libraries: [],
  };
  let user = uid,
    active = true;
  const admin = {
    auth: {
      getUser: async (token) =>
        token === 'valid'
          ? { data: { user: { id: user } }, error: null }
          : { data: {}, error: Error('bad') },
    },
    from(name) {
      let filters = [],
        op = 'select',
        payload,
        one = false;
      const q = {
        select() {
          return q;
        },
        eq(k, v) {
          filters.push((r) => r[k] === v);
          return q;
        },
        in(k, vs) {
          filters.push((r) => vs.includes(r[k]));
          return q;
        },
        or() {
          return q;
        },
        order() {
          return q;
        },
        maybeSingle() {
          one = true;
          return q;
        },
        single() {
          one = true;
          return q;
        },
        insert(v) {
          op = 'insert';
          payload = v;
          return q;
        },
        upsert(v) {
          op = 'insert';
          payload = v;
          return q;
        },
        delete() {
          op = 'delete';
          return q;
        },
        update(v) {
          op = 'update';
          payload = v;
          return q;
        },
        then(resolve) {
          let rows = tables[name].filter((r) => filters.every((f) => f(r)));
          if (op === 'insert') {
            const row = { id: crypto.randomUUID(), revision: 1, ...payload };
            tables[name].push(row);
            rows = [row];
          }
          if (op === 'update') for (const row of rows) Object.assign(row, payload);
          if (op === 'delete') tables[name] = tables[name].filter((r) => !rows.includes(r));
          return Promise.resolve({ data: one ? rows[0] || null : rows, error: null }).then(resolve);
        },
      };
      return q;
    },
  };
  const handler = createConnectedHandler({
    admin,
    clientForToken: () => ({
      rpc: async (name) => ({
        data: name === 'anime_has_active_session' ? active : true,
        error: null,
      }),
    }),
  });
  const send = (body, auth = 'valid') =>
    handler(
      new Request('https://example.supabase.co/functions/v1/anime-connected', {
        method: 'POST',
        headers: { authorization: 'Bearer ' + auth, origin: 'https://animetrack-flax.vercel.app' },
        body: JSON.stringify(body),
      }),
    );
  return {
    handler,
    send,
    tables,
    user: (id) => {
      user = id;
    },
    active: (value) => {
      active = value;
    },
  };
}
it('requires a real active session and rejects untrusted origins', async () => {
  const f = fixture();
  expect((await f.send({ action: 'state' }, 'invalid')).status).toBe(401);
  f.active(false);
  expect((await f.send({ action: 'state' })).status).toBe(401);
  expect(
    (
      await f.handler(
        new Request('https://example.test', {
          method: 'POST',
          headers: { origin: 'https://evil.test' },
          body: '{}',
        }),
      )
    ).status,
  ).toBe(403);
});
it('denies another account access to shared list contents and mutations', async () => {
  const f = fixture();
  f.user(other);
  expect(
    (
      await f.send({
        action: 'list-item',
        id: listId,
        revision: 1,
        item: { title: 'No', source: 'AniList', sourceId: '1' },
      })
    ).status,
  ).toBe(403);
  expect((await f.send({ action: 'list-delete', id: listId })).status).toBe(403);
  expect((await (await f.send({ action: 'state' })).json()).lists).toEqual([]);
  expect(f.tables.anime_shared_lists).toHaveLength(1);
});
it('editors can change sanitized items but cannot invite/delete; stale revisions cannot overwrite another edit', async () => {
  const f = fixture();
  f.tables.anime_list_members.push({ list_id: listId, user_id: other });
  f.user(other);
  expect(
    (
      await f.send({
        action: 'list-item',
        id: listId,
        revision: 1,
        item: { title: 'Title', source: 'AniList', sourceId: '1', notes: 'PRIVATE' },
      })
    ).status,
  ).toBe(200);
  expect(f.tables.anime_shared_lists[0].items[0]).not.toHaveProperty('notes');
  expect(
    (
      await f.send({
        action: 'list-item',
        id: listId,
        revision: 1,
        item: { title: 'Title', source: 'AniList', sourceId: '2' },
      })
    ).status,
  ).toBe(409);
  expect((await f.send({ action: 'list-member', id: listId, handle: 'someone' })).status).toBe(403);
  expect((await f.send({ action: 'list-delete', id: listId })).status).toBe(403);
});
it('calendar subscription stores only a hash and revocation makes the link unavailable', async () => {
  const f = fixture();
  const created = await (
    await f.send({ action: 'feed-create', options: { favorites: true } })
  ).json();
  const token = new URL(created.url).searchParams.get('feed');
  expect(f.tables.anime_calendar_feeds[0].token_hash).not.toBe(token);
  expect(f.tables.anime_calendar_feeds[0].options.favorites).toBe(true);
  expect((await f.handler(new Request(created.url))).status).toBe(200);
  await f.send({ action: 'feed-delete', id: created.id });
  expect((await f.handler(new Request(created.url))).status).toBe(404);
});
