# KanbAI Pilot Scripts

Bu klasordeki PowerShell betikleri fabrika pilot kurulumunu yonetmek icindir.

- check-prerequisites.ps1: Docker, Node, Python ve gerekli portlari kontrol eder.
- start-pilot.ps1: docker compose up --build calistirir.
- stop-pilot.ps1: servisleri durdurur.
- smoke-test.ps1: fabrika demo kabul testini calistirir; API readiness, admin login, reset/seed, device activation, photo upload, AI inference, dashboard data, HITL, MLOps, CSV export ve opsiyonel HTTPS web route kontrollerini dogrular.
- backup-pilot.ps1: PostgreSQL ve MinIO icin operator odakli yedekleme notlarini uretir.
- restore-pilot.ps1: geri yukleme oncesi guvenlik kontrol listesini calistirir.
