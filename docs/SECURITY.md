# Security Notes

## Pilot Seviyesi Kontroller
- JWT tabanli auth vardir.
- Tenant isolation factory_id ile uygulanir.
- Device activation token hash olarak saklanir.
- `.env` ve secret dosyalari git disinda tutulur.

## Production Oncesi Gerekenler
- Alembic migration zorunlu hale getirilmeli.
- Rate limiting ve audit kapsamı genisletilmeli.
- MinIO bucket policy ve TLS sertifikalari fabrika domainine gore ayarlanmali.
- Varsayilan demo kullanicilari kapatilmali veya sifreleri degistirilmeli.
