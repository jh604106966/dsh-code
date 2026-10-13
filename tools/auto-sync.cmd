@echo off
rem ---------------------------------------------------------------------------
rem Daily snapshot sync (Windows scheduled task "dsh-code-sync").
rem   - refreshes every external skill source (superpowers, GameDesignOS)
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
for %%S in (update-superpowers update-gamedesignos) do (
  echo --- %%S >> "%LOG%"
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0%%S.ps1" >> "%LOG%" 2>&1
  echo --- %%S exit=%ERRORLEVEL% >> "%LOG%"
)
endlocal
