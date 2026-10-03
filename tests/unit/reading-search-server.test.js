import { it, expect, vi } from 'vitest';
import { createHandler } from '../../api/reading-search.js';
import { createRequestCache } from '../../src/core/request-cache.js';
import { mangaDexItem } from '../../src/modules/mangadex-catalog.js';
import { combineCatalogs } from '../../src/modules/reading-catalog.js';
import { normalizeReadingLibrary } from '../../src/core/reading-model.js';
import fixtures from '../fixtures/reading-search-live.json' with { type: 'json' };
const response = () => ({
  setHeader: vi.fn(),
  json: vi.fn(),
  status: vi.fn(function (code) {
    this.code = code;
    return this;
  }),
});
const id = '773c2211-750b-4fff-bd64-c914986e4637';
const manga = {
  id,
  attributes: {
    title: { en: 'Doom Breaker' },
    altTitles: [{ en: 'Reincarnation of the Suicidal Battle God' }],
    originalLanguage: 'ko',
    links: { al: '136220', mal: '147172' },
    status: 'ongoing',
  },
};
it('MangaDex titles carry verified tracker IDs and aliases without duplicate cards', () => {
  const item = mangaDexItem(manga);
  const result = combineCatalogs([
    {
      items: [
        {
          id: item.id,
          title: item.title,
          source: 'anilist',
          sourceId: '136220',
          anilistId: '136220',
        },
      ],
    },
    { items: [item] },
  ]);
  expect(result.items).toHaveLength(1);
  expect(result.items[0]).toMatchObject({
    mangaDexId: id,
    malId: '147172',
    aliases: ['Reincarnation of the Suicidal Battle God'],
  });
  const saved = normalizeReadingLibrary([
    { ...result.items[0], kind: 'manhwa', chaptersRead: [1, 2], notes: 'Personal' },
  ])[0];
  expect(saved).toMatchObject({
    mangaDexId: id,
    sourceId: '136220',
    chaptersRead: [1, 2],
    notes: 'Personal',
  });
});
it('MangaDex-only UUIDs survive persistence without inventing a tracker ID', () => {
  const item = mangaDexItem({ ...manga, attributes: { ...manga.attributes, links: {} } });
  expect(normalizeReadingLibrary([item])[0]).toMatchObject({
    source: 'mangadex',
    sourceId: id,
    mangaDexId: id,
    anilistId: '',
    malId: '',
  });
});
it('server search retains a working catalog, shares cached results and rejects arbitrary URLs', async () => {
  const providers = [
    vi.fn(async () => {
      throw Error('Offline');
    }),
    vi.fn(async () => ({ provider: 'MangaDex', items: [mangaDexItem(manga)], hasNext: false })),
  ];
  const limit = vi.fn(async () => true),
    handler = createHandler({ providers, limit, read: createRequestCache() });
  for (let i = 0; i < 2; i++) {
    const res = response();
    await handler({ method: 'GET', url: '/api/reading-search?q=Doom%20Breaker&kind=manhwa' }, res);
    expect(res.code).toBe(200);
    expect(res.json.mock.calls[0][0]).toMatchObject({
      partial: true,
      items: [{ title: 'Doom Breaker' }],
    });
  }
  expect(providers[1]).toHaveBeenCalledOnce();
  const res = response();
  await handler({ method: 'GET', url: '/api/reading-search?kind=https://evil.example' }, res);
  expect(res.code).toBe(400);
  expect(limit).toHaveBeenCalledTimes(2);
});
it('a slow server provider cannot hold a healthy result beyond the 4.5-second deadline', async () => {
  vi.useFakeTimers();
  try {
    // AbortSignal.timeout uses native time; stub just this deadline for deterministic testing.
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), ms);
      return controller.signal;
    });
    const providers = [
      async (_q, _k, _p, signal) =>
        new Promise((_ok, fail) => signal.addEventListener('abort', () => fail(Error('Timeout')))),
      async () => ({ provider: 'MangaDex', items: [mangaDexItem(manga)] }),
    ];
    const res = response(),
      work = createHandler({ providers, limit: async () => true, read: createRequestCache() })(
        { method: 'GET', url: '/api/reading-search?q=Doom' },
        res,
      );
    await vi.advanceTimersByTimeAsync(4500);
    await work;
    expect(res.code).toBe(200);
    expect(res.json.mock.calls[0][0].items[0].title).toBe('Doom Breaker');
    timeout.mockRestore();
  } finally {
    vi.useRealTimers();
    vi.restoreAllMocks();
  }
});
for (const key of ['doom', 'player'])
  it(`the live ${key} catalog shapes produce one correctly linked searchable title`, async () => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(
        async (url) =>
          new Response(
            JSON.stringify(
              String(url).includes('graphql.anilist.co')
                ? {
                    data: {
                      Page: { media: [fixtures[key].anilist], pageInfo: { hasNextPage: false } },
                    },
                  }
                : { data: [fixtures[key].mangadex], offset: 0, limit: 30, total: 1 },
            ),
            { headers: { 'Content-Type': 'application/json' } },
          ),
      );
    try {
      const res = response();
      await createHandler({ limit: async () => true, read: createRequestCache() })(
        {
          method: 'GET',
          url:
            '/api/reading-search?kind=manhwa&q=' +
            encodeURIComponent(fixtures[key].anilist.title.english),
        },
        res,
      );
      expect(res.code).toBe(200);
      const result = res.json.mock.calls[0][0];
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        title: fixtures[key].anilist.title.english,
        anilistId: String(fixtures[key].anilist.id),
        mangaDexId: fixtures[key].mangadex.id,
      });
      expect(result.provider).toContain('MangaDex');
    } finally {
      fetcher.mockRestore();
    }
  });
