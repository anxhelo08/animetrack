import {
  READING_STATUS,
  normalizeReadingLibrary,
  markChapter,
  nextChapter,
  applyReadingUpdate,
} from '../core/reading-model.js';
import { searchReadingCatalog, refreshReadingCatalog } from './reading-catalog.js';
import { retryCatalogRequests } from '../core/request-cache.js';
import { isNewRelease } from '../core/release-window.js';
import { navIcon } from './nav-icons.js';

export function createReading(ctx) {
  const esc = ctx.esc,
    phone = window.matchMedia('(max-width:760px)');
  let root,
    active = false,
    owner = '',
    tab = 'library',
    query = '',
    kind = 'all',
    status = 'all',
    sort = 'updated',
    publication = 'all',
    autoTimer,
    autoController,
    refreshing = new Set(),
    attempted = new Map(),
    selected = '',
    editing = false,
    chapterPage = 0,
    chapterSort = 'asc',
    chapterQuery = '',
    volume = 'all',
    renderedView = '',
    eventId = '',
    results = [],
    busy = false,
    error = '',
    page = 1,
    hasNext = false,
    controller,
    debounce,
    focusAfter = '';
  const rows = () => (ctx.state().readingLibrary || []).filter((row) => !row.deletedAt);
  const saved = (id) => rows().find((row) => row.id === id);
  const find = (id) => saved(id) || results.find((row) => row.id === id);
  const label = (row) => (row.kind === 'manhwa' ? 'Manhwa' : 'Manga');
  const date = (stamp) =>
    Number.isFinite(Date.parse(stamp)) ? new Date(stamp).toLocaleDateString('sq-AL') : '';
  const button = (action, text, id = '', className = 'ghost', extra = '') =>
    `<button type="button" class="${className}" data-reading-action="${action}" data-id="${esc(id)}" ${extra}>${text}</button>`;
  const image = (row) =>
    ctx.poster(row.cover)
      ? `<img src="${esc(ctx.poster(row.cover))}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
      : `<span class="reading-cover-empty" aria-hidden="true">${navIcon('reading')}</span>`;
  const statusOptions = (current) =>
    Object.entries(READING_STATUS)
      .map(
        ([value, text]) =>
          `<option value="${value}" ${current === value ? 'selected' : ''}>${text}</option>`,
      )
      .join('');
  const kindOptions = (current) =>
    [
      ['all', 'Manga & Manhwa'],
      ['manga', 'Manga'],
      ['manhwa', 'Manhwa'],
    ]
      .map(
        ([value, text]) =>
          `<option value="${value}" ${current === value ? 'selected' : ''}>${text}</option>`,
      )
      .join('');
  function resetOwner() {
    const next = ctx.user()?.id || 'guest';
    if (next === owner) return;
    owner = next;
    clearTimeout(autoTimer);
    autoController?.abort();
    refreshing.clear();
    attempted.clear();
    publication = 'all';
    cancel();
    tab = 'library';
    query = '';
    kind = 'all';
    status = 'all';
    selected = '';
    editing = false;
    eventId = '';
    results = [];
    error = '';
    page = 1;
    hasNext = false;
  }
  function cancel() {
    clearTimeout(debounce);
    controller?.abort();
    controller = null;
    busy = false;
  }
  function mutate(change) {
    const state = ctx.state(),
      previous = structuredClone(state.readingLibrary || []);
    state.readingLibrary ||= [];
    change(state.readingLibrary);
    state.readingLibrary = normalizeReadingLibrary(state.readingLibrary);
    if (!ctx.save()) {
      ctx.state().readingLibrary = previous;
      return false;
    }
    return true;
  }
  function card(row) {
    const tracked = saved(row.id),
      progress = tracked?.chaptersRead.length || 0,
      recent = (tracked?.chapterReleases || []).filter((entry) => isNewRelease(entry.date));
    return `<article class="reading-card"><button type="button" class="reading-cover" data-reading-action="detail" data-id="${esc(row.id)}" aria-label="Hap ${esc(row.title)}">${image(row)}<span class="reading-kind">${label(row)}</span>${recent.length ? `<span class="reading-new-badge">NEW · ${new Set(recent.map((entry) => entry.chapter)).size} kapituj</span>` : ''}</button><div class="reading-card-body"><small>${row.year || 'Viti i panjohur'}${row.communityScore ? ' · ★ ' + row.communityScore.toFixed(1) : ''}</small><button type="button" class="reading-card-title" data-reading-action="detail" data-id="${esc(row.id)}">${esc(row.title)}</button>${tracked ? `<p>${READING_STATUS[tracked.status]}${tracked.favorite ? ' · ♥' : ''}</p><div class="reading-card-progress"><strong>${progress}</strong><span>/ ${row.totalChapters || '?'} ${row.publicationStatus === 'RELEASING' ? 'publikuar' : 'kapituj'}</span></div><div class="reading-card-actions">${button('detail', 'Detaje', row.id)}${button('next', '+1 kapitull', row.id, 'primary', nextChapter(tracked) ? '' : 'disabled')}</div>` : `<p>${esc(row.genres || 'Zbulo historinë')}</p>${button('add', '+ Në listën time', row.id, 'primary')}`}</div></article>`;
  }
  function stats() {
    const all = rows(),
      reading = all.filter((row) => row.status === 'reading').length,
      chapters = all.reduce((n, row) => n + row.chaptersRead.length, 0);
    return `<div class="reading-stats"><div><strong>${all.length}</strong><span>Tituj në bibliotekë</span></div><div><strong>${reading}</strong><span>Po lexoj tani</span></div><div><strong>${chapters.toLocaleString('sq-AL')}</strong><span>Kapituj të lexuar</span></div></div>`;
  }
  function library() {
    const list = rows().filter(
      (row) =>
        (kind === 'all' || row.kind === kind) &&
        (publication === 'all' ||
          (publication === 'ongoing'
            ? row.publicationStatus === 'RELEASING' || row.publicationStatus === 'HIATUS'
            : publication === 'unread'
              ? nextChapter(row) !== null
              : row.publicationStatus === 'FINISHED')) &&
        (status === 'all' || status === 'favorites'
          ? status !== 'favorites' || row.favorite
          : row.status === status) &&
        `${row.title} ${row.genres}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    );
    list.sort((a, b) =>
      sort === 'new'
        ? Math.max(
            0,
            ...(b.chapterReleases || [])
              .filter((event) => isNewRelease(event.date))
              .map((event) => Date.parse(event.date)),
          ) -
          Math.max(
            0,
            ...(a.chapterReleases || [])
              .filter((event) => isNewRelease(event.date))
              .map((event) => Date.parse(event.date)),
          )
        : sort === 'title'
          ? a.title.localeCompare(b.title)
          : sort === 'rating'
            ? (b.rating ?? -1) - (a.rating ?? -1)
            : sort === 'progress'
              ? b.chaptersRead.length - a.chaptersRead.length
              : String(b.updatedAt).localeCompare(String(a.updatedAt)),
    );
    return `<div class="reading-toolbar"><label class="reading-search">${navIcon('explore')}<input type="search" id="reading-query" placeholder="Kërko në leximet e tua…" aria-label="Kërko në leximet e tua" maxlength="100" value="${esc(query)}"></label><label class="reading-field">Lloji<select id="reading-kind">${kindOptions(kind)}</select></label><label class="reading-field">Statusi<select id="reading-status"><option value="all">Të gjitha</option>${statusOptions(status)}<option value="favorites" ${status === 'favorites' ? 'selected' : ''}>Të preferuarat</option></select></label><label class="reading-field">Publikimi<select id="reading-publication">${[
      ['all', 'Çdo botim'],
      ['ongoing', 'Në botim / pauzë'],
      ['finished', 'Botim i përfunduar'],
      ['unread', 'Kapituj pa lexuar'],
    ]
      .map(
        ([id, text]) =>
          `<option value="${id}" ${publication === id ? 'selected' : ''}>${text}</option>`,
      )
      .join('')}</select></label><label class="reading-field">Rendit<select id="reading-sort">${[
      ['updated', 'Të fundit'],
      ['new', 'Kapituj të rinj'],
      ['title', 'Titulli'],
      ['rating', 'Vlerësimi im'],
      ['progress', 'Kapitujt e lexuar'],
    ]
      .map(
        ([id, text]) => `<option value="${id}" ${sort === id ? 'selected' : ''}>${text}</option>`,
      )
      .join(
        '',
      )}</select></label>${button('manual', '+ Shto vetë', '', 'primary')}</div>${stats()}<div class="reading-library-shelves">${
      list.length
        ? (kind === 'all' ? ['manhwa', 'manga'] : [kind])
            .map((type) => {
              const group = list.filter((row) => row.kind === type);
              return group.length
                ? `<section class="reading-shelf"><div class="reading-shelf-heading"><h3>${type === 'manhwa' ? 'Manhwa' : 'Manga'}</h3><span>${group.length} tituj</span></div><div class="reading-grid">${group.map(card).join('')}</div></section>`
                : '';
            })
            .join('')
        : `<section class="reading-empty"><div aria-hidden="true">${navIcon('reading')}</div><h3>${rows().length ? 'Nuk u gjet titull' : 'Kapitulli yt i parë nis këtu'}</h3><p>${rows().length ? 'Ndrysho filtrat ose kërkimin.' : 'Gjej një manga ose manhwa dhe ruaj vendin ku e ke lënë.'}</p>${button('discover', 'Zbulo tituj', '', 'primary')}</section>`
    }</div>`;
  }
  function discover() {
    return `<form id="reading-search-form" class="reading-toolbar"><label class="reading-search">${navIcon('explore')}<input type="search" id="reading-query" placeholder="Kërko manga ose manhwa…" aria-label="Kërko manga ose manhwa" maxlength="100" value="${esc(query)}"></label><label class="reading-field">Lloji<select id="reading-kind">${kindOptions(kind)}</select></label><button class="primary" type="submit">Kërko</button></form><div class="reading-results-meta" role="status">${busy ? 'Po kërkoj në katalog…' : error ? 'Katalogu nuk u arrit. Leximet e tua janë të ruajtura.' : `${query ? 'Rezultatet për “' + esc(query) + '”' : 'Në trend tani'} · AniList / MyAnimeList · ${results.length} tituj`}${error ? button('retry', 'Provo përsëri') : ''}</div><div class="reading-grid" aria-busy="${busy}">${results.map(card).join('') || (busy ? Array.from({ length: 6 }, () => '<div class="reading-skeleton" aria-hidden="true"></div>').join('') : error ? '' : '<section class="reading-empty"><h3>Nuk u gjet titull</h3><p>Provo një emër tjetër ose shtoje vetë.</p>' + button('manual', '+ Shto vetë') + '</section>')}</div>${hasNext ? `<div class="reading-more">${button('more', busy ? 'Po ngarkoj…' : 'Shfaq më shumë', '', 'ghost', busy ? 'disabled' : '')}</div>` : ''}`;
  }
  function releases() {
    const list = rows().filter(
      (row) =>
        (row.chapterReleases || []).some((entry) => isNewRelease(entry.date)) ||
        row.publicationStatus === 'RELEASING' ||
        (row.totalChapters && row.chaptersRead.length < row.totalChapters),
    );
    return `<div class="reading-section-title"><h3>Kapituj për të lexuar</h3><p>Kontroll automatik çdo 30 minuta kur ky seksion është i hapur. NEW qëndron shtatë ditë nga publikimi në burim ose zbulimi në katalog. Totali i botimit të papërfunduar tregon kapitullin më të lartë të verifikuar.</p></div><div class="reading-grid">${list.map(card).join('') || '<section class="reading-empty"><h3>Je në hap me leximet e tua</h3><p>Kontrollo katalogun nga detajet kur publikohen kapituj të rinj.</p></section>'}</div>`;
  }
  function activity() {
    const events = rows()
      .flatMap((row) => row.journal.map((event) => ({ row, event })))
      .sort((a, b) => b.event.date.localeCompare(a.event.date))
      .slice(0, 150);
    return `<div class="reading-section-title"><h3>Ditari i leximit</h3><p>Kapitujt, datat, shënimet dhe vlerësimet e tua.</p></div><div class="reading-journal">${events.map(({ row, event }) => `<button type="button" data-reading-action="journal" data-id="${esc(row.id)}" data-event="${esc(event.id)}"><span class="reading-journal-icon" aria-hidden="true">${navIcon(event.action === 'read' ? 'completed' : 'sync')}</span><span><strong>${esc(row.title)}</strong><small>Kapitulli ${event.chapter} · ${event.action === 'read' ? 'I lexuar' : 'Shënimi u hoq'} · ${date(event.date)}</small>${event.note ? '<span>' + esc(event.note) + '</span>' : ''}</span><span>${event.rating == null ? '↗' : '★ ' + event.rating + '/10'}</span></button>`).join('') || '<div class="reading-empty"><h3>Ditari yt është ende bosh</h3><p>Shëno kapitullin e parë dhe vazhdo historinë tënde.</p></div>'}</div>`;
  }
  function detail(row) {
    if (!row) {
      selected = '';
      return '';
    }
    const tracked = saved(row.id),
      event = tracked?.journal.find((event) => event.id === eventId),
      max =
        row.totalChapters ||
        Math.min(
          10000,
          Math.max(
            30,
            ...row.chaptersRead,
            ...(row.volumeRanges || []).map((v) => v.end),
            Number(chapterQuery) || 0,
            (chapterPage + 1) * 30,
          ),
        ),
      group = row.volumeRanges?.find((item) => String(item.volume) === volume),
      available = Array.from({ length: max }, (_, i) => i + 1).filter(
        (n) =>
          (!group || (n >= group.start && n <= group.end)) &&
          (!chapterQuery || String(n).includes(chapterQuery)),
      ),
      ordered = chapterSort === 'desc' ? available.reverse() : available,
      visible = ordered.slice(chapterPage * 30, chapterPage * 30 + 30),
      first = visible[0] || 0,
      last = visible.at(-1) || 0;
    return `<section class="reading-detail" aria-label="Detajet e leximit">${button('back', '← Kthehu', '', 'reading-back')}<div class="reading-detail-top"><div class="reading-detail-cover">${image(row)}</div><div><span class="reading-eyebrow">${label(row)}${row.year ? ' · ' + row.year : ''}</span><h3 id="reading-detail-title" tabindex="-1">${esc(row.title)}</h3><p>${esc(row.genres)}</p><div class="reading-facts"><span>${row.totalChapters ? row.totalChapters + (row.publicationStatus === 'RELEASING' ? ' kapituj publikuar' : ' kapituj') : 'Numri aktual ende i pakonfirmuar'}</span><span>${row.totalVolumes || '?'} vëllime</span><span>${row.publicationStatus === 'RELEASING' ? 'Në botim' : row.publicationStatus === 'FINISHED' ? 'Botim i përfunduar' : row.publicationStatus === 'HIATUS' ? 'Në pauzë' : 'Publikimi i pakonfirmuar'}</span>${row.communityScore ? `<span>AniList · ★ ${row.communityScore}/10</span>` : ''}</div>${row.synopsis ? `<details class="reading-synopsis"><summary>Përshkrimi</summary><p>${esc(row.synopsis)}</p></details>` : ''}${tracked ? `<div class="reading-detail-actions">${button('next', '+1 kapitull', row.id, 'primary', nextChapter(tracked) ? '' : 'disabled')}${button('favorite', tracked.favorite ? '♥ E preferuar' : '♡ Shto te të preferuarat', row.id, 'ghost', `aria-pressed="${tracked.favorite}"`)}${button('edit', 'Ndrysho titullin', row.id)}</div>` : button('add', '+ Në listën time', row.id, 'primary')}</div></div>${
      tracked
        ? `<div class="reading-detail-grid"><section class="reading-panel"><div class="reading-section-title"><h4>Kapitujt e mi</h4><p>${tracked.chaptersRead.length} të lexuar nga ${row.totalChapters || 'një total ende i panjohur'}${!row.totalChapters ? ' · Shëno vetëm kapitujt që ke lexuar.' : ''}</p></div><div class="reading-chapter-tools"><label class="reading-field">Kërko kapitull<input id="reading-chapter-query" type="search" inputmode="numeric" maxlength="5" placeholder="Numri i kapitullit" value="${esc(chapterQuery)}"></label><label class="reading-field">Renditja<select id="reading-chapter-sort"><option value="asc" ${chapterSort === 'asc' ? 'selected' : ''}>1 → ${max}</option><option value="desc" ${chapterSort === 'desc' ? 'selected' : ''}>${max} → 1</option></select></label><label class="reading-field">Vëllimi<select id="reading-volume"><option value="all">Të gjithë kapitujt</option>${(row.volumeRanges || []).map((item) => `<option value="${item.volume}" ${volume === String(item.volume) ? 'selected' : ''}>Vëllimi ${item.volume} · ${item.start}–${item.end}</option>`).join('')}</select></label></div>${!row.volumeRanges?.length ? '<p class="reading-volume-note">Ndarja sipas vëllimeve nuk është dhënë nga katalogu. Mund ta përcaktosh te “Ndrysho titullin”.</p>' : ''}<div class="reading-chapters">${
            visible
              .map((n) => {
                const read = tracked.chaptersRead.includes(n);
                return button(
                  'chapter',
                  String(n) +
                    ((row.chapterReleases || []).some(
                      (entry) => entry.chapter === n && isNewRelease(entry.date),
                    )
                      ? '<small class="reading-chapter-new">NEW</small>'
                      : ''),
                  row.id,
                  read ? 'is-read' : '',
                  `data-chapter="${n}" aria-label="Kapitulli ${n}: ${read ? 'i lexuar, hiq shënimin' : 'shëno si të lexuar'}" aria-pressed="${read}"`,
                );
              })
              .join('') || '<p>Nuk u gjet kapitull.</p>'
          }</div><div class="reading-pagination">${button('previous', '← Mbrapa', '', 'ghost', chapterPage ? '' : 'disabled')}<span>${first}–${last}</span>${button('following', 'Përpara →', '', 'ghost', (chapterPage + 1) * 30 >= ordered.length && row.totalChapters ? 'disabled' : '')}</div><div class="reading-detail-actions">${button('read-all', '✓ I kam lexuar të gjithë', row.id, 'primary', row.totalChapters ? '' : 'disabled')}${button('refresh', refreshing.has(row.id) ? 'Po kontrolloj…' : 'Kontrollo kapituj të rinj', row.id, 'ghost', row.sourceId && !refreshing.has(row.id) ? '' : 'disabled')}</div><p class="reading-volume-note">${row.totalChapters ? `${Math.max(0, row.totalChapters - tracked.chaptersRead.length)} kapituj pa lexuar` : 'Totali aktual nuk dihet; regjistro kapitullin ku ke arritur.'}${row.checkedAt ? ' · Kontrolluar: ' + date(row.checkedAt) : ''}${row.chapterSource ? ' · ' + esc(row.chapterSource) : ''}</p><form id="reading-chapter-note-form" class="reading-chapter-note-form"><label class="reading-field">Detaje / shënim për kapitullin<input name="chapter" type="number" min="1" max="${row.totalChapters || 10000}" value="${Math.max(1, ...tracked.chaptersRead)}" required></label><button type="submit" class="ghost">Hap në ditar</button></form><form id="reading-progress-form"><label class="reading-field">Regjistro kapitujt 1 deri te<input type="number" name="progress" min="0" max="${row.totalChapters || 10000}" required value="${Math.max(0, ...tracked.chaptersRead)}"></label><button type="submit" class="ghost">Ruaj progresin</button><small>Shënon të gjithë kapitujt deri te ky numër si të lexuar; kapitujt pas tij hiqen.</small></form></section><form id="reading-personal-form" class="reading-panel"><h4>Shënimet e mia</h4><div class="reading-form-grid"><label class="reading-field">Statusi<select name="status">${statusOptions(tracked.status)}</select></label><label class="reading-field">Vlerësimi im / 10<input type="number" name="rating" min="0" max="10" step="0.5" value="${tracked.rating ?? ''}"></label><label class="reading-field">Vëllime të lexuara<input type="number" name="volumesRead" min="0" max="${row.totalVolumes || 1000}" value="${tracked.volumesRead}"></label></div><label class="reading-field">Shënim personal<textarea name="notes" maxlength="2500" rows="5" placeholder="Mendimet e tua, citime ose ku e ke lënë…">${esc(tracked.notes)}</textarea></label><button class="primary" type="submit">Ruaj shënimet</button></form></div>${event ? `<form id="reading-journal-form" class="reading-panel"><h4>Kapitulli ${event.chapter} · ${event.action === 'read' ? 'I lexuar' : 'Shënimi u hoq'}</h4><div class="reading-form-grid"><label class="reading-field">Data<input type="date" name="date" required max="${new Date().toISOString().slice(0, 10)}" value="${esc(event.date.slice(0, 10))}"></label><label class="reading-field">Nota e kapitullit / 10<input type="number" name="rating" min="0" max="10" step="0.5" value="${event.rating ?? ''}"></label></div><label class="reading-field">Shënim për kapitullin<textarea name="note" maxlength="1500" rows="3">${esc(event.note)}</textarea></label><button type="submit" class="primary">Ruaj në ditar</button></form>` : ''}`
        : ''
    }</section>`;
  }
  function editor(row) {
    return `<form id="reading-editor" class="reading-panel reading-editor"><div class="reading-section-title"><h3>${row ? 'Ndrysho leximin' : 'Shto manga ose manhwa'}</h3>${button('back', 'Anulo')}</div><div class="reading-form-grid"><label class="reading-field reading-wide">Titulli<input name="readingTitle" required maxlength="180" value="${esc(row?.title || '')}"></label><label class="reading-field">Lloji<select name="kind"><option value="manga" ${row?.kind === 'manga' ? 'selected' : ''}>Manga</option><option value="manhwa" ${row?.kind === 'manhwa' ? 'selected' : ''}>Manhwa</option></select></label><label class="reading-field">Statusi<select name="status">${statusOptions(row?.status || 'planning')}</select></label><label class="reading-field">Kapituj gjithsej<input type="number" name="totalChapters" min="0" max="10000" required value="${row?.totalChapters || 0}"><small>0 kur totali nuk dihet.</small></label><label class="reading-field">Vëllime gjithsej<input type="number" name="totalVolumes" min="0" max="1000" required value="${row?.totalVolumes || 0}"></label><label class="reading-field">Publikimi<select name="publicationStatus">${[
      ['', 'Nuk dihet'],
      ['RELEASING', 'Në botim'],
      ['FINISHED', 'Përfunduar'],
      ['HIATUS', 'Në pauzë'],
      ['CANCELLED', 'Ndërprerë'],
    ]
      .map(
        ([id, text]) =>
          `<option value="${id}" ${row?.publicationStatus === id ? 'selected' : ''}>${text}</option>`,
      )
      .join(
        '',
      )}</select></label><label class="reading-field">Viti<input type="number" name="year" min="1900" max="2200" value="${row?.year || ''}"></label><label class="reading-field reading-wide">Kopertina (HTTPS)<input type="url" name="cover" pattern="https://.*" maxlength="2000" value="${esc(row?.cover || '')}"></label><label class="reading-field reading-wide">Ndarja e vëllimeve<input name="volumeRanges" maxlength="10000" placeholder="1:1-10, 2:11-20" value="${esc((row?.volumeRanges || []).map((v) => `${v.volume}:${v.start}-${v.end}`).join(', '))}"><small>Vëllimi:kapitulli i parë-kapitulli i fundit. P.sh. 1:1-10, 2:11-20.</small></label><label class="reading-field reading-wide">Zhanret<input name="genres" maxlength="180" value="${esc(row?.genres || '')}"></label></div><div class="reading-detail-actions"><button type="submit" class="primary">Ruaj titullin</button>${row ? button('delete', 'Hiq nga leximet e mia', row.id, 'reading-delete') : ''}</div></form>`;
  }
  function render(force = true) {
    resetOwner();
    if (!root || !active || phone.matches) return;
    if (
      !force &&
      root.contains(document.activeElement) &&
      document.activeElement.matches('input,textarea,select') &&
      document.activeElement.id !== 'reading-query'
    )
      return;
    const input = root.querySelector('#reading-query'),
      focused = input === document.activeElement,
      caret = input?.selectionStart;
    const newCount = rows().reduce(
      (count, row) =>
        count +
        new Set(
          (row.chapterReleases || [])
            .filter((entry) => isNewRelease(entry.date))
            .map((entry) => entry.chapter),
        ).size,
      0,
    );
    const badge = document.getElementById('reading-sidebar-new');
    if (badge) {
      badge.textContent = newCount ? 'NEW · ' + newCount : '';
      badge.hidden = !newCount;
    }
    const view = editing ? 'editor' : selected ? 'detail-' + selected : tab;
    const stable = renderedView === view;
    const toolbar = stable ? root.querySelector('.reading-toolbar') : null;
    const chapterInput = stable ? root.querySelector('#reading-chapter-query') : null;
    const chapterFocused = chapterInput === document.activeElement;
    const chapterCaret = chapterInput?.selectionStart;
    const container = document.createElement('div');
    window.ATHTML.renderHTML(
      container,
      `<div class="reading-hero"><div><span class="reading-eyebrow">HISTORITË VAZHDOJNË NË FAQE</span><h2>Manga <span>&</span> Manhwa</h2><p>Një botë më vete. Mbaj kapitujt, mendimet dhe historitë e tua në një vend.</p></div><div class="reading-hero-art" aria-hidden="true"><span>漫</span><span>만</span>${navIcon('reading')}</div></div><nav class="reading-tabs" aria-label="Seksionet Manga dhe Manhwa">${[
        ['library', 'Leximet e mia', 'reading'],
        ['discover', 'Zbulo', 'explore'],
        ['activity', 'Ditari i leximit', 'diary'],
        ['releases', 'Kapituj të rinj', 'notifications'],
      ]
        .map(([id, text, icon]) =>
          button(
            'tab',
            navIcon(icon) + text,
            id,
            tab === id ? 'active' : '',
            `aria-current="${tab === id ? 'page' : 'false'}"`,
          ),
        )
        .join(
          '',
        )}</nav><div id="reading-content">${editing ? editor(saved(selected)) : selected ? detail(find(selected)) : tab === 'library' ? library() : tab === 'discover' ? discover() : tab === 'releases' ? releases() : activity()}</div>`,
    );
    if (root.querySelector('#reading-content')) {
      const fresh = container.querySelector('#reading-content');
      if (toolbar && fresh.querySelector('.reading-toolbar'))
        fresh.querySelector('.reading-toolbar').replaceWith(toolbar);
      root.querySelector('#reading-content').replaceWith(fresh);
      root.querySelector('.reading-tabs').replaceWith(container.querySelector('.reading-tabs'));
    } else root.replaceChildren(...container.childNodes);
    renderedView = view;
    root.classList.toggle('reading-detail-active', !!selected || editing);
    if (chapterFocused) {
      const next = root.querySelector('#reading-chapter-query');
      next?.focus({ preventScroll: true });
      next?.setSelectionRange(chapterCaret, chapterCaret);
    }
    if (focused) {
      const next = root.querySelector('#reading-query');
      next?.focus({ preventScroll: true });
      next?.setSelectionRange(caret, caret);
    }
    if (focusAfter) {
      root.querySelector(focusAfter)?.focus({ preventScroll: true });
      focusAfter = '';
    }
  }
  async function checkRow(id, announce = false, signal) {
    const row = saved(id),
      requestOwner = owner;
    if (!row || refreshing.has(id)) return;
    refreshing.add(id);
    attempted.set(id, Date.now());
    if (announce) retryCatalogRequests();
    render(false);
    try {
      const fresh = await refreshReadingCatalog(row, signal);
      if (signal?.aborted || (ctx.user()?.id || 'guest') !== requestOwner || !saved(id)) return;
      let added = 0;
      if (
        !mutate((all) => {
          added = applyReadingUpdate(
            all.find((item) => item.id === id),
            fresh,
          );
        })
      )
        return;
      if (announce)
        ctx.toast(
          added
            ? `${added} kapituj të rinj në katalog ✓`
            : fresh.totalChapters
              ? 'Kapitujt u përditësuan; je në hap me katalogun.'
              : 'Burimet nuk japin ende numrin aktual të kapitujve.',
        );
    } catch (error) {
      if (announce && error.name !== 'AbortError' && (ctx.user()?.id || 'guest') === requestOwner)
        ctx.toast('Burimet nuk u arritën. Provo përsëri.');
    } finally {
      refreshing.delete(id);
      if (active && (ctx.user()?.id || 'guest') === requestOwner) render(false);
    }
  }
  async function autoCheck() {
    clearTimeout(autoTimer);
    if (!active || phone.matches || document.hidden) return;
    render(false);
    autoController?.abort();
    const token = new AbortController();
    autoController = token;
    const stale = rows()
      .filter(
        (row) =>
          row.sourceId &&
          (row.publicationStatus === 'RELEASING' ||
            row.publicationStatus === 'HIATUS' ||
            (row.status === 'reading' && row.publicationStatus !== 'FINISHED')) &&
          (!attempted.has(row.id) || Date.now() - attempted.get(row.id) >= 30 * 60000) &&
          (!row.checkedAt || Date.now() - Date.parse(row.checkedAt) >= 30 * 60000),
      )
      .sort((a, b) => String(a.checkedAt).localeCompare(String(b.checkedAt)))
      .slice(0, 8);
    for (const row of stale) {
      if (token.signal.aborted || !active) break;
      await checkRow(row.id, false, token.signal);
    }
    if (active && !token.signal.aborted) autoTimer = setTimeout(() => void autoCheck(), 60000);
  }
  async function search(more = false) {
    resetOwner();
    controller?.abort();
    const token = new AbortController();
    controller = token;
    const requestOwner = owner,
      requestQuery = query,
      requestKind = kind,
      next = more ? page + 1 : 1;
    busy = true;
    error = '';
    if (!more) {
      hasNext = false;
      page = 1;
    }
    render();
    try {
      const result = await searchReadingCatalog(requestQuery, requestKind, next, token.signal);
      if (controller !== token || requestOwner !== (ctx.user()?.id || 'guest') || !active) return;
      results = more
        ? [...new Map([...results, ...result.items].map((row) => [row.id, row])).values()]
        : result.items;
      page = next;
      hasNext = result.hasNext;
    } catch (err) {
      if (err.name !== 'AbortError' && controller === token) error = err.message;
    } finally {
      if (controller === token) {
        busy = false;
        render();
      }
    }
  }
  function switchTab(next) {
    cancel();
    tab = next;
    selected = '';
    editing = false;
    eventId = '';
    query = '';
    kind = 'all';
    status = 'all';
    publication = 'all';
    results = [];
    error = '';
    focusAfter = '#reading-query';
    render();
    if (tab === 'discover') void search();
  }
  function action(event) {
    const target = event.target.closest('[data-reading-action]');
    if (!target) return;
    const op = target.dataset.readingAction,
      id = target.dataset.id,
      row = saved(id);
    if (op === 'tab') {
      switchTab(id);
      return;
    }
    if (op === 'discover') {
      switchTab('discover');
      return;
    }
    if (op === 'detail' || op === 'journal') {
      selected = id;
      editing = false;
      chapterPage = 0;
      chapterQuery = '';
      volume = 'all';
      eventId = target.dataset.event || '';
      focusAfter = '#reading-detail-title';
      render();
      if (eventId)
        root
          .querySelector('#reading-journal-form')
          ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    if (op === 'back') {
      const returnId = selected;
      if (editing && saved(selected)) editing = false;
      else {
        selected = '';
        editing = false;
        eventId = '';
      }
      render();
      if (selected) root.querySelector('#reading-detail-title')?.focus();
      else root.querySelector(`[data-reading-action="detail"][data-id="${returnId}"]`)?.focus();
      return;
    }
    if (op === 'manual') {
      cancel();
      selected = '';
      editing = true;
      focusAfter = '[name="readingTitle"]';
      render();
      return;
    }
    if (op === 'edit') {
      selected = id;
      editing = true;
      focusAfter = '[name="readingTitle"]';
      render();
      return;
    }
    if (op === 'retry') {
      retryCatalogRequests();
      void search();
      return;
    }
    if (op === 'more') {
      void search(true);
      return;
    }
    if (op === 'previous' || op === 'following') {
      chapterPage = Math.max(0, chapterPage + (op === 'previous' ? -1 : 1));
      render();
      return;
    }
    if (op === 'add') {
      const item = find(id);
      if (!item) return;
      if (
        !(ctx.state().readingLibrary || []).some((row) => row.id === id) &&
        (ctx.state().readingLibrary || []).length >= 3000
      ) {
        ctx.toast('Biblioteka e leximit ka arritur kufirin prej 3000 titujsh.');
        return;
      }
      const stamp = new Date().toISOString();
      if (
        !mutate((all) => {
          const old = all.findIndex((row) => row.id === id);
          const added = normalizeReadingLibrary([
            { ...item, status: 'planning', createdAt: stamp, updatedAt: stamp },
          ])[0];
          if (old >= 0) all[old] = added;
          else all.unshift(added);
        })
      )
        return;
      ctx.toast('Titulli u shtua te leximet e tua ✓');
      render();
      return;
    }
    if (!row) return;
    if (op === 'delete') {
      if (!ctx.confirm('Ta heqim “' + row.title + '” nga leximet e tua?')) return;
      if (
        !mutate((all) => {
          const current = all.find((row) => row.id === id);
          current.deletedAt = new Date().toISOString();
          current.updatedAt = current.deletedAt;
        })
      )
        return;
      selected = '';
      editing = false;
      render();
      return;
    }
    if (op === 'favorite') {
      if (
        mutate((all) => {
          const current = all.find((row) => row.id === id);
          current.favorite = !current.favorite;
          current.updatedAt = new Date().toISOString();
        })
      )
        render();
      return;
    }
    if (op === 'refresh') {
      void checkRow(id, true);
      return;
    }
    if (op === 'read-all') {
      if (
        !row.totalChapters ||
        !ctx.confirm(`Shëno të gjithë ${row.totalChapters} kapitujt e njohur si të lexuar?`)
      )
        return;
      if (
        mutate((all) => {
          const current = all.find((item) => item.id === id);
          const stamp = new Date().toISOString();
          for (let n = 1; n <= row.totalChapters; n++) markChapter(current, n, true, stamp);
        })
      ) {
        ctx.toast('Të gjithë kapitujt e njohur u shënuan ✓');
        render();
      }
      return;
    }
    if (op === 'next' || op === 'chapter') {
      const n = op === 'next' ? nextChapter(row) : Number(target.dataset.chapter);
      if (!n) return;
      const includePrevious =
        op === 'chapter' &&
        !row.chaptersRead.includes(n) &&
        Array.from({ length: n - 1 }, (_, i) => i + 1).some(
          (chapter) => !row.chaptersRead.includes(chapter),
        ) &&
        ctx.confirm(
          `A i ke lexuar edhe kapitujt 1–${n - 1}? OK: shëno edhe të mëparshmit. Anulo: shëno vetëm kapitullin ${n}.`,
        );
      focusAfter = op === 'chapter' ? `[data-reading-action="chapter"][data-chapter="${n}"]` : '';
      if (
        !mutate((all) => {
          const current = all.find((item) => item.id === id);
          if (includePrevious)
            for (let chapter = 1; chapter < n; chapter++) markChapter(current, chapter, true);
          return markChapter(
            all.find((row) => row.id === id),
            n,
            op === 'next' || !row.chaptersRead.includes(n),
          );
        })
      )
        return;
      ctx.toast('Progresi i leximit u ruajt ✓');
      render();
    }
  }
  function submit(event) {
    const form = event.target;
    if (
      ![
        'reading-editor',
        'reading-personal-form',
        'reading-progress-form',
        'reading-journal-form',
        'reading-chapter-note-form',
        'reading-search-form',
      ].includes(form.id)
    )
      return;
    event.preventDefault();
    if (form.id === 'reading-search-form') {
      clearTimeout(debounce);
      void search();
      return;
    }
    const data = Object.fromEntries(new FormData(form)),
      row = saved(selected),
      stamp = new Date().toISOString();
    if (form.id === 'reading-editor') {
      if (
        row &&
        ((Number(data.totalChapters) > 0 &&
          Number(data.totalChapters) < Math.max(0, ...row.chaptersRead)) ||
          (Number(data.totalVolumes) > 0 && Number(data.totalVolumes) < row.volumesRead))
      ) {
        ctx.toast('Totali nuk mund të jetë më i vogël se progresi i ruajtur.');
        return;
      }
      const ranges = [];
      let previousEnd = 0;
      for (const part of String(data.volumeRanges || '')
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)) {
        const match = /^(\d+):(\d+)-(\d+)$/.exec(part);
        if (!match) {
          ctx.toast('Përdor formatin 1:1-10, 2:11-20 për vëllimet.');
          return;
        }
        const [volume, start, end] = match.slice(1).map(Number);
        if (
          volume < 1 ||
          volume > 1000 ||
          start <= previousEnd ||
          end < start ||
          end > (Number(data.totalChapters) || 10000) ||
          ranges.some((item) => item.volume === volume)
        ) {
          ctx.toast(
            'Kontrollo vëllimet: intervalet duhet të jenë në rend, pa mbivendosje dhe brenda totalit.',
          );
          return;
        }
        ranges.push({ volume, start, end });
        previousEnd = end;
      }
      data.volumeRanges = ranges;
      const id = row?.id || 'reading-' + crypto.randomUUID();
      if (!data.readingTitle.trim()) return;
      if (!row && (ctx.state().readingLibrary || []).length >= 3000) {
        ctx.toast('Biblioteka e leximit ka arritur kufirin prej 3000 titujsh.');
        return;
      }
      if (
        !mutate((all) => {
          const fields = { ...data, id, title: data.readingTitle.trim(), updatedAt: stamp };
          if (row)
            Object.assign(
              all.find((row) => row.id === id),
              fields,
            );
          else all.unshift({ ...fields, createdAt: stamp, chaptersRead: [], journal: [] });
        })
      )
        return;
      selected = id;
      editing = false;
      chapterPage = 0;
      focusAfter = '#reading-detail-title';
    } else if (!row) return;
    else if (form.id === 'reading-chapter-note-form') {
      let entry = [...row.journal]
        .reverse()
        .find((entry) => entry.chapter === Number(data.chapter) && entry.action === 'read');
      if (!entry && row.chaptersRead.includes(Number(data.chapter))) {
        entry = {
          id: crypto.randomUUID(),
          chapter: Number(data.chapter),
          action: 'read',
          date: stamp,
          recordedAt: stamp,
          note: '',
          rating: null,
        };
        if (
          !mutate((all) => {
            const current = all.find((item) => item.id === selected);
            current.journal.push(entry);
            current.updatedAt = stamp;
          })
        )
          return;
      }
      if (!entry) {
        ctx.toast('Shëno këtë kapitull si të lexuar për ta hapur në ditar.');
        return;
      }
      eventId = entry.id;
      render();
      root.querySelector('#reading-journal-form')?.scrollIntoView?.({
        block: 'center',
        behavior: window.matchMedia('(prefers-reduced-motion:reduce)').matches
          ? 'instant'
          : 'smooth',
      });
      root.querySelector('#reading-journal-form [name="note"]')?.focus({ preventScroll: true });
      return;
    } else if (form.id === 'reading-personal-form') {
      if (
        !mutate((all) =>
          Object.assign(
            all.find((current) => current.id === selected),
            data,
            { updatedAt: stamp },
          ),
        )
      )
        return;
    } else if (form.id === 'reading-progress-form') {
      const end = Number(data.progress);
      if (!Number.isInteger(end) || end < 0 || end > (row.totalChapters || 10000)) return;
      const highest = Math.max(0, ...row.chaptersRead);
      if (
        end < highest &&
        !ctx.confirm('Kapitujt pas ' + end + ' do të hiqen nga progresi. Vazhdo?')
      )
        return;
      if (
        !mutate((all) => {
          const current = all.find((row) => row.id === selected);
          for (const n of [...current.chaptersRead])
            if (n > end) markChapter(current, n, false, stamp);
          for (let n = 1; n <= end; n++) markChapter(current, n, true, stamp);
        })
      )
        return;
    } else if (form.id === 'reading-journal-form') {
      const parsed = Date.parse(data.date + 'T12:00:00Z');
      if (!Number.isFinite(parsed) || data.date > stamp.slice(0, 10)) return;
      if (
        !mutate((all) => {
          const current = all.find((row) => row.id === selected),
            entry = current.journal.find((entry) => entry.id === eventId);
          if (entry)
            Object.assign(entry, {
              note: data.note,
              rating: data.rating,
              date: new Date(parsed).toISOString(),
            });
          current.updatedAt = stamp;
        })
      )
        return;
    }
    ctx.toast('Leximi u ruajt ✓');
    render();
  }
  function mount(host) {
    if (root) return;
    root = document.createElement('section');
    root.id = 'reading-view';
    root.className = 'reading-view hidden';
    root.setAttribute('aria-label', 'Manga dhe Manhwa');
    host.append(root);
    const nav = document.getElementById('pro-nav-reading');
    if (nav) {
      const submenu = document.createElement('nav');
      submenu.id = 'reading-subnav';
      submenu.setAttribute('aria-label', 'Nëndarjet e leximit');
      window.ATHTML.renderHTML(
        submenu,
        [
          ['library', 'Leximet e mia'],
          ['discover', 'Kërko manga / manhwa'],
          ['activity', 'Ditari i leximit'],
          ['releases', 'Kapituj të rinj'],
        ]
          .map(([id, title]) =>
            button(
              'tab',
              title + (id === 'releases' ? ' <span id="reading-sidebar-new" hidden></span>' : ''),
              id,
              'reading-subnav-button',
            ),
          )
          .join(''),
      );
      nav.after(submenu);
      new MutationObserver(() => {
        if (nav.nextElementSibling !== submenu) nav.after(submenu);
      }).observe(nav.parentElement, { childList: true });
      submenu.addEventListener('click', (event) => {
        const target = event.target.closest('[data-reading-action]');
        if (!target) return;
        ctx.navigate('reading');
        switchTab(target.dataset.id);
      });
      nav.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          submenu.querySelector('button')?.focus();
        }
      });
      submenu.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          nav.focus();
        }
      });
    }
    root.addEventListener('click', action);
    root.addEventListener('submit', submit);
    root.addEventListener('input', (event) => {
      if (event.target.id === 'reading-chapter-query') {
        chapterQuery = event.target.value.replace(/[^0-9]/g, '');
        chapterPage = 0;
        render();
        return;
      }
      if (event.target.id !== 'reading-query') return;
      query = event.target.value;
      clearTimeout(debounce);
      if (tab === 'discover') {
        controller?.abort();
        debounce = setTimeout(() => void search(), 350);
      } else render();
    });
    root.addEventListener('change', (event) => {
      if (event.target.id === 'reading-chapter-sort' || event.target.id === 'reading-volume') {
        if (event.target.id === 'reading-chapter-sort') chapterSort = event.target.value;
        else volume = event.target.value;
        chapterPage = 0;
        render();
      }
      if (event.target.id === 'reading-publication') {
        publication = event.target.value;
        render();
      }
      if (event.target.id === 'reading-kind') {
        kind = event.target.value;
        if (tab === 'discover') void search();
        else render();
      }
      if (event.target.id === 'reading-status') {
        status = event.target.value;
        render();
      }
      if (event.target.id === 'reading-sort') {
        sort = event.target.value;
        render();
      }
    });
    ctx.subscribe?.((_state, event) => {
      resetOwner();
      if (active && !root.contains(document.activeElement) && event.reason !== 'saved')
        render(false);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearTimeout(autoTimer);
        autoController?.abort();
      } else if (active) void autoCheck();
    });
    phone.addEventListener('change', () => {
      if (phone.matches && active) ctx.navigate('home');
    });
  }
  function open(name) {
    if (name !== 'reading' || phone.matches) return false;
    resetOwner();
    active = true;
    root.classList.remove('hidden');
    document.body.classList.add('reading-active');
    for (const id of [
      'home-view',
      'library-view',
      'upcoming-view',
      'explore-view',
      'seasons-view',
      'statistics-view',
      'pro-view',
    ])
      ctx.el(id)?.classList.add('hidden');
    render();
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => void autoCheck(), 1200);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  }
  function hide() {
    active = false;
    clearTimeout(autoTimer);
    autoController?.abort();
    cancel();
    root?.classList.add('hidden');
    document.body.classList.remove('reading-active');
  }
  return { mount, open, hide, render, switchTab };
}
