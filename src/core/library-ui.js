import { delegateButtons } from './ui-events.js';

/** Binds core controls once; callbacks resolve current account state at action time. */
export function bindLibraryUI(ctx) {
  const $ = ctx.el;
  $('add-btn').addEventListener('click', () => ctx.openForm());
  $('hero-add').addEventListener('click', () => ctx.openForm());
  $('view-watching').addEventListener('click', () => ctx.setFilter('watching'));
  $('anime-form').addEventListener('submit', ctx.saveForm);
  $('delete-btn').addEventListener('click', ctx.deleteAnime);
  $('search').addEventListener('input', (e) => ctx.syncSearch(e.target.value, 'top'));
  $('sort').addEventListener('change', (e) => {
    ctx.setSort(e.target.value);
    ctx.render();
  });
  $('export-btn').addEventListener('click', ctx.exportData);
  $('export-mobile').addEventListener('click', ctx.exportData);
  $('import-btn').addEventListener('click', () => $('import-file').click());
  $('import-mobile').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', (e) => ctx.importData(e.target.files?.[0]));
  delegateButtons(document, (b) => {
    if (b.dataset.filter) ctx.setFilter(b.dataset.filter);
    if (b.dataset.catalogAdd) {
      ctx.addCatalogItem(b.dataset.catalogAdd, b.dataset.catalogStatus).then((id) => {
        if (id) ctx.openDetail(id);
      });
    }
    if (b.dataset.preview) ctx.openCatalogPreview(b.dataset.preview);
    if (b.dataset.catalogRetry) ctx.searchCatalog(ctx.catalogQuery(), 1);
    if (b.dataset.close) ctx.closeModal(b.dataset.close);
    if (b.dataset.detail) ctx.openDetail(b.dataset.detail);
    if (b.dataset.edit) ctx.openForm(b.dataset.edit);
    if (b.dataset.next) ctx.markNext(b.dataset.next);
    if (b.dataset.season) {
      ctx.selectSeason(b.dataset.season);
      ctx.renderDetail(b.dataset.id);
      ctx.loadSeasonEpisodes(b.dataset.id, ctx.activeSeasonId(), 0);
    }
    if (b.dataset.seasonEp) {
      const a = ctx.state().anime.find((a) => a.id === b.dataset.id),
        s = a?.seasons.find((s) => s.id === b.dataset.seasonEp),
        n = Number(b.dataset.ep);
      if (s) ctx.requestEpisodeToggle(a.id, s.id, n);
    }
    if (b.dataset.seasonToggle)
      ctx.markSeason(b.dataset.id, b.dataset.seasonToggle, b.dataset.seen === '1');
    if (b.dataset.addSeason) ctx.addManualSeason(b.dataset.addSeason);
    if (b.dataset.seasonEdit) ctx.editSeasonCount(b.dataset.id, b.dataset.seasonEdit);
    if (b.dataset.syncSeasons) ctx.hydrateSeasons(b.dataset.syncSeasons, true);
    if (b.dataset.moreEpisodes) {
      const a = ctx.state().anime.find((x) => x.id === b.dataset.id),
        s = a?.seasons.find((x) => x.id === b.dataset.moreEpisodes);
      if (s) ctx.loadSeasonEpisodes(a.id, s.id, ctx.episodePage());
    }
    if (b.dataset.page) {
      if (ctx.detailId()) {
        ctx.shiftPage(b.dataset.page === 'next' ? 1 : -1);
        ctx.renderDetail(ctx.detailId());
        ctx.loadSeasonEpisodes(ctx.detailId(), ctx.activeSeasonId(), ctx.episodePage());
      }
    }
    if (b.dataset.jumpEpisode) ctx.jumpToEpisode(b.dataset.jumpEpisode);
    if (b.dataset.tvSync) ctx.syncTVFranchise(b.dataset.tvSync, true);
    if (b.dataset.upcomingWindow) {
      ctx.setAiringWindow(Number(b.dataset.upcomingWindow));
      ctx.renderUpcoming();
    }
    if (b.dataset.openAiring) ctx.openDetail(b.dataset.openAiring);
    if (b.dataset.favorite) ctx.toggleFavorite(b.dataset.favorite);
    if (b.dataset.removeAnime) ctx.removeAnime(b.dataset.removeAnime);
    if (b.dataset.previewAdd) {
      ctx.addCatalogItem(b.dataset.previewAdd, b.dataset.previewStatus).then((id) => {
        if (id) ctx.openDetail(id);
      });
    }
  });
}
