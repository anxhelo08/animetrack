/** Technical recovery controls live only under Advanced settings. */
export function mountStorageSettings(ctx, repository) {
  const root = document.getElementById('product-advanced-content');
  if (!root) return;
  const panel = document.createElement('section');
  panel.id = 'library-storage-settings';
  window.ATHTML.renderHTML(
    panel,
    '<h3>Ruajtja dhe rikuperimi</h3><p id="library-storage-status" role="status"></p><div class="product-actions"><button type="button" class="ghost" data-storage-action="verify">Verifiko kopjen</button><button type="button" class="ghost" data-storage-action="recovery">Shkarko kopjen e rikuperimit</button><button type="button" class="ghost" data-storage-action="cleanup">Pastro kopjet e vjetra</button></div><p>Kopja ekzistuese mbahet gjatë migrimit. Pastrimi lejohet vetëm pas verifikimit dhe kur nuk ka ndryshime në pritje.</p>',
  );
  root.append(panel);
  const refresh = () => {
    const status = repository.status(ctx.key());
    panel.querySelector('#library-storage-status').textContent =
      status.mode === 'pending'
        ? 'Kopja në IndexedDB po verifikohet. Kopja aktuale mbetet në pajisje.'
        : status.mode === 'verified'
          ? 'IndexedDB: kopja e verifikuar.'
          : status.mode === 'recovered'
            ? 'U përdor kopja e rikuperimit. Eksportoje për kontroll.'
            : 'Përdoret kopja ekzistuese në pajisje. ' + status.problem;
  };
  repository.subscribe(refresh);
  refresh();
  panel.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-storage-action]');
    if (!button || button.disabled) return;
    const key = ctx.key();
    button.disabled = true;
    try {
      if (button.dataset.storageAction === 'verify') {
        await repository.prepare();
        await repository.flush();
        ctx.toast(
          repository.status().mode === 'verified'
            ? 'Kopja u verifikua.'
            : 'Kopja ekzistuese mbetet e ruajtur. ' + repository.status().problem,
        );
      }
      if (button.dataset.storageAction === 'cleanup') {
        if (ctx.key() !== key) throw Error('Llogaria ndryshoi.');
        const count = await repository.cleanup(key);
        ctx.toast(
          count
            ? 'Kopja e vjetër identike u pastrua.'
            : 'Nuk ka kopje të vjetra identike për pastrim.',
        );
      }
      if (button.dataset.storageAction === 'recovery') {
        const value = await repository.recovery(key);
        if (ctx.key() !== key) throw Error('Llogaria ndryshoi.');
        const url = URL.createObjectURL(
            new Blob(
              [
                JSON.stringify(
                  { ...value, version: 3, exportedAt: new Date().toISOString() },
                  null,
                  2,
                ),
              ],
              { type: 'application/json' },
            ),
          ),
          a = document.createElement('a');
        a.href = url;
        a.download = 'AnimeTrack-recovery-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      ctx.toast('Veprimi nuk u krye: ' + error.message);
    } finally {
      button.disabled = false;
      refresh();
    }
  });
}
