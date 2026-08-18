# KanbAI

Industrial AI Quality Control Platform

[![KanbAI CI](https://github.com/zeynepbalkan2009-dot/KanbAI/actions/workflows/ci.yml/badge.svg)](https://github.com/zeynepbalkan2009-dot/KanbAI/actions/workflows/ci.yml)

> Every inspection becomes training data.  
> Every factory builds its own AI.

KanbAI is a production-like factory demo for AI visual inspection, human-in-the-loop validation and continuous learning. It is designed for factory pilots, ITU Cekirdek / TUBITAK BIGG demo sessions, YC-style accelerator reviews and enterprise sales conversations.

## What KanbAI Shows

- Operator photo capture from tablet/laptop
- AI defect inference with PASS / REVIEW / FAIL decisions
- Factory dashboard and digital twin overview
- Device activation and factory endpoint CRM
- Inspection records and CSV export
- HITL review queue with corrected labels
- Dataset contribution from reviewed inspections
- Continuous learning and model registry story
- Investor / executive demo view

The default mode is `AI_INFERENCE_MODE=mock` so the full workflow is stable without GPU or trained model weights. Real factory model weights can be added later.

## Readiness at a Glance

| Use case | Status | Evidence |
| --- | --- | --- |
| Investor / accelerator demo | Ready | Docker smoke test, executive dashboard, stable mock inference |
| Controlled first factory pilot | Ready to configure | Explicit Pilot Mode, non-destructive safety test, tenant bootstrap runbook |
| Production rollout | Not claimed | Requires validated model metrics, trusted TLS, backup/restore rehearsal, and security hardening |

The project deliberately distinguishes a persuasive demo from a real-factory trial. See the [Controlled Factory Pilot Runbook](docs/PILOT_MODE_RUNBOOK.md) before placing it on a line.

## Stack

- Web: Next.js 14, React, Tailwind, Recharts, Zustand
- Backend: FastAPI, SQLAlchemy async
- Database/cache: PostgreSQL, Redis
- Storage: MinIO
- Workers: Celery inference/general workers, Celery Beat, Flower
- MLOps: lightweight demo model registry, dataset/HITL/retraining surfaces
- Proxy: Nginx with local HTTPS pilot mode
- Demo web container: Next.js standalone production server

## Quick Start

From the project root:

```powershell
cd D:\kanba-qc-platform\qc-platform
copy .env.example .env
.\scripts\start-pilot-https.ps1 -PrimeDemo
```

Open:

```text
https://localhost/dashboard/executive
```

If the browser shows a certificate warning, continue for the local self-signed demo certificate. For a simpler laptop-only flow, open:

```text
http://localhost
```

Demo login:

```text
admin@demo.com
Admin123!
```

## Recommended Demo Path

```text
Investor Demo -> Pilot Workspace -> Factory Overview -> Capture -> Inspection Records -> Review Queue -> Learning Ops -> Factory Devices
```

## Demo Acceptance Test

Run the full factory acceptance smoke test:

```powershell
.\scripts\smoke-test.ps1 -ApiBaseUrl 'http://localhost:8000' -WebBaseUrl 'https://localhost' -AllowSelfSigned -SeedCount 8
```

This validates readiness, admin login, demo reset/seed, device activation, photo upload, AI inference, dashboard stats, HITL review, dataset contribution, MLOps registry, CSV export and HTTPS web routes.

GitHub Actions also runs a Docker Compose demo smoke test on every push and pull request. The `Docker demo smoke test` job builds the stack, waits for API readiness, runs Alembic migrations, then executes `scripts/smoke-test.ps1` against the live services.

The same CI job then restarts the live API with `PILOT_MODE=true`, verifies startup completes without demo seeding, and confirms both demo data endpoints return HTTP 403 through `scripts/pilot-mode-smoke-test.ps1`.

## Controlled Factory Pilot

Do not use demo credentials, demo reset/seed, or self-signed TLS as the factory trial configuration. Start with the [Pilot Mode Runbook](docs/PILOT_MODE_RUNBOOK.md), which covers secret rotation, tenant bootstrap, HTTPS/network boundaries, and a non-destructive acceptance check.

For a controlled pilot, use `scripts/start-real-pilot.ps1`; it requires
`PILOT_MODE=true` and `DEMO_MODE=false`, and publishes only Nginx ports 80/443.

## Public Investor Demo

The landing page at `/` and product demo at `/login` are designed to be served
from the same public HTTPS domain. The deployable, isolated demo stack is
documented in [Public Investor Demo Deployment](docs/PUBLIC_DEMO_DEPLOYMENT.md).
It uses mock inference and must never receive real factory data.

Before making the repository public or enabling GitHub Pages, run the
[Public Release Checklist](docs/PUBLIC_RELEASE_CHECKLIST.md) and
`scripts/public-release-guard.ps1`.

## Private GitHub Demo

For GitHub-only review without publishing a public site, use the static
[investor demo](investor-demo/index.html) through GitHub Codespaces. The
dev container serves it on port `8080`, and Codespaces forwarded ports are
private by default. See [Private GitHub Demo](docs/PRIVATE_GITHUB_DEMO.md).

GitHub Pages deployment remains manual-only because a Pages site is public.

## Real YOLOv8 Inference Opt-In

The stable demo and CI path intentionally run with:

```text
AI_INFERENCE_MODE=mock
```

For a factory pilot with trained weights, install the full backend dependency set from `backend/requirements.txt`, place the model under `backend/models/best.pt` or mount another `.pt` file, then set:

```text
AI_INFERENCE_MODE=yolo
YOLO_MODEL_PATH=models/best.pt
```

In YOLO mode the Celery inference worker downloads uploaded inspection images from MinIO into a temporary local file before running Ultralytics YOLOv8. Mock mode and the GitHub Actions smoke test are unchanged, so the acceptance demo remains deterministic without GPU or model weights.

## Database Migrations

For a fresh PostgreSQL database, run:

```powershell
docker compose exec api alembic upgrade head
```

The demo stack also creates tables automatically in development mode for convenience, but production and long-lived pilots should use Alembic migrations.

## Useful URLs

```text
Web app:        https://localhost/dashboard/executive
Pilot workspace:https://localhost/dashboard/pilot
HTTP web app:   http://localhost
API health:     http://localhost:8000/ready
API docs:       http://localhost:8000/docs
Flower:         http://localhost:5555
MinIO console:  http://localhost:9001
MLOps demo:     http://localhost:5000
```

## Documentation

- `TECHNICAL_VALIDATION_REPORT.md`
- `FACTORY_PILOT_HANDOFF.md`
- `PILOT_PROPOSAL_ONE_PAGER.md`
- `FACTORY_DATA_COLLECTION_PROTOCOL.md`
- `INVESTOR_ACCELERATOR_READINESS.md`
- `YC_A16Z_DEMO_SCRIPT.md`
- `ITU_BIGG_DEMO_GUIDE.md`
- `docs/MOBILE_SETUP_GUIDE.md`
- `docs/PILOT_INSTALLATION_GUIDE.md`
- `docs/PILOT_ACCEPTANCE_CRITERIA.md`
- `docs/SECURITY.md`

## Production Notes

This is a factory-ready demo, not a hardened production deployment. Before production use:

- Replace mock inference with trained factory model weights.
- Run Alembic migrations against production databases.
- Rotate every secret from `.env.example`.
- Disable or restrict demo seed/reset endpoints.
- Use trusted HTTPS certificates for tablets and factory laptops.
- Add production audit exports and CI/CD gates.
