import { test, expect, vi } from 'vitest';
import { savedAiringEvents, loadLibraryAiring } from '../../src/core/library-airing.js';
import { mergeAiringEvents } from '../../src/core/airing-schedule.js';
const now = Date.parse('2026-10-03T12:00:00Z');
const title = {
  id: 'one',
  title: 'Tracked',
  source: 'AniList',
  sourceId: '7',
  malId: '8',
  status: 'completed',
  providerIds: ['mal:8'],
  seasons: [
    {
      id: 'part',
      source: 'AniList',
      sourceId: '7',
      malId: '8',
      nextAiringEpisode: 4,
      nextAiringAt: (now + 3600000) / 1000,
      episodes: [],
    },
  ],
};
const event = {
  providerKey: 'anilist:7',
  malKey: 'mal:8',
  episode: 4,
  when: now + 3600000,
  source: 'AniList',
};
test('stored confirmed next episodes are published before slow provider checks finish', async () => {
  const updates = [],
    release = {};
  const gate = new Promise((r) => (release.done = r));
  const fetchSchedule = vi.fn(async () => {
    await gate;
    return { events: [event], aliases: ['mal:8'], checks: [{ source: 'AniList', status: 'ok' }] };
  });
  const work = loadLibraryAiring([title], { now, fetchSchedule, onUpdate: (r) => updates.push(r) });
  expect(updates[0].events).toHaveLength(1);
  expect(updates[0].events[0]).toMatchObject({ animeId: 'one', episode: 4, when: event.when });
  release.done();
  await work;
  expect(fetchSchedule).toHaveBeenCalledTimes(1);
  expect(updates.at(-1).events).toHaveLength(1);
});
test('forced refresh paints the cache first and retains it when both providers fail', async () => {
  const updates = [];
  await loadLibraryAiring([{ ...title, seasons: [], providerIds: [] }], {
    now,
    force: true,
    onUpdate: (r) => updates.push(r),
    readCache: async () => [
      {
        lookup_key: 'anilist:7',
        checked_at: new Date(now).toISOString(),
        result: { events: [event], checks: [{ source: 'AniList', status: 'ok' }] },
      },
    ],
    fetchSchedule: async () => {
      throw Error('Offline');
    },
  });
  expect(updates[1].events).toHaveLength(1);
  expect(updates.at(-1).events).toHaveLength(1);
  expect(updates.at(-1).failures).toBe(1);
});
test('partial independent provider failure keeps saved episodes and accepts revised confirmed dates', async () => {
  const updates = [];
  await loadLibraryAiring([{ ...title, seasons: [], providerIds: [] }], {
    now,
    onUpdate: (r) => updates.push(r),
    force: true,
    readCache: async () => [
      {
        lookup_key: 'anilist:7',
        checked_at: new Date(now).toISOString(),
        result: { events: [event] },
      },
    ],
    fetchSchedule: async () => ({
      events: [{ ...event, when: now + 7200000 }],
      checks: [
        { source: 'AniList', status: 'ok' },
        { source: 'MAL', status: 'unavailable' },
      ],
    }),
  });
  expect(updates.at(-1).events).toHaveLength(1);
  expect(updates.at(-1).events[0].when).toBe(now + 7200000);
  expect(updates.at(-1).failures).toBe(1);
});
test('local broadcast weekdays and vague season dates are not fabricated into episodes', () => {
  expect(
    savedAiringEvents({
      ...title,
      seasons: [{ broadcast: { day: 'Saturday' }, startDate: '2026-10-03', episodes: [] }],
    }),
  ).toEqual([]);
  const old = { ...event, animeId: 'one' },
    fresh = { ...old, when: now + 7200000 };
  expect(mergeAiringEvents([old, fresh], now)).toEqual([fresh]);
});
test('responses from a previous account cannot repaint a new owner calendar', async () => {
  let current = true;
  const onUpdate = vi.fn();
  await loadLibraryAiring([title], {
    now,
    onUpdate,
    isCurrent: () => current,
    fetchSchedule: async () => {
      current = false;
      return { events: [event] };
    },
  });
  expect(onUpdate).toHaveBeenCalledTimes(2);
});
test('an old cache with an aired untyped sequel is refreshed before its daily TTL expires', async () => {
  const untyped = {
    ...event,
    providerKey: 'anilist:9',
    malKey: 'mal:90',
    episode: 1,
    when: now - 1000,
  };
  const fetchSchedule = vi.fn(async () => ({
    events: [{ ...untyped, format: 'TV', relation: 'SEQUEL', linkedFrom: ['anilist:7'] }],
  }));
  await loadLibraryAiring([title], {
    now,
    readCache: async () => [
      {
        lookup_key: 'anilist:7',
        checked_at: new Date(now).toISOString(),
        result: { events: [untyped] },
      },
    ],
    fetchSchedule,
  });
  expect(fetchSchedule).toHaveBeenCalledTimes(1);
});
