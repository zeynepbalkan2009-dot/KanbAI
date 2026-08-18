# Security Notes

## Pilot Seviyesi Kontroller
- JWT tabanli auth vardir.
- Tenant isolation factory_id ile uygulanir.
- Device activation token hash olarak saklanir.
- `.env` ve secret dosyalari git disinda tutulur.
- Demo reset/seed endpointleri sadece `DEMO_MODE=true`, `PILOT_MODE=false` ve production disi ortamda calisir.

## Production Oncesi Gerekenler
- Alembic migration zorunlu hale getirilmeli.
- Rate limiting ve audit kapsamı genisletilmeli.
- MinIO bucket policy ve TLS sertifikalari fabrika domainine gore ayarlanmali.
- Varsayilan demo kullanicilari kapatilmali veya sifreleri degistirilmeli.
- `DEMO_MODE=false` olarak calistirilmali ve demo seed/reset operasyonlari ayrica denetlenmelidir.
- Fabrika denemesinde `PILOT_MODE=true` kullanilmali; endpoint engeli
  `scripts/pilot-mode-smoke-test.ps1` ile dogrulanmalidir.
