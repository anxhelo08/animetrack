import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { startupAssets } from './startup-assets.mjs';
const assets = new URL('../dist/assets/', import.meta.url);
const files = await readdir(assets);
const sizes = await Promise.all(
  files
    .filter((name) => name.endsWith('.js'))
    .map(async (name) => gzipSync(await readFile(new URL(name, assets))).length),
);
const total = sizes.reduce((a, b) => a + b, 0);
// Separate initial loading from optional features; splitting reduces startup traffic
// while each independently compressed chunk adds a little total compression overhead.
if (total > 346000) throw Error(`JavaScript gzip budget exceeded: ${total} > 346000 bytes`);
const manifest = JSON.parse(
  await readFile(new URL('../dist/.vite/manifest.json', import.meta.url), 'utf8'),
);
const initial = startupAssets(manifest);
const startup = (
  await Promise.all(
    initial.map(
      async (file) => gzipSync(await readFile(new URL('../dist/' + file, import.meta.url))).length,
    ),
  )
).reduce((a, b) => a + b, 0);
if (startup > 310000)
  throw Error(`Startup JavaScript gzip budget exceeded: ${startup} > 310000 bytes`);
console.log(`Startup JavaScript gzip: ${startup} / 310000 bytes (${initial.length} chunks)`);
console.log(`Total JavaScript gzip: ${total} / 346000 bytes (${sizes.length} chunks)`);
