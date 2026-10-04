import { syncPresentation } from './sync-presentation.js';
import { navIcon } from './nav-icons.js';
import { createMobilePresentation } from './mobile-presentation.js';

export { syncPresentation };
export function primaryPage(page) {
  if (page === 'reading') return 'reading';
  if (['explore', 'seasons', 'recommendations', 'news'].includes(page)) return 'explore';
  if (['library', 'collections'].includes(page)) return 'library';
  if (['diary', 'calendar', 'upcoming', 'statistics', 'wrapped', 'notifications'].includes(page))
    return 'diary';
  if (['profile', 'friends', 'sync', 'watch', 'moderation'].includes(page)) return 'profile';
  return 'home';
}

export function createProductExperience(ctx) {
  const mobile = createMobilePresentation(ctx);
  const $ = (id) => document.getElementById(id),
    esc = ctx.esc;
  const finishedOwners = new Set();
  let page = 'home',
    owner = '',
    step = 0,
    guide = false,
    manualGuide = false,
    searchQuery = '',
    retrying = false,
    syncSignature = '';
  const primary = [
    ['home', 'home-nav', 'Kreu'],
    ['library', 'library-nav', 'Biblioteka'],
    ['explore', 'explore-nav', 'Zbulo'],
    ['diary', 'pro-nav-diary', 'Aktiviteti'],
    ['profile', 'pro-nav-profile', 'Profili'],
    ['reading', 'pro-nav-reading', 'Manga & Manhwa'],
  ];
  const groups = {
    library: ['pro-nav-collections'],
    explore: ['seasons-nav', 'pro-nav-recommendations', 'pro-nav-news'],
    diary: [
      'pro-nav-calendar',
      'upcoming-nav',
      'statistics-nav',
      'pro-nav-wrapped',
      'pro-nav-notifications',
    ],
    profile: ['pro-nav-friends', 'pro-nav-watch'],
  };
  const key = () => 'animetrack_onboarding_140_' + owner;
  const completed = () => {
    if (finishedOwners.has(owner)) return true;
    try {
      return localStorage.getItem(key()) === 'done';
    } catch {
      return false;
    }
  };
  const hidden = (id, value) => {
    $(id)?.classList.toggle('product-hidden', !!value);
  };
  const empty = (title, text, action = 'search', label = 'Kërko një titull') =>
    `<section class="product-empty"><h2>${esc(title)}</h2><p>${esc(text)}</p><button type="button" class="primary" data-product-action="${action}">${esc(label)}</button></section>`;
  function navigation(next = page) {
    page = next;
    const selected = primaryPage(page);
    for (const [name, id] of primary) {
      const node = $(id);
      if (!node) continue;
      node.classList.toggle('active', name === selected);
      if (name === selected) node.setAttribute('aria-current', 'page');
      else node.removeAttribute('aria-current');
    }
    document.querySelectorAll('[data-mobile-nav]').forEach((node) => {
      const active = node.dataset.mobileNav === (selected === 'reading' ? 'library' : selected);
      node.classList.toggle('active', active);
      if (active) node.setAttribute('aria-current', 'page');
      else node.removeAttribute('aria-current');
    });
    const visible = groups[selected] || [];
    $('product-tools')
      ?.querySelectorAll('button')
      .forEach((node) => {
        node.hidden =
          !visible.includes(node.id) &&
          !(selected === 'profile' && node.dataset.productAction === 'settings');
      });
    hidden('product-tools', !visible.length);
    const titles = {
      home: 'Kreu',
      reading: 'Manga & Manhwa',
      library: 'Biblioteka ime',
      explore: 'Zbulo tituj',
      news: 'Lajme anime',
      diary: 'Aktiviteti im',
      profile: 'Profili im',
      seasons: 'Sezonet anime',
      recommendations: 'Për ty',
      collections: 'Listat e mia',
      calendar: 'Kalendari',
      upcoming: 'Episode të reja',
      statistics: 'Statistikat e mia',
      wrapped: 'Anime Wrapped',
      notifications: 'Njoftimet',
      friends: 'Miqtë',
      watch: 'Ku ta shoh',
      sync: 'Lidhjet e jashtme',
      moderation: 'Moderimi',
    };
    if ($('page-title')) $('page-title').textContent = titles[page] || 'AnimeTrack';
    refresh();
    mobile.navigation(next);
  }
  function sync() {
    const presentation = syncPresentation(ctx.watchSaveStatus?.(), navigator.onLine),
      bar = $('product-sync');
    if (!bar) return;
    const signature = JSON.stringify(presentation) + retrying;
    const pill = $('account-sync-pill');
    if (pill) {
      pill.textContent = presentation.label;
      pill.title = presentation.text;
    }
    if (signature === syncSignature) return;
    syncSignature = signature;
    bar.dataset.state = presentation.kind;
    const action = ['error', 'pending'].includes(presentation.kind)
      ? '<button type="button" class="ghost" data-product-action="retry-sync" ' +
        (retrying ? 'disabled' : '') +
        '>' +
        (retrying ? 'Po provohet…' : 'Provo përsëri') +
        '</button>'
      : ['conflict', 'warning', 'local'].includes(presentation.kind)
        ? '<button type="button" class="ghost" data-product-action="account">Hap llogarinë</button>'
        : '';
    window.ATHTML.renderHTML(
      bar,
      `<div><strong>${presentation.label}</strong><p>${presentation.text}</p></div>${action}`,
    );
    // One connection notice, shared by PC and phone.
    hidden('at112-connection', true);
  }
  function drawGuide() {
    const node = $('product-onboarding');
    if (!node) return;
    hidden('product-onboarding', !guide);
    if (!guide) return;
    const steps = [
      [
        'Biblioteka jote, në një vend',
        'Ruaj anime, seriale dhe filma në të njëjtën bibliotekë. Fillo duke kërkuar një titull ose duke importuar kopjen tënde.',
      ],
      [
        'Ndiq episodin e radhës',
        'Hap titullin, zgjidh sezonin dhe shëno vetëm episodet që ke parë. Butoni “Episodi i radhës” të çon aty ku e le.',
      ],
      [
        'Vazhdo edhe nga telefoni',
        'Me të njëjtën llogari, progresi sinkronizohet mes pajisjeve. Pa internet, ndryshimet presin lidhjen; kontrollo treguesin e ruajtjes.',
      ],
    ];
    const [title, text] = steps[step];
    window.ATHTML.renderHTML(
      node,
      `<div class="product-guide-head"><span>Hapi ${step + 1} nga 3</span><button type="button" class="ghost" data-product-action="guide-skip">Kalo udhëzuesin</button></div><ol class="product-steps" aria-label="Hapat e udhëzuesit">${steps.map((s, i) => `<li ${i === step ? 'aria-current="step"' : ''}>${i + 1}<span class="sr-only"> ${esc(s[0])}</span></li>`).join('')}</ol><h2 id="product-guide-title" tabindex="-1">${title}</h2><p>${text}</p><div class="product-actions">${step ? '<button type="button" class="ghost" data-product-action="guide-back">Mbrapa</button>' : ''}<button type="button" class="primary" data-product-action="${step === 2 ? 'guide-finish' : 'guide-next'}">${step === 2 ? 'Fillo bibliotekën' : 'Vazhdo'}</button></div>`,
    );
  }
  function finish() {
    guide = false;
    manualGuide = false;
    finishedOwners.add(owner);
    try {
      localStorage.setItem(key(), 'done');
    } catch {}
    drawGuide();
    refresh();
  }
  function refresh() {
    if (!$('product-home-empty')) return;
    const current = String(ctx.user?.()?.id || '');
    if (owner !== current) {
      owner = current;
      step = 0;
      guide = false;
      manualGuide = false;
      drawGuide();
    }
    const items = ctx.state()?.anime || [],
      ready = !document.body.classList.contains('account-booting');
    if (ready && owner && !items.length && !completed() && !manualGuide && !guide) {
      guide = true;
      drawGuide();
    }
    if (items.length && guide && !manualGuide) finish();
    const noLibrary = !items.length;
    hidden('product-home-empty', !noLibrary || guide);
    hidden('at-home-main', noLibrary);
    hidden('at-iphone-feed', noLibrary);
    // Optional panels disappear when their content is absent, while the primary action stays available.
    hidden(
      'at-home-session',
      !(ctx.state()?.preferences?.homeQueue || []).some((id) => items.some((a) => a.id === id)),
    );
    hidden(
      'at-home-releases',
      !$('at-home-releases')?.querySelector('[data-home-action="open-release"]'),
    );
    hidden('at-home-seasons', !$('at-home-seasons')?.querySelector('[data-id],[data-detail]'));
    hidden('at-home-discovery', !items.length);
    hidden('at-home-brief', !items.length);
    const card = document.querySelector('#pro-content .at135-profile-card'),
      destination = $('product-advanced-content');
    if (card && destination) {
      destination.querySelector('.at135-profile-card')?.remove();
      destination.append(card);
    }
    hidden(
      'product-advanced',
      !(page === 'profile' && document.querySelector('.at-profile-settings')),
    );
    hidden('product-library-empty', !noLibrary);
    $('library-view')?.classList.toggle('product-is-empty', noLibrary);
    sync();
    mobile.refresh();
  }
  function searchFinished(query, { count = 0, failed = false } = {}) {
    searchQuery = query;
    const grid = $('catalog-grid');
    if (!grid) return;
    grid.removeAttribute('aria-busy');
    if (count) {
      $('catalog-state').textContent = `${count} rezultate për “${query}”`;
      return;
    }
    if (failed) {
      window.ATHTML.renderHTML(
        grid,
        empty(
          'Kërkimi nuk u ngarkua',
          'Kontrollo lidhjen dhe provo përsëri.',
          'retry-search',
          'Provo përsëri',
        ),
      );
      $('catalog-state').textContent = 'Kërkimi nuk u përfundua.';
    } else {
      window.ATHTML.renderHTML(
        grid,
        empty(
          'Nuk u gjet asnjë titull',
          'Provo emrin origjinal ose një shkrim tjetër.',
          'search',
          'Ndrysho kërkimin',
        ),
      );
      $('catalog-state').textContent = `Asnjë rezultat për “${query}”`;
    }
  }
  function detail(id) {
    const root = $('detail-body'),
      a = ctx.state()?.anime?.find((x) => x.id === id);
    if (!root || !a) return;
    root.querySelector('.product-progress')?.remove();
    const next = ctx.nextEpisode(a),
      movie = ctx.isMovie(a),
      n = ctx.count(a),
      total = ctx.releasedTotal(a),
      pct = ctx.percent(a);
    const season = next ? ctx.seasonNumber(a, next.season) : 0;
    const summary = document.createElement('section');
    summary.className = 'product-progress';
    summary.setAttribute('aria-label', 'Progresi yt');
    window.ATHTML.renderHTML(
      summary,
      `<div><span class="eyebrow">PROGRESI YT</span><h3>${movie ? (a.status === 'completed' ? 'Filmi është parë' : 'Filmi është në listë') : `${n} nga ${total || '?'} episode të parë`}</h3><p>${next ? (movie ? 'Hap filmin' : `Në radhë: ${season ? 'Sezoni ' + season + ' · ' : ''}Episodi ${next.n}`) : total ? 'Je në hap me episodet e transmetuara.' : 'Ende nuk ka episode të transmetuara.'}</p></div>${next ? `<button type="button" class="primary" data-product-action="resume" data-id="${esc(id)}">${movie ? 'Hap filmin' : 'Episodi i radhës'}</button>` : ''}<div class="product-meter" role="progressbar" aria-label="Progresi i shikimit" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.max(0, Math.min(100, pct))}"><span class="${window.ATHTML.percentClass(pct, 'w')}"></span></div>`,
    );
    root.prepend(summary);
    for (const node of root.querySelectorAll('.details-section')) {
      const title = node.querySelector('h4')?.textContent;
      if (title !== 'Përshkrimi' && !node.classList.contains('at150-movie-facts')) continue;
      const box = document.createElement('details');
      box.className = 'product-secondary';
      const heading = document.createElement('summary');
      heading.textContent = title || 'Informacion';
      node.before(box);
      box.append(heading, node);
    }
    for (const [selector, label] of [
      ['.synopsis', 'Përshkrimi'],
      ['.detail-synopsis', 'Përshkrimi'],
      ['.at133-watch', 'Ku mund ta shoh?'],
      ['.at134-rich', 'Aktorët dhe krijuesit'],
    ]) {
      const node = root.querySelector(selector);
      if (!node || node.closest('.product-secondary')) continue;
      const box = document.createElement('details');
      box.className = 'product-secondary';
      const heading = document.createElement('summary');
      heading.textContent = label;
      node.before(box);
      box.append(heading, node);
    }
    mobile.detail(id);
  }
  function mount() {
    ctx.subscribe?.((_state, event) => {
      if (event.reason === 'account') refresh();
    });
    const nav = $('side-nav'),
      legacy = document.createElement('div');
    legacy.className = 'product-hidden';
    legacy.id = 'product-legacy-nav';
    [...nav.children].forEach((node) => legacy.append(node));
    nav.after(legacy);
    for (const [name, id, label] of primary) {
      const node = $(id);
      if (!node) continue;
      window.ATHTML.renderHTML(
        node,
        `<span>${navIcon(name)}<span class="nav-label">${label}</span></span>`,
      );
      nav.append(node);
    }
    const tools = document.createElement('nav');
    tools.id = 'product-tools';
    tools.className = 'product-tools';
    tools.setAttribute('aria-label', 'Seksionet e faqes');
    [...new Set(Object.values(groups).flat())].forEach((id) => {
      const node = $(id);
      if (node) {
        node.setAttribute(
          'aria-label',
          node.querySelector('.nav-label')?.textContent || node.textContent.trim(),
        );
        tools.append(node);
      }
    });
    window.ATHTML.insertHTML(
      tools,
      'beforeend',
      '<button type="button" class="ghost" data-product-action="settings">Cilësimet</button>',
    );
    document.querySelector('.topbar').after(tools);
    const bar = document.createElement('section');
    bar.id = 'product-sync';
    bar.className = 'product-sync';
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-live', 'polite');
    tools.before(bar);
    document.querySelectorAll('[data-mobile-nav]').forEach((node) => {
      const item = primary.find((x) => x[0] === node.dataset.mobileNav);
      if (item) node.querySelector('small').textContent = item[2];
    });
    const home = $('home-view');
    window.ATHTML.insertHTML(
      home,
      'afterbegin',
      '<section id="product-onboarding" class="product-onboarding product-hidden" aria-label="Udhëzuesi i parë"></section><div id="product-home-empty" class="product-hidden">' +
        empty(
          'Historia jote nis këtu',
          'Kërko titullin e parë dhe shtoje në bibliotekë. Progresi yt do të jetë këtu.',
        ) +
        '</div>',
    );
    window.ATHTML.insertHTML(
      $('library-view'),
      'afterbegin',
      '<div id="product-library-empty" class="product-hidden">' +
        empty(
          'Biblioteka është ende bosh',
          'Shto një anime, serial ose film. Nëse ke një kopje rezervë, mund ta importosh.',
          'search',
        ) +
        '<button type="button" class="ghost" data-product-action="import">Importo kopjen time</button></div>',
    );
    const advanced = document.createElement('section');
    advanced.id = 'product-advanced';
    advanced.className = 'product-advanced product-hidden';
    window.ATHTML.renderHTML(
      advanced,
      '<details><summary>Avancuar</summary><div id="product-advanced-content"><h3>Burimet dhe lidhjet</h3><p>Kërkimi bazë punon pa konfigurim. Lidhjet e jashtme dhe burimet shtesë janë opsionale.</p><div class="product-actions"><button type="button" class="ghost" data-product-action="external-sync">Lidh MAL / AniList</button><button type="button" class="ghost" data-product-action="guide-open">Rihap udhëzuesin</button></div></div></details>',
    );
    $('pro-view').append(advanced);
    const destination = $('product-advanced-content');
    if ($('movie-provider-settings')) destination.append($('movie-provider-settings'));
    if ($('pro-nav-moderation')) destination.append($('pro-nav-moderation'));
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    document.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-product-action]');
      if (!button) return;
      const action = button.dataset.productAction;
      if (action === 'search') {
        ctx.navigate('explore');
        $('global-search')?.focus();
      }
      if (action === 'import') $('import-file')?.click();
      if (action === 'account') ctx.openAccount();
      if (action === 'settings') ctx.openSettings();
      if (action === 'external-sync') ctx.navigate('sync');
      if (action === 'retry-search') ctx.searchOnline(searchQuery, { retry: true });
      if (action === 'resume') {
        const a = ctx.state().anime.find((x) => x.id === button.dataset.id),
          next = a && ctx.nextEpisode(a);
        if (next) ctx.openEpisode(a.id, next.season.id, next.n);
      }
      if (action === 'guide-open') {
        ctx.navigate('home');
        manualGuide = true;
        guide = true;
        step = 0;
        drawGuide();
        $('product-guide-title')?.focus();
      }
      if (action === 'guide-next' || action === 'guide-back') {
        step += action === 'guide-next' ? 1 : -1;
        drawGuide();
        $('product-guide-title')?.focus();
      }
      if (action === 'guide-skip' || action === 'guide-finish') {
        finish();
        if (action === 'guide-finish') {
          ctx.navigate('explore');
          $('global-search')?.focus();
        } else $('home-nav')?.focus();
      }
      if (action === 'retry-sync' && !retrying) {
        retrying = true;
        sync();
        try {
          await ctx.retrySync();
        } catch {
          ctx.toast('Sinkronizimi nuk u krye. Provo përsëri.');
        } finally {
          retrying = false;
          sync();
        }
      }
    });
    mobile.mount();
    navigation('home');
  }
  return { mount, refresh, navigation, detail, searchFinished, preview: mobile.preview };
}
