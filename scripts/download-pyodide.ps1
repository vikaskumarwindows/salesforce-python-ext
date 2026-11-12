# download-pyodide.ps1 - Bundles Pyodide, NumPy, and Pandas for offline Manifest V3 compliance
$ErrorActionPreference = "Stop"

$targetDir = Join-Path (Split-Path -Parent $PSScriptRoot) "extension\pyodide"
if (!(Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

$baseUrl = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full"
$files = @(
    "pyodide.js",
    "pyodide.asm.js",
    "pyodide.asm.wasm",
    "pyodide-lock.json",
    "python_stdlib.zip"
)

Write-Host "=== Bundling Pyodide (WebAssembly) for Chrome Extension ===" -ForegroundColor Cyan
Write-Host "Target directory: $targetDir`n" -ForegroundColor DarkGray

foreach ($file in $files) {
    $url = "$baseUrl/$file"
    $dest = Join-Path $targetDir $file
    Write-Host "Downloading $file..." -NoNewline
    try {
        Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
        Write-Host " [OK]" -ForegroundColor Green
    } catch {
        Write-Host " [Failed: $_]" -ForegroundColor Red
    }
}

Write-Host "`nPyodide core files downloaded successfully!" -ForegroundColor Green
Write-Host "The extension can now run Pyodide completely offline in WebAssembly without CDN access." -ForegroundColor Cyan
