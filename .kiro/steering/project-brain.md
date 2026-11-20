---
inclusion: always
---

# Project brain: Kiro Overdrive

This is the always-loaded summary of this repo. Keep it under about 2 KB, and put details in this repo's topic files.

## What this is
The team's Kiro setup: a pack of steering files, skills and hooks, plus a directory web app that shows teammates what each one does and how to install it.

## Stack and commands
- Stack: Node.js 20+ (no npm dependencies), plain ES-module front end, Databricks Apps
- Run locally: `npm run dev` (from `app/`), then http://localhost:8000
- Syntax check: `npm run check`; tests: `npm test`
- Sync pack text into the app: `npm run sync`; drift check: `npm run sync:check`

## Layout
- `app/`: the directory app (`server.js`, `src/` code and styles, `public/` page and data)
- `pack/`: the Kiro files themselves (steering, skills, hooks, second-brain, install)
- `docs/`: rollout guide for teammates
- `tools/`: `sync_entries.mjs`

## Databricks app
- App name: `kiro-overdrive` (used by `databricks apps` CLI commands)
- App ID: `5d8be03b-5bbe-48a6-991a-a77cf70f4402`
- Deploys from Git: `https://skx.ghe.com/skechers-dataeng/kiro-overdrive`, branch `main`
- Git source code path: `app` (no leading slash; `/app` fails the sparse checkout)

## Topic files (load with #name)
| When working on… | Load |
|---|---|
| add later | |

## Rules
- When you edit anything under `pack/`, run `npm run sync` (because the app embeds copies of those files).
- When you change `packages.json`, update `install.sh` and `install.ps1` to match (because the installers must stay in step with it).
- The directory is read-only and serves `app/public/data/*.json`; to change what it shows, edit the JSON (or `pack/` then sync) and redeploy (because there is no database behind it).
- The one write path is `POST /api/track`, which adds copy counts to `metrics.json` (Volume path in `METRICS_VOLUME_PATH`, see README). Never put counts in `public/data/`.

## Brain
- New learnings go to `.kiro/steering/decisions-log.md`. The hook does this after each spec task, or run `#brain-capture`.
- Run `#brain-review` weekly and `#brain-prune` monthly.
