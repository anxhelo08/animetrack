import { expect, test } from 'vitest';
import { recentWatchedEpisodes } from '../../src/modules/watch-history.js';
const item = (watched = [1, 2, 3]) => ({ id: 'story', seasons: [{ id: 's1', watched }] });
const event = (episode, date = `2026-09-30T12:00:0${episode}Z`) => ({
  id: 'story',
  seasonId: 's1',
  action: 'watched',
  episode,
  date,
});

test('multiple episodes from one title enter at the bottom in chronological order', () => {
  const items = [item()];
  const history = [event(3), event(1), event(2)];
  expect(recentWatchedEpisodes(items, history).map((e) => e.n)).toEqual([1, 2, 3]);
  expect(items[0].seasons[0].watched).toEqual([1, 2, 3]);
  expect(history).toEqual([event(3), event(1), event(2)]);
});

test('unmarking, rewatching and bulk progress preserve distinct valid episodes', () => {
  const history = [
    event(1),
    { ...event(2), action: 'season-watched', episodes: [1, 2, 3] },
    event(1, '2026-10-01T12:00:00Z'),
  ];
  expect(recentWatchedEpisodes([item([1, 2])], history).map((e) => e.n)).toEqual([2, 1]);
});

test('imported progress supplies one unlogged episode and history stays bounded', () => {
  expect(recentWatchedEpisodes([item()], []).map((e) => e.n)).toEqual([3]);
  expect(recentWatchedEpisodes([item()], [event(3)]).map((e) => e.n)).toEqual([2, 3]);
  const watched = Array.from({ length: 20 }, (_, i) => i + 1);
  const events = watched.map((n) => event(n, new Date(n * 1000).toISOString()));
  expect(recentWatchedEpisodes([item(watched)], events).map((e) => e.n)).toEqual([
    15, 16, 17, 18, 19, 20,
  ]);
});
