# KanbAI

Industrial AI Quality Control Platform

[![KanbAI CI](https://github.com/zeynepbalkan2009-dot/KanbAI/actions/workflows/ci.yml/badge.svg)](https://github.com/zeynepbalkan2009-dot/KanbAI/actions/workflows/ci.yml)

> Every inspection becomes training data.  
> Every factory builds its own AI.

KanbAI is a production-like factory demo for AI visual inspection, human-in-the-loop validation and continuous learning. It is designed for factory pilots, ITU Cekirdek / TUBITAK BIGG demo sessions, YC-style accelerator reviews and enterprise sales conversations.

## What This Demo Shows

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
