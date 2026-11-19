---
inclusion: manual
---

# #brain-prune: monthly audit

Run this when I type `#brain-prune`. Its job is to keep the brain small and true. Ask at most 10 questions.

## 1. Audit
Read `brain-index.md`, `project-brain.md`, and every topic file they reference. Flag:
- **Possibly stale:** rules that name tables, files, functions, versions or tools you can't find in this workspace anymore. Search the repo to check.
- **Unused:** rules that no recent log entry, commit or open file touches. Say plainly that you're guessing here.
- **Duplicates:** the same rule in more than one file, or in both the global and project brains.
- **Conflicts:** two rules that disagree.
- **Bloat:** an always-loaded file over about 2 KB, or a topic file over about 5 KB.
- **Finished projects:** rows in "Active projects" that look done.
- **Missing files:** index rows that point to topic files that don't exist.

## 2. Interview me in one batch
List the findings, numbered, each with a yes/no or pick-one question:
- "These 3 rules mention `stg_dc_ops`, which no longer exists. Delete them?"
- "Recipe site marked active. Archive it?"
- "`brain-index.md` is 2.4 KB. Here's a trimmed version. OK?"

## 3. Propose, then apply
- Show every change as a diff. Apply only after I approve.
- Deleting a rule is fine once I confirm. Don't soften it into an "old rule" note.
- To archive a project, move its row to an `## Archived` list at the bottom of the index, with one line per project.
- Global files change only with my explicit OK per item.
