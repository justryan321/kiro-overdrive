---
inclusion: manual
name: output-formats
description: Team templates for PR descriptions, commit messages, Jira comments, Teams updates, Confluence pages and standups, ready to paste.
---

# Output formats

Use these whenever I ask for one of these outputs, or when I type `#output-formats` followed by the format name. Other skills (`#standup`, `#handoff`, `#changelog`) use them too. Fill every section; write "None" rather than dropping a section. Don't invent ticket keys, names, numbers or links.

## Commit message
```
<type>(<scope>): <what changed, imperative, ≤ 60 chars>

<why, 1–3 lines. Mention the ticket if there is one: PROJ-123>
```
Types: `feat`, `fix`, `refactor`, `data` (pipeline or table logic), `docs`, `test`, `chore`.

## PR description
```markdown
## What
One or two sentences.

## Why
Ticket: PROJ-123. The problem this solves.

## How
- Key change 1 (`path/to/file`)
- Key change 2

## Data impact
Tables/views created, changed, or backfilled. Row-count or metric deltas checked. "None" if no data change.

## Testing
What was run and the result. Commands included.

## Risks and rollback
What could go wrong and how to undo it.
```

## Jira comment
Plain, short, and skimmable. Jira renders Markdown through the Atlassian MCP, but keep it simple.
```
Status: <In progress | Blocked | Ready for review | Done>
Done: <1–3 bullets>
Next: <1–2 bullets>
Blockers: <none, or who/what is needed>
Links: <PR, notebook, dashboard>
```

## Teams update
Teams chat supports only light formatting, so use bold labels and short lines, no headers or tables.
```
**<Topic>** — <one-line summary>
• <point>
• <point>
**Need:** <ask, or "nothing, FYI">
```

## Standup
```
**Yesterday:** <1–3 items, outcome-focused>
**Today:** <1–3 items>
**Blockers:** <none, or specific ask + who>
```

## Confluence page
```markdown
# <Title>
| Owner | Status | Last updated |
|---|---|---|
| <name> | Draft / Final | YYYY-MM-DD |

## Summary
Three sentences max. What, why, decision.

## Context
## Details
## Decisions
| Date | Decision | Why |
## Open questions
## Links
```

## Excel deliverables
- One table per sheet, starting at A1, formatted as an Excel Table with clear headers. No merged cells.
- Keep a `README` sheet: source, refresh date, filters applied, grain, owner.
- Formulas stay visible as formulas; don't paste values over them unless asked.
