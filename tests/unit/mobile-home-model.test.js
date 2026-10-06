import { expect, test, vi } from 'vitest';
import { createMobileHomeModel } from '../../src/modules/mobile-home-model.js';

const now = Date.parse('2026-10-06T12:00:00Z');
function title(id, lastWatched) {
  const part = {
    id: `${id}-part`,
    hidden: false,
    total: 3,
    watched: [1],
    episodes: [{ number: 2, airedAt: new Date(lastWatched).toISOString() }],
  };
  return {
    id,
    title: id,
    status: 'watching',
    createdAt: new Date(lastWatched).toISOString(),
    seasons: [part],
  };
}
const nextEpisode = (item) => ({ season: item.seasons[0], n: 2 });
function input(items, history = [], extras = {}) {
  return {
    owner: 'reader',
    revision: 1,
    items,
    history,
    entries: [],
    nextEpisode,
    now,
    includeUpcoming: false,
    ...extras,
  };
}

test('recent releases and recently watched titles are selected without changing library data', () => {
  const newest = title('newest', now - 1000);
  const old = title('old', now - 10 * 86400000);
  const original = structuredClone([newest, old]);
  const result = createMobileHomeModel()(input([newest, old]));

  expect(result.active.map(({ a }) => a.id)).toEqual(['newest']);
  expect(result.stale.map(({ a }) => a.id)).toEqual(['old']);
  expect(result.byId.get('newest')).toBe(newest);
  expect([newest, old]).toEqual(original);
});

test('memoizes selectors for the same saved revision and invalidates after a change', () => {
  const select = createMobileHomeModel();
  const items = [title('story', now - 1000)];
  const getNext = vi.fn(nextEpisode);
  const state = input(items, [], { nextEpisode: getNext });

  const first = select(state);
  const second = select(state);
  expect(second).toBe(first);
  expect(getNext).toHaveBeenCalledOnce();

  const changedRevision = select({ ...state, revision: 2 });
  expect(changedRevision).not.toBe(first);
  expect(getNext).toHaveBeenCalledTimes(2);
});

test('account changes and upcoming selection cannot reuse another view’s cached data', () => {
  const select = createMobileHomeModel();
  const items = [title('story', now - 1000)];
  const future = {
    animeId: 'story',
    seasonId: 'story-part',
    seasonEpisode: 3,
    when: now + 3600000,
  };
  const state = input(items, [], { owner: 'first', entries: [future] });
  const first = select(state);
  const otherOwner = select({ ...state, owner: 'second' });
  const withUpcoming = select({ ...state, includeUpcoming: true });

  expect(otherOwner).not.toBe(first);
  expect(first.upcoming).toEqual([]);
  expect(withUpcoming.upcoming).toEqual([future]);
});

test('known future episodes deduplicate remote releases and exclude watched parts', () => {
  const item = title('story', now - 1000);
  item.seasons[0].episodes.push(
    { number: 3, airedAt: new Date(now + 3600000).toISOString() },
    { number: 4, airedAt: new Date(now + 7200000).toISOString() },
  );
  item.seasons[0].watched.push(4);
  const future = {
    animeId: 'story',
    seasonId: 'story-part',
    seasonEpisode: 3,
    when: now + 3600000,
  };
  const result = createMobileHomeModel()(
    input([item], [], { includeUpcoming: true, entries: [future] }),
  );

  expect(result.upcoming).toEqual([future]);
});
