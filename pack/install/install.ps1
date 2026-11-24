<#
.SYNOPSIS
  Kiro Overdrive installer. Installs a package (starter, intermediate, advanced or all)
  into a repo, plus personal files into your global Kiro folder.

.EXAMPLE
  # Everything: the Advanced package in the repo, the second brain, and your personal files
  .\install\install.ps1 -Repo C:\code\dc-forecast

.EXAMPLE
  # Just the Starter package, and show what would happen first
  .\install\install.ps1 -Repo C:\code\dc-forecast -Package starter -DryRun

.NOTES
  Packages are cumulative: intermediate includes starter, advanced includes intermediate.
  Intermediate and up include the second brain (repo brain + your global brain).
  "all" = advanced + personal files (explain-mode).
  Existing files are skipped unless -Force. Files that hold your notes
  (project-brain.md, decisions-log.md, brain-index.md) are never overwritten.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Repo,
  [ValidateSet('starter', 'intermediate', 'advanced', 'all')]
  [string]$Package = 'all',
  [switch]$Personal,
  [switch]$Force,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$Src = Split-Path -Parent $PSScriptRoot
$GlobalKiro = Join-Path $HOME '.kiro'
$Protected = @('project-brain.md', 'decisions-log.md', 'brain-index.md')
$script:copied = 0; $script:skipped = 0

$Levels = @{ starter = 1; intermediate = 2; advanced = 3; all = 3 }
$Level = $Levels[$Package]
if ($Package -eq 'all') { $Personal = $true }

# Repo files per level (paths relative to the pack root)
$RepoFiles = @{
  1 = @('steering\no-surprises.md', 'hooks\destructive-guard.json', 'hooks\file-header-on-create.json',
        'skills\standup.md', 'skills\changelog.md', 'hooks\docs-reminder-on-stop.json')
  2 = @('skills\sql-review.md', 'hooks\sql-check-on-save.json', 'skills\databricks-setup.md', 'hooks\databricks-setup-nudge.json')
  3 = @('skills\steering-doctor.md', 'skills\handoff.md', 'skills\metric-align.md', 'skills\future-purge.md')
}
$PersonalFiles = @('steering\explain-mode.md')

function Get-Files([string]$Dir, [string]$Filter) {
  $p = Join-Path $Src $Dir
  if (Test-Path $p) { Get-ChildItem -Path $p -Filter $Filter -File | ForEach-Object FullName } else { @() }
}

function Copy-Pack {
  param([string[]]$Files, [string]$Dest)
  if (-not $DryRun) { New-Item -ItemType Directory -Force -Path $Dest | Out-Null }
  foreach ($f in $Files) {
    if (-not (Test-Path $f)) { Write-Warning "Missing in pack: $f"; continue }
    $name = Split-Path -Leaf $f
    $target = Join-Path $Dest $name
    $exists = Test-Path $target
    if ($exists -and ($Protected -contains $name)) { Write-Host "  keep   $name (has your notes)"; $script:skipped++; continue }
    if ($exists -and -not $Force) { Write-Host "  skip   $name (exists; use -Force to overwrite)"; $script:skipped++; continue }
    $verb = if ($exists) { 'update' } else { 'add   ' }
    if ($DryRun) { Write-Host "  would $verb $name" } else { Copy-Item -Path $f -Destination $target -Force; Write-Host "  $verb $name" }
    $script:copied++
  }
}

if (-not (Test-Path $Repo)) { throw "Repo path not found: $Repo" }
$repoKiro = Join-Path (Resolve-Path $Repo) '.kiro'
$label = (Get-Culture).TextInfo.ToTitleCase($Package)
if ($DryRun) { Write-Host "DRY RUN: nothing will be written.`n" }

# --- Package files into the repo -------------------------------------------
Write-Host "$label package -> $repoKiro"
$steering = @(); $hooks = @()
foreach ($lvl in 1..$Level) {
  foreach ($rel in $RepoFiles[$lvl]) {
    $full = Join-Path $Src $rel
    if ($rel -like 'hooks\*') { $hooks += $full } else { $steering += $full }
  }
}
Copy-Pack -Files $steering -Dest (Join-Path $repoKiro 'steering')
Copy-Pack -Files $hooks -Dest (Join-Path $repoKiro 'hooks')

# --- Second brain (intermediate and up) ------------------------------------
if ($Level -ge 2) {
  Write-Host "`nSecond brain -> $repoKiro and $GlobalKiro"
  Copy-Pack -Files (Get-Files 'second-brain\project\steering' '*.md') -Dest (Join-Path $repoKiro 'steering')
  Copy-Pack -Files (Get-Files 'second-brain\project\hooks' '*.json') -Dest (Join-Path $repoKiro 'hooks')
  Copy-Pack -Files (Get-Files 'second-brain\global\steering' '*.md') -Dest (Join-Path $GlobalKiro 'steering')
}

# --- Personal files (explain-mode) ----------------------------------------
if ($Personal) {
  Write-Host "`nPersonal files -> $GlobalKiro"
  Copy-Pack -Files ($PersonalFiles | ForEach-Object { Join-Path $Src $_ }) -Dest (Join-Path $GlobalKiro 'steering')
}

Write-Host "`nDone: $script:copied $(if ($DryRun) { 'would be copied' } else { 'copied' }), $script:skipped skipped."
Write-Host 'Next:'
Write-Host '  1. Open the repo in Kiro and check the Hooks panel lists the new hooks, all turned on.'
if ($Level -ge 2) { Write-Host '  2. In a new chat, type #brain-setup to fill in your brain.' }
if ($Level -ge 3) { Write-Host '  3. Type #steering-doctor to check everything loaded cleanly.' }
Write-Host '  4. Commit .kiro/ in the repo so the whole team gets the pack. Your global files stay personal.'
