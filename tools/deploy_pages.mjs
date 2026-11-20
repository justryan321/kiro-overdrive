// Build the site and publish app/dist/ to the gh-pages branch of `origin`.
// Run from app/:  npm run deploy
// gh-pages holds only generated files, so it is force-pushed with a single commit each time.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(ROOT, 'app');
const DIST = path.join(APP, 'dist');

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });
const out = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8' }).trim();

// Only deploy committed work from main, so the site never shows unreviewed changes.
const branch = out('git', ['rev-parse', '--abbrev-ref', 'HEAD'], ROOT);
if (branch !== 'main') {
  console.error(`You are on "${branch}". Switch to main (and pull) before deploying.`);
  process.exit(1);
}
if (out('git', ['status', '--porcelain', '--', 'app', 'pack', 'tools', 'docs'], ROOT)) {
  console.error('There are uncommitted changes. Commit and push them to main first.');
  process.exit(1);
}

const origin = out('git', ['remote', 'get-url', 'origin'], ROOT);
const sha = out('git', ['rev-parse', '--short', 'HEAD'], ROOT);

run('npm', ['run', 'check'], APP);
run('npm', ['run', 'sync:check'], APP);
run('npm', ['run', 'build'], APP);

// Fresh repo inside dist/ so nothing from main's history is mixed in.
run('git', ['init', '-q', '-b', 'gh-pages'], DIST);
run('git', ['add', '-A'], DIST);
run('git', ['-c', 'user.name=Kiro Overdrive deploy', '-c', 'user.email=noreply@invalid',
  'commit', '-q', '-m', `Deploy ${sha}`], DIST);
run('git', ['push', '--force', origin, 'gh-pages:gh-pages'], DIST);

console.log(`\nDeployed ${sha} to gh-pages.`);
