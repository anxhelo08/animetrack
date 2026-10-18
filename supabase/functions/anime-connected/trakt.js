import { seal, open } from '../anime-account/vault.js';
const API = 'https://api.trakt.tv';
const validId = (n) => Number.isSafeInteger(Number(n)) && Number(n) > 0;
const mediaId = (a) =>
  validId(a.traktId)
    ? { trakt: Number(a.traktId) }
    : /^tt\d+$/.test(a.imdbId || '')
      ? { imdb: a.imdbId }
      : null;
export function exportCandidates(library, kind = 'history') {
  const result = [];
  const add = (key, title, type, ids, extra) => {
    if (ids) result.push({ key, title, type, ids, ...extra });
  };
  for (const a of library?.anime || []) {
    const movie = a.format === 'MOVIE';
    if (kind === 'watchlist' && a.status === 'planning')
      add(a.id, a.title, movie ? 'movies' : 'shows', mediaId(a), {});
    if (kind === 'ratings' && Number.isInteger(a.rating) && a.rating >= 1 && a.rating <= 10)
      add(a.id, a.title, movie ? 'movies' : 'shows', mediaId(a), { rating: a.rating });
    if (kind === 'ratings')
      for (const part of a.seasons || [])
        for (const episode of part.episodes || []) {
          if (
            Number.isInteger(episode.personalRating) &&
            episode.personalRating >= 1 &&
            episode.personalRating <= 10 &&
            validId(episode.traktId)
          )
            add(
              `${a.id}|${part.id}|${episode.number}`,
              `${a.title} · EP ${episode.number}`,
              'episodes',
              { trakt: Number(episode.traktId) },
              { rating: episode.personalRating },
            );
        }
    for (const h of library?.history || []) {
      if (
        kind !== 'history' ||
        h.id !== a.id ||
        h.action !== 'watched' ||
        !Number.isFinite(Date.parse(h.date))
      )
        continue;
      const part = a.seasons?.find((p) => p.id === h.seasonId);
      const ep = part?.episodes?.find((e) => e.number === h.episode);
      const ids = movie ? mediaId(a) : validId(ep?.traktId) ? { trakt: Number(ep.traktId) } : null;
      add(
        h.eventId || `${a.id}|${part?.id}|${h.episode}|${h.date}`,
        a.title + (movie ? '' : ` · EP ${h.episode}`),
        movie ? 'movies' : 'episodes',
        ids,
        { watched_at: new Date(h.date).toISOString() },
      );
    }
  }
  const unique = new Map(
    result.map((r) => [r.type + JSON.stringify(r.ids) + (r.watched_at || ''), r]),
  );
  return [...unique.values()].slice(-100);
}
export function createTraktService({ admin, storage, fetchImpl, env, now }) {
  const configured = () =>
    !!env('TRAKT_CLIENT_ID') &&
    !!env('TRAKT_CLIENT_SECRET') &&
    env('SUPABASE_SERVICE_ROLE_KEY').length >= 32;
  const key = () => env('SUPABASE_SERVICE_ROLE_KEY');
  const row = (uid) =>
    storage(admin.from('anime_trakt_connections').select('*').eq('owner_id', uid).maybeSingle());
  const unpack = (r) => (r ? open(r.encrypted, key()) : null);
  const write = (uid, value, revision = 1) =>
    storage(
      admin
        .from('anime_trakt_connections')
        .upsert(
          { owner_id: uid, encrypted: value, revision, updated_at: new Date(now()).toISOString() },
          { onConflict: 'owner_id' },
        ),
    );
  async function request(path, token, body) {
    const r = await fetchImpl(API + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': env('TRAKT_CLIENT_ID'),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok)
      throw Error(
        r.status === 401
          ? 'Lidh përsëri llogarinë Trakt.'
          : r.status === 429
            ? 'Trakt kërkon pak pritje. Provo përsëri më vonë.'
            : 'Trakt nuk u përgjigj. Provo përsëri.',
      );
    return { data: r.status === 204 ? {} : await r.json(), response: r };
  }
  async function status(uid) {
    if (!configured()) return { configured: false, connected: false };
    const data = await unpack(await row(uid));
    return {
      configured: true,
      connected: !!data?.access_token,
      pending: !!data?.device_code && data.expiresAt > now(),
    };
  }
  async function locked(uid, fn) {
    const r = await row(uid),
      value = await unpack(r);
    if (!value) throw Error('Lidh fillimisht llogarinë Trakt.');
    if (value.busyUntil > now()) throw Error('Një veprim Trakt është në proces. Provo pas pak.');
    value.busyUntil = now() + 180000;
    const revision = r.revision + 1;
    const claim = await storage(
      admin
        .from('anime_trakt_connections')
        .update({ revision, encrypted: await seal({ ...value, busyUntil: now() + 180000 }, key()) })
        .eq('owner_id', uid)
        .eq('revision', r.revision)
        .select('revision')
        .maybeSingle(),
    );
    if (!claim) throw Error('Lidhja ndryshoi. Provo përsëri.');
    try {
      return await fn(value, async (next) => {
        Object.assign(value, next);
      });
    } finally {
      await storage(
        admin
          .from('anime_trakt_connections')
          .update({ encrypted: await seal({ ...value, busyUntil: 0 }, key()) })
          .eq('owner_id', uid)
          .eq('revision', revision),
      );
    }
  }
  async function token(value) {
    if (!value.access_token) throw Error('Lidh fillimisht llogarinë Trakt.');
    if (value.expiresAt <= now() + 60000) {
      const { data } = await request('/oauth/token', null, {
        grant_type: 'refresh_token',
        refresh_token: value.refresh_token,
        client_id: env('TRAKT_CLIENT_ID'),
        client_secret: env('TRAKT_CLIENT_SECRET'),
        redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
      });
      if (!data.access_token || !data.refresh_token) throw Error('Lidh përsëri llogarinë Trakt.');
      Object.assign(value, data, { expiresAt: now() + data.expires_in * 1000 });
      // Persist rotated single-use refresh tokens before making any further request.
      await storage(
        admin
          .from('anime_trakt_connections')
          .update({ encrypted: await seal(value, key()) })
          .eq('owner_id', value.owner),
      );
    }
    return value.access_token;
  }
  async function action(uid, input) {
    if (!configured())
      throw Error(
        'Administratori duhet të regjistrojë aplikacionin Trakt për ta aktivizuar lidhjen. Importi JSON punon ndërkohë.',
      );
    if (input.action === 'trakt-connect') {
      if ((await status(uid)).connected) return { connected: true };
      const { data } = await request('/oauth/device/code', null, {
        client_id: env('TRAKT_CLIENT_ID'),
      });
      if (!data.device_code || !data.user_code) throw Error('Kodi Trakt nuk u krijua.');
      const interval = Math.max(5, Number(data.interval) || 5),
        expiresAt = now() + Math.min(Number(data.expires_in) || 600, 1800) * 1000;
      await write(
        uid,
        await seal(
          {
            owner: uid,
            device_code: data.device_code,
            interval,
            expiresAt,
            nextPoll: now() + interval * 1000,
          },
          key(),
        ),
      );
      return {
        userCode: String(data.user_code).slice(0, 20),
        verificationURL: 'https://trakt.tv/activate',
        expiresAt,
        interval,
      };
    }
    return locked(uid, async (value) => {
      value.owner = uid;
      if (input.action === 'trakt-poll') {
        if (value.access_token) return { connected: true };
        if (value.expiresAt <= now()) throw Error('Kodi skadoi. Krijo një kod të ri.');
        if (value.nextPoll > now())
          return { pending: true, retryAfter: Math.ceil((value.nextPoll - now()) / 1000) };
        value.nextPoll = now() + value.interval * 1000;
        const r = await fetchImpl(API + '/oauth/device/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: value.device_code,
            client_id: env('TRAKT_CLIENT_ID'),
            client_secret: env('TRAKT_CLIENT_SECRET'),
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (r.status === 400) return { pending: true, retryAfter: value.interval };
        if (r.status === 429) {
          value.interval += 5;
          value.nextPoll = now() + value.interval * 1000;
          return { pending: true, retryAfter: value.interval };
        }
        if (!r.ok) throw Error('Autorizimi nuk u përfundua. Krijo një kod të ri.');
        const data = await r.json();
        if (!data.access_token || !data.refresh_token) throw Error('Autorizimi nuk u përfundua.');
        delete value.device_code;
        Object.assign(value, data, { expiresAt: now() + data.expires_in * 1000 });
        return { connected: true };
      }
      if (input.action === 'trakt-disconnect') {
        if (value.access_token)
          await request('/oauth/revoke', null, {
            token: value.access_token,
            client_id: env('TRAKT_CLIENT_ID'),
            client_secret: env('TRAKT_CLIENT_SECRET'),
          });
        await storage(admin.from('anime_trakt_connections').delete().eq('owner_id', uid));
        await storage(admin.from('anime_trakt_plans').delete().eq('owner_id', uid));
        return { connected: false };
      }
      const access = await token(value);
      if (input.action === 'trakt-private-page') {
        const kind = ['history', 'ratings', 'watchlist'].includes(input.kind)
            ? input.kind
            : 'history',
          page = Number(input.page) || 1;
        if (!Number.isInteger(page) || page < 1 || page > 100) throw Error('Faqe e pavlefshme.');
        const { data, response } = await request(`/sync/${kind}?page=${page}&limit=100`, access);
        if (!Array.isArray(data)) throw Error('Përgjigje Trakt e pavlefshme.');
        return {
          rows: kind === 'watchlist' ? data.map((r) => ({ ...r, planned: true })) : data,
          page,
          pages: Number(response.headers.get('x-pagination-page-count')) || page,
        };
      }
      if (input.action === 'trakt-export-preview') {
        const kind = ['history', 'ratings', 'watchlist'].includes(input.kind)
          ? input.kind
          : 'history';
        const library = await storage(
          admin.from('anime_libraries').select('payload').eq('user_id', uid).maybeSingle(),
        );
        const candidates = exportCandidates(library?.payload, kind);
        let remote = [];
        for (let page = 1; page <= 5; page++) {
          const dates = candidates
            .map((c) => c.watched_at)
            .filter(Boolean)
            .sort();
          const query =
            kind === 'history' && dates.length
              ? '&start_at=' +
                encodeURIComponent(dates[0]) +
                '&end_at=' +
                encodeURIComponent(dates.at(-1))
              : '';
          const { data, response } = await request(
            `/sync/${kind}?page=${page}&limit=100${query}`,
            access,
          );
          if (!Array.isArray(data)) throw Error('Përgjigje Trakt e pavlefshme.');
          remote.push(...data);
          const pages = Number(response.headers.get('x-pagination-page-count')) || 1;
          if (pages > 5)
            throw Error(
              'Ka mbi 500 regjistrime për krahasim. Ndaje sinkronizimin përpara eksportit.',
            );
          if (page >= pages) break;
        }
        const rows = candidates.filter(
          (c) =>
            !remote.some((r) => {
              const media =
                r[c.type === 'movies' ? 'movie' : c.type === 'episodes' ? 'episode' : 'show'];
              const same = Object.entries(c.ids).every(
                ([k, v]) => String(media?.ids?.[k]) === String(v),
              );
              return (
                same &&
                (kind !== 'history' || Date.parse(r.watched_at) === Date.parse(c.watched_at))
              );
            }),
        );
        const payload = { kind, rows },
          id = crypto.randomUUID();
        await storage(admin.from('anime_trakt_plans').delete().eq('owner_id', uid));
        await storage(
          admin.from('anime_trakt_plans').insert({
            id,
            owner_id: uid,
            payload,
            expires_at: new Date(now() + 600000).toISOString(),
          }),
        );
        return { planId: id, rows, skipped: candidates.length - rows.length, kind };
      }
      if (input.action === 'trakt-export-apply') {
        const plan = await storage(
          admin
            .from('anime_trakt_plans')
            .select('*')
            .eq('owner_id', uid)
            .eq('id', input.planId)
            .maybeSingle(),
        );
        if (!plan || plan.status !== 'pending' || Date.parse(plan.expires_at) <= now())
          throw Error('Parapamja skadoi ose është përdorur. Krijoje përsëri.');
        const selected = new Set(Array.isArray(input.keys) ? input.keys : []),
          rows = plan.payload.rows.filter((r) => selected.has(r.key));
        if (!rows.length) throw Error('Zgjidh të paktën një regjistrim.');
        const claimed = await storage(
          admin
            .from('anime_trakt_plans')
            .update({ status: 'running' })
            .eq('id', plan.id)
            .eq('owner_id', uid)
            .select('id')
            .maybeSingle(),
        );
        if (!claimed) throw Error('Parapamja është përdorur.');
        const body = {};
        for (const { type, ids, watched_at, rating } of rows) {
          body[type] ||= [];
          body[type].push({
            ids,
            ...(watched_at ? { watched_at } : {}),
            ...(rating ? { rating } : {}),
          });
        }
        // No automatic retry: ambiguous network outcomes require a fresh remote comparison.
        const { data } = await request('/sync/' + plan.payload.kind, access, body);
        await storage(
          admin
            .from('anime_trakt_plans')
            .update({ status: 'done' })
            .eq('id', plan.id)
            .eq('owner_id', uid),
        );
        const count = (x) =>
          Object.values(x || {}).reduce(
            (sum, n) => sum + (typeof n === 'number' ? n : Array.isArray(n) ? n.length : 0),
            0,
          );
        return {
          added: count(data.added),
          existing: count(data.existing),
          missing: count(data.not_found),
        };
      }
      throw Error('Veprim Trakt i panjohur.');
    });
  }
  return { status, action };
}
