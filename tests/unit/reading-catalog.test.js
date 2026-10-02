import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('../../src/core/request-cache.js', () => ({ catalogJSON: vi.fn() }));
import { catalogJSON } from '../../src/core/request-cache.js';
import { searchReadingCatalog, refreshReadingCatalog } from '../../src/modules/reading-catalog.js';
beforeEach(() => vi.clearAllMocks());
it('uses MyAnimeList when AniList has no match and retains the provider identity', async () => {
  catalogJSON
    .mockResolvedValueOnce({ data: { Page: { media: [] } } })
    .mockResolvedValueOnce({
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
