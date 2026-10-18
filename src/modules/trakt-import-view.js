import { groupTraktRows, suggestedGroupTarget } from '../core/trakt-import-groups.js';
export function renderTraktMapping({ rows, library, selections, page, exceptions, esc, btn }) {
  const groups = groupTraktRows(rows),
    pages = Math.ceil(groups.length / 10),
    start = page * 10;
  const targets = library.flatMap((a) =>
    (a.seasons || [])
      .filter((s) => !s.hidden)
      .map((s) => ({
        value: a.id + '|' + s.id,
        label: a.title + ' · ' + (s.subtitle || s.title || 'Pjesa'),
      })),
  );
  const options = (value, inherit = false) =>
    (inherit
      ? '<option value="inherit" ' +
        (value === 'inherit' ? 'selected' : '') +
        '>Përdor zgjedhjen e sezonit</option>'
      : '') +
    '<option value="" ' +
    (!value ? 'selected' : '') +
    '>Anashkalo</option>' +
    targets
      .map(
        (t) =>
          '<option value="' +
          esc(t.value) +
          '" ' +
          (value === t.value ? 'selected' : '') +
          '>' +
          esc(t.label) +
          '</option>',
      )
      .join('');
  const select = (key, label, value, inherit = false) =>
    '<label>' +
    esc(label) +
    '<select data-import-map="' +
    esc(key) +
    '" name="' +
    esc(key) +
    '">' +
    options(value, inherit) +
    '</select></label>';
  const groupsHTML = groups
    .slice(start, start + 10)
    .map((g) => {
      const target = Object.hasOwn(selections, g.key)
        ? selections[g.key]
        : suggestedGroupTarget(g, library);
      const label =
        g.title +
        (g.movie ? ' · Film' : ' · Sezoni ' + g.season) +
        ' · ' +
        g.rows.length +
        ' regjistrime';
      let html = '<section class="connected-import-group">' + select(g.key, label, target);
      if (g.rows.length > 1) {
        html += btn('import-exceptions', 'Përputh episode veçmas', g.key);
        if (exceptions.key === g.key) {
          const offset = exceptions.page * 20;
          html +=
            '<div class="connected-import-exceptions">' +
            g.rows
              .slice(offset, offset + 20)
              .map((r) =>
                select(
                  r.key,
                  'EP ' + (r.episode || '—') + (r.at ? ' · ' + r.at.slice(0, 10) : ''),
                  selections[r.key] ?? 'inherit',
                  true,
                ),
              )
              .join('') +
            '</div><p>Episode ' +
            (offset + 1) +
            '–' +
            Math.min(offset + 20, g.rows.length) +
            ' nga ' +
            g.rows.length +
            '</p>' +
            (offset ? btn('import-exception-prev', 'Episodet e mëparshme') : '') +
            (offset + 20 < g.rows.length ? btn('import-exception-next', 'Episodet e tjera') : '');
        }
      }
      return html + '</section>';
    })
    .join('');
  return (
    '<form data-connected-form="import"><p>' +
    rows.length +
    ' regjistrime në ' +
    groups.length +
    ' grupe. Përputh një herë çdo serial/sezon; përjashtimet mund t’i zgjedhësh veçmas. Titujt e papërputhur anashkalohen.</p>' +
    groupsHTML +
    '<p>Faqja ' +
    (page + 1) +
    ' nga ' +
    pages +
    '. Zgjedhjet ruhen kur kalon faqen.</p>' +
    (page ? btn('import-prev', 'Grupet e mëparshme') : '') +
    (page + 1 < pages ? btn('import-next', 'Grupet e tjera') : '') +
    '<button class="primary">Shfaq parapamjen e të gjitha zgjedhjeve</button></form>'
  );
}
