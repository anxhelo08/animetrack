// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';
import { createHTML } from '../../src/modules/safe-html.js';
vi.mock('../../src/modules/reading-catalog.js', async (original) => ({
  ...(await original()),
  searchReadingCatalog: vi.fn(),
}));
import { searchReadingCatalog } from '../../src/modules/reading-catalog.js';
import { createReading } from '../../src/modules/reading.js';
import { normalizeReadingLibrary } from '../../src/core/reading-model.js';

beforeEach(() => {
  document.body.innerHTML = '<main></main><section id="home-view"></section>';
  window.ATHTML = createHTML(window);
  window.matchMedia = () => ({ matches: false, addEventListener() {} });
  window.scrollTo = vi.fn();
});
function fixture(ok = true, poster = () => '') {
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
    poster,
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

it('library typing keeps the actual search node and hero mounted', () => {
  const { reading } = fixture();
  const input = document.querySelector('#reading-query');
  const hero = document.querySelector('.reading-hero');
  input.focus();
  input.value = 'My';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  reading.render(false);
  expect(document.querySelector('#reading-query')).toBe(input);
  expect(document.querySelector('.reading-hero')).toBe(hero);
  expect(document.activeElement).toBe(input);
});
it('bulk completion remains reading for an ongoing title and preserves the journal', () => {
  const { state } = fixture();
  state.readingLibrary[0].publicationStatus = 'RELEASING';
  document.querySelector('[data-reading-action="detail"]').click();
  document.querySelector('[data-reading-action="read-all"]').click();
  expect(state.readingLibrary[0].chaptersRead).toEqual([1, 2, 3, 4, 5]);
  expect(state.readingLibrary[0].status).toBe('reading');
  expect(state.readingLibrary[0].journal).toHaveLength(4);
});

it('an imported read chapter can receive a journal note without changing progress', () => {
  const { state } = fixture();
  document.querySelector('[data-reading-action="detail"]').click();
  document.querySelector('#reading-chapter-note-form [name="chapter"]').value = '1';
  document
    .querySelector('#reading-chapter-note-form')
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  expect(document.querySelector('#reading-journal-form')).not.toBeNull();
  expect(state.readingLibrary[0].chaptersRead).toEqual([1]);
  expect(state.readingLibrary[0].journal[0].chapter).toBe(1);
});

it('unknown chapter totals show verified reading progress without a question-mark denominator', () => {
  const { state, reading } = fixture();
  state.readingLibrary[0].totalChapters = 0;
  state.readingLibrary[0].chaptersRead = Array.from({ length: 132 }, (_, i) => i + 1);
  state.readingLibrary[0].publicationStatus = 'RELEASING';
  reading.render();
  const card = document.querySelector('.reading-card');
  expect(card.querySelector('.reading-card-progress').textContent).toBe('132 kapituj të lexuar');
  expect(card.textContent).toContain('Totali ende i pakonfirmuar');
  expect(card.textContent).not.toContain('?');
  expect(state.readingLibrary[0].totalChapters).toBe(0);
  expect(state.readingLibrary[0].chaptersRead).toHaveLength(132);
});

it('removes directly from details and restores every personal field with undo', () => {
  const { state } = fixture();
  state.readingLibrary[0].notes = 'Keep this note';
  state.readingLibrary[0].rating = 8;
  const before = structuredClone(state.readingLibrary[0]);
  document.querySelector('[data-reading-action="detail"]').click();
  document.querySelector('[data-reading-action="delete"]').click();
  expect(state.readingLibrary[0].deletedAt).not.toBe('');
  expect(document.querySelector('.reading-card')).toBeNull();
  document.querySelector('[data-reading-action="restore"]').click();
  expect(state.readingLibrary[0]).toEqual({
    ...before,
    updatedAt: state.readingLibrary[0].updatedAt,
  });
  expect(document.querySelector('#reading-detail-title').textContent).toBe('My manga');
});
it('failed removal preserves the row and offers no misleading undo', () => {
  const { state } = fixture(false);
  const before = structuredClone(state.readingLibrary);
  document.querySelector('[data-reading-action="detail"]').click();
  document.querySelector('[data-reading-action="delete"]').click();
  expect(state.readingLibrary).toEqual(before);
  expect(document.querySelector('.reading-removed')).toBeNull();
});
it('restarting preserves notes and ratings, and records unread changes in the journal', () => {
  const { state } = fixture();
  Object.assign(state.readingLibrary[0], {
    notes: 'My notes',
    rating: 9,
    favorite: true,
    volumesRead: 1,
  });
  document.querySelector('[data-reading-action="detail"]').click();
  document.querySelector('[data-reading-action="restart"]').click();
  expect(state.readingLibrary[0]).toMatchObject({
    chaptersRead: [],
    volumesRead: 0,
    status: 'reading',
    notes: 'My notes',
    rating: 9,
    favorite: true,
  });
  expect(state.readingLibrary[0].journal).toContainEqual(
    expect.objectContaining({ chapter: 1, action: 'unread' }),
  );
  expect(state.anime).toEqual([]);
});
it('shows escaped alternate titles, confirmed source links and accurate progress with gaps', () => {
  const { state } = fixture();
  Object.assign(state.readingLibrary[0], {
    aliases: ['<img src=x onerror=alert(1)>'],
    mangaUpdatesId: '123',
    chaptersRead: [1, 3],
    sourceId: '42',
  });
  document.querySelector('[data-reading-action="detail"]').click();
  expect(document.querySelector('.reading-personal-summary').textContent).toContain('2 / 5');
  expect(document.querySelector('.reading-personal-summary').textContent).toContain(
    'Kapitulli i radhës2',
  );
  expect(document.querySelector('.reading-synopsis li').textContent).toBe(
    '<img src=x onerror=alert(1)>',
  );
  expect(document.querySelector('.reading-synopsis img')).toBeNull();
  expect(
    document.querySelector('a[href="https://www.mangaupdates.com/series.html?id=123"]'),
  ).not.toBeNull();
  document.querySelector('[data-reading-action="last-chapter"]').click();
  expect(document.querySelector('#reading-chapter-query').value).toBe('5');
  expect(state.readingLibrary[0].chaptersRead).toEqual([1, 3]);
});

it('background metadata renders retain an open management menu', () => {
  const { reading } = fixture();
  document.querySelector('[data-reading-action="detail"]').click();
  document.querySelector('.reading-manage').open = true;
  reading.render();
  expect(document.querySelector('.reading-manage').open).toBe(true);
});

it('an obsolete search cannot repaint while the next query is being typed', async () => {
  vi.useFakeTimers();
  let resolve;
  searchReadingCatalog.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const { reading } = fixture();
  try {
    document.querySelector('[data-reading-action="tab"][data-id="discover"]').click();
    const input = document.querySelector('#reading-query');
    input.focus();
    input.value = 'New query';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const grid = document.querySelector('.reading-grid');
    resolve({ items: [], hasNext: false });
    await Promise.resolve();
    await Promise.resolve();
    expect(document.querySelector('.reading-grid')).toBe(grid);
    expect(document.querySelector('#reading-query')).toBe(input);
    expect(input.value).toBe('New query');
  } finally {
    reading.hide();
    vi.useRealTimers();
  }
});

it('reopening and unchanged background checks retain reading cards and cover images', () => {
  const { reading } = fixture(true, () => '/icon.svg');
  const card = document.querySelector('[data-reading-title]');
  const cover = card.querySelector('img');
  const content = document.getElementById('reading-content');
  reading.hide();
  reading.open('reading');
  reading.render(false);
  expect(document.getElementById('reading-content')).toBe(content);
  expect(document.querySelector('[data-reading-title]')).toBe(card);
  expect(card.querySelector('img')).toBe(cover);
  reading.hide();
});

it('a changed chapter total replaces only its reading card and retains other titles', () => {
  const { reading, state } = fixture();
  state.readingLibrary.push({
    ...structuredClone(state.readingLibrary[0]),
    id: 'second-reading',
    title: 'Second manga',
  });
  reading.render();
  const first = document.querySelector('[data-reading-title="reading-demo"]');
  const second = document.querySelector('[data-reading-title="second-reading"]');
  state.readingLibrary[0].totalChapters = 12;
  reading.render(false);
  expect(document.querySelector('[data-reading-title="reading-demo"]')).not.toBe(first);
  expect(document.querySelector('[data-reading-title="reading-demo"]').textContent).toContain('12');
  expect(document.querySelector('[data-reading-title="second-reading"]')).toBe(second);
  reading.hide();
});
