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


## Controlled Model Deployment Gate

Production model changes are fail-closed and never autonomous:

`artifact upload → SHA-256 → trusted signature → factory authorization → metric validation → private artifact health check → deployment → rollback on health failure`

Factory model artifacts are stored under factory-scoped private keys. A production candidate must carry a valid signature bound to the factory, model name, version, and artifact hash. Candidate metrics must pass configured quality thresholds before deployment. The first health gate verifies the private artifact exists and its stored integrity metadata matches the registered SHA-256; future Edge runtimes can add inference-level readiness and canary checks without weakening this gate.

A failed health check marks the candidate deployment as rolled back and restores the previously active factory deployment. Continuous learning therefore produces candidates, not uncontrolled production model mutations.


## Secure Deployment Integrity Check

The deployment health gate verifies both the private object metadata and the SHA-256 digest of the stored artifact bytes. Metadata alone is not treated as proof of integrity.


## Legacy Model Registry Migration Safety

Migration `20261006_0007` intentionally leaves pre-existing `ai_models.factory_id` values as `NULL`. This is a compatibility state, not a model that is approved for secure production deployment. Do not infer ownership from model name, version, or a single historical deployment, and do not bulk-assign legacy rows to a factory: a legacy model may have been referenced by deployments from more than one factory. Legacy rows also do not automatically gain a trusted artifact digest or signature.

### Read-only inventory before cutover

Run these queries against a backup or read-only database session after the migration. They report legacy models and the distinct factory scopes in which each model was deployed; they do not modify data.

```sql
SELECT
    m.id AS model_id,
    m.name,
    m.version,
    COUNT(DISTINCT d.factory_id) AS deployment_factory_count,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT d.factory_id), NULL) AS deployment_factory_ids,
    COUNT(d.id) AS deployment_count
FROM ai_models AS m
LEFT JOIN model_deployments AS d ON d.model_id = m.id
WHERE m.factory_id IS NULL
GROUP BY m.id, m.name, m.version
ORDER BY m.name, m.version;
```

To inspect whether any legacy model has deployment history spanning multiple factories:

```sql
SELECT
    d.model_id,
    ARRAY_AGG(DISTINCT d.factory_id) AS factory_ids,
    COUNT(DISTINCT d.factory_id) AS factory_count
FROM model_deployments AS d
JOIN ai_models AS m ON m.id = d.model_id
WHERE m.factory_id IS NULL
GROUP BY d.model_id
HAVING COUNT(DISTINCT d.factory_id) > 1;
```

### Supported transition

1. Take and verify a database backup and preserve the legacy model/deployment audit history.
2. Review the inventory with the customer/factory owner. Treat ambiguous or multi-factory history as unresolved; never choose a tenant automatically.
3. Retrieve the original artifact from its trusted source, verify its provenance, and register it separately for the intended factory through the secure registration endpoint. This creates a factory-bound digest and signature under the current trust configuration.
4. Validate candidate metrics and the stored artifact, then use the secure deployment endpoint. Keep the legacy record for historical traceability until an explicit retention decision is approved.
5. If the original artifact or its provenance cannot be verified, retrain or re-export it from a trusted source instead of promoting the legacy row.

The migration does not automatically promote, re-sign, or reassign legacy models. This is deliberate: database ownership, artifact integrity, and model trust must be established explicitly before a model enters the secure deployment lifecycle.
