import { test, expect } from 'vitest';
import { createDispatcher } from '../../supabase/functions/anime-push-dispatch/handler.js';
import { createConfigHandler } from '../../supabase/functions/anime-push-config/handler.js';
import {
  permittedEndpoint,
  retryTime,
  stillWanted,
  classify,
} from '../../supabase/functions/_shared/push-policy.js';
const secret = 'synthetic-cron-secret-at-least-32-characters',
  subject = 'https://animetrack-flax.vercel.app';
const request = () =>
  new Request('https://test/dispatch', { method: 'POST', headers: { 'X-Cron-Secret': secret } });
function fixture({
  jobs = 1,
  subscriptions = 2,
  send = async () => {},
  libraryError = false,
  getVapid,
} = {}) {
  let time = Date.parse('2026-09-30T12:00:00Z');
  const reminders = Array.from({ length: jobs }, (_, i) => ({
    id: 'job' + i,
    user_id: 'owner',
    event_key: 'event' + i,
    anime_id: 'anime',
    season_id: 'season',
    episode: 1,
    title: 'Demo',
    attempts: 0,
  }));
  const payload = {
    preferences: {
      pushEnabled: true,
      calendarReminders: Object.fromEntries(reminders.map((j) => [j.event_key, 0])),
    },
    anime: [{ id: 'anime', seasons: [{ id: 'season', watched: [] }] }],
  };
  const tables = {
    anime_push_reminders: reminders,
    anime_libraries: [{ user_id: 'owner', payload }],
    anime_push_subscriptions: Array.from({ length: subscriptions }, (_, i) => ({
      id: 'sub' + i,
      user_id: 'owner',
      endpoint: 'https://fcm.googleapis.com/fcm/send/' + i,
      p256dh: 'key',
      auth_key: 'auth',
    })),
    anime_push_deliveries: [],
  };
  const reads = {},
    sent = [];
  const admin = {
    rpc: async (name) => {
      if (name === 'anime_push_authorize_cron') return { data: false };
      const due = reminders.filter(
        (j) => !j.sent_at && (!j.next_attempt_at || Date.parse(j.next_attempt_at) <= time),
      );
      for (const j of due) {
        j.attempts++;
        j.claim_token = 'claim' + j.attempts;
      }
      return { data: due.map((j) => ({ ...j })) };
    },
    from: (table) => {
      const filters = [];
      let op = 'select',
        values,
        conflict;
      const q = {
        select: () => q,
        in: (key, vals) => {
          filters.push((r) => vals.includes(r[key]));
          return q;
        },
        eq: (key, val) => {
          filters.push((r) => r[key] === val);
          return q;
        },
        update: (v) => {
          op = 'update';
          values = v;
          return q;
        },
        delete: () => {
          op = 'delete';
          return q;
        },
        upsert: (v, o) => {
          op = 'upsert';
          values = v;
          conflict = o.onConflict;
          return q;
        },
        then: (resolve) => {
          if (libraryError && table === 'anime_libraries')
            return Promise.resolve({ error: { message: 'failed' } }).then(resolve);
          const rows = tables[table].filter((r) => filters.every((f) => f(r)));
          if (op === 'select') reads[table] = (reads[table] || 0) + 1;
          if (op === 'update') rows.forEach((r) => Object.assign(r, values));
          if (op === 'delete') tables[table] = tables[table].filter((r) => !rows.includes(r));
          if (op === 'upsert') {
            const keys = conflict.split(','),
              old = tables[table].find((r) => keys.every((k) => r[k] === values[k]));
            if (old) Object.assign(old, values);
            else tables[table].push({ ...values });
          }
          return Promise.resolve({
            data: op === 'select' ? rows.map((r) => ({ ...r })) : null,
            error: null,
          }).then(resolve);
        },
      };
      return q;
    },
  };
  const handler = createDispatcher({
    admin,
    getVapid,
    secret,
    subject,
    now: () => time,
    send: async (sub, p, options) => {
      sent.push({ sub, options });
      return send(sub, sent.length);
    },
  });
  return { handler, tables, reads, sent, advance: (ms) => (time += ms) };
}
test('endpoint allowlist accepts Windows Edge and all supported providers; rejects spoofing and SSRF', () => {
  for (const u of [
    'https://wns2-by3p.notify.windows.com/?token=one',
    'https://web.push.apple.com/token',
    'https://updates.push.services.mozilla.com/token',
    'https://fcm.googleapis.com/fcm/send/token',
  ])
    expect(permittedEndpoint(u)).toBe(true);
  for (const u of [
    'https://notify.windows.com.evil.test/a',
    'https://evilnotify.windows.com/a',
    'https://fcm.googleapis.com:8443/a',
    'https://user@fcm.googleapis.com/a',
    'http://fcm.googleapis.com/a',
    'https://127.0.0.1/a',
    'https://web.push.apple.com/a#fragment',
  ])
    expect(permittedEndpoint(u)).toBe(false);
});
test('backoff grows, caps and honors bounded Retry-After', () => {
  expect(Date.parse(retryTime(1, 0))).toBe(300000);
  expect(Date.parse(retryTime(5, 0))).toBe(3600000);
  expect(Date.parse(retryTime(1, 0, '900'))).toBe(900000);
  expect(Date.parse(retryTime(1, 0, '999999'))).toBe(3600000);
});
test('classifies permanent versus transient and expired subscriptions', () => {
  for (const n of [404, 410]) expect(classify({ statusCode: n })).toBe('expired');
  for (const n of [0, 408, 429, 500, 503]) expect(classify({ statusCode: n })).toBe('retry');
  expect(classify({ statusCode: 403 })).toBe('failed');
});
test('unauthorized calls never claim or send', async () => {
  const f = fixture();
  expect((await f.handler(new Request('https://test/', { method: 'POST' }))).status).toBe(401);
  expect(f.sent).toHaveLength(0);
});
test('partial failure retries only the failed device after backoff', async () => {
  let fail = true;
  const f = fixture({
    send: async (sub) => {
      if (sub.endpoint.endsWith('/1') && fail) throw { statusCode: 503 };
    },
  });
  expect((await f.handler(request())).status).toBe(200);
  expect(f.sent).toHaveLength(2);
  expect(f.tables.anime_push_reminders[0].sent_at).toBeUndefined();
  await f.handler(request());
  expect(f.sent).toHaveLength(2);
  fail = false;
  f.advance(300000);
  await f.handler(request());
  expect(f.sent).toHaveLength(3);
  expect(f.tables.anime_push_reminders[0].terminal_reason).toBe('sent');
});
test('five transient failures stop permanently', async () => {
  const f = fixture({
    subscriptions: 1,
    send: async () => {
      throw { statusCode: 503 };
    },
  });
  for (let i = 0; i < 5; i++) {
    await f.handler(request());
    f.advance(3600000);
  }
  await f.handler(request());
  expect(f.sent).toHaveLength(5);
  expect(f.tables.anime_push_reminders[0].terminal_reason).toBe('failed');
});
test.each([404, 410])(
  'expired %s subscription is removed without further retries',
  async (code) => {
    const f = fixture({
      subscriptions: 1,
      send: async () => {
        throw { statusCode: code };
      },
    });
    await f.handler(request());
    expect(f.tables.anime_push_subscriptions).toHaveLength(0);
    expect(f.tables.anime_push_reminders[0].terminal_reason).toBe('failed');
  },
);
test('permanent auth failure stops; does not delete a potentially valid subscription', async () => {
  const f = fixture({
    subscriptions: 1,
    send: async () => {
      throw { statusCode: 403 };
    },
  });
  await f.handler(request());
  expect(f.tables.anime_push_subscriptions).toHaveLength(1);
  expect(f.tables.anime_push_reminders[0].terminal_reason).toBe('failed');
});
test('reads grouped per user; sends retain timeout', async () => {
  const f = fixture({ jobs: 3 });
  await f.handler(request());
  expect(f.reads.anime_libraries).toBe(1);
  expect(f.reads.anime_push_subscriptions).toBe(1);
  expect(f.sent).toHaveLength(6);
  expect(f.sent[0].options.timeout).toBe(10000);
});
test('library failure preserves jobs for lease recovery instead of silently skipping', async () => {
  const f = fixture({ libraryError: true });
  expect((await f.handler(request())).status).toBe(500);
  expect(f.sent).toHaveLength(0);
  expect(f.tables.anime_push_reminders[0].sent_at).toBeUndefined();
});
test('watched or disabled reminders are skipped', async () => {
  const f = fixture();
  f.tables.anime_libraries[0].payload.anime[0].seasons[0].watched = [1];
  await f.handler(request());
  expect(f.sent).toHaveLength(0);
  expect(f.tables.anime_push_reminders[0].terminal_reason).toBe('skipped');
  expect(stillWanted({ event_key: 'x' }, {})).toBe(false);
});
test('config preflight, authentication, method, missing key and public key only', async () => {
  const key = 'A'.repeat(87),
    h = createConfigHandler({ publicKey: key, authenticate: async (t) => t === 'valid' });
  expect((await h(new Request('https://test/', { method: 'OPTIONS' }))).status).toBe(200);
  expect((await h(new Request('https://test/'))).status).toBe(405);
  expect((await h(new Request('https://test/', { method: 'POST' }))).status).toBe(401);
  const r = await h(
    new Request('https://test/', { method: 'POST', headers: { Authorization: 'Bearer valid' } }),
  );
  expect(await r.json()).toEqual({ enabled: true, publicKey: key });
  expect(r.headers.get('Cache-Control')).toBe('no-store');
  const missing = createConfigHandler({ publicKey: '', authenticate: async () => true });
  expect(
    (
      await missing(
        new Request('https://test/', {
          method: 'POST',
          headers: { Authorization: 'Bearer valid' },
        }),
      )
    ).status,
  ).toBe(503);
});

test('server key resolver prefers env and persists a shared vault pair without exposing it to config', async () => {
  const { resolveVapid } = await import('../../supabase/functions/_shared/push-keys.js');
  const pair = { publicKey: 'A'.repeat(87), privateKey: 'B'.repeat(43) };
  const admin = { rpc: async () => ({ data: pair }) };
  expect(await resolveVapid({ admin, generate: () => pair })).toEqual(pair);
  expect(
    await resolveVapid({
      admin,
      publicKey: 'env-public',
      privateKey: 'env-private',
      generate: () => {
        throw Error('must not generate');
      },
    }),
  ).toEqual({ publicKey: 'env-public', privateKey: 'env-private' });
  const h = createConfigHandler({
    authenticate: async () => true,
    getPublicKey: async () => pair.publicKey,
  });
  const r = await h(
    new Request('https://test/', { method: 'POST', headers: { Authorization: 'Bearer valid' } }),
  );
  expect(await r.json()).toEqual({ enabled: true, publicKey: pair.publicKey });
});

test('resolved server keys are passed only to the push transport', async () => {
  const pair = { publicKey: 'A'.repeat(87), privateKey: 'B'.repeat(43) };
  const f = fixture({ getVapid: async () => pair });
  const response = await f.handler(request());
  expect(f.sent[0].options.vapidDetails).toEqual({ subject, ...pair });
  expect(JSON.stringify(await response.json())).not.toContain(pair.privateKey);
});
