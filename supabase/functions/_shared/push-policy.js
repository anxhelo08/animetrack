export const MAX_ATTEMPTS = 5;
export function permittedEndpoint(raw) {
  if (typeof raw !== 'string' || raw.length > 1024) return false;
  try {
    const u = new URL(raw),
      host = u.hostname.toLowerCase();
    return (
      u.protocol === 'https:' &&
      !u.username &&
      !u.password &&
      !u.hash &&
      (!u.port || u.port === '443') &&
      (host === 'fcm.googleapis.com' ||
        host === 'updates.push.services.mozilla.com' ||
        host === 'updates-autopush.stage.mozaws.net' ||
        host.endsWith('.push.apple.com') ||
        host.endsWith('.notify.windows.com'))
    );
  } catch {
    return false;
  }
}
export function stillWanted(job, payload) {
  const p = payload?.preferences || {};
  if (
    !p.pushEnabled ||
    !Object.hasOwn(p.calendarReminders || {}, job.event_key) ||
    (p.notificationMuted || []).includes('episodes')
  )
    return false;
  const a = payload?.anime?.find((x) => x.id === job.anime_id),
    s = a?.seasons?.find((x) => x.id === job.season_id);
  return !!s && !s.watched?.includes(job.episode);
}
export function retryTime(attempt, now, retryAfter) {
  let delay = Math.min(3600000, 300000 * 2 ** Math.max(0, attempt - 1));
  if (retryAfter) {
    const value = /^\d+$/.test(String(retryAfter))
      ? Number(retryAfter) * 1000
      : Date.parse(retryAfter) - now;
    if (Number.isFinite(value)) delay = Math.max(delay, Math.min(3600000, value));
  }
  return new Date(now + delay).toISOString();
}
export function classify(error) {
  const code = Number(error?.statusCode || 0);
  return code === 404 || code === 410
    ? 'expired'
    : code === 0 || code === 408 || code === 429 || code >= 500
      ? 'retry'
      : 'failed';
}
export function safeEqual(a, b) {
  const x = new TextEncoder().encode(a),
    y = new TextEncoder().encode(b);
  if (!x.length || x.length !== y.length) return false;
  let mismatch = 0;
  for (let i = 0; i < x.length; i++) mismatch |= x[i] ^ y[i];
  return mismatch === 0;
}
export function validSubject(raw) {
  try {
    const u = new URL(raw);
    return u.protocol === 'mailto:'
      ? !!u.pathname && u.pathname.includes('@')
      : u.protocol === 'https:' &&
          !!u.hostname &&
          u.hostname !== 'localhost' &&
          !u.username &&
          !u.password;
  } catch {
    return false;
  }
}
