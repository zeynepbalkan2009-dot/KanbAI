param(
    [string]$Source = "battery_detection_multiclass",
    [string]$Name = "battery_open_smoke_v0",
    [int]$Train = 240,
    [int]$Valid = 60,
    [int]$Test = 60
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

python mlops\dataset\make_open_dataset_subset.py `
  --source $Source `
  --name $Name `
  --train $Train `
  --valid $Valid `
  --test $Test

exit $LASTEXITCODE
