import { test, expect } from 'vitest';
import { encodeLibraryStorage, decodeLibraryStorage } from '../../src/core/storage-codec.js';
test('lossless codec keeps Unicode and legacy JSON readable and rejects damaged encoded copies', () => {
  const original = JSON.stringify({ notes: 'Shënime 日本語 💜 \ud800'.repeat(1000) });
  const encoded = encodeLibraryStorage(original);
  expect(encoded).toMatch(/^ATLS1:/);
  expect(decodeLibraryStorage(encoded)).toBe(original);
  expect(decodeLibraryStorage(original)).toBe(original);
  expect(decodeLibraryStorage(null)).toBeNull();
  expect(() => decodeLibraryStorage(encoded.slice(0, 15))).toThrow(/verifikimin/);
});
