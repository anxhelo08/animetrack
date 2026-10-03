export const NEW_RELEASE_WINDOW = 7 * 86400000;
export function isNewRelease(stamp, now = Date.now()) {
  const time = typeof stamp === 'number' ? stamp : Date.parse(stamp || '');
  return Number.isFinite(time) && time <= now && now - time < NEW_RELEASE_WINDOW;
}
