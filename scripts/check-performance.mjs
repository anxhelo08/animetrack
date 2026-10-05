import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const assets = new URL('../dist/assets/', import.meta.url);
const files = await readdir(assets);
const sizes = await Promise.all(
  files
    .filter((name) => name.endsWith('.js'))
    .map(async (name) => gzipSync(await readFile(new URL(name, assets))).length),
);
const total = sizes.reduce((a, b) => a + b, 0);
// Allow 2 KB for reading details, library management and notification controls.
if (total > 332000) throw Error(`JavaScript gzip budget exceeded: ${total} > 332000 bytes`);
console.log(`JavaScript gzip: ${total} / 332000 bytes (${sizes.length} chunks)`);
