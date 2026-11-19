# Second brain for Kiro

A memory system built only from steering files and one hook. You get one **global brain** for yourself, plus a **project brain** in each repo. A capture hook writes new knowledge into the project's inbox, and short agent-led interviews set up, promote, correct and prune that knowledge.

The installer adds the second brain automatically with the `intermediate`, `advanced` and `all` packages. The manual steps below are for installing it on its own.

## Layout

```
global/                         → copy to %USERPROFILE%\.kiro\  (macOS/Linux: ~/.kiro/)
  steering/
    brain-index.md              always   — who you are, active projects, topic map, write rules
    brain-setup.md              manual   — #brain-setup: fill in the placeholders (reads the repo, asks the rest)
    brain-new-project.md        manual   — #brain-new-project: create + fill the project brain in a new repo
    brain-capture.md            manual   — #brain-capture: on-demand "remember this session"
    brain-review.md             manual   — #brain-review: weekly triage + promote interview
    brain-prune.md              manual   — #brain-prune: monthly audit interview

project/                        → copy to <repo>\.kiro\
  steering/
    project-brain.md            always   — this repo's stack, commands, layout, rules
    decisions-log.md            manual   — inbox the hook appends to
  hooks/
    brain-capture.json          Post Task Execution → append learnings to decisions-log.md
```

Topic files (for example `databricks-conventions.md` or `forecast-metrics.md`) start out empty. Create them during `#brain-review` once a theme earns one.

## Which brain?

The test is whether the fact would still be true in a different repo.
- **Yes:** it belongs in the global brain (`%USERPROFILE%\.kiro\steering\`).
- **No:** it belongs in the project brain (`<repo>\.kiro\steering\`).

Writes go to the open workspace by default. The hook lives in the repo and uses relative paths. The global brain changes only when you say "promote to global" during a review, or approve it during `#brain-setup`. The write rules in `brain-index.md` cover manual requests, repos that don't have a brain yet, and multi-root workspaces.

## Maintenance loop

| Step | When | How | Who decides |
|---|---|---|---|
| Setup | Once, after installing | `#brain-setup` | Agent fills from the repo, asks you the rest, you approve each file |
| New project | Once per new repo | `#brain-new-project` | Agent creates the repo's brain files, then runs setup |
| Capture | Every spec task | Hook appends dated one-liners to `decisions-log.md` | Automatic |
| Capture (manual) | End of a non-spec session | `#brain-capture` | Agent drafts, you confirm |
| Review + promote | Weekly, ~10 min | `#brain-review` | Agent pre-sorts, interviews you on borderline items, proposes diffs |
| Prune | Monthly | `#brain-prune` | Agent audits, you confirm removals |

The IDE can't create manual (button-triggered) hooks, so the on-demand routines are manual steering files. Type `#brain-review` in chat to run one.

## Promotion rules (the four checks)

1. **Recurs:** it will come up again (or has shown up two or three times in the log).
2. **Corrects a default:** the agent would get it wrong without the note.
3. **Rule-shaped:** it can be written as "When X, do Y (because Z)."
4. **Stable:** it isn't still being decided.

To route a promoted entry:
- True in any repo → global topic file.
- True only in this repo → project topic file.
- Third entry on a theme that has no file → create a new topic file and add it to the index.
- About how the agent should behave rather than what it knows → index or a style file.

Always drop debugging stories, anything already in the code or its comments, anything a repo search would turn up, and sprint-only context.

A quick gut check: would you tell a new teammate this on day one? If yes, promote it. If you'd only mention it when they hit the problem, use a `fileMatch` topic file or leave it in the log.

## Install by hand

1. Copy `global/steering/*` to `%USERPROFILE%\.kiro\steering\`.
2. In each repo, copy `project/steering/*` and `project/hooks/*` into `<repo>\.kiro\`.
3. Open a new Kiro chat in the repo and type `#brain-setup` to fill in `brain-index.md` and `project-brain.md`.
4. Check that the hook appears in the Kiro Hooks panel. If your Kiro version doesn't recognize the `PostTaskExecution` trigger name, recreate the hook in the panel ("Post Task Execution", then "Ask agent") and paste in the prompt from `brain-capture.json`.
5. Optionally, set a recurring Monday reminder to run `#brain-review`.

For each new project after that, skip step 2: open the repo in Kiro and type `#brain-new-project`.

## Team mode

- Personal global brains stay personal. Project brains are committed with the repo.
- For a shared repo, `#brain-review` drafts its promotions on a branch and you open a PR. Teammates review steering changes like code.
- Custom agents don't load steering automatically. Add `"resources": ["file://.kiro/steering/**/*.md"]` to the agent config.

## Keep it small

- Keep `brain-index.md` and `project-brain.md` under about 2 KB each, because they load every session.
- Everything else should be `manual` or `fileMatch`.
- A wrong rule is worse than a missing one, so prune regularly.
