# Kiro Overdrive

The team's Kiro setup: a pack of steering files, skills and hooks, plus the directory app that shows teammates what each one does and how to install it.

Nothing in this folder installs itself or changes your Kiro setup. It's plain source files you edit.

## What's here

```
kiro-overdrive/
├─ app/                      the directory web app (Node.js, no dependencies)
│  ├─ package.json           npm scripts: start, dev, check, build, deploy, sync, sync:check
│  ├─ server.js              read-only server (Node's built-in http module)
│  ├─ src/
│  │  ├─ main.js             the app's code (ES module, runs in the browser)
│  │  └─ styles.css          the app's styles
│  └─ public/
│     ├─ index.html          the page shell
│     └─ data/
│        ├─ entries.json     the 16 directory entries, with every file's text embedded
│        └─ packages.json    Starter / Intermediate / Advanced
├─ pack/                     the Kiro files themselves
│  ├─ steering/              rules: no-surprises, output-formats, explain-mode, agent styles
│  ├─ skills/                #commands: standup, sql-review, ticket-to-spec, handoff, …
│  ├─ hooks/                 automatic checks
│  ├─ second-brain/          memory system (global brain + repo brain)
│  └─ install/               installer for teammates (only runs if someone runs it)
├─ docs/
│  └─ MIGRATION.md           rollout guide for teammates
└─ tools/
   ├─ sync_entries.mjs       copies pack/ file text into app/public/data/entries.json
   ├─ build_pages.mjs        builds the static site into app/dist/
   └─ deploy_pages.mjs       builds and pushes app/dist/ to the gh-pages branch
```

The pack lives in `pack/`, not `.kiro/`, on purpose. Kiro only loads steering and hooks from a `.kiro/` folder, so working on these files here doesn't change how Kiro behaves in this project.

## Run the app locally

Needs Node.js 20 or later. There are no packages to install. From the `app` folder:

```
npm run dev
```

Then open http://localhost:8000 and refresh after edits. `dev` restarts the server when `server.js` changes; files in `src/` and `public/` are read fresh on every request. Use `npm start` to run it without the file watcher, and `npm run check` for a syntax check. Set `PORT` to use a port other than 8000.

The app is read-only: it shows `public/data/*.json` and has no Add, Edit or Delete.

## Publish to GitHub Pages

The site is hosted on GHE Pages from the `gh-pages` branch. There are no Actions runners, so publishing is manual. **Every time you push changes to `main`, run the deploy afterwards**, otherwise the live site stays on the old version.

1. Commit your changes and push them to `main` (`git push`).
2. From the `app` folder, run:

   ```
   npm run deploy
   ```

The deploy refuses to run unless you're on `main` with no uncommitted changes in `app/`, `pack/`, `tools/` or `docs/`. It then runs `check` and `sync:check`, builds `app/dist/` (`npm run build`), and force-pushes `dist/` to `gh-pages`. `gh-pages` only ever holds generated files, so never edit it by hand. Pages takes a minute or so to update; hard-refresh the page to see the change.

If `sync:check` fails, run `npm run sync`, commit, push, and deploy again.

`.github/workflows/pages.yml` does the same thing in Actions, but it is manual-only until the org has a runner.

## Common changes

| To change… | Edit | Then |
|---|---|---|
| What a steering file, skill or hook says | the file under `pack/` | `npm run sync` (from `app/`) so the app shows the new text |
| A directory entry's title, summary, example, install notes or test | `app/public/data/entries.json` | Refresh the page |
| What's in a package, or the reason for an item | `app/public/data/packages.json` | Refresh the page |
| How the directory looks | `app/src/styles.css` | Refresh the page |
| How the directory works | `app/src/main.js` (page structure in `app/public/index.html`) | Refresh the page |
| What the installer copies for each package | `pack/install/install.ps1` and `install.sh` | Keep both in step with `packages.json` |

Run `npm run sync:check` to see whether the app's copies have fallen behind `pack/` without changing anything.

## Data format

`app/public/data/entries.json` is an array of entries. Main fields:

| Field | Meaning |
|---|---|
| `id` | Stable id; packages refer to entries by it |
| `title`, `summary`, `tags` | What shows on the card |
| `category` | Kiro type: `steering`, `skill`, `hook`, `memory` (shown as Kit), `mcp`, `spec`, `agent` |
| `purpose` | Directory group: `safety`, `style`, `plan`, `quality`, `comms`, `onboard` |
| `recommended` | Shows the star and appears under "Recommended only" |
| `path`, `content` | Single-file entries: where it installs and its text |
| `files`, `scope: "kit"` | Kits: several `{path, content}` files installed together |
| `inclusion` | When Kiro loads it (`always`, `manual  (#name)`) or the hook trigger |
| `installSteps` | One note per line; lines starting `Required:` become the must-do checklist |
| `testSteps` | One step per line; a line starting `Pass:` is the success check |
| `examplePrompt`, `exampleReply` | The example chat on the Overview tab |

`app/public/data/packages.json` is an array of packages: `id`, `name`, `level`, `tagline`, `audience`, `extends` (the package it builds on), `items` and `addons` (each `{id, why}`).
