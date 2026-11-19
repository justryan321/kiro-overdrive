---
inclusion: manual
name: future-purge
description: "#future-purge: finds files nobody uses, parks them in future_purge/ for 14 days, restores anything that turns out to be used, and deletes what expired."
---

# #future-purge

Run this when I type `#future-purge`. Weekly is the right rhythm (Friday wrap is a good slot). Each run does three things in order: **expire → check → sweep**. Report first; move or delete nothing until I approve.

Sub-commands:
- `#future-purge`: full run (expire, check, sweep).
- `#future-purge status`: show the manifest only.
- `#future-purge restore <path>`: move one item back to its original path and drop it from the manifest.
- `#future-purge keep <path>`: restore it and add it to the keep list so it's never flagged again.

## The holding folder
- Parked files live in `future_purge/` at the repo root, mirroring their original paths (`src/etl/old_load.py` → `future_purge/src/etl/old_load.py`). Commit the folder so the whole team sees what's parked.
- `future_purge/MANIFEST.md` is the source of truth. One row per item:

| Original path | Parked on | Expires on | Reason | Parked by | Status |
|---|---|---|---|---|---|
| `src/etl/old_load.py` | 2026-11-20 | 2026-12-04 | No references, no commits in 140 days | Ryan | parked |

  `Status` is `parked`, `restored` or `deleted`. Keep restored and deleted rows for 30 days, then remove them.
- `future_purge/KEEP.md` lists paths or globs that must never be flagged (one per line, with a reason and who added it).
- Use `git mv` to park and restore so history follows the file.

## 1. Expire (items parked 14+ days)
For each `parked` row whose `Expires on` is today or earlier, look for evidence it was **used while parked**:
- It was modified, or someone moved it back (`git log --since=<parked on> -- <both paths>`).
- A file added or changed since the parked date references its name, module path, notebook path or table name (search the repo, excluding `future_purge/`).
- A job, bundle or CI definition references it (`databricks.yml`, `resources/**/*.yml`, `.github/workflows/`, `Makefile`).
- Someone reported a break: an import error, a `%run` failure or a missing-file error that names it, in recent commits, PR comments or the decisions log.

Then sort the expired items:
- **Used** → propose restore (step 4). Never delete these.
- **Unused** → propose deletion.

Show the delete list as a table (path, parked on, size, last commit, tracked in git yes/no) and ask **once** for the whole batch, per `no-surprises.md`. On yes, delete with `git rm` so it can still be recovered from history. **Untracked files** can't be recovered after deletion, so list them separately and ask for each one.

## 2. Check (items still within 14 days)
Run the same "used while parked" checks on every parked item. Anything that shows use → propose restoring it now, without waiting for it to expire. List the rest with days left.

## 3. Sweep (find new candidates)
Scan the repo, skipping everything in **Never flag** below.

| Kind | "Unused" means all of these are true |
|---|---|
| Python modules | Not imported anywhere, not an entry point, not in a job/bundle/CI/Makefile, no commits in 90+ days |
| Notebooks | Not targeted by `%run` or `dbutils.notebook.run`, not a job task, no commits in 90+ days |
| SQL files | Not called by a job or notebook, and the objects they create aren't read by anything in the repo |
| Data/output files (`.csv`, `.xlsx`, `.parquet`, `.json` exports) | Not read by any code, no commits in 60+ days |
| Docs | Not linked from any README or doc, and describes code that no longer exists |
| Scratch (`scratch*`, `tmp*`, `test_*.ipynb`, `Untitled*`, `copy of*`, `*_old*`, `*_v1*` with a later version) | No commits in 30+ days |

For SQL objects, offer an optional read-only check of Databricks lineage or query history (`system.access.table_lineage`, `system.query.history`, last 90 days, aggregates only). Run it only if I say yes.

Give every candidate a confidence level:
- **High:** every signal says unused.
- **Medium:** unused in the repo, but it could be used outside it (another repo, a dashboard, someone's Excel). Say which.

Only High candidates go in the default move list. Medium candidates are listed for me to decide.

**Never flag:** `.kiro/`, `.github/`, `future_purge/`, `README*`, `LICENSE*`, `CHANGELOG*`, config and lockfiles, `.gitignore`, `databricks.yml`, `resources/`, `tests/` and `test_*.py`, `__init__.py`, anything in `KEEP.md`, and any file with uncommitted changes.

## 4. Report
Start with a health line: "3 expired (2 delete, 1 restore), 4 still parked, 7 new candidates (5 high, 2 medium)".

Then three numbered sections:
1. **Delete:** expired and unused.
2. **Restore:** used while parked, with the evidence for each.
3. **Park:** new candidates with their reason and confidence.

Wait for approval by number, for example "delete all, restore 2, park 1-5".

## 5. Apply
- Work on a branch named `chore/future-purge-YYYY-MM-DD`.
- Park: run `git mv` into `future_purge/`, add a manifest row with Expires on = today + 14 days.
- Restore: run `git mv` back and set the row to `restored`.
- Delete: run `git rm` and set the row to `deleted`.
- Update `future_purge/MANIFEST.md`, then draft a commit message and a short PR summary that lists every move, with a line telling teammates how to restore something: `#future-purge restore <path>`. Don't commit or push unless I ask.

Moving a file that turns out to be used will break the import, job or notebook that needs it. That's intended: it's how parking finds hidden use. When a break names a parked file, restore it right away and add it to `KEEP.md` if it's essential.
