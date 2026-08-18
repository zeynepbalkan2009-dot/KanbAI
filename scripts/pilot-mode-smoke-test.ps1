param(
  [string]$ApiBaseUrl = "http://localhost:8000",
  [Parameter(Mandatory = $true)][string]$Email,
  [Parameter(Mandatory = $true)][string]$Password
)

$ErrorActionPreference = "Stop"

function Pass($Message) {
  Write-Host "PASS $Message" -ForegroundColor Green
}

function Fail($Message) {
  Write-Host "FAIL $Message" -ForegroundColor Red
  exit 1
}

function Invoke-Json($Method, $Url, $Headers = @{}, $Body = $null) {
  $args = @{ Uri = $Url; Method = $Method; Headers = $Headers }
  if ($Body -ne $null) {
    $args.ContentType = "application/json"
    $args.Body = ($Body | ConvertTo-Json -Depth 8 -Compress)
  }
  Invoke-RestMethod @args
}

function Get-CurlCommand {
  $curl = @(Get-Command curl.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1)
  if ($curl.Count -eq 0) {
    $curl = @(Get-Command curl -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1)
  }
  if ($curl.Count -eq 0) {
    Fail "curl executable was not found"
  }
  return $curl[0].Source
}

function Assert-Forbidden($Url, $Headers, $Name) {
  $curl = Get-CurlCommand
  $nullDevice = if ($env:OS -eq "Windows_NT") { "NUL" } else { "/dev/null" }
  $status = & $curl "-sS" "-o" $nullDevice "-w" "%{http_code}" "-X" "POST" $Url "-H" "Authorization: $($Headers.Authorization)"
  if ($LASTEXITCODE -ne 0) {
    Fail "$Name request failed"
  }
  if ($status.Trim() -ne "403") {
    Fail "$Name expected HTTP 403 in PILOT_MODE, got HTTP $($status.Trim())"
  }
  Pass "$Name is blocked with HTTP 403"
}

try {
  $health = Invoke-RestMethod "$ApiBaseUrl/health"
  if ($health.status -ne "ok") { Fail "health endpoint returned $($health.status)" }
  Pass "health endpoint"

  $ready = Invoke-RestMethod "$ApiBaseUrl/ready"
  if ($ready.status -ne "ok") { Fail "ready endpoint returned $($ready.status)" }
  Pass "ready endpoint"

  $login = Invoke-Json "Post" "$ApiBaseUrl/api/v1/auth/login" @{} @{ email = $Email; password = $Password }
  if (-not $login.access_token) { Fail "login did not return access_token" }
  $headers = @{ Authorization = "Bearer $($login.access_token)" }
  Pass "pilot admin login"

  $me = Invoke-Json "Get" "$ApiBaseUrl/api/v1/auth/me" $headers
  if ($me.role -ne "admin") { Fail "pilot verification requires an admin account" }
  Pass "admin session"

  Assert-Forbidden "$ApiBaseUrl/api/v1/mlops/demo/seed?scenario=metal&count=1" $headers "demo seed endpoint"
  Assert-Forbidden "$ApiBaseUrl/api/v1/mlops/demo/reset" $headers "demo reset endpoint"

  Write-Host ""
  Write-Host "KanbAI pilot mode safety smoke test passed." -ForegroundColor Green
} catch {
  Fail $_.Exception.Message
}
