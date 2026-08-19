# GERMAKSAN Laptop + Phone Pilot Runbook

Goal: run the first controlled KanbAI factory trial with one laptop as the dashboard/server and one phone as the operator capture device.

## Pilot Positioning

This first factory session should prove the workflow, not unattended production automation:

1. Operator captures a real part image.
2. KanbAI stores the inspection.
3. AI provides an initial suggestion when a model is available.
4. A quality owner validates or corrects the result.
5. Verified images become dataset contribution candidates.

## Laptop Setup

Use PowerShell:

```powershell
cd D:\kanba-qc-platform\qc-platform
.\scripts\check-prerequisites.ps1
```

Prepare `.env`:

```env
APP_ENV=production
DEBUG=false
DEMO_MODE=false
PILOT_MODE=true
ALLOWED_ORIGINS=https://localhost,https://127.0.0.1,https://<laptop-ip>,http://localhost,http://127.0.0.1
```

For data collection without model weights:

```env
AI_INFERENCE_MODE=mock
YOLO_MODEL_PATH=/app/models/germaksan-v0.pt
```

For real YOLO inference:

```env
AI_INFERENCE_MODE=yolo
YOLO_MODEL_PATH=/app/models/germaksan-v0.pt
```

Place the local model file here:

```text
D:\kanba-qc-platform\qc-platform\backend\models\germaksan-v0.pt
```

Do not commit model weights, raw factory images, `.env`, certificates, or datasets to GitHub.

## Start Commands

Data collection / HITL mode:

```powershell
.\scripts\start-germaksan-pilot.ps1 -Build
```

Real YOLO mode after the `.pt` file is present and `.env` has `AI_INFERENCE_MODE=yolo`:

```powershell
.\scripts\start-germaksan-pilot.ps1 -Build -Yolo
```

## URLs

Laptop dashboard:

```text
https://localhost/dashboard/executive
```

Phone capture:

```text
https://<laptop-ip>/dashboard/capture
```

Device activation:

```text
https://<laptop-ip>/activate-device?token=<activation-token>
```

The phone and laptop must be on the same Wi-Fi. Phone browsers require HTTPS for camera access, so accept the local certificate warning during the first controlled session.

## Factory Flow

1. Create the GERMAKSAN tenant/admin if it does not exist.
2. Define one production line, one station, one product family, and one shift.
3. Create an activation token from the laptop dashboard.
4. Open the activation link on the phone.
5. Capture 20 PASS images, 10 clear defect images, and 5 ambiguous REVIEW images.
6. Review each uncertain result in HITL.
7. Mark only clean, useful, permission-safe images as dataset contributions.

## Safety Rules

- Do not photograph people, badges, customer drawings, confidential screens, or customer names.
- Do not use the output to block production during the first pilot.
- A human quality owner remains the final decision maker.
- Keep raw GERMAKSAN images local/private unless written permission is granted.

## Success Criteria

- Phone camera opens on HTTPS.
- Captured images appear in the laptop dashboard.
- Inspection records are created with station/product/lot context.
- HITL approve/reject/wrong prediction actions update the record.
- Dataset contribution count increases after human validation.
- Out-of-scope or low-quality images are not treated as trusted training data.
