import { MediaCard } from './media-card.js';
import { seriesProgress } from '../core/series-progress.js';
/** Single card presenter; only read model functions are injected. */
export function createLibraryCard({
  releasedCount,
  validPoster,
  mediaKind,
  STATUS,
  count,
  releasedTotal,
  percentage,
  nextSeasonEp,
  hasNewUnwatchedEpisode,
  cover,
  escapeHTML,
  phone,
  releaseYear,
  percentClass,
}) {
  return function libraryCard(a) {
    const progress = seriesProgress(a, releasedCount),
      progressCopy = progress ? progress.label + ' · ' + progress.detail : '',
      watched = count(a),
      released = releasedTotal(a),
      pct = percentage(a),
      canMark = !!nextSeasonEp(a),
      newEpisode = hasNewUnwatchedEpisode(a),
      year = releaseYear(a);
    return phone()
      ? MediaCard(a, {
          library: true,
          poster: validPoster,
          kind: mediaKind(a),
          status: STATUS[a.status],
          subtitle: watched + '/' + released + ' ep.',
          meta: [a.year ? String(a.year) : '', progressCopy].filter(Boolean).join(' · '),
          progress: pct,
          canMark: canMark,
          newEpisode: newEpisode,
          chip: a.rating != null ? '★ ' + a.rating + '/10' : (a.genre || '').split(',')[0],
        })
      : `<article class="anime-card" data-media="${mediaKind(a)}" data-status="${a.status}" data-release-year="${year ?? ''}"><button type="button" class="at120-card-poster" data-detail="${escapeHTML(a.id)}" aria-label="Hap ${escapeHTML(a.title)}">${cover(a, 'poster')}</button><div class="status-badge">${STATUS[a.status]}</div>${newEpisode ? '<span class="anime-new-episode" aria-label="Episod i ri pa parë">NEW · EP</span>' : ''}${a.favorite ? '<div class="favorite-badge">♥</div>' : ''}${a.rating != null ? `<div class="score-badge">★ ${a.rating}/10</div>` : ''}<div class="card-info"><div class="at125-card-year"><span class="at125-year-dot" aria-hidden="true"></span><span>${year == null ? 'Viti i premierës nuk dihet' : 'Premiera · <b>' + year + '</b>'}</span></div><button type="button" class="card-title at120-card-title" data-detail="${escapeHTML(a.id)}" title="${escapeHTML(a.title)}">${escapeHTML(a.title)} ›</button><div class="card-row"><span>${watched}/${released} ep.</span><div class="progress"><span class="${percentClass(pct)}"></span></div><span>${released ? pct + '%' : '—'}</span></div>${progress ? '<p class="series-progress-note" data-series-progress="' + progress.key + '">' + escapeHTML(progressCopy) + '</p>' : ''}<div class="card-actions"><button class="ghost" data-detail="${escapeHTML(a.id)}">Shiko detajet</button><button class="plus" title="Shëno episodin tjetër" aria-label="Episodi tjetër i ${escapeHTML(a.title)}" data-next="${escapeHTML(a.id)}" ${canMark ? '' : 'disabled'}>+1</button></div></div></article>`;
  };
}
