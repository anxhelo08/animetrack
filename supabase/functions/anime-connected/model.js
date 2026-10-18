export const featureKinds = ['smart', 'saved'];
export const cleanText = (value, max = 180) =>
  String(value || '')
    .replace(/[\u0000-\u001f]/g, ' ')
    .trim()
    .slice(0, max);
export function publicItem(raw) {
  const title = cleanText(raw?.title);
  const source = cleanText(raw?.source, 30),
    sourceId = cleanText(raw?.sourceId, 80);
  if (!title || !source || !sourceId) throw Error('Titulli kërkon ID të konfirmuar të katalogut.');
  return {
    key: source + ':' + sourceId,
    title,
    source,
    sourceId,
    format: cleanText(raw.format, 20),
    year: Math.max(0, Number(raw.year) || 0) || null,
  };
}
export function cleanFilter(raw = {}) {
  const out = {};
  for (const key of ['status', 'progress', 'query', 'genre'])
    if (typeof raw[key] === 'string') out[key] = cleanText(raw[key], 100);
  for (const key of ['maxTotal', 'maxRemaining'])
    if (Number.isInteger(raw[key]) && raw[key] > 0 && raw[key] <= 10000) out[key] = raw[key];
  for (const key of ['favorite', 'movie', 'excludeCompleted'])
    if (raw[key] === true) out[key] = true;
  return out;
}
export async function hashToken(token) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
}
const escapeICS = (value) =>
  String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
const icsStamp = (value) =>
  new Date(value)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
export function feedEvents(payload, options = {}, now = Date.now()) {
  const events = [],
    end = now + 90 * 86400000;
  for (const anime of payload?.anime || []) {
    if (options.favorites && !anime.favorite) continue;
    if (options.status && anime.status !== options.status) continue;
    for (const part of anime.seasons || []) {
      if (part.hidden) continue;
      const rows = (part.episodes || []).map((e) => ({
        n: Number(e.number),
        when: Date.parse(e.airedAt || e.aired || ''),
      }));
      if (part.nextAiringEpisode && part.nextAiringAt)
        rows.push({ n: Number(part.nextAiringEpisode), when: Number(part.nextAiringAt) * 1000 });
      for (const row of rows) {
        if (
          !Number.isInteger(row.n) ||
          row.n < 1 ||
          !Number.isFinite(row.when) ||
          row.when < now ||
          row.when > end ||
          (options.unwatched && (part.watched || []).includes(row.n))
        )
          continue;
        const first = (anime.seasons || []).find((s) => !s.hidden)?.id === part.id;
        if (options.release === 'premiere' && (row.n !== 1 || !first)) continue;
        if (options.release === 'season' && row.n !== 1) continue;
        if (
          options.release === 'finale' &&
          (!['FINISHED', 'FINISHED_AIRING'].includes(part.releaseStatus) ||
            Number(part.total) !== row.n)
        )
          continue;
        const key = anime.id + ':' + part.id + ':' + row.n;
        if (!events.some((e) => e.key === key))
          events.push({ key, title: cleanText(anime.title), episode: row.n, when: row.when });
      }
    }
  }
  return events.slice(0, 2000).sort((a, b) => a.when - b.when);
}
export function calendarICS(events, now = Date.now()) {
  const rows = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AnimeTrack//Calendar//SQ',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:AnimeTrack',
  ];
  for (const e of events)
    rows.push(
      'BEGIN:VEVENT',
      'UID:' + escapeICS(e.key) + '@animetrack',
      'DTSTAMP:' + icsStamp(now),
      'DTSTART:' + icsStamp(e.when),
      'DTEND:' + icsStamp(e.when + 30 * 60000),
      'SUMMARY:' + escapeICS(e.title + ' · Episodi ' + e.episode),
      'END:VEVENT',
    );
  rows.push('END:VCALENDAR');
  // Fold by UTF-8 octets; long titles must remain valid for calendar clients.
  const fold = (line) => {
    let result = '',
      chunk = '',
      size = 0;
    for (const char of line) {
      const bytes = new TextEncoder().encode(char).length;
      if (size + bytes > 73) {
        result += chunk + '\r\n ';
        chunk = '';
        size = 1;
      }
      chunk += char;
      size += bytes;
    }
    return result + chunk;
  };
  return rows.map(fold).join('\r\n') + '\r\n';
}
