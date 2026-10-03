import { escapeHTML as esc, percentClass } from './safe-html.js';
import { navIcon } from './nav-icons.js';

export const MEDIA_CARD_VARIANTS = [
  'Standard',
  'ContinueWatching',
  'Upcoming',
  'Compact',
  'Activity',
];

/** Presentation only. Callers supply validated artwork and existing controller actions. */
export function MediaCard(item, options = {}) {
  const variant = MEDIA_CARD_VARIANTS.includes(options.variant) ? options.variant : 'Standard';
  const action = options.library
    ? `data-detail="${esc(item.id)}"`
    : variant === 'Activity'
      ? 'data-mobile-action="navigate" data-mobile-target="friends"'
      : options.recommendation
        ? `data-pro-action="preview-recommendation" data-key="${esc(item.key)}"`
        : `data-mobile-action="${options.episode ? 'episode' : 'detail'}" data-id="${esc(item.id)}"`;
  const poster = options.poster?.(item.cover || item.image || '') || '';
  const art = poster
    ? `<img src="${esc(poster)}" alt="" loading="${options.priority ? 'eager' : 'lazy'}" decoding="async" referrerpolicy="no-referrer">`
    : '<span class="media-card-placeholder" aria-hidden="true">✦</span>';
  const progress = Number.isFinite(options.progress)
    ? `<span class="media-card-progress" role="progressbar" aria-label="Progresi i ${esc(item.title)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(Math.max(0, Math.min(100, options.progress)))}"><i class="${percentClass(options.progress)}"></i></span>`
    : '';
  return `<article class="media-card media-card--${variant}${options.library ? ' anime-card' : ''}${variant === 'ContinueWatching' ? ' at114-watch-card' : ''}" data-media-card="${variant}"${options.library ? ` data-media="${esc(options.kind)}" data-status="${esc(item.status)}"` : ''}>
    <button type="button" class="media-card-art${options.library ? ' at120-card-poster' : ''}" ${action} aria-label="Hap ${esc(item.title)}">${art}${variant === 'ContinueWatching' ? '<span class="media-card-play" aria-hidden="true">' + navIcon('watch') + '</span>' : ''}${progress}</button>
    ${options.library && options.status ? `<span class="status-badge">${esc(options.status)}</span>` : ''}${options.newEpisode ? '<span class="anime-new-episode" aria-label="Episod i ri pa parë">NEW · EP</span>' : ''}
    <div class="media-card-copy${options.library ? ' card-info' : ''}">${options.eyebrow ? `<span class="media-card-eyebrow">${esc(options.eyebrow)}</span>` : ''}
      <button type="button" class="media-card-title${options.library ? ' card-title at120-card-title' : ''}" ${action}>${esc(item.title)}</button>
      ${options.subtitle ? `<p>${esc(options.subtitle)}</p>` : ''}
      ${options.meta ? `<small>${esc(options.meta)}</small>` : ''}
      ${options.chip ? `<span class="media-card-chip">${esc(options.chip)}</span>` : ''}
      ${variant === 'ContinueWatching' ? `<button type="button" class="media-card-mark" data-ios-action="advance" data-id="${esc(item.id)}" aria-label="Shëno episodin e radhës të ${esc(item.title)} si të parë">✓ Shëno si të parë</button>` : ''}
      ${options.library ? `<div class="card-actions"><button type="button" class="ghost" data-detail="${esc(item.id)}">Detajet</button><button type="button" class="plus" data-next="${esc(item.id)}" aria-label="Shëno episodin tjetër të ${esc(item.title)}" ${options.canMark ? '' : 'disabled'}>+1</button></div>` : ''}
    </div></article>`;
}

/** Standalone films, OVAs and specials never consume a TV-season number. */
export function mobilePartLabel(part, number) {
  const format = String(part?.format || 'TV').toUpperCase();
  if (format === 'MOVIE') return 'Film';
  if (['OVA', 'SPECIAL', 'ONA_SPECIAL', 'MUSIC'].includes(format))
    return format === 'SPECIAL' ? 'Special' : format;
  return number > 0
    ? `Sezoni ${number}`
    : part?.hidden
      ? 'Sezon i fshehur'
      : part?.title || 'Sezon';
}

export function mobileEpisodeLabel(part, number, episode) {
  const label = mobilePartLabel(part, number);
  return label.startsWith('Sezoni')
    ? `S${number} EP${episode}`
    : `${label}${part?.format === 'MOVIE' ? '' : ' · EP' + episode}`;
}
