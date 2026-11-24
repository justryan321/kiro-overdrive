---
inclusion: manual
name: ticket-to-spec
description: "#ticket-to-spec PROJ-123: turns a Jira issue into a Kiro spec (requirements, design, tasks) traced back to its acceptance criteria."
---

# #ticket-to-spec

Run this when I type `#ticket-to-spec <ISSUE-KEY>`. Needs the Atlassian MCP server. If it isn't connected, ask me to paste the ticket text instead.

## 1. Fetch
- The issue: summary, description, acceptance criteria, issue type, priority, labels, components, linked issues, and the last 10 comments.
- Linked Confluence pages, if any: read them for context. Don't fetch more than five.
- The parent epic's summary, if there is one.

## 2. Check before writing
List, in one batch:
- **Gaps:** acceptance criteria that are missing, vague ("should be fast"), or untestable.
- **Assumptions** you'd have to make.
- **Conflicts** with `project-brain.md`, existing specs, or the code.

If there are any gaps or conflicts, ask up to five numbered questions and wait. If there are none, say so and continue.

## 3. Create the spec
Folder: `.kiro/specs/<issue-key-lowercase>-<short-slug>/`. If it already exists, stop and ask whether to update or replace it.

**requirements.md**
- Header: ticket key and link, summary, the date, "Source: Jira".
- One requirement per acceptance criterion, in EARS form: `WHEN <trigger> THE SYSTEM SHALL <response>`. Number them `R1`, `R2`… and tag each with its source: `(AC 2)`, or `(assumed: confirm)` for anything that didn't come from the ticket.
- A "Out of scope" section built from the ticket and your questions.

**design.md**
- Approach, components and files touched, data flow (Mermaid if more than three steps), and data changes: tables, columns, grain, and dev vs. prod targets.
- Risks and how each one is tested.
- Keep it short. Match existing patterns found in the repo; name the files you're copying the pattern from.

**tasks.md**
- Kiro task checklist, each task small enough for one session, ordered so the repo stays working after each.
- Every task lists the requirements it covers (`_Requirements: R1, R3_`). Every requirement is covered by at least one task.
- Include test tasks and a final "verify against acceptance criteria" task.

## 4. Hand back
- A three-line summary: requirement count, task count, open assumptions.
- Offer, don't do: "Want me to post a Jira comment linking this spec?" If I say yes, use this format and show it to me before posting:
  ```
  Status: <In progress | Blocked | Ready for review | Done>
  Done: <1–3 bullets>
  Next: <1–2 bullets>
  Blockers: <none, or who/what is needed>
  Links: <PR, notebook, dashboard>
  ```
