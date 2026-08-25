param(
  [string]$ProjectRoot = "D:\kanba-qc-platform\qc-platform",
  [string]$ModelName = "battery_open_smoke_v0.pt",
  [string]$ModelSource = ""
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $ProjectRoot

if (-not (Test-Path -LiteralPath ".env")) {
  throw ".env was not found. Copy .env.example to .env first."
}

if (-not $ModelSource) {
  $ModelSource = Join-Path $ProjectRoot "mlops\training\inference\models\$ModelName"
}

if (-not (Test-Path -LiteralPath $ModelSource)) {
  throw "Model source was not found: $ModelSource. Train or copy a .pt model first."
}

$targetDir = Join-Path $ProjectRoot "backend\models"
New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
$targetPath = Join-Path $targetDir $ModelName
Copy-Item -LiteralPath $ModelSource -Destination $targetPath -Force

function Set-EnvValue {
  param(
    [string[]]$Lines,
    [string]$Key,
    [string]$Value
  )

  $pattern = "^\s*$([regex]::Escape($Key))="
  $updated = $false
  $next = foreach ($line in $Lines) {
    if ($line -match $pattern) {
      $updated = $true
      "$Key=$Value"
    } else {
      $line
    }
  }

  if (-not $updated) {
    $next += "$Key=$Value"
  }

  return $next
}

$envPath = Join-Path $ProjectRoot ".env"
$lines = Get-Content -LiteralPath $envPath
$lines = Set-EnvValue -Lines $lines -Key "APP_ENV" -Value "production"
$lines = Set-EnvValue -Lines $lines -Key "DEBUG" -Value "false"
$lines = Set-EnvValue -Lines $lines -Key "DEMO_MODE" -Value "false"
$lines = Set-EnvValue -Lines $lines -Key "PILOT_MODE" -Value "true"
$lines = Set-EnvValue -Lines $lines -Key "AI_INFERENCE_MODE" -Value "pilot_yolo_scope"
$lines = Set-EnvValue -Lines $lines -Key "YOLO_MODEL_PATH" -Value "/app/models/$ModelName"
Set-Content -LiteralPath $envPath -Value $lines -Encoding UTF8

Write-Host "Pilot YOLO scope mode is ready." -ForegroundColor Green
Write-Host "Model copied to: $targetPath" -ForegroundColor White
Write-Host "Inference mode: pilot_yolo_scope" -ForegroundColor White
Write-Host ""
Write-Host "Start with:" -ForegroundColor Cyan
Write-Host ".\scripts\start-germaksan-pilot.ps1 -Build -Yolo" -ForegroundColor White
