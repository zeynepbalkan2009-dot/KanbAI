# ITU Cekirdek BIGG Demo Session Guide

## 1. One-Line Pitch

KanbAI is an Industrial AI Quality Control Platform that helps factories capture inspection photos, detect defects with AI, validate uncertain cases through human-in-the-loop review, and turn every inspection into training data for continuous model improvement.

## 2. Problem

Factory quality control is often fragmented across manual visual checks, spreadsheets, isolated photo folders and late defect reports. This increases scrap cost, weakens traceability and prevents factory leaders from seeing quality risk in real time.

## 3. Solution

KanbAI combines three layers:

1. Operator capture: tablet/laptop photo capture at the inspection station.
2. Quality CRM: inspection records, dashboards, device status, HITL review and CSV export.
3. Learning system: dataset contribution, retraining counter, model registry and model lifecycle story.

The product is intentionally more than a defect detector. It is the workflow and data layer around industrial inspection.

## 4. Demo Flow

Recommended path:

```text
Investor Demo -> Factory Overview -> Capture -> Inspection Records -> HITL Review -> Learning Ops
```

Open:

```text
https://localhost/dashboard/executive
```

Login:

```text
admin@demo.com
Admin123!
```

Before the live session, run:

```powershell
.\scripts\start-pilot-https.ps1 -PrimeDemo
.\scripts\smoke-test.ps1 -ApiBaseUrl 'http://localhost:8000' -WebBaseUrl 'https://localhost' -AllowSelfSigned -SeedCount 8
```

Expected result:

```text
KanbAI factory demo acceptance test passed.
```

## 5. Founder Talk Track

"KanbAI turns factory inspection into a continuously learning quality system. An operator captures a part photo, AI detects potential defects, and uncertain or failed cases go to a human review queue. Every human correction becomes labeled training data. Over time, each factory builds a model that understands its own parts, defects, lighting, stations and production reality."

## 6. What To Show

- Executive dashboard: factory health, savings and AI performance.
- Factory overview: stations, production line state and device status.
- Capture screen: photo upload, GPS, timestamp, battery, offline queue and AI result.
- Inspection records: CRM-style searchable history.
- HITL panel: approve, reject, wrong prediction and label correction.
- MLOps dashboard: current model, next model, dataset growth and retraining story.

## 7. Expected Questions

### Is this only a mock AI demo?

The current demo uses deterministic inference so live sessions are stable. The architecture is ready for trained YOLO/ONNX or another vision model once pilot images are collected.

### Why will factories keep using this?

Because the product gets more valuable with use. Each inspection creates operational traceability, and each human review improves the factory-specific dataset.

### What is the moat?

Customer-specific inspection data, validated by factory quality teams and connected to production workflow. The model improves around each factory's own visual reality.

### What must a pilot prove?

- Faster inspection workflow.
- Lower missed-defect risk.
- Lower manual review load.
- Better defect traceability.
- Growth of a useful labeled dataset.
- Clear path from v1 model to improved factory-specific model.

## 8. Recovery Lines

If camera permission fails:

"We use the built-in fallback capture path for the live demo. In a real tablet pilot, we use trusted HTTPS or a managed certificate so camera permission is stable."

If the model is challenged:

"The product advantage is the learning loop. We start with stable inference, collect factory-specific examples, validate them with quality engineers, and retrain the model around the factory's own defects."

If WebSocket status looks inactive:

"The backend and database are live; dashboard data can be refreshed after the inspection. The acceptance test validates the full API path."

## 9. Closing

KanbAI starts with visual quality control, but the long-term product is a learning infrastructure layer for factories: inspection, human validation, dataset growth, retraining and model governance in one system.
