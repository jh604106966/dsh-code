@echo off
rem ---------------------------------------------------------------------------
rem Daily snapshot sync (Windows scheduled task "dsh-code-sync").
rem   - refreshes every external skill source (tools\update-all-skills.ps1:
rem     superpowers, GameDesignOS, ui-ux-pro-max-skill, agents/interaction-design,
rem     anthropics/skills, github-skill-forge)
rem   - each source re-snapshots the environment and pushes ONLY if something
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
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-all-skills.ps1" >> "%LOG%" 2>&1
echo --- update-all-skills exit=%ERRORLEVEL% >> "%LOG%"
rem wrapped source: upstream ships a bare feedback.md, no SKILL.md
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-self-improving-agent.ps1" >> "%LOG%" 2>&1
echo --- update-self-improving-agent exit=%ERRORLEVEL% >> "%LOG%"
endlocal
