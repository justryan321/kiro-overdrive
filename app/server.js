// Server for the Kiro Overdrive directory (Databricks Apps). No dependencies.
//   /src/*        -> src/      (front-end code and styles)
//   /api/metrics  -> GET  copy counts per entry and package
//   /api/track    -> POST one copy event (the only write path)
//   /*            -> public/   (index.html and data/*.json)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMetrics } from './metrics.js';
import { createStorage } from './storage.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const PUBLIC = path.join(ROOT, 'public');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const MAX_BODY_BYTES = 1024;
const RATE_LIMIT = { windowMs: 60_000, max: 60 }; // track requests per client per window

// Resolve a URL path inside baseDir; return null if it escapes baseDir.
function resolveInside(baseDir, urlPath) {
  const file = path.resolve(baseDir, '.' + urlPath);
  return file === baseDir || file.startsWith(baseDir + path.sep) ? file : null;
}

function send(res, status, body, type = 'text/plain; charset=utf-8', extra = {}) {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    ...extra,
  });
  res.end(body);
}

// The ids the directory knows about. /api/track only accepts these.
export async function loadValidIds(publicDir = PUBLIC) {
  const ids = async file => {
    try {
      const list = JSON.parse(await readFile(path.join(publicDir, 'data', file), 'utf8'));
      return new Set((Array.isArray(list) ? list : []).map(x => x && x.id).filter(id => typeof id === 'string'));
    } catch { return new Set(); }
  };
  return { entries: await ids('entries.json'), packages: await ids('packages.json') };
}

// Read a request body, refusing anything over maxBytes.
function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0; let done = false;
    req.on('data', c => {
      if (done) return;
      size += c.length;
      if (size > maxBytes) { done = true; reject(Object.assign(new Error('too large'), { status: 413 })); return; }
      chunks.push(c);
    });
    req.on('end', () => { if (!done) { done = true; resolve(Buffer.concat(chunks).toString('utf8')); } });
    req.on('error', err => { if (!done) { done = true; reject(err); } });
  });
}

// Behind the Databricks proxy the client address is in x-forwarded-for.
function clientKey(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || req.socket.remoteAddress || 'unknown';
}

function createRateLimiter({ windowMs, max }, now = Date.now) {
  const hits = new Map();
  return key => {
    const t = now();
    if (hits.size > 5000) for (const [k, v] of hits) if (t - v.start >= windowMs) hits.delete(k);
    const h = hits.get(key);
    if (!h || t - h.start >= windowMs) { hits.set(key, { start: t, n: 1 }); return true; }
    h.n += 1;
    return h.n <= max;
  };
}

export function createApp({ metrics, rateLimit = RATE_LIMIT, publicDir = PUBLIC, srcDir = SRC } = {}) {
  const allow = createRateLimiter(rateLimit);

  async function handleTrack(req, res) {
    if (!allow(clientKey(req))) return send(res, 429, 'Too many requests', undefined, { 'Retry-After': '60' });
    let body;
    try { body = await readBody(req, MAX_BODY_BYTES); }
    catch (err) { return send(res, err.status || 400, err.status === 413 ? 'Payload too large' : 'Bad request', undefined, { Connection: 'close' }); }
    let msg;
    try { msg = JSON.parse(body); } catch { return send(res, 400, 'Bad request'); }
    if (!msg || typeof msg !== 'object' || !metrics.increment(msg.kind, msg.id)) return send(res, 400, 'Unknown kind or id');
    res.writeHead(204, { 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end();
  }

  return createServer(async (req, res) => {
    let urlPath;
    try { urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
    catch { return send(res, 400, 'Bad request'); }

    if (urlPath === '/api/track') {
      if (req.method !== 'POST') return send(res, 405, 'Use POST', undefined, { Allow: 'POST' });
      return handleTrack(req, res);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Read-only');
    if (urlPath === '/api/metrics') {
      return send(res, 200, req.method === 'HEAD' ? undefined : JSON.stringify(metrics.snapshot()), TYPES['.json']);
    }
    if (urlPath.startsWith('/api/')) return send(res, 404, 'Not found');
    if (urlPath === '/') urlPath = '/index.html';

    const file = urlPath.startsWith('/src/')
      ? resolveInside(srcDir, urlPath.slice('/src'.length))
      : resolveInside(publicDir, urlPath);
    if (!file) return send(res, 404, 'Not found');

    try {
      const body = await readFile(file);
      send(res, 200, req.method === 'HEAD' ? undefined : body, TYPES[path.extname(file)] || 'application/octet-stream');
    } catch {
      send(res, 404, 'Not found');
    }
  });
}

// Start listening only when run directly (`node server.js`), not when imported by tests.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const PORT = Number(process.env.DATABRICKS_APP_PORT || process.env.PORT || 8000);
  const storage = createStorage(process.env, { root: ROOT });
  const metrics = createMetrics({ storage, validIds: await loadValidIds() });
  await metrics.load();
  const server = createApp({ metrics });
  server.listen(PORT, '0.0.0.0', () => console.log(`Kiro Overdrive on http://localhost:${PORT}`));

  // Save pending counts on shutdown (Databricks sends SIGTERM on redeploy).
  let stopping = false;
  const stop = async () => {
    if (stopping) return; stopping = true;
    server.close();
    const saved = await Promise.race([metrics.close(), new Promise(r => setTimeout(() => r(false), 8000))]);
    if (!saved) console.warn('metrics: some counts were not saved before shutdown');
    process.exit(0);
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}
