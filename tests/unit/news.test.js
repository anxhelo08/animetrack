import { it, expect } from 'vitest';
import { normalizeNews, filterNews } from '../../src/modules/news.js';
const feed = [
  {
    title: 'Studio licensing news',
    link: 'https://www.animenewsnetwork.com/news/1',
    category: 'Industry',
    snippet: 'Artist interview',
    thumbnail: 'javascript:alert(1)',
  },
  {
    title: 'Anime première',
    link: 'https://www.crunchyroll.com/news/2',
    category: 'Releases',
    snippet: 'A new adventure',
    pubDate: '2026-10-02',
  },
];
it('normalizes untrusted JSON without unsafe links, image URLs or duplicate articles', () => {
  const items = normalizeNews([
    ...feed,
    feed[0],
    { title: 'Unsafe', link: 'https://evil.test/story' },
    null,
  ]);
  expect(items).toHaveLength(2);
  expect(items[0].thumbnail).toBe('/news-placeholder.svg');
  expect(items[1].pubDate).toBe('2026-10-02T00:00:00.000Z');
});
it('combines category filters and accent-insensitive word search without mutating the feed', () => {
  const items = normalizeNews(feed);
  const before = structuredClone(items);
  expect(filterNews(items, 'Releases', 'anime premiere')).toEqual([items[1]]);
  expect(filterNews(items, 'Industry', 'premiere')).toEqual([]);
  expect(filterNews(items, 'All', 'artist')).toEqual([items[0]]);
  expect(items).toEqual(before);
});
