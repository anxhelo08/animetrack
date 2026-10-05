/** Non-blocking confirmations using the existing native dialog + ATHTML pattern. */
export function createDecisionDialog(html) {
  let queue = Promise.resolve();
  return function confirmDecision(message) {
    const result = queue.then(
      () =>
        new Promise((resolve) => {
          const dialog = document.createElement('dialog');
          dialog.id = 'sync-decision-dialog';
          dialog.className = 'at132-dialog sync-decision-dialog';
          dialog.setAttribute('aria-labelledby', 'sync-decision-title');
          html.renderHTML(
            dialog,
            `<h2 id="sync-decision-title">Konfirmo veprimin</h2><p>${html.escapeHTML(message)}</p><div class="product-actions"><button type="button" class="ghost" data-decision="cancel" autofocus>Anulo</button><button type="button" class="primary" data-decision="accept">Vazhdo</button></div>`,
          );
          dialog.addEventListener('click', (event) => {
            const action = event.target.closest?.('[data-decision]')?.dataset.decision;
            if (action) dialog.close(action);
          });
          dialog.addEventListener(
            'close',
            () => {
              const accepted = dialog.returnValue === 'accept';
              dialog.remove();
              resolve(accepted);
            },
            { once: true },
          );
          document.body.append(dialog);
          dialog.showModal();
        }),
    );
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}
