# Technical Validation Report

Date: 2026-07-04
Target: ITU Cekirdek BIGG demo readiness for `D:\kanba-qc-platform\qc-platform`

## Executive Summary

The project was analyzed across backend, web, Docker Compose, database seed flow, storage, inference, Celery, and MLOps demo paths. Several first-run blockers were fixed directly in the project.

Full Docker/E2E validation could not be completed on this machine because Docker is not installed or not available in PATH. The command `docker compose up --build` fails with `docker : The term 'docker' is not recognized`.

## Applied Fixes

1. Created demo `.env`
   - Added `.env` from `.env.example`.
   - Normalized `AI_INFERENCE_MODE=mock` so settings parsing is deterministic.

2. Fixed PostgreSQL first boot failure
   - `scripts/init_db.sql` now only creates database extensions.
   - Removed seed inserts from Postgres init because those ran before FastAPI created application tables.

3. Added backend startup demo seed
   - `backend/app/main.py` now seeds the baseline demo factory, admin user, operator user, demo device, mock AI model, and active model deployment after `Base.metadata.create_all()`.
   - Seed is idempotent via `ON CONFLICT DO NOTHING`.

4. Fixed web Docker build blocker
   - `web/Dockerfile` now uses `npm ci` when a lockfile exists and falls back to `npm install` when it does not.
   - Generated `web/package-lock.json` by running `npm install`.

5. Fixed Next.js production build configuration
   - `web/next.config.js` now defaults API rewrites to `http://localhost:8000` when `NEXT_PUBLIC_API_URL` is absent.

6. Fixed MinIO readiness ordering
   - `docker-compose.yml` now makes `api` wait for `minio-init` to complete successfully, preventing uploads before required buckets exist.

7. Hardened backend UUID and stats handling
   - `backend/app/domains/inspection/service.py` now compares UUID columns with UUID values and uses portable `CASE` expressions for dashboard stats.
   - Review updates now refresh the returned inspection object.
   - `backend/app/api/v1/devices_router.py` now uses UUID values for list and heartbeat filters.

## Validation Performed

### Static / Build Checks

| Area | Result | Notes |
|---|---:|---|
| Backend Python AST parse | PASS | 57 Python files parsed successfully with zero syntax errors. |
| Web dependency install | PASS | `npm install` completed and generated lockfile. |
| Web TypeScript check | PASS | `npm run type-check` completed successfully. |
| Web production build | PASS | `npm run build` completed successfully. |
| Docker Compose runtime | BLOCKED | Docker CLI is unavailable on this machine. |
| Backend local import/runtime | BLOCKED | Local Python environment lacks backend dependencies such as SQLAlchemy; Docker would normally provide these. |

### Demo Flow Coverage By Code Review

| Scenario Step | Status | Evidence |
|---|---:|---|
| Admin login | READY BY CODE | Startup seed creates `admin@demo.com / Admin123!`; auth route exists at `/api/v1/auth/login`. |
| Device activation/listing | READY BY CODE | Startup seed creates `DEVICE-DEMO-001`; device list and heartbeat endpoints are present. |
| Photo upload | READY BY CODE | `/api/v1/inspections` uploads to MinIO and queues Celery inference. |
| AI inference | READY BY CODE | Default `AI_INFERENCE_MODE=mock`; Celery task updates inspection decision/confidence/defects. |
| Dashboard update | READY BY CODE | Dashboard reads `/inspections/stats` and list endpoints; WebSocket path exists for live events. |
| HITL queue | PARTIAL | MLOps page calls HITL endpoints; router has graceful mock fallback if pipeline storage is unavailable. |
| Demo seed | READY BY CODE | `/api/v1/mlops/demo/seed?scenario=metal&count=...` inserts realistic inspection history. |

## Service Readiness Assessment

| Service | Status | Notes |
|---|---:|---|
| PostgreSQL | CONFIG FIXED, NOT RUN | First-boot seed/table ordering issue fixed. |
| Redis | CONFIG REVIEWED, NOT RUN | Required for Celery and WebSocket pub/sub. |
| MinIO | CONFIG FIXED, NOT RUN | API now waits for bucket initialization. |
| Backend API | CODE FIXED, NOT RUN | Startup seed and UUID/stat issues fixed. |
| Web | VERIFIED | Type-check and production build pass. |
| Celery workers | CODE REVIEWED, NOT RUN | Inference task path exists and uses mock inference by default. |
| MLOps / MLflow | CONFIG REVIEWED, NOT RUN | MLflow service still installs packages at runtime; see priority issues. |

## Remaining Issues By Priority

### P0 - Blocks Full Validation

1. Docker is not available on this machine.
   - `docker compose up --build` cannot run until Docker Desktop/CLI is installed and available in PATH.
   - Because of this, service health, container logs, and true E2E demo flow could not be executed.

### P1 - Should Fix Before Demo

1. Next.js dependency has a known security warning.
   - `npm install` reported a security warning for `next@14.2.3`.
   - Upgrade Next.js to a patched compatible 14.x/15.x version and rerun `npm run build`.

2. MLflow service installs dependencies on every container start.
   - `mlflow` uses `python:3.11-slim` and runs `pip install mlflow psycopg2-binary` at runtime.
   - This is fragile for demo Wi-Fi and slows startup.
   - Recommended: create a small MLflow Dockerfile/image with dependencies preinstalled.

3. Backend dependencies are heavy for demo builds.
   - `ultralytics`, `onnxruntime`, `mlflow`, `dvc`, OpenCV, and Albumentations are installed in the API/worker image even in mock mode.
   - Recommended: split demo/runtime requirements from training/MLOps-heavy packages or use a cached prebuilt image.

### P2 - Stabilization / Demo Polish

1. HITL queue is partially mock-backed.
   - The API gracefully falls back to mock queue/stats if the real `ReviewQueueService` path fails.
   - This is acceptable for a demo but should be clearly framed as demo-grade.

2. UI text has mojibake/encoding artifacts.
   - Turkish strings render in source as corrupted characters in several files.
   - The app may still render depending on actual file encoding, but this should be cleaned for polish.

3. No automated E2E script exists.
   - Recommended: add a repeatable smoke script that logs in, lists devices, uploads a tiny test image, waits for inference, checks stats, calls HITL/seed endpoints, and prints PASS/FAIL.

## Recommended Next Validation Once Docker Is Available

1. Run `docker compose up --build`.
2. Confirm healthy containers:
   - `qc_postgres`
   - `qc_redis`
   - `qc_minio`
   - `qc_api`
   - `qc_web`
   - `qc_worker_inference`
   - `qc_worker_general`
   - `qc_celery_beat`
   - `qc_mlflow`
3. Execute the demo smoke path:
   - Login: `admin@demo.com / Admin123!`
   - `GET /api/v1/devices`
   - Upload a JPG/PNG to `POST /api/v1/inspections`
   - Poll `GET /api/v1/inspections/{id}` until decision is not `pending`
   - Check `GET /api/v1/inspections/stats`
   - Check `GET /api/v1/mlops/hitl/queue`
   - Run `POST /api/v1/mlops/demo/seed?scenario=metal&count=100`
   - Refresh web dashboard and MLOps dashboard.

## Current Conclusion

The repository is materially closer to a stable production-like demo: first-run database seeding, web build, MinIO readiness, and dashboard statistics issues were fixed. The largest remaining blocker is environmental: Docker must be installed/available before the requested full Compose and E2E runtime validation can be completed.
