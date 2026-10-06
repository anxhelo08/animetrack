// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from 'vitest';
import { syncPresentation, createProductExperience } from '../../src/modules/product-experience.js';
import { createHTML } from '../../src/modules/safe-html.js';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  document.body.className = '';
});
test('pending and conflicting changes can never be presented as synced', () => {
  const status = { mode: 'cloud', connected: true, dirty: true, saving: false, conflict: false };
  expect(syncPresentation(status).kind).toBe('pending');
  expect(syncPresentation({ ...status, saving: true }).kind).toBe('saving');
  expect(syncPresentation(status, false).kind).toBe('offline');
  expect(syncPresentation({ ...status, conflict: true }, false).kind).toBe('conflict');
  expect(syncPresentation({ ...status, dirty: false }).kind).toBe('synced');
  expect(status.dirty).toBe(true);
});
test('sync status belongs to the application when the welcome page has its own main', () => {
  fixture({ welcome: true });
  const status = document.getElementById('mobile-sync-status');
  expect(document.querySelector('main.main').contains(status)).toBe(true);
  expect(document.getElementById('welcome-page').contains(status)).toBe(false);
  expect(status.dataset.state).toBe('synced');
});
function fixture({ welcome = false } = {}) {
  document.body.innerHTML =
    '<nav id="side-nav">' +
    [
      'home-nav',
      'library-nav',
      'explore-nav',
      'pro-nav-diary',
      'pro-nav-profile',
      'pro-nav-reading',
      'pro-nav-calendar',
      'seasons-nav',
      'pro-nav-collections',
      'pro-nav-friends',
      'pro-nav-watch',
      'statistics-nav',
      'upcoming-nav',
      'pro-nav-wrapped',
      'pro-nav-notifications',
      'pro-nav-recommendations',
    ]
      .map((id) => `<button id="${id}" class="nav-btn">Page</button>`)
      .join('') +
    '</nav><main class="main"><header class="topbar"><h1 id="page-title"></h1></header><section id="home-view"><div id="at-home-main"></div><div id="at-iphone-feed"></div></section><section id="library-view"></section><section id="pro-view"></section></main><input id="global-search"><input id="import-file" type="file">';
  if (welcome) {
    const section = document.createElement('section');
    section.id = 'welcome-page';
    section.hidden = true;
    const hero = document.createElement('main');
    hero.className = 'welcome-hero';
    section.append(hero);
    document.body.prepend(section);
  }
  window.ATHTML = createHTML(window);
  let user = { id: 'first' };
  const state = { anime: [], preferences: {} };
  const ctx = {
    esc: window.ATHTML.escapeHTML,
    state: () => state,
    user: () => user,
    watchSaveStatus: () => ({ mode: 'cloud', connected: true }),
    navigate: vi.fn(),
    openSettings: vi.fn(),
    searchOnline: vi.fn(),
    openAccount: vi.fn(),
  };
  // The renderer's public escape helper is supplied by core in production.
  ctx.esc = (value) =>
    String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  const product = createProductExperience(ctx);
  product.mount();
  return { product, state, ctx, setUser: (id) => (user = { id }) };
}
test('onboarding is isolated per account and navigation leaves the library unchanged', () => {
  const { product, state, setUser } = fixture();
  const before = JSON.stringify(state);
  expect(document.querySelector('#product-onboarding').classList.contains('product-hidden')).toBe(
    false,
  );
  document.querySelector('[data-product-action="guide-skip"]').click();
  expect(localStorage.getItem('animetrack_onboarding_140_first')).toBe('done');
  product.navigation('calendar');
  expect(document.querySelector('#pro-nav-diary').getAttribute('aria-current')).toBe('page');
  expect(document.querySelectorAll('#side-nav > button')).toHaveLength(6);
  setUser('second');
  product.refresh();
  expect(document.querySelector('#product-onboarding').classList.contains('product-hidden')).toBe(
    false,
  );
  expect(localStorage.getItem('animetrack_onboarding_140_second')).toBe(null);
  setUser('first');
  product.refresh();
  expect(document.querySelector('#product-onboarding').classList.contains('product-hidden')).toBe(
    true,
  );
  expect(JSON.stringify(state)).toBe(before);
});
test('skipping still works when local storage is unavailable', () => {
  const { product } = fixture();
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('storage full');
  });
  document.querySelector('[data-product-action="guide-skip"]').click();
  product.refresh();
  expect(document.querySelector('#product-onboarding').classList.contains('product-hidden')).toBe(
    true,
  );
  expect(document.querySelector('#product-home-empty').classList.contains('product-hidden')).toBe(
    false,
  );
});

test('a failed connection remains visible while local changes are waiting to sync', () => {
  const failed = { mode: 'cloud', connected: false, dirty: true, saving: false };
  expect(syncPresentation(failed)).toMatchObject({ kind: 'error', label: 'Lidhja nuk u krye' });
  expect(syncPresentation(failed).text).toContain('ruajtur në pajisje');
  expect(syncPresentation(failed, false).kind).toBe('offline');
  expect(syncPresentation({ ...failed, saving: true }).kind).toBe('saving');
  expect(syncPresentation({ ...failed, connected: true }).kind).toBe('pending');
});

test('mobile sync state exposes last server time and saving, conflict and offline transitions', () => {
  const { product, ctx } = fixture();
  let status = { mode: 'cloud', connected: true, lastSyncedAt: '2026-10-05T12:00:00Z' };
  ctx.watchSaveStatus = () => status;
  product.refresh();
  const node = document.querySelector('#mobile-sync-status');
  expect(node.dataset.state).toBe('synced');
  expect(node.textContent).toContain(
    new Date(status.lastSyncedAt).toLocaleTimeString('sq-AL', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  );
  status = { ...status, dirty: true, saving: true };
  product.refresh();
  expect(node.dataset.state).toBe('saving');
  status = { ...status, conflict: true };
  product.refresh();
  expect(node.dataset.state).toBe('conflict');
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  status = { ...status, conflict: false, saving: false };
  product.refresh();
  expect(node.dataset.state).toBe('offline');
});
