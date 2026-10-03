import { MediaCard, mobilePartLabel, mobileEpisodeLabel } from './media-card.js';
import { navIcon } from './nav-icons.js';
import { recentWatchedEpisodes } from './watch-history.js';

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
  const motionGhosts = new Set(),
    pressTimers = new WeakMap();
  let lastHomeMarkup = '',
    releaseTimer,
    pendingMove,
    focusFrame,
    focusHome = true;
  let homeTab = 'watch',
    homeLayout = 'list';
  function home() {
    if (!phone.matches || !$('mobile-home')) return;
    const items = ctx.state().anime || [];
    const history = ctx.state().history || [];
    const touchedAt = new Map();
    for (const event of history)
      if (['watched', 'season-watched'].includes(event.action))
        touchedAt.set(
          event.id,
          Math.max(touchedAt.get(event.id) || 0, Date.parse(event.date) || 0),
        );
    const touched = (a) =>
      touchedAt.get(a.id) || Date.parse(a.createdAt || a.updatedAt) || Date.now();
    const entries = ctx.upcoming?.() || [];
    const releaseTimes = new Map(
      entries.map((e) => [
        e.animeId +
          ':' +
          (e.seasonId || e.localSeason?.id) +
          ':' +
          (e.seasonEpisode || e.localEpisode || e.episode),
        Number(e.when),
      ]),
    );
    const candidates = items
      .filter((a) => ['watching', 'waiting', 'completed'].includes(a.status))
      .map((a) => {
        const next = ctx.nextEpisode(a);
        if (!next) return null;
        const meta = next.season.episodes?.find((e) => e.number === next.n);
        const releasedAt =
          Date.parse(meta?.airedAt || meta?.aired || '') ||
          releaseTimes.get(a.id + ':' + next.season.id + ':' + next.n) ||
          (Number(next.season.nextAiringEpisode) === next.n
            ? Number(next.season.nextAiringAt) * 1000
            : 0);
        const fresh =
          releasedAt > 0 && releasedAt <= Date.now() && Date.now() - releasedAt <= 7 * 86400000;
        return { a, next, releasedAt, fresh };
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          Number(b.fresh) - Number(a.fresh) ||
          (b.fresh ? b.releasedAt - a.releasedAt : touched(b.a) - touched(a.a)),
      );
    const active = candidates.filter(
      ({ a, fresh }) => fresh || Date.now() - touched(a) <= 7 * 86400000,
    );
    const stale = candidates.filter(
      ({ a, fresh }) => !fresh && Date.now() - touched(a) > 7 * 86400000,
    );
    const row = (a, next, options = {}) => {
      const meta = next.season.episodes?.find((e) => e.number === next.n);
      const poster = ctx.poster(a.cover || '');
      return `<article class="watch-row${options.fresh ? ' watch-row--fresh' : ''}${options.seen ? ' watch-row--seen' : ''}" data-watch-key="${esc(a.id)}:${esc(next.season.id)}:${next.n}:${options.seen ? 'seen' : options.upcoming ? 'future' : 'next'}"><button type="button" class="watch-row-poster" data-mobile-action="detail" data-id="${esc(a.id)}" aria-label="Hap ${esc(a.title)}">${poster ? `<img src="${esc(poster)}" alt="" loading="lazy" decoding="async">` : '<span aria-hidden="true">✦</span>'}</button><div class="watch-row-copy"><button type="button" class="watch-row-title" data-mobile-action="detail" data-id="${esc(a.id)}">${esc(a.title)} <span aria-hidden="true">›</span></button>${options.fresh ? '<span class="watch-row-new" aria-label="Episod i ri pa parë">NEW · EP</span>' : ''}<button type="button" class="watch-row-episode" data-mobile-action="episode" data-id="${esc(a.id)}" data-mobile-season="${esc(next.season.id)}" data-mobile-episode="${next.n}">${esc(episode(a, next))}</button><p>${esc(meta?.title || (options.seen ? 'Episod i parë' : options.upcoming ? 'Episod i ardhshëm' : 'Episodi i radhës'))}${a.runtime ? ' · ' + esc(a.runtime) + ' min' : ''}</p></div>${options.upcoming ? '<span class="watch-row-pending" aria-label="Ende pa transmetuar">◷</span>' : options.seen ? `<button type="button" class="watch-row-seen" data-mobile-action="unwatch" data-id="${esc(a.id)}" data-mobile-season="${esc(next.season.id)}" data-mobile-episode="${next.n}" aria-label="Hiq shënimin e episodit ${next.n} të ${esc(a.title)}" title="Hiq nga episodet e parë">✓</button>` : `<button type="button" class="media-card-mark watch-row-mark" data-ios-action="advance" data-id="${esc(a.id)}" aria-label="Shëno episodin e radhës të ${esc(a.title)} si të parë">${navIcon('watch')}</button>`}</article>`;
    };
    const recent = recentWatchedEpisodes(items, history);
    const upcoming = entries
      .filter((e) => e.when > Date.now())
      .sort((a, b) => a.when - b.when)
      .slice(0, 40);
    const groups = new Map();
    for (const e of upcoming) {
      const a = items.find((a) => a.id === e.animeId);
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
    const label = (text) => `<h2 class="watch-group-label"><span>${text}</span></h2>`;
    const markup = `<div class="watch-home-tabs" role="group" aria-label="Lista e episodeve"><button type="button" data-mobile-home-tab="watch" aria-pressed="${homeTab === 'watch'}">Për të parë</button><button type="button" data-mobile-home-tab="upcoming" aria-pressed="${homeTab === 'upcoming'}">Së shpejti</button></div><div class="watch-home-toolbar"><button type="button" data-mobile-action="history">Historiku</button><div><button type="button" data-mobile-home-layout="list" aria-pressed="${homeLayout === 'list'}" aria-label="Shfaq listën">☷</button><button type="button" data-mobile-home-layout="grid" aria-pressed="${homeLayout === 'grid'}" aria-label="Shfaq rrjetën">⊞</button></div></div><div class="watch-home-content" data-layout="${homeLayout}">${
      homeTab === 'watch'
        ? `<section id="mobile-history" aria-label="Historiku i fundit">${label('Historiku · Episodet e fundit')}${
            recent.length
              ? recent.map(({ a, season, n }) => row(a, { season, n }, { seen: true })).join('')
              : empty('Episodet e para do të shfaqen këtu pasi t’i shënosh.')
          }</section><section id="mobile-continue" aria-label="Për të parë">${label('Duke parë')}${active.length ? active.map(({ a, next, fresh }) => row(a, next, { fresh })).join('') : empty('Episodi yt i radhës shfaqet këtu. Shto një anime nga Zbulo.')}</section>${label('Zgjidh historinë tjetër')}<button type="button" class="watch-fill-list" data-mobile-action="navigate" data-mobile-target="explore">${navIcon('library')}<span><strong>Zgjero listën tënde</strong><small>Zbulo anime dhe shtoji në bibliotekë.</small></span><span aria-hidden="true">›</span></button><section id="mobile-stale">${label('Shumë kohë pa parë')}${stale.length ? stale.map(({ a, next }) => row(a, next)).join('') : empty('Nuk ke tituj të lënë pa parë më shumë se një javë.')}</section>`
        : `<section id="mobile-upcoming" aria-label="Episodet e ardhshme">${groups.size ? [...groups].map(([date, rows]) => label(esc(date)) + rows.join('')).join('') : empty('Nuk ka episode të ardhshme me datë të konfirmuar në bibliotekën tënde.')}</section>`
    }</div><div class="watch-home-links"><button type="button" data-mobile-action="navigate" data-mobile-target="calendar">Kalendari</button><button type="button" data-mobile-action="navigate" data-mobile-target="notifications">Njoftimet</button><button type="button" data-mobile-action="navigate" data-mobile-target="friends">Miqtë</button></div>`;
    if (markup !== lastHomeMarkup) {
      const root = $('mobile-home'),
        oldTop = $('mobile-continue')?.getBoundingClientRect().top;
      const movingRows =
        pendingMove && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? [...root.querySelectorAll('#mobile-history .watch-row')].map((node) => ({
              node,
              top: node.getBoundingClientRect().top,
            }))
          : [];
      const oldRows = new Map(
        [...root.querySelectorAll('[data-watch-key]')].map((node) => [node.dataset.watchKey, node]),
      );
      const draft = document.createElement('div');
      window.ATHTML.renderHTML(draft, markup);
      for (const next of draft.querySelectorAll('[data-watch-key]')) {
        const old = oldRows.get(next.dataset.watchKey);
        if (old?.outerHTML === next.outerHTML) next.replaceWith(old);
      }
      root.replaceChildren(...draft.childNodes);
      lastHomeMarkup = markup;
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
          if (!move.seen) focusHome = true;
          if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            target?.animate(
              [
                { transform: 'translateY(18px)', opacity: 0.4 },
                { transform: 'translateY(0)', opacity: 1 },
              ],
              { duration: 220, easing: 'ease-out' },
            );
            const ghost = move.node.cloneNode(true);
            ghost.inert = true;
            ghost.setAttribute('aria-hidden', 'true');
            Object.assign(ghost.style, {
              position: 'fixed',
              top: move.rect.top + 'px',
              left: move.rect.left + 'px',
              width: move.rect.width + 'px',
              height: move.rect.height + 'px',
              margin: '0',
              pointerEvents: 'none',
              zIndex: '950',
            });
            document.body.append(ghost);
            motionGhosts.add(ghost);
            const dy = Math.max(
              -240,
              Math.min(
                240,
                (target?.getBoundingClientRect().top ?? move.rect.top - 100) - move.rect.top,
              ),
            );
            ghost
              .animate(
                [
                  { transform: 'translateY(0)', opacity: 0.85 },
                  { transform: `translateY(${dy}px) scale(.96)`, opacity: 0 },
                ],
                { duration: 220, easing: 'ease-out' },
              )
              .finished.then(
                () => {
                  ghost.remove();
                  motionGhosts.delete(ghost);
                },
                () => {
                  ghost.remove();
                  motionGhosts.delete(ghost);
                },
              );
          }
        }
      }
    }
    if (focusHome) {
      focusHome = false;
      cancelAnimationFrame(focusFrame);
      focusFrame = requestAnimationFrame(() => {
        if (page === 'home' && homeTab === 'watch' && !ctx.state().anime.length) return;
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
    for (const entry of entries) consider(Number(entry.when));
    for (const item of items)
      for (const season of item.seasons) {
        consider(Number(season.nextAiringAt) * 1000);
        for (const ep of season.episodes || []) consider(Date.parse(ep.airedAt || ep.aired || ''));
      }
    if (Number.isFinite(nextRelease))
      releaseTimer = setTimeout(
        () => home(),
        Math.min(86400000, Math.max(1, nextRelease - Date.now() + 100)),
      );
  }
  function searchState() {
    if (!$('mobile-browse')) return;
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
      `<div id="mobile-browse" class="mobile-only"><span class="mobile-kicker">ZGJIDH HISTORINË E RADHËS</span><h2>Çfarë të pëlqen?</h2><div class="mobile-browse-grid">${[
        ['anime', 'Anime', '01'],
        ['tv', 'Seriale', '02'],
        ['movie', 'Filma', '03'],
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
      focusHome = true;
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
        `<span class="mobile-kicker">WATCH NEXT</span>${nx ? card({ ...a, cover: meta?.image || a.cover }, { variant: 'Compact', episode: true, eyebrow: label, subtitle: meta?.title || (nx.season.format === 'MOVIE' ? nx.season.subtitle || a.title : 'Episodi ' + nx.n), meta: [a.runtime ? a.runtime + ' min' : '', meta?.aired || meta?.airedAt ? new Date(meta.aired || meta.airedAt).toLocaleDateString('sq-AL') : ''].filter(Boolean).join(' · ') }) : empty('Je në hap me episodet e transmetuara.')}${cta ? `<button type="button" class="primary mobile-detail-cta" ${nx ? 'data-mobile-action="episode"' : 'data-pro-action="rewatch-start"'} data-id="${esc(a.id)}">${navIcon('watch')}<span>${esc(cta)}</span></button>` : ''}`,
      );
    }
    const tabs = document.createElement('nav');
    tabs.className = 'mobile-detail-tabs';
    tabs.setAttribute('aria-label', 'Seksionet e titullit');
    window.ATHTML.renderHTML(
      tabs,
      [
        ['overview', 'Overview'],
        ['timeline', 'Timeline'],
        ['episodes', 'Episodes'],
        ['cast', 'Cast & Staff'],
        ['reviews', 'Reviews'],
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
      heading.textContent = 'ALL SEASONS';
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
  function refresh() {
    const current = String(ctx.user?.()?.id || 'guest');
    if (current !== owner) {
      owner = current;
      filter = 'all';
      homeTab = 'watch';
      focusHome = true;
      pendingMove = null;
      homeLayout = 'list';
      detailId = '';
      detailTab = 'episodes';
      discoverMode = '';
      studioRequest++;
      if ($('mobile-browse-content')) window.ATHTML.renderHTML($('mobile-browse-content'), '');
    }
    if (!phone.matches) return;
    library();
    if (page === 'home' && !$('home-view').classList.contains('hidden')) home();
    if (page === 'profile') profile();
    searchState();
  }
  function navigation(next) {
    const changed = next !== page;
    if (next === 'home' && next !== page) {
      homeTab = 'watch';
      focusHome = true;
    }
    page = next;
    if (page !== 'home') {
      clearTimeout(releaseTimer);
      cancelAnimationFrame(focusFrame);
      for (const ghost of motionGhosts) {
        ghost.getAnimations().forEach((animation) => animation.cancel());
        ghost.remove();
      }
      motionGhosts.clear();
    }
    document.body.dataset.mobilePage = page;
    refresh();
    if (phone.matches && changed && next !== 'home') {
      cancelAnimationFrame(focusFrame);
      focusFrame = requestAnimationFrame(() => {
        if (page === next) window.scrollTo({ top: 0, behavior: 'instant' });
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
    document.addEventListener(
      'click',
      (event) => {
        const b = event.target.closest('button');
        if (!b || !phone.matches) return;
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
          $('mobile-continue')?.scrollIntoView({ block: 'start', behavior: 'instant' });
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
              rect: node.getBoundingClientRect(),
            };
        }
      },
      true,
    );
    document.addEventListener('click', (event) => {
      const b = event.target.closest('button');
      if (!b || !phone.matches) return;
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
      if (b.dataset.mobileAction === 'unwatch') {
        const a = ctx.state().anime.find((a) => a.id === b.dataset.id),
          season = a?.seasons.find((s) => s.id === b.dataset.mobileSeason),
          number = Number(b.dataset.mobileEpisode);
        if (season?.watched.includes(number)) ctx.markEpisode(a.id, season.id, number);
        pendingMove = null;
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
