import { test, expect, vi } from 'vitest';
import {
  airingIdentities,
  fetchAiringSchedule,
  mapAiringEvents,
  mergeAiringEvents,
} from '../../src/core/airing-schedule.js';
import { checkAiringSchedules } from '../../supabase/functions/_shared/airing-releases.js';
const now = Date.parse('2026-10-03T12:00:00Z');
const response = (data) => ({ ok: true, json: async () => data });
test('completed series includes confirmed sequel schedules without assigning old watched flags', async () => {
  const fetcher = vi.fn(async (url) =>
    url.includes('graphql')
      ? response({
          data: {
            Media: {
              id: 7,
              idMal: 70,
              title: { english: 'Series' },
              future: { nodes: [{ episode: 3, airingAt: (now + 60000) / 1000 }] },
              relations: {
                edges: [
                  {
                    relationType: 'SEQUEL',
                    node: {
                      id: 8,
                      idMal: 80,
                      title: { english: 'Series 2' },
                      future: { nodes: [{ episode: 1, airingAt: (now + 120000) / 1000 }] },
                    },
                  },
                ],
              },
            },
          },
        })
      : url.endsWith('/full')
        ? response({ data: { relations: [] } })
        : response({ data: [], pagination: { last_visible_page: 1 } }),
  );
  const result = await fetchAiringSchedule({ provider: 'anilist', id: '7' }, { fetcher, now });
  expect(result.events).toHaveLength(2);
  expect(result.checks.every((c) => c.status === 'ok')).toBe(true);
  const anime = {
    id: 'a',
    status: 'completed',
    title: 'Series',
    source: 'AniList',
    sourceId: '7',
    seasons: [{ id: 's', source: 'AniList', sourceId: '7', malId: '70', watched: [1] }],
  };
  const mapped = mapAiringEvents(anime, result);
  expect(mapped[0].seasonId).toBe('s');
  expect(mapped[1].seasonId).toBe('');
  expect(anime.seasons[0].watched).toEqual([1]);
});
test('MAL fallback reads last episode page and never manufactures broadcast dates', async () => {
  const calls = [];
  const fetcher = async (url) => {
    calls.push(url);
    if (url.includes('graphql')) return { ok: false };
    if (url.endsWith('/full'))
      return response({
        data: { title: 'Series', broadcast: { day: 'Monday', time: '18:00' }, relations: [] },
      });
    if (url.includes('page=3'))
      return response({ data: [{ mal_id: 170, aired: new Date(now - 10000).toISOString() }] });
    return response({ data: [], pagination: { last_visible_page: 3 } });
  };
  const result = await fetchAiringSchedule(
    { provider: 'anilist', id: '7', malId: '70' },
    { fetcher, now },
  );
  expect(result.events.map((e) => e.episode)).toEqual([170]);
  expect(result.events[0].when).toBe(now - 10000);
  expect(result.checks[0].status).toBe('unavailable');
  expect(calls.some((x) => x.includes('page=3'))).toBe(true);
});
test('exact TVMaze identity maps to the matching season and schedules merge across MAL aliases', async () => {
  const result = await fetchAiringSchedule(
    { provider: 'tvmaze', id: '9' },
    {
      now,
      fetcher: async () =>
        response([{ number: 2, season: 3, airstamp: new Date(now + 10000).toISOString() }]),
    },
  );
  expect(
    mapAiringEvents(
      {
        id: 'a',
        seasons: [
          { id: 's2', source: 'TVMaze', sourceId: '9', imdbSeasonNumber: 2 },
          { id: 's3', source: 'TVMaze', sourceId: '9', imdbSeasonNumber: 3 },
        ],
      },
      result,
    )[0].seasonId,
  ).toBe('s3');
  const events = [
    { animeId: 'a', providerKey: 'mal:70', episode: 2, when: now, source: 'MyAnimeList / Jikan' },
    {
      animeId: 'a',
      providerKey: 'anilist:7',
      malKey: 'mal:70',
      episode: 2,
      when: now + 1000,
      source: 'AniList',
    },
  ];
  expect(mergeAiringEvents(events, now)).toHaveLength(1);
  expect(mergeAiringEvents(events, now)[0].source).toBe('AniList');
  expect(airingIdentities({ source: 'manual', sourceId: 'title', seasons: [] })).toEqual([]);
});
test('daily worker preserves previous metadata on failure and only finishes the held lease', async () => {
  const rpc = vi.fn(async (name, args) =>
    name === 'anime_claim_airing_checks'
      ? {
          data: [
            {
              lookup_key: 'anilist:7',
              identity: { provider: 'anilist', id: '7' },
              claim_token: 'claim',
              result: { events: [] },
            },
          ],
        }
      : { data: true },
  );
  await checkAiringSchedules({ rpc }, async () => {
    throw Error('429');
  });
  expect(rpc.mock.calls[1][1]).toMatchObject({ p_key: 'anilist:7', p_claim: 'claim', p_ok: false });
  expect(rpc.mock.calls.every((c) => !c[0].includes('library'))).toBe(true);
});
