import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp, loadValidIds } from '../server.js';
import { createFileStorage, createMetrics } from '../metrics.js';

const quiet = { warn() {} };

async function start(rateLimit) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ko-server-'));
  const file = path.join(dir, 'metrics.json');
  const validIds = await loadValidIds();
  const metrics = createMetrics({ storage: createFileStorage(file), validIds, log: quiet, flushDelayMs: 5 });
  await metrics.load();
  const server = createApp({ metrics, rateLimit });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (body, headers = {}) => fetch(base + '/api/track', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers });
  const stop = async () => { await metrics.close(); await new Promise(r => server.close(r)); };
  return { base, post, metrics, file, validIds, stop };
}

test('a valid track request is counted and served by /api/metrics', async () => {
  const s = await start();
  const id = [...s.validIds.entries][0];
  assert.ok(id, 'entries.json has at least one entry');
  assert.equal((await s.post({ kind: 'entries', id })).status, 204);
  assert.equal((await s.post({ kind: 'entries', id })).status, 204);
  const pkg = [...s.validIds.packages][0];
  assert.equal((await s.post({ kind: 'packages', id: pkg })).status, 204);
  const res = await fetch(s.base + '/api/metrics');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /application\/json/);
  const m = await res.json();
  assert.equal(m.entries[id].copies, 2);
  assert.equal(m.packages[pkg].copies, 1);
  await s.metrics.flush();
  assert.equal(JSON.parse(await readFile(s.file, 'utf8')).entries[id].copies, 2);
  await s.stop();
});

test('unknown ids, bad kinds and bad JSON return 400', async () => {
  const s = await start();
  assert.equal((await s.post({ kind: 'entries', id: 'does-not-exist' })).status, 400);
  assert.equal((await s.post({ kind: 'nope', id: [...s.validIds.entries][0] })).status, 400);
  assert.equal((await s.post('not json')).status, 400);
  assert.equal((await s.post('null')).status, 400);
  assert.deepEqual((await (await fetch(s.base + '/api/metrics')).json()).entries, {});
  await s.stop();
});

test('an oversized body is rejected with 413', async () => {
  const s = await start();
  const res = await s.post({ kind: 'entries', id: 'x'.repeat(5000) });
  assert.equal(res.status, 413);
  await s.stop();
});

test('rate limit returns 429 after the allowed number of requests', async () => {
  const s = await start({ windowMs: 60_000, max: 3 });
  const id = [...s.validIds.entries][0];
  const codes = [];
  for (let i = 0; i < 5; i++) codes.push((await s.post({ kind: 'entries', id })).status);
  assert.deepEqual(codes, [204, 204, 204, 429, 429]);
  const m = await (await fetch(s.base + '/api/metrics')).json();
  assert.equal(m.entries[id].copies, 3);
  await s.stop();
});

test('everything except /api/track stays read-only', async () => {
  const s = await start();
  for (const p of ['/', '/api/metrics', '/data/entries.json', '/anything']) {
    for (const method of ['POST', 'PUT', 'DELETE']) {
      assert.equal((await fetch(s.base + p, { method, body: '{}' })).status, 405, `${method} ${p}`);
    }
  }
  assert.equal((await fetch(s.base + '/api/track')).status, 405);
  await s.stop();
});

test('static files and unknown api paths behave as before', async () => {
  const s = await start();
  assert.equal((await fetch(s.base + '/')).status, 200);
  assert.equal((await fetch(s.base + '/src/main.js')).status, 200);
  assert.equal((await fetch(s.base + '/data/packages.json')).status, 200);
  assert.equal((await fetch(s.base + '/api/nope')).status, 404);
  assert.equal((await fetch(s.base + '/src/../server.js')).status, 404);
  await s.stop();
});
