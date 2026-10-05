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
// Allow 3 KB for reading controls and verified episode/history repairs.
if (total > 333000) throw Error(`JavaScript gzip budget exceeded: ${total} > 333000 bytes`);
console.log(`JavaScript gzip: ${total} / 333000 bytes (${sizes.length} chunks)`);
