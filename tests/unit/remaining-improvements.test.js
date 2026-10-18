// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { groupTraktRows, resolveTraktGroups } from '../../src/core/trakt-import-groups.js';
import { activeLibraryFilters } from '../../src/modules/library-filters.js';
import { createDeferredDetail } from '../../src/modules/deferred-detail.js';
import { parseTrakt, applyTraktRows } from '../../src/core/connected-library.js';

it('one season mapping applies to its episodes, allows skip/override and keeps distinct IDs separate', () => {
  const rows = Array.from({ length: 30 }, (_, i) => ({
    key: 'r' + i,
    title: 'Show',
    traktId: 1,
    movie: false,
    season: 1,
    episode: i + 1,
  }));
  rows.push({ key: 'other', title: 'Show', traktId: 2, movie: false, season: 1, episode: 1 });
  rows.push({ key: 'season2', title: 'Show', traktId: 1, movie: false, season: 2, episode: 1 });
  rows.push(
    { key: 'unknown1', title: 'Show', movie: false, season: 1 },
    { key: 'unknown2', title: 'Show', movie: false, season: 1 },
  );
  const groups = groupTraktRows(rows);
  expect(groups).toHaveLength(5);
  expect(groups[0].rows).toHaveLength(30);
  const selected = resolveTraktGroups(rows, [], { 'group-0': 'a|s1', r1: 'a|special', r2: '' });
  expect(selected.r0).toBe('a|s1');
  expect(selected.r1).toBe('a|special');
  expect(selected.r2).toBe('');
  expect(selected.r29).toBe('a|s1');
  expect(selected.other).toBe('');
  expect(rows[0]).not.toHaveProperty('selection');
});
it('group suggestions use exact IDs and do not guess a numbered TV season', () => {
  const library = [{ id: 'a', traktId: 1, seasons: [{ id: 's', format: 'TV' }] }];
  const row = { key: 'r', title: 'Show', traktId: 1, season: 2, movie: false };
  expect(resolveTraktGroups([row], library, {}).r).toBe('');
  expect(resolveTraktGroups([{ ...row, season: 0 }], library, {}).r).toBe('a|s');
  expect(resolveTraktGroups([{ ...row, traktId: 2 }], library, {}).r).toBe('');
});
it('preview describes actual additions and repeated imports add no history', () => {
  const state = {
    anime: [
      {
        id: 'a',
        title: 'Show',
        status: 'watching',
        notes: 'keep',
        seasons: [{ id: 's', total: 12, format: 'TV', watched: [] }],
      },
    ],
    history: [],
    preferences: {},
  };
  const rows = parseTrakt([
    {
      show: { title: 'Show', ids: { trakt: 1 } },
      episode: { season: 1, number: 2 },
      watched_at: '2026-10-01T12:00:00Z',
      rating: 8,
    },
  ]);
  const selected = resolveTraktGroups(rows, state.anime, { 'group-0': 'a|s' });
  const one = applyTraktRows(state, rows, selected, '2026-10-18T12:00:00Z');
  expect(one.changes).toEqual({ history: 1, ratings: 1, watchlist: 0 });
  expect(one.draft.anime[0].notes).toBe('keep');
  const two = applyTraktRows(one.draft, rows, selected, '2026-10-18T12:00:00Z');
  expect(two.changes).toEqual({ history: 0, ratings: 0, watchlist: 0 });
  expect(applyTraktRows(state, rows, {}, '2026-10-18').reasons.unmapped).toBe(1);
});
it('filter explanations show each active constraint without changing the snapshot', () => {
  const s = {
      filter: 'genres',
      search: 'show',
      media: 'tv',
      focus: 'new',
      progress: 'continue',
      genre: 'Drama',
    },
    before = JSON.stringify(s);
  expect(activeLibraryFilters(s).map((c) => c.key)).toEqual([
    'status',
    'search',
    'media',
    'focus',
    'progress',
    'genre',
  ]);
  expect(JSON.stringify(s)).toBe(before);
  expect(
    activeLibraryFilters({
      filter: 'all',
      search: '',
      media: 'all',
      focus: 'all',
      progress: 'all',
      genre: 'all',
    }),
  ).toEqual([]);
});
it('detail factories stay unloaded at mount, coalesce downloads and reject stale account/root attachments', async () => {
  let loads = 0,
    mounts = 0,
    owner = 'a',
    release;
  const calls = [];
  const gate = new Promise((resolve) => (release = resolve));
  const feature = createDeferredDetail({
    ctx: { user: () => ({ id: owner }), toast() {} },
    load: async () => {
      loads++;
      await gate;
    },
    create: () => ({
      mount() {
        mounts++;
      },
      attach: (root, id) => calls.push(id),
    }),
  });
  feature.mount();
  expect(loads).toBe(0);
  const root = document.createElement('div');
  document.body.append(root);
  const first = feature.attach(root, 'old'),
    second = feature.attach(root, 'new');
  await Promise.resolve();
  expect(loads).toBe(1);
  release();
  await Promise.all([first, second]);
  expect(calls).toEqual(['new']);
  expect(mounts).toBe(1);
  let ready;
  const next = createDeferredDetail({
    ctx: { user: () => ({ id: owner }), toast() {} },
    load: () => new Promise((r) => (ready = r)),
    create: () => ({ mount() {}, attach: () => calls.push('wrong-owner') }),
  });
  next.mount();
  const pending = next.attach(root, 'x');
  await Promise.resolve();
  owner = 'b';
  ready();
  await pending;
  expect(calls).not.toContain('wrong-owner');
  root.remove();
});
