# KanbAI Factory Pilot Handoff

Date: 2026-07-27

Purpose: prepare KanbAI for a controlled factory demo or first pilot conversation where an operator captures inspections, a quality owner validates AI output, and the founder shows the continuous learning loop.

## Demo Objective

Show that KanbAI is not only defect detection.

The product story is:

1. Operator captures a part photo.
2. AI returns PASS / REVIEW / FAIL with confidence and defect evidence.
3. Quality owner reviews uncertain or failed cases.
4. Human decisions become dataset contributions.
5. The factory model improves through retraining and model registry workflow.

Core line:

> Every inspection becomes training data. Every factory builds its own AI.

## Recommended Room Setup

- Founder laptop: runs Docker Desktop and shares the executive dashboard.
- Tablet or second laptop: opens the capture UI as the operator station.
- Same network: tablet and founder laptop should be on the same Wi-Fi or hotspot.
- Browser: Chrome or Edge.
- Camera: browser permission must be allowed on the capture device.
- Backup path: if camera permission fails, use the built-in demo capture/fallback flow.

## Start The Demo Stack

From project root:

```powershell
cd D:\kanba-qc-platform\qc-platform
.\scripts\start-pilot-https.ps1 -PrimeDemo
```

Open:

```text
https://localhost/dashboard/executive
```

Demo login:

```text
admin@demo.com
Admin123!
```

Run acceptance validation before leaving for the demo:

```powershell
.\scripts\smoke-test.ps1 -ApiBaseUrl 'http://localhost:8000' -WebBaseUrl 'https://localhost' -AllowSelfSigned -SeedCount 8
```

Expected result:

```text
KanbAI factory demo acceptance test passed.
```

## Role-Based Demo Flow

### 1. Founder / Executive View

URL:

```text
https://localhost/dashboard/executive
```

Show:

- Factory health
- Cost savings
- Detected defects
- AI performance
- Learning loop summary

Message:

KanbAI turns inspection into an operating system for quality data, not a one-off model screen.

### 2. Plant Manager / Factory Overview

URL:

```text
https://localhost/dashboard/factory
```

Show:

- Production line map
- Inspection stations
- Green/yellow/red health indicators
- Devices and live station status

Message:

The plant manager sees where quality risk is forming in real time.

### 3. Operator / Capture Station

URL:

```text
https://localhost/dashboard/capture
```

Show:

- Factory name
- Line and station
- GPS, timestamp, battery and offline queue
- Photo capture
- AI result with confidence and bounding box style evidence
- Approve / reject / submit action

Message:

The operator workflow should feel like a simple CRM task: capture, decide, continue production.

### 4. Quality Manager / HITL Review

URL:

```text
https://localhost/dashboard/hitl
```

Show:

- Review queue
- AI decision
- Defect label correction
- Approve, reject, wrong prediction
- Dataset contribution

Message:

Human review does two jobs: it protects production quality today and creates labeled training data for tomorrow.

### 5. AI / MLOps Owner

URL:

```text
https://localhost/dashboard/mlops
```

Show:

- Current model
- Candidate / next model
- Dataset size
- Retraining counter
- Model registry and training history

Message:

The factory can move from generic AI to its own continuously improving model.

## Five-Minute Factory Script

1. Open Executive Dashboard.
2. Say the one-line vision.
3. Open Factory Overview and point to stations.
4. Open Capture and submit one inspection.
5. Show the AI result and confidence.
6. Open Inspection Records and show that the photo became a trackable quality record.
7. Open HITL and correct or approve a case.
8. Open Learning Ops and show dataset/model improvement.
9. Close on measurable pilot outcomes: throughput, missed defect reduction, review load reduction, dataset growth.

## Demo Recovery

If login fails:

- Use `admin@demo.com / Admin123!`.
- Confirm API readiness at `http://localhost:8000/ready`.
- Run `.\scripts\prime-demo.ps1 -Count 8`.

If camera fails:

- Allow browser camera permission.
- Use `https://localhost`, not plain IP, for local laptop camera tests.
- For a tablet on another device, use a trusted certificate, a tunnel, or install the local certificate on the tablet.
- Use the demo fallback capture flow if needed.

If dashboard metrics do not update:

- Refresh the dashboard.
- Confirm WebSocket status in the left sidebar.
- Confirm API is healthy: `http://localhost:8000/ready`.

If HITL queue is empty:

- Run:

```powershell
.\scripts\prime-demo.ps1 -Count 12
```

If Docker is slow:

- Keep Docker Desktop open.
- Make sure `C:` has at least 20-30 GB free.
- Avoid rebuilding images during the live meeting unless needed.

## Pilot Success Criteria

- Operator can complete an inspection in under 30 seconds.
- AI result appears without manual database changes.
- Failed or uncertain cases appear in HITL.
- A quality owner can correct a prediction.
- Corrected review increments dataset contribution.
- Dashboard metrics reflect the latest inspections.
- Model registry and learning loop are visible in the same product.

## What Is Still Demo Mode

- AI inference is deterministic demo/mock mode unless real model weights are connected.
- Local HTTPS uses a self-signed certificate.
- Demo reset and seed endpoints must stay disabled in production.
- Production pilots need rotated secrets and trusted certificates.
- Real factory sample images are still needed to prove model accuracy.

## What To Capture During A Factory Trial

- 30-100 permission-safe sample images per defect family.
- Operator timing: capture-to-submit and submit-to-result.
- False positive and false negative examples.
- Recurring defect categories.
- Quality manager correction notes.
- Station, line, shift and lot context.
- Cost assumptions: scrap, rework, inspection labor and missed-defect impact.

## Post-Demo Follow-Up

Send the factory:

- Screenshots of their demo flow.
- `docs/pilot/PILOT_PROPOSAL_ONE_PAGER.md`.
- `docs/pilot/FACTORY_DATA_COLLECTION_PROTOCOL.md`.
- Security and deployment assumptions.
- Timeline for connecting real model weights.

Recommended next technical milestone:

Connect a small real sample-image inference path while keeping deterministic demo mode as a fallback.
