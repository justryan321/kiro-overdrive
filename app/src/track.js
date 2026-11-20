// Fire-and-forget copy tracking. Never throws, never blocks a copy.
// Resolves true when the server accepted the event, false for any failure.
export function createTracker({ fetchFn = (...args) => fetch(...args), onTracked } = {}) {
  return function track(kind, id) {
    if (!kind || !id) return Promise.resolve(false);
    try {
      return Promise.resolve(fetchFn('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, id }),
        keepalive: true,
      })).then(res => {
        const ok = !!(res && res.ok);
        if (ok && onTracked) { try { onTracked(kind, id); } catch { /* UI hook must not affect tracking */ } }
        return ok;
      }).catch(() => false);
    } catch { return Promise.resolve(false); }
  };
}
