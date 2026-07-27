param([string]$ProjectRoot = "D:\kanba-qc-platform\qc-platform")
Set-Location -LiteralPath $ProjectRoot
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Write-Error "Docker is not installed or not in PATH."; exit 2 }
docker compose down
