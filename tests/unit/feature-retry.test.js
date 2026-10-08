import { expect, it, vi } from 'vitest';
import { retryFeature, restoreFeatureRetry } from '../../src/modules/feature-retry.js';

function fixture() {
  const values = new Map();
  const browser = {
    sessionStorage: {
      setItem: (key, value) => values.set(key, value),
      getItem: (key) => values.get(key),
      removeItem: (key) => values.delete(key),
    },
    location: { reload: vi.fn() },
  };
  const ctx = {
    user: () => ({ id: 'reader' }),
    navigate: vi.fn(),
    toast: vi.fn(),
    canReload: () => true,
  };
  return { browser, ctx, values };
}
it('reloads a failed feature and restores only that owner’s destination once', () => {
  const { browser, ctx } = fixture();
  expect(retryFeature(ctx, 'reading', browser)).toBe(true);
  expect(browser.location.reload).toHaveBeenCalledOnce();
  restoreFeatureRetry(ctx, browser);
  restoreFeatureRetry(ctx, browser);
  expect(ctx.navigate).toHaveBeenCalledExactlyOnceWith('reading');
});
it('does not reload while local data is still being saved', () => {
  const { browser, ctx, values } = fixture();
  ctx.canReload = () => false;
  expect(retryFeature(ctx, 'news', browser)).toBe(false);
  expect(browser.location.reload).not.toHaveBeenCalled();
  expect(values.size).toBe(0);
  expect(ctx.toast).toHaveBeenCalledOnce();
});
it('discards retry navigation belonging to another account', () => {
  const { browser, ctx } = fixture();
  retryFeature(ctx, 'reading', browser);
  ctx.user = () => ({ id: 'other' });
  restoreFeatureRetry(ctx, browser);
  expect(ctx.navigate).not.toHaveBeenCalled();
});
it('invalid hints and unavailable session storage never block startup', () => {
  const { browser, ctx, values } = fixture();
  values.set('animetrack_feature_retry', 'invalid json');
  expect(() => restoreFeatureRetry(ctx, browser)).not.toThrow();
  browser.sessionStorage.setItem = () => {
    throw Error('quota');
  };
  expect(retryFeature(ctx, 'reading', browser)).toBe(true);
  expect(browser.location.reload).toHaveBeenCalledOnce();
});
