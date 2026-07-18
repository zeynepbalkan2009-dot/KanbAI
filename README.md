# Kanba QC Platform — Industrial AI Quality Control Demo

B2B SaaS demo for factory quality-control workflows: a central web dashboard, FastAPI backend, PostgreSQL/Redis/MinIO infrastructure, mobile camera endpoint, mock/YOLO-ready inference, HITL review, model registry, drift checks, and retraining hooks.

## Demo scope

This repository is prepared for an İTÜ Çekirdek BİGG demo session. The default mode is intentionally `AI_INFERENCE_MODE=mock`, so the full product flow can be shown without a trained YOLO model or GPU dependency.

You can demonstrate:

- Admin login and factory dashboard
- Mobile/device activation architecture
- Inspection records and live quality metrics
- MLOps dashboard
- HITL review queue
- Model registry and production model banner
- Demo data seeding
- Manual retraining trigger / staging-to-production story

## Stack

- Web: Next.js 14, React, Tailwind, React Query, Recharts
- Backend: FastAPI, SQLAlchemy async, PostgreSQL
- Queue/cache: Redis, Celery, Celery Beat, Flower
- Storage: MinIO
- MLOps: MLflow, local model registry, dataset preprocessing, training scripts, HITL exporter
- AI: mock inference by default; YOLOv8 / ONNX paths are prepared
- Mobile: Expo React Native prototype

## Quick start

```bash
cp .env.example .env
bash scripts/start.sh
```

Open:

- Web panel: http://localhost:3000
- API docs: http://localhost:8000/docs
- Flower: http://localhost:5555
- MinIO console: http://localhost:9001
- MLflow: http://localhost:5000

Demo users:

```text
admin@demo.com / Admin123!
operator@demo.com / Operator123!
```

## Seed demo data

After login, get a bearer token from the web app/API and call:

```bash
curl -X POST "http://localhost:8000/api/v1/mlops/demo/seed?scenario=metal&count=200" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Scenarios:

- `metal`
- `cnc`
- `plastic`

## Important demo note

The package is demo-grade, not final production-grade. Real production needs real factory dataset collection, YOLO training, model validation, object-storage hardening, production secrets, CI/CD, Kubernetes deployment, observability dashboards, and security review.

