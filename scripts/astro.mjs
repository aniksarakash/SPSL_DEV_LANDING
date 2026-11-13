// Runs the Astro command line with a Node version that Astro supports.
// Astro 7.4.11 needs Node >= 22.23.4. If the system Node is older, this
// launcher uses the pinned Node binary from the `node-win-x64` dev dependency.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const need = [22, 23, 4];
const have = process.versions.node.split('.').map(Number);
const systemOk =
  have[0] > need[0] ||
  (have[0] === need[0] && (have[1] > need[1] || (have[1] === need[1] && have[2] >= need[2])));

const localNode = path.join(root, 'node_modules', 'node-win-x64', 'bin', 'node.exe');
const nodeBin = systemOk ? process.execPath : localNode;

if (!systemOk && !existsSync(localNode)) {
  console.error(
    `Node ${process.versions.node} is too old for Astro and the local Node binary is missing.\n` +
      'Run "npm install" on Windows x64, or install Node 22.23.4 or later.',
  );
  process.exit(1);
}

const astroCli = path.join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');
const result = spawnSync(nodeBin, [astroCli, ...process.argv.slice(2)], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
});
process.exit(result.status ?? 1);
