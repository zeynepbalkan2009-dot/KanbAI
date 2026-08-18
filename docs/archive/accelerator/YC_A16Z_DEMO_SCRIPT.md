# KanbAI YC / a16z Demo Script

## 90-Second Founder Demo

### 0-10s: Problem

Factories still rely on manual visual inspection for critical quality control. It is slow, inconsistent across shifts, and the data usually disappears after the decision is made.

### 10-25s: Product

KanbAI is an Industrial AI Quality CRM. Operators capture inspections, AI detects defects, and quality engineers review uncertain cases in a human-in-the-loop queue.

### 25-45s: Core Insight

The key insight is that inspection is not only a pass/fail event. Every inspection is potential training data. Every correction by a quality engineer makes the factory model better.

### 45-65s: Demo Moment

Open `http://localhost/dashboard/executive`, then run:

1. `Prime demo data`
2. `Run live inspection`
3. Capture a demo image
4. Show AI defect result
5. Open `Review Queue`
6. Approve or correct the case
7. Open `Learning Ops`

### 65-80s: Moat

KanbAI compounds at the customer level. The more a factory uses it, the more proprietary defect data it creates, and the better its own model becomes.

### 80-90s: Close

We start with visual quality control, but the platform becomes the learning system for factory operations.

## 5-Minute Technical Demo

### 1. Executive View

URL: `http://localhost/dashboard/executive`

Show:
- Factory health
- Estimated savings
- Defect mix
- Learning curve
- 90-second flow checklist

Message:

KanbAI is a workflow product with AI in the loop, not a one-off model demo.

### 2. Operator Capture

URL: `http://localhost/dashboard/capture`

Show:
- Tablet-friendly capture interface
- Device, factory, station, GPS, battery, upload status
- Demo camera fallback if browser camera permission is blocked
- AI decision and confidence

Message:

The operator experience is intentionally simple: capture, submit, continue working.

### 3. Inspection Records

URL: `http://localhost/dashboard/inspections`

Show:
- CRM-style record list
- Search and status filters
- Owner / next action
- Recent inspections and decisions

Message:

Quality events become trackable records, not isolated photos.

### 4. Human-in-the-Loop Queue

URL: `http://localhost/dashboard/hitl`

Show:
- Open review cases
- AI decision
- Defect labels
- Approve, reject, wrong prediction
- Dataset contribution toggle

Message:

Humans validate edge cases and generate high-quality labeled data.

### 5. Learning Ops

URL: `http://localhost/dashboard/mlops`

Show:
- Current model
- Next model
- Dataset growth
- Retraining counter
- Model registry

Message:

KanbAI closes the loop from inspection to model improvement.

## Questions To Be Ready For

### Is this just another defect detection model?

No. The wedge is defect detection, but the product is the workflow and data layer around inspection, HITL, retraining, and model lifecycle management.

### Why will customers keep using it?

Because each inspection improves the customer's own dataset and model. The product gets more valuable as the factory uses it.

### What is the wedge?

Visual quality control in factories with repeatable inspection stations and measurable scrap/rework costs.

### What is the moat?

Customer-specific inspection datasets, validated by factory quality teams, tied to production workflows.

### What must be proven in pilots?

- Inspection throughput
- Defect detection accuracy
- Reduction in missed defects
- Reduction in manual review load
- Time to create a useful factory-specific model

## Demo Recovery Lines

If camera permission fails:

Use the built-in demo camera mode. The point is the workflow from capture to learning loop.

If WebSocket looks inactive:

The API readiness check is live; refresh the dashboard after the inspection to show updated records.

If model is challenged:

This demo uses a deterministic inference path for repeatability. The architecture is model-ready and can swap in a trained YOLO or vision model for a pilot dataset.
