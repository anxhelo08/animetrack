import { expect, test } from 'vitest';
import {
  watchProvider,
  episodeWatchURL,
  watchEpisodeTarget,
  watchLinkPlan,
} from '../../src/core/watch-links.js';
import { createLibraryModel } from '../../src/core/library-model.js';

test('episode links preserve the supplied path, query and fragment for the matching provider', () => {
  const anime = watchProvider({ source: 'AniList' });
  const tv = watchProvider({ format: 'TV_SERIES' });
  expect(episodeWatchURL('https://anisuge.org/watch/fixture?ep=7#player', anime)).toBe(
    'https://anisuge.org/watch/fixture?ep=7#player',
  );
  expect(episodeWatchURL('https://cinehd.vc/watch/fixture?ep=7', tv)).toBe(
    'https://cinehd.vc/watch/fixture?ep=7',
  );
  expect(episodeWatchURL('https://anisuge.org/watch/fixture', tv)).toBe('');
});
test('episode links reject scripts, credentials and lookalike domains', () => {
  for (const url of [
    'javascript:alert(1)',
    'http://anisuge.org/watch/fixture',
    'https://anisuge.org.evil.test/watch',
    'https://user:pass@cinehd.vc/watch',
    'https://cinehd.vc:444/watch',
    'https://other.test/watch',
  ])
    expect(episodeWatchURL(url)).toBe('');
});
test('normalization preserves a supplied episode link through export and reload', () => {
  const model = createLibraryModel();
  const raw = {
    id: 'show',
    title: 'Show',
    seasons: [
      {
        id: 's',
        total: 2,
        episodes: [
          { number: 1, watchUrl: 'https://cinehd.vc/watch/fixture?ep=1' },
          { number: 2, watchUrl: 'javascript:alert(1)' },
        ],
      },
    ],
  };
  raw.seasons[0].watchUrl = 'https://anisuge.org/watch/fixture-season/ep-1';
  const restored = model.normalized(JSON.parse(JSON.stringify(model.normalized(raw))));
  expect(restored.seasons[0].episodes[0].watchUrl).toBe(raw.seasons[0].episodes[0].watchUrl);
  expect(restored.seasons[0].episodes[1]).not.toHaveProperty('watchUrl');
  expect(restored.seasons[0].watchUrl).toBe(raw.seasons[0].watchUrl);
  expect(
    watchEpisodeTarget(
      { source: 'AniList' },
      restored.seasons[0],
      2,
      restored.seasons[0].episodes[1],
    ),
  ).toBe('https://anisuge.org/watch/fixture-season/ep-2');
});

test('Anisuge follows the supplied season identity and changes only the episode number', () => {
  const base = 'https://anisuge.org/watch/attack-on-titan-the-last-attack-jbdxh/ep-1';
  expect(watchEpisodeTarget({ source: 'AniList' }, { format: 'TV', watchUrl: base }, 7, {})).toBe(
    base.replace('/ep-1', '/ep-7'),
  );
  expect(
    watchEpisodeTarget({ source: 'AniList' }, { format: 'MOVIE', watchUrl: base }, 7, {}),
  ).toBe('');
  expect(watchEpisodeTarget({ source: 'TVMaze' }, { format: 'TV', watchUrl: base }, 7, {})).toBe(
    '',
  );
  expect(watchEpisodeTarget({ source: 'AniList' }, { format: 'TV', watchUrl: base }, 0, {})).toBe(
    '',
  );
});

test('CineHD opens a supplied series page without inventing an episode query', () => {
  const season = { format: 'TV', watchUrl: 'https://cinehd.vc/tv/5920' };
  expect(watchEpisodeTarget({ format: 'TV_SERIES' }, season, 7, {})).toBe(season.watchUrl);
  expect(
    watchEpisodeTarget(
      { format: 'TV_SERIES' },
      { ...season, watchUrl: 'https://cinehd.vc/watch/tv' },
      7,
      {},
    ),
  ).toBe('');
});

test('Anisuge preserves numbering differences between the library and the supplied current episode', () => {
  const anime = { source: 'AniList' },
    season = { format: 'TV' };
  const plan = watchLinkPlan(
    anime,
    season,
    3,
    'https://anisuge.org/watch/one-piece-example/ep-1170',
  );
  expect(plan).toMatchObject({ scope: 'season', offset: 1167 });
  const configured = { ...season, watchUrl: plan.url, watchEpisodeOffset: plan.offset };
  expect(watchEpisodeTarget(anime, configured, 3, {})).toBe(plan.url);
  expect(watchEpisodeTarget(anime, configured, 4, {})).toBe(
    'https://anisuge.org/watch/one-piece-example/ep-1171',
  );
  const model = createLibraryModel();
  const restored = model.normalized({
    id: 'anime',
    title: 'One Piece',
    source: 'AniList',
    seasons: [{ id: 's', total: 10, ...configured }],
  });
  expect(watchEpisodeTarget(restored, restored.seasons[0], 4, {})).toBe(
    'https://anisuge.org/watch/one-piece-example/ep-1171',
  );
});
test('CineHD can reuse one supplied series URL across seasons while an episode link takes precedence', () => {
  const anime = { format: 'TV_SERIES', watchUrl: 'https://cinehd.vc/tv/5920' };
  const plan = watchLinkPlan(anime, { format: 'TV' }, 1, anime.watchUrl);
  expect(plan.scope).toBe('series');
  expect(watchEpisodeTarget(anime, { format: 'TV' }, 7, {})).toBe(anime.watchUrl);
  expect(
    watchEpisodeTarget(anime, { format: 'TV' }, 7, {
      watchUrl: 'https://cinehd.vc/watch/fixture?episode=7',
    }),
  ).toBe('https://cinehd.vc/watch/fixture?episode=7');
  const model = createLibraryModel(),
    restored = model.normalized({
      id: 'tv',
      title: 'The Mentalist',
      ...anime,
      seasons: [{ id: 's', format: 'TV', total: 7 }],
    });
  expect(restored.watchUrl).toBe(anime.watchUrl);
  expect(
    watchLinkPlan(anime, { format: 'TV' }, 1, 'https://anisuge.org/watch/fixture/ep-1').error,
  ).toContain('CineHD');
});
