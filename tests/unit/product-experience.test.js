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
function fixture() {
  document.body.innerHTML =
    '<nav id="side-nav">' +
    [
      'home-nav',
      'library-nav',
      'explore-nav',
      'pro-nav-diary',
      'pro-nav-profile',
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
    '</nav><main><header class="topbar"><h1 id="page-title"></h1></header><section id="home-view"><div id="at-home-main"></div><div id="at-iphone-feed"></div></section><section id="library-view"></section><section id="pro-view"></section></main><input id="global-search"><input id="import-file" type="file">';
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
  expect(document.querySelectorAll('#side-nav > button')).toHaveLength(5);
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
