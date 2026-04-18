param(
  [int]$Port = 8080,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$webRoot = Join-Path $projectRoot "Web"
$serverScript = Join-Path $projectRoot "serve-web.ps1"
$url = "http://localhost:$Port/"

if (-not (Test-Path $webRoot)) {
  throw "Web folder not found at '$webRoot'."
}

if (-not (Test-Path $serverScript)) {
  throw "Server script not found at '$serverScript'."
}

$existingListener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 1

if ($existingListener) {
  Write-Host "Shadow Shift web app is already running on $url" -ForegroundColor Yellow
} else {
  Write-Host "Starting Shadow Shift web app on $url" -ForegroundColor Cyan
  $process = Start-Process powershell `
    -ArgumentList @(
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", $serverScript,
      "-Root", $webRoot
    ) `
    -WorkingDirectory $projectRoot `
    -WindowStyle Hidden `
    -PassThru

  Start-Sleep -Seconds 2

  $verified = $false
  for ($attempt = 0; $attempt -lt 10; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri $url -UseBasicParsing -Headers @{ Host = "localhost:$Port" } -TimeoutSec 2
      if ($response.StatusCode -eq 200) {
        $verified = $true
        break
      }
    } catch {
      Start-Sleep -Milliseconds 300
    }
  }

  if (-not $verified) {
    throw "Server process started but did not respond successfully on $url"
  }

  Write-Host "Server started successfully. PID: $($process.Id)" -ForegroundColor Green
}

if (-not $NoBrowser) {
  Start-Process $url
}

Write-Host "Open $url to play." -ForegroundColor Green
