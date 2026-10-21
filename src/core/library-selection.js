import { seriesProgress } from './series-progress.js';
import { createLibraryQuery } from './library-discovery.js';
/** Selection owns filtering and ordering; the renderer alone owns DOM and owner scope.
 * No persistent model cache: catalogue and watch updates can mutate existing rows. */
export function createLibrarySelection({
  isMovieAnime,
  futureSeasonOf,
  count,
  releasedTotal,
  releasedCount,
  genresOf,
  hasNewUnwatchedEpisode,
  percentage,
  mediaKind,
  sortYears,
}) {
  return ({
    state,
    filter,
    search,
    sort,
    selectedGenre,
    libraryFocus,
    libraryProgress,
    watchTimes,
    selection,
  }) => {
    const matches = createLibraryQuery(search);
    let anime = state.anime.filter(
      (a) =>
        ((filter === 'all' && a.status !== 'planning') ||
          (filter === 'favorites'
            ? a.favorite
            : filter === 'movies'
              ? isMovieAnime(a)
              : filter === 'waiting'
                ? !!futureSeasonOf(a)
                : filter === 'genres'
                  ? selectedGenre === 'all' ||
                    (selectedGenre === '__unknown'
                      ? !genresOf(a).length
                      : genresOf(a).some((g) => g.toLocaleLowerCase() === selectedGenre))
                  : a.status === filter)) &&
        matches(a) &&
        (libraryFocus === 'all' ||
          (libraryFocus === 'unwatched' &&
            (seriesProgress(a, releasedCount)?.remaining ?? releasedTotal(a) - count(a)) > 0) ||
          (libraryFocus === 'new' && hasNewUnwatchedEpisode(a))) &&
        (libraryProgress === 'all' || seriesProgress(a, releasedCount)?.key === libraryProgress),
    );
    const progressScores =
      sort === 'progress' ? new Map(anime.map((a) => [a.id, percentage(a)])) : null;
    if (sort === 'year-new' || sort === 'year-old') anime = sortYears(anime, sort);
    else
      anime.sort((a, b) =>
        sort === 'title'
          ? a.title.localeCompare(b.title)
          : sort === 'progress'
            ? progressScores.get(b.id) - progressScores.get(a.id)
            : sort === 'rating'
              ? (b.rating ?? -1) - (a.rating ?? -1)
              : (watchTimes.get(b.id) || 0) - (watchTimes.get(a.id) || 0),
      );
    if (selection !== 'all') anime = anime.filter((a) => mediaKind(a) === selection);
    return anime;
  };
}
