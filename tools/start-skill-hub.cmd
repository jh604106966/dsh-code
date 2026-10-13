@echo off
rem ---------------------------------------------------------------------------
rem Start "Skill Hub" (huangshu/claude-skill-hub web UI) against the DSH skill library.
rem
rem Prerequisites (one-time, global npm install):
rem   npm install -g https://github.com/Backtthefuture/huangshu/raw/main/tools/skill-hub/release/claude-skill-hub.tgz
rem
rem Notes:
rem   - This is NOT a DSH plugin: it has no cordis.patch.yml / dsh field, it is a
rem     standalone Fastify + React web UI. The snapshot pipeline does not install it.
rem   - Its scanner only looks at ~/.claude/** by default, so this launcher adds the
rem     DSH skill root through SKILL_HUB_EXTRA_PATHS.
rem   - Port 3456 is taken by the only-memory web UI; Skill Hub walks upward when a
rem     port is busy, so 3457 is used here.
rem ---------------------------------------------------------------------------
setlocal
if "%PORT%"=="" set "PORT=3457"
set "SKILL_HUB_NO_OPEN=1"
set "SKILL_HUB_EXTRA_PATHS=%USERPROFILE%\.agents\skills"
set "HUB=%APPDATA%\npm\node_modules\claude-skill-hub\bin\cli.js"
if not exist "%HUB%" (
  echo [skill-hub] not installed. Run:
  echo   npm install -g https://github.com/Backtthefuture/huangshu/raw/main/tools/skill-hub/release/claude-skill-hub.tgz
  exit /b 1
)
echo Skill Hub  -^>  http://127.0.0.1:%PORT%
echo DSH skills -^>  %SKILL_HUB_EXTRA_PATHS%
node "%HUB%"
endlocal
