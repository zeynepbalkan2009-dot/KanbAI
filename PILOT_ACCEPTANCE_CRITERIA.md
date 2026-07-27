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
