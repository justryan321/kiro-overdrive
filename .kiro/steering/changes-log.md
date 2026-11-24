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
- 2026-11-24 | app | Removed the Recommended star from Explain Mode, Steering Doctor, Databricks Setup, Atlassian Setup, SQL Review and Standard File Header; Guardian, Changelog and Docs, and Second Brain stay recommended (because the team asked to narrow the recommended set) | chat
- 2026-11-24 | pack | Guardian now hard-blocks: added `scripts/guardian.py` (Python 3.8+, no packages) and `guardian-scan.json` hooks (PreToolUse and PostToolUse on all tools, Stop, PostTaskExecution, SessionStart), plus a git pre-commit secret scan the installers add. Blocks secrets in any tool input, opening secret files, catastrophic or hook-skipping shell commands, and commits/pushes with secrets. Added "Guardian scanner" and "Untrusted content" sections to `no-surprises.md` (because agent-type hooks can't block a tool call, and secrets had no commit-time check) | chat
- 2026-11-24 | pack | Added Atlassian Setup (`/atlassian-setup`, Intermediate): Rovo MCP v2 with OAuth in the user-level `mcp.json`, read-only test, read tools only in autoApprove; skills that need Jira now point to it (because four skills needed Atlassian MCP and nothing explained how to connect it) | chat
- 2026-11-24 | pack | Added Brief Mode (`#brief-mode`), a personal steering file in `all` and an add-on for Intermediate and Advanced (because power users wanted short, answer-first replies) | chat
- 2026-11-24 | pack | `/databricks-setup` now downloads the uv installer before running it instead of piping it into a shell (because Guardian blocks pipe-to-shell) | chat
- 2026-11-24 | app | Install commands write `python` instead of `python3` into Guardian's hooks on Windows and add a `postInstall` step (Guardian's git hook); `sync_entries.mjs` now syncs `.py` files (because Guardian ships a script) | chat
- 2026-11-23 | pack | Added the Databricks Setup kit (`/databricks-setup` skill and a `.sql` save nudge hook) to the Intermediate package, plus installer and README updates (because teammates need a guided Dev Kit install, OAuth sign-in and SQL-from-chat setup) | chat
- 2026-11-19 | deploy | Removed all Databricks Apps hosting: deleted `app/app.yaml`, the README deploy section and the project-brain app ID/Git deploy details, and dropped `DATABRICKS_APP_PORT` from `server.js` (because the app will only run locally, not on Databricks Apps) | chat
- 2026-11-19 | app | Removed copy-count tracking, the "Most popular" sort and the "N copies" badges, and the metrics files, tests and docs that went with them (because the team no longer needs download/adoption tracking) | chat
- 2026-11-19 | app | Added copy-count tracking (`POST /api/track`, `GET /api/metrics`, `metrics.json` in a Unity Catalog Volume), a "Most popular" sort and "N copies" badges (because we want to see which entries teammates actually use). Volume path is still a placeholder in `app.yaml` | chat
- 2026-11-19 | app | Added first-visit tutorial overlay with Skip button and a Tour button to replay it (because new teammates need a quick orientation) | chat

- 2026-11-19 | steering | Added this changes log (because the team wants a running record of changes) | chat
- 2026-11-19 | steering | Created decisions-log.md for brain capture | Create decisions-log.md
- 2026-11-19 | pack | Removed ticket-to-spec from the intermediate package | remove tickets to spec from intermediate package
- 2026-11-19 | repo | Initial project creation | initial project creation
- 2026-11-19 | deploy | GHE Pages hosting: relative asset/data paths, iframe-safe copy fallback, `npm run build` writes the site into `docs/` for Pages (main, /docs); removed `npm run deploy`, `tools/deploy_pages.mjs` and `.github/workflows/pages.yml` (because deploys go through GitHub Desktop and there are no Actions runners) | chat
- 2026-11-19 | deploy | Repointed hosting from GHE (skx.ghe.com/skechers-dataeng) to personal GitHub (github.com/justryan321/kiro-overdrive, Pages at justryan321.github.io/kiro-overdrive); updated README and project brain; dropped the Confluence page generator (because it's a personal project) | chat
