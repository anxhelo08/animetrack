import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { normalizeReadingLibrary, markChapter, nextChapter } from '../../src/core/reading-model.js';
import { validateLibrary } from '../../src/core/library-schema.js';

const row = (fields = {}) =>
  normalizeReadingLibrary([
    {
      id: 'reading-al-30013',
      title: 'Berserk',
      kind: 'manga',
      totalChapters: 10,
      publicationStatus: 'FINISHED',
      chaptersRead: [1],
      status: 'reading',
      createdAt: '2026-10-01T10:00:00Z',
      updatedAt: '2026-10-01T10:00:00Z',
      ...fields,
    },
  ])[0];
const cloud = () => {
  const context = { window: {} };
  vm.runInNewContext(
    readFileSync(new URL('../../src/modules/cloud-local.js', import.meta.url), 'utf8'),
    context,
  );
  return context.window.ATCloudLocal12123;
};
describe('separate reading library', () => {
  it('retains chapter gaps, deduplicates, strips unsafe covers and never invents missing totals', () => {
    const input = row({
      chaptersRead: [1, 1, 3, -1, 12],
      cover: 'javascript:alert(1)',
      totalChapters: 0,
    });
    expect(input.chaptersRead).toEqual([1, 3, 12]);
    expect(input.cover).toBe('');
    expect(input.totalChapters).toBe(0);
    expect(nextChapter(input)).toBe(2);
    expect(normalizeReadingLibrary([input, input, { id: 'anime-1', title: 'Anime' }])).toEqual([
      input,
    ]);
  });
  it('records read and unread chapters without marking skipped chapters, with reversible completion', () => {
    const input = row({ totalChapters: 3 });
    expect(markChapter(input, 3, true)).toBe(true);
    expect(input.chaptersRead).toEqual([1, 3]);
    expect(input.status).toBe('reading');
    expect(markChapter(input, 3, true)).toBe(false);
    expect(markChapter(input, 4, true)).toBe(false);
    markChapter(input, 2, true);
    expect(input.status).toBe('completed');
    expect(nextChapter(input)).toBeNull();
    markChapter(input, 2, false);
    expect(input.status).toBe('reading');
    expect(input.journal.map((event) => event.action)).toEqual(['read', 'read', 'unread']);
  });
  it('does not complete an ongoing manga when it catches up to the current chapter count', () => {
    const input = row({ totalChapters: 2, publicationStatus: 'RELEASING' });
    markChapter(input, 2, true);
    expect(input.status).toBe('reading');
  });
  it('validates reading data before persistence and backup import', () => {
    const payload = { anime: [], history: [], readingLibrary: [row()] };
    expect(validateLibrary(payload)).toBe(payload);
    expect(() =>
      validateLibrary({ ...payload, readingLibrary: [{ ...row(), chaptersRead: [-1] }] }),
    ).toThrow();
    expect(() => validateLibrary({ ...payload, readingLibrary: [row(), row()] })).toThrow();
  });
  it('keeps reading notes, chapter journals and tombstones in compact cloud snapshots and hydration', () => {
    const input = row({
      notes: 'My private note',
      rating: 9,
      favorite: true,
      volumesRead: 2,
      deletedAt: '2026-10-02T10:00:00Z',
    });
    markChapter(input, 2, true);
    input.journal[0].note = 'Chapter note';
    const api = cloud(),
      payload = { anime: [], history: [], readingLibrary: [input] },
      compact = api.compact(payload);
    expect(JSON.parse(JSON.stringify(compact.readingLibrary))).toEqual([input]);
    expect(compact.history).toEqual([]);
    expect(
      JSON.parse(JSON.stringify(api.hydrate(compact, { anime: [], readingLibrary: [] })))
        .readingLibrary,
    ).toEqual([input]);
  });
  it('merges chapters from two devices, applies the latest unread event and preserves deletions', () => {
    const remote = row(),
      local = row();
    markChapter(remote, 2, true, '2026-10-01T11:00:00Z');
    markChapter(local, 3, true, '2026-10-01T12:00:00Z');
    markChapter(local, 1, false, '2026-10-01T13:00:00Z');
    // A personal diary date never changes the order of read/unread mutations.
    local.journal[1].date = '2026-09-01T12:00:00Z';
    local.notes = 'Latest note';
    local.deletedAt = local.updatedAt;
    const api = cloud(),
      merged = api.merge(
        { anime: [], readingLibrary: [remote] },
        { anime: [], readingLibrary: [local] },
      ).readingLibrary[0];
    expect(Array.from(merged.chaptersRead)).toEqual([2, 3]);
    expect(merged.notes).toBe('Latest note');
    expect(merged.deletedAt).toBe(local.deletedAt);
    expect(merged.journal).toHaveLength(3);
  });
  it('editing a diary date cannot resurrect a chapter removed on another device', () => {
    const remote = row();
    markChapter(remote, 2, true, '2026-10-01T11:00:00Z');
    const local = structuredClone(remote);
    markChapter(local, 2, false, '2026-10-01T12:00:00Z');
    local.journal[1].date = '2026-09-01T12:00:00Z';
    const merged = cloud().merge(
      { anime: [], readingLibrary: [remote] },
      { anime: [], readingLibrary: [local] },
    );
    expect(Array.from(merged.readingLibrary[0].chaptersRead)).toEqual([1]);
  });
});

it('count discovery retains personal progress and does not extend NEW on repeated refreshes', async () => {
  const { applyReadingUpdate } = await import('../../src/core/reading-model.js');
  const input = row({
    totalChapters: 10,
    volumeRanges: [{ volume: 1, start: 1, end: 10 }],
    notes: 'My own note',
  });
  applyReadingUpdate(
    input,
    {
      totalChapters: 12,
      publicationStatus: 'RELEASING',
      volumeRanges: [{ volume: 1, start: 1, end: 12 }],
    },
    '2026-10-01T12:00:00Z',
  );
  applyReadingUpdate(
    input,
    { totalChapters: 12, publicationStatus: 'RELEASING' },
    '2026-10-03T12:00:00Z',
  );
  expect(input.chapterReleases).toEqual([
    { chapter: 11, date: '2026-10-01T12:00:00Z', detected: true },
    { chapter: 12, date: '2026-10-01T12:00:00Z', detected: true },
  ]);
  expect(input.chaptersRead).toEqual([1]);
  expect(input.notes).toBe('My own note');
  expect(input.volumeRanges).toEqual([{ volume: 1, start: 1, end: 10 }]);
});
it('an unknown initial count establishes a baseline without inventing release dates', async () => {
  const { applyReadingUpdate } = await import('../../src/core/reading-model.js');
  const input = row({ totalChapters: 0 });
  applyReadingUpdate(
    input,
    { totalChapters: 120, publicationStatus: 'RELEASING' },
    '2026-10-03T12:00:00Z',
  );
  expect(input.chapterReleases).toEqual([]);
  expect(input.totalChapters).toBe(120);
});
it('cross-device metadata merges keep the higher count and the original NEW date', () => {
  const api = cloud();
  const old = row({
    totalChapters: 12,
    chapterReleases: [{ chapter: 12, date: '2026-10-01T12:00:00Z', detected: true }],
    updatedAt: '2026-10-01T12:00:00Z',
  });
  const newer = row({
    totalChapters: 10,
    chapterReleases: [{ chapter: 12, date: '2026-10-03T12:00:00Z', detected: true }],
    updatedAt: '2026-10-03T12:00:00Z',
  });
  // Normalization strips a release outside its reported total, as it should.
  newer.chapterReleases = [{ chapter: 12, date: '2026-10-03T12:00:00Z', detected: true }];
  const merged = api.merge(
    { anime: [], readingLibrary: [old] },
    { anime: [], readingLibrary: [newer] },
  ).readingLibrary[0];
  expect(merged.totalChapters).toBe(12);
  expect(merged.chapterReleases[0].date).toBe('2026-10-01T12:00:00Z');
});

it('an unavailable chapter count stays unknown even when personal progress is known', async () => {
  const { applyReadingUpdate } = await import('../../src/core/reading-model.js');
  const input = row({ totalChapters: 0, chaptersRead: [1, 2, 3] });
  applyReadingUpdate(input, { totalChapters: 0, publicationStatus: 'RELEASING' });
  expect(input.totalChapters).toBe(0);
  expect(input.chaptersRead).toEqual([1, 2, 3]);
});
