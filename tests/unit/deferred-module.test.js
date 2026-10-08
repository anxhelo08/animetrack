import { expect, it, vi } from 'vitest';
import { createDeferredModule } from '../../src/core/deferred-module.js';

it('waits for demand and shares a successful import between callers', async () => {
  const module = { ready: true };
  const importer = vi.fn(async () => module);
  const load = createDeferredModule(importer);
  expect(importer).not.toHaveBeenCalled();
  const first = load();
  expect(load()).toBe(first);
  expect(await first).toBe(module);
  expect(await load()).toBe(module);
  expect(importer).toHaveBeenCalledOnce();
});

it('allows the user to retry a failed module download', async () => {
  const importer = vi
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({ ready: true });
  const load = createDeferredModule(importer);
  await expect(load()).rejects.toThrow('offline');
  await expect(load()).resolves.toEqual({ ready: true });
  expect(importer).toHaveBeenCalledTimes(2);
});
