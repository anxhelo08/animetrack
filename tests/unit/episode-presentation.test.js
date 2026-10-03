// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { createHTML } from '../../src/modules/safe-html.js';
import { presentEpisode } from '../../src/modules/episode-presentation.js';
it('shows an episode NEW badge only within the same seven-day release window', () => {
  function draw(date) {
    document.body.innerHTML =
      '<section id="episode-detail-modal"><h2 id="ep-detail-heading"></h2><div id="ep-detail-body"></div></section>';
    window.ATHTML = createHTML(window);
    const a = { id: 'anime', title: 'Story', genre: 'Action' },
      s = { id: 'season', format: 'TV', watched: [] };
    presentEpisode({
      parts: () => ({ a, s, n: 1, ep: { airedAt: date } }),
      el: (id) => document.getElementById(id),
      seasonNumber: () => 1,
      history: () => [],
      poster: () => '',
      esc: window.ATHTML.escapeHTML,
      released: () => 2,
    });
    return !!document.querySelector('.episode-new-badge');
  }
  expect(draw(new Date(Date.now() - 86400000).toISOString())).toBe(true);
  expect(draw(new Date(Date.now() - 8 * 86400000).toISOString())).toBe(false);
  expect(draw(new Date(Date.now() + 86400000).toISOString())).toBe(false);
});
