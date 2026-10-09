import {
  watchProvider,
  watchProviders,
  watchSearchURL,
  watchEpisodeTarget,
  cinehdSeriesLink,
} from '../core/watch-links.js';

/** Provider presentation is shared by watched and unwatched episode cards. */
export function episodeWatchPanel(ctx, { a, s, n, ep }, label) {
  const sources = watchProviders(a);
  const direct = watchEpisodeTarget(a, s, n, ep);
  const provider =
    sources.find(
      (source) =>
        direct && new URL(direct).hostname.replace(/^www\./, '') === new URL(source.url).hostname,
    ) || watchProvider(a);
  const movie = s.format === 'MOVIE';
  const anime = watchProvider(a).name === 'Anisuge';
  const help = movie
    ? 'Ruaj lidhjen që hap këtë film nga një prej burimeve më poshtë.'
    : anime
      ? 'Lidh një episod nga Anisuge ose Way2Movies. Kur lidhja ka numrin e episodit, episodet e tjera të këtij sezoni lidhen automatikisht.'
      : 'CineHD mund të ruajë faqen e serialit. Në Atlantic ruaj lidhjen e saktë të episodit ose filmit.';
  const panel = document.createElement('section');
  panel.className = 'episode-card-providers';
  window.ATHTML.renderHTML(
    panel,
    `<strong>Ku mund ta shoh?</strong><a href="${ctx.esc(direct || provider.url)}" target="_blank" rel="noopener noreferrer"><img src="${provider.icon}" alt=""><span>${provider.name}<small>${ctx.esc(a.title)} · ${ctx.esc(label)}</small></span><b aria-hidden="true">↗</b></a><small>${direct ? (cinehdSeriesLink(direct) ? 'Hap serialin dhe zgjidh episodin në CineHD.' : 'Hap lidhjen që ke ruajtur për këtë episod.') : 'Kopjo titullin dhe kërkoje në faqen e shikimit.'}</small>${!direct ? '<button type="button" data-episode-copy-title>Kopjo titullin</button>' : ''}<details class="episode-provider-link"><summary>${direct ? 'Ndrysho' : 'Vendos'} lidhjen e ${movie ? 'filmit' : anime ? 'sezonit' : 'serialit ose episodit'}</summary><label>Lidhja ${anime && !movie ? 'e këtij episodi ' : ''}nga ${sources.map((source) => source.name).join(' / ')}<input type="url" data-episode-watch-url value="${ctx.esc(direct)}" placeholder="${provider.url}" maxlength="2000" autocomplete="off" aria-describedby="episode-watch-help"></label><small id="episode-watch-help">${ctx.esc(help)}</small><button type="button" data-episode-watch-save>Ruaj lidhjen</button></details><div class="episode-extra-sources">${sources
      .filter((source) => source.name !== provider.name)
      .map(
        (source) =>
          `<a href="${source.url}" target="_blank" rel="noopener noreferrer"><img src="${source.icon}" alt=""><span>${source.name}</span><b aria-hidden="true">↗</b></a><a href="${ctx.esc(watchSearchURL(source, a, s, n))}" target="_blank" rel="noopener noreferrer">Kërko ${movie ? 'filmin' : 'episodin'} në ${source.name} · Google ↗</a>`,
      )
      .join('')}</div><small role="status" data-episode-watch-status></small>`,
  );
  panel.querySelectorAll('a').forEach((link) => {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });
  return panel;
}
