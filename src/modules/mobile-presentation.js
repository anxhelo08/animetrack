import { MediaCard, mobilePartLabel, mobileEpisodeLabel } from './media-card.js';
import { navIcon } from './nav-icons.js';
import { createMobileHomeModel } from './mobile-home-model.js';
import { createKeyedRows } from '../core/keyed-rows.js';

/** Mobile composition delegates every library/account mutation to the existing controller. */
export function createMobilePresentation(ctx) {
  const $ = (id) => document.getElementById(id);
  const esc = ctx.esc;
  const phone = window.matchMedia?.('(max-width: 760px)') || {
    matches: false,
    addEventListener() {},
  };
  let page = 'home',
    filter = 'all',
    detailTab = 'episodes',
    detailId = '',
    owner = '';
  let observer,
    discoverMode = '',
    studioRequest = 0;
  const card = (item, options = {}) => MediaCard(item, { poster: ctx.poster, ...options });
  const empty = (text) => `<p class="mobile-empty">${esc(text)}</p>`;
  const section = (id, title, body, destination, rail = false) =>
    `<section class="mobile-section" id="mobile-${id}" aria-labelledby="mobile-${id}-title"><div class="mobile-section-head"><h2 id="mobile-${id}-title">${title}</h2>${destination ? `<button type="button" data-mobile-action="navigate" data-mobile-target="${destination}" aria-label="Shiko të gjitha: ${title}">Të gjitha <span aria-hidden="true">↗</span></button>` : ''}</div><div class="${rail ? 'mobile-rail' : 'mobile-stack'}">${body}</div></section>`;
  function episode(item, next) {
    return mobileEpisodeLabel(next.season, ctx.seasonNumber(item, next.season), next.n);
  }
  const pressTimers = new WeakMap();
  let releaseTimer,
    pendingMove,
    focusFrame,
    refreshFrame,
    focusHome = false;
  const homeLimits = { active: 20, stale: 20 };
  const scrollPositions = new Map();
  const selectHome = createMobileHomeModel();
  const homeRows = new Map();
  let restoringScroll = false;
  let homeShellMounted = false,
    lastUpcomingMarkup = '';
  let homeTab = 'watch',
    homeLayout = 'list';
  function home() {
    if (!phone.matches || !$('mobile-home')) return;
    const library = ctx.state(),
      items = library.anime || [],
      history = library.history || [],
      now = Date.now();
    const entries = ctx.upcoming?.() || [];
    const { byId, active, stale, recent, upcoming } = selectHome({
      owner: ctx.user?.()?.id || 'guest',
      revision: ctx.revision?.() || 0,
      items,
      history,
      entries,
      nextEpisode: ctx.nextEpisode,
      now,
      includeUpcoming: homeTab === 'upcoming',
    });
    const row = (a, next, options = {}) => {
      const meta = next.season.episodes?.find((e) => e.number === next.n),
        poster = ctx.poster(a.cover || ''),
        resume = options.resume || null;
      return `<article class="watch-row${options.fresh ? ' watch-row--fresh' : ''}${options.seen ? ' watch-row--seen' : ''}" data-watch-key="${esc(a.id)}:${esc(next.season.id)}:${next.n}:${options.seen ? 'seen' : options.upcoming ? 'future' : 'next'}"><button type="button" class="watch-row-poster" data-mobile-action="detail" data-id="${esc(a.id)}" aria-label="Hap ${esc(a.title)}">${poster ? `<img src="${esc(poster)}" alt="" loading="lazy" decoding="async">` : '<span aria-hidden="true">✦</span>'}</button><div class="watch-row-copy"><button type="button" class="watch-row-title" data-mobile-action="detail" data-id="${esc(a.id)}">${esc(a.title)} <span aria-hidden="true">›</span></button>${options.fresh ? '<span class="watch-row-new" aria-label="Episod i ri pa parë">NEW · EP</span>' : ''}<button type="button" class="watch-row-episode" data-mobile-action="episode" data-id="${esc(a.id)}" data-mobile-season="${esc(next.season.id)}" data-mobile-episode="${next.n}">${esc(episode(a, next))}</button><p>${esc(meta?.title || (options.seen ? 'Episod i parë' : options.upcoming ? 'Episod i ardhshëm' : 'Episodi i radhës'))}${a.runtime ? ' · ' + esc(a.runtime) + ' min' : ''}</p>${resume ? `<button type="button" class="watch-row-resume" data-mobile-action="resume" data-id="${esc(a.id)}" data-mobile-season="${esc(resume.season.id)}" data-mobile-episode="${resume.n}" aria-label="Vazhdo ${esc(a.title)} me episodin ${resume.n}">${navIcon('watch')} Vazhdo me ${esc(episode(a, resume))}</button>` : ''}</div>${options.upcoming ? '<span class="watch-row-pending" aria-label="Ende pa transmetuar">◷</span>' : options.seen ? `<button type="button" class="watch-row-seen" data-mobile-action="unwatch" data-id="${esc(a.id)}" data-mobile-season="${esc(next.season.id)}" data-mobile-episode="${next.n}" aria-label="Hiq shënimin e episodit ${next.n} të ${esc(a.title)}" title="Hiq nga episodet e parë">✓</button>` : `<button type="button" class="media-card-mark watch-row-mark" data-ios-action="advance" data-id="${esc(a.id)}" aria-label="Shëno episodin e radhës të ${esc(a.title)} si të parë">${navIcon('completed')}</button>`}</article>`;
    };
    const groups = new Map();
    for (const e of upcoming) {
      const a = byId.get(e.animeId);
      const season =
        a?.seasons.find((s) => s.id === e.seasonId) ||
        a?.seasons.find((s) => s.id === e.localSeason?.id);
      if (!a || !season) continue;
      const date = new Date(e.when).toLocaleDateString('sq-AL', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      if (!groups.has(date)) groups.set(date, []);
      groups
        .get(date)
        .push(
          row(a, { season, n: e.seasonEpisode || e.localEpisode || e.episode }, { upcoming: true }),
        );
    }
    const root = $('mobile-home');
    if (!homeShellMounted) {
      window.ATHTML.renderHTML(
        root,
        `<header class="mobile-home-heading"><div><h1>Vazhdo ku e le</h1><p>Episodet e fundit dhe radha jote.</p></div><button type="button" data-mobile-action="search" aria-label="Kërko anime, seriale dhe filma">${navIcon('explore')}</button></header><nav class="mobile-home-shortcuts" aria-label="Hap shpejt"><button type="button" data-mobile-action="navigate" data-mobile-target="reading">${navIcon('reading')}<span>Leximet</span></button><button type="button" data-mobile-action="navigate" data-mobile-target="calendar">${navIcon('calendar')}<span>Kalendari</span></button><button type="button" data-mobile-action="navigate" data-mobile-target="notifications">${navIcon('notifications')}<span>Njoftimet</span></button></nav><div class="watch-home-tabs" role="group" aria-label="Lista e episodeve"><button type="button" data-mobile-home-tab="watch">Episodet</button><button type="button" data-mobile-home-tab="upcoming">Së shpejti</button></div><div class="watch-home-toolbar"><button type="button" data-mobile-action="continue">Radha ime ↓</button><div><button type="button" data-mobile-home-layout="list" aria-label="Shfaq listën">${navIcon('library')}</button><button type="button" data-mobile-home-layout="grid" aria-label="Shfaq rrjetën">${navIcon('collections')}</button></div></div><div class="watch-home-content"><section id="mobile-history" aria-label="Episodet e fundit që ke parë"><h2 class="watch-group-label">Së fundmi</h2><div id="mobile-history-rows" class="watch-row-list"></div><p id="mobile-history-empty" class="mobile-empty" hidden>Episodet që ke parë do të shfaqen këtu.</p></section><section id="mobile-continue" aria-label="Episodi i radhës"><h2 class="watch-group-label">Për të parë</h2><div id="mobile-continue-rows" class="watch-row-list"></div><p id="mobile-continue-empty" class="mobile-empty" hidden>Episodi yt i radhës shfaqet këtu. Shto një titull nga Zbulo.</p><button type="button" class="mobile-home-more ghost" data-mobile-action="load-home" data-mobile-group="active" hidden></button></section><section id="mobile-stale"><h2 class="watch-group-label">Vazhdo kur të duash</h2><div id="mobile-stale-rows" class="watch-row-list"></div><p id="mobile-stale-empty" class="mobile-empty" hidden>Nuk ke tituj të lënë pa parë më shumë se një javë.</p><button type="button" class="mobile-home-more ghost" data-mobile-action="load-home" data-mobile-group="stale" hidden></button></section><button type="button" class="watch-fill-list" data-mobile-action="navigate" data-mobile-target="explore">${navIcon('explore')}<span><strong>Zbulo historinë tjetër</strong><small>Anime, seriale dhe filma për listën tënde.</small></span><span aria-hidden="true">›</span></button><section id="mobile-upcoming" aria-label="Episodet e ardhshme" hidden><div id="mobile-upcoming-list"></div></section></div><div class="watch-home-links"><button type="button" data-mobile-action="navigate" data-mobile-target="calendar">Kalendari</button><button type="button" data-mobile-action="navigate" data-mobile-target="notifications">Njoftimet</button><button type="button" data-mobile-action="navigate" data-mobile-target="friends">Miqtë</button></div>`,
      );
      homeShellMounted = true;
    }
    const oldTop = $('mobile-continue')?.getBoundingClientRect().top;
    const movingRows =
      pendingMove && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? [...root.querySelectorAll('#mobile-history-rows .watch-row')].map((node) => ({
            node,
            top: node.getBoundingClientRect().top,
          }))
        : [];
    root.querySelector('.watch-home-content').dataset.layout = homeLayout;
    for (const button of root.querySelectorAll('[data-mobile-home-tab]'))
      button.setAttribute('aria-pressed', String(button.dataset.mobileHomeTab === homeTab));
    for (const button of root.querySelectorAll('[data-mobile-home-layout]'))
      button.setAttribute('aria-pressed', String(button.dataset.mobileHomeLayout === homeLayout));
    root.querySelector('#mobile-history').hidden = homeTab !== 'watch';
    root.querySelector('#mobile-continue').hidden = homeTab !== 'watch';
    root.querySelector('#mobile-stale').hidden = homeTab !== 'watch';
    root.querySelector('.watch-fill-list').hidden = homeTab !== 'watch';
    root.querySelector('#mobile-upcoming').hidden = homeTab !== 'upcoming';

    const recentRows = recent
      .slice()
      .reverse()
      .map(({ a, season, n }) => ({
        key: `${a.id}:${season.id}:${n}:seen`,
        markup: row(a, { season, n }, { seen: true, resume: ctx.nextEpisode(a) }),
      }));
    const activeRows = active.slice(0, homeLimits.active).map(({ a, next, fresh }) => ({
      key: `${a.id}:${next.season.id}:${next.n}:next`,
      markup: row(a, next, { fresh }),
    }));
    const staleRows = stale.slice(0, homeLimits.stale).map(({ a, next }) => ({
      key: `${a.id}:${next.season.id}:${next.n}:next`,
      markup: row(a, next),
    }));
    for (const [name, rows] of [
      ['history', recentRows],
      ['continue', activeRows],
      ['stale', staleRows],
    ]) {
      const node = root.querySelector(`#mobile-${name}-rows`);
      let renderer = homeRows.get(name);
      if (!renderer) {
        renderer = createKeyedRows({ root: node, html: window.ATHTML });
        homeRows.set(name, renderer);
      }
      renderer.render(rows);
      root.querySelector(`#mobile-${name}-empty`).hidden = rows.length > 0;
      if (name === 'continue' || name === 'stale') {
        const group = name === 'continue' ? 'active' : 'stale',
          total = name === 'continue' ? active.length : stale.length,
          more = root.querySelector(`[data-mobile-group="${group}"]`);
        more.hidden = total <= homeLimits[group];
        more.textContent = `Shfaq më shumë · ${homeLimits[group]} nga ${total}`;
      }
    }
    if (homeTab === 'upcoming') {
      const label = (text) => `<h2 class="watch-group-label"><span>${text}</span></h2>`;
      const markup = groups.size
        ? [...groups].map(([date, rows]) => label(esc(date)) + rows.join('')).join('')
        : empty('Nuk ka episode të ardhshme me datë të konfirmuar në bibliotekën tënde.');
      if (markup !== lastUpcomingMarkup) {
        window.ATHTML.renderHTML($('mobile-upcoming-list'), markup);
        lastUpcomingMarkup = markup;
      }
    }
    if (!focusHome && Number.isFinite(oldTop) && window.scrollY > 0 && $('mobile-continue'))
      window.scrollBy({
        top: $('mobile-continue').getBoundingClientRect().top - oldTop,
        behavior: 'instant',
      });
    for (const { node, top } of movingRows) {
      if (!node.isConnected) continue;
      const dy = top - node.getBoundingClientRect().top;
      if (Math.abs(dy) > 1)
        node.animate([{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }], {
          duration: 220,
          easing: 'ease-out',
        });
    }
    if (pendingMove) {
      const move = pendingMove;
      pendingMove = null;
      const current = ctx
        .state()
        .anime.find((a) => a.id === move.id)
        ?.seasons.find((s) => s.id === move.season);
      if (current?.watched.includes(move.number) === move.seen) {
        const targetKey =
          move.id + ':' + move.season + ':' + move.number + ':' + (move.seen ? 'seen' : 'next');
        const target = [...root.querySelectorAll('[data-watch-key]')].find(
          (node) => node.dataset.watchKey === targetKey,
        );
        if (!move.seen && target) focusHome = true;
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          target?.animate(
            [
              { transform: 'translateY(18px)', opacity: 0.4 },
              { transform: 'translateY(0)', opacity: 1 },
            ],
            { duration: 220, easing: 'ease-out' },
          );
        }
      }
    }
    if (focusHome) {
      focusHome = false;
      cancelAnimationFrame(focusFrame);
      focusFrame = requestAnimationFrame(() => {
        if (page === 'home' && homeTab === 'watch')
          $('mobile-continue')?.scrollIntoView({ block: 'start', behavior: 'instant' });
      });
    }
    clearTimeout(releaseTimer);
    if (document.visibilityState === 'hidden' || page !== 'home') return;
    let nextRelease = Infinity;
    const consider = (at) => {
      if (Number.isFinite(at) && at > Date.now()) nextRelease = Math.min(nextRelease, at);
    };
    for (const entry of [...entries, ...upcoming]) consider(Number(entry.when));
    for (const item of items)
      for (const season of item.seasons) {
        consider(Number(season.nextAiringAt) * 1000);
        for (const ep of season.episodes || []) consider(Date.parse(ep.airedAt || ep.aired || ''));
      }
    if (Number.isFinite(nextRelease))
      releaseTimer = setTimeout(
        () => {
          ctx.reconcileAiring?.();
          home();
        },
        Math.min(86400000, Math.max(1, nextRelease - Date.now() + 100)),
      );
  }
  function searchState() {
    if (page !== 'explore' || !phone.matches || !$('mobile-browse')) return;
    const query = $('global-search').value.trim();
    $('mobile-browse').classList.toggle('mobile-search-hidden', !!query);
    $('mobile-search-filters').classList.toggle('mobile-search-hidden', !query);
    $('explore-view').classList.toggle('mobile-has-query', !!query);
    $('explore-view').classList.toggle('mobile-people-search', filter === 'people' && !!query);
    let shown = 0;
    $('catalog-grid')
      .querySelectorAll('.catalog-card')
      .forEach((node) => {
        const kind = node.dataset.mediaKind;
        const visible = filter === 'all' || filter === kind;
        node.classList.toggle('mobile-result-hidden', !visible);
        if (visible) shown++;
      });
    const done =
      $('catalog-grid').getAttribute('aria-busy') !== 'true' &&
      $('catalog-grid').querySelector('.catalog-card');
    $('mobile-filter-empty').classList.toggle(
      'mobile-search-hidden',
      !query || !done || shown > 0 || filter === 'people',
    );
    document
      .querySelectorAll('[data-mobile-filter]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mobileFilter === filter)));
  }
  function mountDiscover() {
    const root = $('discover');
    if (!root || !$('catalog-grid')) return;
    window.ATHTML.insertHTML(
      root,
      'beforeend',
      `<div id="mobile-browse" class="mobile-only"><h2>Çfarë të pëlqen?</h2><div class="mobile-browse-grid">${[
        ['anime', 'Anime', navIcon('watch')],
        ['tv', 'Seriale', navIcon('library')],
        ['movie', 'Filma', navIcon('movies')],
        ['trending', 'Në trend', navIcon('trending')],
        ['new', 'Publikime të reja', navIcon('new')],
        ['top', 'Më të vlerësuarat', navIcon('top')],
        ['genres', 'Zhanret', navIcon('genres')],
        ['studios', 'Studiot', navIcon('studios')],
        ['upcoming', 'Së shpejti', navIcon('calendar')],
      ]
        .map(
          ([key, label, mark]) =>
            `<button type="button" data-mobile-browse="${key}"><span aria-hidden="true">${mark}</span><strong>${label}</strong></button>`,
        )
        .join(
          '',
        )}</div><button type="button" class="mobile-news-link" data-pro-page="news">${navIcon('news')} Lajme anime <span aria-hidden="true">${navIcon('trending')}</span></button><section id="mobile-browse-content" aria-live="polite"></section></div>`,
    );
    window.ATHTML.insertHTML(
      $('global-search').closest('label'),
      'afterend',
      `<div id="mobile-search-filters" class="mobile-only mobile-search-hidden" role="group" aria-label="Lloji i rezultateve">${[
        ['all', 'Të gjitha'],
        ['anime', 'Anime'],
        ['tv', 'Seriale'],
        ['movie', 'Filma'],
        ['people', 'Miq'],
      ]
        .map(
          ([key, label]) =>
            `<button type="button" data-mobile-filter="${key}" aria-pressed="${key === 'all'}">${label}</button>`,
        )
        .join(
          '',
        )}</div><p id="mobile-filter-empty" class="mobile-only mobile-search-hidden mobile-empty">Nuk ka rezultate në këtë kategori. Provo “Të gjitha” ose një titull tjetër.</p><div id="mobile-people" class="mobile-only"><p>Kërko miq me emrin ose emrin e tyre të përdoruesit.</p><button type="button" class="primary" data-mobile-action="people">Shiko rezultatet për miq</button></div>`,
    );
    observer = new MutationObserver(searchState);
    observer.observe($('catalog-grid'), {
      childList: true,
      attributes: true,
      attributeFilter: ['aria-busy'],
    });
    $('global-search').addEventListener('input', searchState);
    $('clear-global').addEventListener('click', () => {
      filter = 'all';
      homeTab = 'watch';
      focusHome = false;
      pendingMove = null;
      homeLayout = 'list';
      searchState();
    });
    searchState();
  }
  async function browse(kind) {
    discoverMode = kind;
    if (kind === 'upcoming') {
      ctx.navigate('upcoming');
      return;
    }
    if (['anime', 'tv', 'movie'].includes(kind)) {
      filter = kind;
      const items = (ctx.mobileRecommendations?.() || []).filter((a) =>
        kind === 'tv'
          ? a.kind === 'tv'
          : kind === 'movie'
            ? a.format === 'MOVIE'
            : a.kind !== 'tv' && a.format !== 'MOVIE',
      );
      window.ATHTML.renderHTML(
        $('mobile-browse-content'),
        section(
          'category',
          { anime: 'Anime', tv: 'Seriale', movie: 'Filma' }[kind],
          items
            .map((a) => card(a, { recommendation: true, subtitle: a.genre || a.format }))
            .join('') || empty('Kërko një titull lart ose hap katalogun për më shumë zbulime.'),
          'recommendations',
          !!items.length,
        ),
      );
      $('global-search').focus({ preventScroll: true });
      return;
    }
    if (kind === 'genres') {
      ctx.navigate('seasons');
      $('season-genres')?.scrollIntoView({ block: 'center' });
      return;
    }
    if (kind === 'new' || kind === 'top') {
      ctx.navigate('seasons');
      if (kind === 'top') {
        $('season-sort').value = 'SCORE_DESC';
        $('season-sort').dispatchEvent(new Event('change', { bubbles: true }));
      }
      return;
    }
    if (kind === 'trending') {
      const items = (ctx.mobileRecommendations?.() || [])
        .slice()
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      window.ATHTML.renderHTML(
        $('mobile-browse-content'),
        section(
          'browse-trending',
          'Në trend',
          items
            .map((a) =>
              card(a, {
                recommendation: true,
                meta: a.popularity
                  ? Number(a.popularity).toLocaleString('sq-AL') + ' ndjekës · AniList'
                  : '',
              }),
            )
            .join('') || empty('Katalogu nuk është ngarkuar ende.'),
          'recommendations',
          !!items.length,
        ),
      );
      return;
    }
    if (kind === 'studios') {
      const request = ++studioRequest;
      window.ATHTML.renderHTML(
        $('mobile-browse-content'),
        '<p role="status">Po ngarkohen studiot…</p>',
      );
      try {
        const response = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query:
              '{ Page(perPage:20) { studios(isAnimationStudio:true,sort:FAVOURITES_DESC) { id name media(perPage:4,sort:POPULARITY_DESC) { nodes { id idMal title { romaji english } coverImage { extraLarge large } format episodes seasonYear averageScore genres siteUrl } } } } }',
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw Error('studio catalogue');
        const data = await response.json();
        if (request !== studioRequest || discoverMode !== 'studios') return;
        const studios = data.data?.Page?.studios || [];
        window.ATHTML.renderHTML(
          $('mobile-browse-content'),
          studios
            .map(
              (studio) =>
                `<details class="mobile-studio"><summary>${esc(studio.name)}</summary><div class="mobile-rail">${(
                  studio.media?.nodes || []
                )
                  .map((m) => {
                    const a = ctx.mapAniList(m);
                    return card(a, { recommendation: false, subtitle: m.format }).replaceAll(
                      'data-mobile-action="detail"',
                      'data-mobile-studio="' + esc(m.id) + '"',
                    );
                  })
                  .join('')}</div></details>`,
            )
            .join('') || empty('Nuk u gjetën studio.'),
        );
        // Public catalog objects are retained only for opening existing previews.
        $('mobile-browse-content').studioMedia = studios.flatMap((s) => s.media?.nodes || []);
      } catch {
        if (request === studioRequest && discoverMode === 'studios')
          window.ATHTML.renderHTML(
            $('mobile-browse-content'),
            '<p role="status">Studiot nuk u ngarkuan.</p><button type="button" data-mobile-browse="studios">Provo përsëri</button>',
          );
      }
    }
  }
  function detail(id) {
    if (!phone.matches) return;
    const root = $('detail-body'),
      a = ctx.state().anime.find((a) => a.id === id);
    if (!root || !a) return;
    if (detailId !== id) detailTab = 'episodes';
    detailId = id;
    root.classList.add('mobile-detail');
    const top = root.querySelector('.detail-top');
    if (top) {
      top.classList.add('mobile-detail-hero');
      const art = ctx.poster(a.backdrop || a.cover || '');
      if (art)
        window.ATHTML.insertHTML(
          top,
          'afterbegin',
          `<img class="mobile-detail-backdrop" src="${esc(art)}" alt="" referrerpolicy="no-referrer">`,
        );
    }
    const nx = ctx.nextEpisode(a);
    const summary = root.querySelector('.product-progress');
    if (summary) {
      summary.classList.add('mobile-watch-next');
      const meta = nx?.season.episodes?.find((e) => e.number === nx.n);
      const label = nx ? episode(a, nx) : '';
      const cta = nx
        ? ctx.count(a)
          ? 'Vazhdo • ' + label
          : 'Fillo'
        : ctx.releasedTotal(a) && a.status === 'completed'
          ? 'Shiko përsëri'
          : '';
      window.ATHTML.renderHTML(
        summary,
        `<h3 class="mobile-next-heading">Episodi i radhës</h3>${nx ? card({ ...a, cover: meta?.image || a.cover }, { variant: 'Compact', episode: true, eyebrow: label, subtitle: meta?.title || (nx.season.format === 'MOVIE' ? nx.season.subtitle || a.title : 'Episodi ' + nx.n), meta: [a.runtime ? a.runtime + ' min' : '', meta?.aired || meta?.airedAt ? new Date(meta.aired || meta.airedAt).toLocaleDateString('sq-AL') : ''].filter(Boolean).join(' · ') }) : empty('Je në hap me episodet e transmetuara.')}${cta ? `<button type="button" class="primary mobile-detail-cta" ${nx ? 'data-mobile-action="episode"' : 'data-pro-action="rewatch-start"'} data-id="${esc(a.id)}">${navIcon('watch')}<span>${esc(cta)}</span></button>` : ''}`,
      );
    }
    const tabs = document.createElement('nav');
    tabs.className = 'mobile-detail-tabs';
    tabs.setAttribute('aria-label', 'Seksionet e titullit');
    window.ATHTML.renderHTML(
      tabs,
      [
        ['overview', 'Përmbledhja'],
        ['timeline', 'Rendi'],
        ['episodes', 'Episodet'],
        ['cast', 'Aktorët'],
        ['reviews', 'Shënimet'],
      ]
        .map(
          ([key, label]) =>
            `<button type="button" data-mobile-detail-tab="${key}" aria-pressed="${detailTab === key}">${label}</button>`,
        )
        .join(''),
    );
    top?.after(tabs);
    const panels = Object.fromEntries(
      ['overview', 'timeline', 'episodes', 'cast', 'reviews'].map((key) => {
        const panel = document.createElement('section');
        panel.className = 'mobile-detail-panel';
        panel.dataset.mobilePanel = key;
        return [key, panel];
      }),
    );
    const seasons = root.querySelector('.season-scroller');
    for (const button of seasons?.querySelectorAll('[data-season]') || []) {
      const part = a.seasons.find((s) => s.id === button.dataset.season);
      if (!part) continue;
      button.querySelector('strong').textContent = mobilePartLabel(part, ctx.seasonNumber(a, part));
      button.querySelector('strong').after(
        Object.assign(document.createElement('span'), {
          className: 'mobile-season-count',
          textContent:
            part.watched.length +
            '/' +
            (part.total || ctx.released(part) || '?') +
            (ctx.released(part) > 0 && part.watched.length >= ctx.released(part) ? ' ✓' : ''),
        }),
      );
    }
    const chronology = a.seasons
      .filter((s) => !s.hidden)
      .map(
        (s) =>
          `<li><span class="mobile-timeline-dot"></span><div><strong>${esc(mobilePartLabel(s, ctx.seasonNumber(a, s)))}</strong><p>${esc(s.subtitle || s.title || a.title)}</p><small>${esc(s.releaseStart || String(s.year || 'Data ende e panjohur'))} · ${s.watched.length}/${s.total || '?'}</small></div></li>`,
      )
      .join('');
    window.ATHTML.renderHTML(
      panels.timeline,
      `<h3>Historia sipas publikimit</h3><ol class="mobile-timeline">${chronology}</ol>`,
    );
    // Move existing nodes with their controls; never rebuild or reinterpret tracking actions.
    for (const node of [...root.children]) {
      if ([top, tabs, summary].includes(node)) continue;
      if (
        node.matches(
          '.seasons-topline,.season-scroller,.season-banner,.episode-jump,.episode-list,.episode-pages,.season-info,.season-note,.at123-resume-button',
        )
      )
        panels.episodes.append(node);
      else if (node.matches('.at134-rich') || node.querySelector('.at134-rich'))
        panels.cast.append(node);
      else if (node.matches('.pro-rewatch') || node.querySelector('.pro-rewatch'))
        panels.reviews.append(node);
      else panels.overview.append(node);
    }
    if (summary) panels.episodes.prepend(summary);
    if (seasons) {
      const heading = document.createElement('h3');
      heading.className = 'mobile-all-seasons';
      heading.textContent = 'Të gjitha pjesët';
      seasons.before(heading);
    }
    const ratings = top?.querySelector('.rating-deck');
    if (ratings) panels.reviews.prepend(ratings);
    for (const selector of ['.detail-actions', '.imdb-tools']) {
      const node = top?.querySelector(selector);
      if (node) panels.overview.append(node);
    }
    const synopsis = panels.overview.querySelector('.product-secondary');
    if (synopsis) synopsis.open = true;
    if (!panels.cast.children.length)
      window.ATHTML.renderHTML(
        panels.cast,
        empty('Aktorët dhe krijuesit shfaqen kur të dhënat janë të disponueshme.'),
      );
    window.ATHTML.insertHTML(
      panels.reviews,
      'beforeend',
      `<h3>Vlerësimet dhe shënimet e tua</h3><p class="mobile-empty">${a.notes ? esc(a.notes) : 'Nuk ke shkruar ende një shënim për këtë titull.'}</p><button type="button" class="ghost" data-edit="${esc(id)}">Shkruaj një shënim</button>`,
    );
    for (const node of Object.values(panels)) root.append(node);
    root.dataset.mobileTab = detailTab;
    // Keep the primary CTA available above the section tabs.
    const cta = summary?.querySelector('.mobile-detail-cta');
    if (cta) top?.append(cta);
    for (const row of panels.episodes.querySelectorAll('.ep-row')) {
      const part = a.seasons.find((s) => s.id === row.dataset.seasonEp);
      const metadata = part?.episodes?.find((e) => e.number === Number(row.dataset.ep));
      const image = ctx.poster(metadata?.image || '');
      if (image)
        window.ATHTML.insertHTML(
          row,
          'afterbegin',
          `<img class="mobile-episode-thumb" src="${esc(image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`,
        );
    }
  }
  function preview(item) {
    if (!phone.matches || !item) return;
    const root = $('detail-body'),
      top = root?.querySelector('.preview-top');
    if (!top) return;
    detailId = '';
    root.classList.remove('mobile-detail');
    top.classList.add('mobile-detail-hero');
    const art = ctx.poster(item.backdrop || item.cover || '');
    if (art)
      window.ATHTML.insertHTML(
        top,
        'afterbegin',
        `<img class="mobile-detail-backdrop" src="${esc(art)}" alt="" referrerpolicy="no-referrer">`,
      );
    const start = top.querySelector('[data-preview-status="watching"]');
    if (start) {
      start.classList.add('mobile-detail-cta');
      start.textContent = 'Shto & fillo';
    }
  }
  function library() {
    if (!phone.matches) return;
    const header = $('at113-library-head');
    if (!header || $('mobile-library-controls')) return;
    const tools = document.createElement('details');
    tools.id = 'mobile-library-controls';
    tools.className = 'mobile-library-controls';
    window.ATHTML.renderHTML(
      tools,
      `<summary>Filtro dhe rendit <span aria-hidden="true">${navIcon('filters')}</span></summary><div class="mobile-library-controls-body"></div>`,
    );
    const body = tools.querySelector('div');
    window.ATHTML.insertHTML(
      body,
      'beforeend',
      '<div class="mobile-extra-filters" role="group" aria-label="Filtra të tjerë"><button type="button" class="ghost" data-filter="favorites">Të preferuarat</button><button type="button" class="ghost" data-filter="movies">Filma</button><button type="button" class="ghost" data-filter="waiting">Në pritje</button><button type="button" class="ghost" data-filter="genres">Zhanret</button></div>',
    );
    for (const node of [
      $('library-view').querySelector('.at119-media-filter'),
      header.querySelector('.at117-library-tools'),
    ])
      if (node) body.append(node);
    // Preserve additional filters and repair tools without crowding the poster grid.
    for (const node of [
      $('genre-controls'),
      $('library-view').querySelector('.series-repair-panel'),
      $('library-view').querySelector('.toolrow'),
      $('at116-import'),
    ])
      if (node) body.append(node);
    header.append(tools);
  }
  function profile() {
    if (!phone.matches) return;
    const nav = document.querySelector('.at-profile-tabs');
    if (!nav || nav.querySelector('[data-mobile-profile-diary]')) return;
    const overview = nav.querySelector('[data-id="overview"]');
    if (overview) overview.textContent = 'Profili';
    const stats = nav.querySelector('[data-id="stats"]');
    if (stats) stats.textContent = 'Statistikat';
    const friends = nav.querySelector('[data-pro-page="friends"]');
    if (friends) friends.textContent = 'Miqtë';
    const settings = nav.querySelector('[data-id="settings"]');
    settings?.classList.add('mobile-profile-settings');
    const diary = document.createElement('button');
    diary.type = 'button';
    diary.dataset.mobileProfileDiary = '';
    diary.dataset.proPage = 'diary';
    diary.textContent = 'Ditari';
    overview?.after(diary);
    if (
      $('mobile-profile-ratings') ||
      document.querySelector('.at-profile-settings') ||
      !document.querySelector('.at-profile-activity')
    )
      return;
    const rated = (ctx.state().anime || []).filter((a) => a.rating != null || a.notes);
    window.ATHTML.insertHTML(
      $('pro-content'),
      'beforeend',
      '<section id="mobile-profile-ratings">' +
        section(
          'ratings',
          'Vlerësimet e mia',
          rated
            .slice(0, 8)
            .map((a) =>
              card(a, {
                variant: 'Compact',
                subtitle: a.notes || 'Vlerësimi yt',
                chip: a.rating != null ? '★ ' + a.rating + '/10' : '',
              }),
            )
            .join('') || empty('Vlerësimet dhe shënimet e tua do të shfaqen këtu.'),
        ) +
        '</section>',
    );
  }
  function refreshNow() {
    const current = String(ctx.user?.()?.id || 'guest');
    if (current !== owner) {
      owner = current;
      filter = 'all';
      homeTab = 'watch';
      focusHome = false;
      pendingMove = null;
      homeLayout = 'list';
      detailId = '';
      detailTab = 'episodes';
      discoverMode = '';
      studioRequest++;
      homeLimits.active = homeLimits.stale = 20;
      scrollPositions.clear();
      homeShellMounted = false;
      homeRows.clear();
      lastUpcomingMarkup = '';
      if ($('mobile-browse-content')) window.ATHTML.renderHTML($('mobile-browse-content'), '');
    }
    if (!phone.matches) return;
    library();
    if (page === 'home' && !$('home-view').classList.contains('hidden')) home();
    if (page === 'profile') profile();
    searchState();
  }
  function refresh() {
    if (!phone.matches) {
      refreshNow();
      return;
    }
    if (refreshFrame) return;
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = 0;
      refreshNow();
    });
  }
  function navigation(next) {
    const changed = next !== page;
    if (next === 'home' && next !== page) {
      focusHome = false;
    }
    page = next;
    if (page !== 'home') {
      pendingMove = null;
      focusHome = false;
      clearTimeout(releaseTimer);
      cancelAnimationFrame(focusFrame);
    }
    document.body.dataset.mobilePage = page;
    refresh();
    if (phone.matches && changed) {
      restoringScroll = true;
      cancelAnimationFrame(focusFrame);
      focusFrame = requestAnimationFrame(() => {
        if (page === next)
          window.scrollTo({ top: scrollPositions.get(next) || 0, behavior: 'instant' });
        restoringScroll = false;
      });
    }
  }
  function mount() {
    const homeNode = document.createElement('div');
    homeNode.id = 'mobile-home';
    homeNode.className = 'mobile-only';
    $('product-onboarding').after(homeNode);
    mountDiscover();
    library();
    window.addEventListener(
      'scroll',
      () => {
        if (phone.matches && !restoringScroll) scrollPositions.set(page, window.scrollY);
      },
      { passive: true },
    );
    document.addEventListener(
      'click',
      (event) => {
        const b = event.target.closest('button');
        if (!b || !phone.matches) return;
        if (
          b.matches(
            '[data-mobile-nav],[data-mobile-action="navigate"],[data-mobile-action="search"],[data-pro-page]',
          )
        )
          scrollPositions.set(page, window.scrollY);
        if (
          b.matches('.at-mobile-nav button,#mobile-home button') &&
          !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
          clearTimeout(pressTimers.get(b));
          b.classList.add('mobile-tap-feedback');
          pressTimers.set(
            b,
            setTimeout(() => {
              b.classList.remove('mobile-tap-feedback');
              pressTimers.delete(b);
            }, 260),
          );
        }
        if (b.dataset.mobileNav === 'home' && page === 'home') {
          if (homeTab !== 'watch') {
            homeTab = 'watch';
            home();
          }
          window.scrollTo({ top: 0, behavior: 'instant' });
          scrollPositions.set('home', 0);
        }
        if (b.dataset.iosAction === 'advance' || b.dataset.mobileAction === 'unwatch') {
          const a = ctx.state().anime.find((a) => a.id === b.dataset.id);
          const next =
            b.dataset.mobileAction === 'unwatch'
              ? {
                  season: a?.seasons.find((s) => s.id === b.dataset.mobileSeason),
                  n: Number(b.dataset.mobileEpisode),
                }
              : a && ctx.nextEpisode(a);
          const node = b.closest('#mobile-home .watch-row');
          if (next?.season && node)
            pendingMove = {
              id: a.id,
              season: next.season.id,
              number: next.n,
              seen: b.dataset.iosAction === 'advance',
              node,
            };
        }
      },
      true,
    );
    document.addEventListener('click', (event) => {
      const b = event.target.closest('button');
      if (!b || !phone.matches) return;
      if (
        b.dataset.mobileAction === 'load-home' &&
        ['active', 'stale'].includes(b.dataset.mobileGroup)
      ) {
        homeLimits[b.dataset.mobileGroup] += 20;
        home();
      }
      if (b.dataset.mobileAction === 'search') {
        ctx.navigate('explore');
        $('global-search')?.focus({ preventScroll: true });
      }
      if (b.dataset.mobileHomeTab) {
        homeTab = b.dataset.mobileHomeTab;
        home();
      }
      if (b.dataset.mobileHomeLayout) {
        homeLayout = b.dataset.mobileHomeLayout;
        home();
      }
      if (b.dataset.mobileAction === 'history')
        $('mobile-history')?.scrollIntoView({
          block: 'start',
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'instant'
            : 'smooth',
        });
      if (b.dataset.mobileAction === 'continue')
        $('mobile-continue')?.scrollIntoView({
          block: 'start',
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'instant'
            : 'smooth',
        });
      if (b.dataset.mobileAction === 'resume') {
        const item = ctx.state().anime.find((item) => item.id === b.dataset.id);
        const season = item?.seasons.find((part) => part.id === b.dataset.mobileSeason);
        const number = Number(b.dataset.mobileEpisode);
        if (season && Number.isInteger(number) && number > 0)
          ctx.openEpisode(item.id, season.id, number);
      }
      if (b.dataset.mobileAction === 'unwatch') {
        const a = ctx.state().anime.find((a) => a.id === b.dataset.id),
          season = a?.seasons.find((s) => s.id === b.dataset.mobileSeason),
          number = Number(b.dataset.mobileEpisode);
        if (season?.watched.includes(number)) ctx.markEpisode(a.id, season.id, number);
      }
      if (b.dataset.mobileAction === 'navigate') ctx.navigate(b.dataset.mobileTarget);
      if (b.dataset.mobileAction === 'detail') ctx.openAnime(b.dataset.id);
      if (b.dataset.mobileAction === 'episode') {
        const a = ctx.state().anime.find((a) => a.id === b.dataset.id),
          nx = a && ctx.nextEpisode(a);
        const season = a?.seasons.find((s) => s.id === b.dataset.mobileSeason);
        const number = Number(b.dataset.mobileEpisode);
        if (season && Number.isInteger(number) && number > 0)
          ctx.openEpisode(a.id, season.id, number);
        else if (nx) ctx.openEpisode(a.id, nx.season.id, nx.n);
      }
      if (b.dataset.mobileAction === 'people') {
        const query = $('global-search').value;
        ctx.navigate('friends');
        const input = $('pro-friend-query');
        if (input) {
          input.value = query;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.focus();
        }
      }
      if (b.dataset.mobileFilter) {
        filter = b.dataset.mobileFilter;
        searchState();
      }
      if (b.dataset.mobileBrowse) void browse(b.dataset.mobileBrowse);
      if (b.dataset.mobileStudio) {
        const media = $('mobile-browse-content').studioMedia?.find(
          (a) => String(a.id) === b.dataset.mobileStudio,
        );
        if (media) ctx.previewItem(ctx.mapAniList(media));
      }
      if (b.dataset.mobileDetailTab) {
        detailTab = b.dataset.mobileDetailTab;
        $('detail-body').dataset.mobileTab = detailTab;
        document
          .querySelectorAll('[data-mobile-detail-tab]')
          .forEach((node) => node.setAttribute('aria-pressed', String(node === b)));
      }
    });
    phone.addEventListener('change', () => {
      if (detailId && $('detail-modal').classList.contains('show')) ctx.refreshDetail(detailId);
      if (!phone.matches) {
        if ($('mobile-library-controls')) $('mobile-library-controls').open = true;
        const legacy = $('at-iphone-feed');
        if (legacy) $('home-view').append(legacy);
      }
      refresh();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') clearTimeout(releaseTimer);
      else if (phone.matches && page === 'home') home();
    });
    navigation(page);
  }
  return { mount, refresh, navigation, detail, preview };
}
