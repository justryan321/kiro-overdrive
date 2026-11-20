// Read-only server for the Kiro Overdrive directory.
// No dependencies: uses Node's built-in http module.
//   /src/*  -> src/      (front-end code and styles)
//   /*      -> public/   (index.html and data/*.json)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT || 8000);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// Resolve a URL path inside baseDir; return null if it escapes baseDir.
function resolveInside(baseDir, urlPath) {
  const file = path.resolve(baseDir, '.' + urlPath);
  return file === baseDir || file.startsWith(baseDir + path.sep) ? file : null;
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Read-only');

  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch { return send(res, 400, 'Bad request'); }
  if (urlPath === '/') urlPath = '/index.html';

  const file = urlPath.startsWith('/src/')
    ? resolveInside(SRC, urlPath.slice('/src'.length))
    : resolveInside(PUBLIC, urlPath);
  if (!file) return send(res, 404, 'Not found');

  try {
    const body = await readFile(file);
    send(res, 200, req.method === 'HEAD' ? undefined : body, TYPES[path.extname(file)] || 'application/octet-stream');
  } catch {
    send(res, 404, 'Not found');
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(`Kiro Overdrive on http://localhost:${PORT}`));
