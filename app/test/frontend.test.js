import test from 'node:test';
import assert from 'node:assert/strict';
import { createTracker } from '../src/track.js';
import { bump, byPopular, copiesLabel, copiesOf, hasMetrics } from '../src/popular.js';

test('track posts kind and id as JSON with keepalive', async () => {
  const calls = [];
  const track = createTracker({ fetchFn: async (url, init) => { calls.push([url, init]); return { ok: true }; } });
  assert.equal(await track('entries', 'sql-review'), true);
  const [url, init] = calls[0];
  assert.equal(url, '/api/track');
  assert.equal(init.method, 'POST');
  assert.equal(init.keepalive, true);
  assert.deepEqual(JSON.parse(init.body), { kind: 'entries', id: 'sql-review' });
});

test('track never throws and resolves false on failure', async () => {
  assert.equal(await createTracker({ fetchFn: async () => { throw new Error('offline'); } })('entries', 'a'), false);
  assert.equal(await createTracker({ fetchFn: () => { throw new Error('sync boom'); } })('entries', 'a'), false);
  assert.equal(await createTracker({ fetchFn: async () => ({ ok: false, status: 429 }) })('entries', 'a'), false);
  assert.equal(await createTracker({ fetchFn: async () => ({ ok: true }) })('', ''), false);
});

test('onTracked runs only on success and a throwing hook does not change the result', async () => {
  const seen = [];
  const ok = createTracker({ fetchFn: async () => ({ ok: true }), onTracked: (k, i) => seen.push([k, i]) });
  const bad = createTracker({ fetchFn: async () => ({ ok: false }), onTracked: (k, i) => seen.push(['bad', i]) });
  const boom = createTracker({ fetchFn: async () => ({ ok: true }), onTracked: () => { throw new Error('ui'); } });
  await ok('packages', 'starter'); await bad('entries', 'x');
  assert.deepEqual(seen, [['packages', 'starter']]);
  assert.equal(await boom('entries', 'a'), true);
});

test('copiesOf, hasMetrics and copiesLabel handle empty and odd input', () => {
  const m = { entries: { a: { copies: 3 }, b: { copies: 0 } }, packages: {} };
  assert.equal(copiesOf(m, 'entries', 'a'), 3);
  assert.equal(copiesOf(m, 'entries', 'b'), 0);
  assert.equal(copiesOf(m, 'entries', 'zzz'), 0);
  assert.equal(copiesOf(null, 'entries', 'a'), 0);
  assert.equal(hasMetrics(m), true);
  assert.equal(hasMetrics({ entries: {}, packages: {} }), false);
  assert.equal(hasMetrics({ entries: { a: { copies: 0 } } }), false);
  assert.equal(hasMetrics(null), false);
  assert.equal(copiesLabel(1), '1 copy');
  assert.equal(copiesLabel(5), '5 copies');
});

test('byPopular orders by copies, then recommended, and keeps the rest stable', () => {
  const m = { entries: { a: { copies: 1 }, b: { copies: 5 }, c: { copies: 5 } } };
  const list = [{ id: 'a' }, { id: 'c' }, { id: 'b', recommended: true }, { id: 'd' }, { id: 'e' }];
  assert.deepEqual(list.sort(byPopular(m)).map(x => x.id), ['b', 'c', 'a', 'd', 'e']);
});

test('bump adds one copy in place', () => {
  const m = { entries: { a: { copies: 2 } }, packages: {} };
  bump(m, 'entries', 'a'); bump(m, 'packages', 'starter');
  assert.equal(m.entries.a.copies, 3);
  assert.equal(m.packages.starter.copies, 1);
  assert.doesNotThrow(() => bump(null, 'entries', 'a'));
});
