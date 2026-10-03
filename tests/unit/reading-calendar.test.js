import { it, expect } from 'vitest';
import { readingCalendarEntries } from '../../src/core/reading-calendar.js';
it('keeps publication dates over duplicate detection dates and omits invalid or deleted entries', () => {
  const row = {
    id: 'manga-1',
    title: 'Story',
    chapterReleases: [
      { chapter: 2, date: '2026-09-29T12:00:00Z', detected: true },
      { chapter: 2, date: '2026-09-28T12:00:00Z', detected: false },
      { chapter: 3, date: 'invalid' },
      { chapter: 4.5, date: '2026-09-28T12:00:00Z' },
    ],
  };
  const result = readingCalendarEntries([row, { ...row, id: 'deleted', deletedAt: '2026-09-30' }], {
    month: '2026-09',
  });
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ day: '2026-09-28', entry: { chapter: 2, detected: false } });
  expect(readingCalendarEntries([row], { month: '2026-10' })).toEqual([]);
  expect(readingCalendarEntries([row], { query: 'missing' })).toEqual([]);
});
