/** Successful episode transactions only; undo is tied to the current owner and history event. */
export function mountReleaseExperience(ctx) {
  const box = document.createElement('aside');
  box.className = 'release-feedback';
  box.hidden = true;
  box.setAttribute('aria-label', 'Shënimi i episodit');
  const message = document.createElement('span');
  message.setAttribute('role', 'status');
  const undo = document.createElement('button');
  undo.type = 'button';
  undo.textContent = 'Zhbëj';
  box.append(message, undo);
  document.body.append(box);
  let latest = null,
    timer,
    gesture = null,
    suppressClickUntil = 0;
  function hide() {
    latest = null;
    clearTimeout(timer);
    box.hidden = true;
  }
  function episodeSaved(entry) {
    hide();
    if (!entry.seen) return;
    latest = { ...entry, owner: ctx.owner(), eventId: ctx.history()?.eventId };
    message.textContent =
      entry.format === 'MOVIE' ? 'Filmi u shënua ✓' : `Episodi ${entry.n} u shënua ✓`;
    undo.hidden = false;
    box.hidden = false;
    timer = setTimeout(hide, 12000);
  }
  undo.addEventListener('click', () => {
    const entry = latest;
    const valid =
      entry &&
      entry.owner === ctx.owner() &&
      entry.eventId &&
      entry.eventId === ctx.history()?.eventId;
    hide();
    const saved = valid && ctx.undo(entry.id, entry.seasonId, entry.n);
    message.textContent = saved ? 'Shënimi u zhbë ✓' : 'Progresi ka ndryshuar. Nuk u zhbë.';
    undo.hidden = true;
    box.hidden = false;
    timer = setTimeout(hide, 5000);
  });
  document.addEventListener('pointerdown', (event) => {
    gesture = null;
    if (event.pointerType !== 'touch' || !event.isPrimary || window.innerWidth > 760) return;
    const card = event.target.closest('.at114-watch-card, .watch-row');
    const button = card?.querySelector(
      '[data-ios-action="advance"],[data-ios-action="mark-recent"]',
    );
    if (!button || button.disabled) return;
    gesture = {
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      at: Date.now(),
      button,
    };
  });
  document.addEventListener('pointercancel', () => {
    gesture = null;
  });
  document.addEventListener('pointerup', (event) => {
    const start = gesture;
    gesture = null;
    if (!start || start.pointer !== event.pointerId || !start.button.isConnected) return;
    const dx = event.clientX - start.x,
      dy = event.clientY - start.y;
    if (dx < 88 || Math.abs(dy) > 32 || Date.now() - start.at > 900) return;
    event.preventDefault();
    suppressClickUntil = Date.now() + 500;
    start.button.click();
  });
  document.addEventListener(
    'click',
    (event) => {
      if (
        event.isTrusted &&
        event.target.closest('.at114-watch-card, .watch-row') &&
        Date.now() < suppressClickUntil
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        suppressClickUntil = 0;
      }
    },
    true,
  );
  function ready() {
    if (ctx.owner() === 'guest') return;
    const url = new URL(location.href);
    const shortcut = url.searchParams.get('shortcut');
    if (['library', 'explore', 'diary'].includes(shortcut)) {
      url.searchParams.delete('shortcut');
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
      ctx.navigate(shortcut);
    }
  }
  return { episodeSaved, ready };
}
