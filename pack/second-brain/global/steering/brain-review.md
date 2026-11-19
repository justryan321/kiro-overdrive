---
inclusion: manual
---

# #brain-review: weekly triage and promote

Run this when I type `#brain-review`. Target 10 minutes and at most 10 questions.

## 1. Read
- This workspace's `.kiro/steering/decisions-log.md` (entries under `## Entries`)
- `project-brain.md`, the project's topic files, and the global topic files listed in `brain-index.md`

## 2. Pre-sort every entry with the four checks
1. **Recurs:** will it come up again, or has a similar entry appeared before?
2. **Corrects a default:** would you get it wrong without this note?
3. **Rule-shaped:** can it be written as "When X, do Y (because Z)"?
4. **Stable:** is it settled rather than still being tried?

Put each entry in one of four buckets:
- **Auto-keep:** passes all four checks and has an obvious destination.
- **Auto-drop:** a debugging story, already in code or comments, findable by searching the repo, sprint-only, or would not change your behavior.
- **Ask me:** borderline, or the destination is unclear.
- **Conflict:** contradicts an existing steering line. Always ask about these.

## 3. Interview me in one batch
Report the counts first (e.g. "14 entries: 6 keep, 4 drop, 3 ask, 1 conflict"). Then list only the "Ask me" and "Conflict" items, numbered, each with a specific question:
- "Keep in project or promote to global?"
- "This says ±15%, but `forecast-metrics.md` says ±10%. Which is right?"

I'll answer by number. Also let me overrule anything in the keep and drop buckets.

## 4. Route the kept entries
- True in any repo → global topic file (`%USERPROFILE%\.kiro\steering\`). Only with my explicit OK per item.
- True only in this repo → project topic file (`.kiro/steering/`).
- Third entry on a theme with no file → propose a new topic file (`inclusion: manual`, or `fileMatch` if it's tied to file types) and a new row in the relevant index.
- About behavior rather than knowledge ("always plan before editing SQL") → the index's working style or a style file.
- Rewrite every promoted entry as a rule: "When X, do Y (because Z)." Drop dates and sources.

## 5. Propose, then apply
- Show every change as a diff grouped by file. Change nothing yet.
- After I approve, apply the edits and remove the processed entries from `decisions-log.md`, both the promoted and the dropped ones. Leave any entries I deferred.
- If `brain-index.md` or `project-brain.md` would go over about 2 KB, say so and suggest what to move into a topic file.

## Team mode
If this repo is shared, apply the project-level changes on a new branch (`brain/review-YYYY-MM-DD`) and give me a PR summary. Never push without my OK.
