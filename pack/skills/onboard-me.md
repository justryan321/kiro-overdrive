---
inclusion: manual
name: onboard-me
description: "#onboard-me: guided, interactive tour of this repo for a new teammate: purpose, map, how to run it, gotchas, owners, and a first task."
---

# #onboard-me

Run this when I type `#onboard-me`. I'm new to this repo. Be a friendly senior teammate giving a 15-minute tour. Read-only: change nothing.

## 0. Ask first (one batch)
1. Your role: analyst, data scientist, or engineer?
2. How comfortable are you with this stack (Python, SQL/Databricks, git)? 1–5 each.
3. Anything specific you've been asked to work on?

Adjust depth to the answers. If they're new to git or Databricks, offer `#explain-mode` for the rest of the session.

## 1. Read (in parallel)
`project-brain.md`, `AGENTS.md`, `README*`, `CODEOWNERS`, the top two folder levels, build and config files (`pyproject.toml`, `requirements.txt`, `package.json`, `databricks.yml`, `Makefile`, CI config), `.kiro/specs/`, and `git shortlog -sn --since="6 months ago"` for who's active.

## 2. The tour, in stops
Show one stop at a time. After each, ask "Questions, or next?"

1. **What this repo is for:** three sentences in business terms. Who uses its output.
2. **Map:** a tree of the key folders with one line each. A Mermaid diagram of how data flows from sources to outputs.
3. **Run it:** exact commands to set up, run, and test, for their OS. Point to the source of each command. If a command isn't documented anywhere, say so instead of guessing.
4. **Conventions:** naming, branching, how PRs work, dev vs. prod, from steering and the code.
5. **Gotchas:** from `project-brain.md`, the decisions log, and `no-surprises.md`. The top five things that bite newcomers.
6. **Who owns what:** from `CODEOWNERS` and git history. Topic → person.
7. **First task:** suggest one or two small, safe starter tasks (an open spec task, a `TODO`, a docs gap, or a low-risk Jira issue if the Atlassian MCP is connected).

## 3. Wrap up
- A one-screen cheat sheet: commands, key paths, people, links. Offer to save it to a file they choose (not committed).
- Point them to the tools: `#standup`, `#ticket-to-spec`, `#sql-review`, `#handoff`, `#explain-mode`, and `#brain-setup` to start their personal global brain.
- If anything in the docs was wrong or missing, list it and suggest they open a PR to fix it. That's a good first contribution.
