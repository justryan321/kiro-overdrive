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
  "all" = advanced + personal files (explain-mode, brief-mode).
  Also adds Guardian's git pre-commit secret scan to the repo, unless -NoGitHook.
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
  [switch]$DryRun,
  [switch]$NoGitHook
)

$ErrorActionPreference = 'Stop'
$Src = Split-Path -Parent $PSScriptRoot
$GlobalKiro = Join-Path $HOME '.kiro'
$Protected = @('project-brain.md', 'decisions-log.md', 'brain-index.md')
$script:copied = 0; $script:skipped = 0

# Python for Guardian. Windows has no python3 command, so the hook file is rewritten to use whatever works here.
$script:Py = $null; $script:PyArgs = @()
foreach ($cmd in @('python', 'py')) {
  $pre = if ($cmd -eq 'py') { @('-3') } else { @() }
  try {
    & $cmd @pre -c 'import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)' 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $script:Py = $cmd; $script:PyArgs = $pre; break }
  } catch { }
}
$script:PyCmd = (@($script:Py) + $script:PyArgs) -join ' '

$Levels = @{ starter = 1; intermediate = 2; advanced = 3; all = 3 }
$Level = $Levels[$Package]
if ($Package -eq 'all') { $Personal = $true }

# Repo files per level (paths relative to the pack root)
$RepoFiles = @{
  1 = @('steering\no-surprises.md', 'hooks\destructive-guard.json', 'hooks\guardian-scan.json', 'scripts\guardian.py',
        'hooks\file-header-on-create.json', 'skills\standup.md', 'skills\changelog.md', 'hooks\docs-reminder-on-stop.json')
  2 = @('skills\sql-review.md', 'hooks\sql-check-on-save.json', 'skills\databricks-setup.md', 'hooks\databricks-setup-nudge.json',
        'skills\atlassian-setup.md')
  3 = @('skills\steering-doctor.md', 'skills\handoff.md', 'skills\metric-align.md', 'skills\future-purge.md')
}
$PersonalFiles = @('steering\explain-mode.md', 'steering\brief-mode.md')

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
    if ($DryRun) { Write-Host "  would $verb $name" } else {
      Copy-Item -Path $f -Destination $target -Force
      if ($name -eq 'guardian-scan.json') {
        $py = if ($script:Py) { $script:PyCmd } else { 'python' }
        [IO.File]::WriteAllText($target, ([IO.File]::ReadAllText($target)).Replace('"python3 ', '"' + $py + ' '))
      }
      Write-Host "  $verb $name"
    }
    $script:copied++
  }
}

if (-not (Test-Path $Repo)) { throw "Repo path not found: $Repo" }
$repoKiro = Join-Path (Resolve-Path $Repo) '.kiro'
$label = (Get-Culture).TextInfo.ToTitleCase($Package)
if ($DryRun) { Write-Host "DRY RUN: nothing will be written.`n" }

# --- Package files into the repo -------------------------------------------
Write-Host "$label package -> $repoKiro"
$steering = @(); $hooks = @(); $scripts = @()
foreach ($lvl in 1..$Level) {
  foreach ($rel in $RepoFiles[$lvl]) {
    $full = Join-Path $Src $rel
    if ($rel -like 'hooks\*') { $hooks += $full } elseif ($rel -like 'scripts\*') { $scripts += $full } else { $steering += $full }
  }
}
Copy-Pack -Files $steering -Dest (Join-Path $repoKiro 'steering')
Copy-Pack -Files $hooks -Dest (Join-Path $repoKiro 'hooks')
Copy-Pack -Files $scripts -Dest (Join-Path $repoKiro 'scripts')

# --- Guardian's git pre-commit secret scan (also covers GitHub Desktop) -----
Write-Host "`nGuardian commit scan -> $Repo\.git\hooks\pre-commit"
if (-not $script:Py) {
  Write-Warning 'Python 3.8+ not found. Guardian''s hooks and commit scan need it: install Python 3, then run'
  Write-Host '         python .kiro\scripts\guardian.py install-git-hook   (from the repo root)'
} elseif ($NoGitHook) { Write-Host '  skip   -NoGitHook given' }
elseif ($DryRun) { Write-Host "  would run: $script:PyCmd .kiro\scripts\guardian.py install-git-hook" }
else {
  Push-Location $Repo
  try { & $script:Py @script:PyArgs (Join-Path $repoKiro 'scripts\guardian.py') install-git-hook | ForEach-Object { "  $_" } }
  finally { Pop-Location }
}

# --- Second brain (intermediate and up) ------------------------------------
if ($Level -ge 2) {
  Write-Host "`nSecond brain -> $repoKiro and $GlobalKiro"
  Copy-Pack -Files (Get-Files 'second-brain\project\steering' '*.md') -Dest (Join-Path $repoKiro 'steering')
  Copy-Pack -Files (Get-Files 'second-brain\project\hooks' '*.json') -Dest (Join-Path $repoKiro 'hooks')
  Copy-Pack -Files (Get-Files 'second-brain\global\steering' '*.md') -Dest (Join-Path $GlobalKiro 'steering')
}

# --- Personal files (explain-mode, brief-mode) ----------------------------
if ($Personal) {
  Write-Host "`nPersonal files -> $GlobalKiro"
  Copy-Pack -Files ($PersonalFiles | ForEach-Object { Join-Path $Src $_ }) -Dest (Join-Path $GlobalKiro 'steering')
}

Write-Host "`nDone: $script:copied $(if ($DryRun) { 'would be copied' } else { 'copied' }), $script:skipped skipped."
Write-Host 'Next:'
Write-Host '  1. Open the repo in Kiro and check the Hooks panel lists the new hooks, all turned on.'
if ($Level -ge 2) { Write-Host '  2. In a new chat, type #brain-setup to fill in your brain.' }
if ($Level -ge 3) { Write-Host '  3. Type #steering-doctor to check everything loaded cleanly.' }
Write-Host '  Teammates who clone the repo run "python .kiro\scripts\guardian.py install-git-hook" once (Kiro reminds them).'
Write-Host '  4. Commit .kiro/ in the repo so the whole team gets the pack. Your global files stay personal.'
