// Build the static site for GitHub Pages into docs/ (Pages source: main, /docs).
// public/* goes to docs/ and src/ to docs/src/, matching how server.js serves them.
// Only the generated paths below are replaced; other files in docs/ (e.g. MIGRATION.md) are left alone.
import { cp, rm, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(ROOT, 'app');
const OUT = path.join(ROOT, 'docs');
const PUBLIC = path.join(APP, 'public');

const generated = [...await readdir(PUBLIC), 'src', '.nojekyll'];
if (generated.some(name => name.toLowerCase() === 'migration.md')) throw new Error('app/public would overwrite docs/MIGRATION.md');

for (const name of generated) await rm(path.join(OUT, name), { recursive: true, force: true });
await cp(PUBLIC, OUT, { recursive: true });
await cp(path.join(APP, 'src'), path.join(OUT, 'src'), { recursive: true });
await writeFile(path.join(OUT, '.nojekyll'), '');

console.log(`Built site into ${path.relative(ROOT, OUT)}/. Commit docs/ with your changes and push.`);
