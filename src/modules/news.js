import { escapeHTML } from './safe-html.js';
import { navIcon } from './nav-icons.js';

const mounts = new WeakMap();
const PAGE_SIZE = 8,
  CACHE_MS = 900000;
let cached = null,
  mountedCount = 0;
const labels = { All: 'Gjithçka', Industry: 'Industria', Releases: 'Premiera' };
const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
const publisher = /^(?:www\.)?(?:animenewsnetwork\.com|crunchyroll\.com)$/;
const placeholder = '/news-placeholder.svg';
const arrow =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7 M7 7h10v10"/></svg>';
const down =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14 M6 13l6 6 6-6"/></svg>';
function safeURL(value, article = false) {
  if (!article && value === placeholder) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (!article || publisher.test(url.hostname))
      ? url.href
      : '';
  } catch {
    return '';
  }
}
export function normalizeNews(items) {
  if (!Array.isArray(items)) throw Error('Invalid news response');
  const seen = new Set();
  return items.slice(0, 100).flatMap((item) => {
    const link = safeURL(item?.link, true),
      title = String(item?.title || '')
        .trim()
        .slice(0, 240);
    if (!title || !link || seen.has(link)) return [];
    seen.add(link);
    const date = Date.parse(item.pubDate);
    return [
      {
        id: link,
        title,
        link,
        category: ['Industry', 'Releases'].includes(item.category) ? item.category : 'General',
        snippet: String(item.snippet || item.description || '').slice(0, 280),
        pubDate: Number.isFinite(date) ? new Date(date).toISOString() : '',
        thumbnail: safeURL(item.thumbnail) || placeholder,
        source: new URL(link).hostname.includes('animenewsnetwork')
          ? 'Anime News Network'
          : 'Crunchyroll News',
      },
    ];
  });
}
export function filterNews(items, tab = 'All', query = '') {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  return items.filter(
    (item) =>
      (tab === 'All' || item.category === tab) &&
      words.every((word) =>
        normalize(item.title + ' ' + item.snippet + ' ' + item.source).includes(word),
      ),
  );
}

/** Idempotent per container. The lifecycle keeps the cards and search input stable on refresh. */
export function renderNewsSection(containerElement) {
  if (!containerElement) throw TypeError('News needs a container');
  if (mounts.has(containerElement)) return mounts.get(containerElement);
  const root = document.createElement('section');
  root.className = 'anime-news';
  const titleId = 'anime-news-title-' + ++mountedCount;
  root.setAttribute('aria-labelledby', titleId);
  root.dataset.visibility = document.visibilityState;
  root.dataset.active = 'true';
  const esc = escapeHTML;
  window.ATHTML.renderHTML(
    root,
    `
    <header class="news-hero"><div class="news-hero-copy"><span class="news-kicker">${navIcon('news')} ANIME NEWS</span><h2 id="${titleId}">Historitë që <span>lëvizin botën anime.</span></h2><p>Premiera, industria dhe lajmet e fundit — nga burimet origjinale.</p><span class="news-source-note">Anime News Network · Crunchyroll News</span></div><div class="news-hero-art" aria-hidden="true"><span class="news-orbit"></span><span class="news-orbit news-orbit-inner"></span><span class="news-spark">✦</span><span class="news-art-caption">BEYOND THE SCREEN</span></div></header>
    <div class="news-controls"><div class="news-tabs" role="group" aria-label="Kategoritë e lajmeve">${Object.entries(
      labels,
    )
      .map(
        ([key, label]) =>
          `<button type="button" data-news-tab="${key}" aria-pressed="${key === 'All'}">${label}</button>`,
      )
      .join(
        '',
      )}</div><label class="news-search">${navIcon('explore')}<span class="sr-only">Kërko lajme anime</span><input type="search" maxlength="120" placeholder="Kërko lajme anime…" autocomplete="off"></label></div>
    <div class="news-summary"><span class="news-count" role="status" aria-live="polite"></span><span class="news-freshness"></span></div>
    <div class="news-grid" aria-busy="true"></div><div class="news-state" hidden></div>
    <div class="news-more"><button type="button" data-news-action="more" hidden>Shfaq më shumë <span aria-hidden="true">${down}</span></button></div>`,
  );
  containerElement.replaceChildren(root);
  const grid = root.querySelector('.news-grid'),
    statusBox = root.querySelector('.news-state');
  const search = root.querySelector('input'),
    more = root.querySelector('[data-news-action="more"]');
  const count = root.querySelector('.news-count');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController(),
    nodes = new Map();
  let items = [],
    tab = 'All',
    query = '',
    limit = PAGE_SIZE,
    phase = 'idle',
    active = true,
    request,
    generation = 0,
    searchTimer,
    layoutFrame,
    stale = false;
  const observer =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              entry.target.classList.add('news-reveal');
              entry.target.classList.remove('news-pending');
              observer.unobserve(entry.target);
            }
          },
          { threshold: 0.08 },
        )
      : null;
  function observe(card, index) {
    // Eight bounded delays, up to 315ms, keep a long feed responsive and respect CSP (no inline styles).
    card.classList.add('news-stagger-' + (index % PAGE_SIZE));
    if (!motion.matches && observer && active) {
      card.classList.add('news-pending');
      observer.observe(card);
    }
  }
  function card(item, index) {
    const node = document.createElement('article');
    node.className = 'news-card';
    const date = item.pubDate
      ? new Date(item.pubDate).toLocaleDateString('sq-AL', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'Data nuk është dhënë';
    window.ATHTML.renderHTML(
      node,
      `<div class="news-image-wrap"><img src="${esc(item.thumbnail)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"><span class="news-badge">${esc(labels[item.category] || 'Anime')}</span><span class="news-image-corner" aria-hidden="true">✦</span></div><div class="news-card-body"><div class="news-card-meta"><span>${esc(item.source)}</span><time${item.pubDate ? ` datetime="${esc(item.pubDate)}"` : ''}>${esc(date)}</time></div><h3>${esc(item.title)}</h3><p>${esc(item.snippet || 'Lexo historinë e plotë nga burimi origjinal.')}</p><a class="news-read" href="${esc(item.link)}" target="_blank" rel="noopener noreferrer" aria-label="Lexo lajmin: ${esc(item.title)} (hapet në skedë të re)">Lexo lajmin <span aria-hidden="true">${arrow}</span></a></div>`,
    );
    // DOMPurify removes target attributes; set this constant after sanitizing the trusted article URL.
    node.querySelector('.news-read').target = '_blank';
    observe(node, index);
    return node;
  }
  function message(type) {
    grid.hidden = true;
    statusBox.hidden = false;
    const failure = type === 'error';
    window.ATHTML.renderHTML(
      statusBox,
      `<span class="news-state-mark" aria-hidden="true">${failure ? '☁' : '✦'}</span><h3>${failure ? 'Lajmet po bëjnë një pushim.' : 'Asnjë histori për këtë kërkim.'}</h3><p>${failure ? 'Burimi nuk u arrit. Provo përsëri pas pak.' : 'Provo një fjalë tjetër ose shfaq të gjitha kategoritë.'}</p><button type="button" data-news-action="${failure ? 'retry' : 'clear'}">${failure ? 'Provo përsëri' : 'Pastro filtrat'}</button>`,
    );
  }
  function paint({ animate = false, append = false } = {}) {
    if (phase === 'loading') {
      grid.hidden = false;
      statusBox.hidden = true;
      more.hidden = true;
      count.textContent = 'Po ngarkohen lajmet…';
      grid.setAttribute('aria-busy', 'true');
      window.ATHTML.renderHTML(
        grid,
        Array.from(
          { length: 8 },
          () =>
            '<div class="news-skeleton" aria-hidden="true"><div></div><section><span></span><strong></strong><strong></strong><p></p><p></p><small></small></section></div>',
        ).join(''),
      );
      return;
    }
    grid.setAttribute('aria-busy', 'false');
    const filtered = filterNews(items, tab, query),
      shown = filtered.slice(0, limit);
    count.textContent =
      phase === 'error'
        ? 'Lajmet nuk u ngarkuan.'
        : `${filtered.length} lajme${filtered.length > shown.length ? ' · ' + shown.length + ' të shfaqura' : ''}`;
    root.querySelector('.news-freshness').textContent = stale
      ? 'Nga ruajtja e fundit'
      : phase === 'ready'
        ? 'Nga burimi origjinal'
        : '';
    more.hidden = phase !== 'ready' || filtered.length <= limit;
    if (phase === 'error' || !shown.length) {
      observer?.disconnect();
      message(phase);
      return;
    }
    grid.hidden = false;
    statusBox.hidden = true;
    const wanted = new Set(shown.map((item) => item.id));
    const previous =
      animate && !motion.matches
        ? new Map([...grid.children].map((node) => [node, node.getBoundingClientRect()]))
        : null;
    for (const node of [...grid.children])
      if (!node.dataset.newsId || !wanted.has(node.dataset.newsId)) {
        observer?.unobserve(node);
        node.remove();
      }
    for (const [index, item] of shown.entries()) {
      let node = nodes.get(item.id);
      if (!node) {
        node = card(item, index);
        node.dataset.newsId = item.id;
        nodes.set(item.id, node);
      }
      if (node !== grid.children[index]) grid.insertBefore(node, grid.children[index] || null);
      if (node.classList.contains('news-pending') && active) observer?.observe(node);
    }
    cancelAnimationFrame(layoutFrame);
    if (previous)
      layoutFrame = requestAnimationFrame(() => {
        for (const node of grid.children) {
          const before = previous.get(node);
          if (!before || !node.animate) continue;
          const after = node.getBoundingClientRect();
          const x = before.left - after.left,
            y = before.top - after.top;
          if (x || y)
            node.animate(
              [{ transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0, 0)' }],
              { duration: 260, easing: 'cubic-bezier(.22,.61,.36,1)' },
            );
        }
      });
    if (append) more.classList.add('news-press');
  }
  async function refresh(force = false) {
    if (!active) return;
    request?.abort();
    const version = ++generation;
    if (!force && cached && Date.now() - cached.at < CACHE_MS) {
      items = cached.items;
      stale = cached.stale;
      phase = 'ready';
      paint();
      return;
    }
    request = new AbortController();
    phase = 'loading';
    observer?.disconnect();
    nodes.clear();
    paint();
    try {
      const response = await fetch('/api/news', {
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(22000)]),
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw Error('News unavailable');
      const next = normalizeNews(await response.json());
      if (version !== generation) return;
      items = next;
      stale = response.headers.get('X-News-Stale') === '1';
      cached = { items, stale, at: Date.now() };
      phase = 'ready';
      paint();
    } catch {
      if (version !== generation) return;
      phase = 'error';
      paint();
    }
  }
  root.addEventListener(
    'click',
    (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.dataset.newsTab) {
        tab = button.dataset.newsTab;
        limit = PAGE_SIZE;
        for (const node of root.querySelectorAll('[data-news-tab]'))
          node.setAttribute('aria-pressed', String(node.dataset.newsTab === tab));
        if (phase !== 'loading') paint({ animate: true });
      }
      const action = button.dataset.newsAction;
      if (action === 'more') {
        limit += PAGE_SIZE;
        paint({ append: true });
      }
      if (action === 'retry') void refresh(true);
      if (action === 'clear') {
        query = '';
        tab = 'All';
        limit = PAGE_SIZE;
        search.value = '';
        root.querySelector('[data-news-tab="All"]').click();
        search.focus({ preventScroll: true });
      }
    },
    { signal: events.signal },
  );
  search.addEventListener(
    'input',
    () => {
      query = search.value;
      limit = PAGE_SIZE;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        if (active && phase !== 'loading') paint({ animate: true });
      }, 120);
    },
    { signal: events.signal },
  );
  root.addEventListener(
    'animationend',
    (event) => {
      event.target.classList.remove('news-reveal', 'news-press');
    },
    { signal: events.signal },
  );
  root.addEventListener(
    'load',
    (event) => {
      if (event.target.matches('img'))
        event.target.closest('.news-image-wrap')?.classList.add('news-image-ready');
    },
    { capture: true, signal: events.signal },
  );
  root.addEventListener(
    'error',
    (event) => {
      const image = event.target;
      if (!image.matches('img')) return;
      if (image.getAttribute('src') !== placeholder) image.src = placeholder;
      else image.closest('.news-image-wrap')?.classList.add('news-image-ready');
    },
    { capture: true, signal: events.signal },
  );
  function reduceMotion() {
    if (!motion.matches) return;
    observer?.disconnect();
    for (const node of nodes.values()) {
      node.classList.remove('news-pending');
      node.getAnimations().forEach((animation) => animation.cancel());
    }
  }
  motion.addEventListener('change', reduceMotion, { signal: events.signal });
  document.addEventListener(
    'visibilitychange',
    () => {
      root.dataset.visibility = document.visibilityState;
    },
    { signal: events.signal },
  );
  const controller = {
    refresh,
    setActive(value) {
      if (active === value) return;
      active = value;
      root.dataset.active = String(value);
      if (!active) {
        clearTimeout(searchTimer);
        cancelAnimationFrame(layoutFrame);
        observer?.disconnect();
        request?.abort();
        generation++;
        if (phase === 'loading') phase = 'idle';
      } else if (
        phase === 'idle' ||
        (phase === 'ready' && cached && Date.now() - cached.at >= CACHE_MS)
      )
        void refresh();
      else {
        paint();
        for (const node of nodes.values())
          if (node.classList.contains('news-pending') && node.isConnected) observer?.observe(node);
      }
    },
    destroy() {
      controller.setActive(false);
      events.abort();
      root.remove();
      mounts.delete(containerElement);
    },
  };
  mounts.set(containerElement, controller);
  void refresh();
  return controller;
}
