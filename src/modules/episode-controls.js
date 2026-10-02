import { watchLinkPlan, watchProvider } from '../core/watch-links.js';

const mounted = new WeakMap();
/** One scoped listener owns the card's personal changes; failures restore the whole transaction. */
export function mountEpisodeControls(ctx) {
  const root = ctx.root;
  if (!root || mounted.has(root)) return mounted.get(root);
  const latestWatch = (a, s, n) =>
    [...ctx.state().history]
      .reverse()
      .find(
        (event) =>
          event.id === a.id &&
          event.seasonId === s.id &&
          Number(event.episode) === n &&
          event.action === 'watched',
      );
  const status = (text) => {
    const node = root.querySelector('[data-episode-watch-status]');
    if (node) node.textContent = text;
  };
  async function click(event) {
    const button = event.target.closest('button');
    if (!button || !root.contains(button)) return;
    const { a, s, n } = ctx.parts();
    if (!a || !s) return;
    if (button.hasAttribute('data-episode-copy-title')) {
      try {
        await navigator.clipboard.writeText(a.title);
        if (ctx.parts().a?.id === a.id && ctx.parts().n === n) status('Titulli u kopjua ✓');
      } catch {
        if (ctx.parts().a?.id === a.id && ctx.parts().n === n) status('Titulli: ' + a.title);
      }
      return;
    }
    if (button.hasAttribute('data-episode-watch-save')) {
      const input = root.querySelector('[data-episode-watch-url]');
      if (!input) return;
      const plan = watchLinkPlan(a, s, n, input.value);
      if (plan.error) {
        status(plan.error);
        return;
      }
      const before = structuredClone(ctx.state());
      const ep = ctx.episodeRow(s, n);
      if (plan.scope === 'season') {
        s.watchUrl = plan.url;
        s.watchEpisodeOffset = plan.offset;
        ep.watchUrl = '';
      } else if (plan.scope === 'series') {
        a.watchUrl = plan.url;
        s.watchUrl = '';
        ep.watchUrl = '';
      } else if (plan.scope === 'episode') ep.watchUrl = plan.url;
      else {
        ep.watchUrl = '';
        s.watchUrl = '';
        s.watchEpisodeOffset = 0;
        if (watchProvider(a).name === 'CineHD') a.watchUrl = '';
      }
      a.updatedAt = ctx.stamp();
      if (!ctx.save()) {
        ctx.restore(before);
        status('Lidhja nuk u ruajt. Provo përsëri.');
        return;
      }
      ctx.render();
      ctx.toast(plan.url ? 'Lidhja e shikimit u ruajt ✓' : 'Lidhja e shikimit u hoq');
      return;
    }
    if (button.hasAttribute('data-episode-edit')) {
      const watched = latestWatch(a, s, n);
      if (watched)
        ctx.journal({
          id: a.id,
          seasonId: s.id,
          n,
          seen: true,
          format: s.format,
          eventId: watched.eventId,
          edit: true,
        });
      return;
    }
    if (button.hasAttribute('data-episode-stars')) {
      const rating = Number(button.dataset.episodeStars) * 2;
      if (!Number.isInteger(rating) || rating < 2 || rating > 10) return;
      const before = structuredClone(ctx.state());
      const ep = ctx.episodeRow(s, n);
      ep.personalRating = ep.personalRating === rating ? null : rating;
      const watched = latestWatch(a, s, n);
      if (s.watched.includes(n) && watched) watched.diaryRating = ep.personalRating;
      a.updatedAt = ctx.stamp();
      if (!ctx.save()) {
        ctx.restore(before);
        return;
      }
      ctx.render();
      ctx.renderDetail(a.id);
    }
  }
  root.addEventListener('click', click);
  const dispose = () => {
    root.removeEventListener('click', click);
    mounted.delete(root);
  };
  mounted.set(root, dispose);
  return dispose;
}
