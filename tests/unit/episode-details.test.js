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
