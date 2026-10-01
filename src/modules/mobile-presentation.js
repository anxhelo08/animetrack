import { MediaCard, mobilePartLabel, mobileEpisodeLabel } from './media-card.js';
import { navIcon } from './nav-icons.js';

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
  function home() {
    if (!phone.matches || !$('mobile-home')) return;
    const legacy = $('at-iphone-feed');
    legacy?.remove();
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
      Math.min(
        Date.now(),
        touchedAt.get(a.id) || Date.parse(a.createdAt || a.updatedAt) || Date.now(),
      );
    const continuing = items
      .filter((a) => ['watching', 'waiting', 'completed'].includes(a.status) && ctx.nextEpisode(a))
      .sort((a, b) => touched(b) - touched(a));
    const active = continuing.filter((a) => Date.now() - touched(a) <= 7 * 86400000);
    const lead = (active.length ? active : continuing).slice(0, 8);
    const releases = (ctx.recentAiring?.() || []).filter(
      (e) => Number(e.when) <= Date.now() && Number(e.when) >= Date.now() - 7 * 86400000,
    );
    const releaseCards = releases
      .slice(0, 6)
      .map((e) => {
        const a = items.find((a) => a.id === (e.animeId || e.anime?.id));
        const s = a?.seasons.find((s) => s.id === (e.seasonId || e.localSeason?.id));
        return a && s
          ? card(a, {
              variant: 'Compact',
              subtitle: mobileEpisodeLabel(s, ctx.seasonNumber(a, s), e.localEpisode || e.episode),
              meta: new Date(e.when).toLocaleDateString('sq-AL'),
              chip: 'Sapo doli',
            })
          : '';
      })
      .join('');
    const recommendations = ctx.mobileRecommendations?.() || [];
    const recCards = recommendations
      .slice(0, 8)
      .map((a) =>
        card(a, {
          recommendation: true,
          subtitle: a.genre || a.format,
          meta: a.year ? String(a.year) : '',
          chip: a.score ? '★ ' + (a.score / 10).toFixed(1) : '',
        }),
      )
      .join('');
    const trending = recommendations
      .slice()
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 8)
      .map((a) =>
        card(a, {
          recommendation: true,
          subtitle: a.genre || a.format,
          meta: a.popularity
            ? Number(a.popularity).toLocaleString('sq-AL') + ' ndjekës · AniList'
            : '',
        }),
      )
      .join('');
    const upcoming = (ctx.upcoming?.() || [])
      .filter((e) => e.when > Date.now() && e.when <= Date.now() + 7 * 86400000)
      .sort((a, b) => a.when - b.when);
    const week = upcoming
      .slice(0, 6)
      .map((e) => {
        const a = items.find((a) => a.id === e.animeId);
        return a
          ? card(a, {
              variant: 'Upcoming',
              subtitle: 'EP ' + (e.seasonEpisode || e.episode),
              meta: new Date(e.when).toLocaleDateString('sq-AL', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
              }),
            })
          : '';
      })
      .join('');
    const stale = continuing
      .filter((a) => Date.now() - touched(a) > 7 * 86400000)
      .slice(0, 8)
      .map((a) =>
        card(a, {
          variant: 'Compact',
          episode: true,
          subtitle: episode(a, ctx.nextEpisode(a)),
          meta: 'Vazhdo aty ku e le',
        }),
      )
      .join('');
    const friendDOM = document.createElement('div');
    window.ATHTML.renderHTML(friendDOM, ctx.mobileFriends?.() || '');
    const activity = [...friendDOM.querySelectorAll('.at116-friend-activity')]
      .slice(0, 5)
      .map((row) => {
        const title = row.querySelector(':scope > div > span')?.textContent || '';
        return card(
          { id: '', title, cover: row.querySelector('.at11-social-avatar img')?.src || '' },
          {
            variant: 'Activity',
            eyebrow: row.querySelector('strong')?.textContent,
            meta: row.querySelector('small')?.textContent,
          },
        );
      })
      .join('');
    window.ATHTML.renderHTML(
      $('mobile-home'),
      `<header class="mobile-home-head"><div><span class="mobile-kicker">HISTORIA JOTE, EPISOD PAS EPISODI</span><h1>Përshëndetje, ${esc((ctx.accountName() || 'anime fan').split(/[\s@]/)[0])}<span class="mobile-spark">✦</span></h1></div><button type="button" data-mobile-action="navigate" data-mobile-target="notifications" aria-label="Njoftimet">${navIcon('notifications')}${ctx.unreadCount?.() ? '<span class="mobile-unread"></span>' : ''}</button></header>` +
        section(
          'continue',
          'Vazhdo shikimin',
          lead.length
            ? lead
                .map((a, i) =>
                  card(a, {
                    variant: 'ContinueWatching',
                    priority: i === 0,
                    episode: true,
                    progress: ctx.percent(a),
                    eyebrow: episode(a, ctx.nextEpisode(a)),
                    subtitle:
                      ctx
                        .nextEpisode(a)
                        .season.episodes?.find((e) => e.number === ctx.nextEpisode(a).n)?.title ||
                      'Episodi yt i radhës',
                    meta: ctx.count(a) + ' / ' + ctx.releasedTotal(a) + ' episode',
                    chip: (a.genre || '').split(',')[0],
                  }),
                )
                .join('')
            : `<div class="mobile-empty"><h3>Çfarë do të shikosh sot?</h3><p>Shto një titull dhe episodi yt i radhës do të jetë këtu.</p><button type="button" class="primary" data-mobile-action="navigate" data-mobile-target="explore">Zbulo një histori</button></div>`,
          'library',
          !!lead.length,
        ) +
        section(
          'releases',
          'Sapo Dolën',
          releaseCards || empty('Nuk ka episode të reja të konfirmuara në bibliotekën tënde.'),
          'upcoming',
        ) +
        section(
          'for-you',
          'Për Ty',
          recCards || empty('Rekomandimet shfaqen kur katalogu është i disponueshëm.'),
          'recommendations',
          !!recCards,
        ) +
        section(
          'trending',
          'Trending',
          trending || empty('Katalogu i popullaritetit po pret lidhjen.'),
          'recommendations',
          !!trending,
        ) +
        section(
          'week',
          'Këtë Javë',
          week || empty('Nuk ka premiera të konfirmuara për këtë javë.'),
          'calendar',
        ) +
        section(
          'stale',
          'Nuk Ke Parë Prej Kohësh',
          stale || empty('Historitë e tua janë në hap me ty.'),
          'library',
        ) +
        section(
          'friends',
          'Aktiviteti i Miqve',
          activity || empty('Këtu shfaqet aktiviteti që miqtë e pranuar zgjedhin të ndajnë.'),
          'friends',
        ) +
        '<details class="mobile-legacy-tools"><summary>Më shumë mjete për episodet</summary></details>',
    );
    if (legacy) $('mobile-home').querySelector('.mobile-legacy-tools').append(legacy);
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
      !$('catalog-grid').hasAttribute('aria-busy') &&
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
        ['tv', 'Series', '02'],
        ['movie', 'Movies', '03'],
        ['trending', 'Trending', '↗'],
        ['new', 'New Releases', '✦'],
        ['top', 'Top Rated', '★'],
        ['genres', 'Genres', '◈'],
        ['studios', 'Studios', '◎'],
        ['upcoming', 'Upcoming', '◷'],
      ]
        .map(
          ([key, label, mark]) =>
            `<button type="button" data-mobile-browse="${key}"><span aria-hidden="true">${mark}</span><strong>${label}</strong></button>`,
        )
        .join('')}</div><section id="mobile-browse-content" aria-live="polite"></section></div>`,
    );
    window.ATHTML.insertHTML(
      $('global-search').closest('label'),
      'afterend',
      `<div id="mobile-search-filters" class="mobile-only mobile-search-hidden" role="group" aria-label="Lloji i rezultateve">${[
        ['all', 'All'],
        ['anime', 'Anime'],
        ['tv', 'Series'],
        ['movie', 'Movies'],
        ['people', 'People'],
      ]
        .map(
          ([key, label]) =>
            `<button type="button" data-mobile-filter="${key}" aria-pressed="${key === 'all'}">${label}</button>`,
        )
        .join(
          '',
        )}</div><p id="mobile-filter-empty" class="mobile-only mobile-search-hidden mobile-empty">Nuk ka rezultate në këtë kategori. Provo All ose një titull tjetër.</p><div id="mobile-people" class="mobile-only"><p>Kërko miq me emrin ose username-in e tyre.</p><button type="button" class="primary" data-mobile-action="people">Shiko rezultatet për miq</button></div>`,
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
          { anime: 'Anime', tv: 'Series', movie: 'Movies' }[kind],
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
          'Trending',
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
              '{ Page(perPage:20) { studios(isAnimationStudio:true,sort:FAVOURITES_DESC) { id name media(perPage:4,sort:POPULARITY_DESC) { nodes { id idMal title { romaji english } coverImage { large } format episodes seasonYear averageScore genres siteUrl } } } } }',
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
      '<summary>Filter + Sort <span aria-hidden="true">☷</span></summary><div class="mobile-library-controls-body"></div>',
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
    if (overview) overview.textContent = 'Profile';
    const stats = nav.querySelector('[data-id="stats"]');
    if (stats) stats.textContent = 'Stats';
    const friends = nav.querySelector('[data-pro-page="friends"]');
    if (friends) friends.textContent = 'Friends';
    const settings = nav.querySelector('[data-id="settings"]');
    settings?.classList.add('mobile-profile-settings');
    const diary = document.createElement('button');
    diary.type = 'button';
    diary.dataset.mobileProfileDiary = '';
    diary.dataset.proPage = 'diary';
    diary.textContent = 'Diary';
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
          'Ratings & Reviews',
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
      detailId = '';
      detailTab = 'episodes';
      discoverMode = '';
      studioRequest++;
      if ($('mobile-browse-content')) window.ATHTML.renderHTML($('mobile-browse-content'), '');
    }
    if (!phone.matches) return;
    library();
    home();
    profile();
    searchState();
  }
  function navigation(next) {
    if (phone.matches && next !== page) window.scrollTo({ top: 0, behavior: 'instant' });
    page = next;
    document.body.dataset.mobilePage = page;
    refresh();
  }
  function mount() {
    const homeNode = document.createElement('div');
    homeNode.id = 'mobile-home';
    homeNode.className = 'mobile-only';
    $('product-onboarding').after(homeNode);
    mountDiscover();
    library();
    document.addEventListener('click', (event) => {
      const b = event.target.closest('button');
      if (!b || !phone.matches) return;
      if (b.dataset.mobileAction === 'navigate') ctx.navigate(b.dataset.mobileTarget);
      if (b.dataset.mobileAction === 'detail') ctx.openAnime(b.dataset.id);
      if (b.dataset.mobileAction === 'episode') {
        const a = ctx.state().anime.find((a) => a.id === b.dataset.id),
          nx = a && ctx.nextEpisode(a);
        if (nx) ctx.openEpisode(a.id, nx.season.id, nx.n);
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
    navigation(page);
  }
  return { mount, refresh, navigation, detail, preview };
}
