@echo off
set ELECTRON_RUN_AS_NODE=
cd /d "%~dp0"
if exist "%~dp0release\win-unpacked\Antigravity Studio.exe" (
  start "" "%~dp0release\win-unpacked\Antigravity Studio.exe"
  exit /b 0
)
if exist "%~dp0release\Antigravity-Studio-Portable.exe" (
  start "" "%~dp0release\Antigravity-Studio-Portable.exe"
  exit /b 0
)
if exist "%~dp0node_modules\electron\dist\electron.exe" (
  start "" "%~dp0node_modules\electron\dist\electron.exe" .
  exit /b 0
)
echo [Antigravity Studio] Chua cai dependencies. Hay chay "npm install && npm run build:ui" truoc!
pause
