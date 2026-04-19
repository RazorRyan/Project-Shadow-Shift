param(
  [int]$Port = 8080,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$webRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$url = "http://localhost:$Port/"

if (-not (Test-Path $webRoot)) {
  throw "Web folder not found at '$webRoot'."
}

$existingListener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 1

if ($existingListener) {
  Write-Host "Shadow Shift web app is already running on $url" -ForegroundColor Yellow
} else {
  Write-Host "Starting Shadow Shift web app on $url" -ForegroundColor Cyan
  $process = Start-Process python `
    -ArgumentList @("-m", "http.server", $Port) `
    -WorkingDirectory $webRoot `
    -WindowStyle Hidden `
    -PassThru

  $verified = $false
  for ($attempt = 0; $attempt -lt 15; $attempt++) {
    Start-Sleep -Milliseconds 400
    try {
      $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -eq 200) {
        $verified = $true
        break
      }
    } catch { }
  }

  if (-not $verified) {
    throw "Server process started but did not respond on $url"
  }

  Write-Host "Server started (PID: $($process.Id)). Press Ctrl+C in that window to stop." -ForegroundColor Green
}

if (-not $NoBrowser) {
  Start-Process $url
}

Write-Host "Open $url to play." -ForegroundColor Green
