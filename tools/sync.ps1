# tools/sync.ps1 - refresh this repo's DSH plugin snapshot and push it.
#
#   powershell -ExecutionPolicy Bypass -File tools\sync.ps1
#
# Steps: node tools/sync.mjs  ->  git add -A  ->  commit only when something
# changed  ->  push (with the local proxy first, without it as a fallback).
# ASCII-only on purpose: parses under Windows PowerShell 5.1 with a GBK codepage.
[CmdletBinding()]
param(
  [string]$Profile = 'desktop',
  [string]$DshHome = '',
  [string]$Proxy = 'http://127.0.0.1:7897',
  [string]$Branch = 'main',
  [string]$Message = '',
  [string]$GitName = 'jh604106966',
  [string]$GitEmail = '604106966@qq.com',
  [switch]$Check,
  [switch]$NoPush,
  [switch]$NoProxy
)

$ErrorActionPreference = 'Stop'

function Fail([string]$msg) {
  Write-Host "x $msg" -ForegroundColor Red
  exit 1
}

$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { Fail 'node not found in PATH' }

$syncArgs = @('tools/sync.mjs', '--profile', $Profile)
if ($DshHome) { $syncArgs += @('--dsh-home', $DshHome) }
if ($Check) { $syncArgs += '--check' }

& $node @syncArgs
if ($LASTEXITCODE -ne 0) { Fail "tools/sync.mjs exited with code $LASTEXITCODE" }
if ($Check) { exit 0 }

# repo-local git identity (a global .gitconfig is not guaranteed on Windows)
if (-not (git config --local --get user.name)) { git config --local user.name $GitName }
if (-not (git config --local --get user.email)) { git config --local user.email $GitEmail }

git add -A
$pending = @(git status --porcelain)
if ($pending.Count -eq 0) {
  Write-Host 'OK: snapshot already up to date - nothing to upload.'
  exit 0
}
Write-Host ''
Write-Host "changes to upload ($($pending.Count) paths):"
$pending | Select-Object -First 40 | ForEach-Object { Write-Host "  $_" }
if ($pending.Count -gt 40) { Write-Host "  ... and $($pending.Count - 40) more" }

if (-not $Message) { $Message = 'sync: plugin snapshot ' + (Get-Date -Format 'yyyy-MM-dd HH:mm') }
$body = ($pending | Select-Object -First 40) -join "`n"
git commit -m $Message -m $body | Out-Null
if ($LASTEXITCODE -ne 0) { Fail 'git commit failed' }
Write-Host "committed: $Message"

if ($NoPush) {
  Write-Host 'NoPush set - commit kept locally, run "git push origin ' + $Branch + '" when ready.'
  exit 0
}

$ok = $false
if ($Proxy -and -not $NoProxy) {
  git -c "http.proxy=$Proxy" push -u origin $Branch
  if ($LASTEXITCODE -eq 0) { $ok = $true }
  else { Write-Host '! push through the proxy failed - retrying without it' }
}
if (-not $ok) {
  git push -u origin $Branch
  if ($LASTEXITCODE -eq 0) { $ok = $true }
}
if (-not $ok) { Fail "push failed - the commit is local, fix the network and run: git push origin $Branch" }
Write-Host 'uploaded.'
