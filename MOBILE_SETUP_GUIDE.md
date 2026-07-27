# Mobile Setup Guide

## Pilot Cihaz Aktivasyonu
1. Fabrika admininden aktivasyon tokeni al.
2. Cihaz UUID, cihaz adi ve firmware bilgisiyle aktivasyon istegi gonder.
3. Aktivasyon basariliysa cihaz fabrika ve istasyonla eslesir.
4. Uygulama duzenli heartbeat gondermelidir.

## Fotograf Yukleme
`/api/v1/inspections` endpointi multipart form kabul eder. `device_id`, `file`, `product_id`, `station_id`, `serial_number` ve `lot_number` alanlari pilot izlenebilirligi icin onerilir.
