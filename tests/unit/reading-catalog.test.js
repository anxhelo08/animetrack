vi.mock('../../src/modules/weebcentral-catalog.js', () => ({
  weebCentralCatalog: vi.fn().mockRejectedValue(new Error('Unavailable')),
}));
import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('../../src/core/request-cache.js', async (original) => ({
  ...(await original()),
  catalogJSON: vi.fn(),
}));
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
it('does not start requests after caller cancellation', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(searchReadingCatalog('Story', 'all', 1, controller.signal)).rejects.toMatchObject({
    name: 'AbortError',
  });
  expect(catalogJSON).not.toHaveBeenCalled();
});
it('MangaDex-only titles refresh real chapter metadata without changing personal data or inventing IDs', async () => {
  const id = '773c2211-750b-4fff-bd64-c914986e4637';
  const row = {
    source: 'mangadex',
    sourceId: id,
    mangaDexId: id,
    title: 'Story',
    kind: 'manhwa',
    chaptersRead: [1],
    notes: 'My notes',
  };
  const before = structuredClone(row);
  catalogJSON.mockImplementation(async (url) =>
    url.endsWith('/aggregate')
      ? {
          result: 'ok',
          volumes: { 1: { volume: '1', chapters: { 1: { chapter: '1' }, 2: { chapter: '2' } } } },
        }
      : url.includes('/feed?')
        ? { data: [{ attributes: { chapter: '2', publishAt: '2026-09-29T12:00:00Z' } }] }
        : {
            data: {
              id,
              attributes: { status: 'ongoing', title: { en: 'Story' }, originalLanguage: 'ko' },
            },
          },
  );
  const result = await refreshReadingCatalog(row);
  expect(result).toMatchObject({
    totalChapters: 2,
    mangaDexId: id,
    chapterSource: 'MangaDex',
    publicationStatus: 'RELEASING',
  });
  expect(row).toEqual(before);
  expect(catalogJSON.mock.calls.every(([url]) => url.startsWith('https://api.mangadex.org/'))).toBe(
    true,
  );
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

it('an empty preferred catalog does not hide named matches from the other catalogs', async () => {
  const { weebCentralCatalog } = await import('../../src/modules/weebcentral-catalog.js');
  weebCentralCatalog.mockResolvedValueOnce({ items: [], provider: 'WeebCentral', hasNext: false });
  catalogJSON.mockImplementation(async (url) =>
    url.includes('anilist')
      ? {
          data: {
            Page: {
              media: [
                {
                  id: 90,
                  idMal: 70,
                  type: 'MANGA',
                  countryOfOrigin: 'KR',
                  title: { english: 'Omniscient Reader' },
                },
              ],
              pageInfo: { hasNextPage: false },
            },
          },
        }
      : {
          data: [
            { mal_id: 70, title: 'Omniscient Reader', type: 'Manhwa' },
            { mal_id: 71, title: 'Another Reader', type: 'Manhwa' },
          ],
          pagination: { has_next_page: true },
        },
  );
  const result = await searchReadingCatalog('Reader', 'manhwa');
  expect(result.items.map((r) => r.title)).toEqual(['Omniscient Reader', 'Another Reader']);
  expect(result.hasNext).toBe(true);
  expect(result.provider).toContain('AniList');
});
it('publishes fast matches while the preferred catalog is still pending and preserves them on failure', async () => {
  const { weebCentralCatalog } = await import('../../src/modules/weebcentral-catalog.js');
  let reject;
  weebCentralCatalog.mockImplementationOnce(
    () =>
      new Promise((_, fail) => {
        reject = fail;
      }),
  );
  catalogJSON.mockImplementation(async (url) =>
    url.includes('anilist')
      ? { data: { Page: { media: [{ id: 22, type: 'MANGA', title: { english: 'Fast Match' } }] } } }
      : { data: [], pagination: {} },
  );
  const onUpdate = vi.fn(),
    pending = searchReadingCatalog('Match', 'all', 1, undefined, {}, { onUpdate });
  await vi.waitFor(() => expect(onUpdate).toHaveBeenCalled());
  expect(onUpdate.mock.calls.at(-1)[0].items[0].title).toBe('Fast Match');
  reject(Error('Provider HTTP 403'));
  expect((await pending).items[0].title).toBe('Fast Match');
});
it('cross-provider identities, rather than similar titles, control deduplication', async () => {
  const { weebCentralCatalog } = await import('../../src/modules/weebcentral-catalog.js');
  weebCentralCatalog.mockResolvedValueOnce({
    items: [{ source: 'weebcentral', sourceId: 'wc', anilistId: '22', title: 'Story' }],
    provider: 'WeebCentral',
  });
  catalogJSON.mockImplementation(async (url) =>
    url.includes('anilist')
      ? {
          data: {
            Page: {
              media: [
                { id: 22, type: 'MANGA', title: { english: 'Story' } },
                { id: 23, type: 'MANGA', title: { english: 'Story (Volume)' } },
              ],
            },
          },
        }
      : { data: [], pagination: {} },
  );
  expect((await searchReadingCatalog('Story', 'all')).items).toHaveLength(2);
});

it('a blocked WeebCentral chapter check falls back only through confirmed tracker IDs', async () => {
  const { weebCentralCatalog } = await import('../../src/modules/weebcentral-catalog.js');
  const row = {
    source: 'weebcentral',
    sourceId: '01J76XYCPSY3C4BNPBRY8JMCBE',
    weebCentralId: '01J76XYCPSY3C4BNPBRY8JMCBE',
    anilistId: '105398',
    title: 'Solo Leveling',
    totalChapters: 200,
    chaptersRead: [1, 2],
    notes: 'Private',
  };
  const before = structuredClone(row);
  catalogJSON.mockResolvedValueOnce({
    data: { Media: { chapters: 200, volumes: 14, status: 'FINISHED' } },
  });
  expect(await refreshReadingCatalog(row)).toMatchObject({
    totalChapters: 200,
    publicationStatus: 'FINISHED',
  });
  expect(JSON.parse(catalogJSON.mock.calls[0][1].body).variables.id).toBe(105398);
  expect(weebCentralCatalog).toHaveBeenCalledTimes(1);
  expect(row).toEqual(before);
});

it('keeps usable matches and pagination when the shared deadline expires', async () => {
  const { weebCentralCatalog } = await import('../../src/modules/weebcentral-catalog.js');
  weebCentralCatalog.mockImplementationOnce(
    (_action, _params, signal) =>
      new Promise((_, reject) =>
        signal.addEventListener('abort', () => reject(signal.reason), { once: true }),
      ),
  );
  catalogJSON.mockImplementation(async (url) =>
    url.includes('anilist')
      ? {
          data: {
            Page: {
              media: [{ id: 22, type: 'MANGA', title: { english: 'Fast Match' } }],
              pageInfo: { hasNextPage: true },
            },
          },
        }
      : { data: [], pagination: {} },
  );
  const result = await searchReadingCatalog('Match', 'all', 1, undefined, {}, { timeoutMs: 20 });
  expect(result.items[0].title).toBe('Fast Match');
  expect(result.hasNext).toBe(true);
  expect(result.partial).toBe(true);
});
it('caller cancellation still rejects after a provider has returned matches', async () => {
  const { weebCentralCatalog } = await import('../../src/modules/weebcentral-catalog.js');
  weebCentralCatalog.mockImplementationOnce(
    (_action, _params, signal) =>
      new Promise((_, reject) =>
        signal.addEventListener('abort', () => reject(signal.reason), { once: true }),
      ),
  );
  catalogJSON.mockImplementation(async (url) =>
    url.includes('anilist')
      ? { data: { Page: { media: [{ id: 22, type: 'MANGA', title: { english: 'Fast Match' } }] } } }
      : { data: [], pagination: {} },
  );
  const controller = new AbortController();
  const pending = searchReadingCatalog(
    'Match',
    'all',
    1,
    controller.signal,
    {},
    { onUpdate: () => controller.abort() },
  );
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
});
