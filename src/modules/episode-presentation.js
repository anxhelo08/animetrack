import { episodeWatchPanel } from './episode-watch.js';
import '../styles/episode-presentation.css';

/** Compact episode card. Existing detail controls and spoiler protection remain available. */
export function presentEpisode(ctx) {
  const { a, s, n, ep } = ctx.parts();
  const root = ctx.el('ep-detail-body');
  if (!a || !s || !root) return;
  const seen = s.watched.includes(n);
  const number = ctx.seasonNumber(a, s);
  const movie = s.format === 'MOVIE';
  if (!movie) ctx.el('ep-detail-heading').textContent = a.title;
  const label = movie ? 'Film' : `Sezoni ${number} · Episodi ${n}`;
  const title = ep?.title || (movie ? s.subtitle || a.title : `Episodi ${n}`);
  const history = [...ctx.history()]
    .reverse()
    .find(
      (event) =>
        event.id === a.id &&
        event.seasonId === s.id &&
        Number(event.episode) === n &&
        event.action === 'watched',
    );
  const rating = history?.diaryRating ?? ep?.personalRating ?? null;
  const date = ep?.airedAt || ep?.aired;
  const aired =
    date && Number.isFinite(Date.parse(date))
      ? new Date(date).toLocaleDateString('sq-AL', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '';
  let visual = root.querySelector('.ep-detail-visual');
  if (!visual) {
    visual = document.createElement('div');
    visual.className = 'ep-detail-visual';
    const poster = ctx.poster(a.cover);
    window.ATHTML.renderHTML(
      visual,
      poster
        ? `<img src="${ctx.esc(poster)}" alt="Posteri i ${ctx.esc(a.title)}" referrerpolicy="no-referrer">`
        : `<strong>${ctx.esc(title)}</strong>`,
    );
  }
  const mark = root.querySelector('[data-episode-mark]');
  const card = document.createElement('section');
  card.className = 'episode-card';
  window.ATHTML.renderHTML(
    card,
    `<div class="episode-card-subtitle">${ctx.esc(label)} · ${ctx.esc(title)}</div><div class="episode-card-art"><span class="episode-card-badge">${seen ? '✓ I PARË' : 'PËR T’U PARË'}</span></div><div class="episode-card-scores">${ep?.imdbRating != null ? `<span><b>IMDb</b> ${ctx.esc(ep.imdbRating)}/10</span>` : ''}</div><div class="episode-card-navigation">${movie ? '' : `<button type="button" data-v98-move="-1" aria-label="Episodi i mëparshëm" ${n <= 1 ? 'disabled' : ''}>‹</button>`}<strong>${ctx.esc(label)}</strong>${movie ? '' : `<button type="button" data-v98-move="1" aria-label="Episodi pasardhës" ${n >= ctx.released(s) ? 'disabled' : ''}>›</button>`}</div><p class="episode-card-meta">${ctx.esc([aired, ep?.runtime ? ep.runtime + ' min' : '', a.genre].filter(Boolean).join(' · '))}</p><div class="episode-card-watch"></div><div class="episode-card-rating"><span>${seen && history ? 'Parë më ' + ctx.esc(new Date(history.date).toLocaleDateString('sq-AL')) : seen ? 'I parë' : 'Pa aktivitet'}</span><div role="group" aria-label="Vlerësimi i episodit">${Array.from({ length: 5 }, (_, i) => `<button type="button" data-episode-stars="${i + 1}" class="${rating >= (i + 1) * 2 ? 'selected' : ''}" aria-label="${i + 1} ${i ? 'yje' : 'yll'}" aria-pressed="${Number(rating) === (i + 1) * 2}">★</button>`).join('')}</div></div>`,
  );
  if (visual) card.querySelector('.episode-card-art').prepend(visual);
  if (mark) {
    mark.classList.add('episode-card-mark');
    mark.textContent = seen ? '✓ I parë' : '✓ E pashë';
    mark.setAttribute('aria-label', seen ? 'Hiq shënimin e episodit' : 'Shëno episodin si të parë');
    if (seen && history) {
      mark.removeAttribute('data-episode-mark');
      mark.dataset.episodeEdit = 'true';
      mark.setAttribute('aria-label', 'Ndrysho datën e shikimit');
    }
    card.querySelector('.episode-card-watch').append(mark);
  }
  card.append(episodeWatchPanel(ctx, { a, s, n, ep }, label));
  const more = document.createElement('details');
  more.className = 'episode-card-more';
  const summary = document.createElement('summary');
  summary.textContent = 'Përshkrimi, shënimet dhe diskutimi';
  summary.tabIndex = 0;
  more.append(summary);
  more.open = !!ctx.expanded;
  root.dataset.episodeCardKey = [a.id, s.id, n].join(':');
  while (root.firstChild) more.append(root.firstChild);
  root.append(card, more);
  ctx.el('episode-detail-modal').classList.add('episode-card-modal');
  ctx.el('episode-detail-modal').querySelector('.at124-episode-quickbar')?.remove();
}
