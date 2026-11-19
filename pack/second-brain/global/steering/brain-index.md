---
inclusion: always
---

# Brain index (global)

This is the map of my knowledge. It loads every session, so keep it under about 2 KB. Details belong in topic files.

## About me
- Role: <your role, e.g. BI / data consultant>
- Main stack: <e.g. Databricks, SQL, Python, Excel>
- Working style: <e.g. show a plan before multi-file edits; terse summaries>

## Active projects
| Project | Repo / folder | Status |
|---|---|---|
| <name> | <path or repo> | active |

## Topic files (load with #name)
| When working on… | Load |
|---|---|
| <e.g. Databricks / SQL> | #<databricks-conventions> |
| <e.g. forecast accuracy> | #<forecast-metrics> |

If a task matches a row above, load that file before starting.

## Where to write
- Default: append new learnings to this workspace's `.kiro/steering/decisions-log.md` in the log's format.
- Never edit global steering (`%USERPROFILE%\.kiro\steering\`) unless I explicitly say "promote to global" or "add to my global brain".
- If this workspace has no `.kiro/steering/` folder, ask before creating one. Don't fall back to global.
- If multiple workspace roots are open, ask which project the note belongs to.
- Never rewrite or delete topic files outside `#brain-review` or `#brain-prune`.

## Brain routines
- `#brain-setup`: fill in or refresh these placeholders
- `#brain-new-project`: add a brain to a repo that doesn't have one
- `#brain-capture`: save learnings from this session to the log
- `#brain-review`: weekly triage and promote (interview)
- `#brain-prune`: monthly audit (interview)
