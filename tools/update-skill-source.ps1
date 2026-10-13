<#
.SYNOPSIS
    Refresh one external skill source into the live DSH skill library and upload a new snapshot.

.DESCRIPTION
    Generic engine behind tools\update-superpowers.ps1 and tools\update-gamedesignos.ps1:
    1) clones or updates the upstream checkout (default <DSH_HOME>/skill-sources/<Id>),
    2) copies its skill directories into <AGENTS_HOME>/skills (upstream wins; the copy is
       skipped when the checkout is already at the commit recorded in profile/manifest.json,
       unless -Force is given),
    3) records version + commit + kept-skill list in profile/manifest.json > skillSources,
    4) runs tools/sync.ps1, which re-snapshots skills/ and pushes to GitHub.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File tools\update-skill-source.ps1 -Id superpowers `
        -Upstream https://github.com/obra/superpowers -Label superpowers
    powershell -ExecutionPolicy Bypass -File tools\update-skill-source.ps1 -Id gamedesignos `
        -Upstream https://github.com/DY-2026/GameDesignOS -Label GameDesignOS -SkillsSubdir ''

.NOTES
    Requires git + node on PATH. ASCII-only on purpose (parses under any code page).
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Id,
    [Parameter(Mandatory = $true)][string]$Upstream,
    [string]$Label = '',
    [string]$Ref = 'main',
    [string]$Src = '',
    [string]$SkillsSubdir = 'skills',
    [string[]]$SparsePath = @(),
    [switch]$SelfRoot,
    [string]$WrapFile = '',
    [string]$DshHome = '',
    [string]$AgentsHome = '',
    [string]$Proxy = 'http://127.0.0.1:7897',
    [string]$License = 'MIT',
    [switch]$NoProxy,
    [switch]$NoSync,
    [switch]$Force,
    [switch]$Check
)

$ErrorActionPreference = 'Stop'
if (-not $Label) { $Label = $Id }

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'git not found on PATH.' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'node not found on PATH.' }

$repoRoot = Split-Path $PSScriptRoot -Parent
if (-not $DshHome) {
    if ($env:DSH_HOME) { $DshHome = $env:DSH_HOME } else { $DshHome = Join-Path $HOME '.dsh' }
}
if (-not $AgentsHome) {
    if ($env:DSH_AGENTS_HOME) { $AgentsHome = $env:DSH_AGENTS_HOME } else { $AgentsHome = Join-Path $HOME '.agents' }
}
if (-not $Src) { $Src = Join-Path $DshHome ("skill-sources\$Id") }
if ($SkillsSubdir -and $SkillsSubdir -ne '.') { $srcSkills = Join-Path $Src $SkillsSubdir } else { $srcSkills = $Src }
$skillsDst = Join-Path $AgentsHome 'skills'
$manifestPath = Join-Path $repoRoot 'profile\manifest.json'

Write-Host ''
Write-Host "$Label skill refresh" -ForegroundColor Cyan
Write-Host "  upstream : $Upstream ($Ref)"
Write-Host "  checkout : $Src"
Write-Host "  skills   : $srcSkills"
Write-Host "  target   : $skillsDst"
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
                if ($SparsePath.Count -gt 0) { Invoke-Git (@($a.pre) + @('-C', $Src, 'sparse-checkout', 'set') + $SparsePath) }
            } elseif ($SparsePath.Count -gt 0) {
                New-Item -ItemType Directory -Force -Path (Split-Path $Src -Parent) | Out-Null
                Invoke-Git (@($a.pre) + @('clone', '--depth', '1', '--filter=blob:none', '--sparse', $Upstream, $Src))
                Invoke-Git (@($a.pre) + @('-C', $Src, 'sparse-checkout', 'set') + $SparsePath)
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

# Version: a harness plugin manifest first, then the Python package convention.
function Get-SourceVersion {
    param([string]$Root)
    foreach ($rel in @('.claude-plugin\plugin.json', 'package.json')) {
        $p = Join-Path $Root $rel
        if (-not (Test-Path $p)) { continue }
        try { $j = Get-Content -LiteralPath $p -Raw -Encoding UTF8 | ConvertFrom-Json } catch { continue }
        if ($j.PSObject.Properties.Name -contains 'version' -and $j.version) { return [string]$j.version }
    }
    $candidates = @((Join-Path $Root '_version.py'))
    foreach ($d in (Get-ChildItem -LiteralPath $Root -Directory -ErrorAction SilentlyContinue)) {
        $candidates += (Join-Path $d.FullName '_version.py')
    }
    foreach ($c in $candidates) {
        if (-not (Test-Path $c)) { continue }
        $m = Select-String -LiteralPath $c -Pattern 'VERSION\s*=\s*[''"]([^''"]+)[''"]' | Select-Object -First 1
        if ($m) { return $m.Matches.Groups[1].Value }
    }
    $pp = Join-Path $Root 'pyproject.toml'
    if (Test-Path $pp) {
        $m = Select-String -LiteralPath $pp -Pattern '^\s*version\s*=\s*[''"]([^''"]+)[''"]' | Select-Object -First 1
        if ($m) { return $m.Matches.Groups[1].Value }
    }
    return ''
}

$version = Get-SourceVersion -Root $Src
Write-Host "  version  : $version"
Write-Host "  commit   : $commit"
if ($Check) {
    Write-Host ''
    Write-Host 'check only - nothing changed.' -ForegroundColor Cyan
    exit 0
}

# previous commit recorded for this source (lets a daily run skip the copy)
$prevCommit = ''
$prevSkills = @()
if (Test-Path $manifestPath) {
    try {
        $prevManifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
        foreach ($s in @($prevManifest.skillSources)) {
            if ($s.id -eq $Id) { $prevCommit = [string]$s.commit; $prevSkills = @($s.skills) }
        }
    } catch { Write-Warning "could not read $manifestPath ($($_.Exception.Message))" }
}

# ------------------------------------------------------------ 2) install
Write-Host ''
Write-Host "[2/4] copy skills -> $skillsDst" -ForegroundColor Green
$sameCommit = ($prevCommit -and $prevCommit -eq $commit)
if ($sameCommit -and -not $Force -and $prevSkills.Count -gt 0) {
    Write-Host "  = already at $($commit.Substring(0, 7)) with $($prevSkills.Count) recorded skills - copy skipped (-Force to redo)" -ForegroundColor Yellow
    $copied = @($prevSkills)
} elseif ($SelfRoot) {
    # the checkout root IS the skill (e.g. eze-is/web-access): install it whole, named by its own front matter
    $selfMd = Join-Path $Src 'SKILL.md'
    if (-not (Test-Path $selfMd)) { throw "SelfRoot mode needs a SKILL.md at $Src" }
    $m = Select-String -LiteralPath $selfMd -Pattern '^name:\s*(.+)$' | Select-Object -First 1
    $name = if ($m) { $m.Matches.Groups[1].Value.Trim().Trim('"', "'") } else { Split-Path $Src -Leaf }
    $dst = Join-Path $skillsDst $name
    if (Test-Path $dst) { Remove-Item -LiteralPath $dst -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $dst | Out-Null
    Get-ChildItem -LiteralPath $Src -Force | Where-Object { $_.Name -ne '.git' } | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $dst $_.Name) -Recurse -Force
    }
    $copied = @($name)
    Write-Host "  + $name (self-root: whole checkout minus .git)" -ForegroundColor Green
} elseif ($WrapFile) {
    # upstream ships a bare document instead of a SKILL.md (e.g. a Claude Code command):
    # mirror it next to a hand-written SKILL.md and report whether the upstream text moved.
    $parts = $WrapFile.Split('=', 3)
    $name = $parts[0].Trim()
    $rel = if ($parts.Count -gt 1) { $parts[1].Trim() } else { '' }
    $dst = Join-Path $skillsDst $name
    if (-not (Test-Path (Join-Path $dst 'SKILL.md'))) { throw "wrapped skill '$name' needs a hand-written SKILL.md at $dst" }
    $upstreamFile = Join-Path $Src $rel
    if (-not (Test-Path $upstreamFile) -and $srcSkills) {
        # -WrapFile paths are usually relative to -SkillsSubdir (e.g. commands/x.md under plugins/code-review)
        $alt = Join-Path $srcSkills $rel
        if (Test-Path $alt) { $upstreamFile = $alt }
    }
    if (-not (Test-Path $upstreamFile)) { throw "wrapped source file not found: $upstreamFile" }
    $base = [IO.Path]::GetFileNameWithoutExtension($upstreamFile)
    $mirror = Join-Path $dst "upstream-$base.md"
    $newText = Get-Content -LiteralPath $upstreamFile -Raw
    $oldText = if (Test-Path $mirror) { Get-Content -LiteralPath $mirror -Raw } else { $null }
    Copy-Item -LiteralPath $upstreamFile -Destination $mirror -Force
    $copied = @($name)
    if ($oldText -ne $newText) {
        Write-Host "  ~ mirrored $rel -> upstream-$base.md (CHANGED - review the hand-written SKILL.md)" -ForegroundColor Yellow
    } else {
        Write-Host "  ~ mirrored $rel -> upstream-$base.md (unchanged)" -ForegroundColor Green
    }
} else {
    if (-not (Test-Path $srcSkills)) { throw "no skill directory at $srcSkills" }
    New-Item -ItemType Directory -Force -Path $skillsDst | Out-Null
    $copied = @()
    foreach ($d in Get-ChildItem -LiteralPath $srcSkills -Directory) {
        if (-not (Test-Path (Join-Path $d.FullName 'SKILL.md'))) { continue }
        $dst = Join-Path $skillsDst $d.Name
        if (Test-Path $dst) { Remove-Item -LiteralPath $dst -Recurse -Force }
        Copy-Item -LiteralPath $d.FullName -Destination $dst -Recurse -Force
        $copied += $d.Name
    }
    Write-Host "  + $($copied.Count) skills" -ForegroundColor Green
}

# --------------------------------------------------------- 3) provenance
Write-Host ''
Write-Host '[3/4] record provenance in profile/manifest.json' -ForegroundColor Green
& node (Join-Path $PSScriptRoot 'skill-source.mjs') --id $Id --upstream $Upstream --ref $Ref `
    --checkout $Src --license $License --version $version --commit $commit --skills ($copied -join ',')
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
if ($NoSync) {
    Write-Host "Done. $Label $version ($($commit.Substring(0, 7))) is live (snapshot skipped)." -ForegroundColor Cyan
    Write-Host 'Run tools\sync.ps1 to snapshot + push.'
} else {
    Write-Host "Done. $Label $version ($($commit.Substring(0, 7))) is live and snapshotted." -ForegroundColor Cyan
}
