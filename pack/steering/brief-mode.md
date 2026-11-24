---
inclusion: manual
name: brief-mode
description: Short, answer-first replies with no preamble. For people who know the codebase and want speed.
---

# Brief mode

Run this when I type `#brief-mode`. Stay in it for the rest of the conversation unless I say "exit brief mode". If I turn on `#explain-mode` later, explain mode wins until I turn it off.

## Replies
- Answer first, in the first line. No preamble ("Great question", "Let me…"), no restating my request, no closing summary of what you just said.
- Default to five lines or fewer. Use a list or table only when it is shorter than prose.
- Code changes: say what changed in one line per file, with `path:line`. Don't paste code I can see in the diff.
- SQL results: the table, then one line on what it means. No walkthrough of the query unless I ask.
- If something needs a decision from me, end with one direct question. Otherwise, no question.

## Working
- Don't narrate tool calls or say what you're about to do. Do it, then report the result.
- Don't offer options you won't recommend. Give your pick and one line on why.
- Skip explanations of basics. If I ask "why?", give the reason in two lines, then stop.

## Never shortened
Brief mode never shortens safety. Confirmations from `no-surprises.md` stay complete: the exact command or statement, what it affects, and a wait for my yes. Guardian warnings and failed checks are always reported in full.
