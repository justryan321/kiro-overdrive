import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createFileStorage, createMetrics } from '../metrics.js';

const quiet = { warn() {} };
const ids = { entries: new Set(['a', 'b']), packages: new Set(['starter']) };
const tmp = () => mkdtemp(path.join(os.tmpdir(), 'ko-metrics-'));
const make = (storage, extra = {}) => createMetrics({ storage, validIds: ids, log: quiet, flushDelayMs: 5, retryBaseMs: 5, retryMaxMs: 20, ...extra });

test('increments known ids and rejects unknown ids and kinds', async () => {
  const dir = await tmp();
  const m = make(createFileStorage(path.join(dir, 'm.json')));
  await m.load();
  assert.equal(m.increment('entries', 'a'), true);
  assert.equal(m.increment('entries', 'a'), true);
  assert.equal(m.increment('packages', 'starter'), true);
  assert.equal(m.increment('entries', 'nope'), false);
  assert.equal(m.increment('entries', '__proto__'), false);
  assert.equal(m.increment('bogus', 'a'), false);
  assert.equal(m.increment('entries', 42), false);
  const s = m.snapshot();
  assert.deepEqual(s.entries, { a: { copies: 2 } });
  assert.deepEqual(s.packages, { starter: { copies: 1 } });
  await m.close();
});

test('flush writes the documented format and a new instance reads it back', async () => {
  const dir = await tmp();
  const file = path.join(dir, 'nested', 'm.json');
  const m = make(createFileStorage(file));
  await m.load();
  m.increment('entries', 'b'); m.increment('entries', 'b'); m.increment('entries', 'a');
  assert.equal(await m.flush(), true);
  const doc = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(doc.version, 1);
  assert.equal(typeof doc.updatedAt, 'number');
  assert.deepEqual(doc.entries, { a: { copies: 1 }, b: { copies: 2 } });
  assert.deepEqual((await readdir(path.dirname(file))), ['m.json'], 'no temp file left behind');

  const again = make(createFileStorage(file));
  await again.load();
  again.increment('entries', 'a');
  assert.deepEqual(again.snapshot().entries, { a: { copies: 2 }, b: { copies: 2 } });
  await again.close();
});

test('a missing file starts at zero', async () => {
  const dir = await tmp();
  const m = make(createFileStorage(path.join(dir, 'none.json')));
  assert.equal(await m.load(), true);
  assert.deepEqual(m.snapshot().entries, {});
});

test('a corrupt file is kept as a backup and counting starts fresh', async () => {
  const dir = await tmp();
  const file = path.join(dir, 'm.json');
  await writeFile(file, '{ not json', 'utf8');
  const m = make(createFileStorage(file));
  assert.equal(await m.load(), true);
  m.increment('entries', 'a');
  await m.flush();
  assert.equal(JSON.parse(await readFile(file, 'utf8')).entries.a.copies, 1);
  const files = await readdir(dir);
  assert.ok(files.some(f => f.startsWith('m.json.corrupt-')), 'corrupt copy kept');
});

test('malformed counts inside valid JSON are ignored', async () => {
  const dir = await tmp();
  const file = path.join(dir, 'm.json');
  await writeFile(file, JSON.stringify({ entries: { a: { copies: -3 }, b: { copies: 'x' }, c: { copies: 4 } }, packages: 7 }), 'utf8');
  const m = make(createFileStorage(file));
  await m.load();
  assert.deepEqual(m.snapshot().entries, { c: { copies: 4 } });
});

test('failed writes keep the counts and retry until they succeed', async () => {
  let fail = 3; const written = [];
  const storage = {
    async read() { return null; },
    async write(text) { if (fail-- > 0) throw new Error('503'); written.push(JSON.parse(text)); },
  };
  const m = make(storage);
  await m.load();
  m.increment('entries', 'a'); m.increment('entries', 'a');
  assert.equal(await m.flush(), false);
  assert.equal(m.pending, true);
  m.increment('entries', 'b');           // keeps counting while the store is down
  for (let i = 0; i < 50 && m.pending; i++) await new Promise(r => setTimeout(r, 10));
  assert.equal(m.pending, false);
  assert.deepEqual(written.at(-1).entries, { a: { copies: 2 }, b: { copies: 1 } });
  await m.close();
});

test('an unreadable store at startup does not overwrite data once it comes back', async () => {
  let up = false; let stored = JSON.stringify({ entries: { a: { copies: 10 } } }); const writes = [];
  const storage = {
    async read() { if (!up) throw new Error('down'); return stored; },
    async write(text) { writes.push(text); stored = text; },
  };
  const m = make(storage);
  assert.equal(await m.load(), false);
  m.increment('entries', 'a');
  assert.equal(await m.flush(), false);
  assert.equal(writes.length, 0, 'nothing written while the old data is unreadable');
  up = true;
  assert.equal(await m.flush(), true);
  assert.equal(JSON.parse(stored).entries.a.copies, 11);
  await m.close();
});
