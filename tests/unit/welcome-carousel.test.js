import { test, expect, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { mountWelcomeCarousel } from '../../src/modules/welcome-carousel.js';

function fixture(run, reduced = false) {
  const dom = new JSDOM(
    '<div id="welcome"><article class="welcome-poster" data-slot="0"><h2>Demon Slayer</h2></article><article class="welcome-poster" data-slot="1"><h2>Titan</h2></article><article class="welcome-poster" data-slot="2"><h2>One Piece</h2></article><strong id="welcome-selected-title"></strong><span id="welcome-announcement"></span><button class="welcome-motion"></button></div>',
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

test('the next real poster moves to the foreground and pause stops automatic browsing', () =>
  fixture((page) => {
    const root = page.getElementById('welcome');
    mountWelcomeCarousel(root);
    vi.advanceTimersByTime(5000);
    expect(root.querySelector('[data-slot="0"] h2').textContent).toBe('Titan');
    root.querySelector('.welcome-motion').click();
    vi.advanceTimersByTime(15000);
    expect(root.querySelector('[data-slot="0"] h2').textContent).toBe('Titan');
    root.querySelector('.welcome-motion').click();
    vi.advanceTimersByTime(5000);
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
