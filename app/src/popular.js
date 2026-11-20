// Helpers for the "Most popular" sort and copy-count badges.
// metrics looks like { entries: { "<id>": { copies: N } }, packages: { ... } } or null.
export const copiesOf = (metrics, kind, id) => {
  const n = metrics && metrics[kind] && metrics[kind][id] && metrics[kind][id].copies;
  return Number.isFinite(n) && n > 0 ? n : 0;
};

// True when there is at least one count to show. Otherwise the sort and badges stay hidden.
export function hasMetrics(metrics) {
  if (!metrics || typeof metrics !== 'object') return false;
  return ['entries', 'packages'].some(k => metrics[k] && Object.values(metrics[k]).some(v => v && v.copies > 0));
}

export const copiesLabel = n => `${n} ${n === 1 ? 'copy' : 'copies'}`;

// Comparator for entries: most copies first. Ties keep the existing order
// (recommended first, then whatever order the list already had).
export const byPopular = metrics => (a, b) =>
  (copiesOf(metrics, 'entries', b.id) - copiesOf(metrics, 'entries', a.id)) ||
  ((b.recommended ? 1 : 0) - (a.recommended ? 1 : 0));

// Add one copy to a metrics object in place (used to update the page after a tracked copy).
export function bump(metrics, kind, id) {
  if (!metrics || !metrics[kind]) return;
  const cur = metrics[kind][id];
  metrics[kind][id] = { copies: (cur && cur.copies > 0 ? cur.copies : 0) + 1 };
}
