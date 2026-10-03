import { seal, open } from './vault.js';
const ANI = 'https://graphql.anilist.co';
const MAL = 'https://api.myanimelist.net/v2';
const statuses = {
  anilist: ['CURRENT', 'COMPLETED', 'PAUSED', 'DROPPED', 'PLANNING'],
  mal: ['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch'],
};
const listQuery =
  'query($userId:Int!){MediaListCollection(type:ANIME,userId:$userId){lists{entries{id mediaId status score(format:POINT_10) progress repeat updatedAt media{id idMal title{romaji english} episodes format seasonYear coverImage{extraLarge large} genres averageScore siteUrl}}}}}';
const mangaStatuses = {
  anilist: statuses.anilist,
  mal: ['reading', 'completed', 'on_hold', 'dropped', 'plan_to_read'],
};
const mangaListQuery =
  'query($userId:Int!){MediaListCollection(type:MANGA,userId:$userId){lists{entries{id mediaId status score(format:POINT_10) progress progressVolumes updatedAt media{id idMal countryOfOrigin title{romaji english} chapters volumes status startDate{year} coverImage{extraLarge large} genres}}}}}';
const updateQuery =
  'mutation($mediaId:Int!,$status:MediaListStatus,$score:Float,$progress:Int){SaveMediaListEntry(mediaId:$mediaId,status:$status,score:$score,progress:$progress){id mediaId status score(format:POINT_10) progress updatedAt}}';
const mangaUpdateQuery =
  'mutation($mediaId:Int!,$status:MediaListStatus,$score:Float,$progress:Int,$progressVolumes:Int){SaveMediaListEntry(mediaId:$mediaId,status:$status,score:$score,progress:$progress,progressVolumes:$progressVolumes){id mediaId status score(format:POINT_10) progress progressVolumes updatedAt}}';
const validInt = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
export function createAccountHandler({ admin, clientForToken, secret, fetchImpl = fetch }) {
  return async (request) => {
    const origin = request.headers.get('origin');
    const allowed =
      !origin ||
      origin === 'https://animetrack-flax.vercel.app' ||
      /^https:\/\/animetrack-[a-z0-9-]+-xhenohyskaj-3395\.vercel\.app$/.test(origin) ||
      origin === 'http://127.0.0.1:8765';
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      Vary: 'Origin',
      'Access-Control-Allow-Origin':
        allowed && origin ? origin : 'https://animetrack-flax.vercel.app',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (!allowed) return reply({ error: 'Origin unavailable' }, 403);
    if (request.method === 'OPTIONS') return new Response('ok', { headers });
    if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
    const token = /^Bearer ([^\s]+)$/i.exec(request.headers.get('authorization') || '')?.[1];
    if (!token || token.length > 8192) return reply({ error: 'Authentication required' }, 401);
    try {
      const { data: auth, error: authError } = await admin.auth.getUser(token);
      if (authError || !auth?.user || auth.user.is_anonymous)
        return reply({ error: 'Authentication required' }, 401);
      const user = auth.user,
        uid = user.id,
        caller = clientForToken(token);
      const active = await caller.rpc('anime_has_active_session');
      if (active.error || active.data !== true)
        return reply({ error: 'Authentication required' }, 401);
      const budget = await caller.rpc('anime_account_operation_budget');
      if (budget.error || budget.data !== true) {
        headers['Retry-After'] = '60';
        return reply({ error: 'Too many requests. Try again later.' }, 429);
      }
      const text = await request.text();
      if (text.length > 24000) return reply({ error: 'Payload too large' }, 413);
      let input;
      try {
        input = JSON.parse(text);
      } catch {
        return reply({ error: 'Invalid JSON' }, 400);
      }
      if (!input || typeof input !== 'object' || Array.isArray(input))
        return reply({ error: 'Invalid payload' }, 400);
      const action = input.action,
        provider = input.provider;
      if (action === 'status') {
        const r = await admin
          .from('anime_provider_credentials')
          .select('provider')
          .eq('user_id', uid);
        if (r.error) throw Error('Storage unavailable');
        return reply({ providers: (r.data || []).map((x) => x.provider) });
      }
      if (action === 'export') {
        const data = {
          format: 'animetrack-account-v1',
          exportedAt: new Date().toISOString(),
          account: {
            id: uid,
            email: user.email,
            created_at: user.created_at,
            display_name: user.user_metadata?.display_name || '',
          },
          tables: {},
        };
        const own = {
          anime_libraries: 'user_id',
          anime_profiles: 'user_id',
          episode_comments: 'user_id',
          episode_comment_reports: 'reporter_id',
          anime_push_subscriptions: 'user_id',
          anime_push_reminders: 'user_id',
        };
        for (const [table, field] of Object.entries(own))
          data.tables[table] = await rows(admin, table, field, uid);
        data.tables.anime_friendships = await rows(admin, 'anime_friendships', null, uid);
        // Delivery secrets and provider credentials are intentionally excluded.
        return reply(data);
      }
      if (action === 'delete') {
        if (input.confirmation !== 'FSHI LLOGARINE')
          return reply({ error: 'Confirmation required' }, 400);
        const recent = await caller.rpc('anime_recent_session');
        if (recent.error || recent.data !== true)
          return reply({ error: 'Hyr përsëri me fjalëkalimin për të fshirë llogarinë.' }, 403);
        const objects = await admin.rpc('anime_account_storage_objects', { p_user_id: uid });
        if (objects.error) throw Error('Storage unavailable');
        for (const bucket of new Set((objects.data || []).map((x) => x.bucket_id))) {
          const names = objects.data.filter((x) => x.bucket_id === bucket).map((x) => x.name);
          for (let i = 0; i < names.length; i += 100) {
            const r = await admin.storage.from(bucket).remove(names.slice(i, i + 100));
            if (r.error) throw Error('Storage unavailable');
          }
        }
        const r = await admin.auth.admin.deleteUser(uid);
        if (r.error) throw Error('Deletion unavailable');
        return reply({ deleted: true });
      }
      if (!['anilist', 'mal'].includes(provider)) return reply({ error: 'Invalid provider' }, 400);
      if (action === 'disconnect') {
        const r = await admin
          .from('anime_provider_credentials')
          .delete()
          .eq('user_id', uid)
          .eq('provider', provider);
        if (r.error) throw Error('Storage unavailable');
        return reply({ disconnected: true });
      }
      if (action === 'connect') {
        const credential = input.token;
        if (
          typeof credential !== 'string' ||
          credential.length < 8 ||
          credential.length > 8192 ||
          /\s/.test(credential)
        )
          return reply({ error: 'Invalid access token' }, 400);
        const profile =
          provider === 'anilist'
            ? (await ani('query{Viewer{id name}}', {}, credential, fetchImpl)).Viewer
            : await remote(MAL + '/users/@me?fields=id,name', credential, {}, fetchImpl);
        if (!profile?.id) return reply({ error: 'Invalid access token' }, 400);
        const ciphertext = await seal(
          { token: credential, userId: profile.id, name: profile.name },
          secret,
        );
        const r = await admin
          .from('anime_provider_credentials')
          .upsert({ user_id: uid, provider, ciphertext, updated_at: new Date().toISOString() });
        if (r.error) throw Error('Storage unavailable');
        return reply({ connected: true, profile: { id: profile.id, name: profile.name } });
      }
      if (action !== 'provider' || !['me', 'list', 'update'].includes(input.operation))
        return reply({ error: 'Invalid action' }, 400);
      if (input.mediaType !== undefined && !['ANIME', 'MANGA'].includes(input.mediaType))
        return reply({ error: 'Invalid media type' }, 400);
      const manga = input.mediaType === 'MANGA';
      const r = await admin
        .from('anime_provider_credentials')
        .select('ciphertext')
        .eq('user_id', uid)
        .eq('provider', provider)
        .maybeSingle();
      if (r.error) throw Error('Storage unavailable');
      if (!r.data) return reply({ error: 'Lidh provider-in përsëri.' }, 409);
      const credential = await open(r.data.ciphertext, secret),
        op = input.operation;
      if (op === 'me') return reply({ id: credential.userId, name: credential.name });
      if (op === 'list') {
        if (provider === 'anilist')
          return reply(
            await ani(
              manga ? mangaListQuery : listQuery,
              { userId: credential.userId },
              credential.token,
              fetchImpl,
            ),
          );
        const offset = input.offset ?? 0;
        if (!validInt(offset, 0, 100000)) return reply({ error: 'Invalid pagination' }, 400);
        return reply(
          await remote(
            MAL +
              (manga ? '/users/@me/mangalist?' : '/users/@me/animelist?') +
              new URLSearchParams({
                fields: manga
                  ? 'list_status,num_chapters,num_volumes,media_type,start_date,mean,main_picture,genres'
                  : 'list_status,num_episodes,media_type,start_date,mean,main_picture',
                sort: 'list_updated_at',
                limit: '1000',
                offset: String(offset),
              }),
            credential.token,
            {},
            fetchImpl,
          ),
        );
      }
      const id = input.id,
        status = input.status,
        progress = input.progress,
        score = input.score,
        volumes = input.volumesRead ?? 0;
      if (
        !validInt(id, 1, 999999999) ||
        !(manga ? mangaStatuses : statuses)[provider].includes(status) ||
        !validInt(progress, 0, 10000) ||
        (manga && !validInt(volumes, 0, 1000)) ||
        !Number.isFinite(score) ||
        score < 0 ||
        score > 10
      )
        return reply({ error: 'Invalid list status' }, 400);
      if (provider === 'anilist')
        return reply(
          await ani(
            manga ? mangaUpdateQuery : updateQuery,
            {
              mediaId: id,
              status,
              progress,
              score,
              ...(manga ? { progressVolumes: volumes } : {}),
            },
            credential.token,
            fetchImpl,
          ),
        );
      return reply(
        await remote(
          MAL + (manga ? '/manga/' : '/anime/') + id + '/my_list_status',
          credential.token,
          {
            method: 'PATCH',
            body: new URLSearchParams({
              status,
              ...(manga
                ? { num_chapters_read: String(progress), num_volumes_read: String(volumes) }
                : { num_watched_episodes: String(progress) }),
              score: String(Math.round(score)),
            }),
          },
          fetchImpl,
        ),
      );
    } catch {
      return reply(
        { error: 'Shërbimi nuk është i disponueshëm. Provo përsëri ose rilidh provider-in.' },
        502,
      );
    }
  };
}
async function rows(admin, table, field, uid) {
  const columns = table === 'anime_push_subscriptions' ? 'id,user_id,created_at,last_seen_at' : '*',
    all = [];
  for (let offset = 0; offset < 50000; offset += 500) {
    let q = admin.from(table).select(columns);
    q = field ? q.eq(field, uid) : q.or(`requester_id.eq.${uid},recipient_id.eq.${uid}`);
    const r = await q
      .order(table === 'anime_libraries' || table === 'anime_profiles' ? 'user_id' : 'id')
      .range(offset, offset + 499);
    if (r.error) throw Error('Export unavailable');
    all.push(...(r.data || []));
    if ((r.data || []).length < 500) return all;
  }
  throw Error('Export too large');
}
async function remote(url, token, options, fetchImpl) {
  const r = await fetchImpl(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      Authorization: 'Bearer ' + token,
      ...(options.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    signal: AbortSignal.timeout(8000),
    redirect: 'error',
  });
  if (!r.ok) throw Error('Provider unavailable');
  return r.json();
}
async function ani(query, variables, token, fetchImpl) {
  const r = await fetchImpl(ANI, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(8000),
    redirect: 'error',
  });
  if (!r.ok) throw Error('Provider unavailable');
  const j = await r.json();
  if (j.errors?.length) throw Error('Provider unavailable');
  return j.data || {};
}
