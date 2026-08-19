param(
    [string]$Source = "defects_metal_surface",
    [string]$Format = "yolov8",
    [switch]$List
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

if ($List) {
    python mlops\dataset\download_open_datasets.py --list
    exit $LASTEXITCODE
}

if (-not $env:ROBOFLOW_API_KEY) {
    Write-Host "ROBOFLOW_API_KEY is not set."
    Write-Host "Create a free Roboflow account, copy your API key, then run:"
    Write-Host '  $env:ROBOFLOW_API_KEY = "your_key_here"'
    Write-Host "Then retry:"
    Write-Host "  .\scripts\prepare-open-datasets.ps1 -Source $Source"
    exit 1
}

$PlaceholderKeys = @("your_key_here", "senin_keyin", "buraya_api_key", "<key>")
if ($PlaceholderKeys -contains $env:ROBOFLOW_API_KEY.Trim().ToLowerInvariant()) {
    Write-Host "ROBOFLOW_API_KEY is still an example value."
    Write-Host "Use your real Roboflow key from Account > Roboflow Keys."
    Write-Host 'Example: $env:ROBOFLOW_API_KEY = "rf_xxxxxxxxxxxxxxxxx"'
    exit 1
}

python mlops\dataset\download_open_datasets.py --source $Source --format $Format
exit $LASTEXITCODE
