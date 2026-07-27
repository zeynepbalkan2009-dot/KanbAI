# KanbAI Investor / Accelerator Readiness

Date: 2026-07-27

Target audiences:
- Y Combinator
- a16z Speedrun
- ITU Cekirdek
- TUBITAK BIGG
- Enterprise factory pilots

## Core Narrative

KanbAI is not only a defect detection tool.

The product is an Industrial AI Quality CRM where every inspection becomes a case, every human review becomes training data, and every factory builds its own continuously improving model.

Primary line:

> Every inspection becomes training data. Every factory builds its own AI.

## 90-Second Demo Flow

1. Open `http://localhost/dashboard/executive` or `https://localhost/dashboard/executive`
   - Show the investor narrative, ROI, learning curve, and factory health.
   - Optional terminal prep: `.\scripts\prime-demo.ps1 -Count 100`
   - Tablet prep: `.\scripts\start-pilot-https.ps1 -PrimeDemo`

2. Open `Pilot Workspace`
   - Show the readiness score, pilot scope, dataset targets and risk register.
   - Position KanbAI as a factory account workflow, not a loose AI demo.

3. Open `Capture`
   - Operator captures or simulates one inspection photo.
   - AI returns a deterministic defect result for demo metadata.

4. Open `Review Queue`
   - Quality manager validates the case.
   - The case becomes a dataset contribution.

5. Open `Learning Ops`
   - Show dataset growth, retraining counter, current model, next model, and model registry.

6. Return to `Investor Demo`
   - Close with savings, workflow adoption, and data moat.

## What Must Be True During The Demo

- Login works with demo credentials.
- Capture works even when browser camera permission is blocked.
- Capture is installable as a PWA shell on supported browsers.
- Offline capture attempts are stored in a persistent local queue and can be synced later.
- HTTPS pilot mode serves the app on port 443 for tablet camera trials.
- Device activation flow can pair a tablet with a station through `/activate-device`.
- A failed demo inspection appears in HITL.
- HITL review can close a case without backend errors.
- Dashboard metrics update after refresh.
- Learning Ops shows the continuous learning loop.
- `/ready` returns PostgreSQL, Redis, and MinIO as healthy.
- `.\scripts\prime-demo.ps1` can reset demo-tagged records, seed fresh inspections, and check core routes.

## Accelerator Readiness Gaps

### P0 - Before live factory trial

- Replace mock inference with at least one real model or real sample-based inference path.
- Add 3-5 permission-safe real factory sample images for the live narrative.
- Use a trusted certificate/tunnel for tablet camera tests from a separate device.
- Rehearse the full demo on the exact laptop/tablet/network that will be used in the meeting.

Current status:

- PWA manifest and service worker are present.
- Offline queue exists in the capture UI.
- One-command demo prime exists via `scripts/prime-demo.ps1`.
- HTTPS pilot mode exists via `scripts/start-pilot-https.ps1`.
- Device activation center exists at `/dashboard/devices`.
- Tablet activation page exists at `/activate-device?token=...`.
- Factory handoff runbook exists in `FACTORY_PILOT_HANDOFF.md`.
- Pilot proposal one-pager exists in `PILOT_PROPOSAL_ONE_PAGER.md`.
- Factory data collection protocol exists in `FACTORY_DATA_COLLECTION_PROTOCOL.md`.
- Full acceptance validation exists in `scripts/smoke-test.ps1`.
- Camera still requires the tablet to trust the self-signed certificate, or a trusted certificate/tunnel must be used for separate-device tests.

### P1 - Before YC/a16z-style interview

- Add real pilot economics: inspection volume, scrap cost, rework cost, false negative cost.
- Add a short model improvement story: v1.8 to v1.9, dataset growth, accuracy lift.
- Tighten the founder script around one quantified before/after pilot case.
- Prepare a 60-second fallback video or screen recording in case live network conditions fail.

### P2 - Before enterprise procurement

- Add role-based dashboards for operator, quality manager, and plant manager.
- Add audit log for every HITL decision.
- Add backup/restore rehearsal evidence.
- Add security hardening checklist: TLS, secrets, credentials, MinIO policy, admin rotation.

## Positioning

KanbAI should be presented as:

- A workflow product, not an AI demo.
- A data network inside each factory, not a static model.
- A wedge into manufacturing operations, starting from visual quality control.
- A platform that compounds with use because human validation creates proprietary data.

## Current Demo URLs

- Executive / Investor: `http://localhost/dashboard/executive`
- Pilot Workspace: `http://localhost/dashboard/pilot`
- Operator Capture: `http://localhost/dashboard/capture`
- Factory Devices: `http://localhost/dashboard/devices`
- Tablet Activation: `http://localhost/activate-device`
- Quality Review: `http://localhost/dashboard/hitl`
- Learning Ops: `http://localhost/dashboard/mlops`
- System readiness: `http://localhost/ready`

HTTPS equivalents are available after `.\scripts\start-pilot-https.ps1`.
