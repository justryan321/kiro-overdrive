---
inclusion: manual
name: databricks-setup
description: "/databricks-setup: installs the Databricks AI Dev Kit (skills and MCP server) into this Kiro project, signs you in with OAuth, and proves it works by running a SQL file from chat."
---

# /databricks-setup

Run this when I type `/databricks-setup` or `#databricks-setup`. Walk me through it one step at a time. Follow `no-surprises.md`.

## Ground rules
- **Show every command before it runs, then wait for my yes.** One command per approval. Never chain installs behind one yes.
- **OAuth only.** Never ask for, accept, print or store a token, password or client secret. If I paste one, tell me to revoke it, and don't repeat it. Sign-in happens in my browser through `databricks auth login`.
- **Read config safely.** From `~/.databrickscfg` read only profile names and `host` lines. Never read or show `token`, `client_secret` or similar keys.
- **Never run a downloaded script before I've seen it.** Download it to a file, show me the dry run, ask, then run it.
- **Stop on any failure.** Show the error, explain it in one line, and offer a fix or a stop. Don't guess at other flags. If a command or flag doesn't exist, say the Dev Kit may have changed and point me to https://github.com/databricks-solutions/ai-dev-kit.

## 1. Preflight (read-only, run without asking)
Check and report in one short table:
- OS (macOS, Linux or Windows) and shell.
- `databricks --version`. Needs v1.0.0 or newer for skills; v1.20.0 or newer lets the CLI target Kiro directly.
- Profiles: `databricks auth profiles` (or the `[section]` names in `~/.databrickscfg`).
- `uv --version` (the MCP server needs it) and `git --version`.
- Existing setup: a `databricks` entry in `.kiro/settings/mcp.json` or `~/.kiro/settings/mcp.json`; Databricks skills already installed in `.kiro/` (look for folders starting with `databricks-`).

If a `databricks` MCP entry and a working profile already exist, say so and ask: **verify only** (jump to step 6), **update**, or **uninstall** (step 8).

## 2. Install the prerequisites I'm missing
Only for what step 1 found missing or too old. Show the command, wait for yes.
- **Databricks CLI:** macOS/Linux `brew install databricks`, or the install script from https://docs.databricks.com/dev-tools/cli/install.html. Windows `winget install Databricks.DatabricksCLI`. Upgrade: `brew upgrade databricks`.
- **uv:** download the installer to a file first, show its first lines, then run the file after my yes. macOS/Linux: `curl -LsSf https://astral.sh/uv/install.sh -o /tmp/uv-install.sh`, then `sh /tmp/uv-install.sh`. Windows: `irm https://astral.sh/uv/install.ps1 -OutFile uv-install.ps1`, then `powershell -ExecutionPolicy Bypass -File .\uv-install.ps1`. Never pipe a download into a shell; Guardian blocks it.
- **git:** point me to https://git-scm.com/downloads. Don't install it for me.

Then re-run the version checks.

## 3. Sign in with OAuth
- Ask for my **workspace URL** (like `https://adb-1234567890123456.7.azuredatabricks.net` or `https://your-company.cloud.databricks.com`). It's a URL, not a secret. Strip any path or trailing slash.
- Ask for a **profile name**. Suggest `DEFAULT`, or a short name like `dev` if I use several workspaces.
- Show: `databricks auth login --host <url> --profile <name>`. After my yes, run it. A browser window opens; tell me to approve and come back.
- Confirm with `databricks auth describe --profile <name>` or `databricks current-user me --profile <name>`. Report only my user name and host.

If it fails, see Troubleshooting.

## 4. Install the Dev Kit skills
Skills only; this installs into `.kiro/` for this project.
1. Download the installer, don't pipe it:
   - macOS/Linux: `curl -sL https://raw.githubusercontent.com/databricks-solutions/ai-dev-kit/main/install.sh -o /tmp/ai-dev-kit-install.sh`
   - Windows: `irm https://raw.githubusercontent.com/databricks-solutions/ai-dev-kit/main/install.ps1 -OutFile install.ps1`
2. Show a short summary of what it does: the first 40 lines are the usage header. Don't paste all of it.
3. Preview: `bash /tmp/ai-dev-kit-install.sh --tools kiro --profile <name> --dry-run` (Windows: `.\install.ps1 -Tools kiro -Profile <name> -DryRun`). Show the plan and ask.
4. After my yes, run the same command without `--dry-run`. If it prompts for choices, relay each prompt to me; don't pick for me.

## 5. Install the Databricks MCP server (this is how Kiro runs SQL)
This is a separate installer. It builds a Python environment and **must stay on disk** after install, because the Kiro config points at it.
1. Ask where to keep it. Default: `~/.databricks-mcp/ai-dev-kit` (Windows: `%USERPROFILE%\.databricks-mcp\ai-dev-kit`).
2. Show, then run after yes: `git clone https://github.com/databricks-solutions/ai-dev-kit.git <path>` (skip if it's already there; offer `git pull` instead).
3. Preview from the **project folder**, because project scope writes to the current folder: `bash <path>/databricks-mcp-server/mcp_install.sh --tools kiro --profile <name> --dry-run` (Windows: `& <path>\databricks-mcp-server\mcp_install.ps1 -Tools kiro -Profile_ <name> -DryRun`). Show the plan and ask.
4. After my yes, run it without `--dry-run`. It writes `.kiro/settings/mcp.json` and backs up any existing file to `.bak`.
5. Check the file has a `databricks` entry with `DATABRICKS_CONFIG_PROFILE` set to my profile, and show that entry. It holds no secrets.
6. Tell me to open the MCP Servers view in Kiro and make sure `databricks` shows as connected. Reconnect it if not.

## 6. Prove it: run SQL from chat
1. Call the MCP `get_current_user` tool. Report my user name.
2. Call `manage_warehouse` with action `list`. Show warehouse names and state. If none, go to Troubleshooting. If several, ask which to use; `get_best` is the default when I say "you pick".
3. Create `sql/databricks_smoke_test.sql` (ask before creating the folder) with:
   ```sql
   -- Purpose: check that Kiro can run SQL on Databricks
   SELECT 1 AS ok, current_user() AS me, current_catalog() AS catalog;
   ```
4. Run it with the MCP `execute_sql` tool and show the result as a table. This is a read-only query.
5. Offer one more read-only check, such as `SHOW CATALOGS` or `SHOW SCHEMAS IN <catalog> LIMIT 20`, and run it if I say yes.

The `destructive-guard` hook still asks before anything that writes or drops. Don't try to get around it.

## 7. Wrap up
Report in a short list: profile and host, CLI version, skills installed (yes/no), MCP server path and connection status, warehouse used, smoke test result. Then say:
- Commit `.kiro/settings/mcp.json` only if it has no machine-specific absolute paths that others can't use. It usually does, so suggest adding it to `.gitignore` and having each teammate run `/databricks-setup`.
- Never commit `~/.databrickscfg`.

## 8. Uninstall (only if I ask)
Show each command first. Skills: `databricks aitools uninstall`. MCP entry: `bash <path>/databricks-mcp-server/mcp_install.sh --uninstall --tools kiro --dry-run`, then again without `--dry-run` after my yes. Leave the cloned folder unless I ask you to delete it, and ask before deleting anything.

## Troubleshooting
- **Browser doesn't open or login hangs:** copy the URL the CLI prints into a browser. Behind a corporate proxy or SSO, ask IT whether `*.databricks.com` and the identity provider are allowed.
- **"invalid refresh token" or 401 later:** the login expired. Run `databricks auth login --host <url> --profile <name>` again.
- **MCP server shows as failed in Kiro:** check that `<path>/.venv` exists, `uv` is installed, and the path in `.kiro/settings/mcp.json` is still valid. Re-run step 5 if not.
- **No SQL warehouses or "permission denied":** my account needs access to a SQL warehouse. Ask a workspace admin; I can't fix this from here.
- **`execute_sql` times out on a stopped warehouse:** serverless starts in seconds; classic warehouses can take a few minutes. Ask me to wait and retry.
- **Wrong workspace:** call `manage_workspace` with action `status`, or change `DATABRICKS_CONFIG_PROFILE` in `.kiro/settings/mcp.json`.
