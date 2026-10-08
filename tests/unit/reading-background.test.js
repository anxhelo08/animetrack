import { expect, it, vi } from 'vitest';
import { normalizeReadingLibrary } from '../../src/core/reading-model.js';
import { refreshReadingChecks } from '../../src/modules/reading-background.js';

function fixture(saveOK = true) {
  let owner = 'reader';
  const state = {
    readingLibrary: normalizeReadingLibrary([
      {
        id: 'reading-demo',
        title: 'Manga',
        totalChapters: 10,
        chaptersRead: [1],
        status: 'reading',
      },
    ]),
  };
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    limit: vi.fn(async () => ({
      data: [
        {
          reading_id: 'reading-demo',
          metadata: { totalChapters: 12 },
          checked_at: '2026-10-08T10:00:00Z',
        },
      ],
    })),
  };
  const from = vi.fn(() => query);
  const ctx = {
    user: () => ({ id: owner }),
    client: () => ({ from }),
    state: () => state,
    save: vi.fn(() => saveOK),
  };
  return {
    ctx,
    state,
    query,
    from,
    setOwner: (value) => {
      owner = value;
    },
  };
}
it('updates release metadata without loading the interface or changing chapter progress', async () => {
  const { ctx, state, query } = fixture();
  await refreshReadingChecks(ctx);
  expect(query.eq).toHaveBeenCalledWith('user_id', 'reader');
  expect(state.readingLibrary[0].totalChapters).toBe(12);
  expect(state.readingLibrary[0].chaptersRead).toEqual([1]);
  expect(ctx.save).toHaveBeenCalledOnce();
});
it('restores the original library if its local save fails', async () => {
  const { ctx, state } = fixture(false);
  const before = structuredClone(state);
  await refreshReadingChecks(ctx);
  expect(state).toEqual(before);
});
it('ignores an old account response after the owner changes', async () => {
  const { ctx, state, setOwner, query } = fixture();
  const before = structuredClone(state);
  query.limit.mockImplementation(async () => {
    setOwner('other');
    return {
      data: [
        {
          reading_id: 'reading-demo',
          metadata: { totalChapters: 99 },
          checked_at: '2026-10-08T10:00:00Z',
        },
      ],
    };
  });
  await refreshReadingChecks(ctx);
  expect(state).toEqual(before);
  expect(ctx.save).not.toHaveBeenCalled();
});
it('does not query release checks when the reading library is empty', async () => {
  const { ctx, state, from } = fixture();
  state.readingLibrary = [];
  await refreshReadingChecks(ctx);
  expect(from).not.toHaveBeenCalled();
});
