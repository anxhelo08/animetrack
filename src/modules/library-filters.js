const statuses = {
  watching: 'Po shikoj',
  completed: 'Përfunduar',
  planning: 'Në listë',
  paused: 'Në pauzë',
  dropped: 'E lënë',
  favorites: 'Të preferuarat',
  waiting: 'Në pritje',
  movies: 'Filma',
  genres: 'Sipas zhanrit',
};
export function activeLibraryFilters(s) {
  const chips = [];
  if (s.filter !== 'all' && statuses[s.filter])
    chips.push({ key: 'status', label: statuses[s.filter] });
  if (s.search) chips.push({ key: 'search', label: 'Kërkimi: ' + s.search });
  if (s.media !== 'all')
    chips.push({
      key: 'media',
      label: { anime: 'Anime', tv: 'Seriale TV', movie: 'Filma' }[s.media],
    });
  if (s.focus !== 'all')
    chips.push({ key: 'focus', label: s.focus === 'new' ? 'Episode të reja' : 'Episode pa parë' });
  if (s.progress !== 'all')
    chips.push({
      key: 'progress',
      label: {
        continue: 'Për të vazhduar',
        'caught-up': 'Në hap me episodet',
        finished: 'Seri të përfunduara',
        unknown: 'Pa të dhëna',
      }[s.progress],
    });
  if (s.filter === 'genres' && s.genre !== 'all')
    chips.push({ key: 'genre', label: s.genre === '__unknown' ? 'Pa zhanër' : s.genre });
  return chips;
}
/** Reuses existing controls and handlers; changing filters never writes library data. */
export function createLibraryFilters({ el: $, html, snapshot, change }) {
  let root,
    panel,
    previous = '';
  function mount() {
    const strip = $('library-status-strip');
    if (!strip) return;
    if (!root) {
      root = document.createElement('section');
      root.className = 'library-filter-toolbar';
      root.setAttribute('aria-label', 'Kërkimi dhe filtrat e bibliotekës');
      html.renderHTML(
        root,
        '<div data-library-query></div><div data-library-status></div><details id="mobile-library-controls" class="library-filter-panel"><summary>Filtra dhe renditje <span data-library-filter-count></span></summary><div class="library-filter-body"><div class="library-secondary-filters" role="group" aria-label="Kategori"><button type="button" data-filter="favorites" class="ghost">Të preferuarat</button><button type="button" data-filter="waiting" class="ghost">Në pritje</button><button type="button" data-filter="genres" class="ghost">Zhanret</button></div></div></details><p id="library-results-count" role="status"></p><div id="library-active-filters" class="library-active-filters" role="group" aria-label="Filtrat aktivë"></div>',
      );
      strip.before(root);
      root.querySelector('[data-library-status]').append(strip);
      panel = $('mobile-library-controls');
      root.addEventListener('click', (e) => {
        const button = e.target.closest('[data-clear-library]');
        if (button) {
          change(button.dataset.clearLibrary);
          panel.querySelector('summary').focus();
        }
      });
    }
    const query = $('at113-library-search')?.closest('label');
    if (query && !root.querySelector('[data-library-query]').contains(query))
      root.querySelector('[data-library-query]').append(query);
    const body = root.querySelector('.library-filter-body');
    for (const node of [
      document.querySelector('#library-view .at119-media-filter'),
      document.querySelector('#library-view .library-focus'),
      document.querySelector('#library-view .library-progress-controls'),
      $('genre-controls'),
      document.querySelector('#library-view .toolrow'),
      document.querySelector('#library-view .series-repair-panel'),
      $('at116-import'),
    ])
      if (node && !body.contains(node)) body.append(node);
    $('filters')?.classList.add('hidden');
    // One sort control and one media control serve phone and desktop.
    document.querySelector('#at113-library-head .at117-library-tools')?.classList.add('hidden');
  }
  function update() {
    mount();
    if (!root) return;
    const s = snapshot(),
      chips = activeLibraryFilters(s);
    root.querySelector('[data-library-filter-count]').textContent = chips.length
      ? `(${chips.length})`
      : '';
    $('library-results-count').textContent =
      `${s.total} tituj` + (s.filter === 'all' ? ' · Titujt në plan i gjen te «Në listë».' : '');
    const markup =
      chips
        .map(
          (c) =>
            '<button type="button" class="ghost" data-clear-library="' +
            c.key +
            '" aria-label="Hiq filtrin ' +
            html.escapeHTML(c.label) +
            '">' +
            html.escapeHTML(c.label) +
            ' <span aria-hidden="true">×</span></button>',
        )
        .join('') +
      (chips.length
        ? '<button type="button" class="ghost" data-clear-library="all">Pastro filtrat</button>'
        : '');
    if (markup !== previous) {
      html.renderHTML($('library-active-filters'), markup);
      previous = markup;
    }
  }
  return { mount, update };
}
