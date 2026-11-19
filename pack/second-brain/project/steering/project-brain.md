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
