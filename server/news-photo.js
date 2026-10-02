import { userAgent } from './http.js';

const articleHosts = new Set([
  'animenewsnetwork.com',
  'www.animenewsnetwork.com',
  'crunchyroll.com',
  'www.crunchyroll.com',
]);
const imageDomains = ['animenewsnetwork.com', 'crunchyroll.com', 'storyblok.com'];
const successTTL = 86400000;
const failureTTL = 60000;
const maxCache = 512;

export function newsArticleURL(value) {
  if (typeof value !== 'string' || value.length > 2048) return '';
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      !articleHosts.has(url.hostname) ||
      !url.pathname.startsWith('/news/') ||
      url.pathname.endsWith('/rss.xml')
    )
      return '';
    url.hash = '';
    return url.href;
  } catch {
    return '';
  }
}

export function newsImageEndpoint(article) {
  const url = newsArticleURL(article);
  return url ? '/api/news-image?article=' + encodeURIComponent(url) : '';
}

function decode(value) {
  return String(value || '').replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, (entity) => {
    const known = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' };
    if (known[entity.toLowerCase()]) return known[entity.toLowerCase()];
    const hex = /^&#x/i.test(entity);
    const point = Number.parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '';
  });
}

function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([^\s=<>/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))
    result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4]);
  return result;
}

function imageURL(value, base) {
  if (typeof value !== 'string' || value.length > 4096 || !value.trim()) return '';
  try {
    const url = new URL(value, base);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      !imageDomains.some(
        (domain) => url.hostname === domain || url.hostname.endsWith('.' + domain),
      ) ||
      /(?:\.svg(?:$|\?)|favicon|sprite|placeholder|site[-_]?logo|(?:^|\/)logo(?:[._/-]|$)|(?:^|[._/-])default(?:[._/-]|$))/i.test(
        url.pathname,
      )
    )
      return '';
    return url.href;
  } catch {
    return '';
  }
}

const tags = (html, name) =>
  html.match(new RegExp(`<${name}\\b(?:[^>"']|"[^"]*"|'[^']*')*>`, 'gi')) || [];
const filename = (url) => (url ? new URL(url).pathname.split('/').at(-1) : '');

function articleBody(html) {
  const start = /<article\b[^>]*>|<div\b[^>]*class\s*=\s*["'][^"']*\bmeat\b[^"']*["'][^>]*>/i.exec(
    html,
  );
  let body = start ? html.slice(start.index, start.index + 200000) : '';
  if (/^<article\b/i.test(body)) return body.split(/<\/article\s*>/i)[0];
  let depth = 0;
  for (const match of body.matchAll(/<\/?div\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (!depth) return body.slice(0, match.index + match[0].length);
  }
  return body;
}

// Read publisher metadata only; no remote scripts are run and image URLs are never guessed/upscaled.
export function parseNewsPhoto(html, article) {
  const clean = String(html)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  const candidates = [];
  let currentOG = null;
  for (const tag of tags(clean, 'meta')) {
    const attr = attributes(tag);
    const name = (attr.property || attr.name || '').toLowerCase();
    const rank = ['og:image:secure_url', 'og:image', 'og:image:url'].includes(name)
      ? 1
      : ['twitter:image', 'twitter:image:src'].includes(name)
        ? 2
        : null;
    const url = imageURL(attr.content, article);
    if (rank !== null && url) {
      const candidate = { url, rank, width: 0, secure: name === 'og:image:secure_url' };
      candidates.push(candidate);
      if (rank === 1) currentOG = candidate;
    } else if (name === 'og:image:width' && currentOG) {
      const width = Number(attr.content);
      if (width > 0 && width < 20000) currentOG.width = width;
    }
  }
  for (const tag of tags(clean, 'link')) {
    const attr = attributes(tag);
    if ((attr.rel || '').toLowerCase() === 'image_src') {
      const url = imageURL(attr.href, article);
      if (url) candidates.push({ url, rank: 2 });
    }
  }
  const byQuality = (a, b) =>
    a.rank - b.rank || (b.width || 0) - (a.width || 0) || Number(b.secure) - Number(a.secure);
  // Structured NewsArticle image metadata is another publisher-provided source, not executable HTML.
  if (!candidates.length) {
    for (const match of String(html).matchAll(
      /<script\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/script>/gi,
    )) {
      if (
        attributes(match[1]).type?.toLowerCase() !== 'application/ld+json' ||
        match[2].length > 100000
      )
        continue;
      try {
        const nodes = [JSON.parse(match[2])];
        for (let index = 0; index < nodes.length && index < 40; index++) {
          const node = nodes[index];
          if (Array.isArray(node)) nodes.push(...node.slice(0, 40));
          else if (node && typeof node === 'object') {
            if (Array.isArray(node['@graph'])) nodes.push(...node['@graph'].slice(0, 40));
            const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
            if (!types.some((type) => ['NewsArticle', 'Article', 'BlogPosting'].includes(type)))
              continue;
            for (const photo of Array.isArray(node.image) ? node.image : [node.image]) {
              const url = imageURL(
                typeof photo === 'string' ? photo : photo?.contentUrl || photo?.url,
                article,
              );
              if (url) candidates.push({ url, rank: 2, width: Number(photo?.width) || 0 });
            }
          }
        }
      } catch {
        // Invalid structured metadata is optional; continue to a genuine article-body image.
      }
    }
  }
  const cover = candidates.sort(byQuality)[0]?.url;
  const body = articleBody(clean);
  // A publisher often links its cropped social image to the full original inside the article.
  // Match the exact cover filename across the page: a preceding widget may use the first <article>.
  // Prefer a supplied full original, then a larger supplied srcset; never synthesize a source URL.
  if (cover) {
    const sameCover = (url) => url && filename(url) === filename(cover);
    const original = (url) => sameCover(url) && !/\/thumbnails\//i.test(new URL(url).pathname);
    for (const match of clean.matchAll(
      /<a\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]{0,10000}?)<\/a>/gi,
    )) {
      if (!/<img\b/i.test(match[2])) continue;
      const href = imageURL(attributes(match[1]).href, article);
      if (original(href)) candidates.push({ url: href, rank: -2 });
    }
    for (const tag of tags(clean, 'img')) {
      const attr = attributes(tag);
      for (const supplied of [attr['data-src'], attr.src]) {
        const url = imageURL(supplied, article);
        if (original(url)) candidates.push({ url, rank: -2, width: Number(attr.width) || 0 });
      }
      for (const part of String(attr.srcset || attr['data-srcset'] || '').split(',')) {
        const match = /^\s*(\S+)\s+(\d+)w\s*$/.exec(part);
        const url = match && imageURL(match[1], article);
        if (sameCover(url) && Number(match[2]) >= 800)
          candidates.push({ url, rank: -1, width: Number(match[2]) });
      }
    }
  }
  // If social metadata is absent, use only a genuine image in the publisher's article body.
  // This avoids selecting a navigation logo, advert, or an unrelated recommended story.
  if (!candidates.length) {
    for (const tag of tags(body, 'img')) {
      const attr = attributes(tag);
      if ((attr.width && Number(attr.width) < 300) || (attr.height && Number(attr.height) < 180))
        continue;
      const url = imageURL(attr['data-src'] || attr.src, article);
      if (url) return url;
    }
  }
  return candidates.sort(byQuality)[0]?.url || '';
}

async function articleHTML(article, fetchImpl) {
  const signal = AbortSignal.timeout(6000);
  const publisher = new URL(article).hostname.replace(/^www\./, '');
  let target = article;
  for (let hop = 0; hop <= 2; hop++) {
    const response = await fetchImpl(target, {
      headers: { Accept: 'text/html', 'User-Agent': userAgent },
      redirect: 'manual',
      signal,
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      await response.body?.cancel().catch(() => {});
      const next = location && newsArticleURL(new URL(location, target).href);
      if (!next || hop === 2 || new URL(next).hostname.replace(/^www\./, '') !== publisher)
        throw Error('Unsafe article redirect');
      target = next;
      continue;
    }
    if (
      !response.ok ||
      !/text\/html|application\/xhtml\+xml/i.test(response.headers.get('content-type') || '')
    ) {
      await response.body?.cancel().catch(() => {});
      throw Error('Article unavailable');
    }
    const maxBytes = 1000000;
    if (Number(response.headers.get('content-length')) > maxBytes) {
      await response.body?.cancel().catch(() => {});
      throw Error('Article too large');
    }
    const reader = response.body?.getReader();
    if (!reader) throw Error('Empty article');
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) throw Error('Article too large');
        chunks.push(value);
      }
    } catch (error) {
      await reader.cancel().catch(() => {});
      throw error;
    }
    return { html: Buffer.concat(chunks).toString('utf8'), article: target };
  }
  throw Error('Unsafe article redirect');
}

export function createNewsPhotoResolver({ fetchImpl = fetch, clock = Date.now } = {}) {
  const cache = new Map();
  const pending = new Map();
  let active = 0;
  const queue = [];
  const acquire = () => {
    if (active < 8) {
      active++;
      return Promise.resolve(true);
    }
    if (queue.length >= 64) return Promise.resolve(false);
    return new Promise((resolve) => {
      const entry = {
        resolve,
        timer: setTimeout(() => {
          const index = queue.indexOf(entry);
          if (index >= 0) queue.splice(index, 1);
          resolve(false);
        }, 10000),
      };
      queue.push(entry);
    });
  };
  const release = () => {
    const entry = queue.shift();
    if (entry) {
      clearTimeout(entry.timer);
      entry.resolve(true);
    } else active--;
  };
  return async (article) => {
    const target = newsArticleURL(article);
    if (!target) return { image: '', status: 'invalid', ttl: 0 };
    const cached = cache.get(target);
    if (cached && cached.until > clock()) return cached.value;
    if (pending.has(target)) return pending.get(target);
    // Keep ordinary hero/card bursts queued with at most eight publisher fetches at once.
    // Queue waits cap at ten seconds, then the entire redirect/read operation caps at six seconds.
    const task = (async () => {
      if (!(await acquire())) return { image: '', status: 'busy', ttl: 10 };
      let image = '';
      try {
        const page = await articleHTML(target, fetchImpl);
        image = parseNewsPhoto(page.html, page.article);
      } catch {
        // A temporary publisher denial should not hide the article or poison its photo for a day.
      } finally {
        release();
      }
      const value = { image, status: image ? 'resolved' : 'unavailable', ttl: image ? 86400 : 60 };
      for (const [key, entry] of cache) if (entry.until <= clock()) cache.delete(key);
      if (cache.size >= maxCache) cache.delete(cache.keys().next().value);
      cache.set(target, { value, until: clock() + (image ? successTTL : failureTTL) });
      return value;
    })().finally(() => {
      pending.delete(target);
    });
    pending.set(target, task);
    return task;
  };
}
