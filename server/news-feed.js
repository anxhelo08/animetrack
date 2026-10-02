import { createHash } from 'node:crypto';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

export const NEWS_FEEDS = [
  { url: 'https://www.animenewsnetwork.com/news/rss.xml', source: 'Anime News Network' },
  { url: 'https://www.crunchyroll.com/news/rss', source: 'Crunchyroll News' },
];
export const NEWS_PLACEHOLDER = '/news-placeholder.svg';
const publisherHosts = new Set(
  NEWS_FEEDS.flatMap(({ url }) => {
    const host = new URL(url).hostname;
    return [host, host.replace(/^www\./, '')];
  }),
);
const list = (value) => (value == null ? [] : Array.isArray(value) ? value : [value]);
const value = (node) => (typeof node === 'object' && node ? node['#text'] || '' : node || '');
const clean = (text, max) =>
  String(value(text))
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
function url(value, base, publisher = false) {
  if (!String(value || '').trim()) return '';
  try {
    const parsed = new URL(String(value || ''), base);
    if (
      parsed.protocol !== 'https:' ||
      parsed.username ||
      parsed.password ||
      (publisher && !publisherHosts.has(parsed.hostname))
    )
      return '';
    return parsed.href;
  } catch {
    return '';
  }
}
function category(item, title) {
  const categories = list(item.category)
    .map((x) => clean(x, 80))
    .join(' ');
  // Publisher labels take precedence; generic RSS labels use conservative headline grouping.
  if (/industry|business/i.test(categories)) return 'Industry';
  if (/release|premiere/i.test(categories)) return 'Releases';
  if (
    /\b(industry|merger|acquisition|financial|licens(?:e|es|ing)|publisher|animators?)\b/i.test(
      title,
    )
  )
    return 'Industry';
  if (
    /\b(premiere|debut|trailer|teaser|streams?|streaming|release|launch|casts?|adaptation|season)\b/i.test(
      title,
    )
  )
    return 'Releases';
  return 'General';
}
export function parseNewsFeed(xml, feed = NEWS_FEEDS[0]) {
  if (
    typeof xml !== 'string' ||
    /<!DOCTYPE|<!ENTITY/i.test(xml) ||
    XMLValidator.validate(xml) !== true
  )
    throw Error('Invalid news XML');
  const parsed = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    htmlEntities: true,
  }).parse(xml);
  if (!parsed.rss?.channel || !parsed.rss.channel.item) throw Error('RSS news unavailable');
  const seen = new Set();
  const articles = [];
  for (const item of list(parsed.rss.channel.item).slice(0, 100)) {
    const title = clean(item.title, 240);
    const link = url(value(item.link), feed.url, true);
    if (!title || !link || seen.has(link)) continue;
    seen.add(link);
    const description = String(value(item.description || item['content:encoded']));
    const media = [
      ...list(item['media:thumbnail']),
      ...list(item['media:content']),
      ...list(item.enclosure),
    ].find((node) => node?.['@_url'] && (!node['@_type'] || /^image\//i.test(node['@_type'])));
    const htmlImage = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i.exec(description)?.[1];
    const image = url(media?.['@_url'] || htmlImage, feed.url);
    const date = Date.parse(value(item.pubDate));
    const snippet = clean(description, 280);
    articles.push({
      id: createHash('sha256').update(link).digest('hex').slice(0, 20),
      title,
      link,
      pubDate: Number.isFinite(date) ? new Date(date).toISOString() : '',
      category: category(item, title),
      snippet,
      description: snippet,
      thumbnail: image || NEWS_PLACEHOLDER,
      source: feed.source,
    });
  }
  if (!articles.length) throw Error('No usable news articles');
  return articles.sort((a, b) => (Date.parse(b.pubDate) || 0) - (Date.parse(a.pubDate) || 0));
}
export async function readNewsXML(response, maxBytes = 1500000) {
  if (Number(response.headers.get('content-length')) > maxBytes) throw Error('Feed too large');
  const reader = response.body?.getReader();
  if (!reader) throw Error('Empty feed');
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw Error('Feed too large');
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function fetchNewsFeed(feed, fetchImpl, headers) {
  const original = new URL(feed.url);
  const publisher = original.hostname.replace(/^www\./, '');
  const signal = AbortSignal.timeout(8000);
  let target = original.href;
  for (let hop = 0; hop <= 2; hop++) {
    const response = await fetchImpl(target, { headers, redirect: 'manual', signal });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get('location');
    await response.body?.cancel().catch(() => {});
    if (!location || hop === 2) throw Error('Unsafe feed redirect');
    const next = new URL(location, target);
    // RSS endpoints may move. Follow only HTTPS on the same publisher, within the original timeout.
    if (
      next.protocol !== 'https:' ||
      next.username ||
      next.password ||
      next.port ||
      next.hostname.replace(/^www\./, '') !== publisher
    )
      throw Error('Unsafe feed redirect');
    target = next.href;
  }
  throw Error('Unsafe feed redirect');
}
