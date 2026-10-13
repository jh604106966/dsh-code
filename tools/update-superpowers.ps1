<#
.SYNOPSIS
    Refresh the superpowers skills (github.com/obra/superpowers) and upload a new snapshot.

.DESCRIPTION
    Thin wrapper over tools\update-skill-source.ps1 - that script documents the four steps
    (upstream checkout -> copy skills -> record provenance -> re-snapshot + push).

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File tools\update-superpowers.ps1
    powershell -ExecutionPolicy Bypass -File tools\update-superpowers.ps1 -Check
    powershell -ExecutionPolicy Bypass -File tools\update-superpowers.ps1 -NoSync
    powershell -ExecutionPolicy Bypass -File tools\update-superpowers.ps1 -Force -NoProxy

.NOTES
    Requires git + node on PATH. ASCII-only on purpose.
#>
[CmdletBinding()]
param(
    [string]$Src = '',
    [string]$DshHome = '',
    [string]$AgentsHome = '',
    [string]$Ref = 'main',
    [switch]$NoProxy,
    [switch]$NoSync,
    [switch]$Force,
    [switch]$Check
)

$engine = Join-Path $PSScriptRoot 'update-skill-source.ps1'
$engineArgs = @{
    Id           = 'superpowers'
    Label        = 'superpowers'
    Upstream     = 'https://github.com/obra/superpowers'
    Ref          = $Ref
    SkillsSubdir = 'skills'
    License      = 'MIT'
    NoProxy      = $NoProxy
    NoSync       = $NoSync
    Force        = $Force
    Check        = $Check
}
if ($Src) { $engineArgs.Src = $Src }
if ($DshHome) { $engineArgs.DshHome = $DshHome }
if ($AgentsHome) { $engineArgs.AgentsHome = $AgentsHome }

& $engine @engineArgs
exit $LASTEXITCODE
