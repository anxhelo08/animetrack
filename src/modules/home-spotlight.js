import { catalogJSON } from '../core/request-cache.js';
import { navIcon } from './nav-icons.js';

export const trailerId = (value) =>
  value?.site === 'youtube' && /^[a-zA-Z0-9_-]{11}$/.test(value.id || '') ? value.id : '';

const plain = (value, max = 220) =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

export const dayNumber = (now) =>
  Math.floor(
    Date.parse(new Date(now).toLocaleDateString('sv-SE', { timeZone: 'Europe/Tirane' })) / 86400000,
  );

/** Catalogue facts are labelled as premieres or discoveries, never invented news headlines. */
export function homeStories(updates = [], library = [], now = Date.now()) {
  const anime = (item) =>
    !['TVMaze', 'TMDB', 'OMDb', 'Cinemeta', 'Wikidata'].includes(item.source) &&
    item.format !== 'TV_SERIES' &&
    item.kind !== 'tv';
  const remote = updates.filter(anime).map((item) => ({ ...item, remote: true }));
  const pool = remote.length ? remote : library.filter(anime);
  const seen = new Set();
  const dailyPool = pool
    .filter((item) => {
      if (!item.title || (!item.key && !item.id)) return false;
      const key = String(item.sourceId || item.id || item.key);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) =>
      String(a.sourceId || a.id || a.key).localeCompare(String(b.sourceId || b.id || b.key), 'en', {
        numeric: true,
      }),
    );
  // Four fresh picks each Tirana day; small catalogues rotate one place.
  const offset = dailyPool.length
    ? (dayNumber(now) * (dailyPool.length >= 8 ? 4 : 1)) % dailyPool.length
    : 0;
  return [...dailyPool.slice(offset), ...dailyPool.slice(0, offset)].slice(0, 4).map((item) => {
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
          timeZone: 'Europe/Tirane',
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

/** One continuous timeline. Hidden routes need no timer; returning catches up to elapsed time. */
export function createHomeSpotlight(ctx) {
  let root,
    stories = [],
    activeKey = '',
    signature = '',
    timer,
    dayTimer,
    shownDay,
    nextAt,
    animationEpoch = performance.now();
  const artwork = new Map(),
    artworkRequests = new Set();
  let intersecting = false,
    previewEndTimer,
    previewEnabled = true;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const phone = window.matchMedia('(max-width: 760px)');
  const esc = ctx.esc;
  const image = (item, kind, active = false) => {
    const url = ctx.poster(kind === 'backdrop' ? item.backdrop : item.cover);
    return url
      ? `<img class="pulse-${kind}" src="${esc(url)}" alt="" decoding="async" loading="${kind === 'backdrop' || active ? 'eager' : 'lazy'}" fetchpriority="${active && kind === 'backdrop' ? 'high' : 'low'}" referrerpolicy="no-referrer">`
      : '';
  };
  const current = () =>
    Math.max(
      0,
      stories.findIndex((item) => item.storyKey === activeKey),
    );
  function visible() {
    return (
      root &&
      !root.hidden &&
      intersecting &&
      !phone.matches &&
      !document.hidden &&
      !root.closest('.hidden') &&
      !document.querySelector('.modal-backdrop.show, .at124-command.show')
    );
  }
  function canMove() {
    // An ordinary hover or mouse click must not silently stop the slideshow.
    // Keep the active story still while a keyboard user is operating its actions.
    return (
      visible() &&
      !root.querySelector('.pulse-slide.is-active :focus-visible') &&
      !motion.matches &&
      stories.length > 1
    );
  }
  function prepareNext() {
    const panel = root?.querySelectorAll('.pulse-slide')[(current() + 1) % stories.length];
    for (const img of panel?.querySelectorAll('img') || []) {
      img.loading = 'eager';
      // Prepare artwork during the current story, never delay the 20-second change.
      if (typeof img.decode === 'function') void img.decode().catch(() => {});
    }
  }
  function loadArtwork() {
    if (!visible()) return;
    const ids = stories
      .filter(
        (item) =>
          item.source === 'AniList' &&
          /^\d+$/.test(item.sourceId || '') &&
          (!item.backdrop || !trailerId(item.trailer)) &&
          !artworkRequests.has(String(item.sourceId)),
      )
      .map((item) => Number(item.sourceId));
    if (!ids.length) return;
    for (const id of ids) artworkRequests.add(String(id));
    void catalogJSON('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query:
          'query HomePreview($ids:[Int]){Page(perPage:4){media(id_in:$ids,type:ANIME,isAdult:false){id bannerImage trailer{id site}}}}',
        variables: { ids },
      }),
    })
      .then((result) => {
        let changed = false;
        for (const item of result.data?.Page?.media || []) {
          if (!ids.includes(item.id)) continue;
          const backdrop = ctx.poster(item.bannerImage || '');
          const id = trailerId(item.trailer);
          artwork.set(String(item.id), {
            ...(backdrop ? { backdrop } : {}),
            trailer: id ? { id, site: 'youtube' } : null,
          });
          changed = true;
        }
        if (changed) refresh();
      })
      .catch(() => {});
  }
  function syncPreview() {
    loadArtwork();
    const panel = root?.querySelector('.pulse-slide.is-active');
    const id = trailerId(stories[current()]?.trailer);
    const enabled = visible() && !motion.matches && previewEnabled && !!id;
    for (const frame of root?.querySelectorAll('.pulse-trailer') || []) {
      if (!enabled || frame.dataset.trailer !== id || !panel?.contains(frame)) frame.remove();
    }
    for (const button of root?.querySelectorAll('[data-pulse-action="preview"]') || []) {
      button.setAttribute('aria-pressed', String(previewEnabled && !motion.matches));
      button.disabled = motion.matches;
      button.textContent = previewEnabled ? 'Ⅱ Ndalo sfondin video' : '▶ Trailer në sfond · 20 sek';
    }
    if (!root?.querySelector('.pulse-trailer')) clearTimeout(previewEndTimer);
    if (!enabled || panel.querySelector('.pulse-trailer')) return;
    // Start immediately, including after mouse/focus events. Re-entering the same
    // story resumes its position on the existing 20-second slideshow timeline.
    const elapsed = nextAt ? 20 - (nextAt - performance.now()) / 1000 : 0;
    const start = Math.max(0, Math.min(19, Math.floor(elapsed)));
    const frame = document.createElement('iframe');
    frame.className = 'pulse-trailer';
    frame.dataset.trailer = id;
    frame.title = 'Trailer në sfond · 20 sekonda pa zë';
    frame.tabIndex = -1;
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('allow', 'autoplay; encrypted-media');
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.src =
      'https://www.youtube-nocookie.com/embed/' +
      id +
      '?autoplay=1&mute=1&controls=0&playsinline=1&start=' +
      start +
      '&end=20&rel=0';
    panel.querySelector('.pulse-art').append(frame);
    // Loop this bounded segment for a single story or a keyboard-paused story.
    // Multi-story transitions remove the previous player at the same deadline.
    previewEndTimer = setTimeout(
      () => {
        if (!frame.isConnected) return;
        frame.remove();
        syncPreview();
      },
      (20 - start) * 1000,
    );
  }

  function schedule() {
    if (!root) return;
    syncPreview();
    root.dataset.motion =
      visible() && !motion.matches && !root.querySelector('.pulse-slide.is-active :focus-visible')
        ? 'running'
        : 'paused';
    // display:none recreates CSS animations. Restore their position on the same
    // wall-clock timeline instead of restarting the camera drift on each visit.
    if (visible() && !motion.matches) {
      for (const animation of root.getAnimations({ subtree: true })) {
        if (animation.animationName === 'pulse-cinema')
          animation.currentTime = (performance.now() - animationEpoch) % 40000;
        if (animation.animationName === 'pulse-radar')
          animation.currentTime = nextAt ? 20000 - nextAt + performance.now() : 0;
      }
    }
    const interactionPaused =
      motion.matches ||
      document.hidden ||
      document.querySelector('.modal-backdrop.show, .at124-command.show') ||
      root.querySelector('.pulse-slide.is-active :focus-visible');
    if (interactionPaused) nextAt = undefined;
    if (canMove() && timer) return;
    clearTimeout(timer);
    timer = undefined;
    if (canMove()) {
      const now = performance.now();
      nextAt ??= now + 20000;
      if (now >= nextAt) {
        const steps = Math.floor((now - nextAt) / 20000) + 1;
        nextAt += steps * 20000;
        select(current() + steps);
        return;
      }
      timer = setTimeout(() => {
        timer = undefined;
        schedule();
      }, nextAt - now);
    }
  }
  function scheduleDay() {
    clearTimeout(dayTimer);
    if (!root || root.hidden || phone.matches || document.hidden) return;
    // Recheck Tirana midnight even when the device timezone or DST changes.
    dayTimer = setTimeout(refresh, 60000);
  }
  function slide(item, index) {
    const title = item.title;
    const description =
      item.synopsis || 'Hap detajet, zbulo historinë dhe zgjidh episodin që do të shikosh.';
    const score = item.score ?? item.communityScore;
    const rating = Number.isFinite(Number(score)) && Number(score) > 0 ? Number(score) / 10 : null;
    const active = current() === index;
    return `
        <article class="pulse-slide${active ? ' is-active' : ''}" aria-label="${esc(title)}" aria-hidden="${!active}" ${active ? '' : 'inert'}>
          <div class="pulse-art${item.backdrop ? '' : ' pulse-art-graphic'}" aria-hidden="true">${image(item, 'backdrop', active)}</div>
          <div class="pulse-stage-top"><span class="pulse-badge"><span aria-hidden="true"></span>${esc(item?.badge || 'Zbulo anime')}</span><span class="pulse-source">${esc(item?.sourceLabel || 'ANIMETRACK')}</span></div>
          <div class="pulse-stage-body"><div class="pulse-copy"><div class="pulse-meta">${esc(item?.genresLabel || 'Bota e animeve')}${item?.year ? ' <span>·</span> ' + esc(item.year) : ''}${rating ? ' <span>·</span> ★ ' + rating.toFixed(1) : ''}</div><h3>${esc(title)}</h3><p>${esc(description)}</p>${item?.dateLabel ? `<div class="pulse-date">${navIcon('calendar')} ${esc(item.dateLabel)}</div>` : ''}<div class="pulse-actions"><button type="button" class="pulse-primary" data-pulse-action="open" data-key="${esc(item?.storyKey || '')}">${navIcon('watch')} ${item?.remote ? 'Zbulo animen' : item ? 'Hap animen' : 'Zbulo anime'}</button><button type="button" class="pulse-secondary" data-pro-page="calendar">${navIcon('calendar')} Kalendari</button>${trailerId(item.trailer) ? '<button type="button" class="pulse-secondary" data-pulse-action="preview" aria-pressed="true">Ⅱ Ndalo sfondin video</button>' : ''}</div></div>${item ? `<div class="pulse-poster-wrap" aria-hidden="true">${image(item, 'poster', active)}<span class="pulse-poster-caption">${esc(item.format === 'MOVIE' ? 'FILM ANIME' : 'ANIME SERIES')}</span></div>` : ''}</div>
        </article>`;
  }
  function paint() {
    if (!root) return;
    clearTimeout(timer);
    timer = undefined;
    window.ATHTML.renderHTML(
      root,
      `
      <div class="pulse-heading"><div><span class="pulse-brand">${navIcon('recommendations')} ANIME PULSE</span><h2>Në fokus <span>Zgjedhjet e ditës</span></h2></div><button type="button" class="pulse-text-link" data-pro-page="seasons">Eksploro sezonin <span aria-hidden="true">↗</span></button></div>
      <div class="pulse-layout">
        <div class="pulse-stage">${stories.map(slide).join('')}</div>
        <aside class="pulse-desk" aria-label="Zbulime dhe premiera anime"><div class="pulse-desk-heading"><span class="pulse-live" aria-hidden="true"></span><strong>RADARI ANIME</strong><span>✦</span></div><p>Premiera, episode të ardhshme dhe histori për t’u zbuluar.</p><div class="pulse-stories">${stories.map((story, index) => `<button type="button" class="pulse-story" data-pulse-action="open" data-key="${esc(story.storyKey)}"><span class="pulse-story-number">${String(index + 1).padStart(2, '0')}</span><span class="pulse-story-copy"><small>${esc(story.badge)}</small><strong>${esc(story.title)}</strong><span>${esc(story.dateLabel || story.genresLabel || story.sourceLabel)}</span></span><span class="pulse-story-cover">${image(story, 'thumb')}</span></button>`).join('') || '<div class="pulse-desk-empty">Titujt dhe premierat shfaqen kur katalogu është i disponueshëm.</div>'}</div><button type="button" class="pulse-desk-footer" data-pro-page="recommendations">Gjej diçka për ty ${navIcon('recommendations')} <span aria-hidden="true">↗</span></button></aside>
      </div>`,
    );
    for (const panel of root.querySelectorAll('.pulse-slide'))
      panel.inert = !panel.classList.contains('is-active');
    updateRadar();
    prepareNext();
    schedule();
  }
  function updateRadar() {
    for (const button of root.querySelectorAll('.pulse-story'))
      button.classList.toggle('is-current', button.dataset.key === activeKey);
  }
  function select(index) {
    if (!stories.length) return;
    activeKey = stories[index % stories.length].storyKey;
    for (const [i, panel] of [...root.querySelectorAll('.pulse-slide')].entries()) {
      const active = current() === i;
      panel.classList.toggle('is-active', active);
      panel.setAttribute('aria-hidden', String(!active));
      panel.inert = !active;
    }
    updateRadar();
    prepareNext();
    schedule();
  }
  function refresh() {
    if (!root) return;
    const library = ctx.state().anime || [];
    root.hidden = phone.matches || !library.length;
    root.classList.toggle('pulse-is-hidden', root.hidden);
    if (root.hidden) {
      root.replaceChildren();
      signature = '';
      stories = [];
      nextAt = undefined;
      clearTimeout(dayTimer);
      schedule();
      return;
    }
    const now = Date.now();
    const day = dayNumber(now);
    const nextStories = homeStories(ctx.animeUpdates?.() || [], library, now).map((item) => ({
      ...item,
      ...(item.source === 'AniList' ? artwork.get(String(item.sourceId)) : {}),
    }));
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
        item.trailer,
        item.year,
        item.score,
        item.communityScore,
        item.format,
      ]),
    );
    stories = nextStories;
    if (signature !== nextSignature) {
      signature = nextSignature;
      if (shownDay !== day || !stories.some((item) => item.storyKey === activeKey)) {
        activeKey = stories[0]?.storyKey || '';
        nextAt = undefined;
      }
      paint();
    }
    const newDay = shownDay !== undefined && shownDay !== day;
    shownDay = day;
    if (newDay) void ctx.refreshAnimeUpdates?.();
    schedule();
    scheduleDay();
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
      if (action === 'preview') {
        previewEnabled = !previewEnabled;
        syncPreview();
        return;
      }
      if (action === 'open') {
        const item = stories.find((item) => item.storyKey === button.dataset.key);
        if (!item) ctx.navigate('recommendations');
        else if (item.remote) ctx.previewItem(item);
        else ctx.openAnime(item.id);
      }
    });
    root.addEventListener('focusin', schedule);
    root.addEventListener('focusout', () => queueMicrotask(schedule));
    root.addEventListener(
      'load',
      (event) => {
        const img = event.target;
        if (
          img.matches?.('.pulse-backdrop') &&
          (img.naturalWidth < 900 || img.naturalWidth / img.naturalHeight < 1.3)
        ) {
          img.classList.add('pulse-image-unavailable');
          img.closest('.pulse-art')?.classList.add('pulse-art-graphic');
        }
      },
      true,
    );
    root.addEventListener(
      'error',
      (event) => {
        if (event.target.matches('img')) {
          event.target.classList.add('pulse-image-unavailable');
          if (event.target.matches('.pulse-backdrop'))
            event.target.closest('.pulse-art')?.classList.add('pulse-art-graphic');
        }
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
    document.addEventListener('visibilitychange', refresh);
    phone.addEventListener('change', refresh);
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
