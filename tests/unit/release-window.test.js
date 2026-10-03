import { expect, it } from 'vitest';
import { isNewRelease, NEW_RELEASE_WINDOW } from '../../src/core/release-window.js';
it('NEW lasts strictly seven days and excludes future or invalid dates', () => {
  const now = Date.parse('2026-10-03T12:00:00Z');
  expect(isNewRelease(now, now)).toBe(true);
  expect(isNewRelease(now - NEW_RELEASE_WINDOW + 1, now)).toBe(true);
  expect(isNewRelease(now - NEW_RELEASE_WINDOW, now)).toBe(false);
  expect(isNewRelease(now + 1, now)).toBe(false);
  expect(isNewRelease('invalid', now)).toBe(false);
});
