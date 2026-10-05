// @vitest-environment jsdom
import { test, expect } from 'vitest';
import { createLibraryList } from '../../src/core/library-list.js';
import { createRenderPass } from '../../src/core/render-pass.js';
import { createHTML } from '../../src/modules/safe-html.js';
test('500 rows render progressively, patch the changed counter and preserve all card roots and posters', () => {
  const grid = document.createElement('div');
  document.body.replaceChildren(grid);
  let intersect;
  class Observer {
    constructor(fn) {
      intersect = fn;
    }
    observe() {}
    disconnect() {}
  }
  const html = createHTML(window),
    rows = Array.from({ length: 500 }, (_, i) => ({ id: String(i), watched: 3 }));
  const list = createLibraryList({
    grid,
    html,
    Observer,
    cardHTML: (row) =>
      `<article><img src="/welcome/demon-slayer.jpg"><span>${row.watched}/12</span><i class="at-p${row.watched}"></i><button>+1</button></article>`,
  });
  list.render(rows, 'owner');
  expect(grid.children).toHaveLength(30);
  const roots = [...grid.children],
    posters = roots.map((n) => n.firstChild);
  rows[0].watched = 4;
  list.render(rows, 'owner');
  expect(grid.firstChild.textContent).toContain('4/12');
  roots.forEach((n, i) => {
    expect(grid.children[i]).toBe(n);
    expect(n.firstChild).toBe(posters[i]);
  });
  intersect([{ isIntersecting: true }]);
  expect(grid.children).toHaveLength(60);
  list.render(
    rows.filter((r) => r.id === '499'),
    'search',
  );
  expect(grid.children).toHaveLength(1);
  expect(grid.firstChild.dataset.libraryId).toBe('499');
  list.render([{ id: '0', watched: 1 }], 'another-owner');
  expect(grid.firstChild).not.toBe(roots[0]);
  list.destroy();
});
test('render requests are coalesced per view into a single animation frame', () => {
  const frames = [],
    calls = [],
    render = createRenderPass(
      {
        library: () => calls.push('library'),
        home: () => calls.push('home'),
        upcoming: () => calls.push('upcoming'),
      },
      (fn) => frames.push(fn),
    );
  for (let i = 0; i < 4; i++) {
    render('library');
    render('home');
    render('upcoming');
  }
  expect(frames).toHaveLength(1);
  expect(calls).toEqual([]);
  frames.shift()();
  expect(calls).toEqual(['library', 'home', 'upcoming']);
});
