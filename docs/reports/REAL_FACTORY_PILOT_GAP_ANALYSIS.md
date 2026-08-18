# KanbAI Real Factory Pilot Gap Analysis

Date: 2026-08-13

Goal: assess whether the current KanbAI repository is ready to support a controlled first real factory pilot, without claiming production readiness.

Status: not yet ready for an unattended production deployment. The repository is close to a controlled first factory pilot, but pilot mode, real-model validation, trusted camera HTTPS, and pilot-specific metrics/security controls still need tightening.

## Sources Reviewed

- `README.md`
- `docs/reports/TECHNICAL_VALIDATION_REPORT.md`
- `docs/pilot/FACTORY_PILOT_HANDOFF.md`
- `docs/pilot/FACTORY_DATA_COLLECTION_PROTOCOL.md`
- `docs/pilot/PILOT_ACCEPTANCE_CRITERIA.md`
- `docs/deployment/SECURITY.md`
- `.env.example`
- `docker-compose.yml`
- `docker-compose.https.yml`
- `infra/nginx/nginx.conf`
- `infra/nginx/nginx.https.conf`
- `scripts/smoke-test.ps1`
- `scripts/start-pilot-https.ps1`
- `backend/app/main.py`
- `backend/app/core/config.py`
- `backend/app/api/v1/inspections_router.py`
- `backend/app/api/v1/devices_router.py`
- `backend/app/api/v1/hitl_router.py`
- `backend/app/api/v1/mlops_router.py`
- `backend/app/domains/inspection/service.py`
- `backend/app/domains/ai/inference_service.py`
- `backend/app/workers/tasks/inference_tasks.py`
- `backend/app/infrastructure/database/models.py`
- `backend/app/infrastructure/storage/minio_client.py`
- `web/app/dashboard/capture/page.tsx`
- `web/lib/api.ts`

## Current Architecture

KanbAI is a Docker Compose application with:

- Next.js web app served by the `web` service.
- Nginx reverse proxy for web, API, WebSocket, HTTP, and local HTTPS pilot mode.
- FastAPI backend with JWT authentication, tenant-aware factory data, and `/api/v1/*` routers.
- PostgreSQL for factories, users, devices, inspections, HITL reviews, dataset contributions, and model metadata.
- Redis for Celery broker/result backend and WebSocket event fanout.
- MinIO for inspection images, model artifacts, and dataset buckets.
- Celery workers for inference, general tasks, beat, and Flower monitoring.
- Lightweight MLOps/model-registry demo surfaces.
- Mock AI inference by default through `AI_INFERENCE_MODE=mock`.

The architecture matches the requested stack and should be preserved.

## Already-Working Components

The repository proves these components exist and are wired:

- Docker Compose runtime for PostgreSQL, Redis, MinIO, API, web, Nginx, Celery workers, Celery Beat, Flower, and MLOps demo server.
- Health and readiness endpoints: `/health` and `/ready`.
- JWT login, refresh, logout, current-user extraction, and role checks.
- Tenant-aware inspection upload API with image validation and MinIO upload.
- Device registration, activation-token creation, activation, heartbeat, and revoke APIs.
- Factory setup APIs for production lines, stations, products, and shifts.
- Operator capture UI with browser `getUserMedia`, demo fallback frame, GPS, battery, offline queue, and upload polling.
- Inspection records store factory, device, line, station, product, shift, serial, lot, image, AI decision, confidence, defects, and latency fields.
- HITL queue and review API writes `HITLReview` and `DatasetContribution` records.
- Demo reset/seed endpoints are admin-only and blocked when `APP_ENV=production` or `DEMO_MODE=false`.
- Existing `scripts/smoke-test.ps1` validates readiness, admin login, demo seed, factory setup, device activation, image upload, AI inference, dashboard stats, HITL review, model registry, and CSV export.
- GitHub Actions Docker demo smoke test is documented and previously validated by the project history.
- Local HTTPS mode exists via `docker-compose.https.yml`, Nginx HTTPS config, and `scripts/start-pilot-https.ps1`.

## Demo-Only Components

These are useful for investor/factory demos but should not be mistaken for production or real-model capability:

- Baseline demo users and factory data are inserted in `backend/app/main.py` when `APP_ENV=development`.
- Login page defaults to `admin@demo.com`.
- `scripts/smoke-test.ps1` intentionally uses demo credentials and demo seed/reset.
- Inference is mock by default and includes deterministic demo behavior for `KANBAI-DEMO*` serials or `FACTORY-PILOT*` lots.
- MLOps endpoints return mock model, HITL, drift, and dataset data when backing MLOps artifacts are unavailable.
- Dataset stats can fall back to synthetic values.
- Local HTTPS uses self-signed certificates.
- The product UI tells the continuous-learning story, but automatic retraining is not proven end-to-end with a real factory dataset and model.

## Production/Pilot Blockers

Priority blockers for the first real pilot:

1. No explicit `PILOT_MODE` exists. The current choices are `APP_ENV` and `DEMO_MODE`, which blur demo convenience and pilot safety.
2. Development startup seeds demo users automatically. A real pilot should not rely on `APP_ENV=development`.
3. Demo seed/reset endpoints are safe in `APP_ENV=production`, but a pilot-safe non-production mode needs explicit behavior and documentation.
4. `.env.example` contains demo defaults and placeholder secrets. This is acceptable for demo, but pilot setup must require rotated environment values.
5. Existing smoke test is destructive to demo-tagged data because it calls demo seed with `reset=true`. A real pilot smoke test must avoid resetting real pilot data.
6. No dedicated real-pilot checklist/test currently validates the full pilot path without destructive seed/reset.
7. Real factory setup has APIs, but operator capture UI does not expose all context fields that the data collection protocol asks for.

## Security Blockers

Security issues to resolve or explicitly accept for a controlled pilot:

- Demo credentials are visible in frontend and seed code.
- `DEMO_MODE=true` in `.env.example`; pilot documentation must require disabling it unless running a demo.
- CORS defaults include broad local origins. Pilot deployment should restrict `ALLOWED_ORIGINS` to the actual laptop/tablet origin.
- JWT tokens are stored in browser `localStorage`, which is acceptable for a controlled MVP but not hardened against XSS.
- No application-level rate limiting is visible; Nginx has basic route-level rate limits, but direct API port `8000` is exposed by Compose.
- Device activation endpoint is unauthenticated by design once a token is issued; it needs rate limiting and operational care.
- Upload validation checks size, MIME, and magic bytes, but does not scan images for malware or strip metadata.
- Nginx allows `client_max_body_size 50M`, while backend validation allows 20 MB. This is safe but inconsistent.
- MinIO presigned image URLs are generated for inspection reads; access duration and sharing policy need pilot documentation.
- Audit log model exists, but the reviewed code does not prove comprehensive audit writes for sensitive operations.
- Self-signed HTTPS is not appropriate for production and may not be trusted by tablets without manual certificate installation.
- API docs are disabled by FastAPI in production, but Nginx still proxies docs routes if the backend exposes them in non-production pilot mode.

## Deployment Blockers

- Docker Desktop and local laptop deployment are suitable for a controlled pilot, but not a production plant rollout.
- Trusted HTTPS for tablet access is unresolved. Same-machine `https://localhost` works differently from tablet-to-laptop `https://<laptop-ip>`.
- Compose exposes database, Redis, MinIO, API, web, Flower, and MLOps ports on the host. Pilot network exposure should be constrained.
- No proven backup/restore run was observed in this audit.
- No single non-destructive real-pilot startup-and-smoke procedure exists yet.
- Real pilot secrets are not separated from demo defaults in `.env.example`.

## Real-Camera Blockers

What works:

- `web/app/dashboard/capture/page.tsx` requests browser camera permission via `navigator.mediaDevices.getUserMedia`.
- It supports a fallback demo capture frame if camera access fails.
- It captures an image to canvas, converts it to a JPEG file, and uploads it.
- It has offline queue storage and sync behavior.

Remaining blockers:

- Browser camera access requires a secure context. `localhost` is special-cased by browsers, but tablet access to a laptop IP usually requires trusted HTTPS.
- Current fallback message can make a camera failure look like success. For a real pilot, the operator should clearly know whether the submitted image is live camera or demo fallback.
- Capture UI defaults `serial_number` to `KANBAI-DEMO-001` and `lot_number` to `FACTORY-PILOT-A`. That is risky for real pilot data and can trigger deterministic demo inference paths.
- Capture UI currently exposes device, serial, and lot. It does not visibly expose product family, production line, station, or shift selection, even though the backend supports those fields.
- Camera permission, lighting, focus, framing, and image-quality rules are documented but not enforced in the UI.

## Real-Image Inference Blockers

What exists:

- `AI_INFERENCE_MODE=mock` is stable and acceptance-tested.
- `backend/app/domains/ai/inference_service.py` contains a YOLO inference implementation pattern using Ultralytics.
- `backend/requirements.txt` includes `ultralytics` and `onnxruntime`.
- `backend/requirements-demo.txt` intentionally excludes heavy model dependencies.

Remaining blockers:

- No trained factory-specific model weights are present in the repository.
- No real-model smoke test proves an uploaded MinIO image can be read by the worker, passed through YOLO, and normalized back to inspection fields.
- No model artifact mounting procedure is proven in Docker Compose for the demo image.
- No real accuracy, precision, recall, mAP, false-positive, or false-negative claim can be made yet.
- ONNX mode is present in MLOps code but not proven through the active upload flow.
- The active workflow should continue to support mock fallback until real factory data and model weights exist.

## Data Collection Blockers

What exists:

- The schema supports factory, line, station, device, product, shift, serial, lot, timestamps, image, decision, confidence, defects, human review, and dataset contributions.
- `docs/pilot/FACTORY_DATA_COLLECTION_PROTOCOL.md` defines the first pilot target: 20 PASS, 10 FAIL, and 5 REVIEW/ambiguous images for proof of concept.
- HITL review can create dataset contribution records.

Remaining blockers:

- Capture UI does not yet guide the operator through product family and defect taxonomy selection.
- No field explicitly records image quality status such as blurred, dark, overexposed, cropped, or sensitive-content excluded.
- No permission/privacy flag records whether a given image can be used externally.
- Dataset export/back-up flow is not proven as part of a non-destructive pilot test.
- Dataset contribution records do not yet prove linkage to exported YOLO labels in the normal API smoke test.
- The first pilot target counts are documented but not tracked as a dedicated pilot progress metric.

## Observability/Metrics Blockers

What exists:

- Inspection stats expose total, PASS, FAIL, REVIEW, pending, pass rate, and average confidence.
- HITL stats expose pending reviews, completed reviews, and dataset contributions.
- MLOps drift endpoint computes recent pass rate, average confidence, and average latency when data exists.
- Nginx has access logs and basic route-level rate limiting.

Remaining blockers:

- No dedicated real-pilot metrics endpoint or dashboard proves all required pilot metrics together.
- AI vs human disagreement is not currently exposed as a first-class metric.
- Defect category distribution is not proven as a pilot KPI in the main dashboard.
- Average inference latency exists in MLOps/drift and inspection records, but not clearly in the operator/pilot acceptance view.
- Dataset growth is visible in demo MLOps surfaces, but real contribution/export growth is not proven.
- OpenTelemetry dependencies exist, but no exporter or dashboard is proven by this audit.
- No alerting exists for worker failures, queue backlog, camera upload failures, or storage errors.

## Readiness Assessment

Current status: READY FOR A CONTROLLED DEMO AND PILOT CONVERSATION, NOT YET READY FOR A CONTROLLED FIRST REAL FACTORY PILOT.

The repository already proves the core loop in demo/mock mode:

REAL OR DEMO PHOTO -> KANBAI UPLOAD -> INSPECTION RECORD -> AI DECISION -> HUMAN VALIDATION -> DATASET CONTRIBUTION -> LEARNING LOOP UI.

To reach the target status `READY FOR CONTROLLED FIRST FACTORY PILOT`, the next implementation should focus on:

1. Add explicit pilot-safe configuration while preserving demo mode.
2. Create non-destructive `scripts/real-pilot-smoke-test.ps1`.
3. Make capture metadata complete for line, station, product family, shift, serial, and lot.
4. Keep mock fallback but document and validate real inference adapter requirements.
5. Add minimal pilot metrics for human corrections, disagreement, defect categories, latency, and dataset growth.
6. Create practical pilot setup, checklist, and security review documents.

## Notes On Current Working Tree

At the time of this report, the working tree already contains uncommitted changes related to YOLOv8 opt-in inference documentation and worker image-path handling. Those changes support the future real-image inference adapter work, but they do not remove the blocker that no trained factory model weights or real-model validation are present.
