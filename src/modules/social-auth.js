/** Provider secrets stay in Supabase; the browser reads only public availability. */
export function mountSocialAuth({
  root,
  config,
  client,
  redirect,
  feedback,
  fetcher = fetch,
  navigate = (url) => location.assign(url),
}) {
  const buttons = [...root.querySelectorAll('[data-social-provider]')];
  const status = root.querySelector('[data-social-status]');
  let available = {};
  let pending = null;
  let checkedAt = 0;
  let busy = false;
  function paint() {
    buttons.forEach((button) => {
      const enabled = available[button.dataset.socialProvider] === true;
      button.disabled = busy || !enabled;
      button.querySelector('.social-availability').textContent = enabled
        ? ''
        : pending
          ? 'Po kontrollohet…'
          : 'Së shpejti';
    });
  }
  async function refresh() {
    if (pending) return pending;
    if (Date.now() - checkedAt < 30000) return;
    pending = (async () => {
      try {
        const response = await fetcher(new URL('/auth/v1/settings', config.url), {
          headers: { apikey: config.key },
          credentials: 'omit',
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw Error('Provider settings unavailable');
        const settings = await response.json();
        available = {
          google: settings.external?.google === true,
          apple: settings.external?.apple === true,
        };
        checkedAt = Date.now();
        status.textContent =
          available.google && available.apple
            ? 'Hyr me llogarinë tënde ekzistuese.'
            : 'Mund të vazhdosh me email. Opsionet e tjera aktivizohen së shpejti.';
      } catch {
        status.textContent =
          'Opsionet e hyrjes nuk u kontrolluan. Mund të vazhdosh me email ose të provosh përsëri.';
      } finally {
        pending = null;
        paint();
      }
    })();
    paint();
    return pending;
  }
  async function signIn(provider) {
    if (busy || !['google', 'apple'].includes(provider) || available[provider] !== true) return;
    busy = true;
    paint();
    feedback('Po hapet ' + (provider === 'google' ? 'Google' : 'Apple') + '…');
    try {
      const { data, error } = await client().auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirect(), skipBrowserRedirect: true },
      });
      if (error) throw error;
      const url = new URL(data?.url);
      if (url.origin !== new URL(config.url).origin || url.pathname !== '/auth/v1/authorize')
        throw Error('Invalid OAuth redirect');
      navigate(url.href);
    } catch {
      feedback('Hyrja nuk u hap. Provo përsëri ose vazhdo me email.', 'error');
    } finally {
      busy = false;
      paint();
    }
  }
  root.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (button?.dataset.socialProvider) void signIn(button.dataset.socialProvider);
    if (button?.hasAttribute('data-social-retry')) void refresh();
  });
  paint();
  return { refresh, signIn };
}
