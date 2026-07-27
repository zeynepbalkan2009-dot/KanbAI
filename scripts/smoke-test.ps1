param(
  [string]$BaseUrl = "",
  [string]$ApiBaseUrl = "http://localhost:8000",
  [string]$WebBaseUrl = "",
  [string]$Email = "admin@demo.com",
  [string]$Password = "Admin123!",
  [int]$SeedCount = 8,
  [switch]$AllowSelfSigned
)

$ErrorActionPreference = "Stop"

if ($BaseUrl) {
  $ApiBaseUrl = $BaseUrl
}

function Pass($Message) {
  Write-Host "PASS $Message" -ForegroundColor Green
}

function Warn($Message) {
  Write-Host "WARN $Message" -ForegroundColor Yellow
}

function Fail($Message) {
  Write-Host "FAIL $Message" -ForegroundColor Red
  exit 1
}

function Step($Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-Json($Method, $Url, $Headers = @{}, $Body = $null) {
  $args = @{
    Uri = $Url
    Method = $Method
    Headers = $Headers
  }
  if ($Body -ne $null) {
    $args.ContentType = "application/json"
    $args.Body = ($Body | ConvertTo-Json -Depth 8 -Compress)
  }
  Invoke-RestMethod @args
}

function Test-WebRoute($Url) {
  if ($AllowSelfSigned -and $Url.StartsWith("https://")) {
    $env:KANBAI_ROUTE_URL = $Url
    $status = python -c "import os, ssl, urllib.request; ctx=ssl._create_unverified_context(); print(urllib.request.urlopen(os.environ['KANBAI_ROUTE_URL'], context=ctx, timeout=15).status)"
    if ($LASTEXITCODE -ne 0) {
      throw "$Url route check failed"
    }
    return [int]$status.Trim()
  }

  $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -Method Head
  return [int]$response.StatusCode
}

try {
  Step "Dependency readiness"
  Invoke-RestMethod "$ApiBaseUrl/health" | Out-Null
  Pass "health endpoint"

  $ready = Invoke-RestMethod "$ApiBaseUrl/ready"
  if ($ready.status -ne "ok") {
    Fail "ready endpoint returned $($ready.status)"
  }
  Pass "ready endpoint: PostgreSQL=$($ready.dependencies.postgresql), Redis=$($ready.dependencies.redis), MinIO=$($ready.dependencies.minio)"

  Step "Admin login"
  $login = Invoke-Json "Post" "$ApiBaseUrl/api/v1/auth/login" @{} @{ email = $Email; password = $Password }
  if (-not $login.access_token) {
    Fail "login did not return access_token"
  }
  $headers = @{ Authorization = "Bearer $($login.access_token)" }
  Pass "admin login"

  Step "Resettable demo seed"
  $seed = Invoke-Json "Post" "$ApiBaseUrl/api/v1/mlops/demo/seed?scenario=metal&count=$SeedCount&reset=true" $headers
  if (($seed.seeded -as [int]) -lt 1) {
    Fail "demo seed did not create inspections"
  }
  Pass "seeded $($seed.seeded) inspections"

  Step "Factory setup APIs"
  $lines = Invoke-Json "Get" "$ApiBaseUrl/api/v1/production-lines" $headers
  $stations = Invoke-Json "Get" "$ApiBaseUrl/api/v1/stations" $headers
  if ($lines.Count -lt 1) { Fail "no production lines found" }
  if ($stations.Count -lt 1) { Fail "no stations found" }
  Pass "production lines and stations available"

  Step "Device activation"
  $activation = Invoke-Json "Post" "$ApiBaseUrl/api/v1/devices/activation-token" $headers @{
    station_id = $stations[0].id
    label = "Smoke test tablet"
    expires_in_hours = 8
  }
  if (-not $activation.activation_token) {
    Fail "activation token missing"
  }

  $deviceUuid = "KANBAI-SMOKE-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
  $device = Invoke-Json "Post" "$ApiBaseUrl/api/v1/devices/activate" @{} @{
    activation_token = $activation.activation_token
    device_uuid = $deviceUuid
    name = "Smoke Test Tablet"
    firmware_version = "pilot-smoke"
    location_label = "Line 1 / QA Gate"
  }
  if (-not $device.id) {
    Fail "device activation failed"
  }
  Pass "device activated: $($device.id)"

  Step "Photo upload and AI inference"
  $pngPath = Join-Path $env:TEMP "kanbai-smoke-part.png"
  $pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAIklEQVR4nGP8z8Dwn4ECwESJ5lEDRg0YNWDUgFEDBgAAoyICIRKzXzAAAAAASUVORK5CYII="
  [IO.File]::WriteAllBytes($pngPath, [Convert]::FromBase64String($pngBase64))

  $curlArgs = @(
    "-s",
    "-X", "POST",
    "$ApiBaseUrl/api/v1/inspections",
    "-H", "Authorization: Bearer $($login.access_token)",
    "-H", "Idempotency-Key: smoke-$deviceUuid",
    "-F", "device_id=$($device.id)",
    "-F", "serial_number=KANBAI-SMOKE-PART",
    "-F", "lot_number=FACTORY-PILOT-SMOKE",
    "-F", "file=@$pngPath;type=image/png"
  )
  $uploadRaw = & curl.exe @curlArgs
  if ($LASTEXITCODE -ne 0) {
    Fail "photo upload curl failed"
  }
  $upload = $uploadRaw | ConvertFrom-Json
  if (-not $upload.inspection_id) {
    Fail "photo upload did not return inspection_id: $uploadRaw"
  }
  Pass "photo uploaded and queued: $($upload.inspection_id)"

  $completed = $false
  $inspection = $null
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    $inspection = Invoke-Json "Get" "$ApiBaseUrl/api/v1/inspections/$($upload.inspection_id)" $headers
    if ($inspection.decision -and $inspection.decision -ne "pending") {
      $completed = $true
      break
    }
  }
  if (-not $completed) {
    Fail "AI inference did not complete within 60 seconds"
  }
  Pass "AI inference completed: decision=$($inspection.decision), confidence=$([Math]::Round([double]$inspection.confidence * 100, 1))%"

  Step "Dashboard data and HITL"
  $stats = Invoke-Json "Get" "$ApiBaseUrl/api/v1/inspections/stats" $headers
  if (($stats.total -as [int]) -lt 1) {
    Fail "inspection stats did not update"
  }
  Pass "inspection stats updated: total=$($stats.total)"

  $queue = Invoke-Json "Get" "$ApiBaseUrl/api/v1/hitl/queue?limit=20" $headers
  if ($queue.Count -lt 1) {
    Fail "HITL queue is empty after demo seed"
  }
  $reviewTarget = $queue[0]
  $review = Invoke-Json "Post" "$ApiBaseUrl/api/v1/hitl/$($reviewTarget.id)/review" $headers @{
    decision = "wrong_prediction"
    corrected_label = "crack"
    notes = "Smoke test HITL correction"
    dataset_contribution = $true
  }
  if ($review.review_status -ne "accepted") {
    Fail "HITL review rejected"
  }
  $hitlStats = Invoke-Json "Get" "$ApiBaseUrl/api/v1/hitl/stats" $headers
  Pass "HITL review accepted, dataset contributions=$($hitlStats.dataset_contributions)"

  Step "MLOps and export"
  $models = Invoke-Json "Get" "$ApiBaseUrl/api/v1/mlops/models" $headers
  if ($models.Count -lt 1) {
    Fail "model registry returned no models"
  }
  Pass "model registry returned $($models.Count) models"

  $csv = Invoke-WebRequest -UseBasicParsing -Uri "$ApiBaseUrl/api/v1/inspections/export.csv?limit=20" -Headers $headers
  if (-not ($csv.Content -like "inspection_id,*")) {
    Fail "CSV export header missing"
  }
  Pass "inspection CSV export"

  if ($WebBaseUrl) {
    Step "Web demo routes"
    foreach ($route in @("/dashboard/executive", "/dashboard/pilot", "/dashboard/factory", "/dashboard/capture", "/dashboard/hitl", "/dashboard/mlops")) {
      $statusCode = Test-WebRoute "$WebBaseUrl$route"
      if ($statusCode -ne 200) {
        Fail "$route returned $statusCode"
      }
      Pass "$route 200 OK"
    }
  } else {
    Warn "web route checks skipped because WebBaseUrl was not provided"
  }

  Write-Host ""
  Write-Host "KanbAI factory demo acceptance test passed." -ForegroundColor Green
} catch {
  Fail $_.Exception.Message
}
