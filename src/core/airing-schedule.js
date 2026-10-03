const DAY = 86400000;
let nextJikanRequest = 0;
const numeric = (x) => /^\d{1,9}$/.test(String(x || '')) && Number(x) > 0;
export function airingIdentities(anime) {
  const ids = new Map();
  const add = (row) => {
    const provider = /anilist/i.test(row.source)
      ? 'anilist'
      : /myanimelist|jikan/i.test(row.source)
        ? 'mal'
        : /tvmaze/i.test(row.source)
          ? 'tvmaze'
          : '';
    if (provider && numeric(row.sourceId))
      ids.set(provider + ':' + row.sourceId, {
        provider,
        id: String(row.sourceId),
        malId: numeric(row.malId) ? String(row.malId) : '',
      });
    if (numeric(row.malId) && provider !== 'anilist')
      ids.set('mal:' + row.malId, { provider: 'mal', id: String(row.malId) });
  };
  add(anime);
  for (const part of anime.seasons || []) add(part);
  for (const key of anime.providerIds || []) {
    const [provider, id] = key.split(':');
    if (['anilist', 'mal', 'tvmaze'].includes(provider) && numeric(id) && !ids.has(key))
      ids.set(key, { provider, id });
  }
  return [...ids.values()];
}
const fields = `id idMal title{romaji english} nextAiringEpisode{airingAt episode}`;
export const AIRING_QUERY = `query($id:Int,$idMal:Int){Media(id:$id,idMal:$idMal,type:ANIME){${fields} relations{edges{relationType node{${fields}}}}}}`;
export const SCHEDULE_QUERY = `query($ids:[Int],$after:Int,$before:Int,$page:Int){Page(page:$page,perPage:50){pageInfo{hasNextPage}airingSchedules(mediaId_in:$ids,airingAt_greater:$after,airingAt_lesser:$before,sort:TIME){mediaId episode airingAt}}}`;
/** Exact provider identities only. Broadcast weekday is never converted into a fictional episode date. */
export async function fetchAiringSchedule(
  identity,
  { fetcher = fetch, now = Date.now(), signal } = {},
) {
  const events = [],
    checks = [],
    aliases = [],
    notices = [];
  const request = async (url, options = {}) => {
    if (url.startsWith('https://api.jikan.moe/') && fetcher === fetch) {
      const tick = performance.now(),
        wait = Math.max(0, nextJikanRequest - tick);
      nextJikanRequest = Math.max(tick, nextJikanRequest) + 450;
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      if (signal?.aborted) throw Error('Schedule check cancelled');
    }
    const res = await fetcher(url, { ...options, signal: signal || AbortSignal.timeout(12000) });
    if (!res.ok) throw Error('Provider unavailable');
    const data = await res.json();
    if (data.errors?.length) throw Error('Provider unavailable');
    return data;
  };
  const checked = async (source, work) => {
    try {
      await work();
      checks.push({ source, status: 'ok' });
    } catch {
      checks.push({ source, status: 'unavailable' });
    }
  };
  const add = (e) => {
    if (
      Number.isInteger(e.episode) &&
      e.episode > 0 &&
      e.episode <= 10000 &&
      Number.isFinite(e.when) &&
      e.when >= now - 30 * DAY &&
      e.when <= now + 120 * DAY
    )
      events.push(e);
  };
  let mal = numeric(identity.malId)
    ? String(identity.malId)
    : identity.provider === 'mal'
      ? identity.id
      : '';
  if (identity.provider !== 'tvmaze')
    await checked('AniList', async () => {
      const data = await request('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: AIRING_QUERY,
          variables:
            identity.provider === 'anilist'
              ? { id: Number(identity.id) }
              : { idMal: Number(identity.id) },
        }),
      });
      const media = data.data?.Media;
      if (!media?.id) throw Error('Missing identity');
      aliases.push('anilist:' + media.id);
      if (media.idMal) {
        mal = String(media.idMal);
        aliases.push('mal:' + mal);
      }
      const append = (m) => {
        const providerKey = 'anilist:' + m.id,
          malKey = m.idMal ? 'mal:' + m.idMal : '';
        for (const item of [
          ...(m.airingSchedule?.nodes || []),
          ...(m.future?.nodes || []),
          m.nextAiringEpisode,
        ].filter(Boolean))
          add({
            providerKey,
            malKey,
            episode: Number(item.episode),
            when: Number(item.airingAt) * 1000,
            partTitle: m.title?.english || m.title?.romaji || '',
            source: 'AniList',
            url: 'https://anilist.co/anime/' + m.id,
          });
      };
      const linked = [
        media,
        ...(media.relations?.edges || [])
          .filter((edge) => edge.relationType === 'SEQUEL' && edge.node?.id)
          .map((edge) => edge.node),
      ].slice(0, 10);
      for (const m of linked) append(m);
      const byId = new Map(linked.map((m) => [m.id, m]));
      for (let page = 1; page <= 10; page++) {
        const data = await request('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: SCHEDULE_QUERY,
            variables: {
              ids: [...byId.keys()],
              after: Math.floor((now - 30 * DAY) / 1000),
              before: Math.floor((now + 120 * DAY) / 1000),
              page,
            },
          }),
        });
        if (!Array.isArray(data.data?.Page?.airingSchedules)) throw Error('Missing schedule');
        for (const item of data.data.Page.airingSchedules) {
          const m = byId.get(item.mediaId);
          if (!m) continue;
          add({
            providerKey: 'anilist:' + m.id,
            malKey: m.idMal ? 'mal:' + m.idMal : '',
            episode: Number(item.episode),
            when: Number(item.airingAt) * 1000,
            partTitle: m.title?.english || m.title?.romaji || '',
            source: 'AniList',
            url: 'https://anilist.co/anime/' + m.id,
          });
        }
        if (!data.data.Page.pageInfo?.hasNextPage) break;
      }
    });
  // Independent MAL episode dates fill missing/recent episodes without repeating the entire archive.
  if (mal)
    await checked('MyAnimeList / Jikan', async () => {
      const full = await request('https://api.jikan.moe/v4/anime/' + mal + '/full');
      const ids = [
        mal,
        ...(full.data?.relations || [])
          .filter((r) => r.relation === 'Sequel')
          .flatMap((r) =>
            (r.entry || [])
              .filter((e) => e.type === 'anime' && numeric(e.mal_id))
              .map((e) => String(e.mal_id)),
          )
          .slice(0, 3),
      ];
      for (const id of ids) {
        const first = await request('https://api.jikan.moe/v4/anime/' + id + '/episodes');
        const pages = [first];
        const last = Number(first.pagination?.last_visible_page) || 1;
        if (last > 1)
          pages.push(
            await request('https://api.jikan.moe/v4/anime/' + id + '/episodes?page=' + last),
          );
        for (const page of pages)
          for (const ep of page.data || [])
            if (ep.aired)
              add({
                providerKey: 'mal:' + id,
                episode: Number(ep.mal_id),
                when: Date.parse(ep.aired),
                partTitle: id === mal ? full.data?.title_english || full.data?.title || '' : '',
                source: 'MyAnimeList / Jikan',
                url: 'https://myanimelist.net/anime/' + id,
              });
      }
    });
  if (identity.provider === 'tvmaze')
    await checked('TVMaze', async () => {
      const eps = await request(
        'https://api.tvmaze.com/shows/' + identity.id + '/episodes?specials=1',
      );
      if (!Array.isArray(eps)) throw Error('Missing episodes');
      for (const ep of eps)
        if (ep.airstamp && numeric(ep.number))
          add({
            providerKey: 'tvmaze:' + identity.id,
            seasonNumber: Number(ep.season),
            episode: Number(ep.number),
            when: Date.parse(ep.airstamp),
            partTitle: ep.name || '',
            source: 'TVMaze',
            url: 'https://www.tvmaze.com/shows/' + identity.id,
          });
    });
  if (!checks.some((c) => c.status === 'ok')) throw Error('No schedule provider available');
  if (!events.length) notices.push('Pa datë episodi të konfirmuar');
  const unique = new Map();
  for (const e of events) {
    const key = [e.malKey || e.providerKey, e.seasonNumber || '', e.episode].join(':');
    const prior = unique.get(key);
    if (!prior || e.source === 'AniList') unique.set(key, e);
  }
  return {
    events: [...unique.values()],
    checks,
    aliases,
    notices,
    checkedAt: new Date(now).toISOString(),
  };
}
export function mapAiringEvents(anime, result) {
  return (result.events || []).map((e) => {
    const keys = [e.providerKey, e.malKey].filter(Boolean);
    const season = (anime.seasons || []).find(
      (s) =>
        airingIdentities({ ...s, seasons: [] }).some((id) =>
          keys.includes(id.provider + ':' + id.id),
        ) &&
        (!e.seasonNumber ||
          Number(
            s.tvSeasonNumber ||
              s.imdbSeasonNumber ||
              s.seasonNumber ||
              String(s.id).match(/season-(\d+)/)?.[1],
          ) === e.seasonNumber),
    );
    // An untracked sequel must never inherit the old season's watched flags or controls.
    return {
      ...e,
      animeId: anime.id,
      title: anime.title,
      cover: anime.cover,
      seasonId: season?.id || '',
      season: season?.title || e.partTitle || 'Vazhdim i konfirmuar',
      seasonEpisode: e.episode,
    };
  });
}

export function mergeAiringEvents(entries, now = Date.now()) {
  const rows = new Map();
  for (const e of entries) {
    if (
      !e?.animeId ||
      !Number.isFinite(e.when) ||
      e.when < now - 30 * DAY ||
      e.when > now + 120 * DAY
    )
      continue;
    const part = e.malKey || e.providerKey || e.seasonId || e.season;
    const key = [e.animeId, part, e.seasonNumber || '', e.episode].join(':');
    const prior = rows.get(key);
    if (!prior || (e.source === 'AniList' && prior.source !== 'AniList')) rows.set(key, e);
  }
  return [...rows.values()].sort((a, b) => a.when - b.when).slice(0, 2000);
}
