import { refreshReadingChecks } from './reading-background.js';
import { readingWeeklyStats } from '../core/reading-discovery.js';
import { shareList } from './shared-lists.js';
import { normalizeReadingLibrary, nextChapter } from '../core/reading-model.js';

export function createReadingWorkspace(ctx, render) {
  const esc = ctx.esc;
  let collection = '',
    provider = 'anilist',
    preview = [],
    busy = false,
    message = '',
    owner = '';
  const rows = () => (ctx.state().readingLibrary || []).filter((row) => !row.deletedAt);
  const lists = () =>
    (ctx.state().preferences?.customLists || []).filter((list) => list.scope === 'reading');
  const btn = (action, text, id = '') =>
    `<button type="button" class="ghost" data-reading-extra="${action}" data-id="${esc(id)}">${text}</button>`;
  function reset() {
    const id = ctx.user()?.id || 'guest';
    if (owner !== id) {
      owner = id;
      preview = [];
      collection = '';
      message = '';
      busy = false;
    }
  }
  function prefs(change) {
    const state = ctx.state(),
      previous = structuredClone(state.preferences || {});
    state.preferences ||= {};
    change(state.preferences);
    if (!ctx.save()) {
      ctx.state().preferences = previous;
      return false;
    }
    render();
    return true;
  }
  function collections() {
    reset();
    const chosen = lists().find((list) => list.id === collection) || lists()[0];
    collection = chosen?.id || '';
    const ids = new Set(chosen?.readingIds || []);
    return `<section class="reading-panel"><div class="reading-section-title"><h3>Koleksionet e leximit</h3><p>Lista private për Manga dhe Manhwa. Ti zgjedh kur t’i ndash.</p></div><form id="reading-collection-create" class="reading-inline-form"><label class="reading-field">Emri i listës<input name="collectionTitle" minlength="2" maxlength="50" required placeholder="P.sh. Fantasy për fundjavë"></label><button class="primary">Krijo listë</button></form><div class="reading-filter-chips">${lists()
      .map((list) => btn('collection-select', esc(list.title), list.id))
      .join('')}</div>${
      chosen
        ? `<div class="reading-section-title"><h4>${esc(chosen.title)}</h4><div>${btn('collection-share', 'Ndaj lidhjen', chosen.id)}${btn('collection-rename', 'Ndrysho emrin', chosen.id)}${btn('collection-delete', 'Fshi listën', chosen.id)}</div></div><div class="reading-collection-items">${
            [...rows()]
              .sort((a, b) => Number(ids.has(b.id)) - Number(ids.has(a.id)))
              .map(
                (row) =>
                  `<label><input type="checkbox" data-reading-collection-item="${esc(row.id)}" ${ids.has(row.id) ? 'checked' : ''}><span>${esc(row.title)}<small>${row.kind === 'manhwa' ? 'Manhwa' : 'Manga'}</small></span></label>`,
              )
              .join('') || '<p>Shto fillimisht tituj në leximet e tua.</p>'
          }</div>`
        : '<p>Krijo listën tënde të parë.</p>'
    }</section>`;
  }
  function statistics() {
    const stats = readingWeeklyStats(rows()),
      goal = ctx.state().preferences?.readingWeeklyGoal || 20,
      linked = rows().filter((row) => row.weebCentralId && row.checkedAt),
      published = linked.reduce(
        (total, row) => total + (row.publishedEntries || row.totalChapters),
        0,
      ),
      unread = linked.reduce(
        (total, row) => total + Math.max(0, row.totalChapters - row.chaptersRead.length),
        0,
      );
    return `<section class="reading-panel"><div class="reading-section-title"><h3>Java jote në faqe</h3><p>Numërohen kapitujt e shënuar këtë javë, nga e hëna. Nuk llogaritet kohë leximi e hamendësuar.</p></div><div class="reading-facts"><span>WeebCentral · ${linked.length} tituj të kontrolluar</span><span>${published} publikime në këta tituj</span><span>${unread} kapituj të numëruar pa lexuar</span></div><div class="reading-goal"><strong>${stats.chapters} / ${goal}</strong><span>kapituj këtë javë</span><progress max="${goal}" value="${Math.min(goal, stats.chapters)}" aria-label="Progresi i qëllimit javor"></progress></div><form id="reading-goal-form" class="reading-inline-form"><label class="reading-field">Qëllimi javor<input name="goal" type="number" min="1" max="1000" required value="${goal}"></label><button class="ghost">Ruaj qëllimin</button></form><div class="reading-detail-grid"><section><h4>Titujt këtë javë</h4>${stats.titles.map((item) => `<p>${esc(item.title)} <b>${item.chapters} kapituj</b></p>`).join('') || '<p>Vazhdo kapitullin e radhës për të nisur javën.</p>'}</section><section><h4>Zhanret e lexuara</h4><p class="reading-volume-note">Kapitujt e një titulli mund të hyjnë në disa zhanre.</p>${stats.genres.map(([genre, total]) => `<p>${esc(genre)} <b>${total} kapituj</b></p>`).join('') || '<p>Zhanret shfaqen kur titujt kanë metadata.</p>'}</section></div></section>`;
  }
  function snapshot(row) {
    return {
      progress: Math.max(0, (nextChapter(row) || (row.totalChapters || 10000) + 1) - 1),
      status: row.status,
      rating: row.rating,
    };
  }
  const mapStatus = (value) =>
    ({
      CURRENT: 'reading',
      reading: 'reading',
      COMPLETED: 'completed',
      completed: 'completed',
      PAUSED: 'paused',
      on_hold: 'paused',
      DROPPED: 'dropped',
      dropped: 'dropped',
    })[value] || 'planning';
  async function loadPreview() {
    reset();
    const requestOwner = owner,
      requestedProvider = provider;
    busy = true;
    message = '';
    preview = [];
    render();
    try {
      const entries = [];
      for (let offset = 0; offset < 10000; offset += 1000) {
        const result = await ctx.accountService.call({
          action: 'provider',
          provider: requestedProvider,
          operation: 'list',
          mediaType: 'MANGA',
          offset,
        });
        if ((ctx.user()?.id || 'guest') !== requestOwner) return;
        if (requestedProvider === 'anilist') {
          for (const list of result.MediaListCollection?.lists || [])
            for (const entry of list.entries || []) {
              const m = entry.media || {};
              entries.push({
                id: 'reading-al-' + m.id,
                source: 'anilist',
                sourceId: String(m.id),
                anilistId: String(m.id),
                malId: String(m.idMal || ''),
                title: m.title?.english || m.title?.romaji,
                kind: m.countryOfOrigin === 'KR' ? 'manhwa' : 'manga',
                cover: m.coverImage?.extraLarge || m.coverImage?.large,
                genres: (m.genres || []).join(', '),
                year: m.startDate?.year,
                totalChapters: m.chapters || 0,
                totalVolumes: m.volumes || 0,
                publicationStatus: m.status,
                status: mapStatus(entry.status),
                rating: entry.score || null,
                progress: entry.progress || 0,
                volumesRead: entry.progressVolumes || 0,
              });
            }
          break;
        }
        for (const entry of result.data || []) {
          const m = entry.node || {},
            s = entry.list_status || {};
          entries.push({
            id: 'reading-mal-' + m.id,
            source: 'jikan',
            sourceId: String(m.id),
            malId: String(m.id),
            title: m.title,
            kind: m.media_type === 'manhwa' ? 'manhwa' : 'manga',
            cover: m.main_picture?.large || m.main_picture?.medium,
            genres: (m.genres || []).map((g) => g.name).join(', '),
            year: Number(String(m.start_date || '').slice(0, 4)) || null,
            totalChapters: m.num_chapters || 0,
            totalVolumes: m.num_volumes || 0,
            status: mapStatus(s.status),
            rating: s.score || null,
            progress: s.num_chapters_read || 0,
            volumesRead: s.num_volumes_read || 0,
          });
        }
        if ((result.data || []).length < 1000) break;
      }
      const providerId = (row) =>
        requestedProvider === 'anilist'
          ? row.anilistId || (row.source === 'anilist' ? row.sourceId : '')
          : row.malId || (row.source === 'jikan' ? row.sourceId : '');
      const locals = rows().filter((row) => providerId(row));
      const merged = new Map(
        entries.map((remote) => {
          const local = locals.find((row) => providerId(row) === remote.sourceId);
          return [
            remote.sourceId,
            {
              remote,
              local,
              providerId: remote.sourceId,
              conflict:
                !!local &&
                JSON.stringify(snapshot(local)) !==
                  JSON.stringify({
                    progress: remote.progress,
                    status: remote.status,
                    rating: remote.rating,
                  }),
            },
          ];
        }),
      );
      for (const local of locals)
        if (!merged.has(providerId(local)) && providerId(local))
          merged.set(providerId(local), {
            local,
            remote: null,
            conflict: false,
            providerId: providerId(local),
          });
      preview = [...merged.values()];
      message = `${preview.length} tituj. Zgjidh drejtimin për çdo ndryshim; ditari dhe shënimet personale ruhen.`;
    } catch (error) {
      if ((ctx.user()?.id || 'guest') === requestOwner) message = error.message;
    } finally {
      if ((ctx.user()?.id || 'guest') === requestOwner) {
        busy = false;
        render();
      }
    }
  }
  function integration() {
    reset();
    return `<section class="reading-panel"><div class="reading-section-title"><h3>Manga · MAL / AniList Sync</h3><p>Lidh llogarinë te MAL / AniList Sync, pastaj hap krahasimin këtu. Importi nuk fshin shënimet ose ditarin lokal.</p></div><div class="reading-inline-form"><label class="reading-field">Burimi<select id="reading-sync-provider" ${busy ? 'disabled' : ''}><option value="anilist" ${provider === 'anilist' ? 'selected' : ''}>AniList</option><option value="mal" ${provider === 'mal' ? 'selected' : ''}>MyAnimeList</option></select></label>${btn('sync-preview', busy ? 'Po krahasoj…' : 'Krahaso listat')}${btn('sync-settings', 'Lidh llogarinë')}</div><p role="status">${esc(message)}</p><div class="reading-sync-preview">${preview.map((item, index) => `<article><div><strong>${esc(item.local?.title || item.remote?.title)}</strong><small>${item.local ? 'Këtu: ' + snapshot(item.local).progress + ' kapituj · ' + item.local.status : 'Mungon këtu'} · ${item.remote ? 'Burimi: ' + item.remote.progress + ' kapituj · ' + item.remote.status : 'Mungon në burim'}</small>${item.conflict ? '<span class="reading-sync-conflict">Ndryshim që kërkon zgjedhjen tënde</span>' : ''}</div><div>${item.remote ? btn('sync-pull', 'Merr nga burimi', String(index)) : ''}${item.local ? btn('sync-push', 'Dërgo në burim', String(index)) : ''}</div></article>`).join('')}</div></section>`;
  }
  async function syncItem(index, direction) {
    const item = preview[Number(index)];
    if (!item || busy) return;
    if (
      item.conflict &&
      !ctx.confirm(
        'Zëvendëso progresin, statusin dhe notën në ' +
          (direction === 'pull' ? 'këtë bibliotekë' : 'burim') +
          '? Shënimet dhe ditari lokal ruhen.',
      )
    )
      return;
    const requestOwner = ctx.user()?.id || 'guest';
    busy = true;
    render();
    try {
      if (direction === 'push') {
        const row = item.local,
          s = snapshot(row);
        await ctx.accountService.call({
          action: 'provider',
          provider,
          operation: 'update',
          mediaType: 'MANGA',
          id: Number(item.providerId),
          status:
            provider === 'anilist'
              ? {
                  reading: 'CURRENT',
                  completed: 'COMPLETED',
                  paused: 'PAUSED',
                  dropped: 'DROPPED',
                  planning: 'PLANNING',
                }[s.status]
              : {
                  reading: 'reading',
                  completed: 'completed',
                  paused: 'on_hold',
                  dropped: 'dropped',
                  planning: 'plan_to_read',
                }[s.status],
          progress: s.progress,
          score: s.rating || 0,
          volumesRead: row.volumesRead,
        });
        if ((ctx.user()?.id || 'guest') !== requestOwner) return;
        item.remote = { ...row, sourceId: item.providerId, progress: s.progress };
      } else {
        const state = ctx.state(),
          before = structuredClone(state.readingLibrary || []),
          r = item.remote,
          existing = item.local,
          stamp = new Date().toISOString();
        const progress = Math.max(0, Math.min(10000, Number(r.progress) || 0));
        const fresh = {
          ...existing,
          ...r,
          id: existing?.id || r.id,
          totalChapters: r.totalChapters ? Math.max(r.totalChapters, progress) : 0,
          chaptersRead: Array.from({ length: progress }, (_, i) => i + 1),
          journal: existing?.journal || [],
          notes: existing?.notes || '',
          favorite: existing?.favorite || false,
          createdAt: existing?.createdAt || stamp,
          updatedAt: stamp,
        };
        state.readingLibrary = normalizeReadingLibrary([
          fresh,
          ...before.filter((row) => row.id !== fresh.id),
        ]);
        if (!ctx.save()) {
          state.readingLibrary = before;
          throw Error('Importi nuk u ruajt.');
        }
        item.local = state.readingLibrary.find((row) => row.id === fresh.id);
      }
      item.conflict = false;
      message = 'Ndryshimi u ruajt ✓';
    } catch (error) {
      if ((ctx.user()?.id || 'guest') === requestOwner) message = error.message;
    } finally {
      if ((ctx.user()?.id || 'guest') === requestOwner) {
        busy = false;
        render();
      }
    }
  }
  const refreshBackground = () => refreshReadingChecks(ctx, render);
  function mount(root) {
    root.addEventListener('submit', (event) => {
      const form = event.target;
      if (!['reading-goal-form', 'reading-collection-create'].includes(form.id)) return;
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      if (form.id === 'reading-goal-form')
        prefs((p) => (p.readingWeeklyGoal = Math.max(1, Math.min(1000, Number(data.goal) || 20))));
      else {
        const title = String(data.collectionTitle || '')
          .trim()
          .slice(0, 50);
        if (title.length < 2) return;
        if ((ctx.state().preferences?.customLists || []).length >= 50) {
          ctx.toast('Kufiri është 50 lista.');
          return;
        }
        collection = 'list-' + crypto.randomUUID();
        prefs((p) => {
          p.customLists ||= [];
          p.customLists.push({
            id: collection,
            scope: 'reading',
            title,
            animeIds: [],
            readingIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        });
      }
    });
    root.addEventListener('change', (event) => {
      if (event.target.id === 'reading-notifications') {
        prefs((p) => (p.readingNotifications = event.target.checked));
        void refreshBackground();
        return;
      }
      const item = event.target.dataset.readingCollectionItem;
      if (item)
        prefs((p) => {
          const list = p.customLists.find((list) => list.id === collection);
          const ids = new Set(list.readingIds || []);
          if (event.target.checked && ids.size >= 150) {
            ctx.toast('Kufiri është 150 tituj në listë.');
            return;
          }
          event.target.checked ? ids.add(item) : ids.delete(item);
          list.readingIds = [...ids];
          list.updatedAt = new Date().toISOString();
        });
      if (event.target.id === 'reading-sync-provider') {
        if (busy) return;
        provider = event.target.value;
        preview = [];
        message = '';
        render();
      }
      if (event.target.id === 'reading-density')
        prefs((p) => (p.readingDensity = event.target.value === 'compact' ? 'compact' : 'normal'));
    });
    root.addEventListener('click', (event) => {
      const target = event.target.closest('[data-reading-extra]');
      if (!target) return;
      const op = target.dataset.readingExtra,
        id = target.dataset.id,
        list = lists().find((list) => list.id === id);
      if (op === 'collection-select') {
        collection = id;
        render();
      }
      if (op === 'collection-share' && list)
        void shareList(
          ctx,
          list.title,
          (list.readingIds || []).map((id) => rows().find((row) => row.id === id)).filter(Boolean),
        );
      if (
        op === 'collection-delete' &&
        list &&
        ctx.confirm('Fshi listën? Titujt dhe progresi ruhen.')
      )
        prefs((p) => (p.customLists = p.customLists.filter((list) => list.id !== id)));
      if (op === 'collection-rename' && list) {
        const name = ctx.prompt('Emri i ri:', list.title);
        if (name?.trim().length >= 2)
          prefs((p) => {
            const row = p.customLists.find((row) => row.id === id);
            row.title = name.trim().slice(0, 50);
            row.updatedAt = new Date().toISOString();
          });
      }
      if (op === 'sync-preview' && !busy) void loadPreview();
      if (op === 'sync-settings') ctx.navigate('sync');
      if (op === 'sync-pull' || op === 'sync-push')
        void syncItem(id, op === 'sync-pull' ? 'pull' : 'push');
    });
  }
  return { collections, statistics, integration, mount, refreshBackground };
}
