const PREFIX = '#list=';
const safe = (value) => String(value || '').trim();
/** A deliberate public snapshot: progress, diary and personal notes never leave the device. */
export function listSnapshot(title, items) {
  return {
    v: 1,
    title: safe(title).slice(0, 50),
    items: items.slice(0, 150).map((item) => ({
      title: safe(item.title).slice(0, 180),
      kind: ['manga', 'manhwa', 'Film', 'Serial', 'Anime'].includes(item.kind)
        ? item.kind
        : item.kind === 'movie' ||
            (String(item.format).toUpperCase() === 'MOVIE' &&
              ['TMDB', 'OMDb', 'Cinemeta', 'Wikidata'].includes(item.source))
          ? 'Film'
          : item.kind === 'tv' || item.source === 'TVMaze' || item.format === 'TV_SERIES'
            ? 'Serial'
            : 'Anime',
      year: Number(item.year) || null,
    })),
  };
}
export function sharedListURL(title, items, base = 'https://animetrack-flax.vercel.app/') {
  const bytes = new TextEncoder().encode(JSON.stringify(listSnapshot(title, items)));
  const encoded = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
  return base + PREFIX + encoded.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
export function parseSharedList(hash) {
  if (!hash.startsWith(PREFIX) || hash.length > 160000) return null;
  try {
    const encoded = hash.slice(PREFIX.length).replaceAll('-', '+').replaceAll('_', '/');
    const data = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(
        Uint8Array.from(atob(encoded), (ch) => ch.charCodeAt(0)),
      ),
    );
    if (
      data.v !== 1 ||
      typeof data.title !== 'string' ||
      !Array.isArray(data.items) ||
      data.items.length > 150 ||
      !data.items.every((item) => item && typeof item.title === 'string')
    )
      return null;
    return listSnapshot(data.title, data.items);
  } catch {
    return null;
  }
}
export async function shareList(ctx, title, items) {
  if (
    !ctx.confirm(
      'Krijo lidhje publike me emrin e listës dhe titujt? Kush ka lidhjen mund ta hapë këtë kopje. Shënimet, notat dhe progresi mbeten privatë. Kopja nuk ndryshon kur përditëson listën.',
    )
  )
    return false;
  const url = sharedListURL(title, items);
  try {
    if (navigator.share) await navigator.share({ title: 'AnimeTrack · ' + title, url });
    else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      ctx.toast('Lidhja e listës u kopjua ✓');
    } else {
      ctx.prompt('Kopjo lidhjen e listës:', url);
    }
    return true;
  } catch (error) {
    if (error.name !== 'AbortError') ctx.toast('Ndarja nuk u krye.');
    return false;
  }
}
export function mountSharedList(ctx) {
  const show = () => {
    document.getElementById('shared-list-preview')?.remove();
    const data = parseSharedList(location.hash);
    if (!data) return;
    const root = document.createElement('dialog');
    root.id = 'shared-list-preview';
    root.className = 'shared-list-preview';
    window.ATHTML.renderHTML(
      root,
      `<header><div><small>ANIMETRACK · LISTË E NDARË</small><h2>${ctx.esc(data.title)}</h2></div><button type="button" aria-label="Mbyll listën">×</button></header><p>${data.items.length} tituj · Kopje publike vetëm për lexim.</p><ol>${data.items.map((item) => `<li><strong>${ctx.esc(item.title)}</strong><small>${ctx.esc(item.kind)}${item.year ? ' · ' + item.year : ''}</small></li>`).join('')}</ol>`,
    );
    document.body.append(root);
    root.showModal();
    root.querySelector('button').addEventListener('click', () => root.close());
    root.addEventListener('close', () => {
      root.remove();
      history.replaceState(null, '', location.pathname + location.search);
    });
  };
  show();
  window.addEventListener('hashchange', show);
}
