import { test, expect } from 'vitest';
import {
  cleanReadingFilters,
  matchesReadingFilters,
  rankReadingRecommendations,
  readingWeeklyStats,
} from '../../src/core/reading-discovery.js';
import { listSnapshot, sharedListURL, parseSharedList } from '../../src/modules/shared-lists.js';
import { playerURL, playerTarget } from '../../src/modules/player-tracking.js';
import { checkReadingReleases } from '../../supabase/functions/_shared/reading-releases.js';
import { stillWanted } from '../../supabase/functions/_shared/push-policy.js';

test('filters require known length and combine included and excluded genres', () => {
  const row = {
    genres: 'Fantasy, Action',
    year: 2021,
    communityScore: 8,
    totalChapters: 0,
    publicationStatus: 'RELEASING',
  };
  expect(matchesReadingFilters(row, { include: ['Fantasy'], exclude: ['Romance'], score: 7 })).toBe(
    true,
  );
  expect(matchesReadingFilters(row, { maxChapters: 100 })).toBe(false);
  expect(
    matchesReadingFilters({ ...row, totalChapters: 80 }, { minChapters: 50, maxChapters: 100 }),
  ).toBe(true);
  expect(matchesReadingFilters(row, { exclude: ['Action'] })).toBe(false);
  expect(
    cleanReadingFilters({ include: ['Fantasy', 'unverified tag', 'Fantasy'], score: 30 }).include,
  ).toEqual(['Fantasy']);
});
test('recommendations explain actual taste and exclude owned provider IDs', () => {
  const rows = [
    {
      id: 'reading-al-1',
      source: 'anilist',
      sourceId: '1',
      title: 'My Fantasy',
      genres: 'Fantasy',
      rating: 9,
      chaptersRead: [1],
    },
  ];
  const result = rankReadingRecommendations(
    [
      { ...rows[0] },
      {
        id: 'reading-al-2',
        source: 'anilist',
        sourceId: '2',
        title: 'Next',
        genres: 'Fantasy',
        communityScore: 8,
      },
    ],
    rows,
  );
  expect(result).toHaveLength(1);
  expect(result[0].recommendationReason).toBe('Sepse të pëlqeu My Fantasy');
});
test('weekly progress excludes future dates, removed chapters and repeated toggles', () => {
  const result = readingWeeklyStats(
    [
      {
        title: 'Book',
        genres: 'Fantasy',
        chaptersRead: [1],
        journal: [
          { chapter: 1, action: 'read', date: '2026-09-29T10:00:00Z' },
          { chapter: 1, action: 'unread', date: '2026-09-29T11:00:00Z' },
          { chapter: 1, action: 'read', date: '2026-09-29T12:00:00Z' },
          { chapter: 2, action: 'read', date: '2026-10-03T12:00:00Z' },
        ],
      },
    ],
    new Date('2026-09-30T12:00:00Z'),
  );
  expect(result.chapters).toBe(1);
  expect(result.genres).toEqual([['Fantasy', 1]]);
});
test('share links round trip Unicode titles and cannot disclose diary, notes or progress', () => {
  const item = {
    title: 'Histori 漫画',
    kind: 'manga',
    year: 2021,
    notes: 'private',
    journal: [{ note: 'secret' }],
    rating: 9,
    chaptersRead: [1],
  };
  const url = sharedListURL('Për mua', [item]);
  const result = parseSharedList(new URL(url).hash);
  expect(result).toEqual(listSnapshot('Për mua', [item]));
  expect(JSON.stringify(result)).not.toMatch(/private|secret|rating|chaptersRead/);
  expect(parseSharedList('#list=malformed')).toBeNull();
  expect(parseSharedList('#list=' + 'a'.repeat(66000))).toBeNull();
});
test('player tracking is opt-in, matches an exact supported URL and never toggles watched episodes', () => {
  const state = {
    preferences: {
      playerTracking: true,
      playerMappings: [
        { url: 'https://www.netflix.com/watch/7', animeId: 'a', seasonId: 's', episode: 2 },
      ],
    },
    anime: [{ id: 'a', seasons: [{ id: 's', watched: [] }] }],
  };
  const payload = { url: 'https://www.netflix.com/watch/7?tracking=abc', playedRatio: 0.91 };
  expect(playerTarget(payload, state)?.episode).toBe(2);
  expect(playerTarget({ ...payload, playedRatio: 0.89 }, state)).toBeNull();
  expect(playerTarget({ ...payload, url: 'https://www.netflix.com/watch/8' }, state)).toBeNull();
  state.anime[0].seasons[0].watched = [2];
  expect(playerTarget(payload, state)).toBeNull();
  expect(playerURL('https://www.netflix.com.evil.test/watch/7')).toBe('');
});
test('background releases use leases, establish unknown baselines and preserve personal data', async () => {
  const records = [],
    row = {
      id: 'reading-al-1',
      title: 'Book',
      sourceId: '1',
      totalChapters: 0,
      notes: 'Private',
      chaptersRead: [1],
      journal: [],
    };
  const admin = {
    rpc: async (name, args) => {
      if (name === 'anime_claim_reading_checks')
        return { data: [{ user_id: 'owner', reading: row, claim_token: 'lease', metadata: {} }] };
      records.push({ name, args });
      return { data: true };
    },
  };
  expect(
    await checkReadingReleases(
      admin,
      async () => ({ totalChapters: 50 }),
      () => Date.parse('2026-09-30T12:00:00Z'),
    ),
  ).toEqual({ checked: 1, updated: 0, failed: 0 });
  expect(records[0].args.p_chapter).toBe(0);
  expect(records[0].args.p_claim).toBe('lease');
  expect(records[0].args.p_metadata.chapterReleases).toEqual([]);
  expect(JSON.stringify(records)).not.toContain('Private');
  expect(row.totalChapters).toBe(0);
  row.totalChapters = 50;
  records.length = 0;
  await checkReadingReleases(admin, async () => ({ totalChapters: 51 }));
  expect(records[0].args.p_chapter).toBe(51);
  records.length = 0;
  await checkReadingReleases(admin, async () => ({
    totalChapters: 60,
    weebCentralId: '01J76XYCPSY3C4BNPBRY8JMCBE',
    chapterSource: 'WeebCentral',
  }));
  expect(records[0].args.p_chapter).toBe(0); // First provider linkage is a baseline, not a new release.
  expect(records[0].args.p_metadata.weebCentralId).toBe('01J76XYCPSY3C4BNPBRY8JMCBE');
});
test('chapter push rechecks opt-in and unread state before sending', () => {
  const job = { event_key: 'reading:reading-al-1:5', anime_id: 'reading-al-1', episode: 5 },
    payload = {
      preferences: { pushEnabled: true, readingNotifications: true },
      readingLibrary: [{ id: 'reading-al-1', chaptersRead: [] }],
    };
  expect(stillWanted(job, payload)).toBe(true);
  payload.readingLibrary[0].chaptersRead = [5];
  expect(stillWanted(job, payload)).toBe(false);
  payload.readingLibrary[0].chaptersRead = [];
  payload.preferences.readingNotifications = false;
  expect(stillWanted(job, payload)).toBe(false);
});

test('shared watch lists preserve Film and Serial labels through the URL', () => {
  const url = sharedListURL('Cinema', [
    { title: 'Movie', format: 'MOVIE', source: 'Cinemeta' },
    { title: 'Show', source: 'TVMaze' },
  ]);
  expect(parseSharedList(new URL(url).hash).items.map((item) => item.kind)).toEqual([
    'Film',
    'Serial',
  ]);
  const long = Array.from({ length: 150 }, () => ({ title: '漫'.repeat(180), kind: 'manga' }));
  expect(parseSharedList(new URL(sharedListURL('Long', long)).hash)?.items).toHaveLength(150);
});
