---
inclusion: manual
---

# Changes log

A running record of what we've changed in this repo. Newest entries go at the top of the Entries section. Load with `#changes-log`.

Format: `- YYYY-MM-DD | area | what changed (because …) | ref`
- area: `pack` · `app` · `docs` · `tools` · `steering` · `deploy`
- ref: commit hash, PR number, or "chat"

When you finish a change, add one line. Keep it to what changed and why. Don't edit old lines.

## Entries
- 2026-11-19 | app | Added copy-count tracking (`POST /api/track`, `GET /api/metrics`, `metrics.json` in a Unity Catalog Volume), a "Most popular" sort and "N copies" badges (because we want to see which entries teammates actually use). Volume path is still a placeholder in `app.yaml` | chat
- 2026-11-19 | app | Added first-visit tutorial overlay with Skip button and a Tour button to replay it (because new teammates need a quick orientation) | chat

- 2026-11-19 | steering | Added this changes log (because the team wants a running record of changes) | chat
- 2026-11-19 | steering | Created decisions-log.md for brain capture | Create decisions-log.md
- 2026-11-19 | pack | Removed ticket-to-spec from the intermediate package | remove tickets to spec from intermediate package
- 2026-11-19 | repo | Initial project creation | initial project creation
