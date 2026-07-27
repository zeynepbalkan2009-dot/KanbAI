# Backup and Restore Guide

## Yedekleme
- PostgreSQL dump alin.
- MinIO inspections bucket objelerini disari aktar.
- `.env` dosyasini repoya koyma; parola yoneticisinde sakla.
- Yedek manifesti icin `scripts/backup-pilot.ps1` kullan.

## Geri Yukleme
1. Servisleri durdur.
2. Mevcut volume snapshot al.
3. PostgreSQL dump'i geri yukle.
4. MinIO objelerini geri yukle.
5. `scripts/smoke-test.ps1` ile temel akisi dogrula.
