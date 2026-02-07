@echo off
REM Setup script for Metal-Model-Checklist-Database (Windows)
REM Works when PowerShell script execution is disabled. Ensures Node.js is
REM available, then installs npm dependencies and git hooks.
REM Run from repo root: scripts\setup.cmd

cd /d "%~dp0\.."

where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo Node.js is required but was not found in PATH.
    echo.
    echo Install Node.js ^(LTS^) using one of these methods:
    echo   - winget:  winget install OpenJS.NodeJS.LTS
    echo   - choco:   choco install nodejs-lts
    echo   - Manual:  https://nodejs.org/
    echo.
    echo After installing, close and reopen your terminal, then run:
    echo   scripts\setup.cmd
    echo.
    exit /b 1
)

for /f "delims=" %%v in ('node -v 2^>nul') do set NODE_VER=%%v
echo Node.js found: %NODE_VER%
echo Installing dependencies (npm install)...
echo.

call npm install
if errorlevel 1 (
    echo npm install failed.
    exit /b 1
)

echo.
echo Setup complete. Git hooks (pre-commit, pre-push) are installed.
echo   - Pre-commit: lint/build runs when Model-Database.json or scripts change; commit fails if lint fails.
echo   - Pre-push:  full lint runs before push to origin.
echo.
exit /b 0
