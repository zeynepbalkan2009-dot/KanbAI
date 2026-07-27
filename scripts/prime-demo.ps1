param(
  [string]$BaseUrl = "http://localhost",
  [string]$ApiBaseUrl = "",
  [string]$WebBaseUrl = "",
  [string]$Email = "admin@demo.com",
  [string]$Password = "Admin123!",
  [ValidateSet("metal", "cnc", "plastic")]
  [string]$Scenario = "metal",
  [int]$Count = 100,
  [switch]$AllowSelfSigned
)

$ErrorActionPreference = "Stop"

if (-not $ApiBaseUrl) { $ApiBaseUrl = $BaseUrl }
if (-not $WebBaseUrl) { $WebBaseUrl = $BaseUrl }

if ($AllowSelfSigned) {
  [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
}

function Pass($Message) {
  Write-Host "PASS $Message" -ForegroundColor Green
}

function Step($Message) {
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Test-WebRoute($Url) {
  if ($AllowSelfSigned -and $Url.StartsWith("https://")) {
    $env:KANBAI_ROUTE_URL = $Url
    $status = python -c "import os, ssl, urllib.request; ctx=ssl._create_unverified_context(); req=urllib.request.Request(os.environ['KANBAI_ROUTE_URL'], method='HEAD'); print(urllib.request.urlopen(req, context=ctx, timeout=90).status)"
    if ($LASTEXITCODE -ne 0) {
      throw "$Url route check failed"
    }
    return [int]$status.Trim()
  }

  $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -Method Head
  return [int]$response.StatusCode
}

Step "Checking API readiness"
$ready = Invoke-RestMethod "$ApiBaseUrl/ready"
if ($ready.status -ne "ok") {
  throw "API readiness returned unexpected status: $($ready.status)"
}
Pass "API ready: PostgreSQL=$($ready.dependencies.postgresql), Redis=$($ready.dependencies.redis), MinIO=$($ready.dependencies.minio)"

Step "Logging in as demo admin"
$login = Invoke-RestMethod `
  -Uri "$ApiBaseUrl/api/v1/auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body (@{ email = $Email; password = $Password } | ConvertTo-Json -Compress)

if (-not $login.access_token) {
  throw "Login did not return an access token"
}
Pass "Admin login token received"

Step "Resetting and seeding demo data"
$seed = Invoke-RestMethod `
  -Uri "$ApiBaseUrl/api/v1/mlops/demo/seed?scenario=$Scenario&count=$Count&reset=true" `
  -Method Post `
  -Headers @{ Authorization = "Bearer $($login.access_token)" }

Pass "Seeded $($seed.seeded) $Scenario inspections after reset"
Write-Host ("Deleted: " + ($seed.deleted | ConvertTo-Json -Compress)) -ForegroundColor DarkGray

Step "Checking demo routes"
$routes = @(
  "/dashboard/executive",
  "/dashboard/factory",
  "/dashboard/capture",
  "/dashboard/hitl",
  "/dashboard/mlops"
)

foreach ($route in $routes) {
  $statusCode = Test-WebRoute "$WebBaseUrl$route"
  if ($statusCode -ne 200) {
    throw "$route returned $statusCode"
  }
  Pass "$route 200 OK"
}

Write-Host ""
Write-Host "KanbAI demo is primed." -ForegroundColor Green
Write-Host "Start at: $WebBaseUrl/dashboard/executive" -ForegroundColor White
