<#
.SYNOPSIS
    Restore the DSH plugin environment captured in this repository.

.DESCRIPTION
    1) installs the local plugins shipped under plugins/ (linked into the profile),
    2) copies the agent presets into <DSH_HOME>/.agent-presets/,
    3) installs the pinned community plugins from npm.

.EXAMPLE
    .\install.ps1
    .\install.ps1 -Profile web
    .\install.ps1 -SkipRegistry
    .\install.ps1 -DryRun

.NOTES
    Requires PowerShell 5.1+ (Windows PowerShell is fine) or PowerShell 7+.
    This script is intentionally ASCII-only so it parses correctly under any
    console code page.
#>
[CmdletBinding()]
param(
    [string]$Profile = 'desktop',
    [string]$DshExe = '',
    [string]$DshHome = '',
    [switch]$SkipLocal,
    [switch]$SkipPresets,
    [switch]$SkipRegistry,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$repoRoot = $PSScriptRoot
if (-not $repoRoot) { $repoRoot = (Get-Location).Path }

# ---------------------------------------------------------------- resolve dsh
if ($DshExe) {
    $dshCmd = $DshExe
    $dshPrefix = @()
} elseif (Get-Command dsh -ErrorAction SilentlyContinue) {
    $dshCmd = 'dsh'
    $dshPrefix = @()
} elseif (Get-Command npx -ErrorAction SilentlyContinue) {
    $dshCmd = 'npx'
    $dshPrefix = @('-y', '@deepseek-ai/dsh')
} else {
    throw "dsh not found on PATH. Install DeepSeek Harness first, or pass -DshExe <path-to-dsh>."
}

# ----------------------------------------------------------- resolve DSH_HOME
if (-not $DshHome) {
    if ($env:DSH_HOME) { $DshHome = $env:DSH_HOME }
    else { $DshHome = Join-Path $HOME '.dsh' }
}
$env:DSH_HOME = $DshHome

function Invoke-Dsh {
    param([string[]]$CliArgs)
    $line = (@($dshCmd) + $dshPrefix + $CliArgs) -join ' '
    Write-Host "  > $line" -ForegroundColor DarkGray
    if ($DryRun) { return }
    & $dshCmd @dshPrefix @CliArgs
    if ($LASTEXITCODE -ne 0) { throw "command failed (exit $LASTEXITCODE): $line" }
}

Write-Host ''
Write-Host 'DSH plugin snapshot restore' -ForegroundColor Cyan
Write-Host "  repo     : $repoRoot"
Write-Host "  profile  : $Profile"
Write-Host "  DSH_HOME : $DshHome"
if ($DryRun) { Write-Host '  mode     : DRY RUN - nothing will be changed' -ForegroundColor Yellow }

# ------------------------------------------------------------ 1) local plugins
$localPlugins = @(
    'plugins/dsh-routing-suite/injector',
    'plugins/dsh-routing-suite/graded',
    'plugins/dsh-memory-evolve',
    'plugins/only-memory'
)

if (-not $SkipLocal) {
    Write-Host ''
    Write-Host '[1/3] Local plugins (shipped in this repo)' -ForegroundColor Green
    foreach ($rel in $localPlugins) {
        $full = Join-Path $repoRoot ($rel -replace '/', [IO.Path]::DirectorySeparatorChar)
        if (-not (Test-Path $full)) { Write-Warning "missing directory, skipped: $rel"; continue }
        Invoke-Dsh -CliArgs @('plugin', '--profile', $Profile, 'add', $full)
    }
}

# ---------------------------------------------------------------- 2) presets
$presetNames = @('router-standard', 'router-spec', 'router-react')

if (-not $SkipPresets) {
    $presetSrcRoot = Join-Path $repoRoot 'plugins/dsh-routing-suite/preset'
    $presetDstRoot = Join-Path $DshHome '.agent-presets'
    Write-Host ''
    Write-Host "[2/3] Agent presets -> $presetDstRoot" -ForegroundColor Green
    if (-not (Test-Path $presetSrcRoot)) {
        Write-Warning "missing directory, skipped: plugins/dsh-routing-suite/preset"
    } elseif ($DryRun) {
        foreach ($n in $presetNames) { Write-Host "  > copy $n -> $presetDstRoot\$n" -ForegroundColor DarkGray }
    } else {
        New-Item -ItemType Directory -Force -Path $presetDstRoot | Out-Null
        foreach ($n in $presetNames) {
            $src = Join-Path $presetSrcRoot $n
            if (-not (Test-Path $src)) { Write-Warning "missing preset, skipped: $n"; continue }
            $dst = Join-Path $presetDstRoot $n
            if (Test-Path $dst) {
                $bak = "$dst.bak-" + (Get-Date -Format 'yyyyMMdd-HHmmss')
                Write-Host "  ~ existing preset backed up: $n -> $(Split-Path $bak -Leaf)" -ForegroundColor Yellow
                Move-Item -LiteralPath $dst -Destination $bak
            }
            Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
            Write-Host "  + $n"
        }
    }
}

# ------------------------------------------------------- 3) registry plugins
$registryPlugins = @(
    'billion-context@0.1.194',
    'dsh-context@0.66.0',
    'dsh-cost-meter@1.8.15',
    'dshmarket@1.66.9',
    '@nanmicoder/dsh-agent-teams@0.1.22',
    '@linxin666/dsh-client-ui-skill-explorer@0.4.5'
)

if (-not $SkipRegistry) {
    Write-Host ''
    Write-Host '[3/3] Community plugins from npm (pinned versions)' -ForegroundColor Green
    $profileDir = Join-Path $DshHome (Join-Path 'profiles' $Profile)
    $npmrcPath = Join-Path $profileDir '.npmrc'
    if (-not $DryRun -and (Test-Path $profileDir) -and -not (Test-Path $npmrcPath)) {
        'ignore-workspace-root-check=true' | Set-Content -LiteralPath $npmrcPath -Encoding ASCII
        Write-Host "  + wrote $npmrcPath (ignore-workspace-root-check=true)"
    }
    foreach ($pkg in $registryPlugins) {
        Invoke-Dsh -CliArgs @('plugin', '--profile', $Profile, 'add', $pkg)
    }
}

Write-Host ''
Write-Host 'Done.' -ForegroundColor Cyan
Write-Host 'Next: restart DSH, then open a new session and pick a preset (Router Standard / Router Spec).'
Write-Host 'Details: see README.md and PLUGINS.md.'
