---
inclusion: manual
name: steering-doctor
description: "#steering-doctor: audits every steering file and hook (workspace and global) for broken front matter, conflicts, bloat and stale references."
---

# #steering-doctor

Run this when I type `#steering-doctor`. Monthly, or whenever the agent seems to ignore a rule. Report first; change nothing until I approve.

## 1. Inventory
Read everything in:
- Workspace: `.kiro/steering/**/*.md`, `.kiro/hooks/*.json`, `AGENTS.md`
- Global: `%USERPROFILE%\.kiro\steering\` and `%USERPROFILE%\.kiro\hooks\` (macOS/Linux: `~/.kiro/...`)

Make a table: file, scope (workspace / global), inclusion (`always` / `manual` / `fileMatch` + pattern), size in KB.

## 2. Checks
**Broken**
- Front matter missing, malformed, or with an unknown `inclusion` value. `fileMatch` without `fileMatchPattern`, or a pattern that matches no files in this repo.
- Hook JSON that doesn't parse, lacks `version`/`hooks`/`name`/`trigger`/`action`, or has an `agent` action without `prompt` or a `command` action without `command`.
- Custom agent configs missing `"resources": ["file://.kiro/steering/**/*.md"]`.

**Conflicts**
- Two `always` files that contradict each other (for example `claude-code-style` and `codex-style` both set to `always`).
- A workspace file and a global file with the same name or rule but different content (workspace wins: tell me which global line is shadowed).
- Rules that contradict `no-surprises.md`. `no-surprises.md` always wins.

**Bloat**
- Total size of all `always` files. Warn above 8 KB; that's loaded into every request.
- `brain-index.md` or `project-brain.md` above about 2 KB.
- Duplicate rules across files. Rules that restate defaults the agent already follows.

**Stale**
- Paths, commands, scripts, table names and people mentioned in steering that no longer exist. Check each one against the repo (search; for commands, check the scripts or Makefile define them). Don't run them.
- Topic files nobody references, and decisions-log entries older than 30 days that haven't been reviewed (suggest `#brain-review`).

**Hooks**
- Matchers that are too broad (blank, `.*`) on frequent triggers like file save or tool use.
- Two hooks on the same trigger and matcher that could fight.

## 3. Report
- Health line: "12 files, 6.1 KB always-on, 2 broken, 1 conflict, 4 stale".
- A numbered list by severity: Broken → Conflicts → Stale → Bloat, each with file, line, problem, and proposed fix.
- Proposed edits as diffs grouped by file.

## 4. Apply
Only after I approve by number. Never edit global files without an explicit OK for each one. For a shared repo, put workspace changes on a branch named `steering/doctor-YYYY-MM-DD` and draft a PR summary.
