---
inclusion: manual
---

# #brain-setup: fill in the brain's placeholders

Run this when I type `#brain-setup`: right after installing the second brain, or when adding the brain to a new repo. Target 5 minutes and at most 8 questions.

## 1. Find what needs filling
- Read my global `brain-index.md` (`~/.kiro/steering/` on Mac, `%USERPROFILE%\.kiro\steering\` on Windows) and this workspace's `.kiro/steering/project-brain.md`.
- List every `<placeholder>` still in them. If a file has none, skip it and say so. If `project-brain.md` is missing, ask before creating it.

## 2. Work out what you can from the repo (don't ask me these)
- **Stack:** from files such as `package.json`, `pyproject.toml`, `requirements.txt`, `databricks.yml`, `dbt_project.yml`, `.sql` files and notebooks.
- **Build, test and lint commands:** from `package.json` scripts, `Makefile`, `pyproject.toml`, CI config or the README. Only use commands you actually found. Never guess one.
- **Layout:** the main top-level folders and what's in them, one line each, at most six.
- **What this is:** from the README's opening paragraph.

Keep track of where each answer came from.

## 3. Interview me for the rest, in one batch
Ask only what the repo can't tell you, numbered, with your best guess where you have one:
- **Global brain** (skip if already filled): my role, main stack, working-style preferences, and active projects (name and repo or folder).
- **Project brain:** anything from step 2 you couldn't confirm, plus up to three rules I already know matter here, written as "When X, do Y (because Z)".

I can answer "skip" for any item.

## 4. Propose, then write
- Show both files fully filled in, with a short note of which values came from the repo and which came from me.
- Delete placeholder lines I skipped rather than leaving `<…>` text behind. Don't invent topic files: leave the topic table with a single `add later` row if I gave none.
- Keep each file under about 2 KB.
- Write `project-brain.md` after I approve it. Write `brain-index.md` only after I approve that file separately; that approval counts as my permission to edit the global brain.
- Change no other files. Leave `decisions-log.md` alone.

## 5. Finish
Tell me in one line what was filled in and anything left for later.
