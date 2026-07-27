param([string]$ProjectRoot = "D:\kanba-qc-platform\qc-platform", [string]$OutputDir = "D:\kanba-qc-platform\qc-platform\outputs\backups")
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
@"
KanbAI Pilot Backup Manifest - $stamp

1. PostgreSQL: docker compose exec postgres pg_dump -U kanbai kanbai > kanbai-$stamp.sql
2. MinIO: export bucket objects from the inspections bucket.
3. Store .env separately in a password manager; never commit it.
4. Verify restore on a clean machine before factory pilot day.
"@ | Set-Content -LiteralPath (Join-Path $OutputDir "backup-manifest-$stamp.txt") -Encoding UTF8
Write-Host "Backup manifest created in $OutputDir"
