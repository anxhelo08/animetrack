// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createHTML } from '../../src/modules/safe-html.js';
import '../../src/modules/iphone.js';

beforeEach(() => {
  document.body.innerHTML = '<section id="home-view"></section>';
  localStorage.clear();
  const html = createHTML(window);
  window.ATHTML = { ...html, renderHTML: vi.fn(html.renderHTML) };
  window.ATEpisodeHub127 = {
    classify: vi.fn((items) => ({
      all: items,
      active: items,
      stale: [],
      newEpisodes: new Map(),
    })),
    lastTouched: () => Date.now(),
  };
});
afterEach(() => vi.restoreAllMocks());

function fixture({ phone = true, replacement = true } = {}) {
  let mobile = phone,
    owner = 'first';
  window.matchMedia = (query) => ({
    matches: query === '(max-width:760px)' && mobile,
  });
  if (replacement) {
    const home = document.createElement('div');
    home.id = 'mobile-home';
    document.getElementById('home-view').append(home);
  }
  const season = {
    id: 'season',
    title: 'Sezoni 1',
    format: 'TV',
    total: 3,
    watched: [1],
    episodes: [],
  };
  const anime = {
    id: 'story',
    title: 'Historia ime',
    status: 'watching',
    seasons: [season],
  };
  const state = { anime: [anime], history: [] };
  const ctx = {
    esc: window.ATHTML.escapeHTML,
    state: vi.fn(() => state),
    user: vi.fn(() => ({ id: owner })),
    el: (id) => document.getElementById(id),
    poster: () => '',
    upcoming: vi.fn(() => []),
    recentAiring: vi.fn(() => []),
    accountName: () => 'Lexuesi',
    count: () => season.watched.length,
    releasedTotal: () => season.total,
    released: () => season.total,
    percent: () => Math.round((season.watched.length / season.total) * 100),
    nextEpisode: () => {
      const n = [1, 2, 3].find((n) => !season.watched.includes(n));
      return n ? { season, n } : null;
    },
    markNext: vi.fn(() => {
      season.watched.push(ctx.nextEpisode().n);
      return true;
    }),
    undoEpisode: vi.fn((_id, _seasonId, n) => {
      season.watched = season.watched.filter((seen) => seen !== n);
      return true;
    }),
  };
  const feed = window.ATiPhone(ctx);
  feed.mount();
  const render = window.ATHTML.renderHTML;
  return {
    feed,
    ctx,
    season,
    render,
    node: document.getElementById('at-iphone-feed'),
    setPhone: (value) => (mobile = value),
    setOwner: (value) => (owner = value),
  };
}

test('the replaced phone feed skips library computations and HTML rendering', () => {
  const { feed, ctx, render, node } = fixture();
  feed.refresh();
  feed.refresh();
  expect(ctx.state).not.toHaveBeenCalled();
  expect(ctx.upcoming).not.toHaveBeenCalled();
  expect(ctx.recentAiring).not.toHaveBeenCalled();
  expect(window.ATEpisodeHub127.classify).not.toHaveBeenCalled();
  expect(render).not.toHaveBeenCalled();
  expect(node.childElementCount).toBe(0);
  expect(document.body.classList.contains('at-ios-enabled')).toBe(true);
});

test.each([
  { phone: true, replacement: false },
  { phone: false, replacement: true },
])('the legacy feed still renders with fallback settings %j', (options) => {
  const { feed, ctx, render, node } = fixture(options);
  feed.refresh();
  expect(ctx.state).toHaveBeenCalled();
  expect(render).toHaveBeenCalledOnce();
  expect(node.querySelector('[data-ios-action="advance"]')).not.toBeNull();
  expect(node.textContent).toContain('Historia ime');
});

test('a phone advance keeps its undo when the legacy view becomes available', async () => {
  const { feed, ctx, season, render, node, setPhone } = fixture();
  await feed.action('advance', 'story');
  expect(ctx.markNext).toHaveBeenCalledOnce();
  expect(season.watched).toEqual([1, 2]);
  expect(render).not.toHaveBeenCalled();
  setPhone(false);
  feed.refresh();
  expect(node.querySelector('[data-ios-action="undo"]')).not.toBeNull();
  await feed.action('undo');
  expect(ctx.undoEpisode).toHaveBeenCalledWith('story', 'season', 2);
  expect(season.watched).toEqual([1]);
});

test('switching accounts cannot undo an episode marked by the prior owner', async () => {
  const { feed, ctx, season, setOwner, render } = fixture();
  await feed.action('advance', 'story');
  setOwner('second');
  await feed.action('undo');
  expect(ctx.undoEpisode).not.toHaveBeenCalled();
  expect(season.watched).toEqual([1, 2]);
  expect(render).not.toHaveBeenCalled();
});
