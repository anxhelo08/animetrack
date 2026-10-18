import { seriesProgress } from '../core/series-progress.js';
import { matchesLibraryQuery } from '../core/library-discovery.js';
import { libraryWatchTimes } from '../core/watch-progress.js';
export function createLibraryRenderer(ctx) {
  const {
    $,
    STATUS,
    isMovieAnime,
    futureSeasonOf,
    count,
    isLiveMovie,
    activityEpisodes,
    percentage,
    cover,
    escapeHTML,
    releasedTotal,
    nextSeasonEp,
    nextEp,
    genreCounts,
    genresOf,
    hasNewUnwatchedEpisode,
    libraryList,
    mediaKind,
    openForm,
    releasedCount,
  } = ctx;
  let renderedLibraryOwner = '',
    renderedLibraryMarkup = '';
  return function render() {
    let { state, filter, search, sort, view, selectedGenre, libraryFocus, libraryProgress, owner } =
      ctx.snapshot();
    if (window.matchMedia('(max-width:760px)').matches && view !== 'library') return;
    if (
      view === 'library' &&
      window.matchMedia('(max-width:760px)').matches &&
      $('at113-library-search')
    ) {
      search = $('at113-library-search').value.trim().toLocaleLowerCase();
      ctx.setSearch(search);
    }
    const totals = { all: state.anime.length };
    Object.keys(STATUS).forEach(
      (s) => (totals[s] = state.anime.filter((a) => a.status === s).length),
    );
    totals.movies = state.anime.filter(isMovieAnime).length;
    totals.waiting = state.anime.filter((a) => !!futureSeasonOf(a)).length;
    totals.genres = genreCounts().length;
    document
      .querySelectorAll('[data-count]')
      .forEach((el) => (el.textContent = totals[el.dataset.count] || 0));
    $('hero-add').textContent = totals.all ? '+ Shto anime' : '+ Shto animen e parë';
    $('stat-total').textContent = totals.all;
    $('favorite-count').textContent = state.anime.filter((a) => a.favorite).length;
    $('stat-watching').textContent = totals.watching;
    $('stat-completed').textContent = totals.completed;
    $('stat-episodes').textContent = state.anime
      .reduce((s, a) => s + (isLiveMovie(a) ? 0 : count(a)), 0)
      .toLocaleString('sq-AL');
    const weekAgo = Date.now() - 7 * 86400000;
    $('stat-week').textContent =
      '+' + activityEpisodes().filter((e) => e.at >= weekAgo).length + ' gjatë 7 ditëve';
    document
      .querySelectorAll('[data-filter]')
      .forEach((b) => b.classList.toggle('active', b.dataset.filter === filter));
    const phone = window.matchMedia('(max-width:760px)').matches,
      renderOwner = owner;
    if (renderOwner !== renderedLibraryOwner) {
      renderedLibraryOwner = renderOwner;
      renderedLibraryMarkup = '';
      libraryFocus = 'all';
      libraryProgress = 'all';
      ctx.resetProgress();
      if (phone) {
        $('anime-grid').replaceChildren();
        $('continue-grid').replaceChildren();
      }
    }
    if (phone && view !== 'library') return;
    const watchTimes = libraryWatchTimes(state.anime, state.history);
    if (!phone) {
      const looking = state.anime
        .filter((a) => a.status === 'watching')
        .sort((a, b) => (watchTimes.get(b.id) || 0) - (watchTimes.get(a.id) || 0))
        .slice(0, 3);
      $('continue-section').classList.toggle(
        'hidden',
        looking.length === 0 || filter !== 'all' || !!search,
      );
      window.ATHTML.renderHTML(
        $('continue-grid'),
        looking
          .map(
            (a) =>
              `<article class="continue-card" data-status="${a.status}">${cover(a, 'continue-cover')}<div class="continue-info"><strong title="${escapeHTML(a.title)}">${escapeHTML(a.title)}</strong><span class="meta">${count(a)}/${releasedTotal(a)} episode</span><div class="progress"><span class="${window.ATHTML.percentClass(percentage(a), 'w')}"></span></div><div class="continue-bottom"><button class="ghost" data-detail="${escapeHTML(a.id)}">Detaje</button><button class="episode-pill" data-next="${escapeHTML(a.id)}" ${nextSeasonEp(a) ? '' : 'disabled'}>+ Episodi ${nextEp(a) ?? '✓'}</button></div></div></article>`,
          )
          .join(''),
      );
    }
    const genrePanel = $('genre-controls');
    genrePanel.classList.toggle('hidden', filter !== 'genres');
    if (filter === 'genres') {
      window.ATHTML.renderHTML(
        $('genre-chips'),
        `<button type="button" class="genre-chip ${selectedGenre === 'all' ? 'active' : ''}" data-genre="all">Të gjitha <span>${state.anime.length}</span></button>` +
          genreCounts()
            .map(
              (g) =>
                `<button type="button" class="genre-chip ${g.name.toLocaleLowerCase() === selectedGenre ? 'active' : ''}" data-genre="${escapeHTML(g.name.toLocaleLowerCase())}">${escapeHTML(g.name)} <span>${g.count}</span></button>`,
            )
            .join('') +
          `<button type="button" class="genre-chip ${selectedGenre === '__unknown' ? 'active' : ''}" data-genre="__unknown">Pa zhanër <span>${state.anime.filter((a) => !genresOf(a).length).length}</span></button>`,
      );
    }
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
        matchesLibraryQuery(a, search) &&
        (libraryFocus === 'all' ||
          (libraryFocus === 'unwatched' &&
            (seriesProgress(a, releasedCount)?.remaining ?? releasedTotal(a) - count(a)) > 0) ||
          (libraryFocus === 'new' && hasNewUnwatchedEpisode(a))) &&
        (libraryProgress === 'all' || seriesProgress(a, releasedCount)?.key === libraryProgress),
    );
    if (sort === 'year-new' || sort === 'year-old')
      anime = window.ATLibraryYear125.sort(anime, sort);
    else
      anime.sort((a, b) =>
        sort === 'title'
          ? a.title.localeCompare(b.title)
          : sort === 'progress'
            ? percentage(b) - percentage(a)
            : sort === 'rating'
              ? (b.rating ?? -1) - (a.rating ?? -1)
              : (watchTimes.get(b.id) || 0) - (watchTimes.get(a.id) || 0),
      );
    const selection = window.ATUnified119?.selection?.() || 'all';
    if (selection !== 'all') anime = anime.filter((a) => mediaKind(a) === selection);
    $('at125-sort-hint').hidden = sort !== 'year-new' && sort !== 'year-old';
    $('library-title').textContent =
      filter === 'all'
        ? 'Biblioteka ime'
        : filter === 'favorites'
          ? 'Të preferuarat'
          : filter === 'movies'
            ? 'Filma anime'
            : filter === 'waiting'
              ? 'Në pritje të sezonit të ri'
              : filter === 'genres'
                ? 'Sipas zhanrit'
                : STATUS[filter];
    $('library-subtitle').textContent =
      filter === 'movies'
        ? `${anime.length} filma anime në bibliotekë`
        : filter === 'waiting'
          ? `${anime.length} anime të përfunduara me vazhdim të konfirmuar`
          : filter === 'genres'
            ? `${anime.length} anime · ${selectedGenre === 'all' ? 'të gjitha zhanret' : selectedGenre === '__unknown' ? 'pa zhanër' : selectedGenre}`
            : `${anime.length} anime në këtë seksion`;
    const gridMarkup = anime.length
      ? ''
      : `<div class="empty"><div class="symbol">✦</div><h3>${state.anime.length ? 'Nuk u gjet asnjë anime' : 'Biblioteka jote është bosh'}</h3><p>${state.anime.length ? 'Ndrysho filtrin ose kërkimin.' : 'Shto animen tënde të parë dhe fillo të regjistrosh episodet.'}</p><button class="primary" id="empty-add">+ Shto anime</button></div>`;
    if (anime.length) {
      libraryList.render(
        anime,
        JSON.stringify([
          renderOwner,
          phone,
          filter,
          search,
          sort,
          selectedGenre,
          libraryFocus,
          libraryProgress,
          window.ATUnified119?.selection?.(),
        ]),
      );
      renderedLibraryMarkup = '';
    } else {
      libraryList.render(
        [],
        JSON.stringify([
          renderOwner,
          phone,
          filter,
          search,
          sort,
          selectedGenre,
          libraryFocus,
          libraryProgress,
        ]),
      );
      if (gridMarkup !== renderedLibraryMarkup || !$('anime-grid').childElementCount) {
        window.ATHTML.renderHTML($('anime-grid'), gridMarkup);
        renderedLibraryMarkup = gridMarkup;
        const empty = $('empty-add');
        if (empty) empty.addEventListener('click', () => openForm());
      }
    }
    ctx.onResults(anime.length);
    window.ATUnified119?.render(state, {
      filter,
      search,
      sort,
      genre: selectedGenre,
      owner: owner,
      total: anime.length,
    });
  };
}
