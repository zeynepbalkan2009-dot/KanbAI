# Pilot Acceptance Criteria

## Must Have
- Tum container servisleri baslar.
- `/health` ve `/ready` okunabilir.
- Admin login calisir.
- Cihaz aktivasyonu calisir.
- Fotograf yukleme inspection kaydi olusturur.
- Mock AI inference demo icin karar uretir.
- HITL review dataset contribution kaydi olusturur.
- Web dashboard build olur.
- `PILOT_MODE=true` iken demo seed/reset endpointleri HTTP 403 doner.
- Pilot startup otomatik demo data eklemez.
- Ilk factory tenant ve admin, demo seed yerine kontrollu bootstrap ile olusturulur.

## Should Have
- CSV export kalite ekibine verilebilir.
- Smoke test tek komutla calisir.
- Demo seed sifirdan kurulumda otomatik gelir.
- HTTPS pilot modu tablet/laptop kamera testleri icin acilabilir.
- HITL review dataset contribution sayacini gunceller.

## Current Validation

Docker runtime testi tamamlandi. PostgreSQL, Redis, MinIO, API, web, nginx, Celery worker/beat, Flower ve MLOps demo servisleri ayaga kalkti. Tam factory acceptance smoke test gecti.

Son kabul komutu:

```powershell
.\scripts\smoke-test.ps1 -ApiBaseUrl 'http://localhost:8000' -WebBaseUrl 'https://localhost' -AllowSelfSigned -SeedCount 8
```

Beklenen sonuc:

```text
KanbAI factory demo acceptance test passed.
```

## Pilot Mode Safety Validation

Pilot kurulumunda destructive demo smoke testi calistirilmamalidir. Admin
hesabi olusturulduktan sonra su non-destructive komutu calistirin:

```powershell
.\scripts\pilot-mode-smoke-test.ps1 `
  -ApiBaseUrl 'https://pilot.example-factory.com' `
  -Email 'qa.admin@example-factory.com' `
  -Password '<admin-password>'
```

Beklenen sonuc:

```text
KanbAI pilot mode safety smoke test passed.
```
