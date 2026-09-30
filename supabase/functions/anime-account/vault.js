// Credentials are encrypted at rest; only the Edge runtime receives the service key.
// Rotating that key requires reconnecting providers. No key material leaves this module.
export async function seal(value, secret, webCrypto = globalThis.crypto) {
  const key = await vaultKey(secret, webCrypto);
  const iv = webCrypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(value));
  const encrypted = new Uint8Array(
    await webCrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data),
  );
  return btoa(String.fromCharCode(...iv, ...encrypted));
}
export async function open(value, secret, webCrypto = globalThis.crypto) {
  const bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  const key = await vaultKey(secret, webCrypto);
  const data = await webCrypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes.slice(0, 12) },
    key,
    bytes.slice(12),
  );
  return JSON.parse(new TextDecoder().decode(data));
}
async function vaultKey(secret, webCrypto) {
  if (!secret || secret.length < 32) throw new Error('Vault unavailable');
  const hash = await webCrypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode('animetrack-provider-v1:' + secret),
  );
  return webCrypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
