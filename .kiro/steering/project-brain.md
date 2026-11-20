---
inclusion: always
---

# Project brain: Kiro Overdrive

This is the always-loaded summary of this repo. Keep it under about 2 KB, and put details in this repo's topic files.

## What this is
The team's Kiro setup: a pack of steering files, skills and hooks, plus a directory web app that shows teammates what each one does and how to install it.

## Stack and commands
- Stack: Node.js 20+ (no npm dependencies), plain ES-module front end, run locally
- Run locally: `npm run dev` (from `app/`), then http://localhost:8000
- Syntax check: `npm run check`
- Sync pack text into the app: `npm run sync`; drift check: `npm run sync:check`

## Layout
- `app/`: the directory app (`server.js`, `src/` code and styles, `public/` page and data)
- `pack/`: the Kiro files themselves (steering, skills, hooks, second-brain, install)
- `docs/`: rollout guide for teammates
- `tools/`: `sync_entries.mjs`

## Topic files (load with #name)
| When working on… | Load |
|---|---|
| add later | |

## Rules
- When you edit anything under `pack/`, run `npm run sync` (because the app embeds copies of those files).
- When you change `packages.json`, update `install.sh` and `install.ps1` to match (because the installers must stay in step with it).
- The directory app is read-only and serves `app/public/data/*.json`; to change what it shows, edit the JSON (or `pack/` then sync) and refresh the page (because there is no database behind it).

## Brain
- New learnings go to `.kiro/steering/decisions-log.md`. The hook does this after each spec task, or run `#brain-capture`.
- Run `#brain-review` weekly and `#brain-prune` monthly.
