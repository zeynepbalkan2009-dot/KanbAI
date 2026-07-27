param([string]$BackupPath)
if (-not $BackupPath) { Write-Error "Provide -BackupPath before restoring."; exit 2 }
Write-Host "Restore checklist"
Write-Host "1. Stop pilot services."
Write-Host "2. Snapshot current volumes."
Write-Host "3. Restore PostgreSQL dump and MinIO objects."
Write-Host "4. Run scripts/smoke-test.ps1."
Write-Host "Requested backup path: $BackupPath"
