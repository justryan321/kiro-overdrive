#!/usr/bin/env bash
# Kiro Overdrive installer (macOS/Linux). Windows: use install.ps1.
#
# Usage:
#   ./install/install.sh --repo ~/code/dc-forecast                       # everything
#   ./install/install.sh --repo ~/code/dc-forecast --package starter --dry-run
#
# Packages are cumulative: intermediate includes starter, advanced includes intermediate.
# Intermediate and up include the second brain. "all" = advanced + personal files.
# Existing files are skipped unless --force. Files that hold your notes
# (project-brain.md, decisions-log.md, brain-index.md) are never overwritten.
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GLOBAL_KIRO="$HOME/.kiro"
REPO="" PACKAGE="all" PERSONAL=0 FORCE=0 DRY=0
COPIED=0 SKIPPED=0

usage() { sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) REPO="${2:?--repo needs a path}"; shift 2 ;;
    --package) PACKAGE="${2:?--package needs starter|intermediate|advanced|all}"; shift 2 ;;
    --personal) PERSONAL=1; shift ;;
    --force) FORCE=1; shift ;;
    --dry-run) DRY=1; shift ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

[[ -n "$REPO" ]] || usage
case "$PACKAGE" in
  starter) LEVEL=1 ;; intermediate) LEVEL=2 ;; advanced) LEVEL=3 ;; all) LEVEL=3; PERSONAL=1 ;;
  *) echo "--package must be starter, intermediate, advanced or all"; exit 1 ;;
esac

L1=(steering/no-surprises.md hooks/destructive-guard.json skills/onboard-me.md hooks/file-header-on-create.json
    skills/standup.md skills/changelog.md hooks/docs-reminder-on-stop.json)
L2=(skills/sql-review.md hooks/sql-check-on-save.json skills/ticket-to-spec.md)
L3=(steering/output-formats.md skills/steering-doctor.md skills/handoff.md skills/metric-align.md skills/future-purge.md)
PERSONAL_FILES=(steering/explain-mode.md steering/claude-code-style.md steering/codex-style.md)

is_protected() { case "$1" in project-brain.md|decisions-log.md|brain-index.md) return 0 ;; *) return 1 ;; esac; }

copy_pack() {  # copy_pack <dest> <file>...
  local dest="$1"; shift
  [[ $DRY -eq 1 ]] || mkdir -p "$dest"
  local f name target verb
  for f in "$@"; do
    [[ -f "$f" ]] || { echo "  warn   missing in pack: $f"; continue; }
    name="$(basename "$f")"; target="$dest/$name"
    if [[ -e "$target" ]] && is_protected "$name"; then echo "  keep   $name (has your notes)"; SKIPPED=$((SKIPPED+1)); continue; fi
    if [[ -e "$target" && $FORCE -eq 0 ]]; then echo "  skip   $name (exists; use --force to overwrite)"; SKIPPED=$((SKIPPED+1)); continue; fi
    if [[ -e "$target" ]]; then verb="update"; else verb="add   "; fi
    if [[ $DRY -eq 1 ]]; then echo "  would $verb $name"; else cp "$f" "$target"; echo "  $verb $name"; fi
    COPIED=$((COPIED+1))
  done
}

files_in() { local d="$SRC/$1"; [[ -d "$d" ]] || return 0; find "$d" -maxdepth 1 -type f -name "$2" | sort; }

[[ -d "$REPO" ]] || { echo "Repo path not found: $REPO"; exit 1; }
REPO_KIRO="$(cd "$REPO" && pwd)/.kiro"
[[ $DRY -eq 1 ]] && echo "DRY RUN: nothing will be written." && echo

rel=("${L1[@]}"); (( LEVEL >= 2 )) && rel+=("${L2[@]}"); (( LEVEL >= 3 )) && rel+=("${L3[@]}")
steer=() hks=()
for r in "${rel[@]}"; do if [[ "$r" == hooks/* ]]; then hks+=("$SRC/$r"); else steer+=("$SRC/$r"); fi; done

echo "${PACKAGE^} package -> $REPO_KIRO"
copy_pack "$REPO_KIRO/steering" "${steer[@]}"
copy_pack "$REPO_KIRO/hooks" "${hks[@]}"

if (( LEVEL >= 2 )); then
  echo; echo "Second brain -> $REPO_KIRO and $GLOBAL_KIRO"
  mapfile -t bs < <(files_in second-brain/project/steering '*.md')
  mapfile -t bh < <(files_in second-brain/project/hooks '*.json')
  mapfile -t gs < <(files_in second-brain/global/steering '*.md')
  copy_pack "$REPO_KIRO/steering" "${bs[@]}"
  copy_pack "$REPO_KIRO/hooks" "${bh[@]}"
  copy_pack "$GLOBAL_KIRO/steering" "${gs[@]}"
fi

if [[ $PERSONAL -eq 1 ]]; then
  echo; echo "Personal files -> $GLOBAL_KIRO"
  pf=(); for r in "${PERSONAL_FILES[@]}"; do pf+=("$SRC/$r"); done
  copy_pack "$GLOBAL_KIRO/steering" "${pf[@]}"
fi

echo; if [[ $DRY -eq 1 ]]; then echo "Done: $COPIED would be copied, $SKIPPED skipped."; else echo "Done: $COPIED copied, $SKIPPED skipped."; fi
echo "Next:"
echo "  1. Open the repo in Kiro and check the Hooks panel lists the new hooks, all turned on."
(( LEVEL >= 2 )) && echo "  2. In a new chat, type #brain-setup to fill in your brain."
echo "  3. Type #onboard-me for a tour of the repo."
(( LEVEL >= 3 )) && echo "  4. Type #steering-doctor to check everything loaded cleanly."
echo "  5. Commit .kiro/ in the repo so the whole team gets the pack. Your global files stay personal."
exit 0
