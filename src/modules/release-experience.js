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
  const journal = document.createElement('section');
  journal.className = 'release-journal';
  journal.hidden = true;
  const title = document.createElement('strong');
  const stars = document.createElement('div');
  stars.className = 'release-stars';
  stars.setAttribute('role', 'group');
  stars.setAttribute('aria-label', 'Vlerësimi i episodit, nga 1 në 5 yje');
  const ratingLabel = document.createElement('span');
  const dates = document.createElement('div');
  dates.className = 'release-dates';
  function button(label, action) {
    const control = document.createElement('button');
    control.type = 'button';
    control.textContent = label;
    control.addEventListener('click', action);
    return control;
  }
  const now = button('E pashë tani', () => updateJournal({ date: new Date().toISOString() }));
  const aired = button('Kur doli', () => {
    const entry = ctx.journal?.(latest);
    if (entry?.releaseDate) updateJournal({ date: entry.releaseDate });
  });
  const custom = button('Zgjidh datën', () => {
    dateLabel.hidden = false;
    dateInput.focus();
  });
  const dateLabel = document.createElement('label');
  dateLabel.textContent = 'Data dhe ora e shikimit';
  dateLabel.hidden = true;
  const dateInput = document.createElement('input');
  dateInput.type = 'datetime-local';
  dateInput.addEventListener('change', () => updateJournal({ date: dateInput.value }));
  dateLabel.append(dateInput);
  const status = document.createElement('small');
  status.setAttribute('role', 'status');
  for (let value = 1; value <= 5; value++) {
    const star = button('★', () => updateJournal({ rating: value * 2 }));
    star.dataset.rating = String(value);
    star.setAttribute('aria-label', `${value} ${value === 1 ? 'yll' : 'yje'}`);
    stars.append(star);
  }
  stars.append(
    ratingLabel,
    button('Hiq notën', () => updateJournal({ rating: null })),
  );
  dates.append(now, aired, custom);
  const done = button('Mbyll', hide);
  done.className = 'release-journal-close';
  journal.append(title, stars, dates, dateLabel, status, done);
  box.append(journal);
  document.body.append(box);
  let latest = null,
    timer,
    gesture = null,
    suppressClickUntil = 0;
  function hide() {
    latest = null;
    clearTimeout(timer);
    box.hidden = true;
    journal.hidden = true;
  }
  function paintJournal(entry) {
    title.textContent = entry.title;
    ratingLabel.textContent = entry.rating == null ? 'Pa vlerësim' : `${entry.rating / 2}/5`;
    stars.querySelectorAll('[data-rating]').forEach((star) => {
      star.classList.toggle('selected', Number(star.dataset.rating) * 2 <= entry.rating);
      star.setAttribute('aria-pressed', String(Number(star.dataset.rating) * 2 === entry.rating));
    });
    aired.disabled = !entry.releaseDate;
    aired.title = entry.releaseDate
      ? 'Përdor datën e konfirmuar të episodit'
      : 'Data e publikimit ende nuk dihet';
    const date = new Date(entry.date);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    dateInput.value = local.toISOString().slice(0, 16);
  }
  function updateJournal(changes) {
    if (!latest || latest.owner !== ctx.owner()) return;
    const result = ctx.journal?.(latest, changes);
    status.textContent = result
      ? 'U ruajt në Diary ✓'
      : 'Nuk u ruajt. Kontrollo datën dhe provo përsëri.';
    if (result) paintJournal(result);
    clearTimeout(timer);
  }
  box.addEventListener('focusin', () => clearTimeout(timer));
  box.addEventListener('pointerenter', () => clearTimeout(timer));
  function episodeSaved(entry) {
    hide();
    if (!entry.seen) return;
    latest = { ...entry, owner: ctx.owner(), eventId: ctx.history()?.eventId };
    message.textContent =
      entry.format === 'MOVIE' ? 'Filmi u shënua ✓' : `Episodi ${entry.n} u shënua ✓`;
    undo.hidden = false;
    box.hidden = false;
    const metadata = ctx.journal?.(latest);
    if (metadata) {
      journal.hidden = false;
      dateLabel.hidden = true;
      status.textContent = 'Vlerësimi është opsional · Shikimi u ruajt';
      paintJournal(metadata);
    }
    timer = setTimeout(hide, metadata ? 40000 : 12000);
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
