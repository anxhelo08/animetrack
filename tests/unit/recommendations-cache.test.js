// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from 'vitest';
import '../../src/modules/recommendations.js';

beforeEach(() => localStorage.clear());
function fixture() {
  let owner = 'cache-reader';
  const lookup = vi.fn(() => false);
  const redraw = vi.fn();
  const candidates = [
    {
      key: 'al-1',
      title: 'One story',
      source: 'AniList',
      sourceId: '1',
      rawGenres: ['drama'],
      format: 'TV',
      popularity: 100,
      score: 80,
      related: [],
    },
  ];
  const store = (id) =>
    localStorage.setItem(`animetrack_recs_v125_${id}`, JSON.stringify({ at: 1000, candidates }));
  store(owner);
  const library = [];
  const recommendations = window.ATRecommendations({
    user: () => ({ id: owner }),
    state: () => ({ anime: library }),
    catalogueDay: () => 'today',
    genres: () => ['drama'],
    seriesRoot: (value) => value,
    inLibrary: lookup,
    rerenderRecommendations: redraw,
  });
  return {
    recommendations,
    lookup,
    redraw,
    library,
    changeOwner: () => {
      owner = 'other-reader';
      store(owner);
    },
  };
}

test('opening a current cached catalog again avoids reranking and repainting', async () => {
  const { recommendations, lookup, redraw } = fixture();
  await recommendations.refresh(false);
  expect(recommendations.getItems()).toHaveLength(1);
  const calls = lookup.mock.calls.length;
  const draws = redraw.mock.calls.length;
  await recommendations.refresh(false);
  expect(lookup).toHaveBeenCalledTimes(calls);
  expect(redraw).toHaveBeenCalledTimes(draws);
});

test('changed library and changed account invalidate cached rankings', async () => {
  const { recommendations, lookup, changeOwner } = fixture();
  await recommendations.refresh(false);
  lookup.mockClear();
  recommendations.onLibraryChange();
  await recommendations.refresh(false);
  expect(lookup).toHaveBeenCalled();
  lookup.mockClear();
  changeOwner();
  await recommendations.refresh(false);
  expect(lookup).toHaveBeenCalled();
});
