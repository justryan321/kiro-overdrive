# Kiro Overdrive: install reference

A steering, skills and hooks pack that makes Kiro safer, more consistent and faster for the whole team. New here? Start with [`docs/MIGRATION.md`](../../docs/MIGRATION.md).

## Packages

Packages are cumulative: each one includes everything in the one before it.

| Package | Adds | Total |
|---|---|---|
| `starter` | Guardian (`no-surprises.md` + `destructive-guard.json`), `onboard-me.md`, `file-header-on-create.json`, `standup.md`, Changelog and Docs (`changelog.md` + `docs-reminder-on-stop.json`) | 5 items, 7 files |
| `intermediate` | SQL Review (`sql-review.md` + `sql-check-on-save.json`), Second Brain, Databricks Setup (`databricks-setup.md` + `databricks-setup-nudge.json`) | 8 items |
| `advanced` | `output-formats.md`, `steering-doctor.md`, `handoff.md`, `metric-align.md`, `future-purge.md` | 13 items |
| `all` (default) | Advanced + personal files: `explain-mode.md`, `claude-code-style.md`, `codex-style.md` | 16 items |

The Kiro Overdrive directory app shows the same packages with a reason for each item, and an install command for each package.

## What's in the pack

### Steering (rules)
| File | Loads | What it does |
|---|---|---|
| `steering/no-surprises.md` | always | Hard safety rails: no destructive SQL, file, git or prod actions, no secrets, nothing posted without a yes. Beats every other file. |
| `steering/output-formats.md` | `#output-formats` | Paste-ready templates: commits, PRs, Jira comments, Teams updates, Confluence pages, standups, Excel. |
| `steering/explain-mode.md` | `#explain-mode` | Teaching mode: plan and why before each change, plain-English explanation after. Personal. |
| `steering/claude-code-style.md`, `codex-style.md` | manual | Agent personalities. Personal; load one at a time. |

### Skills (type `#name` in chat)
| Skill | What it does | Needs |
|---|---|---|
| `#standup` | Three-line standup from your commits, decisions log, specs and Jira. | git; Atlassian MCP optional |
| `#ticket-to-spec PROJ-123` | Jira issue → Kiro spec, each requirement traced to an acceptance criterion. | Atlassian MCP |
| `#sql-review` | Correctness-first SQL review with rewrites and read-only verification queries. | none |
| `#handoff` | State-of-the-work doc before PTO or reassignment. | git; Atlassian MCP optional |
| `#onboard-me` | Interactive repo tour for new teammates. | none |
| `/databricks-setup` (or `#databricks-setup`) | Installs the Databricks AI Dev Kit, signs you in with OAuth, connects the Databricks MCP server and runs a test SQL file from chat. Shows every command and waits for your OK. | Databricks workspace access; git; the walkthrough installs the CLI and `uv` if missing |
| `#changelog` | Merged PRs → plain-English `CHANGELOG.md` section + Teams post. | git; `gh` optional |
| `#steering-doctor` | Audits steering and hooks for conflicts, bloat and stale references. | none |
| `#metric-align <metric>` | Finds every definition of a metric across repos, Databricks, Confluence and Excel, and shows where they disagree. | `.kiro/metric-sources.md`; MCPs and `gh` optional |
| `#future-purge` | Parks unused files for 14 days, restores anything used, deletes what expired, only with your approval. | git |

### Hooks (automatic)
| File | Trigger | What it does |
|---|---|---|
| `hooks/destructive-guard.json` | Pre Tool Use (shell, MCP SQL tools) | Stops before destructive commands or SQL writes and asks you. |
| `hooks/sql-check-on-save.json` | File save, `*.sql` | Quick high-severity SQL check; silent when clean. |
| `hooks/databricks-setup-nudge.json` | File save, `*.sql` | If Databricks isn't set up for Kiro, suggests `/databricks-setup`; silent otherwise. |
| `hooks/file-header-on-create.json` | File create, `*.py`, `*.sql`, `*.ipynb` | Adds the team header (purpose, owner, inputs, outputs, ticket). |
| `hooks/docs-reminder-on-stop.json` | Agent stop | Flags docs the changes made stale; suggests `#changelog` after a merge. |

File hooks fire on the agent's edits, not on your own edits in the editor.

### Second brain
Your global brain (`brain-index.md` plus five `#brain-*` routines) and a brain per repo (`project-brain.md`, `decisions-log.md`, and a capture hook). See [`second-brain/README.md`](../second-brain/README.md).

## Installer options

**Windows:** `.\install\install.ps1 -Repo <path> [-Package starter|intermediate|advanced|all] [-Personal] [-Force] [-DryRun]`
**macOS/Linux:** `./install/install.sh --repo <path> [--package …] [--personal] [--force] [--dry-run]`

| Option | Effect |
|---|---|
| `-Repo` / `--repo` | Required. The repo to install into (`<repo>/.kiro/`). |
| `-Package` / `--package` | `starter`, `intermediate`, `advanced` or `all` (default). |
| `-Personal` / `--personal` | Also install the personal files into your global folder. Automatic with `all`. |
| `-Force` / `--force` | Overwrite pack files that already exist. Brain notes are still kept. |
| `-DryRun` / `--dry-run` | List what would be added, skipped or kept, and write nothing. |

Where files go:
- Repo files → `<repo>/.kiro/steering/` and `<repo>/.kiro/hooks/`. Commit these.
- Global brain and personal files → `%USERPROFILE%\.kiro\steering\` (Windows) or `~/.kiro/steering/` (macOS/Linux). These stay personal.

## After installing
1. Open the repo in Kiro and check that the Hooks panel lists the new hooks.
2. From Intermediate up, type `#brain-setup` in a new chat.
3. Type `#steering-doctor` once to confirm everything parsed and nothing conflicts.
4. Commit `<repo>/.kiro/` so teammates get the pack on their next pull. New teammates then just type `#onboard-me`.
5. Optional: type `#metric-align` once to create `.kiro/metric-sources.md` (the repos, catalogs, Confluence spaces and Excel folders it searches), and commit it.

## Routines
- **Weekly (Friday):** `#future-purge`. Kiro has no scheduler, so the 14-day expiry is enforced the next time someone runs it; a weekly run keeps parked files from lingering much past 14 days.
- **Before publishing a number** or when two reports disagree: `#metric-align <metric>`.

## Troubleshooting
- **A hook doesn't appear or never fires.** Trigger names have changed across Kiro versions. These files use `PreToolUse`, `PostFileSave`, `PostFileCreate`, `Stop` and `PostTaskExecution`. If your version rejects one, ask Kiro to "create a hook from `.kiro/hooks/<file>.json`" and it will rewrite it in the format your version expects. `#steering-doctor` flags hook files that don't parse.
- **The MCP SQL guard never fires.** Its matcher looks for MCP tool IDs containing sql, statement, query or execute. Ask Kiro for your Databricks MCP server's tool names and adjust the `matcher`.
- **`/databricks-setup` keeps getting suggested.** The hook looks for a profile in `~/.databrickscfg` and a `databricks` server in `.kiro/settings/mcp.json` (project or `~/.kiro/`). Finish `/databricks-setup`, or set the hook's `"enabled": false`.
- **Too chatty.** Set `"enabled": false` on a hook rather than deleting it.
- **Custom agents ignore all this.** Add `"resources": ["file://.kiro/steering/**/*.md"]` to the agent config.
- **Something broke after `#future-purge`.** That file was used after all. Type `#future-purge restore <path>`, and `#future-purge keep <path>` if it should never be flagged again.

## Keep it small
Always-on files load into every request: `no-surprises.md` (~2 KB) and, from Intermediate up, `brain-index.md` and `project-brain.md` (~2 KB each). Keep the total under about 8 KB; `#steering-doctor` warns when you go over.
