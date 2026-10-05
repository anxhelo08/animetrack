import { expect, test } from 'vitest';
import {
  matchesLibraryQuery,
  weebCentralLink,
  titleCatalogLinks,
} from '../../src/core/library-discovery.js';
test('library search recognizes alternate names, punctuation, accents and multiple terms', () => {
  const row = {
    title: "The Player Who Can't Level Up",
    aliases: ['Lojtari që nuk ngrihet'],
    genre: 'Action',
    seasons: [{ title: 'Sezoni i dytë' }],
  };
  expect(matchesLibraryQuery(row, 'player level-up')).toBe(true);
  expect(matchesLibraryQuery(row, 'lojtari qe')).toBe(true);
  expect(matchesLibraryQuery(row, 'dyte')).toBe(true);
  expect(matchesLibraryQuery(row, 'unknown')).toBe(false);
});
test('WeebCentral uses a verified series ID or an encoded title search, never arbitrary URLs', () => {
  const id = '01JABCDEF0123456789ABCDEFG';
  expect(weebCentralLink({ weebCentralId: id, title: 'Title' })).toEqual({
    exact: true,
    url: 'https://weebcentral.com/series/' + id,
  });
  const fallback = weebCentralLink({ weebCentralId: 'javascript:alert(1)', title: 'A & B #1' });
  expect(fallback.exact).toBe(false);
  expect(new URL(fallback.url).searchParams.get('text')).toBe('A & B #1');
});
test('anime and TV source links require valid provider IDs', () => {
  expect(titleCatalogLinks({ source: 'TVMaze', sourceId: '1' })[0].url).toBe(
    'https://www.tvmaze.com/shows/1',
  );
  expect(titleCatalogLinks({ source: 'AniList', sourceId: '101922', malId: '38000' })).toHaveLength(
    2,
  );
  expect(
    titleCatalogLinks({ source: 'AniList', sourceId: '../evil', imdbId: 'javascript:1' }),
  ).toEqual([]);
});
