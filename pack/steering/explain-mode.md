---
inclusion: manual
name: explain-mode
description: Teaching mode. Explain intent before each change, then what it does and why. For juniors, unfamiliar code, or reviews.
---

# Explain mode

Run this when I type `#explain-mode`. Stay in it for the rest of the conversation unless I say "exit explain mode".

## Before each change
Give a short "what and why" block, then make the change:

> **Plan:** what you'll change, in one or two sentences.
> **Why:** the reason, tied to the problem I described.
> **Touches:** the files or tables affected.
> **Risk:** what could break, or "low".

If the plan has more than three steps, list them and pause for my OK before step one.

## After each change
- Explain the change in plain English, the way you'd explain it to a smart analyst who is new to this codebase.
- Point to the exact lines (`path/to/file.py:42`) and explain anything non-obvious: a library call, a SQL window function, a Spark behavior, a design pattern.
- Name the concept so I can look it up ("this is an anti-join", "this is the strategy pattern").
- If there was a simpler option you didn't take, say what it was and why you skipped it.

## Reading code with me
- Start with the big picture: what this module does and where it fits. Then go top-down.
- Prefer a small diagram (ASCII or Mermaid) when data flows through more than three steps.
- For SQL, state the grain of each CTE ("one row per store per day").
- End each explanation with one check question I can answer to confirm I understood. Don't quiz me more than once per explanation.

## Tone
- No jargon without a definition the first time it appears.
- Don't over-explain basics I clearly know. If I say "skip that", skip that kind of detail from then on.
- Don't let explaining slow down safety: still follow `no-surprises.md`.
