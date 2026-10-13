<#
.SYNOPSIS
    Refresh the superpowers skills (github.com/obra/superpowers) and upload a new snapshot.

.DESCRIPTION
    1) clones or updates the upstream checkout (default <DSH_HOME>/skill-sources/superpowers),
    2) copies its skills/* into <AGENTS_HOME>/skills (replacing, backing up nothing - the
       upstream checkout is the source of truth for these skills),
    3) records version + commit in profile/manifest.json > skillSources,
    4) runs tools/sync.ps1, which re-snapshots skills/ and pushes to GitHub.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File tools\update-superpowers.ps1
    powershell -ExecutionPolicy Bypass -File tools\update-superpowers.ps1 -Check
    powershell -ExecutionPolicy Bypass -File tools\update-superpowers.ps1 -NoSync
    powershell -ExecutionPolicy Bypass -File tools\update-superpowers.ps1 -NoProxy

.NOTES
    Requires git + node on PATH. ASCII-only on purpose (parses under any code page).
#>
[CmdletBinding()]
param(
    [string]$Src = '',
    [string]$DshHome = '',
    [string]$AgentsHome = '',
    [string]$Ref = 'main',
    [string]$Upstream = 'https://github.com/obra/superpowers',
    [string]$Id = 'superpowers',
    [string]$Proxy = 'http://127.0.0.1:7897',
    [switch]$NoProxy,
    [switch]$NoSync,
    [switch]$Check
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'git not found on PATH.' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'node not found on PATH.' }

$repoRoot = Split-Path $PSScriptRoot -Parent
if (-not $DshHome) {
    if ($env:DSH_HOME) { $DshHome = $env:DSH_HOME } else { $DshHome = Join-Path $HOME '.dsh' }
}
if (-not $AgentsHome) {
    if ($env:DSH_AGENTS_HOME) { $AgentsHome = $env:DSH_AGENTS_HOME } else { $AgentsHome = Join-Path $HOME '.agents' }
}
if (-not $Src) { $Src = Join-Path $DshHome 'skill-sources\superpowers' }
$skillsDst = Join-Path $AgentsHome 'skills'

Write-Host ''
Write-Host 'superpowers skill refresh' -ForegroundColor Cyan
Write-Host "  upstream : $Upstream ($Ref)"
Write-Host "  checkout : $Src"
Write-Host "  skills   : $skillsDst"
Write-Host "  repo     : $repoRoot"
if ($Check) { Write-Host '  mode     : CHECK - nothing will be changed' -ForegroundColor Yellow }

function Invoke-Git {
    param([string[]]$GitArgs)
    Write-Host "  > git $($GitArgs -join ' ')" -ForegroundColor DarkGray
    & git @GitArgs
    if ($LASTEXITCODE -ne 0) { throw "git failed (exit $LASTEXITCODE)" }
}

# ------------------------------------------------------- 1) clone / update
function Get-Upstream {
    $attempts = @()
    if (-not $NoProxy) { $attempts += @{ label = "proxy $Proxy"; pre = @('-c', "http.proxy=$Proxy") } }
    $attempts += @{ label = 'direct'; pre = @() }
    $lastError = ''
    foreach ($a in $attempts) {
        try {
            if (Test-Path (Join-Path $Src '.git')) {
                Invoke-Git (@($a.pre) + @('-C', $Src, 'fetch', '--depth', '1', 'origin', $Ref))
                Invoke-Git (@($a.pre) + @('-C', $Src, 'reset', '--hard', 'FETCH_HEAD'))
            } else {
                New-Item -ItemType Directory -Force -Path (Split-Path $Src -Parent) | Out-Null
                Invoke-Git (@($a.pre) + @('clone', '--depth', '1', '--branch', $Ref, $Upstream, $Src))
            }
            Write-Host "  ok ($($a.label))" -ForegroundColor Green
            return
        } catch {
            $lastError = $_.Exception.Message
            Write-Warning "$($a.label) failed: $lastError"
        }
    }
    throw "could not reach $Upstream - last error: $lastError"
}

Write-Host ''
Write-Host '[1/4] upstream checkout' -ForegroundColor Green
Get-Upstream

$commit = (& git -C $Src rev-parse HEAD).Trim()
$version = ''
foreach ($meta in @('.claude-plugin\plugin.json', 'package.json')) {
    $p = Join-Path $Src $meta
    if (-not (Test-Path $p)) { continue }
    $json = Get-Content -LiteralPath $p -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($json.PSObject.Properties.Name -contains 'version' -and $json.version) { $version = $json.version; break }
}
$licenseFile = Join-Path $Src 'LICENSE'
$license = 'MIT'
Write-Host "  version  : $version"
Write-Host "  commit   : $commit"
if ($Check) {
    Write-Host ''
    Write-Host 'check only - nothing changed.' -ForegroundColor Cyan
    exit 0
}

# ------------------------------------------------------------ 2) install
Write-Host ''
Write-Host "[2/4] copy skills -> $skillsDst" -ForegroundColor Green
$srcSkills = Join-Path $Src 'skills'
if (-not (Test-Path $srcSkills)) { throw "no skills/ directory in $Src" }
New-Item -ItemType Directory -Force -Path $skillsDst | Out-Null
$copied = @()
foreach ($d in Get-ChildItem -LiteralPath $srcSkills -Directory) {
    if (-not (Test-Path (Join-Path $d.FullName 'SKILL.md'))) {
        Write-Warning "no SKILL.md, skipped: $($d.Name)"
        continue
    }
    $dst = Join-Path $skillsDst $d.Name
    if (Test-Path $dst) { Remove-Item -LiteralPath $dst -Recurse -Force }
    Copy-Item -LiteralPath $d.FullName -Destination $dst -Recurse -Force
    $copied += $d.Name
}
Write-Host "  + $($copied.Count) skills" -ForegroundColor Green

# --------------------------------------------------------- 3) provenance
Write-Host ''
Write-Host '[3/4] record provenance in profile/manifest.json' -ForegroundColor Green
& node (Join-Path $PSScriptRoot 'skill-source.mjs') --id $Id --upstream $Upstream --ref $Ref `
    --checkout $Src --license $license --version $version --commit $commit --skills ($copied -join ',')
if ($LASTEXITCODE -ne 0) { throw "skill-source.mjs failed (exit $LASTEXITCODE)" }

# ------------------------------------------------------------- 4) snapshot
Write-Host ''
Write-Host '[4/4] re-snapshot + push' -ForegroundColor Green
if ($NoSync) {
    Write-Host '  skipped (-NoSync). Run tools\sync.ps1 to snapshot + push.' -ForegroundColor Yellow
} else {
    $psExe = if (Get-Command powershell.exe -ErrorAction SilentlyContinue) { 'powershell.exe' } else { 'pwsh' }
    $syncArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $PSScriptRoot 'sync.ps1'))
    if ($NoProxy) { $syncArgs += '-NoProxy' }
    & $psExe @syncArgs
    if ($LASTEXITCODE -ne 0) { throw "sync.ps1 failed (exit $LASTEXITCODE)" }
}

Write-Host ''
Write-Host "Done. superpowers $version ($($commit.Substring(0, 7))) is live and snapshotted." -ForegroundColor Cyan
