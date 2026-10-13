<#
.SYNOPSIS
    Install/refresh a ClawHub skill into the live DSH skill library.

.DESCRIPTION
    ClawHub (clawhub.ai) installs skills NESTED under a namespace directory
    (skills\<owner>\<name>), which DSH's filesystem skill root does not scan, so this
    wrapper: 1) runs `npx clawhub@latest install <slug> --workdir <agentsHome> --dir skills`,
    2) flattens skills\<owner>\<name> -> skills\<name>, 3) records provenance from
    .clawhub\origin.json via tools\skill-source.mjs, 4) runs tools\sync.ps1.

    The default slug @steipete/github is the most-installed skill whose bare name is
    `github` (28 installs/60d, MIT-0). Swap -Skill to use another candidate.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File tools\update-clawhub-github.ps1
    powershell -ExecutionPolicy Bypass -File tools\update-clawhub-github.ps1 -Skill '@thcjp/github' -Name github

.NOTES
    ASCII-only on purpose. Needs node/npx on PATH and the local proxy for the registry.
#>
[CmdletBinding()]
param(
    [string]$Skill = '@steipete/github',
    [string]$Name = 'github',
    [string]$Id = 'clawhub-github',
    [string]$AgentsHome = '',
    [string]$Proxy = 'http://127.0.0.1:7897',
    [switch]$NoProxy,
    [switch]$NoSync,
    [switch]$Check
)

$ErrorActionPreference = 'Continue'
if (-not $AgentsHome) { $AgentsHome = if ($env:DSH_AGENTS_HOME) { $env:DSH_AGENTS_HOME } else { Join-Path $HOME '.agents' } }
$skillsDst = Join-Path $AgentsHome 'skills'
$live = Join-Path $skillsDst $Name

Write-Host ''
Write-Host ('#' * 72)
Write-Host "ClawHub skill refresh: $Skill"
Write-Host "  agents home : $AgentsHome"
Write-Host "  live skill  : $live"

if (-not $NoProxy -and $Proxy) {
    $env:HTTP_PROXY = $Proxy; $env:HTTPS_PROXY = $Proxy
    $env:npm_config_proxy = $Proxy; $env:npm_config_https_proxy = $Proxy
}
if ($Check) { Write-Host 'check only - nothing changed.' -ForegroundColor Cyan; exit 0 }

# [1/4] install through the ClawHub CLI (writes the nested namespace layout)
Write-Host ''
Write-Host '[1/4] clawhub install'
& npx.cmd --yes clawhub@latest install $Skill --workdir $AgentsHome --dir skills --no-input
if ($LASTEXITCODE -ne 0) { throw "clawhub install failed (exit $LASTEXITCODE)" }

# [2/4] flatten skills\<owner>\<name> -> skills\<name>
Write-Host ''
Write-Host '[2/4] flatten namespace directory'
$owner = ($Skill -replace '^@', '').Split('/')[0]
$nested = Join-Path (Join-Path $skillsDst "@$owner") $Name
if (-not (Test-Path $nested)) { $nested = Join-Path (Join-Path $skillsDst $owner) $Name }
if (-not (Test-Path $nested)) { throw "installed skill not found (looked for $nested)" }
if (Test-Path -LiteralPath $live) { Remove-Item -LiteralPath $live -Recurse -Force }
Copy-Item -LiteralPath $nested -Destination $live -Recurse -Force
Remove-Item -LiteralPath (Split-Path $nested -Parent) -Recurse -Force
Write-Host "  + $Name installed flat"

# [3/4] provenance from .clawhub\origin.json
Write-Host ''
Write-Host '[3/4] record provenance'
$version = ''
$fingerprint = ''
$origin = Join-Path $live '.clawhub\origin.json'
if (Test-Path $origin) {
    $o = Get-Content -LiteralPath $origin -Raw | ConvertFrom-Json
    $version = [string]$o.installedVersion
    $fingerprint = ([string]$o.fingerprint)
    Write-Host "  origin: registry=$($o.registry) owner=$($o.ownerHandle) version=$version"
}
if ($fingerprint.Length -gt 12) { $fingerprint = $fingerprint.Substring(0, 12) }
& node (Join-Path $PSScriptRoot 'skill-source.mjs') --id $Id --upstream "https://clawhub.ai/$owner/skills/$Name" `
    --ref registry --checkout $live --license MIT-0 --version $version --commit $fingerprint --skills $Name
if ($LASTEXITCODE -ne 0) { throw "skill-source.mjs failed (exit $LASTEXITCODE)" }

# [4/4] snapshot + push
Write-Host ''
Write-Host '[4/4] snapshot + push'
if ($NoSync) {
    Write-Host '  skipped (-NoSync)' -ForegroundColor Yellow
} else {
    & (Join-Path $PSScriptRoot 'sync.ps1')
    if ($LASTEXITCODE -ne 0) { throw "sync.ps1 failed (exit $LASTEXITCODE)" }
}
Write-Host ''
Write-Host "Done. ClawHub $Skill -> skills\$Name ($version)." -ForegroundColor Cyan
