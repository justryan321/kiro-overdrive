---
inclusion: manual
name: changelog
description: "#changelog: turns merged PRs since the last entry into a human-readable CHANGELOG.md section and drafts a Teams post."
---

# #changelog

Run this when I type `#changelog`, ideally right after a merge or at the end of a sprint. The Stop hook `docs-reminder` also suggests it when a branch was merged.

## 1. Find what's new
- Read `CHANGELOG.md` (create it only after asking). The newest entry's date or version is the starting point; if there's no file, use the last 14 days.
- List merged work since then, using the first option that works:
  1. `gh pr list --state merged --search "merged:>=YYYY-MM-DD" --json number,title,body,author,mergedAt,labels --limit 100`
  2. `git log <default-branch> --first-parent --merges --since="YYYY-MM-DD" --pretty="%h %ad %s%n%b" --date=short`
- For each item, read the PR body (or merge commit body) for the "What", "Why" and "Data impact" sections, if it has them.

## 2. Write the section
[Keep a Changelog](https://keepachangelog.com) style, newest on top:

```markdown
## YYYY-MM-DD

### Added
- Plain-English description of what users can now do. (#123, @author)
### Changed
### Fixed
### Data
- Tables, views or metrics created, changed or backfilled, and whether historical numbers moved.
### Removed
```

Rules:
- Write for the people who use the outputs (analysts, stakeholders), not for engineers. "Forecast accuracy dashboard now shows bias by DC" beats "add bias col to vw_fcst".
- Merge related PRs into one line. Drop pure chores (formatting, dependency bumps) unless they change behavior.
- Anything that changes historical numbers goes under **Data** and starts with **Heads up:**.
- Leave out empty sections.

## 3. Deliver
- Show the diff to `CHANGELOG.md` and wait for my OK before writing it.
- Then draft a **Teams update**: the top three changes and any **Heads up** items. Show it in a code block for pasting. Don't post it. Teams chat supports only light formatting, so use bold labels and short lines, no headers or tables:
  ```
  **<Topic>** — <one-line summary>
  • <point>
  • <point>
  **Need:** <ask, or "nothing, FYI">
  ```
