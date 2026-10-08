const key = 'animetrack_feature_retry';
const pages = new Set(['reading', 'news']);

// Failed ES module downloads may remain cached as failures until a document reload.
export function retryFeature(ctx, page, browser = window) {
  if (!pages.has(page)) return false;
  if (ctx.canReload && !ctx.canReload()) {
    ctx.toast('Ruajtja është ende aktive. Prit pak dhe provo përsëri.');
    return false;
  }
  try {
    browser.sessionStorage.setItem(key, JSON.stringify({ page, owner: ctx.user()?.id || 'guest' }));
  } catch {
    /* Reload still works when session storage is unavailable. */
  }
  browser.location.reload();
  return true;
}

export function restoreFeatureRetry(ctx, browser = window) {
  try {
    const retry = JSON.parse(browser.sessionStorage.getItem(key) || 'null');
    browser.sessionStorage.removeItem(key);
    if (pages.has(retry?.page) && retry.owner === (ctx.user()?.id || 'guest'))
      ctx.navigate(retry.page);
  } catch {
    /* An invalid navigation hint never blocks startup. */
  }
}
