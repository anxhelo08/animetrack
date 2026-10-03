vi.mock('../../src/modules/weebcentral-catalog.js', () => ({
  weebCentralCatalog: vi.fn().mockRejectedValue(new Error('Unavailable')),
}));
import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('../../src/core/request-cache.js', () => ({ catalogJSON: vi.fn() }));
import { catalogJSON } from '../../src/core/request-cache.js';
import { searchReadingCatalog, refreshReadingCatalog } from '../../src/modules/reading-catalog.js';
beforeEach(() => vi.clearAllMocks());
it('uses MyAnimeList when AniList has no match and retains the provider identity', async () => {
  catalogJSON.mockResolvedValueOnce({ data: { Page: { media: [] } } }).mockResolvedValueOnce({
    data: [{ mal_id: 42, title: 'Story', type: 'Manhwa', chapters: 100 }],
    pagination: { has_next_page: true },
  });
  const result = await searchReadingCatalog('Story', 'manhwa');
  expect(result.items[0]).toMatchObject({
    id: 'reading-mal-42',
    source: 'jikan',
    kind: 'manhwa',
    totalChapters: 100,
  });
  expect(catalogJSON.mock.calls[1][0]).toContain('type=manhwa');
  expect(result.hasNext).toBe(true);
});
it('does not start fallback work after cancellation', async () => {
  catalogJSON.mockRejectedValueOnce(new DOMException('cancelled', 'AbortError'));
  await expect(searchReadingCatalog('Story', 'all')).rejects.toMatchObject({ name: 'AbortError' });
  expect(catalogJSON).toHaveBeenCalledOnce();
});
it('refreshes counts without overwriting personal progress or pretending an unknown count is known', async () => {
  catalogJSON.mockResolvedValueOnce({
    data: { Media: { chapters: null, volumes: null, status: 'RELEASING' } },
  });
  const result = await refreshReadingCatalog({
    sourceId: '42',
    source: 'anilist',
    chaptersRead: [1, 2],
    notes: 'My note',
  });
  expect(result).toEqual({ totalChapters: 0, totalVolumes: 0, publicationStatus: 'RELEASING' });
});
it('matches chapter metadata only to a unique exact title and original language', async () => {
  const { publishedReadingChapters } = await import('../../src/modules/reading-catalog.js');
  catalogJSON.mockResolvedValueOnce({
    data: [
      {
        id: '12345678-1234-1234-1234-123456789abc',
        attributes: { title: { en: 'A similar Story' }, originalLanguage: 'ko' },
      },
    ],
  });
  expect(await publishedReadingChapters({ title: 'Story', kind: 'manhwa' })).toEqual({});
  expect(catalogJSON).toHaveBeenCalledOnce();
});
it('reads ongoing chapter totals and volume boundaries without counting translation duplicates', async () => {
  const { publishedReadingChapters } = await import('../../src/modules/reading-catalog.js');
  catalogJSON
    .mockResolvedValueOnce({
      data: [
        {
          id: '12345678-1234-1234-1234-123456789abc',
          attributes: { title: { en: 'Story' }, originalLanguage: 'ko' },
        },
      ],
    })
    .mockResolvedValueOnce({
      result: 'ok',
      volumes: {
        1: { volume: '1', chapters: { 1: { chapter: '1' }, 2: { chapter: '2' } } },
        2: { volume: '2', chapters: { 3: { chapter: '3' }, special: { chapter: '3.5' } } },
      },
    })
    .mockResolvedValueOnce({
      data: [
        { attributes: { chapter: '3', publishAt: '2026-09-29T12:00:00Z' } },
        { attributes: { chapter: '4', publishAt: '2099-01-01T00:00:00Z' } },
      ],
    });
  expect(await publishedReadingChapters({ title: 'Story', kind: 'manhwa' })).toMatchObject({
    totalChapters: 3,
    chapterSource: 'MangaDex',
    volumeRanges: [
      { volume: 1, start: 1, end: 2 },
      { volume: 2, start: 3, end: 3 },
    ],
    chapterReleases: [{ chapter: 3, date: '2026-09-29T12:00:00Z', detected: false }],
  });
});
