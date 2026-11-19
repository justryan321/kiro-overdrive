---
inclusion: manual
---

# #brain-capture: save this session's learnings

Run this when I type `#brain-capture`, usually at the end of a session that didn't go through a spec task. Spec tasks are already covered by the hook.

1. Scan this session for candidates:
   - **decision:** a choice we made and why
   - **convention:** a pattern to repeat
   - **gotcha:** something that broke and how to avoid it
   - **definition:** what a term or metric means here
2. Skip debugging play-by-play, anything already in code or comments, and anything still undecided.
3. Show me the candidates as a numbered list in log format and ask one question: "Drop any?"
4. After I answer, append the kept entries to this workspace's `.kiro/steering/decisions-log.md` under `## Entries`. Append only, and never edit existing lines.
5. Follow the "Where to write" rules in `brain-index.md`. Never write to global from this routine.

Log format: `- YYYY-MM-DD | type | note (because …) | source`
