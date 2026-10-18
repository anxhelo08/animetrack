import { resolveTraktGroups, groupTraktRows } from '../core/trakt-import-groups.js';
import { renderTraktMapping } from './trakt-import-view.js';
import { cloudConfig } from '../config.js';
import {
  rulePresets,
  cleanRules,
  matchRules,
  parseTrakt,
  applyTraktRows,
} from '../core/connected-library.js';

/** Opt-in cloud features. None of their records are written into the user's library payload. */
export function createConnectedFeatures(ctx) {
  const esc = ctx.esc,
    html = window.ATHTML;
  let owner = '',
    data = { records: [], lists: [], feeds: [], traktConfigured: false },
    loaded = false,
    busy = false,
    error = '',
    feedURL = '',
    selected = '',
    imports = [],
    importSelections = {},
    importPage = 0,
    importExceptions = { key: '', page: 0 },
    importPreview = null,
    host = null,
    page = '',
    requestId = 0,
    members = [],
    draftRules = null,
    formDrafts = {},
    sections = {},
    device = null,
    exportPlan = null;
  const currentOwner = () => String(ctx.user()?.id || '');
  function syncOwner() {
    const id = currentOwner();
    if (owner !== id) {
      owner = id;
      data = { records: [], lists: [], feeds: [], traktConfigured: false };
      loaded = false;
      busy = false;
      error = '';
      feedURL = '';
      selected = '';
      imports = [];
      importSelections = {};
      importPage = 0;
      importExceptions = { key: '', page: 0 };
      importPreview = null;
      members = [];
      draftRules = null;
      formDrafts = {};
      sections = {};
      device = null;
      exportPlan = null;
      requestId++;
      return true;
    }
    return false;
  }
  async function call(payload) {
    const expected = currentOwner();
    if (!expected) throw Error('Hyr në llogari për këtë veprim.');
    const session = await ctx.client().auth.getSession();
    if (
      session.error ||
      session.data?.session?.user?.id !== expected ||
      !session.data?.session?.access_token
    )
      throw Error('Hyr përsëri në llogari.');
    const response = await fetch(cloudConfig.url + '/functions/v1/anime-connected', {
      method: 'POST',
      headers: {
        apikey: cloudConfig.key,
        Authorization: 'Bearer ' + session.data.session.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });
    const result = await response.json();
    if (expected !== currentOwner()) throw Error('Llogaria ndryshoi.');
    if (!response.ok) throw Error(result.error || 'Veprimi nuk u krye.');
    return result;
  }
  async function refresh() {
    syncOwner();
    const id = ++requestId;
    if (!owner) {
      draw();
      return;
    }
    busy = true;
    draw();
    try {
      const result = await call({ action: 'state' });
      if (id !== requestId) return;
      data = result;
      loaded = true;
      error = '';
    } catch (e) {
      if (id === requestId) {
        error = e.message;
        loaded = true;
      }
    } finally {
      if (id === requestId) {
        busy = false;
        draw();
      }
    }
  }
  async function mutate(payload) {
    if (busy) return;
    busy = true;
    error = '';
    draw();
    try {
      const result = await call(payload);
      if (result.url) feedURL = result.url;
      await refresh();
      return result;
    } catch (e) {
      error = e.message;
      busy = false;
      draw();
    }
  }
  const btn = (action, text, id = '') =>
    '<button type="button" class="ghost" data-connected="' +
    action +
    '" data-id="' +
    esc(id) +
    '" ' +
    (busy ? 'disabled' : '') +
    '>' +
    esc(text) +
    '</button>';
  const field = (name, label, body) =>
    '<label>' + esc(label) + '<select name="' + name + '">' + body + '</select></label>';
  const option = (value, title) => '<option value="' + esc(value) + '">' + esc(title) + '</option>';
  const ruleOptions = () =>
    Object.keys(rulePresets)
      .map((p, i) =>
        option(
          p,
          [
            'Anime të shkurtra për fundjavë',
            'Më ka mbetur pak',
            'Të preferuarat',
            'Filma të paparë',
          ][i],
        ),
      )
      .join('');
  function ruleForm() {
    return (
      '<form data-connected-form="rule" class="connected-form"><label>Emri<input name="title" required minlength="2" maxlength="50" placeholder="P.sh. Për fundjavë"></label>' +
      field(
        'kind',
        'Lloji',
        option('smart', 'Listë inteligjente') + option('saved', 'Filtër i ruajtur'),
      ) +
      field('preset', 'Nis nga një rregull', option('custom', 'Filtrat e mi') + ruleOptions()) +
      field(
        'status',
        'Statusi personal',
        option('', 'Çdo status') +
          Object.entries({
            watching: 'Po shikoj',
            planning: 'Në listë',
            completed: 'Përfunduar',
            paused: 'Në pauzë',
            dropped: 'E lënë',
          })
            .map(([v, t]) => option(v, t))
            .join(''),
      ) +
      field(
        'progress',
        'Gjendja e progresit',
        option('', 'Çdo gjendje') +
          [
            ['continue', 'Për të vazhduar'],
            ['caught-up', 'Në hap'],
            ['finished', 'Seri të përfunduara'],
            ['unknown', 'Pa të dhëna'],
          ]
            .map(([v, t]) => option(v, t))
            .join(''),
      ) +
      '<label>Zhanri<input name="genre" maxlength="60" placeholder="P.sh. Action"></label><label>Kërkimi<input name="query" maxlength="100" placeholder="Titulli ose emri alternativ"></label><label>Maksimumi i episodeve<input name="maxTotal" type="number" min="1" max="10000"></label><label>Episode të mbetura, maksimumi<input name="maxRemaining" type="number" min="1" max="10000"></label><label><input name="favorite" type="checkbox"> Vetëm të preferuarat</label><label><input name="movie" type="checkbox"> Vetëm filma</label><label><input name="excludeCompleted" type="checkbox"> Përjashto të përfunduarat</label><button class="primary" ' +
      (busy ? 'disabled' : '') +
      '>Ruaj pamjen</button></form>'
    );
  }
  function ruleDescription(r) {
    return (
      [
        {
          watching: 'Po shikoj',
          planning: 'Në listë',
          completed: 'Përfunduar',
          paused: 'Në pauzë',
          dropped: 'E lënë',
        }[r.status],
        {
          continue: 'Për të vazhduar',
          'caught-up': 'Në hap',
          finished: 'Seri të përfunduara',
          unknown: 'Pa të dhëna',
        }[r.progress],
        r.favorite ? 'Të preferuarat' : '',
        r.movie ? 'Filma' : '',
        r.maxTotal ? 'Deri në ' + r.maxTotal + ' episode' : '',
        r.maxRemaining ? 'Deri në ' + r.maxRemaining + ' episode të mbetura' : '',
        r.genre,
        r.query,
      ]
        .filter(Boolean)
        .join(' · ') || 'Gjithë biblioteka'
    );
  }
  function rulesHTML() {
    const chosen = data.records.find((r) => r.id === selected),
      matches = chosen
        ? (ctx.state().anime || []).filter((a) => matchRules(a, chosen.rules, ctx.released))
        : [];
    return (
      '<h3>Lista inteligjente dhe filtra të ruajtur</h3><p>Listat inteligjente përditësohen nga biblioteka jote. Filtrat e ruajtur mbajnë zgjedhjet e tua; asnjëri nuk ndryshon progresin.</p><details data-connected-section="rule" ' +
      (draftRules || sections.rule ? 'open' : '') +
      '><summary>Krijo listë ose filtër</summary>' +
      ruleForm() +
      '</details><div class="connected-actions">' +
      data.records
        .map((r) =>
          btn('rule-select', (r.kind === 'smart' ? 'Listë: ' : 'Filtër: ') + r.title, r.id),
        )
        .join('') +
      '</div>' +
      (chosen
        ? '<section><h4>' +
          esc(chosen.title) +
          ' · ' +
          matches.length +
          ' tituj</h4><p>' +
          esc(ruleDescription(chosen.rules)) +
          '</p>' +
          btn('rule-delete', 'Fshi vetëm këtë pamje', chosen.id) +
          '<ul>' +
          matches.map((a) => '<li>' + btn('open', a.title, a.id) + '</li>').join('') +
          '</ul></section>'
        : '<p>Zgjidh një pamje ose krijo të parën.</p>')
    );
  }
  function sharedHTML() {
    const list = data.lists.find((l) => l.id === selected),
      isOwner = list?.owner_id === owner;
    const available = (ctx.state().anime || []).filter((a) => a.source && a.sourceId);
    return (
      '<h3>Lista me miqtë</h3><p>Vetëm emri dhe ID-ja e titullit ndahen me redaktorët. Shikimet, notat dhe shënimet personale mbeten private.</p><form data-connected-form="list" class="connected-form"><label>Emri i listës së përbashkët<input name="title" minlength="2" maxlength="50" required></label><button class="primary">Krijo listë me miqtë</button></form><div class="connected-actions">' +
      data.lists.map((l) => btn('list-select', l.title, l.id)).join('') +
      '</div>' +
      (list
        ? '<h4>' +
          esc(list.title) +
          '</h4><p>' +
          (isOwner ? 'Ti je pronari.' : 'Ti je redaktor.') +
          ' Rifresko për ndryshimet më të fundit.</p><ul>' +
          list.items
            .map(
              (item, i) =>
                '<li>' +
                esc(item.title) +
                ' ' +
                esc(String(list.votes?.[item.key] || 0)) +
                ' vota ' +
                btn(
                  'vote',
                  list.myVote === item.key ? 'Hiq votën time' : 'Voto për sonte',
                  String(i),
                ) +
                btn('item-remove', 'Hiq nga lista', String(i)) +
                '</li>',
            )
            .join('') +
          '</ul><form data-connected-form="item" class="connected-form">' +
          field(
            'item',
            'Shto nga biblioteka',
            available.map((a) => option(a.id, a.title)).join(''),
          ) +
          '<button class="primary" ' +
          (!available.length ? 'disabled' : '') +
          '>Shto titullin</button></form>' +
          (isOwner
            ? '<form data-connected-form="member" class="connected-form"><label>Emri i mikut të pranuar<input name="handle" required maxlength="40" placeholder="username"></label><button class="primary">Shto redaktor</button></form>' +
              btn('members', 'Shfaq redaktorët') +
              '<ul>' +
              members
                .map(
                  (m) =>
                    '<li>' +
                    esc(m.handle) +
                    ' ' +
                    btn('member-remove', 'Hiq lejen', m.user_id) +
                    '</li>',
                )
                .join('') +
              '</ul>' +
              btn('list-delete', 'Fshi listën e përbashkët', list.id)
            : '')
        : '')
    );
  }
  function feedHTML() {
    return (
      '<h3>Abonohu në kalendarin personal</h3><p>Lidhja lexon oraret e ruajtura në bibliotekën cloud. Rifreskimi varet nga aplikacioni i kalendarit. Kush ka lidhjen mund të lexojë titujt dhe oraret, derisa ta revokosh.</p><form data-connected-form="feed" class="connected-form">' +
      field(
        'release',
        'Publikimet',
        option('all', 'Të gjitha') +
          option('premiere', 'Premiera') +
          option('season', 'Fillim sezoni') +
          option('finale', 'Finale'),
      ) +
      '<label><input name="favorites" type="checkbox"> Vetëm të preferuarat</label><label><input name="unwatched" type="checkbox"> Vetëm të paparët</label><button class="primary">Krijo lidhje private</button></form>' +
      (feedURL
        ? '<label>Lidhja e abonimit — ruaje tani<textarea readonly rows="3">' +
          esc(feedURL) +
          '</textarea></label><p>Shto këtë URL si abonim në Apple Calendar, Google Calendar ose Outlook.</p>'
        : '') +
      '<ul>' +
      data.feeds
        .map(
          (f, i) =>
            '<li>Abonimi ' +
            (i + 1) +
            ' · ' +
            esc(f.options.release || 'all') +
            ' ' +
            btn('feed-delete', 'Revoko lidhjen', f.id) +
            '</li>',
        )
        .join('') +
      '</ul>'
    );
  }
  function traktHTML() {
    const linked = data.trakt?.connected;
    return (
      '<section aria-label="Llogaria Trakt"><h3>Lidhja me Trakt</h3>' +
      (!data.trakt?.configured
        ? '<p>Për aktivizim duhet aplikacioni Trakt i administratorit. Importi JSON është gati.</p>'
        : linked
          ? '<p>Llogaria Trakt është lidhur. Importi dhe eksporti nisen vetëm nga ti.</p>' +
            btn('trakt-disconnect', 'Shkëput dhe revoko lidhjen') +
            '<form data-connected-form="private" class="connected-form">' +
            field(
              'kind',
              'Importo nga llogaria ime',
              option('history', 'Historiku') +
                option('ratings', 'Vlerësimet') +
                option('watchlist', 'Në plan'),
            ) +
            '<label>Faqja<input name="page" type="number" min="1" max="100" value="1"></label><button class="primary">Merr të dhënat për parapamje</button></form>' +
            '<form data-connected-form="export-preview" class="connected-form">' +
            field(
              'kind',
              'Dërgo në Trakt',
              option('history', 'Historiku') +
                option('ratings', 'Vlerësimet') +
                option('watchlist', 'Në plan'),
            ) +
            '<p>Vetëm tituj me ID të sakta, deri në 100 regjistrime. Episodet kërkojnë ID Trakt të verifikuar nga një import. Regjistrimet ekzistuese nuk ndryshohen.</p><button class="primary">Përgatit eksportin</button></form>'
          : btn('trakt-connect', 'Lidh llogarinë time Trakt')) +
      (device
        ? '<p>Hap <a href="https://trakt.tv/activate" target="_blank" rel="noopener noreferrer">Trakt Activate</a> dhe shkruaj kodin <strong>' +
          esc(device.userCode) +
          '</strong>. Kodi skadon në ' +
          esc(new Date(device.expiresAt).toLocaleTimeString('sq-AL')) +
          '.</p>' +
          btn('trakt-poll', 'E autorizova — kontrollo lidhjen')
        : '') +
      (exportPlan
        ? '<form data-connected-form="export"><h4>Parapamja e eksportit</h4><p>' +
          exportPlan.rows.length +
          ' regjistrime të reja; ' +
          exportPlan.skipped +
          ' ekzistuese u anashkaluan. Zgjidh çfarë lejon të dërgohet.</p>' +
          exportPlan.rows
            .map(
              (r, i) =>
                '<label><input type="checkbox" name="export-' +
                i +
                '"> ' +
                esc(r.title) +
                ' ' +
                esc(r.watched_at || (r.rating ? '★ ' + r.rating : 'Në plan')) +
                '</label>',
            )
            .join('') +
          (exportPlan.rows.length
            ? '<button class="primary">Dërgo vetëm të zgjedhurat në Trakt</button>'
            : '') +
          '</form>'
        : '') +
      '</section>'
    );
  }
  function importHTML() {
    const library = ctx.state().anime || [];
    return (
      traktHTML() +
      '<h3>Importo nga Trakt</h3><p>Zgjidh eksportin JSON të historikut, vlerësimeve ose listës së planifikuar. Përputh çdo regjistrim me titullin dhe pjesën e saktë në bibliotekën tënde. Titujt e papërputhur anashkalohen; notat ekzistuese ruhen.</p><label>Skedari JSON<input type="file" id="connected-trakt-file" accept=".json,application/json"></label>' +
      (data.traktConfigured
        ? '<form data-connected-form="trakt" class="connected-form"><label>Profili publik Trakt<input name="username" required maxlength="60"></label>' +
          field(
            'kind',
            'Të dhënat',
            option('history', 'Historiku') +
              option('watchlist', 'Në plan') +
              option('ratings', 'Vlerësimet'),
          ) +
          '<label>Faqja<input name="page" type="number" min="1" max="100" value="1"></label><button class="primary">Merr faqe nga profili publik</button></form>'
        : '<p>Importi JSON punon pa llogari Trakt të lidhur.</p>') +
      (imports.length
        ? renderTraktMapping({
            rows: imports,
            library,
            selections: importSelections,
            page: importPage,
            exceptions: importExceptions,
            esc,
            btn,
          })
        : '') +
      (importPreview
        ? '<p role="status">' +
          importPreview.applied +
          ' regjistrime të zgjedhura · ' +
          importPreview.skipped +
          ' të anashkaluara. Kopja rezervë ruhet para zbatimit.</p><ul><li>' +
          importPreview.changes.history +
          ' shikime të reja</li><li>' +
          importPreview.changes.ratings +
          ' vlerësime të shtuara</li><li>' +
          importPreview.changes.watchlist +
          ' tituj në listën Trakt</li></ul><p>' +
          importPreview.reasons.unmapped +
          ' pa përputhje · ' +
          importPreview.reasons.missing +
          ' titull/pjesë ose numër episodi i pavlefshëm · ' +
          importPreview.reasons.format +
          ' format i papërputhur · ' +
          importPreview.reasons.limit +
          ' mbi kufirin e listës.</p>' +
          btn('import-apply', 'Zbato importin e parapamjes')
        : '')
    );
  }
  function rememberForms() {
    if (!host?.isConnected || host.querySelector('fieldset[disabled]')) return;
    for (const detail of host.querySelectorAll('[data-connected-section]'))
      sections[detail.dataset.connectedSection] = detail.open;
    for (const form of host.querySelectorAll('[data-connected-form]')) {
      if (['import', 'export'].includes(form.dataset.connectedForm)) continue;
      formDrafts[form.dataset.connectedForm] = Object.fromEntries([...new FormData(form)]);
    }
  }
  function draw() {
    if (!host?.isConnected) return;
    if (owner === currentOwner()) rememberForms();
    syncOwner();
    const body = !owner
      ? '<p>Hyr në llogari për të ruajtur pamje, abonime dhe lista të përbashkëta.</p>'
      : page === 'collections'
        ? '<details class="connected-section" data-connected-section="smart" ' +
          (draftRules || sections.smart ? 'open' : '') +
          '><summary>Lista inteligjente dhe filtra</summary>' +
          rulesHTML() +
          '</details><details class="connected-section" data-connected-section="shared" ' +
          (sections.shared ? 'open' : '') +
          '><summary>Lista me miqtë dhe votim</summary>' +
          sharedHTML() +
          '</details>'
        : page === 'calendar'
          ? feedHTML()
          : importHTML();
    html.renderHTML(
      host,
      '<section class="connected-panel" aria-label="Funksione të lidhura">' +
        btn('refresh', busy ? 'Po ngarkohen…' : 'Rifresko nga cloud') +
        btn('export', 'Eksporto pamjet dhe listat') +
        (error ? '<p role="alert">' + esc(error) + '</p>' : '') +
        '<fieldset ' +
        (busy ? 'disabled' : '') +
        '>' +
        body.replace(/name="/g, 'name="cf-') +
        '</fieldset></section>',
    );
    for (const form of host.querySelectorAll('[data-connected-form]')) {
      const values = formDrafts[form.dataset.connectedForm] || {};
      for (const field of form.elements)
        if (field.name) {
          if (field.type === 'checkbox') field.checked = Object.hasOwn(values, field.name);
          else if (values[field.name] !== undefined) field.value = values[field.name];
        }
    }
    if (draftRules && page === 'collections') {
      const rules = draftRules;
      const form = host.querySelector('[data-connected-form=rule]');
      if (form) {
        for (const [key, value] of Object.entries(rules)) {
          const field = form.elements.namedItem('cf-' + key);
          if (field) {
            if (field.type === 'checkbox') field.checked = !!value;
            else field.value = String(value);
          }
        }
        form.closest('details').open = true;
        draftRules = null;
      }
    }
  }
  function attach(nextPage, root) {
    const ownerChanged = syncOwner();
    if (!['collections', 'calendar', 'sync'].includes(nextPage)) return;
    page = nextPage;
    if (ctx.pendingLibraryRules) {
      draftRules = ctx.pendingLibraryRules;
      ctx.pendingLibraryRules = null;
    }
    host = root.querySelector('[data-connected-root]');
    if (!host) {
      host = document.createElement('div');
      host.dataset.connectedRoot = '';
      root.prepend(host);
      draw();
    } else if (ownerChanged) draw();
    if (!loaded && !busy && owner) void refresh();
  }
  document.addEventListener('change', async (e) => {
    if (e.target?.matches('[data-import-map]')) {
      importSelections[e.target.dataset.importMap] = e.target.value;
      importPreview = null;
      return;
    }
    if (e.target?.matches('[data-connected-form="rule"] [name="cf-preset"]')) {
      const form = e.target.form,
        rules = rulePresets[e.target.value];
      if (rules)
        for (const name of [
          'status',
          'progress',
          'genre',
          'query',
          'maxTotal',
          'maxRemaining',
          'favorite',
          'movie',
          'excludeCompleted',
        ]) {
          const field = form.elements.namedItem('cf-' + name);
          if (field) {
            if (field.type === 'checkbox') field.checked = !!rules[name];
            else field.value = rules[name] ?? '';
          }
        }
      return;
    }
    if (e.target?.id !== 'connected-trakt-file') return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 4000000)
        throw Error('Skedari është tepër i madh. Ndaje në skedarë më të vegjël.');
      imports = parseTrakt(await file.text());
      importSelections = {};
      importPage = 0;
      importExceptions = { key: '', page: 0 };
      importPreview = null;
      error = '';
      draw();
    } catch (err) {
      error = err.message;
      draw();
    }
  });
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('[data-connected-form]');
    if (!form) return;
    e.preventDefault();
    if (busy) return;
    const values = Object.fromEntries(
        [...new FormData(form)].map(([key, value]) => [key.replace(/^cf-/, ''), value]),
      ),
      op = form.dataset.connectedForm,
      list = data.lists.find((l) => l.id === selected);
    if (op === 'rule') {
      draftRules = null;
      const rules = cleanRules({
        ...values,
        maxTotal: Number(values.maxTotal),
        maxRemaining: Number(values.maxRemaining),
        favorite: values.favorite === 'on',
        movie: values.movie === 'on',
        excludeCompleted: values.excludeCompleted === 'on',
      });
      await mutate({ action: 'rule-create', title: values.title, kind: values.kind, rules });
    }
    if (op === 'private' || op === 'export-preview') {
      busy = true;
      error = '';
      draw();
      try {
        const result = await call({
          action: op === 'private' ? 'trakt-private-page' : 'trakt-export-preview',
          ...values,
          page: Number(values.page) || 1,
        });
        if (op === 'private') {
          imports = parseTrakt(result.rows);
          importSelections = {};
          importPage = 0;
          importExceptions = { key: '', page: 0 };
          importPreview = null;
          error =
            'Faqja ' +
            result.page +
            ' nga ' +
            result.pages +
            '. Zgjidh përputhjet përpara importit.';
        } else exportPlan = result;
      } catch (err) {
        error = err.message;
      } finally {
        busy = false;
        draw();
      }
    }
    if (op === 'export' && exportPlan) {
      const keys = exportPlan.rows
        .filter((r, i) => values['export-' + i] === 'on')
        .map((r) => r.key);
      busy = true;
      error = '';
      draw();
      try {
        const result = await call({
          action: 'trakt-export-apply',
          planId: exportPlan.planId,
          keys,
        });
        error = `Trakt: ${result.added} u shtuan, ${result.existing} ekzistonin, ${result.missing} nuk u gjetën.`;
      } catch (err) {
        error = err.message + ' Krijo një parapamje të re para se të provosh përsëri.';
      } finally {
        exportPlan = null;
        busy = false;
        draw();
      }
    }
    if (op === 'list') await mutate({ action: 'list-create', title: values.title });
    if (op === 'item' && list) {
      const a = ctx.state().anime.find((a) => a.id === values.item);
      if (a) {
        const item = {
          title: a.title,
          source: a.source,
          sourceId: a.sourceId,
          year: a.year,
          format: a.format,
        };
        await mutate({ action: 'list-item', id: list.id, revision: list.revision, item });
      }
    }
    if (op === 'member' && list)
      await mutate({ action: 'list-member', id: list.id, handle: values.handle });
    if (op === 'feed')
      await mutate({
        action: 'feed-create',
        options: {
          release: values.release,
          favorites: values.favorites === 'on',
          unwatched: values.unwatched === 'on',
        },
      });
    if (op === 'trakt') {
      try {
        busy = true;
        const result = await call({ action: 'trakt-page', ...values, page: Number(values.page) });
        imports = parseTrakt(result.rows);
        importSelections = {};
        importPage = 0;
        importExceptions = { key: '', page: 0 };
        importPreview = null;
        error =
          'Faqja ' +
          result.page +
          ' nga ' +
          result.pages +
          '. Merr çdo faqe veçmas për të përfunduar importin.';
      } catch (err) {
        error = err.message;
      } finally {
        busy = false;
        draw();
      }
    }
    if (op === 'import') {
      importPreview = {
        ...applyTraktRows(
          ctx.state(),
          imports,
          resolveTraktGroups(imports, ctx.state().anime, importSelections),
          new Date().toISOString(),
        ),
        base: JSON.stringify(ctx.state()),
      };
      draw();
    }
  });
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-connected]');
    if (!b || busy) return;
    const op = b.dataset.connected,
      id = b.dataset.id,
      list = data.lists.find((l) => l.id === selected);
    if (['trakt-connect', 'trakt-poll', 'trakt-disconnect'].includes(op)) {
      if (
        op === 'trakt-disconnect' &&
        !(await ctx.confirm('Ta revokojmë lidhjen me Trakt? Të dhënat e tua mbeten.'))
      )
        return;
      busy = true;
      error = '';
      draw();
      try {
        const result = await call({ action: op });
        if (result.userCode) device = result;
        if (result.connected || op === 'trakt-disconnect') {
          device = null;
          exportPlan = null;
          await refresh();
        }
        if (result.pending)
          error = 'Autorizimi është në pritje. Provo pas ' + result.retryAfter + ' sekondash.';
      } catch (err) {
        error = err.message;
      } finally {
        busy = false;
        draw();
      }
      return;
    }
    if (op === 'import-prev' || op === 'import-next') {
      importPage += op === 'import-next' ? 1 : -1;
      importPage = Math.max(
        0,
        Math.min(Math.ceil(groupTraktRows(imports).length / 10) - 1, importPage),
      );
      draw();
      return;
    }
    if (op === 'import-exceptions') {
      importExceptions = { key: id, page: 0 };
      draw();
      return;
    }
    if (op === 'import-exception-prev' || op === 'import-exception-next') {
      importExceptions.page = Math.max(
        0,
        importExceptions.page + (op === 'import-exception-next' ? 1 : -1),
      );
      draw();
      return;
    }
    if (op === 'refresh') return refresh();
    if (op === 'export') {
      const blob = new Blob(
        [
          JSON.stringify(
            {
              format: 'animetrack-connected-v1',
              records: data.records,
              lists: data.lists,
              exportedAt: new Date().toISOString(),
            },
            null,
            2,
          ),
        ],
        { type: 'application/json' },
      );
      const url = URL.createObjectURL(blob),
        a = document.createElement('a');
      a.href = url;
      a.download = 'AnimeTrack-Lists.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      return;
    }
    if (op === 'open') return ctx.openAnime(id);
    if (op === 'rule-select' || op === 'list-select') {
      selected = id;
      members = [];
      draw();
      return;
    }
    if (op === 'members' && list) {
      try {
        members = (await call({ action: 'list-members', id: list.id })).members;
        draw();
      } catch (err) {
        error = err.message;
        draw();
      }
      return;
    }
    if (op === 'vote' && list)
      return mutate({
        action: 'list-vote',
        id: list.id,
        itemKey: list.myVote === list.items[Number(id)]?.key ? '' : list.items[Number(id)]?.key,
      });
    if (op === 'item-remove' && list)
      return mutate({
        action: 'list-item',
        id: list.id,
        revision: list.revision,
        item: list.items[Number(id)],
        remove: true,
      });
    if (op === 'member-remove' && list)
      return mutate({ action: 'list-remove-member', id: list.id, userId: id });
    if (['rule-delete', 'feed-delete', 'list-delete'].includes(op)) {
      if (
        await ctx.confirm(
          'Ta heqim këtë ' +
            (op === 'feed-delete'
              ? 'abonim? Lidhja e vjetër do të pushojë së punuari.'
              : 'listë/pamje? Progresi personal nuk ndryshon.'),
        )
      ) {
        if (op === 'feed-delete') feedURL = '';
        return mutate({ action: op, id });
      }
      return;
    }
    if (op === 'import-apply' && importPreview) {
      try {
        await ctx.applyTrakt(imports, importPreview);
        imports = [];
        importSelections = {};
        importPage = 0;
        importExceptions = { key: '', page: 0 };
        importPreview = null;
        error = 'Importi u ruajt.';
      } catch (err) {
        error = err.message;
      }
      draw();
    }
  });
  return { attach };
}
