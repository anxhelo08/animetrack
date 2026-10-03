import { readFileSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';
import {
  parseSearch,
  parseDetails,
  parseChapters,
  createWeebCentral,
} from '../../server/weebcentral.js';
import { createHandler } from '../../api/weebcentral.js';
import { normalizeReadingLibrary, applyReadingUpdate } from '../../src/core/reading-model.js';
const fixture = (name) =>
  readFileSync(new URL('../fixtures/weebcentral/' + name + '.html', import.meta.url), 'utf8');
const id = '01J76XYCPSY3C4BNPBRY8JMCBE';
describe('WeebCentral public metadata (real provider fixtures)', () => {
  it('keeps the original, volume edition and sequel separate', () => {
    const result = parseSearch(fixture('search'));
    expect(result.items.map((r) => r.title)).toEqual([
      'Solo Leveling',
      'Solo Leveling (Volume)',
      'Solo Leveling: Ragnarok',
    ]);
    expect(new Set(result.items.map((r) => r.sourceId)).size).toBe(3);
    expect(result.items[0]).toMatchObject({
      source: 'weebcentral',
      kind: 'manhwa',
      year: 2018,
      communityScore: null,
    });
  });
  it('reads tracker identities and actual chapter numbers without inventing a chapter from a prologue', () => {
    expect(parseDetails(fixture('details'), id)).toMatchObject({
      anilistId: '105398',
      publicationStatus: 'FINISHED',
    });
    const chapters = parseChapters(fixture('chapters'));
    expect(chapters.totalChapters).toBe(200);
    expect(chapters.publishedEntries).toBe(201);
    expect(chapters.chapterReleases).toHaveLength(200);
    expect(chapters.chapterReleases.every((r) => r.detected === false)).toBe(true);
  });
  it('preserves personal data and a nonnumeric provider ID across synchronization', () => {
    const row = normalizeReadingLibrary([
      {
        id: 'reading-wc-' + id,
        title: 'Solo Leveling',
        source: 'weebcentral',
        sourceId: id,
        totalChapters: 198,
        chaptersRead: [1, 2],
        notes: 'My note',
        favorite: true,
        status: 'reading',
      },
    ])[0];
    applyReadingUpdate(row, {
      ...parseDetails(fixture('details'), id),
      ...parseChapters(fixture('chapters')),
    });
    const saved = normalizeReadingLibrary([row])[0];
    expect(saved).toMatchObject({
      sourceId: id,
      weebCentralId: id,
      anilistId: '105398',
      chapterSource: 'WeebCentral',
      totalChapters: 200,
      publishedEntries: 201,
      chaptersRead: [1, 2],
      notes: 'My note',
      favorite: true,
    });
  });
  it('shares cached requests, sends fixed metadata URLs, and verifies cross-provider identity', async () => {
    const fetchImpl = vi.fn(
      async (url) =>
        new Response(
          fixture(
            url.includes('search/data')
              ? 'search'
              : url.endsWith('full-chapter-list')
                ? 'chapters'
                : 'details',
          ),
          { headers: { 'content-type': 'text/html' } },
        ),
    );
    const provider = createWeebCentral({
      fetchImpl,
      clock: () => 1791032400000,
      wait: async () => {},
    });
    const [a, b] = await Promise.all([provider.details(id), provider.details(id)]);
    expect(a).toEqual(b);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(
      await provider.resolve({ title: 'Solo Leveling', kind: 'manhwa', anilistId: '105398' }),
    ).toMatchObject({ weebCentralId: id });
    expect(
      await provider.resolve({ title: 'Solo Leveling', kind: 'manhwa', anilistId: '42' }),
    ).toBeNull();
    expect(
      fetchImpl.mock.calls.every(
        ([url, opt]) => url.startsWith('https://weebcentral.com/') && opt.redirect === 'error',
      ),
    ).toBe(true);
  });
  it('rejects challenges and unfamiliar chapter numbering instead of reporting zero', () => {
    expect(() => parseSearch('<html><title>Just a moment</title></html>')).toThrow();
    expect(() => parseChapters('<html>Blocked</html>')).toThrow();
  });
  it('rejects arbitrary URLs and identities before spending proxy budget', async () => {
    const limit = vi.fn(async () => true),
      provider = { details: vi.fn() },
      handler = createHandler({ limit, provider });
    const res = {
      setHeader: vi.fn(),
      status: vi.fn(function (n) {
        this.code = n;
        return this;
      }),
      json: vi.fn(),
    };
    await handler(
      { method: 'GET', url: '/api/weebcentral?action=details&id=https://evil.example' },
      res,
    );
    expect(res.code).toBe(400);
    expect(limit).not.toHaveBeenCalled();
    expect(provider.details).not.toHaveBeenCalled();
  });
});
