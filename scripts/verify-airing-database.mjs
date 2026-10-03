import assert from 'node:assert/strict';
export async function verifyAiringDatabase(db) {
  const uid = '00000000-0000-4000-8000-000000000091';
  await db.query('INSERT INTO auth.users(id) VALUES($1)', [uid]);
  const payload = {
    anime: [
      {
        id: 'personal-title',
        title: 'PRIVATE TITLE',
        notes: 'PRIVATE NOTES',
        status: 'completed',
        source: 'AniList',
        sourceId: '7',
        malId: '70',
        seasons: [
          { source: 'AniList', sourceId: '7', malId: '70' },
          { source: 'TVMaze', sourceId: '9' },
        ],
        providerIds: ['tvmaze:9'],
      },
      { status: 'dropped', source: 'AniList', sourceId: '8' },
    ],
  };
  await db.query('INSERT INTO public.anime_libraries(user_id,payload) VALUES($1,$2)', [
    uid,
    payload,
  ]);
  await db.query('SET ROLE service_role');
  const jobs = (await db.query('SELECT * FROM public.anime_claim_airing_checks()')).rows;
  assert.equal(jobs.length, 2);
  assert.equal(JSON.stringify(jobs).includes('PRIVATE'), false);
  assert.deepEqual(jobs.map((j) => j.lookup_key).sort(), ['anilist:7', 'tvmaze:9']);
  assert.equal((await db.query('SELECT * FROM public.anime_claim_airing_checks()')).rows.length, 0);
  const first = jobs[0],
    result = {
      events: [{ providerKey: 'anilist:7', episode: 1, when: Date.now() + 1000 }],
      checks: [{ source: 'AniList', status: 'ok' }],
    };
  assert.equal(
    (
      await db.query('SELECT public.anime_finish_airing_check($1,$2,$3,true) AS ok', [
        first.lookup_key,
        first.claim_token,
        result,
      ])
    ).rows[0].ok,
    true,
  );
  assert.equal(
    (
      await db.query('SELECT public.anime_finish_airing_check($1,$2,$3,true) AS ok', [
        first.lookup_key,
        first.claim_token,
        result,
      ])
    ).rows[0].ok,
    false,
  );
  assert.equal(
    (await db.query('SELECT * FROM public.anime_claim_airing_checks()')).rows.length,
    0,
    'daily freshness prevents duplicate work',
  );
  assert.deepEqual(
    (await db.query('SELECT payload FROM public.anime_libraries WHERE user_id=$1', [uid])).rows[0]
      .payload,
    payload,
  );
  await db.query('RESET ROLE');
  assert.equal(
    (
      await db.query(
        "SELECT has_table_privilege('authenticated','public.anime_airing_cache','INSERT') AS write,has_column_privilege('authenticated','public.anime_airing_cache','claim_token','SELECT') AS lease,has_function_privilege('authenticated','public.anime_claim_airing_checks()','EXECUTE') AS claim",
      )
    ).rows[0].write,
    false,
  );
  assert.equal(
    (
      await db.query(
        "SELECT has_column_privilege('authenticated','public.anime_airing_cache','claim_token','SELECT') AS lease",
      )
    ).rows[0].lease,
    false,
  );
  assert.equal(
    (
      await db.query(
        "SELECT has_function_privilege('authenticated','public.anime_claim_airing_checks()','EXECUTE') AS claim",
      )
    ).rows[0].claim,
    false,
  );
  await db.query('DELETE FROM public.anime_libraries WHERE user_id=$1', [uid]);
  await db.query('DELETE FROM auth.users WHERE id=$1', [uid]);
  await db.query('TRUNCATE public.anime_airing_cache');
}
