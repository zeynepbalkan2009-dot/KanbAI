# KanbAI Technical Validation Report

Date: 2026-07-27  
Project: `D:\kanba-qc-platform\qc-platform`  
Target: Factory-ready, production-like demo for KanbAI Industrial AI Quality Control Platform

## Executive Summary

KanbAI is now running as a Docker Compose based factory demo with Backend, Web, PostgreSQL, Redis, MinIO, Celery workers, Flower, Nginx and the lightweight MLOps registry online. The demo was extended from a static/pitch surface into a more realistic factory pilot workspace: operator capture, device activation, inspection records, HITL review, continuous learning, investor view and a new Factory Digital Twin overview.

The current build is suitable for ITU Cekirdek / TUBITAK BIGG / investor demo sessions and controlled factory trials. It is still a demo deployment, not a hardened production installation.

## Current Runtime Status

| Component | Status | Evidence |
|---|---:|---|
| PostgreSQL | PASS | Container healthy |
| Redis | PASS | Container healthy |
| MinIO | PASS | Container healthy, `/ready` dependency check OK |
| Backend API | PASS | `GET /ready` returns `200` with PostgreSQL, Redis and MinIO OK |
| Web | PASS | Next.js app running behind Nginx |
| Nginx | PASS | Ports `80` and `443` active; HTTPS local pilot mode enabled |
| Celery inference worker | PASS | Container running |
| Celery general worker | PASS | Container running |
| Celery Beat | PASS | Container running |
| Flower | PASS | Port `5555` exposed |
| MLOps registry | PASS | Lightweight demo registry running on port `5000` |

## Latest Validation Commands

```powershell
docker compose -f docker-compose.yml -f docker-compose.https.yml ps
python -c "import ssl,urllib.request; ctx=ssl._create_unverified_context(); r=urllib.request.urlopen('https://127.0.0.1/ready', context=ctx, timeout=20); print(r.status); print(r.read().decode())"
cd web
.\node_modules\.bin\tsc.cmd --noEmit --incremental false
npm run build
.\scripts\prime-demo.ps1 -ApiBaseUrl 'http://localhost:8000' -WebBaseUrl 'https://localhost' -AllowSelfSigned -Count 8
.\scripts\smoke-test.ps1 -ApiBaseUrl 'http://localhost:8000' -WebBaseUrl 'https://localhost' -AllowSelfSigned -SeedCount 8
```

## Validation Results

| Check | Result | Notes |
|---|---:|---|
| API readiness | PASS | `{"status":"ok","dependencies":{"postgresql":"ok","redis":"ok","minio":"ok"}}` |
| Admin login | PASS | `admin@demo.com / Admin123!` returns bearer token |
| Demo reset + seed | PASS | 8 metal inspection records seeded after reset |
| Web TypeScript | PASS | `tsc --noEmit --incremental false` |
| Web production build | PASS | Next build compiled and generated app routes including `/dashboard/pilot` |
| HTTPS executive route | PASS | `/dashboard/executive` returns 200 |
| HTTPS factory overview route | PASS | `/dashboard/factory` returns 200 |
| HTTPS capture route | PASS | `/dashboard/capture` returns 200 |
| HTTPS HITL route | PASS | `/dashboard/hitl` returns 200 |
| HTTPS MLOps route | PASS | `/dashboard/mlops` returns 200 |
| Factory acceptance smoke | PASS | Readiness, login, seed, activation, photo upload, AI inference, stats, HITL, MLOps, CSV export and HTTPS web routes passed |
| Backend image rebuild | PASS | API/worker/beat/flower images rebuilt with `bcrypt==4.1.3` baked in |
| API runtime mode | PASS | API now runs without `--reload` in Compose for stable demo behavior |
| Demo endpoint production guard | PASS | `/mlops/demo/reset` and `/mlops/demo/seed` are blocked when `APP_ENV=production`, even if `DEMO_MODE=true` |
| Initial Alembic migration | READY | `20260727_0001_initial_factory_pilot_schema.py` creates the current factory pilot schema |
| HTTPS route smoke check | PASS | Self-signed local HTTPS checks use short-timeout GET requests for reliable Windows demo validation |
| Pilot Workspace route | PASS | `/dashboard/pilot` is included in production build and HTTPS smoke validation |
| Docker web runtime | PASS | Web service uses the Next.js standalone production target instead of live dev compilation |
| GitHub Docker demo smoke | READY | CI builds Docker Compose, waits for API readiness, runs Alembic and executes the factory acceptance smoke test |

## Completed Product Improvements

- Added `Factory Overview` digital twin screen for line/station/device status, health signals and live inspection feed.
- Added `Investor Demo` executive dashboard for YC/a16z style demo narrative, ROI metrics and demo flow.
- Added `Factory Devices` CRM screen for tablet/camera pairing, activation token generation, device heartbeat and revoke flow.
- Added `/activate-device` login-free tablet onboarding route.
- Added PWA manifest, icon and service worker registration for tablet-friendly pilot use.
- Added offline capture queue storage and sync action for operator photo upload.
- Added local HTTPS pilot mode with self-signed certificate generation.
- Added `scripts/start-pilot-https.ps1` and strengthened `scripts/prime-demo.ps1`.
- Added backend demo reset endpoint and deterministic demo seed reset behavior.
- Updated frontend API/WebSocket defaults to same-origin so tablet/laptop access works through Nginx.
- Upgraded `scripts/smoke-test.ps1` into a full factory demo acceptance test.
- Rebuilt backend service images and removed API reload mode from Compose to avoid demo-time reloader instability.
- Added `DEMO_MODE` config and production guard for demo reset/seed endpoints.
- Added an initial Alembic migration for fresh PostgreSQL deployments.
- Hardened the smoke test HTTPS route checks for local self-signed demo certificates.
- Added a factory pilot handoff package for field demos, role-based UX walkthrough and recovery steps.
- Added pilot proposal and data collection protocol documents for real factory trials.
- Added a dashboard Pilot Workspace for CRM-style pilot readiness, scope, dataset targets and risk tracking.
- Switched the Docker web service to the Next.js standalone production target to avoid live-demo route compilation delays.
- Extended GitHub Actions with a Docker Compose demo smoke test for GitHub-side demo validation.

## Demo Scenario Status

| Scenario | Status | Notes |
|---|---:|---|
| Admin login | PASS | Validated against live API |
| Device activation | PASS | API and UI implemented |
| Photo upload | PASS | Capture and inspection upload flow implemented |
| AI inference | PASS | Stable mock/demo inference available |
| Dashboard update | PASS | Seed and inspection statistics update |
| HITL queue | PASS | Review queue and review action UI available |
| Demo seed | PASS | Resettable seed script available |
| Continuous learning | PASS FOR DEMO | Dataset/HITL/model registry story is visible and navigable |
| Factory overview | PASS | New digital twin route added and validated |
| Factory acceptance test | PASS | `scripts/smoke-test.ps1` completed successfully on 2026-07-27 |

## Remaining Gaps By Priority

1. **Real factory model weights**: current inference is deterministic demo/mock mode. Replace with pilot-trained model once sample images are collected.
2. **Trusted tablet HTTPS**: local HTTPS works with self-signed cert. For real factory tablets, install a trusted local CA/cert or use a real domain.
3. **Role-based access depth**: admin/operator quality roles exist, but finer permission boundaries should be enforced for production.
4. **Audit trail depth**: HITL decisions are captured, but production needs tamper-evident audit export and reviewer attribution reports.
5. **Real image thumbnails**: demo maps thumbnail keys to original images. Add worker-generated thumbnails for large real deployments.
6. **Automated E2E browser tests**: manual/API validation passed; Playwright tests should cover login, capture fallback, HITL and dashboard updates.
7. **Docker host capacity**: backend image rebuild succeeded, but keep at least 20-30 GB free on `C:` or move Docker data to `D:` to avoid future rebuild instability.

## Demo Day Runbook

1. Start Docker Desktop and wait until the engine is running.
2. From `D:\kanba-qc-platform\qc-platform`, run:

```powershell
.\scripts\start-pilot-https.ps1 -PrimeDemo
```

3. Open:

```text
https://localhost/dashboard/executive
```

4. Login:

```text
admin@demo.com
Admin123!
```

5. Recommended demo path:

```text
Investor Demo -> Factory Overview -> Capture -> Inspection Records -> Review Queue -> Learning Ops -> Factory Devices
```

## Conclusion

KanbAI is now stable enough for a realistic factory-facing demo and accelerator/investor walkthrough. The strongest current story is no longer only defect detection; it is the loop from inspection to HITL validation, dataset contribution, model registry and retraining readiness.
