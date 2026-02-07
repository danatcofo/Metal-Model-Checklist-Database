# Setup script for Metal-Model-Checklist-Database
# Ensures Node.js is available, then installs npm dependencies and git hooks.
# Run from repo root: .\scripts\setup.ps1

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $repoRoot

# Ensure Chocolatey/Node paths are on PATH for this session (Node installed via choco may not be in current PATH)
$pathsToPrepend = @(
    "C:\Program Files\nodejs",
    "${env:ProgramFiles}\nodejs",
    "${env:ProgramFiles(x86)}\nodejs"
)
if ($env:ChocolateyInstall) {
    $pathsToPrepend += "$env:ChocolateyInstall\bin"
}
$currentPath = $env:PATH
foreach ($p in $pathsToPrepend) {
    if ($p -and (Test-Path $p) -and ($currentPath -notlike "*$p*")) {
        $env:PATH = "$p;$env:PATH"
    }
}

function Write-NodeRequired {
    Write-Host ""
    Write-Host "Node.js is required but was not found in PATH." -ForegroundColor Red
    Write-Host ""
    Write-Host "Install Node.js (LTS) using one of these methods:" -ForegroundColor Yellow
    Write-Host "  - winget:  winget install OpenJS.NodeJS.LTS" -ForegroundColor Cyan
    Write-Host "  - choco:   choco install nodejs-lts" -ForegroundColor Cyan
    Write-Host "  - Manual:  https://nodejs.org/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "After installing, close and reopen your terminal, then run:" -ForegroundColor Yellow
    Write-Host "  .\scripts\setup.ps1" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# Check for node
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-NodeRequired
}

$version = & node -v 2>$null
if (-not $version) {
    Write-NodeRequired
}

Write-Host "Node.js found: $version" -ForegroundColor Green
Write-Host "Installing dependencies (npm install)..." -ForegroundColor Yellow

& npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "npm install failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Setup complete. Git hooks (pre-commit, pre-push) are installed." -ForegroundColor Green
Write-Host "  - Pre-commit: lint/build runs when Model-Database.json or scripts change; commit fails if lint fails." -ForegroundColor Gray
Write-Host "  - Pre-push:  full lint runs before push to origin." -ForegroundColor Gray
Write-Host ""
