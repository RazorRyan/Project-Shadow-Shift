$root = Join-Path $PSScriptRoot "Web"
$port = 8080
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Serving $root at http://localhost:$port/"

$contentTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css" = "text/css; charset=utf-8"
    ".js" = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png" = "image/png"
    ".jpg" = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg" = "image/svg+xml"
    ".ico" = "image/x-icon"
    ".txt" = "text/plain; charset=utf-8"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $requestPath = $context.Request.Url.AbsolutePath.TrimStart("/")
        if ([string]::IsNullOrWhiteSpace($requestPath)) {
            $requestPath = "index.html"
        }

        $safePath = $requestPath -replace "/", "\"
        $fullPath = [System.IO.Path]::GetFullPath((Join-Path $root $safePath))

        if (-not $fullPath.StartsWith([System.IO.Path]::GetFullPath($root))) {
            $context.Response.StatusCode = 403
            $context.Response.Close()
            continue
        }

        if (-not (Test-Path $fullPath -PathType Leaf)) {
            $context.Response.StatusCode = 404
            $bytes = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
            $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
            $context.Response.Close()
            continue
        }

        $extension = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()
        if ($contentTypes.ContainsKey($extension)) {
            $context.Response.ContentType = $contentTypes[$extension]
        } else {
            $context.Response.ContentType = "application/octet-stream"
        }

        $bytes = [System.IO.File]::ReadAllBytes($fullPath)
        $context.Response.ContentLength64 = $bytes.Length
        $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        $context.Response.Close()
    }
}
finally {
    $listener.Stop()
    $listener.Close()
}
