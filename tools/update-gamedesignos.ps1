<#
.SYNOPSIS
    Refresh the GameDesignOS skills (github.com/DY-2026/GameDesignOS) and upload a new snapshot.

.DESCRIPTION
    Thin wrapper over tools\update-skill-source.ps1. GameDesignOS keeps its seven skill
    folders at the repository root (no skills/ subdirectory), so -SkillsSubdir is empty;
    the engine still only copies directories that carry a SKILL.md.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File tools\update-gamedesignos.ps1
    powershell -ExecutionPolicy Bypass -File tools\update-gamedesignos.ps1 -Check
    powershell -ExecutionPolicy Bypass -File tools\update-gamedesignos.ps1 -NoSync

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
    Id            = 'gamedesignos'
    Label         = 'GameDesignOS'
    Upstream      = 'https://github.com/DY-2026/GameDesignOS'
    Ref           = $Ref
    SkillsSubdir  = '.'   # the seven skill folders sit at the repository root
    License       = 'MIT'
    NoProxy       = $NoProxy
    NoSync        = $NoSync
    Force         = $Force
    Check         = $Check
}
if ($Src) { $engineArgs.Src = $Src }
if ($DshHome) { $engineArgs.DshHome = $DshHome }
if ($AgentsHome) { $engineArgs.AgentsHome = $AgentsHome }

& $engine @engineArgs
exit $LASTEXITCODE
