# bundle-extension.ps1 - Packages the Chrome Extension into a production-ready ZIP
param (
    [switch]$IncludeWasmOffline = $false
)

$scriptDir = $PSScriptRoot
$rootDir = Split-Path -Parent $scriptDir

Write-Host "=== Chrome Extension Bundler (Pyodide In-Browser) ===" -ForegroundColor Cyan

# 1. Download offline Wasm assets if requested
if ($IncludeWasmOffline) {
    Write-Host "`nDownloading offline Pyodide WebAssembly bundle..." -ForegroundColor Yellow
    $downloadScript = Join-Path $scriptDir "download-pyodide.ps1"
    if (Test-Path $downloadScript) {
        & $downloadScript
    }
}

# 2. Execute cross-platform Python bundler
$venvPython = Join-Path $rootDir "venv\Scripts\python.exe"
$bundlerPy = Join-Path $scriptDir "bundle_extension.py"

if (Test-Path $venvPython) {
    & $venvPython $bundlerPy
} else {
    python $bundlerPy
}
