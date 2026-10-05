// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';
import '../../src/modules/notifications.js';

beforeEach(() => {
  window.matchMedia = () => ({ matches: true });
});
async function fixture(ok = true) {
  const at = new Date(Date.now() - 3600000).toISOString();
  const state = {
    anime: [{ id: 'a', title: 'Anime', seasons: [{ id: 's', watched: [] }] }],
    readingLibrary: [
      {
        id: 'reading-1',
        title: 'Manhwa',
        chaptersRead: [1],
        chapterReleases: [{ chapter: 2, date: at }],
      },
    ],
    preferences: {},
  };
  const toast = vi.fn();
  const inbox = window.ATNotifications({
    esc: String,
    state: () => state,
    user: () => null,
    client: () => null,
    upcoming: () => [{ animeId: 'a', seasonId: 's', episode: 2, when: Date.parse(at) }],
    el: () => null,
    poster: () => '',
    save: () => ok,
    rerender: vi.fn(),
    toast,
    navigate: vi.fn(),
  });
  await inbox.refresh();
  return { inbox, state, toast };
}
it('marks only the selected category and leaves chapter and episode progress untouched', async () => {
  const { inbox, state } = await fixture();
  const library = structuredClone(state.readingLibrary),
    anime = structuredClone(state.anime);
  await inbox.action('notification-filter', 'reading');
  await inbox.action('notification-read-category');
  expect(state.preferences.notificationRead).toEqual(['reading:reading-1:2']);
  expect(state.readingLibrary).toEqual(library);
  expect(state.anime).toEqual(anime);
  await inbox.action('notification-read-all');
  expect(state.preferences.notificationRead).toHaveLength(2);
});
it('restores unread status and does not pre-mark future chapter notifications', async () => {
  const { inbox, state } = await fixture();
  await inbox.action('notification-read-all');
  await inbox.action('notification-mark-unread', 'reading:reading-1:2');
  expect(state.preferences.notificationRead).not.toContain('reading:reading-1:2');
  state.readingLibrary[0].chapterReleases.push({ chapter: 3, date: new Date().toISOString() });
  await inbox.refresh();
  expect(state.preferences.notificationRead).not.toContain('reading:reading-1:3');
});
it('rolls back a failed save and reports failure instead of bulk success', async () => {
  const { inbox, state, toast } = await fixture(false);
  await inbox.action('notification-read-all');
  expect(state.preferences.notificationRead).toEqual([]);
  expect(toast).toHaveBeenCalledOnce();
  expect(toast.mock.calls[0][0]).toContain('nuk u ruajtën');
  expect(inbox.render()).toContain('notification-read');
});
it('opens reading notifications on phones through the reading command', async () => {
  const { inbox } = await fixture();
  const listener = vi.fn();
  window.addEventListener('at-reading-command', listener, { once: true });
  await inbox.action('notification-open', 'reading:reading-1:2');
  expect(listener).toHaveBeenCalledOnce();
  expect(listener.mock.calls[0][0].detail).toEqual({ id: 'reading-1' });
});
