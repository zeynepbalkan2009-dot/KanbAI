param(
  [string]$ProjectRoot = "D:\kanba-qc-platform\qc-platform",
  [switch]$Build
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $ProjectRoot

if (-not (Test-Path -LiteralPath ".env")) {
  throw ".env was not found. Copy .env.example, rotate secrets, then set PILOT_MODE=true and DEMO_MODE=false."
}

$values = @{}
foreach ($line in Get-Content -LiteralPath ".env") {
  if ($line -match '^\s*([^#=][^=]*)=(.*)$') {
    $values[$Matches[1].Trim()] = $Matches[2].Trim().Trim('"')
  }
}

$pilotMode = $values["PILOT_MODE"]
$demoMode = $values["DEMO_MODE"]
$appEnv = $values["APP_ENV"]
$debug = $values["DEBUG"]
if ($pilotMode -ne "true") {
  throw "Refusing to start a real pilot without PILOT_MODE=true."
}
if ($demoMode -eq "true") {
  throw "Refusing to start a real pilot while DEMO_MODE=true. Set DEMO_MODE=false."
}
if ($appEnv -ne "production") {
  throw "Refusing to start a real pilot without APP_ENV=production."
}
if ($debug -eq "true") {
  throw "Refusing to start a real pilot while DEBUG=true. Set DEBUG=false."
}

$composeArgs = @(
  "compose",
  "-f", "docker-compose.yml",
  "-f", "docker-compose.https.yml",
  "-f", "docker-compose.pilot.yml",
  "up", "-d"
)
if ($Build) { $composeArgs += "--build" }

docker @composeArgs

Write-Host ""
Write-Host "KanbAI controlled pilot stack is starting." -ForegroundColor Green
Write-Host "Only Nginx ports 80/443 are published; internal services remain on the Compose network." -ForegroundColor Green
Write-Host "Run scripts/pilot-mode-smoke-test.ps1 after creating the pilot admin." -ForegroundColor White
