// Writes a Brotli (.br) and a gzip (.gz) copy next to every text file in dist/.
// The local server sends these copies, so it never compresses during a request.
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const TEXT = new Set(['.html', '.css', '.js', '.mjs', '.svg', '.json', '.txt', '.xml', '.webmanifest', '.ico']);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

let count = 0;
let before = 0;
let after = 0;
for await (const file of walk(dist)) {
  if (!TEXT.has(path.extname(file).toLowerCase())) continue;
  const raw = await readFile(file);
  if (raw.length < 512) continue;
  const br = brotliCompressSync(raw, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 11,
      [constants.BROTLI_PARAM_SIZE_HINT]: raw.length,
    },
  });
  const gz = gzipSync(raw, { level: 9 });
  await writeFile(file + '.br', br);
  await writeFile(file + '.gz', gz);
  count += 1;
  before += raw.length;
  after += br.length;
}
await stat(dist);
console.log(
  `precompress: ${count} files, ${(before / 1024).toFixed(1)} kB -> ${(after / 1024).toFixed(1)} kB (Brotli)`,
);
