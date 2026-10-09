import {
  airingIdentities,
  fetchAiringSchedule,
  mapAiringEvents,
  mergeAiringEvents,
} from './airing-schedule.js';
/** Already-confirmed dates remain useful while provider requests run. Never infer dates from weekdays. */
export function savedAiringEvents(anime) {
  return (anime.seasons || []).flatMap((season) => {
    const identities = airingIdentities({ ...season, seasons: [] }),
      primary = identities[0];
    const base = {
      providerKey: primary ? primary.provider + ':' + primary.id : '',
      malKey: /^\d+$/.test(String(season.malId || '')) ? 'mal:' + season.malId : '',
      animeId: anime.id,
      title: anime.title,
      cover: anime.cover,
      seasonId: season.id,
      season: season.title,
      source: season.source || anime.source || 'Katalogu',
      url: season.sourceUrl || anime.sourceUrl || '',
    };
    const rows = (season.episodes || []).flatMap((ep) => {
      const raw = ep.airedAt || ep.aired,
        when = typeof raw === 'number' ? raw : Date.parse(raw || '');
      return Number.isFinite(when) && Number.isInteger(ep.number) && ep.number > 0
        ? [{ ...base, episode: ep.number, seasonEpisode: ep.number, when }]
        : [];
    });
    const episode = Number(season.nextAiringEpisode),
      when = Number(season.nextAiringAt) * 1000;
    if (Number.isInteger(episode) && episode > 0 && when > 0)
      rows.push({ ...base, episode, seasonEpisode: episode, when });
    return rows;
  });
}
/** Publish cached and partial results; a slow or failed provider cannot erase a confirmed event. */
export async function loadLibraryAiring(
  anime,
  {
    readCache = async () => [],
    fetchSchedule = fetchAiringSchedule,
    force = false,
    now = Date.now(),
    onUpdate = () => {},
    isCurrent = () => true,
  } = {},
) {
  const targets = [...anime].sort(
    (a, b) =>
      (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0) ||
      Number(b.status === 'watching') - Number(a.status === 'watching'),
  );
  const identities = new Map(
    targets.flatMap(airingIdentities).map((id) => [id.provider + ':' + id.id, id]),
  );
  for (const identity of identities.values())
    if (identity.provider === 'anilist' && identity.malId)
      identities.delete('mal:' + identity.malId);
  const results = new Map(),
    fresh = new Set(),
    failed = new Set(),
    attempted = new Set();
  const publish = () => {
    if (!isCurrent()) return;
    const rows = targets.flatMap(savedAiringEvents),
      coverage = [];
    for (const title of targets) {
      const ids = airingIdentities(title),
        found = [
          ...new Set(ids.map((id) => results.get(id.provider + ':' + id.id)).filter(Boolean)),
        ].sort((a, b) => (Date.parse(a.checkedAt) || 0) - (Date.parse(b.checkedAt) || 0));
      for (const result of found) rows.push(...mapAiringEvents(title, result));
      coverage.push({
        animeId: title.id,
        title: title.title,
        checkedAt:
          found
            .map((r) => r.checkedAt)
            .filter(Boolean)
            .sort()
            .at(-1) || null,
        checks: found.flatMap((r) => r.checks || []),
        status: rows.some((e) => e.animeId === title.id && e.when > now)
          ? 'scheduled'
          : !ids.length
            ? 'unlinked'
            : found.length
              ? 'unannounced'
              : ids.some(
                    (id) =>
                      identities.has(id.provider + ':' + id.id) &&
                      !attempted.has(id.provider + ':' + id.id),
                  )
                ? 'pending'
                : 'unavailable',
      });
    }
    onUpdate({
      events: mergeAiringEvents(rows, now),
      coverage,
      failures: failed.size,
      total: identities.size,
      checked: attempted.size,
    });
  };
  publish();
  try {
    for (const row of await readCache([...identities.keys()])) {
      if (!isCurrent()) return;
      if (!row.result || !Number.isFinite(Date.parse(row.checked_at))) continue;
      results.set(row.lookup_key, row.result);
      const missingPart = targets.some(
        (title) =>
          airingIdentities(title).some((id) => id.provider + ':' + id.id === row.lookup_key) &&
          mapAiringEvents(title, row.result).some(
            (event) => event.when <= now && !event.seasonId && !event.format,
          ),
      );
      if (Date.parse(row.checked_at) > now - 86400000 && !force && !missingPart) {
        fresh.add(row.lookup_key);
        attempted.add(row.lookup_key);
      }
    }
  } catch {
    /* Provider fetches remain available when the metadata cache is offline. */
  }
  publish();
  const pending = [...identities.entries()].filter(([key]) => !fresh.has(key));
  for (let offset = 0; offset < pending.length; offset += 2) {
    if (!isCurrent()) return;
    await Promise.all(
      pending.slice(offset, offset + 2).map(async ([key, identity]) => {
        if (attempted.has(key)) return;
        try {
          const result = await fetchSchedule(identity, { signal: AbortSignal.timeout(22000) });
          if (!isCurrent()) return;
          const old = results.get(key);
          if (result.checks?.some((c) => c.status !== 'ok')) {
            failed.add(key);
            result.events = mergeProviderEvents(
              [...(old?.events || []), ...(result.events || [])],
              now,
            );
          }
          results.set(key, result);
          for (const alias of result.aliases || [])
            if (identities.has(alias)) {
              results.set(alias, result);
              attempted.add(alias);
            }
        } catch {
          failed.add(key);
        } finally {
          attempted.add(key);
        }
      }),
    );
    publish();
  }
  return { failures: failed.size };
}
function mergeProviderEvents(events, now) {
  const rows = new Map();
  for (const e of events)
    if (Number.isFinite(e.when) && e.when >= now - 30 * 86400000 && e.when <= now + 120 * 86400000)
      rows.set([e.malKey || e.providerKey, e.seasonNumber || '', e.episode].join(':'), e);
  return [...rows.values()];
}
