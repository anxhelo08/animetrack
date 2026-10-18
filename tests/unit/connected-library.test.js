import { expect, it } from 'vitest';
import {
  matchRules,
  cleanRules,
  parseTrakt,
  applyTraktRows,
} from '../../src/core/connected-library.js';
import { calendarKind, calendarMatches } from '../../src/core/calendar-classification.js';
import { createLibraryModel } from '../../src/core/library-model.js';
import {
  feedEvents,
  calendarICS,
  publicItem,
  hashToken,
} from '../../supabase/functions/anime-connected/model.js';
const { releasedCount } = createLibraryModel();
const state = () => ({
  anime: [
    {
      id: 'anime-1',
      title: 'Series',
      source: 'AniList',
      sourceId: '123',
      status: 'watching',
      notes: 'private',
      total: 12,
      seasons: [
        {
          id: 'part-1',
          format: 'TV',
          total: 12,
          releaseStatus: 'FINISHED',
          watched: [1],
          watchedAt: { 1: '2026-01-01' },
          episodes: [{ number: 1, myNote: 'keep' }],
        },
      ],
    },
  ],
  history: [],
  preferences: { customLists: [{ id: 'list-old', title: 'Keep', animeIds: ['anime-1'] }] },
});
it('smart rules update from progress without duplicating or changing old-format library data', () => {
  const s = state(),
    before = structuredClone(s),
    a = s.anime[0];
  expect(matchRules(a, { status: 'watching', maxRemaining: 3 }, releasedCount)).toBe(false);
  a.seasons[0].watched = Array.from({ length: 10 }, (_, i) => i + 1);
  expect(matchRules(a, { status: 'watching', maxRemaining: 3 }, releasedCount)).toBe(true);
  expect(cleanRules({ maxTotal: -1, unknown: 'bad', favorite: true })).toEqual({ favorite: true });
  a.seasons[0].watched = [1];
  expect(s).toEqual(before);
});
it('calendar classifications distinguish premieres, season starts and verified finales', () => {
  const s = state();
  const e = { animeId: 'anime-1', seasonId: 'part-1', episode: 12 };
  expect(calendarKind(e, s.anime).finale).toBe(true);
  s.anime[0].seasons[0].releaseStatus = 'RELEASING';
  expect(calendarMatches(e, s.anime, 'finale')).toBe(false);
  expect(calendarMatches({ ...e, episode: 1 }, s.anime, 'premiere')).toBe(true);
  s.anime[0].seasons[0].hidden = true;
  expect(calendarMatches(e, s.anime, 'finale')).toBe(false);
});
it('Trakt ratings never mark an episode watched; explicit mapped history is idempotent and preserves notes', () => {
  const s = state(),
    before = structuredClone(s),
    stamp = '2026-10-18T12:00:00Z';
  const raw = {
    show: { title: 'Series', ids: { imdb: 'tt12345' } },
    episode: { season: 1, number: 2 },
  };
  const rating = parseTrakt([{ ...raw, rating: 8, rated_at: stamp }]);
  const rated = applyTraktRows(s, rating, { [rating[0].key]: 'anime-1|part-1' }, stamp);
  expect(rated.draft.anime[0].seasons[0].watched).toEqual([1]);
  expect(rated.draft.history).toEqual([]);
  expect(
    rated.draft.anime[0].seasons[0].episodes.find((ep) => ep.number === 2).personalRating,
  ).toBe(8);
  const history = parseTrakt([{ ...raw, watched_at: stamp }]);
  const one = applyTraktRows(s, history, { [history[0].key]: 'anime-1|part-1' }, stamp);
  const two = applyTraktRows(one.draft, history, { [history[0].key]: 'anime-1|part-1' }, stamp);
  expect(two.draft.history).toHaveLength(1);
  expect(two.draft.anime[0].seasons[0].watched).toEqual([1, 2]);
  expect(two.draft.anime[0].notes).toBe('private');
  expect(s).toEqual(before);
  const unmapped = applyTraktRows(s, history, {}, stamp);
  expect(unmapped.skipped).toBe(1);
  expect(unmapped.draft).toEqual(s);
});
it('watchlist imports create a private list while preserving personal status and existing lists', () => {
  const rows = parseTrakt({ watchlist: [{ show: { title: 'Series', ids: {} } }] });
  const result = applyTraktRows(state(), rows, { [rows[0].key]: 'anime-1|part-1' }, '2026-10-18');
  expect(result.draft.preferences.customLists).toHaveLength(2);
  expect(result.draft.preferences.customLists[1].animeIds).toEqual(['anime-1']);
  expect(result.draft.anime[0].status).toBe('watching');
});
it('calendar feeds expose event summaries only, fold unicode safely, and exclude hidden/favorite-unmatched parts', async () => {
  const s = state(),
    now = Date.parse('2026-10-18T12:00:00Z');
  s.anime[0].seasons[0].nextAiringAt = (now + 3600000) / 1000;
  s.anime[0].seasons[0].nextAiringEpisode = 2;
  const events = feedEvents(s, {}, now),
    ics = calendarICS(events, now);
  expect(events).toHaveLength(1);
  expect(ics).toContain('Series · Episodi 2');
  expect(ics).not.toContain('private');
  expect(ics).not.toContain('keep');
  expect(feedEvents(s, { favorites: true }, now)).toEqual([]);
  s.anime[0].seasons[0].hidden = true;
  expect(feedEvents(s, {}, now)).toEqual([]);
  const long = calendarICS([{ ...events[0], title: 'ë'.repeat(200) }], now);
  expect(long.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75)).toBe(
    true,
  );
  expect(await hashToken('a'.repeat(64))).toMatch(/^[a-f0-9]{64}$/);
  expect(
    publicItem({
      title: 'Title',
      source: 'AniList',
      sourceId: '1',
      notes: 'PRIVATE',
      watched: [1],
    }),
  ).not.toHaveProperty('notes');
});
