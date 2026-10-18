import { describe, expect, it } from 'vitest';
import { createLibraryModel } from '../../src/core/library-model.js';
import { seriesProgress } from '../../src/core/series-progress.js';

const { releasedCount } = createLibraryModel();
const at = Date.parse('2026-09-30T12:00:00Z');
const seen = (n) => Array.from({ length: n }, (_, i) => i + 1);
const part = (data = {}) => ({
  format: 'TV',
  source: 'AniList',
  total: 12,
  watched: seen(8),
  releaseStatus: 'RELEASING',
  nextAiringEpisode: 9,
  nextAiringAt: at / 1000 + 3600,
  ...data,
});
const classify = (...seasons) =>
  seriesProgress({ source: 'AniList', status: 'watching', seasons }, releasedCount, at);

describe('derived series progress', () => {
  it('distinguishes caught-up 8/8 released from a finished 12-episode season without changing personal data', () => {
    const anime = { status: 'paused', notes: 'Private', history: ['keep'], seasons: [part()] };
    const before = structuredClone(anime);
    expect(seriesProgress(anime, releasedCount, at)).toMatchObject({
      key: 'caught-up',
      released: 8,
      watched: 8,
      remaining: 0,
      detail: 'Në pritje të episodit 9.',
    });
    expect(anime).toEqual(before);
    expect(
      classify(
        part({
          releaseStatus: 'FINISHED',
          watched: seen(12),
          nextAiringAt: 0,
          nextAiringEpisode: 0,
        }),
      ).key,
    ).toBe('finished');
  });
  it('returns to continue when the confirmed next episode airs', () => {
    const anime = { seasons: [part()] };
    expect(seriesProgress(anime, releasedCount, at + 3600001)).toMatchObject({
      key: 'continue',
      remaining: 1,
      released: 9,
    });
  });
  it('counts holes, duplicates and invalid watched numbers correctly across tracked parts', () => {
    expect(classify(part({ watched: [1, 2, 2, 4, 5, 6, 7, 8, 9, 99, -1] }))).toMatchObject({
      key: 'continue',
      remaining: 1,
      watched: 7,
    });
    expect(
      classify(
        part(),
        part({
          total: 2,
          releaseStatus: 'FINISHED',
          watched: [1],
          nextAiringEpisode: 0,
          nextAiringAt: 0,
        }),
      ),
    ).toMatchObject({ key: 'continue', remaining: 1 });
  });
  it('does not infer completion from unknown totals, unknown release status or watched-only counts', () => {
    expect(classify(part({ releaseStatus: '', nextAiringAt: 0, nextAiringEpisode: 0 })).key).toBe(
      'unknown',
    );
    expect(
      classify(part({ releaseStatus: 'FINISHED', total: 0, nextAiringAt: 0, nextAiringEpisode: 0 }))
        .key,
    ).toBe('unknown');
    expect(classify(part({ nextAiringAt: 0, nextAiringEpisode: 0 })).key).toBe('unknown');
  });
  it('keeps future tracked sequels separate from completed series and ignores hidden parts', () => {
    const finished = part({
      releaseStatus: 'FINISHED',
      watched: seen(12),
      nextAiringAt: 0,
      nextAiringEpisode: 0,
    });
    const future = part({
      releaseStatus: 'NOT_YET_RELEASED',
      watched: [],
      nextAiringEpisode: 0,
      nextAiringAt: 0,
    });
    expect(classify(finished, future).key).toBe('caught-up');
    expect(classify(finished, { ...future, hidden: true }).key).toBe('finished');
    expect(classify(future).key).toBe('upcoming');
  });
  it('does not treat a finished TVMaze season as an ended show or classify standalone movies as series', () => {
    expect(
      seriesProgress(
        {
          source: 'TVMaze',
          seasons: [
            part({
              releaseStatus: 'FINISHED',
              watched: seen(12),
              nextAiringAt: 0,
              nextAiringEpisode: 0,
            }),
          ],
        },
        releasedCount,
        at,
      ).key,
    ).toBe('unknown');
    expect(classify(part({ format: 'MOVIE' }))).toBeNull();
  });
});
