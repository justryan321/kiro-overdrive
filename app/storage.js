// Chooses where metrics.json is kept.
//   METRICS_VOLUME_PATH set to a real /Volumes/... path -> Unity Catalog Volume (Files API 2.0)
//   unset, or still the "<catalog>" placeholder         -> local file (ephemeral on Databricks)
//
// The Volume adapter signs in as the app's own service principal. Databricks Apps injects
// DATABRICKS_HOST, DATABRICKS_CLIENT_ID and DATABRICKS_CLIENT_SECRET, so nothing is configured
// by hand. The service principal needs READ VOLUME and WRITE VOLUME on the Volume.
// Secrets and tokens are never logged.
import path from 'node:path';
import { createFileStorage } from './metrics.js';

export function isPlaceholder(p) { return !p || /[<>]/.test(p); }

const REFRESH_MARGIN_MS = 60_000;

function hostUrl(host) {
  const h = String(host || '').trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(h) ? h : `https://${h}`;
}

// Encode each path segment, keep the slashes.
const encodePath = p => p.split('/').map(encodeURIComponent).join('/');

export function createVolumeStorage({
  volumePath, host, clientId, clientSecret,
  fetchFn = (...a) => fetch(...a), now = Date.now, timeoutMs = 10_000,
}) {
  if (!/^\/Volumes\/[^/]+\/[^/]+\/[^/]+\/.*[^/]$/.test(volumePath) || volumePath.split('/').includes('..')) {
    throw new Error('METRICS_VOLUME_PATH must look like /Volumes/<catalog>/<schema>/<volume>/<folder>/metrics.json');
  }
  const base = hostUrl(host);
  const dir = volumePath.slice(0, volumePath.lastIndexOf('/'));
  let token = null; let expiresAt = 0; let dirReady = false;

  async function getToken(force) {
    if (!force && token && now() < expiresAt - REFRESH_MARGIN_MS) return token;
    const res = await fetchFn(`${base}/oidc/v1/token`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=all-apis',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`token request failed (HTTP ${res.status})`);
    const json = await res.json();
    if (!json || typeof json.access_token !== 'string') throw new Error('token response had no access_token');
    token = json.access_token;
    expiresAt = now() + (Number(json.expires_in) > 0 ? Number(json.expires_in) : 3600) * 1000;
    return token;
  }

  // One request; if the token was rejected, get a fresh one and try once more.
  async function call(method, url, body, contentType) {
    for (let attempt = 0; ; attempt++) {
      const res = await fetchFn(base + url, {
        method,
        headers: { Authorization: `Bearer ${await getToken(attempt > 0)}`, ...(contentType ? { 'Content-Type': contentType } : {}) },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 401 && attempt === 0) { token = null; continue; }
      return res;
    }
  }

  async function put(file, text) {
    if (!dirReady) {
      const d = await call('PUT', `/api/2.0/fs/directories${encodePath(dir)}`);
      if (!d.ok) throw new Error(`create folder failed (HTTP ${d.status})`);
      dirReady = true;
    }
    const res = await call('PUT', `/api/2.0/fs/files${encodePath(file)}?overwrite=true`, text, 'application/octet-stream');
    if (!res.ok) throw new Error(`write failed (HTTP ${res.status})`);
  }

  return {
    label: volumePath,
    async read() {
      const res = await call('GET', `/api/2.0/fs/files${encodePath(volumePath)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`read failed (HTTP ${res.status})`);
      return res.text();
    },
    write: text => put(volumePath, text),
    backup: text => put(`${volumePath}.corrupt-${now()}`, text),
  };
}

export function createStorage(env = process.env, { root, log = console, fetchFn } = {}) {
  const volumePath = (env.METRICS_VOLUME_PATH || '').trim();
  const local = () => {
    const file = env.METRICS_FILE || path.join(root, 'data', 'metrics.json');
    return createFileStorage(file);
  };
  if (isPlaceholder(volumePath)) {
    const s = local();
    log.warn(`metrics: METRICS_VOLUME_PATH is ${volumePath ? 'still the placeholder' : 'not set'}; using local file ${s.label}. ` +
      'Counts are lost when the app redeploys or restarts. Set a Unity Catalog Volume path in app.yaml to keep them.');
    return s;
  }
  const { DATABRICKS_HOST: host, DATABRICKS_CLIENT_ID: clientId, DATABRICKS_CLIENT_SECRET: clientSecret } = env;
  if (!host || !clientId || !clientSecret) {
    const s = local();
    log.error(`metrics: METRICS_VOLUME_PATH is set but DATABRICKS_HOST, DATABRICKS_CLIENT_ID or DATABRICKS_CLIENT_SECRET is missing; using local file ${s.label} instead.`);
    return s;
  }
  try {
    return createVolumeStorage({ volumePath, host, clientId, clientSecret, fetchFn });
  } catch (err) {
    const s = local();
    log.error(`metrics: ${err.message}; using local file ${s.label} instead.`);
    return s;
  }
}
