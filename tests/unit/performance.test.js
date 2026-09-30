import { afterEach, expect, test, vi } from 'vitest';
import { createRequestCache, catalogJSON } from '../../src/core/request-cache.js';
import { createVisibleScheduler } from '../../src/core/visible-scheduler.js';

afterEach(() => vi.useRealTimers());
test('public cache shares requests, isolates caller mutation and expires metadata', async () => {
  let clock = 0;
  const cache = createRequestCache({ now: () => clock });
  const load = vi.fn(async () => ({ title: 'Anime', episodes: [1] }));
  const [one, two] = await Promise.all([
    cache('a', load, { ttl: 10 }),
    cache('a', load, { ttl: 10 }),
  ]);
  one.episodes.push(2);
  expect(two.episodes).toEqual([1]);
  expect((await cache('a', load)).episodes).toEqual([1]);
  expect(load).toHaveBeenCalledTimes(1);
  clock = 11;
  await cache('a', load);
  expect(load).toHaveBeenCalledTimes(2);
});
test('cancelling one search leaves a shared request available to another consumer', async () => {
  const cache = createRequestCache();
  let finish;
  const load = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const controller = new AbortController();
  const one = cache('a', load, { signal: controller.signal });
  const cancelled = expect(one).rejects.toMatchObject({ name: 'AbortError' });
  const two = cache('a', load);
  await Promise.resolve();
  controller.abort();
  finish({ id: 1 });
  await cancelled;
  expect(await two).toEqual({ id: 1 });
});
test('failed requests back off, respect Retry-After, recover, and evict old metadata', async () => {
  let clock = 0;
  const cache = createRequestCache({ now: () => clock, limit: 2 });
  const error = Object.assign(Error('429'), { retryAfter: 60000 });
  const load = vi.fn().mockRejectedValueOnce(error).mockResolvedValue({ ok: true });
  await expect(cache('a', load)).rejects.toThrow('429');
  clock = 1000;
  await expect(cache('a', load)).rejects.toThrow('429');
  expect(load).toHaveBeenCalledTimes(1);
  clock = 60000;
  await cache('a', load);
  expect(load).toHaveBeenCalledTimes(2);
  await cache('b', load);
  await cache('c', load);
  await cache('a', load);
  expect(load).toHaveBeenCalledTimes(5);
});
test('hidden pages cancel polling; waking runs once and slow work never overlaps', async () => {
  vi.useFakeTimers();
  const page = new EventTarget();
  page.visibilityState = 'visible';
  let finish;
  const task = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const stop = createVisibleScheduler(task, { interval: 100, document: page });
  page.visibilityState = 'hidden';
  page.dispatchEvent(new Event('visibilitychange'));
  await vi.advanceTimersByTimeAsync(1000);
  expect(task).not.toHaveBeenCalled();
  page.visibilityState = 'visible';
  page.dispatchEvent(new Event('visibilitychange'));
  await vi.advanceTimersByTimeAsync(1000);
  expect(task).toHaveBeenCalledTimes(1);
  finish();
  await Promise.resolve();
  await vi.advanceTimersByTimeAsync(100);
  expect(task).toHaveBeenCalledTimes(2);
  stop();
  finish();
  await vi.advanceTimersByTimeAsync(1000);
  expect(task).toHaveBeenCalledTimes(2);
});

test('public catalog cache rejects authenticated and non-catalog requests', () => {
  expect(() =>
    catalogJSON('https://api.jikan.moe/v4/anime', { headers: { Authorization: 'Bearer private' } }),
  ).toThrow('Authenticated');
  expect(() => catalogJSON('https://api.jikan.moe/v4/anime', { credentials: 'include' })).toThrow(
    'Authenticated',
  );
  expect(() => catalogJSON('https://example.supabase.co/rest/v1/anime_libraries')).toThrow(
    'public catalog',
  );
});

test('explicit retry clears transient errors while respecting server Retry-After and retaining successes', async () => {
  let clock = 0;
  const cache = createRequestCache({ now: () => clock });
  const temporary = vi.fn().mockRejectedValueOnce(Error('503')).mockResolvedValue({ ok: true });
  const limited = vi
    .fn()
    .mockRejectedValueOnce(Object.assign(Error('429'), { retryAfter: 60000 }))
    .mockResolvedValue({ ok: true });
  await expect(cache('temporary', temporary)).rejects.toThrow('503');
  await expect(cache('limited', limited)).rejects.toThrow('429');
  cache.retryFailures();
  await cache('temporary', temporary);
  await expect(cache('limited', limited)).rejects.toThrow('429');
  expect(limited).toHaveBeenCalledTimes(1);
  clock = 60000;
  cache.retryFailures();
  await cache('limited', limited);
  await cache('temporary', temporary);
  expect(temporary).toHaveBeenCalledTimes(2);
});
