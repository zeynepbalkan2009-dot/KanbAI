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
3. `scripts/start-pilot.ps1` calistir.
4. Backend: `http://localhost:8000/health`
5. Web: `http://localhost:3000`
6. MinIO Console: `http://localhost:9001`
7. MLflow: `http://localhost:5000`

## Demo Kullanici
- Admin: `admin@demo.com`
- Operator: `operator@demo.com`

Sifreler seed tarafindan demo amacli uretilir; pilot oncesi fabrika ortaminda degistirilmelidir.
