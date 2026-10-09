// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { createHTML } from '../../src/modules/safe-html.js';
import { watchProviders } from '../../src/core/watch-links.js';
import { episodeWatchPanel } from '../../src/modules/episode-watch.js';
import '../../src/modules/watch.js';
beforeEach(() => {
  window.ATHTML = createHTML(window);
  localStorage.clear();
});
it('Where to Watch displays the additional film provider without claiming confirmed availability', async () => {
  const state = { preferences: {}, anime: [] };
  const watch = window.ATWatch133({
    state: () => state,
    esc: window.ATHTML.escapeHTML,
    watchProviders,
  });
  const result = await watch.load(
    { id: 'film', title: 'Film', source: 'Cinemeta', format: 'MOVIE' },
    null,
    { force: true },
  );
  expect(result.categories).toEqual([]);
  expect(result.discovery.map((p) => p.name)).toEqual(['CineHD', 'Atlantic']);
  expect(result.discovery[1].url).toBe('https://atlantic.st/');
});
it('episode panels offer external searches and show the provider of a saved exact episode URL', () => {
  const url = 'https://beta.way2movies.live/watch/example?episode=3';
  const panel = episodeWatchPanel(
    { esc: window.ATHTML.escapeHTML },
    {
      a: { source: 'AniList', title: 'Black Clover' },
      s: { title: 'Season 1', format: 'TV' },
      n: 3,
      ep: { watchUrl: url },
    },
    'EP 3',
  );
  expect(panel.querySelector('a').href).toBe(url);
  expect(panel.querySelector('a').textContent).toContain('Way2Movies');
  expect(panel.querySelector('[data-episode-watch-url]').value).toBe(url);
  expect(panel.querySelector('a[href^="https://www.google.com/search?"]').search).toContain(
    'episode+3',
  );
  expect(panel.textContent).toContain('Way2Movies');
  for (const anchor of panel.querySelectorAll('a')) {
    expect(anchor.target).toBe('_blank');
    expect(anchor.rel).toContain('noopener');
  }
});
