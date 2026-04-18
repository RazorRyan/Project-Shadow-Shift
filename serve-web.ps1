param([string]$Root)
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:8080/')
$listener.Start()
$mime = @{
  '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.js'='application/javascript; charset=utf-8';
  '.json'='application/json; charset=utf-8'; '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.svg'='image/svg+xml';
  '.ico'='image/x-icon'; '.txt'='text/plain; charset=utf-8'; '.wav'='audio/wav'; '.mp3'='audio/mpeg'; '.ogg'='audio/ogg'
}
while ($listener.IsListening) {
  try {
    $context = $listener.GetContext()
    $requestPath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath)
    if ([string]::IsNullOrWhiteSpace($requestPath) -or $requestPath -eq '/') { $requestPath = '/index.html' }
    $localPath = Join-Path $Root ($requestPath.TrimStart('/') -replace '/', [IO.Path]::DirectorySeparatorChar)
    if ((Test-Path $localPath) -and -not (Get-Item $localPath).PSIsContainer) {
      $bytes = [IO.File]::ReadAllBytes($localPath)
      $ext = [IO.Path]::GetExtension($localPath).ToLowerInvariant()
      $contentType = 'application/octet-stream'
      if ($mime.ContainsKey($ext)) { $contentType = $mime[$ext] }
      $context.Response.ContentType = $contentType
      $context.Response.ContentLength64 = $bytes.Length
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $context.Response.StatusCode = 404
      $msg = [Text.Encoding]::UTF8.GetBytes('Not Found')
      $context.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $context.Response.OutputStream.Close()
  } catch {
    break
  }
}
$listener.Stop()
