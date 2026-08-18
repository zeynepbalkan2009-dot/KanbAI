# KanbAI Factory Pilot v1.0 Installation Guide

## Amaç
Bu rehber KanbAI pilotunu tek makinede Docker Compose ile ayağa kaldırmak için kullanılır.

## Gereksinimler
- Docker Desktop ve Docker Compose
- 8 GB+ RAM
- Portlar: 3000, 8000, 5000, 5432, 6379, 9000, 9001
- `.env` dosyasi `.env.example` uzerinden uretilmis olmali

## Kurulum
1. `scripts/check-prerequisites.ps1` calistir.
2. `.env.example` dosyasini `.env` olarak kopyala ve gizli degerleri degistir.
3. Fabrika/tablet demolarinda `scripts/start-pilot-https.ps1 -PrimeDemo` calistir.
4. Laptop-only HTTP demo icin `scripts/start-pilot.ps1` calistir.

## Ana URL'ler

HTTPS pilot modu:

```text
https://localhost/dashboard/executive
```

HTTP fallback:

```text
http://localhost
```

Servis kontrolleri:

```text
Backend:       http://localhost:8000/health
Readiness:     http://localhost:8000/ready
Web container: http://localhost:3000
MinIO Console: http://localhost:9001
MLflow:        http://localhost:5000
```

## Kabul Testi

Kurulumdan sonra calistir:

```powershell
.\scripts\smoke-test.ps1 -ApiBaseUrl 'http://localhost:8000' -WebBaseUrl 'https://localhost' -AllowSelfSigned -SeedCount 8
```

Basarili cikti:

```text
KanbAI factory demo acceptance test passed.
```

## Demo Kullanici

Demo kullanicilari seed tarafindan yalnizca lokal dogrulama icin uretilir.
Pilot oncesi fabrika tenant'i icin yeni admin/operator hesaplari acilmali ve
tum demo sifreleri degistirilmelidir.
