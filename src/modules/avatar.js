import { cloudConfig } from '../config.js';

/** Avatars may contact only this application's Storage service. */
export function safeAvatarURL(value) {
  try {
    const url = new URL(String(value));
    const storage = new URL(cloudConfig.url);
    if (url.origin !== storage.origin || url.username || url.password) return '';
    if (!/^\/storage\/v1\/object\/(public|sign)\/[^/]+\/[^/]/.test(url.pathname)) return '';
    return url.href;
  } catch {
    return '';
  }
}
