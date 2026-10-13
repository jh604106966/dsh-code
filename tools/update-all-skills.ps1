<#
.SYNOPSIS
    Refresh every recorded external skill source, then snapshot + push once per source.

.DESCRIPTION
    Table-driven front end for tools\update-skill-source.ps1. Add a row to $sources when
    a new upstream appears; the daily task (tools\auto-sync.cmd) calls this script.

    Each row: Id, Label, Upstream, SkillsSubdir ('.' = skill folders live at the repo
    root), and optionally Ref and SparsePath (check out only those paths - used for
    monorepos such as wshobson/agents and anthropics/skills).

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File tools\update-all-skills.ps1
    powershell -ExecutionPolicy Bypass -File tools\update-all-skills.ps1 -Check
    powershell -ExecutionPolicy Bypass -File tools\update-all-skills.ps1 -Only superpowers,gamedesignos

.NOTES
    Requires git + node on PATH. ASCII-only on purpose.
#>
[CmdletBinding()]
param(
    [string]$DshHome = '',
    [string]$AgentsHome = '',
    [string[]]$Only = @(),
    [switch]$NoProxy,
    [switch]$NoSync,
    [switch]$Force,
    [switch]$Check
)

$ErrorActionPreference = 'Continue'

$sources = @(
    @{ Id = 'superpowers';           Label = 'superpowers';            Upstream = 'https://github.com/obra/superpowers';              SkillsSubdir = 'skills' },
    @{ Id = 'gamedesignos';          Label = 'GameDesignOS';           Upstream = 'https://github.com/DY-2026/GameDesignOS';          SkillsSubdir = '.' },
    @{ Id = 'ui-ux-pro-max-skill';   Label = 'ui-ux-pro-max-skill';    Upstream = 'https://github.com/nextlevelbuilder/ui-ux-pro-max-skill'; SkillsSubdir = '.claude/skills' },
    @{ Id = 'agents-interaction-design'; Label = 'agents/interaction-design'; Upstream = 'https://github.com/wshobson/agents';        SkillsSubdir = 'plugins/ui-design/skills'; SparsePath = @('plugins/ui-design/skills/interaction-design') },
    @{ Id = 'anthropics-skills';     Label = 'anthropics/skills';      Upstream = 'https://github.com/anthropics/skills';             SkillsSubdir = 'skills'; SparsePath = @('skills/academy-guide','skills/algorithmic-art','skills/brand-guidelines','skills/canvas-design','skills/claude-api','skills/discernment-nudge','skills/doc-coauthoring','skills/docx','skills/frontend-design','skills/internal-comms','skills/mcp-builder','skills/pdf','skills/pptx','skills/skill-creator','skills/slack-gif-creator','skills/theme-factory','skills/web-artifacts-builder','skills/webapp-testing','skills/xlsx') },
    @{ Id = 'github-skill-forge';    Label = 'github-skill-forge';     Upstream = 'https://github.com/YuJunZhiXue/github-skill-forge'; SkillsSubdir = '.' },
    @{ Id = 'vercel-labs-skills';    Label = 'vercel-labs/skills';     Upstream = 'https://github.com/vercel-labs/skills';            SkillsSubdir = 'skills' },
    @{ Id = 'planning-with-files';   Label = 'planning-with-files';   Upstream = 'https://github.com/OthmanAdi/planning-with-files'; SkillsSubdir = 'skills'; Ref = 'master' },
    @{ Id = 'web-access';            Label = 'eze-is/web-access';      Upstream = 'https://github.com/eze-is/web-access';            SkillsSubdir = '@self'; SelfRoot = $true },
    @{ Id = 'claude-code-code-review'; Label = 'anthropics/claude-code (code-review command)'; Upstream = 'https://github.com/anthropics/claude-code'; SkillsSubdir = 'plugins/code-review'; SparsePath = @('plugins/code-review'); WrapFile = 'code-review=commands/code-review.md' }
)

$engine = Join-Path $PSScriptRoot 'update-skill-source.ps1'
$failed = @()
foreach ($s in $sources) {
    if ($Only.Count -gt 0 -and ($Only -notcontains $s.Id)) { continue }
    Write-Host ''
    Write-Host ("#" * 72) -ForegroundColor DarkGray
    $engineArgs = @{
        Id           = $s.Id
        Label        = $s.Label
        Upstream     = $s.Upstream
        Ref          = ($(if ($s.Ref) { $s.Ref } else { 'main' }))
        SkillsSubdir = $s.SkillsSubdir
        License      = ($(if ($s.License) { $s.License } else { 'MIT' }))
        SparsePath   = @($s.SparsePath | Where-Object { $_ })
        SelfRoot     = [bool]$s.SelfRoot
        WrapFile     = [string]$s.WrapFile
        NoProxy      = $NoProxy
        NoSync       = $NoSync
        Force        = $Force
        Check        = $Check
    }
    if ($DshHome) { $engineArgs.DshHome = $DshHome }
    if ($AgentsHome) { $engineArgs.AgentsHome = $AgentsHome }
    & $engine @engineArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "$($s.Id) failed (exit $LASTEXITCODE)"
        $failed += $s.Id
        continue
    }
}

Write-Host ''
if ($failed.Count -gt 0) {
    Write-Warning "sources that failed: $($failed -join ', ')"
    exit 1
}
Write-Host 'All skill sources refreshed.' -ForegroundColor Cyan
