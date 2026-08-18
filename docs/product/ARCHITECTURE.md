# KanbAI Factory Pilot Architecture

## Runtime
- Web dashboard: Next.js
- Backend API: FastAPI
- Database: PostgreSQL
- Cache and events: Redis
- Object storage: MinIO
- Async jobs: Celery
- MLOps: MLflow-compatible service layer

## Core Loop
Inspection -> AI Inference -> Human Validation -> Dataset Contribution -> Training Pipeline -> Model Registry -> Dashboard

## Tenant Isolation
Factory ID her ana tabloda yer alir. API sorgulari current user tenant_id ile filtrelenir.
