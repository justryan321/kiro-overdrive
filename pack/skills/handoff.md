---
inclusion: manual
name: handoff
description: "#handoff: before PTO or reassignment, writes a state-of-the-work doc from branches, uncommitted changes, specs, the decisions log and Jira."
---

# #handoff

Run this when I type `#handoff`, optionally with who it's for and when I'm back (`#handoff for Priya, back Dec 2`).

## 1. Gather (read-only, in parallel)
- **Git:** current branch; local branches not merged into the default branch, with last commit date and message; unpushed commits; uncommitted changes (`git status --short`, `git stash list`).
- **Specs:** every `.kiro/specs/*/tasks.md` with unchecked tasks: what's done, what's next.
- **Code notes:** `TODO`, `FIXME`, `HACK` comments in files changed in the last 30 days.
- **Decisions log:** entries from the last 30 days in `.kiro/steering/decisions-log.md`.
- **Jira (Atlassian MCP, if connected):** my open issues, with status and the last comment.
- **Running things:** Databricks jobs or scheduled pipelines this repo defines (job configs, bundle files), so the reader knows what runs while I'm away.

## 2. Interview me, briefly
Ask at most five questions, in one batch, about what the files can't tell you: what's half-finished and why, what's risky, who to ask about what, and anything that must not be touched.

## 3. Write
Create `docs/handoff/YYYY-MM-DD-<my-name>.md` (ask before creating the folder) with:

```markdown
# Handoff: <my name> → <recipient>, <dates>

## TL;DR
Three bullets: the most important things to know.

## Work in flight
| Item | Ticket | Branch / spec | State | Next step |

## Don't touch / watch out
## Running while I'm away
Jobs, schedules, alerts, and what to do if they fail.
## Decisions made recently
## Who to ask
| Topic | Person |
## How to pick it up
Exact commands to get the branch running and the checks green.
```

## 4. Hand back
- Show me the doc and the list of anything uncommitted or unpushed: work that's only on my machine is at risk.
- Offer: commit it on a branch; a Confluence version; a short Teams note (bold labels and short lines, no headers or tables). Do none of them without my yes.
