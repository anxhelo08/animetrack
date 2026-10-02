import { watchProvider, watchEpisodeTarget, cinehdSeriesLink } from '../core/watch-links.js';

/** Provider presentation is shared by watched and unwatched episode cards. */
export function episodeWatchPanel(ctx, { a, s, n, ep }, label) {
  const provider = watchProvider(a);
  const direct = watchEpisodeTarget(a, s, n, ep);
  const movie = s.format === 'MOVIE';
  const anime = provider.name === 'Anisuge';
  const help = movie
    ? 'Ruaj lidhjen që hap këtë film.'
    : anime
      ? 'Kopjo lidhjen e episodit që ke hapur këtu. Episodet e tjera të këtij sezoni lidhen automatikisht, edhe kur faqja përdor numra të ndryshëm.'
      : 'Lidhja e faqes së serialit përdoret për të gjitha sezonet. Episodin e zgjedh brenda CineHD; mund të ruash edhe një lidhje për këtë episod.';
  const panel = document.createElement('section');
  panel.className = 'episode-card-providers';
  window.ATHTML.renderHTML(
    panel,
    `<strong>Ku mund ta shoh?</strong><a href="${ctx.esc(direct || provider.url)}" target="_blank" rel="noopener noreferrer"><img src="${provider.icon}" alt=""><span>${provider.name}<small>${ctx.esc(a.title)} · ${ctx.esc(label)}</small></span><b aria-hidden="true">↗</b></a><small>${direct ? (cinehdSeriesLink(direct) ? 'Hap serialin dhe zgjidh episodin në CineHD.' : 'Hap lidhjen që ke ruajtur për këtë episod.') : 'Kopjo titullin dhe kërkoje në faqen e shikimit.'}</small>${!direct ? '<button type="button" data-episode-copy-title>Kopjo titullin</button>' : ''}<details class="episode-provider-link"><summary>${direct ? 'Ndrysho' : 'Vendos'} lidhjen e ${movie ? 'filmit' : anime ? 'sezonit' : 'serialit ose episodit'}</summary><label>Lidhja ${anime && !movie ? 'e këtij episodi ' : ''}nga ${provider.name}<input type="url" data-episode-watch-url value="${ctx.esc(direct)}" placeholder="${provider.url}" maxlength="2000" autocomplete="off" aria-describedby="episode-watch-help"></label><small id="episode-watch-help">${ctx.esc(help)}</small><button type="button" data-episode-watch-save>Ruaj lidhjen</button></details><small role="status" data-episode-watch-status></small>`,
  );
  panel.querySelector('a').target = '_blank';
  return panel;
}
