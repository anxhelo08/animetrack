// @vitest-environment jsdom
import { beforeEach, test, expect, vi } from 'vitest';
import { createHTML } from '../../src/modules/safe-html.js';
import { createReadingWorkspace } from '../../src/modules/reading-workspace.js';
import { normalizeReadingLibrary } from '../../src/core/reading-model.js';
import { createDetailNavigation } from '../../src/modules/detail-navigation.js';
beforeEach(() => {
  document.body.innerHTML = '<section id="root"></section>';
  window.ATHTML = createHTML(window);
});
function setup(ok = true) {
  let owner = 'a';
  const state = {
    anime: [],
    readingLibrary: normalizeReadingLibrary([
      {
        id: 'reading-al-7',
        source: 'anilist',
        sourceId: '7',
        malId: '70',
        title: 'Book',
        notes: 'Personal note',
        rating: 9,
        chaptersRead: [1],
        journal: [
          { id: 'old', chapter: 1, action: 'read', note: 'Diary', date: '2026-09-29T12:00:00Z' },
        ],
      },
    ]),
    preferences: {},
  };
  const call = vi.fn(async (payload) =>
    payload.operation === 'list'
      ? {
          MediaListCollection: {
            lists: [
              {
                entries: [
                  {
                    media: { id: 7, idMal: 70, title: { english: 'Book' }, chapters: 0 },
                    status: 'CURRENT',
                    progress: 5,
                    score: 8,
                  },
                ],
              },
            ],
          },
        }
      : {},
  );
  const root = document.getElementById('root'),
    ctx = {
      esc: window.ATHTML.escapeHTML,
      state: () => state,
      user: () => ({ id: owner }),
      save: vi.fn(() => ok),
      toast: vi.fn(),
      confirm: () => true,
      prompt: () => null,
      accountService: { call },
    };
  let mode = 'integration';
  let workspace;
  const render = () => window.ATHTML.renderHTML(root, workspace[mode]());
  workspace = createReadingWorkspace(ctx, render);
  workspace.mount(root);
  render();
  return {
    state,
    ctx,
    root,
    call,
    workspace,
    render,
    mode: (next) => {
      mode = next;
      render();
    },
    owner: (next) => (owner = next),
  };
}
test('reading collection title survives HTML sanitizer and saving failures roll back preferences', () => {
  const f = setup(false);
  f.mode('collections');
  f.root.querySelector('input[name="collectionTitle"]').value = 'Weekend';
  f.root
    .querySelector('form')
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  expect(f.state.preferences.customLists).toBeUndefined();
  f.ctx.save.mockReturnValue(true);
  f.root.querySelector('input[name="collectionTitle"]').value = 'Weekend';
  f.root
    .querySelector('form')
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  expect(f.state.preferences.customLists[0].scope).toBe('reading');
  expect(f.root.querySelector('[data-reading-collection-item]')).not.toBeNull();
});
test('manga preview and explicit pull retain journal and notes without inventing unknown totals', async () => {
  const f = setup();
  f.root.querySelector('[data-reading-extra="sync-preview"]').click();
  await vi.waitFor(() =>
    expect(f.root.querySelector('[data-reading-extra="sync-pull"]')).not.toBeNull(),
  );
  expect(f.root.textContent).toContain('Ndryshim që kërkon');
  f.root.querySelector('[data-reading-extra="sync-pull"]').click();
  await vi.waitFor(() => expect(f.state.readingLibrary[0].chaptersRead).toEqual([1, 2, 3, 4, 5]));
  expect(f.state.readingLibrary[0].totalChapters).toBe(0);
  expect(f.state.readingLibrary[0].notes).toBe('Personal note');
  expect(f.state.readingLibrary[0].journal[0].note).toBe('Diary');
  expect(f.call).toHaveBeenCalledWith(expect.objectContaining({ mediaType: 'MANGA' }));
});
test('reading sync ignores a response after the owner changes', async () => {
  const f = setup();
  let finish;
  f.call.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
  f.root.querySelector('[data-reading-extra="sync-preview"]').click();
  f.owner('b');
  finish({
    MediaListCollection: {
      lists: [{ entries: [{ media: { id: 99, title: { english: 'Other owner' } }, progress: 4 }] }],
    },
  });
  await Promise.resolve();
  await Promise.resolve();
  f.render();
  expect(f.root.textContent).not.toContain('Other owner');
});
test('watch detail tabs preserve unfinished notes and commit through guarded save', () => {
  const root = document.getElementById('root');
  window.ATHTML.renderHTML(
    root,
    '<div class="detail-top">Title</div><div class="episode-list">Episodes</div>',
  );
  const state = { anime: [{ id: 'a', title: 'Book', seasons: [], notes: 'Original' }] },
    save = vi.fn(() => false);
  const details = createDetailNavigation({
    state: () => state,
    user: () => ({ id: 'owner' }),
    esc: window.ATHTML.escapeHTML,
    save,
    toast: vi.fn(),
  });
  details.attach(root, 'a');
  root.querySelector('[data-detail-section="notes"]').click();
  const input = root.querySelector('textarea');
  input.value = 'Unfinished';
  root.querySelector('[data-detail-section="episodes"]').click();
  root.querySelector('[data-detail-section="notes"]').click();
  expect(root.querySelector('textarea')).toBe(input);
  expect(input.value).toBe('Unfinished');
  root
    .querySelector('form')
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  expect(state.anime[0].notes).toBe('Original');
  save.mockReturnValue(true);
  root
    .querySelector('form')
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  expect(state.anime[0].notes).toBe('Unfinished');
});

test('watch notes survive an asynchronous replacement of detail markup', () => {
  const root = document.getElementById('root');
  const state = { anime: [{ id: 'a', title: 'Book', notes: 'Original' }] };
  const details = createDetailNavigation({
    state: () => state,
    user: () => ({ id: 'owner' }),
    esc: window.ATHTML.escapeHTML,
    save: () => true,
    toast: vi.fn(),
  });
  details.attach(root, 'a');
  const input = root.querySelector('textarea');
  input.value = 'Draft';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  root.replaceChildren();
  details.attach(root, 'a');
  expect(root.querySelector('textarea').value).toBe('Draft');
  root
    .querySelector('form')
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  expect(state.anime[0].notes).toBe('Draft');
});
