/** Finales require a confirmed finished part, never the end of a partial cache. */
export function calendarKind(event, library) {
  const anime = library.find((a) => a.id === event.animeId),
    part = anime?.seasons?.find((s) => s.id === event.seasonId);
  if (!part || part.hidden) return {};
  const episode = Number(event.seasonEpisode || event.episode),
    visible = anime.seasons.filter((s) => !s.hidden);
  return {
    premiere: episode === 1 && visible[0]?.id === part.id,
    season: episode === 1,
    finale:
      ['FINISHED', 'FINISHED_AIRING'].includes(part.releaseStatus) &&
      Number(part.total) > 0 &&
      episode === Number(part.total),
  };
}
export function calendarMatches(event, library, mode) {
  return !['premiere', 'season', 'finale'].includes(mode) || !!calendarKind(event, library)[mode];
}
