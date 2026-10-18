const SERIES = new Set(['TV', 'TV_SHORT', 'ONA', 'TV_SERIES', 'ANIME']);
const FINISHED = new Set(['FINISHED', 'FINISHED_AIRING', 'ENDED', 'CANCELED', 'CANCELLED']);
const ACTIVE = new Set(['RELEASING', 'CURRENTLY_AIRING', 'RUNNING']);
const FUTURE = new Set(['NOT_YET_RELEASED', 'NOT_YET_AIRED', 'IN_DEVELOPMENT']);
const status = (part) => String(part.releaseStatus || '').toUpperCase();

/** A read-only view of tracked parts; personal statuses and history are never rewritten. */
export function seriesProgress(anime, releasedCount, at = Date.now()) {
  const parts = (anime.seasons || []).filter((part) => !part.hidden);
  if (!parts.some((part) => SERIES.has(String(part.format || anime.format || 'TV').toUpperCase())))
    return null;
  let released = 0,
    watched = 0;
  for (const part of parts) {
    const available = Math.max(0, Math.floor(Number(releasedCount(part, at)) || 0));
    const seen = new Set(part.watched || []);
    released += available;
    watched += [...seen].filter((n) => Number.isInteger(n) && n >= 1 && n <= available).length;
  }
  const remaining = released - watched;
  const next = parts
    .filter((part) => Number(part.nextAiringAt) * 1000 > at && Number(part.nextAiringEpisode) > 0)
    .sort((a, b) => a.nextAiringAt - b.nextAiringAt)[0];
  const known = parts.every((part) => {
    const release = status(part);
    if (FINISHED.has(release))
      return Number(part.total) > 0 && releasedCount(part, at) >= part.total;
    const scheduled = Number(part.nextAiringAt) * 1000 > at && Number(part.nextAiringEpisode) > 0;
    const evidence =
      (part.releaseEvidence && part.airedCount != null) ||
      (part.episodes || []).some((ep) => Date.parse(ep.airedAt || ep.aired || '') <= at);
    return FUTURE.has(release) || scheduled || (ACTIVE.has(release) && evidence);
  });
  const finished =
    parts.length > 0 &&
    parts.every((part) => FINISHED.has(status(part))) &&
    (anime.source !== 'TVMaze' || FINISHED.has(status(anime)));
  const unresolvedTV =
    anime.source === 'TVMaze' && !FINISHED.has(status(anime)) && !ACTIVE.has(status(anime));
  let key = 'unknown',
    label = 'Progres ende i paverifikuar',
    detail = 'Mungojnë të dhëna të konfirmuara për transmetimin.';
  if (remaining > 0) {
    key = 'continue';
    label = 'Për të vazhduar';
    detail =
      remaining +
      (remaining === 1 ? ' episod i publikuar pa parë.' : ' episode të publikuara pa parë.');
  } else if (known && !unresolvedTV && released > 0) {
    key = finished ? 'finished' : 'caught-up';
    label = finished ? 'Seri e përfunduar' : 'Në hap me episodet';
    detail = finished
      ? 'Të gjitha pjesët e regjistruara kanë përfunduar dhe janë parë.'
      : next
        ? 'Në pritje të episodit ' + next.nextAiringEpisode + '.'
        : 'Ke parë episodet e publikuara; seria ka pjesë në vazhdim ose në pritje.';
  } else if (known && !finished && released === 0) {
    key = 'upcoming';
    label = 'Në pritje të publikimit';
    detail = 'Ende pa episode të publikuara.';
  }
  return { key, label, detail, released, watched, remaining };
}
