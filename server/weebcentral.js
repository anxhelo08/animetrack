import { parseHTML } from 'linkedom';
import { cleanReadingFilters, matchesReadingFilters } from '../src/core/reading-discovery.js';
import { createRequestCache } from '../src/core/request-cache.js';
import { userAgent } from './http.js';

export const WEEBCENTRAL = 'https://weebcentral.com';
export const seriesID = (value) => /^[0-9A-HJKMNP-TV-Z]{26}$/.test(value || '');
const status = (s) =>
  ({ Ongoing: 'RELEASING', Complete: 'FINISHED', Hiatus: 'HIATUS', Canceled: 'CANCELLED' })[s] ||
  '';
const content = (node) => node?.textContent?.replace(/\s+/g, ' ').trim() || '';
const field = (node, label) =>
  [...node.querySelectorAll('strong')].find((s) => content(s).startsWith(label))?.parentElement;
const value = (node, label) => {
  const block = field(node, label);
  return block
    ? content(block)
        .slice(content(block.querySelector('strong')).length)
        .trim()
    : '';
};
const genres = (text) =>
  text
    .replace(/Sci-fi/gi, 'Sci-Fi')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(', ');
function cover(node, id) {
  const candidate = node.querySelector('source')?.getAttribute('srcset') || '';
  return /^https:\/\/temp\.compsci88\.com\/cover\/(normal|small)\/[0-9A-HJKMNP-TV-Z]{26}\.webp$/.test(
    candidate,
  )
    ? candidate.replace('/small/', '/normal/')
    : `https://temp.compsci88.com/cover/normal/${id}.webp`;
}
function identity(href) {
  try {
    const u = new URL(href, WEEBCENTRAL);
    const id = u.pathname.split('/')[2];
    return u.origin === WEEBCENTRAL && u.pathname.startsWith('/series/') && seriesID(id) ? id : '';
  } catch {
    return '';
  }
}
function row(id, title, type, node) {
  return {
    id: 'reading-wc-' + id,
    source: 'weebcentral',
    sourceId: id,
    weebCentralId: id,
    title: title.slice(0, 180),
    kind: type === 'Manhwa' ? 'manhwa' : 'manga',
    sourceURL: `${WEEBCENTRAL}/series/${id}`,
    cover: cover(node, id),
    communityScore: null,
    totalChapters: 0,
    totalVolumes: 0,
    chapterSource: 'WeebCentral',
  };
}
/** Parse public metadata only. No scripts, accounts, comments or reader images are executed/fetched. */
export function parseSearch(html) {
  const { document } = parseHTML(html);
  const items = [...document.querySelectorAll('article > section > a')].flatMap((a) => {
    const id = identity(a.getAttribute('href'));
    const article = a.parentElement.parentElement;
    const type = value(article, 'Type');
    const title =
      content(article.querySelector('span[data-tip] > a[href*="/series/"]')) ||
      content(a.querySelector('.text-ellipsis'));
    if (!id || !title || !['Manga', 'Manhwa'].includes(type)) return [];
    return [
      {
        ...row(id, title, type, a),
        year: Number(value(article, 'Year')) || null,
        publicationStatus: status(value(article, 'Status')),
        genres: genres(value(article, 'Tag')),
      },
    ];
  });
  if (!items.length && document.querySelector('title')) throw Error('Unexpected provider page');
  return {
    items: [...new Map(items.map((r) => [r.id, r])).values()],
    hasNext: !!document.querySelector('button'),
  };
}
export function parseDetails(html, id) {
  const { document } = parseHTML(html);
  const main = document.querySelector('main');
  const title = content(main?.querySelector('h1'));
  if (!main || !title || !seriesID(id) || !['Manga', 'Manhwa'].includes(value(main, 'Type')))
    throw Error('Missing series metadata');
  const tracker = (host) => {
    const a = [...main.querySelectorAll('a[href]')].find((a) => {
      try {
        const u = new URL(a.getAttribute('href'));
        return u.hostname === host && /^\/manga\/\d+\/?$/.test(u.pathname);
      } catch {
        return false;
      }
    });
    return a ? new URL(a.getAttribute('href')).pathname.split('/')[2] : '';
  };
  return {
    ...row(id, title, value(main, 'Type'), main),
    year: Number(value(main, 'Released')) || null,
    genres: genres(value(main, 'Tags')),
    publicationStatus: status(value(main, 'Status')),
    synopsis: content(field(main, 'Description')?.querySelector('p')).slice(0, 1800),
    anilistId: tracker('anilist.co'),
    malId: tracker('myanimelist.net'),
  };
}
export function parseChapters(html) {
  const { document } = parseHTML(html);
  const anchors = [...document.querySelectorAll('div[x-data] > a[href^="/chapters/"]')];
  if (!anchors.length) throw Error('Missing chapter list');
  const entries = anchors.map((a) => {
    const label = content(a.querySelector('span.grow > span'));
    const match = /^Chapter\s+(\d+(?:\.\d+)?)(?:\s|$)/i.exec(label);
    return {
      chapter: match ? Number(match[1]) : null,
      date: a.querySelector('time')?.getAttribute('datetime'),
      label,
    };
  });
  const chapters = [
    ...new Map(
      entries
        .filter((e) => Number.isInteger(e.chapter) && e.chapter > 0 && e.chapter <= 10000)
        .map((e) => [e.chapter, e]),
    ).values(),
  ];
  if (!chapters.length) throw Error('Unsupported chapter numbering');
  return {
    totalChapters: Math.max(...chapters.map((e) => e.chapter)),
    publishedEntries: entries.length,
    chapterReleases: chapters
      .filter((e) => Number.isFinite(Date.parse(e.date)) && Date.parse(e.date) <= Date.now())
      .sort((a, b) => a.chapter - b.chapter)
      .slice(-300)
      .map(({ chapter, date }) => ({ chapter, date, detected: false })),
  };
}
export function createWeebCentral({
  fetchImpl = fetch,
  clock = Date.now,
  wait = (ms) => new Promise((r) => setTimeout(r, ms)),
} = {}) {
  const cache = createRequestCache({ now: clock, limit: 120 });
  let queue = Promise.resolve(),
    nextAt = 0,
    waiting = 0;
  const html = (path) =>
    cache(
      path,
      async () => {
        if (waiting >= 20) throw Error('Provider busy');
        waiting++;
        const run = queue
          .catch(() => {})
          .then(async () => {
            await wait(Math.max(0, nextAt - clock()));
            nextAt = clock() + 2000;
            const response = await fetchImpl(WEEBCENTRAL + path, {
              redirect: 'error',
              signal: AbortSignal.timeout(12000),
              headers: { Accept: 'text/html', 'User-Agent': userAgent },
            });
            if (!response.ok) {
              await response.body?.cancel();
              throw Error('Provider HTTP ' + response.status);
            }
            if (!response.headers.get('content-type')?.includes('text/html'))
              throw Error('Unexpected provider content');
            const reader = response.body.getReader(),
              chunks = [];
            let size = 0;
            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                size += value.byteLength;
                if (size > 20 * 1024 * 1024) throw Error('Provider response too large');
                chunks.push(value);
              }
            } finally {
              await reader.cancel();
            }
            const bytes = new Uint8Array(size);
            let offset = 0;
            for (const chunk of chunks) {
              bytes.set(chunk, offset);
              offset += chunk.length;
            }
            return new TextDecoder().decode(bytes);
          })
          .finally(() => waiting--);
        queue = run.then(
          () => {},
          () => {},
        );
        return run;
      },
      { ttl: 10 * 60000 },
    );
  const search = async (query, kind, page, raw = {}, sort = '') => {
    const filters = cleanReadingFilters(raw);
    if (
      filters.score ||
      filters.minChapters ||
      filters.maxChapters ||
      [...filters.include, ...filters.exclude].includes('Thriller')
    )
      throw Error('These filters require a catalog with ratings and confirmed counts');
    const p = new URLSearchParams({
      text: query.replace(/[!#:(),-]/g, ' ').trim(),
      sort: sort || (query ? 'Best Match' : 'Popularity'),
      order: 'Descending',
      official: 'Any',
      anime: 'Any',
      adult: 'False',
      limit: '32',
      offset: String((page - 1) * 32),
      display_mode: 'Full Display',
    });
    for (const type of kind === 'all'
      ? ['Manga', 'Manhwa']
      : [kind === 'manhwa' ? 'Manhwa' : 'Manga'])
      p.append('included_type', type);
    for (const g of filters.include) p.append('included_tag', g === 'Sci-Fi' ? 'Sci-fi' : g);
    for (const g of filters.exclude) p.append('excluded_tag', g === 'Sci-Fi' ? 'Sci-fi' : g);
    if (filters.publication)
      p.append(
        'included_status',
        { RELEASING: 'Ongoing', FINISHED: 'Complete', HIATUS: 'Hiatus', CANCELLED: 'Canceled' }[
          filters.publication
        ],
      );
    const result = parseSearch(await html('/search/data?' + p));
    // The provider has no community scores; never invent a rating or a count for filtering.
    if (filters.minChapters || filters.maxChapters) {
      throw Error('Chapter range filters require a confirmed chapter list');
    }
    return {
      ...result,
      provider: 'WeebCentral',
      items: result.items.filter((r) => matchesReadingFilters(r, filters)),
    };
  };
  const metadata = async (id) => {
    if (!seriesID(id)) throw Error('Invalid series identity');
    return parseDetails(await html('/series/' + id), id);
  };
  const details = async (id) => {
    const info = await metadata(id);
    return {
      ...info,
      ...parseChapters(await html('/series/' + id + '/full-chapter-list')),
      checkedAt: new Date(clock()).toISOString(),
    };
  };
  const resolve = async ({ title, kind, anilistId, malId }) => {
    if (!anilistId && !malId) return null;
    const result = await search(title, kind, 1);
    const exact = result.items.filter((r) => r.title.toLowerCase() === title.toLowerCase());
    const candidates = exact.length ? exact : result.items.slice(0, 2);
    if (candidates.length > 2) return null;
    const verified = (await Promise.all(candidates.map((r) => metadata(r.sourceId)))).filter(
      (candidate) =>
        candidate.kind === kind &&
        ((anilistId && candidate.anilistId === anilistId) || (malId && candidate.malId === malId)),
    );
    return verified.length === 1 ? details(verified[0].sourceId) : null;
  };
  return { search, details, resolve };
}
