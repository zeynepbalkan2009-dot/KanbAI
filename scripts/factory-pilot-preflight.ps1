param(
  [string]$ProjectRoot = "D:\kanba-qc-platform\qc-platform",
  [string]$ApiBaseUrl = "https://localhost",
  [Parameter(Mandatory = $true)][string]$Email,
  [Parameter(Mandatory = $true)][string]$Password,
  [ValidateSet("battery", "steel")][string]$PilotDomain = "battery",
  [switch]$Yolo
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $ProjectRoot

$script:Failures = 0
$script:Warnings = 0

function Pass($Message) {
  Write-Host "PASS $Message" -ForegroundColor Green
}

function FailCheck($Message) {
  $script:Failures += 1
  Write-Host "FAIL $Message" -ForegroundColor Red
}

function WarnCheck($Message) {
  $script:Warnings += 1
  Write-Host "WARN $Message" -ForegroundColor Yellow
}

function Invoke-Json($Method, $Url, $Headers = @{}, $Body = $null) {
  $arguments = @{ Uri = $Url; Method = $Method; Headers = $Headers }
  if ($Body -ne $null) {
    $arguments.ContentType = "application/json"
    $arguments.Body = ($Body | ConvertTo-Json -Depth 8 -Compress)
  }
  Invoke-RestMethod @arguments
}

if (-not (Test-Path -LiteralPath ".env")) {
  throw ".env was not found at $ProjectRoot"
}

$envValues = @{}
foreach ($line in Get-Content -LiteralPath ".env") {
  if ($line -match '^\s*([^#=][^=]*)=(.*)$') {
    $envValues[$Matches[1].Trim()] = $Matches[2].Trim().Trim('"')
  }
}

foreach ($check in @(
  @{ Name = "APP_ENV=production"; Ok = $envValues["APP_ENV"] -eq "production" },
  @{ Name = "PILOT_MODE=true"; Ok = $envValues["PILOT_MODE"] -eq "true" },
  @{ Name = "DEMO_MODE=false"; Ok = $envValues["DEMO_MODE"] -ne "true" },
  @{ Name = "DEBUG=false"; Ok = $envValues["DEBUG"] -ne "true" },
  @{ Name = "AI inference is not mock"; Ok = $envValues["AI_INFERENCE_MODE"] -ne "mock" }
)) {
  if ($check.Ok) { Pass $check.Name } else { FailCheck $check.Name }
}

$compose = @("-f", "docker-compose.yml", "-f", "docker-compose.https.yml", "-f", "docker-compose.pilot.yml")
if ($Yolo) { $compose += @("-f", "docker-compose.yolo.yml") }

try {
  docker info *> $null
  if ($LASTEXITCODE -eq 0) { Pass "Docker engine is available" } else { FailCheck "Docker engine is unavailable" }
} catch {
  FailCheck "Docker engine is unavailable"
}

$runningServices = @()
try {
  $runningServices = @(docker compose @compose ps --services --filter "status=running")
  foreach ($service in @("postgres", "redis", "minio", "api", "web", "nginx", "worker-general", "worker-inference")) {
    if ($runningServices -contains $service) { Pass "service $service is running" } else { FailCheck "service $service is not running" }
  }
} catch {
  FailCheck "Docker Compose service state could not be read"
}

try {
  $currentText = (docker compose @compose exec -T api alembic current | Out-String)
  $headText = (docker compose @compose exec -T api alembic heads | Out-String)
  $currentRevision = [regex]::Match($currentText, '[0-9]{8}_[0-9]{4}').Value
  $headRevision = [regex]::Match($headText, '[0-9]{8}_[0-9]{4}').Value
  if ($currentRevision -and $currentRevision -eq $headRevision) {
    Pass "database migration is at head ($currentRevision)"
  } else {
    FailCheck "database migration mismatch: current=$currentRevision head=$headRevision"
  }
} catch {
  FailCheck "database migration state could not be verified"
}

try {
  $health = Invoke-Json "Get" "$ApiBaseUrl/health"
  $ready = Invoke-Json "Get" "$ApiBaseUrl/ready"
  if ($health.status -eq "ok") { Pass "health endpoint" } else { FailCheck "health endpoint" }
  if ($ready.status -eq "ok") { Pass "ready endpoint" } else { FailCheck "ready endpoint" }
  if ($health.inference_mode -in @("data_collection", "pilot_yolo_scope", "yolo")) {
    Pass "safe inference mode: $($health.inference_mode)"
  } else {
    FailCheck "unsafe or unknown inference mode: $($health.inference_mode)"
  }

  $login = Invoke-Json "Post" "$ApiBaseUrl/api/v1/auth/login" @{} @{ email = $Email; password = $Password }
  if (-not $login.access_token) { throw "Login did not return an access token" }
  $headers = @{ Authorization = "Bearer $($login.access_token)" }
  $me = Invoke-Json "Get" "$ApiBaseUrl/api/v1/auth/me" $headers
  if ($me.role -eq "admin") { Pass "pilot admin session" } else { FailCheck "preflight account is not admin" }

  $products = @(Invoke-Json "Get" "$ApiBaseUrl/api/v1/products?active_only=true" $headers | Where-Object { $null -ne $_ })
  $lines = @(Invoke-Json "Get" "$ApiBaseUrl/api/v1/production-lines?active_only=true" $headers | Where-Object { $null -ne $_ })
  $stations = @(Invoke-Json "Get" "$ApiBaseUrl/api/v1/stations?active_only=true" $headers | Where-Object { $null -ne $_ })
  $devices = @(Invoke-Json "Get" "$ApiBaseUrl/api/v1/devices" $headers | Where-Object { $null -ne $_ })
  $dataset = Invoke-Json "Get" "$ApiBaseUrl/api/v1/hitl/dataset-summary" $headers

  if ($lines.Count -gt 0) { Pass "$($lines.Count) active production line(s)" } else { FailCheck "no active production line" }
  if ($dataset.training_ready -eq $false -and $dataset.automatic_training_enabled -eq $false) {
    Pass "dataset remains in safe collection-only mode"
  } else {
    FailCheck "dataset endpoint reports an unsafe training state"
  }

  $activeDevices = @($devices | Where-Object { $_.is_active -and $_.status -eq "active" })
  if ($activeDevices.Count -gt 0) { Pass "$($activeDevices.Count) active capture device(s)" } else { WarnCheck "no active capture device; activate the factory phone/tablet before line use" }

  if ($PilotDomain -eq "battery") {
    $domainProducts = @($products | Where-Object { $_.defect_policy.industry_domain -eq "battery_assembly" })
    $workflowStations = @($stations | Where-Object { $_.metadata.workflow -eq "battery_assembly_v1" })
    $workflowSteps = @(
      $workflowStations |
        ForEach-Object { @($_.metadata.workflow_step) } |
        ForEach-Object { "$($_)".Trim() } |
        Where-Object { $_ -match '^[1-6]$' } |
        Sort-Object -Unique
    )
    if ($domainProducts.Count -gt 0) { Pass "$($domainProducts.Count) active battery product profile(s)" } else { FailCheck "no active battery product profile" }
    if ($workflowSteps.Count -eq 6 -and (($workflowSteps -join ',') -eq '1,2,3,4,5,6')) {
      Pass "all six battery workflow stations are configured"
    } else {
      FailCheck "battery workflow station steps are incomplete: $($workflowSteps -join ',')"
    }
    $units = @(Invoke-Json "Get" "$ApiBaseUrl/api/v1/battery/units?limit=200" $headers | Where-Object { $null -ne $_ })
    $domainProductIds = @($domainProducts | ForEach-Object { "$($_.id)" })
    $openUnits = @($units | Where-Object { $_.status -ne "completed" -and $domainProductIds -contains "$($_.product_id)" })
    if ($openUnits.Count -gt 0) { Pass "$($openUnits.Count) open battery serial record(s)" } else { WarnCheck "no open battery serial record; create one before capture" }
  } else {
    $domainProducts = @($products | Where-Object { $_.defect_policy.industry_domain -eq "steel_equipment" })
    if ($domainProducts.Count -gt 0) { Pass "$($domainProducts.Count) active steel-equipment product profile(s)" } else { FailCheck "no active steel-equipment product profile" }
    if ($stations.Count -gt 0) { Pass "$($stations.Count) active station(s)" } else { FailCheck "no active station" }
  }

  if ($dataset.unpartitioned_legacy_records -gt 0) {
    WarnCheck "$($dataset.unpartitioned_legacy_records) legacy dataset record(s) have no domain partition"
  } else {
    Pass "no unpartitioned legacy dataset records"
  }
} catch {
  FailCheck "API preflight failed: $($_.Exception.Message)"
}

try {
  $runtimeSafety = (docker compose @compose exec -T api python -c "import json; from app.core.config import get_settings; s=get_settings(); print(json.dumps({'capture_quality_gate_enabled':s.capture_quality_gate_enabled,'pilot_mode':s.pilot_mode,'demo_seed_enabled':s.demo_seed_enabled}))" | Out-String)
  if ($runtimeSafety -match '"capture_quality_gate_enabled": true') { Pass "capture quality gate is enabled" } else { FailCheck "capture quality gate is disabled" }
  if ($runtimeSafety -match '"pilot_mode": true') { Pass "runtime pilot mode is enabled" } else { FailCheck "runtime pilot mode is disabled" }
  if ($runtimeSafety -match '"demo_seed_enabled": false') { Pass "runtime demo seeding is disabled" } else { FailCheck "runtime demo seeding is enabled" }
} catch {
  FailCheck "runtime safety settings could not be verified"
}

Write-Host ""
Write-Host "Preflight result: $($script:Failures) failure(s), $($script:Warnings) warning(s)." -ForegroundColor White
if ($script:Failures -gt 0) {
  Write-Host "NO-GO: resolve all FAIL items before factory line use." -ForegroundColor Red
  exit 1
}

Write-Host "GO FOR CONTROLLED DATA COLLECTION: warnings must be acknowledged; automatic product quality decisions remain disabled." -ForegroundColor Green
exit 0
