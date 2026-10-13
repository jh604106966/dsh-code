@echo off
rem ---------------------------------------------------------------------------
rem Daily snapshot sync (Windows scheduled task "dsh-code-sync").
rem   - refreshes the superpowers skills from upstream
rem   - re-snapshots the plugin/skill environment and pushes ONLY if something
rem     changed (tools\sync.ps1 is idempotent)
rem   - appends everything to <DSH_HOME>\dsh-code-sync.log
rem Run it by hand any time; it is safe to repeat.
rem ---------------------------------------------------------------------------
setlocal
if "%DSH_HOME%"=="" (set "LOGDIR=%USERPROFILE%\.dsh") else (set "LOGDIR=%DSH_HOME%")
set "LOG=%LOGDIR%\dsh-code-sync.log"
if not exist "%LOGDIR%" mkdir "%LOGDIR%" >nul 2>&1
echo. >> "%LOG%"
echo ==== %DATE% %TIME% ==== >> "%LOG%"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-superpowers.ps1" >> "%LOG%" 2>&1
echo exit=%ERRORLEVEL% >> "%LOG%"
endlocal
