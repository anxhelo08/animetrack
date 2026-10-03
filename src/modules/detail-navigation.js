/** Tabs specialize the existing detail view; the title and resume action remain visible. */
export function createDetailNavigation(ctx) {
  const views = new WeakMap();
  const episodeSelector =
    '.seasons-topline,.season-scroller,.season-banner,.episode-jump,.episode-list,.episode-pages,.season-info,.at140-hidden-parts';
  function attach(root, id) {
    if (window.matchMedia?.('(max-width:760px)').matches) return;
    root?.classList.add('detail-tabs-enabled');
    const row = ctx.state().anime.find((row) => row.id === id);
    if (!root || !row) return;
    const owner = ctx.user()?.id || 'guest';
    let view = views.get(root);
    if (!view || view.id !== id || view.owner !== owner) {
      view?.observer?.disconnect();
      view = { id, owner, tab: 'overview', draft: null, observer: null };
      views.set(root, view);
    }
    function paint() {
      for (const child of root.children) {
        if (
          child.classList.contains('detail-section-tabs') ||
          child.matches('.detail-top,.at150-movie-hero')
        )
          continue;
        const personal =
          child.matches('.detail-personal-notes') || !!child.querySelector('[data-movie-notes]');
        const episodes = child.matches(episodeSelector) || !!child.querySelector('.episode-list');
        const related =
          child.matches('.at134-rich,#pro-rewatch') ||
          !!child.querySelector('#movie-collection') ||
          child.classList.contains('at131-franchise');
        child.hidden =
          view.tab === 'overview'
            ? child.classList.contains('detail-personal-notes')
            : view.tab === 'notes'
              ? !personal
              : view.tab === 'episodes'
                ? !episodes
                : view.tab === 'related'
                  ? !related
                  : false;
      }
      for (const button of root.querySelectorAll('[data-detail-section]')) {
        const chosen = button.dataset.detailSection === view.tab;
        button.classList.toggle('active', chosen);
        button.setAttribute('aria-pressed', String(chosen));
      }
    }
    if (!root.querySelector('.detail-section-tabs')) {
      const nav = document.createElement('nav');
      nav.className = 'detail-section-tabs reading-detail-tabs';
      nav.setAttribute('aria-label', 'Informacioni i titullit');
      window.ATHTML.renderHTML(
        nav,
        [
          ['overview', 'Përmbledhje'],
          ['episodes', row.format === 'MOVIE' ? 'Shikimi' : 'Episodet'],
          ['notes', 'Shënimet e mia'],
          ['related', 'Tituj të lidhur'],
        ]
          .map(
            ([key, title]) =>
              `<button type="button" class="ghost" data-detail-section="${key}" aria-pressed="${view.tab === key}">${title}</button>`,
          )
          .join(''),
      );
      const hero = root.querySelector(':scope > .detail-top,:scope > .at150-movie-hero');
      if (hero) hero.after(nav);
      else root.prepend(nav);
      nav.addEventListener('click', (event) => {
        const button = event.target.closest('[data-detail-section]');
        if (button) {
          view.tab = button.dataset.detailSection;
          paint();
        }
      });
    }
    if (!root.querySelector('[data-movie-notes],.detail-personal-notes')) {
      const form = document.createElement('form');
      form.className = 'detail-personal-notes reading-panel';
      window.ATHTML.renderHTML(
        form,
        `<h4>Shënimet e mia</h4><label class="reading-field">Mendimet për ${ctx.esc(row.title)}<textarea name="personalNotes" rows="5" maxlength="2500">${ctx.esc(view.draft ?? row.notes ?? '')}</textarea></label><button type="submit" class="primary">Ruaj shënimet</button>`,
      );
      root.append(form);
      form.addEventListener('input', () => {
        view.draft = form.querySelector('textarea').value;
      });
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if ((ctx.user()?.id || 'guest') !== owner) return;
        const current = ctx.state().anime.find((row) => row.id === id);
        if (!current) return;
        const before = { notes: current.notes, updatedAt: current.updatedAt };
        current.notes = String(new FormData(form).get('personalNotes') || '').slice(0, 2500);
        current.updatedAt = new Date().toISOString();
        if (!ctx.save()) {
          Object.assign(current, before);
          return;
        }
        view.draft = null;
        ctx.toast('Shënimet u ruajtën ✓');
      });
    }
    if (!view.observer) {
      view.observer = new MutationObserver(paint);
      view.observer.observe(root, { childList: true });
    }
    paint();
  }
  return { attach };
}
