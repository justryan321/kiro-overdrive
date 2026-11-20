import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createStorage, createVolumeStorage, isPlaceholder } from '../storage.js';
import { createMetrics } from '../metrics.js';

const VOL = '/Volumes/main/tools/overdrive/kiro-overdrive/metrics.json';
const quiet = { warn() {}, error() {} };

// A tiny stand-in for the Databricks workspace: OIDC token endpoint plus Files API 2.0.
async function fakeWorkspace() {
  const state = { files: new Map(), dirs: new Set(), tokens: 0, validToken: null, failWrites: 0, requests: [], expireNext: false };
  const server = createServer((req, res) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      const url = new URL(req.url, 'http://x');
      state.requests.push(`${req.method} ${url.pathname}`);
      if (url.pathname === '/oidc/v1/token') {
        const basic = Buffer.from((req.headers.authorization || '').replace(/^Basic /, ''), 'base64').toString();
        if (basic !== 'cid:csecret' || !body.includes('grant_type=client_credentials')) { res.writeHead(401).end('{}'); return; }
        state.tokens += 1; state.validToken = `tok-${state.tokens}`;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ access_token: state.validToken, token_type: 'Bearer', expires_in: 3600 }));
        return;
      }
      if (state.expireNext) { state.expireNext = false; state.validToken = null; }
      if (req.headers.authorization !== `Bearer ${state.validToken}`) { res.writeHead(401).end('expired'); return; }
      const file = decodeURIComponent(url.pathname.replace('/api/2.0/fs/files', ''));
      if (url.pathname.startsWith('/api/2.0/fs/directories')) { state.dirs.add(decodeURIComponent(url.pathname.replace('/api/2.0/fs/directories', ''))); res.writeHead(204).end(); return; }
      if (req.method === 'PUT') {
        if (state.failWrites > 0) { state.failWrites -= 1; res.writeHead(503).end('busy'); return; }
        if (url.searchParams.get('overwrite') !== 'true') { res.writeHead(400).end(); return; }
        state.files.set(file, body); res.writeHead(204).end(); return;
      }
      if (req.method === 'GET') {
        if (!state.files.has(file)) { res.writeHead(404).end('not found'); return; }
        res.writeHead(200).end(state.files.get(file)); return;
      }
      res.writeHead(405).end();
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  state.host = `http://127.0.0.1:${server.address().port}`;
  state.close = () => new Promise(r => server.close(r));
  return state;
}

const volume = (ws, extra = {}) => createVolumeStorage({ volumePath: VOL, host: ws.host, clientId: 'cid', clientSecret: 'csecret', ...extra });

test('placeholder detection', () => {
  assert.equal(isPlaceholder(''), true);
  assert.equal(isPlaceholder(undefined), true);
  assert.equal(isPlaceholder('/Volumes/<catalog>/<schema>/<volume>/kiro-overdrive/metrics.json'), true);
  assert.equal(isPlaceholder(VOL), false);
});

test('createStorage falls back to a local file, with a warning, while the path is a placeholder or credentials are missing', () => {
  const logs = { warn: [], error: [] };
  const log = { warn: m => logs.warn.push(m), error: m => logs.error.push(m) };
  const a = createStorage({}, { root: '/tmp/app', log });
  assert.equal(a.label, '/tmp/app/data/metrics.json');
  const b = createStorage({ METRICS_VOLUME_PATH: '/Volumes/<catalog>/<schema>/<volume>/x/metrics.json' }, { root: '/tmp/app', log });
  assert.match(b.label, /metrics\.json$/);
  assert.equal(logs.warn.length, 2);
  assert.match(logs.warn[1], /placeholder/);
  const c = createStorage({ METRICS_VOLUME_PATH: VOL }, { root: '/tmp/app', log });
  assert.equal(c.label, '/tmp/app/data/metrics.json');
  assert.match(logs.error[0], /missing/);
  const d = createStorage({ METRICS_VOLUME_PATH: '/Volumes/bad', DATABRICKS_HOST: 'h', DATABRICKS_CLIENT_ID: 'i', DATABRICKS_CLIENT_SECRET: 's' }, { root: '/tmp/app', log });
  assert.equal(d.label, '/tmp/app/data/metrics.json');
  assert.match(logs.error[1], /METRICS_VOLUME_PATH must look like/);
});

test('createStorage uses the Volume when the path and credentials are present', () => {
  const s = createStorage({ METRICS_VOLUME_PATH: VOL, DATABRICKS_HOST: 'dbc-1.cloud.databricks.com', DATABRICKS_CLIENT_ID: 'i', DATABRICKS_CLIENT_SECRET: 's' }, { root: '/x', log: quiet });
  assert.equal(s.label, VOL);
});

test('write then read round-trips through the Files API, creating the folder first', async () => {
  const ws = await fakeWorkspace();
  const s = volume(ws);
  assert.equal(await s.read(), null, 'missing file reads as null');
  await s.write('{"hello":1}');
  assert.equal(ws.files.get(VOL), '{"hello":1}');
  assert.ok(ws.dirs.has('/Volumes/main/tools/overdrive/kiro-overdrive'));
  assert.equal(await s.read(), '{"hello":1}');
  assert.equal(ws.tokens, 1, 'token is cached between requests');
  await s.write('{"hello":2}');
  assert.equal(ws.requests.filter(r => r.startsWith('PUT /api/2.0/fs/directories')).length, 1, 'folder created once');
  await ws.close();
});

test('an expired token is refreshed and the request retried', async () => {
  const ws = await fakeWorkspace();
  const s = volume(ws);
  await s.write('one');
  assert.equal(ws.tokens, 1);
  ws.expireNext = true;
  await s.write('two');
  assert.equal(ws.tokens, 2);
  assert.equal(ws.files.get(VOL), 'two');
  await ws.close();
});

test('wrong credentials and server errors surface as errors without leaking the secret', async () => {
  const ws = await fakeWorkspace();
  const bad = createVolumeStorage({ volumePath: VOL, host: ws.host, clientId: 'cid', clientSecret: 'WRONG-SECRET' });
  await assert.rejects(bad.read(), err => { assert.match(err.message, /token request failed \(HTTP 401\)/); assert.ok(!err.message.includes('WRONG-SECRET')); return true; });
  const good = volume(ws);
  ws.failWrites = 1;
  await assert.rejects(good.write('x'), /write failed \(HTTP 503\)/);
  await ws.close();
});

test('a Volume outage keeps the counts and nothing is lost after it recovers', async () => {
  const ws = await fakeWorkspace();
  ws.failWrites = 3;
  const lines = [];
  const m = createMetrics({
    storage: volume(ws), validIds: { entries: new Set(['a', 'b']), packages: new Set() },
    log: { warn: msg => lines.push(msg) }, flushDelayMs: 5, retryBaseMs: 5, retryMaxMs: 20,
  });
  await m.load();
  m.increment('entries', 'a'); m.increment('entries', 'a');
  assert.equal(await m.flush(), false);
  m.increment('entries', 'b');
  for (let i = 0; i < 100 && m.pending; i++) await new Promise(r => setTimeout(r, 10));
  assert.equal(m.pending, false);
  assert.deepEqual(JSON.parse(ws.files.get(VOL)).entries, { a: { copies: 2 }, b: { copies: 1 } });
  assert.ok(lines.length >= 1 && lines.every(l => !l.includes('csecret') && !l.includes('tok-')), 'no secrets in logs');

  // "Restart": a new instance reads the saved counts and adds to them.
  const again = createMetrics({ storage: volume(ws), validIds: { entries: new Set(['a', 'b']), packages: new Set() }, log: quiet, flushDelayMs: 5 });
  await again.load();
  again.increment('entries', 'a');
  assert.equal(again.snapshot().entries.a.copies, 3);
  await again.close(); await m.close(); await ws.close();
});
