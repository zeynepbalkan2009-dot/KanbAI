param(
  [string]$ProjectRoot = "D:\kanba-qc-platform\qc-platform",
  [string]$IpAddress = "",
  [switch]$Build,
  [switch]$PrimeDemo
)

$ErrorActionPreference = "Stop"

Set-Location -LiteralPath $ProjectRoot

& .\scripts\create-local-https-cert.ps1 -ProjectRoot $ProjectRoot -IpAddress $IpAddress

$args = @("compose", "-f", "docker-compose.yml", "-f", "docker-compose.https.yml", "up", "-d")
if ($Build) {
  $args += "--build"
}

docker @args

if ($PrimeDemo) {
  & .\scripts\prime-demo.ps1 `
    -ApiBaseUrl "http://localhost:8000" `
    -WebBaseUrl "https://localhost" `
    -AllowSelfSigned `
    -Count 100
}

Write-Host ""
Write-Host "KanbAI HTTPS pilot mode is starting." -ForegroundColor Green
Write-Host "Laptop URL: https://localhost/dashboard/executive" -ForegroundColor White
Write-Host "Tablet URL: use https://<laptop-ip>/dashboard/capture" -ForegroundColor White
