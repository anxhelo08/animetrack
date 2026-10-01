import { test, expect } from 'vitest';
import { episodeThumbnail } from '../../src/core/episode-details.js';

test('streaming images require an unambiguous matching episode and HTTPS', () => {
  const images = [
    { title: 'Episode 12', thumbnail: 'https://example.test/12.jpg' },
    { title: 'Episode 2', thumbnail: 'javascript:alert(1)' },
    { title: 'Episode 2 / Episode 3', thumbnail: 'https://example.test/wrong.jpg' },
    {
      title: 'Episode 2 – The Arrival',
      thumbnail: 'https://example.test/2.jpg',
      site: 'Official stream',
    },
  ];
  expect(episodeThumbnail(images, 2)).toEqual({
    image: 'https://example.test/2.jpg',
    imageSource: 'AniList · Official stream',
  });
  expect(episodeThumbnail(images, 1)).toBeNull();
  expect(
    episodeThumbnail([{ title: 'Trailer', thumbnail: 'https://example.test/cover.jpg' }], 1),
  ).toBeNull();
});

import {
  verifiedAnimeShow,
  cinemetaEpisode,
  fetchEpisodeFallbacks,
} from '../../src/core/episode-details.js';
import { vi } from 'vitest';

test('TVmaze anime identity rejects a wrong year, live action, ambiguous titles and sequel aliases', () => {
  const season = { subtitle: 'Overgeared', aliases: ['Tempal'], year: 2026 };
  const show = { id: 92844, name: 'Overgeared', type: 'Animation', premiered: '2026-09-27' };
  expect(verifiedAnimeShow([{ show }], season)).toEqual(show);
  expect(verifiedAnimeShow([{ show: { ...show, premiered: '2025-01-01' } }], season)).toBeNull();
  expect(verifiedAnimeShow([{ show: { ...show, type: 'Scripted' } }], season)).toBeNull();
  expect(verifiedAnimeShow([{ show }, { show: { ...show, id: 1 } }], season)).toBeNull();
  expect(verifiedAnimeShow([{ show: { ...show, name: 'Overgeared II' } }], season)).toBeNull();
});

test('Cinemeta requires exact IMDb identity and season/episode, never a series poster', () => {
  const meta = {
    id: 'tt1196946',
    type: 'series',
    poster: 'https://example.test/poster.jpg',
    videos: [
      { season: 1, episode: 2, title: 'Wrong season', thumbnail: 'https://example.test/wrong.jpg' },
      {
        season: 2,
        episode: 2,
        title: 'Correct',
        overview: 'Episode summary',
        thumbnail: 'https://example.test/2.jpg',
      },
    ],
  };
  expect(cinemetaEpisode(meta, 'tt1196946', 2, 2)).toMatchObject({
    title: 'Correct',
    summary: 'Episode summary',
    image: 'https://example.test/2.jpg',
  });
  expect(cinemetaEpisode(meta, 'tt1196947', 2, 2)).toBeNull();
  expect(cinemetaEpisode(meta, 'tt1196946', 2, 3)).toBeNull();
  expect(
    cinemetaEpisode({ ...meta, videos: [{ season: 1, episode: 1 }] }, meta.id, 1, 1).image,
  ).toBe('');
});

test('a TVmaze outage does not block the exact IMDb Cinemeta fallback for a serial', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      if (String(url).includes('api.tvmaze.com')) throw Error('provider offline');
      return {
        ok: true,
        json: async () => ({
          meta: {
            id: 'tt1196946',
            type: 'series',
            videos: [
              {
                season: 3,
                episode: 2,
                title: 'Episode title',
                overview: 'Real episode summary',
                thumbnail: 'https://example.test/serial.jpg',
              },
            ],
          },
        }),
      };
    }),
  );
  try {
    const result = await fetchEpisodeFallbacks(
      { imdbId: 'tt1196946' },
      { id: 'tv-99991-3', source: 'TVMaze', sourceId: '99991' },
      2,
      2,
      { number: 2 },
    );
    expect(result).toMatchObject({
      number: 2,
      title: 'Episode title',
      summary: 'Real episode summary',
      image: 'https://example.test/serial.jpg',
      imageSource: 'Cinemeta',
    });
  } finally {
    vi.unstubAllGlobals();
  }
});
