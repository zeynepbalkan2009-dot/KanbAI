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


## Secure Hybrid Edge–Cloud Foundation

KanbAI is being extended toward a hybrid architecture in which the factory Edge executes latency-sensitive inspection work while the Cloud provides centralized control, model lifecycle and audit coordination.

### Edge responsibilities

- Local image capture and inference
- Offline-first operation
- Durable local event/outbox queue
- Human validation
- Local audit records
- Device identity and credential protection
- Fail-closed model/configuration validation

### Cloud responsibilities

- Tenant/factory/device control plane
- Durable Edge event ingress
- Idempotent synchronization
- Model registry and deployment policy
- Dataset and learning operations
- Central audit and security monitoring

### Data sovereignty principle

Raw factory imagery and proprietary production information are not treated as globally reusable data. The architecture is intended to keep sensitive raw data under factory/customer control by default. Any future cross-factory learning must use an explicit privacy-preserving mechanism and customer authorization; federated or secure-aggregation approaches are future R&D directions, not current production capabilities.

### Edge authentication

Each activated Edge device receives a one-time device credential. KanbAI stores only a cryptographic hash of that credential. Edge synchronization uses the credential to authenticate the device and an idempotent `event_id` to prevent replay/duplicate ingestion.

### Current implementation boundary

The current branch establishes the security and synchronization foundation: device credential hashing, authenticated Edge event ingress, durable sync-event persistence, payload hashing, pilot/production security configuration, and reduced host exposure in Docker Compose.

It does **not** yet claim mTLS, signed model deployment, full offline Edge inference runtime, federated learning, or autonomous production retraining. Those remain subsequent implementation stages.
