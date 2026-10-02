// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';
import { createHTML } from '../../src/modules/safe-html.js';
import { createReading } from '../../src/modules/reading.js';
import { normalizeReadingLibrary } from '../../src/core/reading-model.js';

beforeEach(() => {
  document.body.innerHTML = '<main></main><section id="home-view"></section>';
  window.ATHTML = createHTML(window);
  window.matchMedia = () => ({ matches: false, addEventListener() {} });
  window.scrollTo = vi.fn();
});
function fixture(ok = true) {
  const state = {
    anime: [],
    history: [],
    readingLibrary: normalizeReadingLibrary([
      {
        id: 'reading-demo',
        title: 'My manga',
        kind: 'manga',
        status: 'reading',
        totalChapters: 5,
        chaptersRead: [1],
      },
    ]),
  };
  const toast = vi.fn(),
    save = vi.fn(() => ok);
  const reading = createReading({
    esc: window.ATHTML.escapeHTML,
    poster: () => '',
    user: () => ({ id: 'a' }),
    state: () => state,
    save,
    toast,
    el: (id) => document.getElementById(id),
    navigate: vi.fn(),
    confirm: () => true,
  });
  reading.mount(document.querySelector('main'));
  reading.open('reading');
  return { state, reading, save, toast };
}
it('a rejected local save rolls back chapter progress and never reports success', () => {
  const { state, toast } = fixture(false),
    before = structuredClone(state);
  document.querySelector('[data-reading-action="next"]').click();
  expect(state).toEqual(before);
  expect(toast).not.toHaveBeenCalled();
});
it('background renders preserve an unfinished note while an explicit save commits it', () => {
  const { state, reading, save } = fixture();
  document.querySelector('[data-reading-action="detail"]').click();
  const input = document.querySelector('[name="notes"]');
  input.value = 'Still typing';
  input.focus();
  reading.render(false);
  expect(document.querySelector('[name="notes"]')).toBe(input);
  expect(input.value).toBe('Still typing');
  document
    .querySelector('#reading-personal-form')
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  expect(save).toHaveBeenCalledOnce();
  expect(state.readingLibrary[0].notes).toBe('Still typing');
  expect(state.anime).toEqual([]);
  expect(state.history).toEqual([]);
});
