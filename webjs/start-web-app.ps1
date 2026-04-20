param(
  [int]$Port = 5173,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$webRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $webRoot

if (-not (Test-Path "$webRoot\package.json")) {
  throw "package.json not found in '$webRoot'."
}

if (-not $NoBrowser) {
  Start-Sleep -Milliseconds 800
  Start-Process "http://localhost:$Port/"
}

Write-Host "Starting Shadow Shift TypeScript dev server on http://localhost:$Port" -ForegroundColor Cyan
npm run dev -- --host 0.0.0.0 --port $Port
