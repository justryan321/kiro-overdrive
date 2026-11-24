# Steering files

> The full pack, with packages and the installer, is described in [`install/README.md`](../install/README.md). Rolling it out? See [`docs/MIGRATION.md`](../../docs/MIGRATION.md).

| File | Loads | Scope | What it does |
|---|---|---|---|
| `no-surprises.md` | always | repo | Hard safety rails. Beats every other steering file. |
| `explain-mode.md` | `#explain-mode` | personal | Teaching mode: plan and why before each change, plain English after. |

## Notes
- Workspace steering (`<repo>/.kiro/steering/`) wins over global steering (`~/.kiro/steering/`) if they conflict.
- Kiro also reads `AGENTS.md` automatically (always included), so existing `AGENTS.md` files work as-is.
- Custom agents don't load steering automatically. Add `"resources": ["file://.kiro/steering/**/*.md"]` to the agent config.
- `no-surprises.md` beats every other file: the agent always stops and asks before destructive actions.
