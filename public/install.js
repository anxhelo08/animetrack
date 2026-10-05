let installPrompt = null;
const installButton = document.getElementById('pwa-install');
const status = document.getElementById('pwa-status');
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  installButton.hidden = true;
  status.textContent = 'AnimeTrack u instalua. Hape nga ikona në ekranin kryesor.';
});
installButton.addEventListener('click', async () => {
  const prompt = installPrompt;
  if (!prompt) return;
  installPrompt = null;
  installButton.hidden = true;
  try {
    await prompt.prompt();
    const result = await prompt.userChoice;
    status.textContent =
      result.outcome === 'accepted'
        ? 'Instalimi u pranua. Hape AnimeTrack nga ekrani kryesor.'
        : 'Mund ta instalosh më vonë nga menuja e shfletuesit.';
  } catch {
    status.textContent = 'Provo nga menuja e Chrome → Install app.';
  }
});
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
fetch('/downloads/android.json', { cache: 'no-store' })
  .then((response) => (response.ok ? response.json() : null))
  .then((release) => {
    if (!release?.version || !Number.isFinite(release.bytes)) return;
    const mb = (release.bytes / 1048576).toLocaleString('sq-AL', { maximumFractionDigits: 1 });
    document.getElementById('apk-version').textContent = `Versioni ${release.version} · ${mb} MB`;
  })
  .catch(() => {});
