@echo off
setlocal

cd /d "%~dp0"
echo Starting Shadow Shift Phaser V2 server in %cd%
echo Open http://localhost:8090

where python >nul 2>nul
if %errorlevel%==0 (
  python -m http.server 8090
  goto :eof
)

where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server 8090
  goto :eof
)

echo Python was not found. Install Python or the Windows py launcher, then run this script again.
exit /b 1
