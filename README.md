# KanbAI

Industrial AI Quality Control Platform

[![KanbAI CI](https://github.com/zeynepbalkan2009-dot/KanbAI/actions/workflows/ci.yml/badge.svg)](https://github.com/zeynepbalkan2009-dot/KanbAI/actions/workflows/ci.yml)

> Every inspection becomes training data.  
> Every factory builds its own AI.

KanbAI is a factory-focused AI quality control platform for visual inspection,
human-in-the-loop validation and continuous model improvement.

## Public Demo

Investor site:

```text
https://zeynepbalkan2009-dot.github.io/KanbAI/
```

Interactive product demo:

```text
https://zeynepbalkan2009-dot.github.io/KanbAI/product-demo.html
```

The public demo is a browser-only simulation. It does not upload factory data,
does not call the backend and does not claim validated production accuracy.

## What It Shows

- AI-assisted visual inspection workflow
- PASS / REVIEW / FAIL quality decisions
- Human approval, rejection and label correction
- Dataset contribution from reviewed inspections
- Continuous learning and model registry story
- Factory dashboard, device activation and inspection records in the full stack

## Product Thesis

Factories do not only need a defect detector. They need a quality operating
layer where each inspection is traceable, reviewable and reusable for model
improvement.

KanbAI starts with one painful inspection point, measures the baseline, then
expands across stations, defect classes and factories as verified data grows.

## Full Stack

- Web: Next.js 14, React, Tailwind, Recharts, Zustand
- Backend: FastAPI, SQLAlchemy async
- Database/cache: PostgreSQL, Redis
- Storage: MinIO
- Workers: Celery inference workers, Celery Beat, Flower
- MLOps: demo model registry, dataset and retraining surfaces
- Proxy: Nginx with local HTTPS pilot mode

## Local Demo

From the project root:

```powershell
cd D:\kanba-qc-platform\qc-platform
copy .env.example .env
docker compose up -d --build
```

Open:

```text
http://localhost
```

The local demo seed creates demo-only users for smoke testing. Do not reuse
demo credentials for a factory pilot; create tenant-specific accounts and
rotate secrets before any real deployment.

Run the smoke test:

```powershell
.\scripts\smoke-test.ps1 -ApiBaseUrl 'http://localhost:8000' -WebBaseUrl 'http://localhost' -SeedCount 8
```

## Factory Pilot

The factory pilot mode is separate from the public demo. It disables demo seed
and reset endpoints, uses tenant/device setup and should run behind controlled
HTTPS access.

Start here:

- [Pilot Mode Runbook](docs/pilot/PILOT_MODE_RUNBOOK.md)
- [Factory Pilot Handoff](docs/pilot/FACTORY_PILOT_HANDOFF.md)
- [Pilot Acceptance Criteria](docs/pilot/PILOT_ACCEPTANCE_CRITERIA.md)

## Open Dataset Catalog

KanbAI does not scrape vendor websites or commit third-party raw images. Free
open industrial datasets are tracked through a local catalog and downloader:

- [Open dataset catalog](mlops/dataset/OPEN_DATASETS.md)
- Catalog metadata: `mlops/dataset/open_sources.json`
- Windows helper: `.\scripts\prepare-open-datasets.ps1 -List`

## Documentation

- [Documentation index](docs/README.md)
- [Architecture](docs/product/ARCHITECTURE.md)
- [Public demo deployment](docs/deployment/PUBLIC_DEMO_DEPLOYMENT.md)
- [Public release checklist](docs/deployment/PUBLIC_RELEASE_CHECKLIST.md)
- [Technical validation report](docs/reports/TECHNICAL_VALIDATION_REPORT.md)
- [Known limitations](docs/product/KNOWN_LIMITATIONS.md)

## Security

Before publishing or deploying, run:

```powershell
.\scripts\public-release-guard.ps1
```

The guard blocks tracked secrets, local runtime files, model weights, datasets
and generated artifacts that should not be exposed publicly.
