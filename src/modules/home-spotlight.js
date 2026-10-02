import { navIcon } from './nav-icons.js';

const plain = (value, max = 220) =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

/** Catalogue facts are labelled as premieres or discoveries, never invented news headlines. */
export function homeStories(updates = [], library = [], now = Date.now()) {
  const anime = (item) =>
    !['TVMaze', 'TMDB', 'OMDb', 'Cinemeta', 'Wikidata'].includes(item.source) &&
    item.format !== 'TV_SERIES' &&
    item.kind !== 'tv';
  const remote = updates.filter(anime).map((item) => ({ ...item, remote: true }));
  const pool = remote.length ? remote : library.filter(anime);
  const seen = new Set();
  return pool
    .filter((item) => {
      if (!item.title || (!item.key && !item.id)) return false;
      const key = String(item.sourceId || item.id || item.key);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const rank = (item) =>
        item.releaseStatus === 'RELEASING' ? 2 : item.releaseStatus === 'NOT_YET_RELEASED' ? 1 : 0;
      return rank(b) - rank(a) || Number(b.popularity || 0) - Number(a.popularity || 0);
    })
    .slice(0, 4)
    .map((item) => {
      const nextAt = Number(item.nextAiringAt) * 1000;
      const nextEpisode = Number(item.nextAiringEpisode);
      const upcoming = nextAt > now && Number.isInteger(nextEpisode) && nextEpisode > 0;
      const start = Date.parse(item.releaseStart || '');
      const future = item.releaseStatus === 'NOT_YET_RELEASED';
      const date = upcoming ? nextAt : future && start > now ? start : null;
      const dateLabel = date
        ? new Date(date).toLocaleDateString('sq-AL', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : '';
      const badge = upcoming
        ? 'Episodi ' + nextEpisode + ' së shpejti'
        : future
          ? 'Premierë në horizont'
          : item.releaseStatus === 'RELEASING'
            ? 'Në transmetim'
            : item.remote
              ? 'Zbulim nga katalogu'
              : 'Nga biblioteka jote';
      return {
        ...item,
        storyKey: String(item.remote ? item.key : item.id),
        title: plain(item.title, 180),
        synopsis: plain(item.synopsis, 240),
        badge,
        dateLabel,
        sourceLabel: item.remote ? 'AniList' : 'Biblioteka jote',
        genresLabel: plain(item.genre, 100).split(',').slice(0, 2).join(' · '),
      };
    });
}

/** One stable, responsive spotlight; timers stop offscreen, in dialogs and for reduced motion. */
export function createHomeSpotlight(ctx) {
  let root,
    stories = [],
    activeKey = '',
    signature = '',
    timer;
  let paused = false,
    hovered = false,
    focused = false,
    intersecting = false;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const esc = ctx.esc;
  const image = (item, kind) => {
    const url = ctx.poster(kind === 'backdrop' ? item.backdrop || item.cover : item.cover);
    return url
      ? `<img class="pulse-${kind}" src="${esc(url)}" alt="" decoding="async" ${kind === 'backdrop' ? 'fetchpriority="high"' : 'loading="lazy"'} referrerpolicy="no-referrer">`
      : '';
  };
  const current = () =>
    Math.max(
      0,
      stories.findIndex((item) => item.storyKey === activeKey),
    );
  function canMove() {
    return (
      root &&
      !root.hidden &&
      intersecting &&
      !paused &&
      !hovered &&
      !focused &&
      !motion.matches &&
      !document.hidden &&
      !root.closest('.hidden') &&
      stories.length > 1 &&
      !document.querySelector('.modal-backdrop.show, .at124-command.show')
    );
  }
  function schedule() {
    clearTimeout(timer);
    if (!root) return;
    root.dataset.motion = canMove() ? 'running' : 'paused';
    if (canMove())
      timer = setTimeout(() => {
        if (canMove()) select(current() + 1);
        else schedule();
      }, 7000);
  }
  function paint() {
    if (!root) return;
    const item = stories[current()];
    const title = item?.title || 'Histori të reja. Emocione të mëdha.';
    const description =
      item?.synopsis ||
      (item
        ? 'Hap detajet, zbulo historinë dhe zgjidh episodin që do të shikosh.'
        : 'Zbulo anime, ndiq premierat dhe gjej historinë tënde të radhës.');
    const score = item?.score ?? item?.communityScore;
    const rating = Number.isFinite(Number(score)) && Number(score) > 0 ? Number(score) / 10 : null;
    const focusedButton = root.contains(document.activeElement) ? document.activeElement : null;
    const focusAction = focusedButton?.dataset.pulseAction,
      focusKey = focusedButton?.dataset.key;
    window.ATHTML.renderHTML(
      root,
      `
      <div class="pulse-heading"><div><span class="pulse-brand">${navIcon('recommendations')} ANIME PULSE</span><h2>Në fokus <span>Çfarë vjen më pas?</span></h2></div><button type="button" class="pulse-text-link" data-pro-page="seasons">Eksploro sezonin <span aria-hidden="true">↗</span></button></div>
      <div class="pulse-layout">
        <article class="pulse-stage" aria-label="${esc(title)}">
          <div class="pulse-art" aria-hidden="true">${item ? image(item, 'backdrop') : ''}<span class="pulse-orbit"></span><span class="pulse-orbit second"></span><span class="pulse-grain"></span></div>
          <div class="pulse-stage-top"><span class="pulse-badge"><span aria-hidden="true"></span>${esc(item?.badge || 'Zbulo anime')}</span><span class="pulse-source">${esc(item?.sourceLabel || 'ANIMETRACK')}</span></div>
          <div class="pulse-stage-body"><div class="pulse-copy"><div class="pulse-meta">${esc(item?.genresLabel || 'Bota e animeve')}${item?.year ? ' <span>·</span> ' + esc(item.year) : ''}${rating ? ' <span>·</span> ★ ' + rating.toFixed(1) : ''}</div><h3>${esc(title)}</h3><p>${esc(description)}</p>${item?.dateLabel ? `<div class="pulse-date">${navIcon('calendar')} ${esc(item.dateLabel)}</div>` : ''}<div class="pulse-actions"><button type="button" class="pulse-primary" data-pulse-action="open" data-key="${esc(item?.storyKey || '')}">${navIcon('watch')} ${item?.remote ? 'Zbulo animen' : item ? 'Hap animen' : 'Zbulo anime'}</button><button type="button" class="pulse-secondary" data-pro-page="calendar">${navIcon('calendar')} Kalendari</button></div></div>${item ? `<div class="pulse-poster-wrap" aria-hidden="true">${image(item, 'poster')}<span class="pulse-poster-caption">${esc(item.format === 'MOVIE' ? 'FILM ANIME' : 'ANIME SERIES')}</span></div>` : ''}</div>
          <div class="pulse-stage-bottom"><div class="pulse-pagination" role="group" aria-label="Anime në fokus">${stories.map((story, index) => `<button type="button" class="pulse-dot" data-pulse-action="select" data-key="${esc(story.storyKey)}" aria-label="Shfaq ${esc(story.title)}" aria-pressed="${current() === index}"><span aria-hidden="true"></span></button>`).join('')}</div><div class="pulse-playback">${stories.length > 1 ? `<span class="pulse-counter">${String(current() + 1).padStart(2, '0')} <span>/ ${String(stories.length).padStart(2, '0')}</span></span><button type="button" data-pulse-action="previous" aria-label="Anime e mëparshme">‹</button><button type="button" data-pulse-action="next" aria-label="Anime pasardhëse">›</button><button type="button" data-pulse-action="pause" aria-label="${paused ? 'Vazhdo' : 'Ndalo'} kalimin automatik" aria-pressed="${paused}">${paused ? '▷' : 'Ⅱ'}</button>` : '<span class="pulse-counter">HISTORIA JOTE E RADHËS</span>'}</div></div>
        </article>
        <aside class="pulse-desk" aria-label="Zbulime dhe premiera anime"><div class="pulse-desk-heading"><span class="pulse-live" aria-hidden="true"></span><strong>RADARI ANIME</strong><span>✦</span></div><p>Premiera, episode të ardhshme dhe histori për t’u zbuluar.</p><div class="pulse-stories">${stories.map((story, index) => `<button type="button" class="pulse-story" data-pulse-action="select" data-key="${esc(story.storyKey)}" aria-pressed="${current() === index}"><span class="pulse-story-number">${String(index + 1).padStart(2, '0')}</span><span class="pulse-story-copy"><small>${esc(story.badge)}</small><strong>${esc(story.title)}</strong><span>${esc(story.dateLabel || story.genresLabel || story.sourceLabel)}</span></span><span class="pulse-story-cover">${image(story, 'thumb')}</span></button>`).join('') || '<div class="pulse-desk-empty">Titujt dhe premierat shfaqen kur katalogu është i disponueshëm.</div>'}</div><button type="button" class="pulse-desk-footer" data-pro-page="recommendations">Gjej diçka për ty ${navIcon('recommendations')} <span aria-hidden="true">↗</span></button></aside>
      </div><span class="sr-only" id="pulse-announcement" aria-live="polite"></span>`,
    );
    if (focusAction) {
      const target = [...root.querySelectorAll('[data-pulse-action]')].find(
        (button) =>
          button.dataset.pulseAction === focusAction &&
          (!focusKey || button.dataset.key === focusKey),
      );
      target?.focus({ preventScroll: true });
    }
    schedule();
  }
  function select(index, manual = false) {
    if (!stories.length) return;
    activeKey = stories[(index + stories.length) % stories.length].storyKey;
    paint();
    if (manual) root.querySelector('#pulse-announcement').textContent = stories[current()].title;
  }
  function refresh() {
    if (!root) return;
    const library = ctx.state().anime || [];
    root.hidden = !library.length;
    root.classList.toggle('pulse-is-hidden', root.hidden);
    const nextStories = homeStories(ctx.animeUpdates?.() || [], library);
    const nextSignature = JSON.stringify(
      nextStories.map((item) => [
        item.storyKey,
        item.title,
        item.synopsis,
        item.badge,
        item.dateLabel,
        item.sourceLabel,
        item.genresLabel,
        item.cover,
        item.backdrop,
        item.year,
        item.score,
        item.communityScore,
        item.format,
      ]),
    );
    stories = nextStories;
    if (signature !== nextSignature) {
      signature = nextSignature;
      if (!stories.some((item) => item.storyKey === activeKey))
        activeKey = stories[0]?.storyKey || '';
      paint();
    }
    schedule();
  }
  function mount(home) {
    if (!home || root) return;
    root = document.createElement('section');
    root.id = 'home-anime-pulse';
    root.setAttribute('aria-label', 'Anime në fokus dhe premiera');
    home.prepend(root);
    root.addEventListener('click', (event) => {
      const button = event.target.closest('[data-pulse-action]');
      if (!button) return;
      const action = button.dataset.pulseAction;
      if (action === 'select')
        select(
          stories.findIndex((item) => item.storyKey === button.dataset.key),
          true,
        );
      if (action === 'next' || action === 'previous')
        select(current() + (action === 'next' ? 1 : -1), true);
      if (action === 'pause') {
        paused = !paused;
        paint();
      }
      if (action === 'open') {
        const item = stories.find((item) => item.storyKey === button.dataset.key);
        if (!item) ctx.navigate('recommendations');
        else if (item.remote) ctx.previewItem(item);
        else ctx.openAnime(item.id);
      }
    });
    root.addEventListener('pointerenter', () => {
      hovered = true;
      schedule();
    });
    root.addEventListener('pointerleave', () => {
      hovered = false;
      schedule();
    });
    root.addEventListener('focusin', () => {
      focused = true;
      schedule();
    });
    root.addEventListener('focusout', (event) => {
      focused = root.contains(event.relatedTarget);
      schedule();
    });
    root.addEventListener(
      'error',
      (event) => {
        if (event.target.matches('img')) event.target.classList.add('pulse-image-unavailable');
      },
      true,
    );
    if ('IntersectionObserver' in window)
      new IntersectionObserver(
        ([entry]) => {
          intersecting = entry.isIntersecting;
          root.classList.toggle('pulse-in-view', intersecting);
          schedule();
        },
        { threshold: 0.1 },
      ).observe(root);
    else intersecting = true;
    document.addEventListener('visibilitychange', schedule);
    window.addEventListener('at-command-visibility', schedule);
    motion.addEventListener('change', schedule);
    const observer = new MutationObserver(schedule);
    observer.observe(home, { attributes: true, attributeFilter: ['class'] });
    for (const modal of document.querySelectorAll('.modal-backdrop,#at124-command'))
      observer.observe(modal, { attributes: true, attributeFilter: ['class', 'hidden'] });
    refresh();
  }
  return { mount, refresh };
}
