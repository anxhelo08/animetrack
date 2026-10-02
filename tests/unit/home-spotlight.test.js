import { describe, it, expect } from 'vitest';
import { homeStories } from '../../src/modules/home-spotlight.js';

describe('anime spotlight facts', () => {
  const now = Date.parse('2026-10-02T12:00:00Z');
  it('shows a future episode only with a valid episode number and future airing date', () => {
    const item = {
      key: 'al-1',
      title: 'One Piece',
      nextAiringAt: now / 1000 + 86400,
      nextAiringEpisode: 1171,
    };
    expect(homeStories([item], [], now)[0].badge).toBe('Episodi 1171 së shpejti');
    expect(homeStories([{ ...item, nextAiringAt: now / 1000 - 1 }], [], now)[0].badge).toBe(
      'Zbulim nga katalogu',
    );
    expect(homeStories([{ ...item, nextAiringEpisode: 0 }], [], now)[0].dateLabel).toBe('');
  });
  it('does not present missing or expired premiere dates as confirmed future dates', () => {
    const item = { key: 'al-2', title: 'Future show', releaseStatus: 'NOT_YET_RELEASED' };
    expect(homeStories([item], [], now)[0].dateLabel).toBe('');
    expect(homeStories([{ ...item, releaseStart: '2020-01-01' }], [], now)[0].dateLabel).toBe('');
    expect(homeStories([{ ...item, releaseStart: '2027-01-01' }], [], now)[0].dateLabel).not.toBe(
      '',
    );
  });
  it('uses library artwork when the catalogue is unavailable and labels it honestly', () => {
    const library = [
      { id: 'a', title: 'Local anime' },
      { id: 'tv', title: 'TV show', source: 'TVMaze' },
    ];
    const before = structuredClone(library);
    const stories = homeStories([], library, now);
    expect(stories).toHaveLength(1);
    expect(stories[0].badge).toBe('Nga biblioteka jote');
    expect(stories[0].remote).toBeUndefined();
    expect(library).toEqual(before);
  });
});

describe('daily anime selections', () => {
  const pool = Array.from({ length: 10 }, (_, i) => ({
    key: 'al-' + i,
    sourceId: String(i),
    title: 'Anime ' + i,
  }));
  const morning = new Date(2026, 9, 2, 8).getTime();
  it('keeps the same daily selection across reloads, input order and popularity changes', () => {
    const before = structuredClone(pool);
    const keys = (stories) => stories.map((x) => x.storyKey);
    expect(keys(homeStories(pool, [], morning))).toEqual(
      keys(
        homeStories(
          pool.toReversed().map((x) => ({ ...x, popularity: Math.random() * 10000 })),
          [],
          morning + 12 * 3600000,
        ),
      ),
    );
    expect(pool).toEqual(before);
  });
  it('changes the featured anime and daily set after local midnight', () => {
    const today = homeStories(pool, [], morning);
    const tomorrow = homeStories(pool, [], new Date(2026, 9, 3, 0).getTime());
    expect(today).toHaveLength(4);
    expect(tomorrow[0].storyKey).not.toBe(today[0].storyKey);
    expect(tomorrow.map((x) => x.storyKey)).not.toEqual(today.map((x) => x.storyKey));
  });
});
