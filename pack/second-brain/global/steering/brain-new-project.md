---
inclusion: manual
---

# #brain-new-project: add a brain to this repo

Run this when I type `#brain-new-project` in a repo that doesn't have a project brain yet. It creates this repo's brain files from the templates below, then fills them in. My global brain is already installed, so don't change anything in my global steering folder except where step 4 says.

## 1. Check first
- If more than one workspace root is open, ask which repo this is for.
- Look for `.kiro/steering/project-brain.md`, `.kiro/steering/decisions-log.md` and `.kiro/hooks/brain-capture.json`.
- If all three already exist, say so, suggest `#brain-setup` instead, and stop.
- Never overwrite an existing file. Create only the missing ones.

## 2. Show the plan, then create
List the files you'll create and ask once: "Create these?" After I say yes, create each missing file with exactly the template below. Don't edit the templates while creating them.

### `.kiro/steering/project-brain.md`
````markdown
---
inclusion: always
---

# Project brain: <project name>

This is the always-loaded summary of this repo. Keep it under about 2 KB, and put details in this repo's topic files.

## What this is
<one or two sentences: what the project does and who uses it>

## Stack and commands
- Stack: <e.g. Databricks, PySpark, dbt>
- Build: `<command>`
- Test: `<command>`
- Lint/format: `<command>`

## Layout
- `<folder>/`: <what lives there>

## Topic files (load with #name)
| When working on… | Load |
|---|---|
| <area> | #<topic-file> |

## Rules
Keep only high-signal, rule-shaped lines here: "When X, do Y (because Z)."
- <rule>

## Brain
- New learnings go to `.kiro/steering/decisions-log.md`. The hook does this after each spec task, or run `#brain-capture`.
- Run `#brain-review` weekly and `#brain-prune` monthly.
````

### `.kiro/steering/decisions-log.md`
````markdown
---
inclusion: manual
---

# Decisions log (inbox)

This is raw capture, not guidance. The agent doesn't follow these entries as rules. `#brain-review` promotes or drops them weekly and removes processed entries.

Format: `- YYYY-MM-DD | type | note (because …) | source`
- type: `decision` · `convention` · `gotcha` · `definition`
- source: spec/task name, file, or "chat"

Append only. Never edit or reorder existing lines outside `#brain-review`.

## Entries
````

### `.kiro/hooks/brain-capture.json`
````json
{
  "version": "v1",
  "hooks": [
    {
      "name": "Brain capture",
      "description": "After each spec task, append durable learnings to this repo's decisions log.",
      "trigger": "PostTaskExecution",
      "enabled": true,
      "action": {
        "type": "agent",
        "prompt": "Review the spec task that just finished. If it produced a durable learning (a decision and why, a convention to repeat, a gotcha to avoid, or a definition of a term or metric), append one line per learning under '## Entries' in .kiro/steering/decisions-log.md, using the format '- YYYY-MM-DD | type | note (because ...) | source' with the spec/task name as source. Most tasks produce nothing worth logging: if so, write nothing. Skip debugging play-by-play, anything already in code or comments, and anything still undecided. Append only: do not edit, reorder or delete existing lines, and do not touch any other file, especially global steering."
      }
    }
  ]
}
````

## 3. Fill it in
Now fill in the new `project-brain.md` by following the brain-setup routine below, for this repo only. Skip the global-brain questions if my `brain-index.md` has no `<placeholders>` left.

#[[file:brain-setup.md]]

## 4. Add it to my global index
Ask: "Add this repo to Active projects in your brain index?" If I say yes, add one row to the table in my global `brain-index.md`: `| <repo name> | <repo path> | active |`. Change nothing else in that file.

## 5. Finish
- Remind me to check that **Brain capture** shows under Agent Hooks in the Kiro panel and is turned on. If it isn't there, I can create it: trigger **Post Task Execution**, action **Ask agent**, with the `prompt` text from `brain-capture.json`.
- If this repo is shared, suggest committing the `.kiro/` folder. Don't commit it yourself.
- End with one line listing what you created and filled in.
