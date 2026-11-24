---
inclusion: manual
name: standup
description: "#standup: drafts a three-line standup from git activity, the decisions log and open Jira tickets."
---

# #standup

Run this when I type `#standup`. Target: under a minute, read-only.

## 1. Window
- Default: since the start of the previous working day. On Monday, since Friday 00:00.
- If I add a range (`#standup since tuesday`), use that.

## 2. Gather (read-only, in parallel)
- **Git:** my commits in the window across all local branches.
  `git log --all --author="$(git config user.email)" --since="<window>" --pretty="%h %ad %s" --date=short`
  Also note uncommitted work: `git status --short`.
- **Decisions log:** entries in `.kiro/steering/decisions-log.md` dated in the window, if the file exists.
- **Specs:** tasks marked done or in progress in `.kiro/specs/*/tasks.md` that changed in the window.
- **Jira (Atlassian MCP):** my open issues, using JQL
  `assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC`, max 10.
  Plus anything I moved to Done in the window.
  If no Atlassian MCP server is connected, skip this, and say so in one line at the end.

## 3. Write
Use this format:
```
**Yesterday:** <1–3 items, outcome-focused>
**Today:** <1–3 items>
**Blockers:** <none, or specific ask + who>
```
- **Yesterday:** outcomes, not activity. Group related commits into one item ("Finished MAPE rollup for DC forecasts (PROJ-212)"), not a list of commit messages.
- **Today:** the next tasks from open specs and the top in-progress Jira issues.
- **Blockers:** only real ones: a ticket in a Blocked status, a failing check you saw, or something waiting on a named person. Otherwise "None".
- Max three items per line. Put ticket keys in parentheses.

## 4. Deliver
- Print the standup in a code block so I can paste it into Teams.
- Below it, one line: what you couldn't see (for example "No Jira: Atlassian MCP not connected. Type /atlassian-setup to connect it").
- Don't post anywhere. Don't change any file.
