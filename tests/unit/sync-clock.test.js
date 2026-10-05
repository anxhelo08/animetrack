import { test, expect } from 'vitest';
import { createSyncClock } from '../../src/core/sync-clock.js';
test('server offset corrects a ten-minute clock skew and later wall-clock edits', () => {
  let wall = Date.parse('2026-10-05T12:10:00Z'),
    tick = 0;
  const clock = createSyncClock({ wall: () => wall, monotonic: () => tick });
  tick = 100;
  expect(clock.observe('2026-10-05T12:00:00Z', 0)).toBe(true);
  expect(clock.offset()).toBe(-599950);
  tick = 1100;
  wall += 3600000;
  expect(clock.iso()).toBe('2026-10-05T12:00:01.050Z');
  const restored = createSyncClock({
    wall: () => Date.parse('2026-10-05T12:11:00Z'),
    monotonic: () => 0,
  });
  restored.restore(-600000);
  expect(restored.iso()).toBe('2026-10-05T12:01:00.000Z');
  expect(clock.observe('old row, not a current server timestamp')).toBe(false);
});
