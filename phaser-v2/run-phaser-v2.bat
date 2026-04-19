@echo off
setlocal

cd /d "%~dp0"
echo Starting Shadow Shift Phaser V2 dev server in %cd%
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-phaser-v2.ps1" %*
exit /b %errorlevel%
