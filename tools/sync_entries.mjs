// Copy file contents from pack/ into app/public/data/entries.json.
// The directory app embeds a copy of every steering, skill and hook file in
// entries.json. Edit the files under pack/, then run this script so the app
// shows the same text:
//   npm run sync          (from app/)  update entries.json
//   npm run sync:check    (from app/)  only report what's out of date
// Never changes anything under pack/.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACK = path.join(ROOT, 'pack');
const DATA = path.join(ROOT, 'app', 'public', 'data', 'entries.json');

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

// Map each file name to its path under pack/ (installer files excluded).
function indexPack() {
  const found = new Map();
  for (const p of walk(PACK)) {
    const rel = path.relative(PACK, p).split(path.sep);
    const ext = path.extname(p);
    const base = path.basename(p);
    if (rel.includes('install') || !['.md', '.json', '.py'].includes(ext) || base === 'README.md') continue;
    if (found.has(base)) console.log(`warning: two files named ${base}: ${found.get(base)} and ${p}`);
    found.set(base, p);
  }
  return found;
}

const checkOnly = process.argv.includes('--check');
const files = indexPack();
const entries = JSON.parse(readFileSync(DATA, 'utf8'));
const changed = [];
const missing = [];

function sync(id, target, current) {
  const name = target.replace(/\\/g, '/').split('/').pop();
  const src = files.get(name);
  if (!src) { missing.push(`${id}: ${target}`); return current; }
  const text = readFileSync(src, 'utf8');
  if (text !== current) changed.push(`${id}: ${path.relative(ROOT, src)}`);
  return text;
}

for (const e of entries) {
  if (Array.isArray(e.files) && e.files.length) {
    for (const f of e.files) f.content = sync(e.id, f.path, f.content ?? '');
  } else if (e.path) {
    e.content = sync(e.id, e.path, e.content ?? '');
  }
}

for (const line of changed) console.log((checkOnly ? 'out of date: ' : 'updated: ') + line);
for (const line of missing) console.log('no matching file in pack/: ' + line);
if (!changed.length) console.log('entries.json already matches pack/.');
else if (!checkOnly) writeFileSync(DATA, JSON.stringify(entries, null, 2) + '\n', 'utf8');
process.exit(checkOnly && changed.length ? 1 : 0);
