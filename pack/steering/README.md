# Steering files

> The full pack, with packages and the installer, is described in [`install/README.md`](../install/README.md). Rolling it out? See [`docs/MIGRATION.md`](../../docs/MIGRATION.md).

| File | Loads | Scope | What it does |
|---|---|---|---|
| `no-surprises.md` | always | repo | Hard safety rails. Beats every other steering file, including the agent styles. |
| `output-formats.md` | `#output-formats` | repo | Team templates for commits, PRs, Jira, Teams, Confluence, standups and Excel. |
| `explain-mode.md` | `#explain-mode` | personal | Teaching mode: plan and why before each change, plain English after. |
| `claude-code-style.md` | `#claude-code-style` | personal | Terse, careful pair-programmer. Reads before editing, tracks a checklist, verifies, asks when a wrong guess is expensive. |
| `codex-style.md` | `#codex-style` | personal | Autonomous. Drives tasks to completion, one-line progress preambles, surgical patches, structured final summary. |

## Agent styles

Both styles ship as `inclusion: manual`, so they only load when you pick one. Don't load both at once: they conflict (ask-first vs. autonomous).

- In chat, type `#claude-code-style` or `#codex-style`, or pick it from the slash-command menu.
- To make one your default, change its front matter to `inclusion: always` and leave the other as `manual`.

## Notes
- Workspace steering (`<repo>/.kiro/steering/`) wins over global steering (`~/.kiro/steering/`) if they conflict.
- Kiro also reads `AGENTS.md` automatically (always included). Codex users' existing `AGENTS.md` files work as-is.
- Custom agents don't load steering automatically. Add `"resources": ["file://.kiro/steering/**/*.md"]` to the agent config.
- `no-surprises.md` beats both styles: even the autonomous Codex style stops and asks before destructive actions.
