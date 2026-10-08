import { normalizeReadingLibrary, applyReadingUpdate } from '../core/reading-model.js';

// Reading release checks remain available without downloading the reading interface.
export async function refreshReadingChecks(ctx, render = () => {}) {
  const user = ctx.user()?.id;
  if (!user || !(ctx.state().readingLibrary || []).some((row) => !row.deletedAt)) return;
  const client = ctx.client?.();
  if (!client?.from) return;
  try {
    const result = await client
      .from('anime_reading_checks')
      .select('reading_id,metadata,checked_at')
      .eq('user_id', user)
      .limit(3000);
    if (result.error || ctx.user()?.id !== user) return;
    const state = ctx.state(),
      before = structuredClone(state.readingLibrary || []);
    let changed = false;
    for (const checked of result.data || []) {
      const row = state.readingLibrary?.find(
        (row) => row.id === checked.reading_id && !row.deletedAt,
      );
      if (row && Date.parse(checked.checked_at) > (Date.parse(row.checkedAt) || 0)) {
        applyReadingUpdate(row, checked.metadata, checked.checked_at);
        changed = true;
      }
    }
    if (changed) {
      state.readingLibrary = normalizeReadingLibrary(state.readingLibrary);
      if (!ctx.save()) state.readingLibrary = before;
      render(false);
    }
  } catch {
    /* Existing personal state remains available during a network outage. */
  }
}
