// The fallback can still run when a release's hashed CSS or entry script fails.
(() => {
  const message = document.getElementById('startup-message');
  const retry = document.getElementById('startup-retry');
  const failed = () => {
    if (!document.body.classList.contains('account-booting')) return;
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
  if (getComputedStyle(document.documentElement).getPropertyValue('--at-ui-ready').trim() !== '1') failed();
})();
