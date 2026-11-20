# Kiro Overdrive

The team's Kiro setup: a pack of steering files, skills and hooks, plus the directory app that shows teammates what each one does and how to install it.

Nothing in this folder installs itself or changes your Kiro setup. It's plain source files you edit.

## What's here

```
kiro-overdrive/
├─ app/                      the directory web app (Node.js, no dependencies)
│  ├─ package.json           npm scripts: start, dev, check, test, sync, sync:check
│  ├─ server.js              server (Node's built-in http module); read-only except POST /api/track
│  ├─ metrics.js             copy counts: in memory, saved to JSON with retry
│  ├─ storage.js             where metrics.json lives: local file or Unity Catalog Volume
│  ├─ app.yaml               Databricks Apps start command and METRICS_VOLUME_PATH
│  ├─ test/                  node:test tests (npm test)
│  ├─ src/
│  │  ├─ main.js             the app's code (ES module, runs in the browser)
│  │  ├─ track.js            sends one copy event to /api/track
│  │  ├─ popular.js          "Most popular" ordering and count helpers
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
   └─ sync_entries.mjs       copies pack/ file text into app/public/data/entries.json
```

The pack lives in `pack/`, not `.kiro/`, on purpose. Kiro only loads steering and hooks from a `.kiro/` folder, so working on these files here doesn't change how Kiro behaves in this project.

## Run the app locally

Needs Node.js 20 or later. There are no packages to install. From the `app` folder:

```
npm run dev
```

Then open http://localhost:8000 and refresh after edits. `dev` restarts the server when `server.js` changes; files in `src/` and `public/` are read fresh on every request. Use `npm start` to run it the way Databricks does, `npm run check` for a syntax check and `npm test` for the tests.

The directory is read-only: it shows `public/data/*.json` and has no Add, Edit or Delete. The one write path is `POST /api/track`, which only adds one to a copy count (see "Copy counts" below).

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

## Deploy to Databricks Apps

The `app/` folder is a complete Node.js Databricks App. Databricks sees `package.json`, runs `npm install` (nothing to download), and then `app.yaml` runs `npm run start`. The server listens on `DATABRICKS_APP_PORT`.

```
databricks apps create kiro-overdrive
databricks sync ./app /Workspace/Users/<you>/kiro-overdrive
databricks apps deploy kiro-overdrive --source-code-path /Workspace/Users/<you>/kiro-overdrive
```

To change what the app shows, edit the data or `pack/` (then `npm run sync`), then sync and deploy again.

## Copy counts and "Most popular"

Each time someone copies a file, path, install command or package command in the app, the browser sends `POST /api/track` with `{ "kind": "entries" | "packages", "id": "<id>" }`. The server adds one to that id's count and serves all counts at `GET /api/metrics`. The directory then offers a **Most popular** sort and an "N copies" badge on each card. The sort and badges stay hidden until at least one copy has been counted, or if `/api/metrics` can't be reached.

What it counts: copy actions in the web page only. It does not see installer runs, and it stores totals only (no names, no timestamps). `/api/track` accepts only ids that exist in `entries.json` and `packages.json`, allows 60 requests per minute per client, and rejects bodies over 1 KB.

The counts are one JSON file:

```json
{ "version": 1, "updatedAt": 1795132905708,
  "entries":  { "sql-review-kit": { "copies": 12 } },
  "packages": { "starter": { "copies": 5 } } }
```

**Where the file lives** is set by `METRICS_VOLUME_PATH` in `app/app.yaml`:

| Value | What happens |
|---|---|
| A real path, `/Volumes/<catalog>/<schema>/<volume>/<folder>/metrics.json` | Counts are saved in that Unity Catalog Volume and survive redeploys |
| Unset, or still the `<catalog>` placeholder (the current state) | Counts go to `app/data/metrics.json` on the app's disk, which Databricks wipes on every redeploy or restart. The server logs a warning at startup |

**Setting up the Volume** (one time, needs someone who can manage the Volume):
1. Create or pick a Volume, and a folder in it for the app.
2. Find the app's service principal on the app's **Authorization** tab in Databricks.
3. Grant that service principal `READ VOLUME` and `WRITE VOLUME` on the Volume (plus `USE CATALOG` and `USE SCHEMA` on its parents).
4. Put the full file path in `METRICS_VOLUME_PATH` in `app/app.yaml`, then redeploy.

The app signs in as that service principal using the credentials Databricks injects (`DATABRICKS_HOST`, `DATABRICKS_CLIENT_ID`, `DATABRICKS_CLIENT_SECRET`) and writes through the Files API 2.0. If the Volume can't be reached, the server keeps counting in memory and retries with a growing delay (up to 5 minutes). Counts are also saved when the app shuts down. If a path is set but the credentials are missing or the path is malformed, the server logs an error and uses the local file.

The app assumes a single running instance. With more than one, each would keep its own counts and the last one to save would win.

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
