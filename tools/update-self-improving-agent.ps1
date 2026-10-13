<#
.SYNOPSIS
    Refresh BerriAI/self-improving-agent, which ships its "skill" as a bare markdown file.

.DESCRIPTION
    Upstream has no SKILL.md (only skills/feedback.md), so the generic engine
    tools\update-skill-source.ps1 cannot copy it - it would fail with
    "no skill directory". This wrapper:
      1. fetches the checkout (clone when missing),
      2. mirrors skills/feedback.md into the live skill as upstream-feedback.md,
      3. warns when the upstream text changed (the hand-written SKILL.md wrapper
         in the live skill may then need a review),
      4. records provenance via tools\skill-source.mjs,
      5. runs tools\sync.ps1 unless -NoSync.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File tools\update-self-improving-agent.ps1
    powershell -ExecutionPolicy Bypass -File tools\update-self-improving-agent.ps1 -Check

.NOTES
    ASCII-only on purpose. Requires git + node on PATH.
#>
[CmdletBinding()]
param(
    [string]$Id = 'self-improving-agent',
    [string]$Upstream = 'https://github.com/BerriAI/self-improving-agent',
    [string]$Ref = 'main',
    [string]$Src = '',
    [string]$DshHome = '',
    [string]$AgentsHome = '',
    [string]$Proxy = 'http://127.0.0.1:7897',
    [switch]$NoProxy,
    [switch]$NoSync,
    [switch]$Check
)

$ErrorActionPreference = 'Continue'
$repo = Split-Path $PSScriptRoot -Parent
if (-not $DshHome) { $DshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME '.dsh' } }
if (-not $Src) { $Src = Join-Path (Join-Path $DshHome 'skill-sources') $Id }
if (-not $AgentsHome) { $AgentsHome = if ($env:DSH_AGENTS_HOME) { $env:DSH_AGENTS_HOME } else { Join-Path $HOME '.agents' } }
$live = Join-Path (Join-Path $AgentsHome 'skills') $Id
$upstreamMd = Join-Path $Src 'skills\feedback.md'
$mirror = Join-Path $live 'upstream-feedback.md'

Write-Host ''
Write-Host ('#' * 72)
Write-Host "$Id skill refresh (wrapped source - upstream ships no SKILL.md)"
Write-Host "  upstream : $Upstream ($Ref)"
Write-Host "  checkout : $Src"
Write-Host "  live     : $live"

# [1/4] checkout
Write-Host ''
Write-Host '[1/4] upstream checkout'
$gitArgs = @()
if (-not $NoProxy -and $Proxy) { $gitArgs += @('-c', "http.proxy=$Proxy") }
if (Test-Path (Join-Path $Src '.git')) {
    & git @gitArgs -C $Src fetch --depth 1 origin $Ref
    & git @gitArgs -C $Src reset --hard FETCH_HEAD
} else {
    New-Item -ItemType Directory -Force -Path (Split-Path $Src -Parent) | Out-Null
    & git @gitArgs clone --depth 1 --branch $Ref $Upstream $Src
}
if (-not (Test-Path $upstreamMd)) { throw "upstream skill text not found: $upstreamMd" }
$commit = (& git -C $Src rev-parse HEAD).Trim()
$pkg = Join-Path $Src 'package.json'
$version = if (Test-Path $pkg) { (Get-Content -Raw $pkg | ConvertFrom-Json).version } else { '' }
Write-Host "  commit   : $commit"
Write-Host "  version  : $version"

# [2/4] mirror the upstream text
Write-Host ''
Write-Host '[2/4] mirror skills/feedback.md -> live skill'
$newText = Get-Content -Raw $upstreamMd
$oldText = if (Test-Path $mirror) { Get-Content -Raw $mirror } else { $null }
$changed = ($null -eq $oldText) -or ($oldText -ne $newText)
if ($changed) {
    if ($Check) {
        Write-Host '  upstream text DIFFERS from the mirrored copy (-Check: nothing written)'
    } else {
        New-Item -ItemType Directory -Force -Path $live | Out-Null
        Copy-Item -LiteralPath $upstreamMd -Destination $mirror -Force
        Write-Host '  mirrored (content changed)'
        Write-Host '  NOTE: review the hand-written SKILL.md in the live skill if upstream guidance moved.'
    }
} else {
    Write-Host '  mirrored copy already current'
}

# [3/4] provenance
Write-Host ''
Write-Host '[3/4] record provenance'
if (-not $Check) {
    $node = (Get-Command node -ErrorAction SilentlyContinue).Source
    if (-not $node) { throw 'node not found on PATH' }
    $ss = Join-Path $PSScriptRoot 'skill-source.mjs'
    & $node $ss --id $Id --upstream $Upstream --ref $Ref --checkout $Src --license MIT `
        --version $version --commit $commit --skills $Id
}

# [4/4] snapshot + push
Write-Host ''
Write-Host '[4/4] snapshot + push'
if ($NoSync -or $Check) {
    Write-Host '  skipped (-NoSync / -Check)'
} else {
    & (Join-Path $PSScriptRoot 'sync.ps1')
}

Write-Host ''
Write-Host "Done. $Id $version ($($commit.Substring(0,7))) refreshed."
