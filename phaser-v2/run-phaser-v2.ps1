$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host "Starting Shadow Shift Phaser V2 server in $root" -ForegroundColor Cyan
Write-Host "Open http://localhost:8090" -ForegroundColor Yellow

if (Get-Command python -ErrorAction SilentlyContinue) {
  python -m http.server 8090
  exit $LASTEXITCODE
}

if (Get-Command py -ErrorAction SilentlyContinue) {
  py -m http.server 8090
  exit $LASTEXITCODE
}

Write-Error "Python was not found. Install Python or the Windows py launcher, then run this script again."
