# Migrating your work to Kiro with Kiro Overdrive

This is the guide for teammates rolling the pack out to their own repos. The pack lives in `pack/`: every steering file, skill and hook, the second brain, and an installer. Follow the steps below once per machine, then once per repo. Budget about 30 minutes for the first repo and 5 for each one after.

## What's in this folder

```
pack/
├─ install/
│  ├─ install.ps1          Windows installer
│  ├─ install.sh           macOS / Linux installer
│  └─ README.md            reference: every file, flag and troubleshooting tip
├─ steering/               rules (no-surprises, explain-mode)
├─ skills/                 #commands (standup, sql-review, ticket-to-spec, handoff, …)
├─ hooks/                  automatic checks (destructive guard, Guardian scan, SQL check, file header, docs reminder)
├─ scripts/                guardian.py, the secret and command scanner
└─ second-brain/           memory: your global brain + a brain per repo
```

## Step 1: Get your machine ready (once)

- [ ] Install Kiro and sign in.
- [ ] Install git, and make sure you can clone the team's GitHub repos.
- [ ] Install Python 3.8 or later (`python3 --version`, or `python --version` on Windows). Guardian's scanner and commit scan need it. No packages required.
- [ ] Optional, but some skills get better with them:
  - GitHub CLI (`gh`), signed in: `#changelog` reads PR descriptions; `#metric-align` searches code across the org.
  - `openpyxl` for Python: `#metric-align` reads Excel formulas.
- [ ] Connect MCP servers. After Step 2 installs the pack, type these in a Kiro chat; each walks you through it with OAuth in your browser:
  - **`/atlassian-setup`** (Jira and Confluence): used by `#standup`, `#ticket-to-spec`, `#handoff` and `#metric-align`.
  - **`/databricks-setup`**: used by `#sql-review` checks, `#metric-align` and the SQL guard.
  - Keep API keys and tokens in your user-level config. Never commit them.

Every skill still works without these connections; it says what it skipped.

## Step 2: Install a package into each repo

Pick a package. Each one includes the one before it, so you can start small and upgrade later by running a bigger package: it only adds what's new.

| Package | What you get | Best for |
|---|---|---|
| `starter` | Guardian (safety rules, destructive guard, secret scanner and commit scan), Standard File Header, Standup, Changelog and Docs | Your first week in Kiro |
| `intermediate` | Starter + SQL Review, Second Brain, Databricks Setup, Atlassian Setup | Shipping SQL and working Jira tickets weekly |
| `advanced` | Intermediate + Steering Doctor, Handoff, Metric Align, Future Purge | Leads and power users |
| `all` (default) | Advanced + your personal files: Explain Mode, Brief Mode | Migrating everything at once |

From the project root, run:

**Windows (PowerShell)**
```powershell
# See what it will do first
.\pack\install\install.ps1 -Repo C:\code\your-repo -DryRun
# Then install everything
.\pack\install\install.ps1 -Repo C:\code\your-repo
```

**macOS / Linux**
```bash
./pack/install/install.sh --repo ~/code/your-repo --dry-run
./pack/install/install.sh --repo ~/code/your-repo
```

Use `-Package starter` (or `--package starter`) to install a smaller set. If PowerShell blocks the script, run it once with `powershell -ExecutionPolicy Bypass -File .\pack\install\install.ps1 -Repo C:\code\your-repo`.

The installer also adds Guardian's git pre-commit hook, which scans every commit in that clone for secrets, including commits from GitHub Desktop. Add `-NoGitHook` (or `--no-git-hook`) to skip it.

Existing files are skipped unless you add `-Force`. Your brain notes (`project-brain.md`, `decisions-log.md`, `brain-index.md`) are never overwritten.

## Step 3: First session in each repo (about 10 minutes)

Open the repo in Kiro and work through these in a new chat:

- [ ] **Check the hooks.** Open the Kiro Hooks panel. You should see the destructive guards, the five Guardian scan hooks, the docs reminder and the file header hook, plus the SQL check and Brain capture from Intermediate up. Turn on any that are off.
- [ ] **Check Guardian.** Ask Kiro to "run sudo ls". It should be blocked with a reason.
- [ ] **`/atlassian-setup`** and **`/databricks-setup`** (Intermediate and up), if you haven't connected them yet.
- [ ] **`#brain-setup`** (Intermediate and up). It reads the repo for the stack, commands and layout, then asks you the rest: your role, working style, active projects, and rules that already matter here.
- [ ] **`#steering-doctor`** (Advanced). Confirms every file loaded, flags conflicts, and catches any hook trigger your Kiro version doesn't recognise.

## Step 4: Bring your existing knowledge across

Most of the value is in what you already know about your work. Move it in deliberately, rather than all at once:

- **Existing `AGENTS.md` files:** keep them. Kiro reads them automatically.
- **Personal conventions you repeat in every project** (naming, SQL style, how you like answers): put them in your global brain during `#brain-setup`, or say "add to my global brain" in any chat.
- **Repo-specific rules** ("use the curated view, not staging", "fiscal weeks start Sunday"): tell Kiro once, then run `#brain-capture` at the end of the chat. `#brain-review` turns the good ones into rules.
- **Metric definitions** that live in Confluence or Excel: run `#metric-align <metric>` once per key metric to find every version and agree on a canonical one.
- **Notes, prompts and snippets from other AI tools:** paste them into a Kiro chat and ask which ones should become steering rules. Keep only what passes the four checks in `second-brain/README.md`: recurs, corrects a default, rule-shaped, stable.
- **Old files you're unsure about:** run `#future-purge` instead of deleting them. They're parked for 14 days first.

## Step 5: Daily and weekly rhythm

| When | Run | What it does |
|---|---|---|
| Start of day | `#standup` | Paste-ready Yesterday / Today / Blockers |
| New Jira ticket | `#ticket-to-spec PROJ-123` | A Kiro spec traced to the acceptance criteria |
| Before you trust a query | `#sql-review` | Fan-outs, NULL traps, date bugs, rewrites |
| After a merge | `#changelog` | Plain-English release notes + Teams post |
| End of a chat that taught something | `#brain-capture` | Saves learnings to the decisions log |
| Friday | `#future-purge`, `#brain-review` | Park dead files, promote this week's learnings |
| Monthly | `#brain-prune`, `#steering-doctor` | Keep the brain and steering small and true |
| Before PTO | `#handoff` | A state-of-the-work doc for whoever covers |

## Step 6: Share it with the team

- Commit the repo's `.kiro/` folder so everyone gets the same rules, skills and hooks on their next pull. Your global files (`~/.kiro/steering/`) stay personal.
- Review changes to `.kiro/` in pull requests like code. `#brain-review` and `#steering-doctor` already put their changes on a branch.
- New teammates: clone and open in Kiro; the committed `.kiro/` gives them the same setup. They run `python3 .kiro/scripts/guardian.py install-git-hook` once (Kiro reminds them), plus `/atlassian-setup` and `/databricks-setup` on their own machine.

## Per-repo checklist

Copy this into each repo's migration ticket:

- [ ] Installer run (package: ______)
- [ ] Hooks visible and on in the Kiro Hooks panel
- [ ] Guardian commit scan installed (`.git/hooks/pre-commit`)
- [ ] `#brain-setup` done, no `<placeholders>` left
- [ ] `#steering-doctor` clean
- [ ] Key metrics checked with `#metric-align`
- [ ] `.kiro/` committed and pushed
