// Copy-action counters for the Kiro Overdrive directory. No dependencies.
//
// Counts live in memory (this app runs as a single instance) and are written
// to a storage adapter as one JSON document:
//   { "version": 1, "updatedAt": <ms>,
//     "entries":  { "<id>": { "copies": N } },
//     "packages": { "<id>": { "copies": N } } }
//
// A storage adapter is { read(): Promise<string|null>, write(text): Promise<void> }.
// read() returns null when the file does not exist and throws on any other error.
// Because we always write the full in-memory state, a failed write is retried
// with exponential backoff and nothing is lost while the store is unreachable.
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const KINDS = ['entries', 'packages'];

export function createFileStorage(file) {
  return {
    label: file,
    async read() {
      try { return await readFile(file, 'utf8'); }
      catch (err) { if (err && err.code === 'ENOENT') return null; throw err; }
    },
    async write(text) {
      await mkdir(path.dirname(file), { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      await writeFile(tmp, text, 'utf8');
      await rename(tmp, file); // atomic replace
    },
    // Keep an unreadable file instead of silently overwriting it.
    async backup(text) { await writeFile(`${file}.corrupt-${Date.now()}`, text, 'utf8'); },
  };
}

const isCount = n => Number.isSafeInteger(n) && n >= 0;

// Pull counts out of a parsed document, ignoring anything malformed.
function parseDoc(doc) {
  const out = { entries: {}, packages: {} };
  if (!doc || typeof doc !== 'object') return out;
  for (const kind of KINDS) {
    const src = doc[kind];
    if (!src || typeof src !== 'object') continue;
    for (const [id, v] of Object.entries(src)) if (v && isCount(v.copies) && v.copies > 0) out[kind][id] = v.copies;
  }
  return out;
}

export function createMetrics({
  storage,
  validIds = { entries: new Set(), packages: new Set() },
  flushDelayMs = 2000,
  retryBaseMs = 1000,
  retryMaxMs = 5 * 60 * 1000,
  now = Date.now,
  log = console,
} = {}) {
  const counts = { entries: Object.create(null), packages: Object.create(null) };
  let loaded = false;
  let dirty = false;
  let version = 0;        // bumped on every increment
  let flushing = null;    // promise of the write in flight
  let timer = null;
  let failures = 0;
  let closed = false;

  const schedule = ms => {
    if (closed || timer) return;
    timer = setTimeout(() => { timer = null; run().catch(() => {}); }, ms);
    if (timer.unref) timer.unref();
  };
  const backoff = () => Math.min(retryMaxMs, retryBaseMs * 2 ** Math.max(0, failures - 1));

  function snapshot() {
    const doc = { version: 1, updatedAt: now(), entries: {}, packages: {} };
    for (const kind of KINDS) for (const [id, n] of Object.entries(counts[kind])) doc[kind][id] = { copies: n };
    return doc;
  }

  // Add whatever the store holds to what we already counted. Safe to call late:
  // increments that arrived while the store was unreachable are kept, not replaced.
  async function load() {
    if (loaded) return true;
    let text;
    try { text = await storage.read(); }
    catch (err) {
      failures += 1;
      log.warn(`metrics: could not read ${storage.label || 'storage'} (${err.message}); retrying`);
      schedule(backoff());
      return false;
    }
    if (text != null) {
      let parsed = null;
      try { parsed = JSON.parse(text); } catch { /* handled below */ }
      if (parsed == null || typeof parsed !== 'object') {
        log.warn('metrics: stored file is not valid JSON; starting from zero and keeping a copy');
        try { if (storage.backup) await storage.backup(text); } catch { /* best effort */ }
      } else {
        const stored = parseDoc(parsed);
        for (const kind of KINDS) for (const [id, n] of Object.entries(stored[kind])) counts[kind][id] = (counts[kind][id] || 0) + n;
      }
    }
    loaded = true; failures = 0;
    if (dirty) schedule(0);
    return true;
  }

  function increment(kind, id) {
    if (!KINDS.includes(kind) || typeof id !== 'string') return false;
    const ids = validIds[kind];
    if (!ids || !ids.has(id)) return false;
    counts[kind][id] = (counts[kind][id] || 0) + 1;
    dirty = true; version += 1;
    schedule(loaded ? flushDelayMs : backoff());
    return true;
  }

  async function run() {
    if (flushing) return flushing;
    if (!loaded && !(await load())) return false;  // never overwrite what we could not read
    if (!dirty) return true;
    const sent = version;
    flushing = (async () => {
      try {
        await storage.write(JSON.stringify(snapshot(), null, 2) + '\n');
        failures = 0;
        if (sent === version) dirty = false; else schedule(flushDelayMs);
        return true;
      } catch (err) {
        failures += 1;
        log.warn(`metrics: write to ${storage.label || 'storage'} failed (${err.message}); retry in ${Math.round(backoff() / 1000)}s`);
        schedule(backoff());
        return false;
      } finally { flushing = null; }
    })();
    return flushing;
  }

  // Write now (used by tests and shutdown). Resolves true when everything is saved.
  async function flush() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (flushing) await flushing;
    return run();
  }

  async function close() {
    const ok = await flush();
    closed = true;
    if (timer) { clearTimeout(timer); timer = null; }
    return ok;
  }

  return { load, increment, snapshot, flush, close, get pending() { return dirty; } };
}
