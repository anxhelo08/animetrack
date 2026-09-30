import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import pg from 'pg';

export async function verifyDatabase(db) {
  await db.query(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,created_at timestamptz DEFAULT now());
    CREATE TABLE storage.objects(bucket_id text,name text,owner_id text);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
  `);
  await db.query(`CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
    GRANT EXECUTE ON FUNCTION auth.uid(),auth.jwt() TO anon,authenticated,service_role;
    CREATE PUBLICATION supabase_realtime;
  `);
  const base = await readFile(
    new URL('../supabase/baseline/20260930112834_remote_schema_baseline.sql', import.meta.url),
    'utf8',
  );
  const delta = await readFile(
    new URL('../supabase/migrations/20260930112836_server_security_139.sql', import.meta.url),
    'utf8',
  );
  await db.query(base);
  await db.query(delta);
  const A = '00000000-0000-4000-8000-000000000001',
    B = '00000000-0000-4000-8000-000000000002',
    C = '00000000-0000-4000-8000-000000000003';
  const SA = '10000000-0000-4000-8000-000000000001',
    SB = '10000000-0000-4000-8000-000000000002',
    SC = '10000000-0000-4000-8000-000000000003';
  await db.query(`INSERT INTO auth.users(id) VALUES('${A}'),('${B}'),('${C}');
    INSERT INTO auth.sessions(id,user_id) VALUES('${SA}','${A}'),('${SB}','${B}'),('${SC}','${C}');
    INSERT INTO public.anime_libraries(user_id,payload) VALUES('${A}','{"anime":[{"id":"own"}],"history":[]}'),('${B}','{"anime":[{"id":"other"}],"history":[]}');
    INSERT INTO public.anime_profiles(user_id,handle,display_name,is_public) VALUES('${A}','alpha','Alpha',false),('${B}','bravo','Bravo',false),('${C}','charlie','Charlie',true);
    INSERT INTO public.anime_moderators(user_id) VALUES('${C}');
    INSERT INTO public.episode_comments(user_id,episode_key,author_name,body,is_hidden,created_at) VALUES('${B}','mal:10:1','Bravo','Visible message',false,now()-interval '1 day'),('${B}','mal:10:1','Bravo','Hidden message',true,now()-interval '1 day');
    INSERT INTO public.anime_provider_credentials(user_id,provider,ciphertext) VALUES('${A}','anilist','encrypted-test');`);
  const as = async (role, uid, session, fn, { commit = false } = {}) => {
    await db.query('BEGIN');
    try {
      await db.query(`SET LOCAL ROLE ${role}`);
      await db.query("SELECT set_config('request.jwt.claims',$1,true)", [
        JSON.stringify(uid ? { sub: uid, session_id: session, role } : { role }),
      ]);
      const result = await fn();
      await db.query(commit ? 'COMMIT' : 'ROLLBACK');
      return result;
    } catch (e) {
      await db.query('ROLLBACK');
      throw e;
    }
  };
  let checks = 0;
  const check = async (name, fn) => {
    await fn();
    checks++;
    console.log('DB_PASS', name);
  };
  await check('anonymous cannot read libraries or discover private handles', async () => {
    await assert.rejects(
      as('anon', null, null, () => db.query('SELECT * FROM public.anime_libraries')),
      (e) => e.code === '42501',
    );
    await assert.rejects(
      as('anon', null, null, () => db.query("SELECT public.anime_find_friend_by_handle('bravo')")),
      (e) => e.code === '42501',
    );
  });
  await check('library ownership isolates reads, updates and inserts', async () => {
    await as('authenticated', A, SA, async () => {
      const r = await db.query('SELECT user_id FROM public.anime_libraries');
      assert.deepEqual(
        r.rows.map((x) => x.user_id),
        [A],
      );
      assert.equal(
        (
          await db.query(
            `UPDATE public.anime_libraries SET payload='{}' WHERE user_id='${B}' RETURNING user_id`,
          )
        ).rows.length,
        0,
      );
    });
    await assert.rejects(
      as('authenticated', A, SA, () =>
        db.query(`INSERT INTO public.anime_libraries(user_id,payload) VALUES('${C}','{}')`),
      ),
      (e) => e.code === '42501',
    );
  });
  await check('private profiles require an accepted connection', async () => {
    await as('authenticated', A, SA, async () =>
      assert.deepEqual(
        (await db.query('SELECT handle FROM public.anime_profiles ORDER BY handle')).rows.map(
          (x) => x.handle,
        ),
        ['alpha', 'charlie'],
      ),
    );
  });
  await check('friend requests and refusal/unknown responses are uniform', async () => {
    await as(
      'authenticated',
      A,
      SA,
      async () => {
        assert.equal(
          (await db.query("SELECT public.anime_request_friend_by_handle('bravo') AS result"))
            .rows[0].result,
          'received',
        );
      },
      { commit: true },
    );
    await as(
      'authenticated',
      B,
      SB,
      () => db.query("UPDATE public.anime_friendships SET status='declined'"),
      { commit: true },
    );
    await as('authenticated', A, SA, async () => {
      assert.equal((await db.query('SELECT * FROM public.anime_friendships')).rows.length, 0);
      for (const name of ['bravo', 'nonexistent', 'alpha'])
        assert.equal(
          (await db.query('SELECT public.anime_request_friend_by_handle($1) AS result', [name]))
            .rows[0].result,
          'received',
        );
    });
    await assert.rejects(
      as('authenticated', A, SA, () =>
        db.query(
          `INSERT INTO public.anime_friendships(requester_id,recipient_id,status) VALUES('${A}','${B}','pending')`,
        ),
      ),
      (e) => e.code === 'P0001',
    );
  });
  await check('lookup and invitation budgets stop repeated calls', async () => {
    await as('authenticated', A, SA, async () => {
      let result;
      for (let i = 0; i < 11; i++)
        result = (
          await db.query("SELECT public.anime_request_friend_by_handle('unknown') AS result")
        ).rows[0].result;
      assert.equal(result, 'limit');
    });
    await assert.rejects(
      as('authenticated', A, SA, async () => {
        for (let i = 0; i < 16; i++)
          await db.query("SELECT * FROM public.anime_find_friend_by_handle('bravo')");
      }),
      (e) => e.code === 'P0001',
    );
  });
  await check('comments enforce identity and hide moderated content', async () => {
    await as('authenticated', A, SA, async () =>
      assert.equal((await db.query('SELECT body FROM public.episode_comments')).rows.length, 1),
    );
    await as('authenticated', C, SC, async () =>
      assert.equal((await db.query('SELECT body FROM public.episode_comments')).rows.length, 2),
    );
    await assert.rejects(
      as('authenticated', A, SA, () =>
        db.query(
          `INSERT INTO public.episode_comments(user_id,episode_key,author_name,body) VALUES('${B}','mal:10:1','Alpha','Forged message')`,
        ),
      ),
      (e) => e.code === '42501',
    );
  });
  await check('off-site avatars and credential access are rejected', async () => {
    await assert.rejects(
      as('authenticated', A, SA, () =>
        db.query("UPDATE public.anime_profiles SET avatar_url='https://tracking.example/pixel'"),
      ),
      (e) => e.code === '23514',
    );
    await assert.rejects(
      as('authenticated', A, SA, () => db.query('SELECT * FROM public.anime_provider_credentials')),
      (e) => e.code === '42501',
    );
    await assert.rejects(
      as('authenticated', A, SA, () =>
        db.query("SELECT setval('public.anime_friendships_id_seq',999)"),
      ),
      (e) => e.code === '42501',
    );
  });
  await check('expired server sessions reject still-signed identity claims', async () => {
    await db.query(`DELETE FROM auth.sessions WHERE id='${SA}'`);
    await as('authenticated', A, SA, async () => {
      assert.equal((await db.query('SELECT * FROM public.anime_libraries')).rows.length, 0);
      assert.equal(
        (await db.query('SELECT public.anime_has_active_session() AS active')).rows[0].active,
        false,
      );
    });
    await assert.rejects(
      as('authenticated', A, SA, () =>
        db.query("SELECT public.anime_request_friend_by_handle('charlie')"),
      ),
      (e) => e.code === '42501',
    );
  });
  await check('global proxy quota is capped and scopes cannot be forged', async () => {
    await as('anon', null, null, async () => {
      assert.equal(
        (await db.query("SELECT public.anime_consume_proxy_budget('arbitrary') AS allowed")).rows[0]
          .allowed,
        false,
      );
      let allowed = 0;
      for (let i = 0; i < 125; i++)
        if (
          (await db.query("SELECT public.anime_consume_proxy_budget('cinemeta') AS allowed"))
            .rows[0].allowed
        )
          allowed++;
      assert.equal(allowed, 120);
    });
  });
  return checks;
}
if (process.argv[1]?.endsWith('test-database.mjs')) {
  const url = process.env.DATABASE_URL;
  if (!url) throw Error('DATABASE_URL must point to a disposable local test database');
  const parsed = new URL(url);
  if (
    !['localhost', '127.0.0.1'].includes(parsed.hostname) ||
    parsed.pathname !== '/animetrack_security_test'
  )
    throw Error('Refusing to run destructive fixtures outside the disposable local test database');
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  try {
    const tables = await db.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='anime_libraries'",
    );
    if (tables.rows.length) throw Error('Test database must be empty');
    console.log('DATABASE_CHECKS', await verifyDatabase(db));
  } finally {
    await db.end();
  }
}
