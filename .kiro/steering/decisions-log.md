---
inclusion: manual
---

# Decisions log (inbox)

This is raw capture, not guidance. The agent doesn't follow these entries as rules. `#brain-review` promotes or drops them weekly and removes processed entries.

Format: `- YYYY-MM-DD | type | note (because …) | source`
- type: `decision` · `convention` · `gotcha` · `definition`
- source: spec/task name, file, or "chat"

Append only. Never edit or reorder existing lines outside `#brain-review`.

## Entries
- 2026-11-19 | decision | Copy counts (entries and packages, totals only) are saved as `metrics.json` through `POST /api/track` and `GET /api/metrics`; storage is a Unity Catalog Volume via Files API 2.0 as the app's service principal, with a local-file fallback (because the Apps disk is wiped on redeploy and the team wanted a JSON data file, not a database) | adoption tracking spec
- 2026-11-19 | decision | OPEN ITEM: waiting on Volume approval and path. `METRICS_VOLUME_PATH` in `app/app.yaml` is still the `<catalog>` placeholder, so counts reset on every redeploy. Once approved: set the path, grant the app's service principal READ VOLUME and WRITE VOLUME, redeploy | adoption tracking spec
- 2026-11-19 | gotcha | Files API 3.0 is Beta and needs a regional storage hostname, so the app uses 2.0 on the workspace host (because 2.0 is stable and needs no extra network setup) | adoption tracking spec
