import { test, expect, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { mountWelcomeCarousel } from '../../src/modules/welcome-carousel.js';

function fixture(run, reduced = false) {
  const dom = new JSDOM(
    '<div id="welcome"><article class="welcome-poster" data-slot="0"><h2>Demon Slayer</h2></article><article class="welcome-poster" data-slot="1"><h2>Titan</h2></article><article class="welcome-poster" data-slot="2"><h2>One Piece</h2></article><strong id="welcome-selected-title"></strong><span id="welcome-announcement"></span></div>',
    { pretendToBeVisual: true },
  );
  vi.stubGlobal('window', dom.window);
  vi.stubGlobal('MutationObserver', dom.window.MutationObserver);
  dom.window.matchMedia = () => ({ matches: reduced, addEventListener() {} });
  vi.useFakeTimers();
  try {
    run(dom.window.document);
  } finally {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    dom.window.close();
  }
}

test('a brief automatic transition ends and manual browsing still works', () =>
  fixture((page) => {
    const root = page.getElementById('welcome');
    const deck = mountWelcomeCarousel(root);
    vi.advanceTimersByTime(3200);
    expect(root.querySelector('[data-slot="0"] h2').textContent).toBe('Titan');
    vi.advanceTimersByTime(15000);
    expect(root.querySelector('[data-slot="0"] h2').textContent).toBe('Titan');
    deck.select(2, true);
    expect(root.querySelector('[data-slot="0"] h2').textContent).toBe('One Piece');
  }));

test('reduced motion stops automatic browsing while manual selection still works', () =>
  fixture((page) => {
    const root = page.getElementById('welcome');
    const deck = mountWelcomeCarousel(root);
    vi.advanceTimersByTime(15000);
    expect(root.querySelector('[data-slot="0"] h2').textContent).toBe('Demon Slayer');
    deck.select(2, true);
    expect(root.querySelector('[data-slot="0"] h2').textContent).toBe('One Piece');
    expect(root.querySelector('#welcome-announcement').textContent).toBe('One Piece');
  }, true));
