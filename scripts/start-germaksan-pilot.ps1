param(
  [string]$ProjectRoot = "D:\kanba-qc-platform\qc-platform",
  [string]$IpAddress = "",
  [switch]$Build,
  [switch]$Yolo
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $ProjectRoot

if (-not $IpAddress) {
  $candidate = Get-NetIPConfiguration |
    Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address } |
    ForEach-Object { $_.IPv4Address.IPAddress } |
    Where-Object { $_ -notlike "127.*" -and $_ -notlike "169.254.*" } |
    Select-Object -First 1

  if (-not $candidate) {
    $candidate = Get-NetIPAddress -AddressFamily IPv4 |
      Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.InterfaceAlias -notlike "vEthernet*" } |
      Select-Object -First 1 -ExpandProperty IPAddress
  }

  if (-not $candidate) {
    throw "Could not detect a LAN IPv4 address. Pass -IpAddress manually."
  }
  $IpAddress = $candidate
}

if (-not (Test-Path -LiteralPath ".env")) {
  throw ".env was not found. Copy .env.example to .env and set pilot values first."
}

$envValues = @{}
foreach ($line in Get-Content -LiteralPath ".env") {
  if ($line -match '^\s*([^#=][^=]*)=(.*)$') {
    $envValues[$Matches[1].Trim()] = $Matches[2].Trim().Trim('"')
  }
}

if ($envValues["PILOT_MODE"] -ne "true") { throw "Set PILOT_MODE=true before starting GERMAKSAN pilot." }
if ($envValues["DEMO_MODE"] -eq "true") { throw "Set DEMO_MODE=false before starting GERMAKSAN pilot." }
if ($envValues["APP_ENV"] -ne "production") { throw "Set APP_ENV=production before starting GERMAKSAN pilot." }
if ($envValues["DEBUG"] -eq "true") { throw "Set DEBUG=false before starting GERMAKSAN pilot." }

$composeFiles = @("docker-compose.yml", "docker-compose.https.yml", "docker-compose.pilot.yml")

if ($Yolo) {
  $modelPath = $envValues["YOLO_MODEL_PATH"]
  $hostModelPath = $modelPath -replace "^/app/models/", "backend\models\"
  if (-not (Test-Path -LiteralPath $hostModelPath)) {
    throw "YOLO model was not found at $hostModelPath. Place germaksan-v0.pt there or start without -Yolo for HITL data collection."
  }
  if ($envValues["AI_INFERENCE_MODE"] -ne "yolo") {
    throw "Set AI_INFERENCE_MODE=yolo in .env before starting with -Yolo."
  }
  $composeFiles += "docker-compose.yolo.yml"
}

& .\scripts\create-local-https-cert.ps1 -ProjectRoot $ProjectRoot -IpAddress $IpAddress

$composeArgs = @("compose")
foreach ($file in $composeFiles) {
  $composeArgs += @("-f", $file)
}
$composeArgs += @("up", "-d")
if ($Build) { $composeArgs += "--build" }

docker @composeArgs
if ($LASTEXITCODE -ne 0) {
  throw "Docker Compose failed. Make sure Docker Desktop is running with the Linux engine, then run this script again."
}

Write-Host ""
Write-Host "GERMAKSAN laptop pilot is starting." -ForegroundColor Green
Write-Host "Laptop dashboard: https://localhost/dashboard/executive" -ForegroundColor White
Write-Host "Phone capture:     http://$IpAddress/operator/capture" -ForegroundColor White
Write-Host "Device activation: http://$IpAddress/activate-device?token=<activation-token>" -ForegroundColor White
Write-Host ""
Write-Host "Keep the laptop and phone on the same Wi-Fi. The phone capture route uses local HTTP to avoid Android self-signed certificate blocking." -ForegroundColor Yellow
