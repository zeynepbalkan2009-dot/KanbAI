param([string]$ProjectRoot = "D:\kanba-qc-platform\qc-platform")
$ErrorActionPreference = "Continue"
Write-Host "KanbAI prerequisite check" -ForegroundColor Cyan
$checks = @(
  @{Name="Docker"; Command="docker"; Args="--version"},
  @{Name="Docker Compose"; Command="docker"; Args="compose version"},
  @{Name="Node.js"; Command="node"; Args="--version"},
  @{Name="npm"; Command="npm"; Args="--version"},
  @{Name="Python"; Command="python"; Args="--version"},
  @{Name="Git"; Command="git"; Args="--version"}
)
foreach ($c in $checks) {
  try { $out = Invoke-Expression "$($c.Command) $($c.Args)" 2>&1; if ($LASTEXITCODE -eq 0) { Write-Host "PASS $($c.Name): $out" -ForegroundColor Green } else { Write-Host "FAIL $($c.Name): $out" -ForegroundColor Red } }
  catch { Write-Host "FAIL $($c.Name): $($_.Exception.Message)" -ForegroundColor Red }
}
$ports = 3000,8000,9000,9001,5432,6379,5000
foreach ($port in $ports) {
  $busy = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
  if ($busy) { Write-Host "WARN Port $port is already in use" -ForegroundColor Yellow } else { Write-Host "PASS Port $port is free" -ForegroundColor Green }
}
