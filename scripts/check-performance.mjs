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
// Phase 1 allows 3 KB for deletion/unmark ordering, server clock and progressive cards.
if (total > 336000) throw Error(`JavaScript gzip budget exceeded: ${total} > 336000 bytes`);
console.log(`JavaScript gzip: ${total} / 336000 bytes (${sizes.length} chunks)`);
