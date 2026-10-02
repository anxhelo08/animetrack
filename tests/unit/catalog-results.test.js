import { describe, expect, it } from 'vitest';
import { groupCatalogResults, linkedAnimeMedia } from '../../src/modules/catalog-results.js';

const part = (id, year, title = 'Attack on Titan') => ({
  key: 'al-' + id,
  source: 'AniList',
  sourceId: String(id),
  title,
  format: 'TV',
  year,
});
const relation = (id, relationType = 'SEQUEL', format = 'TV') => ({
  id,
  relationType,
  type: 'ANIME',
  format,
});
describe('official catalogue families', () => {
  it('groups connected seasons and films chronologically across different titles without mutating records', () => {
    const first = { ...part(1, 2013), catalogRelations: [relation(2)] };
    const second = { ...part(2, 2017, 'Shingeki no Kyojin 2'), catalogRelations: [relation(3)] };
    const film = { ...part(3, 2024, 'The Last Attack'), format: 'MOVIE' };
    const input = [film, second, first],
      original = structuredClone(input);
    const groups = groupCatalogResults(input);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe('al-1');
    expect(groups[0].catalogParts.map((item) => item.key)).toEqual(['al-1', 'al-2', 'al-3']);
    expect(input).toEqual(original);
  });
  it('does not merge similar names, unrelated relation types, other media, or duplicate keys', () => {
    const a = { ...part(1, 2013), catalogRelations: [relation(2, 'CHARACTER')] };
    const b = part(2, 2017, 'Attack on Titan Season 2');
    const tv = { ...part(3, 2020), kind: 'tv', source: 'TVMaze' };
    expect(groupCatalogResults([a, b, tv, a])).toHaveLength(3);
    expect(groupCatalogResults([a, b])[0].catalogParts).toHaveLength(1);
  });
  it('joins matching provider IDs even when one result uses MyAnimeList', () => {
    const a = { ...part(1, 2013), malId: '55' };
    const b = {
      ...part(2, 2017),
      source: 'MyAnimeList',
      sourceId: '56',
      catalogRelations: [{ ...relation(1), idMal: 55 }],
    };
    expect(groupCatalogResults([a, b])).toHaveLength(1);
  });
  it('includes supplied linked seasons but excludes adults, characters and unrelated media', () => {
    const node = { id: 2, type: 'ANIME', format: 'TV', title: { romaji: 'Part 2' } };
    const root = {
      id: 1,
      relations: {
        edges: [
          { relationType: 'SEQUEL', node },
          { relationType: 'SEQUEL', node: { ...node, id: 3, isAdult: true } },
          { relationType: 'CHARACTER', node: { ...node, id: 4 } },
          { relationType: 'SEQUEL', node: { ...node, id: 5, type: 'MANGA' } },
        ],
      },
    };
    expect(linkedAnimeMedia([root, { ...node, episodes: 12 }]).map((item) => item.id)).toEqual([
      1, 2,
    ]);
    expect(linkedAnimeMedia([root, { ...node, episodes: 12 }])[1].episodes).toBe(12);
  });
});
