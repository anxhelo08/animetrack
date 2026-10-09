import { afterEach, expect, it, vi } from 'vitest';
import { accountDeadline, accountSession } from '../../src/core/account-startup.js';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it('returns a verified session and clears its deadline', async () => {
  vi.useFakeTimers();
  const result = { data: { session: { user: { id: 'owner' } } }, error: null };
  expect(await accountSession({ auth: { getSession: async () => result } })).toBe(result);
  expect(vi.getTimerCount()).toBe(0);
});

it('rejects a stalled session and ignores its late result', async () => {
  vi.useFakeTimers();
  let finish;
  const task = accountSession({ auth: { getSession: () => new Promise((r) => (finish = r)) } });
  const rejected = expect(task).rejects.toThrow('Llogaria po vonohet');
  await vi.advanceTimersByTimeAsync(12000);
  await rejected;
  finish({ data: { session: { user: { id: 'late-owner' } } } });
  expect(vi.getTimerCount()).toBe(0);
});

it('bounds a stalled database operation and does not accept its late payload', async () => {
  vi.useFakeTimers();
  let finish;
  const task = accountDeadline(new Promise((resolve) => (finish = resolve)));
  const rejected = expect(task).rejects.toThrow('Llogaria po vonohet');
  await vi.advanceTimersByTimeAsync(12000);
  await rejected;
  finish({ data: { payload: { anime: [{ id: 'late' }] } } });
  expect(vi.getTimerCount()).toBe(0);
});

it('retains SDK errors and clears deadlines after a failed request', async () => {
  vi.useFakeTimers();
  const error = Error('Database unavailable');
  await expect(accountDeadline(Promise.reject(error))).rejects.toBe(error);
  expect(vi.getTimerCount()).toBe(0);
});
