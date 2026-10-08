// These are the imports that main.js waits for before revealing the app.
export const startupEntries = [
  'index.html',
  'src/app.js',
  'src/config.js',
  'src/modules/security.js',
  'src/modules/supabase-client.js',
  'src/core/browser-storage.js',
  'src/modules/pwa.js',
  'src/startup-factories.js',
];
export function startupAssets(manifest, entries = startupEntries) {
  const visited = new Set(),
    files = new Set();
  function visit(key) {
    if (visited.has(key)) return;
    const chunk = manifest[key];
    if (!chunk) throw Error(`Startup manifest entry missing: ${key}`);
    visited.add(key);
    if (chunk.file.endsWith('.js')) files.add(chunk.file);
    for (const imported of chunk.imports || []) visit(imported);
  }
  for (const entry of entries) visit(entry);
  return [...files];
}
