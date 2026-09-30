import { expect, test } from 'vitest';
import { parseLibrary, validateLibrary, MAX_IMPORT_BYTES } from '../../src/core/library-schema.js';
const valid = () => ({
  anime: [
    {
      id: 'a',
      title: 'One',
      seasons: [
        { id: 's', total: 12, watched: [1, 2], episodes: [{ number: 1, myNote: 'Private' }] },
      ],
    },
  ],
  history: [],
  preferences: {},
});
test('validation preserves every valid user field without coercing or dropping rows', () => {
  const value = valid(),
    before = JSON.stringify(value);
  expect(validateLibrary(value)).toBe(value);
  expect(JSON.stringify(value)).toBe(before);
  expect(parseLibrary(before)).toEqual(value);
});
test('invalid imports are rejected as a whole before they can replace a library', () => {
  for (const value of [
    { anime: {} },
    { anime: [null], history: [] },
    { ...valid(), preferences: [] },
    { ...valid(), history: [null] },
    JSON.parse('{"anime":[],"history":[],"__proto__":{"polluted":true}}'),
  ])
    expect(() => validateLibrary(value, { requireHistory: true })).toThrow();
});
test('malformed episode progress, nested structures and oversized files are bounded', () => {
  const value = valid();
  value.anime[0].seasons[0].watched = [-1];
  expect(() => validateLibrary(value)).toThrow();
  expect(() => parseLibrary(' '.repeat(MAX_IMPORT_BYTES + 1))).toThrow();
  let deep = valid(),
    root = deep;
  for (let i = 0; i < 30; i++) {
    root.extra = {};
    root = root.extra;
  }
  expect(() => validateLibrary(deep)).toThrow();
});
test('large imports retain thousands of titles and their full history', () => {
  const value = {
    anime: Array.from({ length: 4000 }, (_, i) => ({
      id: 'a' + i,
      title: 'Title ' + i,
      seasons: [{ total: 12, watched: [1, 2] }],
    })),
    history: Array.from({ length: 6000 }, (_, i) => ({
      id: 'a' + (i % 4000),
      action: 'watched',
      episode: 1,
      date: '2026-01-01',
    })),
  };
  expect(parseLibrary(JSON.stringify(value)).anime).toHaveLength(4000);
  expect(validateLibrary(value).history).toHaveLength(6000);
});
