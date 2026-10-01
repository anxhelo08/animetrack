import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { htmlHelpers, avatarHelpers } from '../helpers/html.js';

function profiles() {
  const storage = new Map();
  const w = {
    ATHTML: htmlHelpers,
    ATAvatar: avatarHelpers,
    localStorage: { getItem: (k) => storage.get(k), setItem: (k, v) => storage.set(k, v) },
  };
  vm.runInNewContext(readFileSync('src/modules/profiles.js', 'utf8'), {
    window: w,
    Date,
    Map,
    Set,
    console,
    setTimeout,
    clearTimeout,
  });
  let owner = 'a',
    pending = [],
    saved = null;
  const inputs = {
    'pro-handle': { value: 'custom_name' },
    'pro-name': { value: 'My saved name' },
    'pro-bio': { value: 'My bio' },
    'pro-avatar': { value: '⭐' },
    'pro-avatar-url': { value: '' },
    'pro-public': { checked: false },
  };
  const state = { anime: [], preferences: {} };
  const query = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    maybeSingle() {
      return new Promise((resolve) => pending.push(resolve));
    },
    upsert(row) {
      saved = row;
      return this;
    },
    single() {
      return Promise.resolve({ data: saved, error: null });
    },
  };
  const ctx = {
    user: () => ({ id: owner }),
    client: () => ({ from: () => query }),
    state: () => state,
    el: (k) => inputs[k],
    count: () => 0,
    esc: String,
    poster: () => '',
    save: () => true,
    toast: () => {},
    rerender: () => {},
  };
  return { factory: () => w.ATProfiles(ctx), pending, storage, owner: (id) => (owner = id) };
}

test('a late profile load cannot overwrite a newer saved customization', async () => {
  const f = profiles(),
    p = f.factory(),
    loading = p.load();
  await p.save();
  f.pending.shift()({ data: { user_id: 'a', display_name: 'Old default' }, error: null });
  await loading;
  expect(p.get().display_name).toBe('My saved name');
  expect(JSON.parse(f.storage.get('animetrack:profile:a')).bio).toBe('My bio');
});

test('profile personalization survives a new app instance and failed cloud refresh', async () => {
  const f = profiles(),
    p = f.factory();
  await p.save();
  const reopened = f.factory(),
    loading = reopened.load();
  expect(reopened.get().display_name).toBe('My saved name');
  f.pending.shift()({ error: new Error('offline') });
  await expect(loading).rejects.toThrow('offline');
  expect(reopened.get().display_name).toBe('My saved name');
});

test('a profile response from a previous account is discarded', async () => {
  const f = profiles(),
    p = f.factory(),
    loading = p.load();
  f.owner('b');
  f.pending.shift()({ data: { user_id: 'a', display_name: 'Private name' }, error: null });
  await loading;
  expect(p.get()).toBeNull();
});

test('continue watching labels a movie after TV seasons without inventing an episode', () => {
  const w = { ATHTML: htmlHelpers };
  vm.runInNewContext(readFileSync('src/modules/home.js', 'utf8'), { window: w, Date, Intl });
  const film = {
    id: 'film',
    format: 'MOVIE',
    title: 'Film',
    subtitle: 'Eureka — Movie 2',
    total: 1,
    watched: [],
  };
  const anime = {
    id: 'a',
    title: 'Eureka',
    status: 'watching',
    seasons: [{ id: 'tv', format: 'TV', watched: [1] }, film],
  };
  const ctx = {
    esc: String,
    state: () => ({ anime: [anime], preferences: {} }),
    user: () => ({ id: 'a' }),
    poster: () => '',
    nextEpisode: () => ({ season: film, n: 1 }),
    upcoming: () => [],
    seasonNumber: () => 3,
    releasedTotal: () => 2,
    count: () => 1,
    percent: () => 50,
    released: () => 1,
  };
  const home = w.ATHome(ctx).render();
  for (const key of ['hero', 'feature', 'lineup']) {
    expect(home[key]).toContain('Film · Eureka — Movie 2');
    expect(home[key]).not.toMatch(/S3.*?(EP|Episodi) 1/);
  }
  expect(home.lineup).toContain('E pashë filmin');
  expect(home.feature).not.toContain('at-h3-ep-pill');
});
