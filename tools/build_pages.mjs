// Build the static site for GitHub Pages into app/dist/.
// public/* goes to the root and src/ to dist/src/, matching how server.js serves them.
import { cp, rm, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const DIST = path.join(APP, 'dist');

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });
await cp(path.join(APP, 'public'), DIST, { recursive: true });
await cp(path.join(APP, 'src'), path.join(DIST, 'src'), { recursive: true });
await writeFile(path.join(DIST, '.nojekyll'), '');

console.log(`Built ${DIST}`);
