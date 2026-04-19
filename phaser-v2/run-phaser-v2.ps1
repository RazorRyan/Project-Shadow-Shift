param(
  [int]$Port = 8090,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$url = "http://localhost:$Port/"
$script:reloadVersion = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

Set-Location $root

function Get-ContentType {
  param([string]$Path)

  switch ([IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { return "text/html; charset=utf-8" }
    ".js" { return "text/javascript; charset=utf-8" }
    ".css" { return "text/css; charset=utf-8" }
    ".json" { return "application/json; charset=utf-8" }
    ".png" { return "image/png" }
    ".jpg" { return "image/jpeg" }
    ".jpeg" { return "image/jpeg" }
    ".gif" { return "image/gif" }
    ".svg" { return "image/svg+xml" }
    ".ico" { return "image/x-icon" }
    ".map" { return "application/json; charset=utf-8" }
    ".txt" { return "text/plain; charset=utf-8" }
    default { return "application/octet-stream" }
  }
}

function Get-SafeLocalPath {
  param(
    [string]$RequestPath,
    [string]$Root
  )

  $relativePath = [Uri]::UnescapeDataString(($RequestPath -split '\?')[0]).TrimStart("/")
  if ([string]::IsNullOrWhiteSpace($relativePath)) {
    $relativePath = "index.html"
  }

  $combinedPath = Join-Path $Root $relativePath
  $fullPath = [IO.Path]::GetFullPath($combinedPath)
  $fullRoot = [IO.Path]::GetFullPath($Root + [IO.Path]::DirectorySeparatorChar)

  if (-not $fullPath.StartsWith($fullRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $null
  }

  if ((Test-Path -LiteralPath $fullPath) -and (Get-Item -LiteralPath $fullPath).PSIsContainer) {
    $indexPath = Join-Path $fullPath "index.html"
    if (Test-Path -LiteralPath $indexPath) {
      return $indexPath
    }
  }

  return $fullPath
}

function Get-ReloadClientScript {
  return @"
<script>
(() => {
  let currentVersion = null;

  async function checkReloadVersion() {
    try {
      const response = await fetch('/__codex_reload', { cache: 'no-store' });
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (currentVersion === null) {
        currentVersion = data.version;
        return;
      }

      if (data.version !== currentVersion) {
        window.location.reload();
      }
    } catch (_error) {
      // Ignore transient reload polling errors during local edits.
    }
  }

  setInterval(checkReloadVersion, 1000);
  checkReloadVersion();
})();
</script>
"@
}

function Write-JsonResponse {
  param(
    [Parameter(Mandatory = $true)]$Response,
    [Parameter(Mandatory = $true)]$Payload
  )

  $json = $Payload | ConvertTo-Json -Compress
  $buffer = [Text.Encoding]::UTF8.GetBytes($json)
  $Response.StatusCode = 200
  $Response.ContentType = "application/json; charset=utf-8"
  $Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
  $Response.ContentLength64 = $buffer.Length
  $Response.OutputStream.Write($buffer, 0, $buffer.Length)
  $Response.OutputStream.Close()
}

function Write-FileResponse {
  param(
    [Parameter(Mandatory = $true)]$Response,
    [Parameter(Mandatory = $true)][string]$FilePath
  )

  $extension = [IO.Path]::GetExtension($FilePath).ToLowerInvariant()
  $Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
  $Response.ContentType = Get-ContentType -Path $FilePath

  if ($extension -eq ".html") {
    $html = [IO.File]::ReadAllText($FilePath, [Text.Encoding]::UTF8)
    $reloadScript = Get-ReloadClientScript
    if ($html -match "</body>") {
      $html = $html -replace "</body>", "$reloadScript`r`n</body>"
    } else {
      $html += $reloadScript
    }

    $buffer = [Text.Encoding]::UTF8.GetBytes($html)
    $Response.ContentLength64 = $buffer.Length
    $Response.OutputStream.Write($buffer, 0, $buffer.Length)
    $Response.OutputStream.Close()
    return
  }

  $bytes = [IO.File]::ReadAllBytes($FilePath)
  $Response.ContentLength64 = $bytes.Length
  $Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Response.OutputStream.Close()
}

function Write-NotFoundResponse {
  param(
    [Parameter(Mandatory = $true)]$Response,
    [string]$Message = "Not found"
  )

  $buffer = [Text.Encoding]::UTF8.GetBytes($Message)
  $Response.StatusCode = 404
  $Response.ContentType = "text/plain; charset=utf-8"
  $Response.ContentLength64 = $buffer.Length
  $Response.OutputStream.Write($buffer, 0, $buffer.Length)
  $Response.OutputStream.Close()
}

$watcher = New-Object IO.FileSystemWatcher $root, "*"
$watcher.IncludeSubdirectories = $true
$watcher.NotifyFilter = [IO.NotifyFilters]'FileName, DirectoryName, LastWrite, Size'

$onChange = {
  $script:reloadVersion = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
}

$watcherEvents = @(
  (Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $onChange),
  (Register-ObjectEvent -InputObject $watcher -EventName Created -Action $onChange),
  (Register-ObjectEvent -InputObject $watcher -EventName Deleted -Action $onChange),
  (Register-ObjectEvent -InputObject $watcher -EventName Renamed -Action $onChange)
)
$watcher.EnableRaisingEvents = $true

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($url)

try {
  $listener.Start()
  Write-Host "Starting Shadow Shift Phaser V2 dev server in $root" -ForegroundColor Cyan
  Write-Host "Serving $url" -ForegroundColor Green
  Write-Host "Live reload is enabled for local file changes." -ForegroundColor Yellow

  if (-not $NoBrowser) {
    Start-Process $url | Out-Null
  }

  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    try {
      if ($request.Url.AbsolutePath -eq "/__codex_reload") {
        Write-JsonResponse -Response $response -Payload @{ version = $script:reloadVersion }
        continue
      }

      $localPath = Get-SafeLocalPath -RequestPath $request.Url.AbsolutePath -Root $root
      if (-not $localPath -or -not (Test-Path -LiteralPath $localPath) -or (Get-Item -LiteralPath $localPath).PSIsContainer) {
        Write-NotFoundResponse -Response $response
        continue
      }

      Write-FileResponse -Response $response -FilePath $localPath
    } catch {
      if ($response.OutputStream.CanWrite) {
        $buffer = [Text.Encoding]::UTF8.GetBytes("Server error")
        $response.StatusCode = 500
        $response.ContentType = "text/plain; charset=utf-8"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.OutputStream.Close()
      }
    }
  }
} finally {
  foreach ($eventRegistration in $watcherEvents) {
    Unregister-Event -SourceIdentifier $eventRegistration.Name -ErrorAction SilentlyContinue
    Remove-Job -Id $eventRegistration.Id -Force -ErrorAction SilentlyContinue
  }

  $watcher.EnableRaisingEvents = $false
  $watcher.Dispose()

  if ($listener.IsListening) {
    $listener.Stop()
  }
  $listener.Close()
}
