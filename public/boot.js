// The fallback can still run when a release's hashed CSS or entry script fails.
(() => {
  const message = document.getElementById('startup-message');
  const retry = document.getElementById('startup-retry');
  const failed = () => {
    if (!document.body.classList.contains('account-booting')) return;
    document.body.classList.remove('welcome-preview');
    document.getElementById('welcome-page').hidden = true;
    message.textContent = 'Pamja nuk u ngarkua. Kontrollo lidhjen dhe provo përsëri.';
    retry.hidden = false;
  };
  const watchdog = setTimeout(() => { if (document.querySelector('.app')?.hidden) failed(); }, 10000);
  document.addEventListener('at-startup-ready', () => clearTimeout(watchdog), {once: true});
  retry.addEventListener('click', () => location.reload());
  document.addEventListener('at-startup-error', failed);
  window.addEventListener('error', event => {
    if (event.target.matches?.('link[rel="stylesheet"], script[type="module"]')) failed();
  }, true);
  if (getComputedStyle(document.documentElement).getPropertyValue('--at-ui-ready').trim() !== '1') {
    failed();
  } else {
    // Public presentation only. Any stored Supabase session or auth return waits
    // for the controller to verify the account; no private data is opened here.
    try {
      let session = /[#?&](?:access_token|refresh_token|code|error|type)=/.test(location.hash + location.search);
      for (let index = 0; index < localStorage.length && !session; index++) {
        session = /^sb-.+-auth-token$/.test(localStorage.key(index) || '');
      }
      if (!session) {
        const welcome = document.getElementById('welcome-page');
        welcome.hidden = false;
        welcome.inert = true;
        document.body.classList.add('welcome-preview');
      }
    } catch { /* Storage failure waits for normal verified account startup. */ }
  }
})();
