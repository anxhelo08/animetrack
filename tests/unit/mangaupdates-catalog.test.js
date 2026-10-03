import { it, expect, vi } from 'vitest';
import {
  mangaUpdatesItem,
  searchMangaUpdates,
  mangaUpdatesID,
} from '../../src/modules/mangaupdates-catalog.js';
import { mangaDexItem, searchMangaDex } from '../../src/modules/mangadex-catalog.js';
import { normalizeReadingLibrary } from '../../src/core/reading-model.js';
import { combineCatalogs } from '../../src/modules/reading-catalog.js';
import { createHandler } from '../../api/reading-search.js';
import { createRequestCache } from '../../src/core/request-cache.js';
import live from '../fixtures/mangaupdates-live.json' with { type: 'json' };
for (const [key, total] of [
  ['doom', 101],
  ['player', 246],
  ['tbate', 250],
])
  it(`real ${key} metadata retains the latest known chapter without confusing translation counts or novels`, () => {
    const row = mangaUpdatesItem(live[key]);
    expect(row.totalChapters).toBe(total);
    const saved = normalizeReadingLibrary([{ ...row, chaptersRead: [1], notes: 'Keep' }])[0];
    expect(saved.source).toBe('mangaupdates');
    expect(saved.anilistId).toBe('');
    expect(saved.mangaUpdatesId).toBe(String(live[key].series_id));
    expect(saved.chaptersRead).toEqual([1]);
    expect(saved.notes).toBe('Keep');
  });
it('English original comics are searchable as manga, with confirmed MangaUpdates identity and merged chapter counts', async () => {
  const row = mangaDexItem(live.mdTbate),
    mu = mangaUpdatesItem(live.tbate);
  expect(row.kind).toBe('manga');
  expect(row.mangaUpdatesId).toBe(String(live.tbate.series_id));
  expect(mangaUpdatesID('rwg23en')).toBe(String(live.tbate.series_id));
  expect(combineCatalogs([{ items: [row] }, { items: [mu] }]).items).toMatchObject([
    { mangaDexId: live.mdTbate.id, totalChapters: 250, chapterSource: 'MangaUpdates' },
  ]);
  const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    expect(String(url)).not.toContain('originalLanguage%5B%5D=ja');
    return new Response(JSON.stringify({ data: [live.mdTbate], limit: 30, offset: 0, total: 1 }));
  });
  try {
    expect((await searchMangaDex('TBATE regression', 'manga')).items[0].title).toBe(
      'The Beginning After the End',
    );
  } finally {
    fetcher.mockRestore();
  }
});
it('MangaUpdates broad search keeps comics while excluding similarly named novels and enriches totals', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(
      async (url) =>
        new Response(
          JSON.stringify(
            String(url).endsWith('/search')
              ? {
                  total_hits: 2,
                  results: [
                    { record: { ...live.tbate, status: undefined, latest_chapter: undefined } },
                    {
                      record: {
                        ...live.tbate,
                        series_id: 42,
                        type: 'Novel',
                        title: 'The Beginning After the End (Novel)',
                      },
                    },
                  ],
                }
              : live.tbate,
          ),
        ),
    );
  try {
    const result = await searchMangaUpdates('TBATE fixture', 'manga', 1, AbortSignal.timeout(4500));
    expect(result.items).toMatchObject([{ title: live.tbate.title, totalChapters: 250 }]);
    expect(result.items).toHaveLength(1);
  } finally {
    fetcher.mockRestore();
  }
});
it('chapter details validate fixed identities before spending budget and return the surviving source', async () => {
  const limit = vi.fn(async () => true),
    details = vi.fn(async () => ({ totalChapters: 250, chapterSource: 'MangaUpdates' }));
  const handler = createHandler({ limit, details, read: createRequestCache() });
  const response = () => ({
    setHeader: vi.fn(),
    status(code) {
      this.code = code;
      return this;
    },
    json: vi.fn(),
  });
  let res = response();
  await handler(
    { method: 'GET', url: '/api/reading-search?action=details&mangaDexId=https://evil.test' },
    res,
  );
  expect(res.code).toBe(400);
  expect(limit).not.toHaveBeenCalled();
  res = response();
  await handler(
    { method: 'GET', url: '/api/reading-search?action=details&mangaUpdatesId=60735012287' },
    res,
  );
  expect(res.code).toBe(200);
  expect(res.json).toHaveBeenCalledWith({ totalChapters: 250, chapterSource: 'MangaUpdates' });
});
it('chapter detail endpoint resolves only the verified MangaDex cross-link and survives missing feed metadata', async () => {
  const id = '60735012287';
  const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    url = String(url);
    if (url.includes('/aggregate'))
      return new Response(JSON.stringify({ result: 'ok', volumes: {} }));
    if (url.includes('/feed')) return new Response('{}', { status: 503 });
    if (url.includes('api.mangaupdates.com')) return new Response(JSON.stringify(live.tbate));
    return new Response(JSON.stringify({ data: live.mdTbate }));
  });
  const res = {
    setHeader: vi.fn(),
    status(code) {
      this.code = code;
      return this;
    },
    json: vi.fn(),
  };
  try {
    await createHandler({ limit: async () => true, read: createRequestCache() })(
      { method: 'GET', url: '/api/reading-search?action=details&mangaDexId=' + live.mdTbate.id },
      res,
    );
    expect(res.code).toBe(200);
    expect(res.json.mock.calls[0][0]).toMatchObject({
      totalChapters: 250,
      mangaUpdatesId: id,
      chapterSource: 'MangaUpdates',
    });
  } finally {
    fetcher.mockRestore();
  }
});
