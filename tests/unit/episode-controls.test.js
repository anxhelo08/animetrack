// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from 'vitest';
import { mountEpisodeControls } from '../../src/modules/episode-controls.js';

function fixture({ source = 'TVMaze', saved = true } = {}) {
  document.body.innerHTML =
    '<section id="card"><button data-episode-stars="4">★</button><button data-episode-watch-save>Ruaj</button><input data-episode-watch-url><small data-episode-watch-status></small></section>';
  let state = {
    anime: [
      {
        id: 'a',
        title: 'Show',
        source,
        seasons: [{ id: 's', format: 'TV', watched: [1], episodes: [{ number: 1 }] }],
      },
    ],
    history: [
      {
        id: 'a',
        seasonId: 's',
        episode: 1,
        action: 'watched',
        eventId: 'event',
        date: '2026-09-30T12:00:00Z',
      },
    ],
  };
  const ctx = {
    root: document.getElementById('card'),
    state: () => state,
    restore: (value) => {
      state = value;
    },
    parts: () => ({ a: state.anime[0], s: state.anime[0].seasons[0], n: 1 }),
    episodeRow: (s, n) => s.episodes.find((ep) => ep.number === n),
    save: vi.fn(() => saved),
    render: vi.fn(),
    renderDetail: vi.fn(),
    journal: vi.fn(),
    toast: vi.fn(),
    stamp: () => '2026-10-02T12:00:00Z',
  };
  return ctx;
}
beforeEach(() => {
  vi.restoreAllMocks();
});
test('mounting twice never doubles a rating transaction and the Diary and episode stay consistent', () => {
  const ctx = fixture();
  mountEpisodeControls(ctx);
  mountEpisodeControls(ctx);
  ctx.root.querySelector('[data-episode-stars]').click();
  expect(ctx.save).toHaveBeenCalledTimes(1);
  expect(ctx.state().anime[0].seasons[0].episodes[0].personalRating).toBe(8);
  expect(ctx.state().history[0].diaryRating).toBe(8);
  expect(ctx.state().anime[0].seasons[0].watched).toEqual([1]);
});
test('a failed watch-link save restores every affected series and episode field', () => {
  const ctx = fixture({ saved: false }),
    before = structuredClone(ctx.state());
  mountEpisodeControls(ctx);
  ctx.root.querySelector('input').value = 'https://cinehd.vc/tv/5920';
  ctx.root.querySelector('[data-episode-watch-save]').click();
  expect(ctx.state()).toEqual(before);
  expect(ctx.render).not.toHaveBeenCalled();
  expect(ctx.root.querySelector('small').textContent).toContain('nuk u ruajt');
});
test('an invalid provider link cannot alter progress or call storage', () => {
  const ctx = fixture(),
    before = structuredClone(ctx.state());
  mountEpisodeControls(ctx);
  ctx.root.querySelector('input').value = 'https://anisuge.org/watch/fixture/ep-1';
  ctx.root.querySelector('[data-episode-watch-save]').click();
  expect(ctx.save).not.toHaveBeenCalled();
  expect(ctx.state()).toEqual(before);
});
