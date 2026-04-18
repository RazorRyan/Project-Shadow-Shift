$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$unity = Join-Path $root "unity"

if (-not (Test-Path $unity)) {
    Write-Error "Unity folder not found at $unity"
    exit 1
}

$remaining = @("Library", "Logs", "Temp")

foreach ($name in $remaining) {
    $source = Join-Path $root $name
    if (-not (Test-Path $source)) {
        continue
    }

    $destination = Join-Path $unity $name

    try {
        if (Test-Path $destination) {
            Remove-Item -LiteralPath $source -Recurse -Force
            Write-Host "Removed leftover root folder: $name"
        } else {
            Move-Item -LiteralPath $source -Destination $unity
            Write-Host "Moved $name into unity"
        }
    } catch {
        Write-Warning "Could not process $name. Make sure Unity is fully closed, then run this script again."
    }
}

Write-Host "Done."
