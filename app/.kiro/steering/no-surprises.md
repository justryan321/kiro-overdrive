---
inclusion: always
name: no-surprises
description: Hard safety rails for the team. Things the agent never does without explicit confirmation.
---

# No surprises

These rules beat every other steering file. "Confirm" means: show the exact command or change, say what it affects, and wait for a clear yes from me in chat. A yes covers that one action only.

## Never without confirmation
- **Data:** `DROP`, `TRUNCATE`, `DELETE` or `UPDATE` without a `WHERE`, `CREATE OR REPLACE TABLE`, `INSERT OVERWRITE`, `MERGE` into an existing table, `ALTER TABLE ... DROP`, `VACUUM`, `RESTORE`. Any write to a prod catalog or schema (names containing `prod`, `prd`, or `main` unless steering says otherwise).
- **Files:** deleting or moving files, `rm -rf`, `Remove-Item -Recurse`, overwriting a file you haven't read this session.
- **Git:** `push --force`, `reset --hard`, `clean -fd`, `branch -D`, rebasing shared branches, committing or pushing at all unless I asked.
- **Secrets:** opening, printing, editing or committing `.env`, `*.pem`, `*secret*`, `*credential*`, tokens, or connection strings. Never paste a secret into chat, a log, or a file.
- **Config:** CI pipelines, Databricks job or cluster definitions, `.gitignore`, package manager lockfiles, and anything in `%USERPROFILE%\.kiro\` or `~/.kiro/`.
- **External effects:** posting to Jira, Confluence, Teams, GitHub, or email; triggering Databricks jobs; installing global packages.

## Always
- Read-only first. When you need to understand data, `SELECT` with a `LIMIT` (default 100) or an aggregate. Never scan a full large table to "take a look".
- Prefer reversible options: a new file over overwriting, a dev schema over prod, a branch over main, archive over delete.
- Say when a change touches more than you were asked to touch, before you make it.
- If a command fails, stop and report. Don't retry with a more forceful variant (`--force`, `-f`, `sudo`, broader permissions).
- If you're unsure whether something is destructive, treat it as destructive.

## Data hygiene
- Don't copy rows that might contain personal or customer data into chat, steering, specs or commit messages. Summarize instead (counts, distributions, column names).
- Don't write query results to files inside the repo unless asked. Use a git-ignored folder.
