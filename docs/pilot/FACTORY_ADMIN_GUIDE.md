# Factory Admin Guide

## Kurulum Verileri
Admin asagidaki kaynaklari yonetir:
- Production lines
- Stations
- Products
- Shifts
- Devices

## Cihaz Aktivasyonu
1. Admin `/api/v1/devices/activation-token` ile token uretir.
2. Mobil cihaz `/api/v1/devices/activate` ile kendini kaydeder.
3. Cihaz heartbeat gonderdikce dashboard online durumunu gunceller.
4. Kayip veya yetkisiz cihaz `/api/v1/devices/{id}/revoke` ile iptal edilir.
