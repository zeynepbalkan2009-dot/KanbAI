# KanbAI Mobile Capture Architecture

## Status

Architecture and profile contract are implemented. Native Android/iOS clients are not yet implemented.
The current web/PWA capture screen is a pilot fallback and must not claim deterministic camera control.

## Supported operating modes

### Moving conveyor

- Preferred trigger: PLC/photoelectric sensor or native continuous frame stream.
- Camera and lighting must be fixed relative to the conveyor.
- Exposure time must be selected from conveyor speed and allowed motion blur.
- Each frame must carry line, station, product, revision, lot and timestamp context.
- Browser file capture is not an acceptable production trigger.

### Fixed inspection station

- Fixed mount, fixed distance, controlled lighting and repeatable background.
- Native focus/exposure lock is preferred after commissioning calibration.
- Manual capture remains available as a recovery path.
- Dimensional claims additionally require camera calibration and a scale reference.

### Handheld tablet or phone

- Alignment overlay guides product pose and framing.
- Accelerometer/gyroscope gate indicates when the device is stable.
- Native client may trigger automatically only after stability, focus, exposure and alignment gates pass.
- PWA currently provides a stability indicator and manual capture; it does not guarantee focus/exposure lock.

## Client capability levels

### Level 0 — PWA fallback (implemented)

- `getUserMedia`/file capture where supported.
- DeviceMotion stability indicator where permission is available.
- Product alignment overlay.
- Manual submission and offline-friendly workflow foundation.
- No deterministic lens, focus or exposure control across all devices.

### Level 1 — Native Android

- CameraX for lifecycle and capture pipeline; Camera2 interop where device-specific controls are required.
- AF/AE convergence detection followed by focus and exposure lock.
- Exposure compensation and shutter/ISO bounds from a commissioned station profile.
- Sensor-fusion stability gate and autonomous capture.
- On-device blur, glare, framing and duplicate-frame quality gates.

### Level 1 — Native iOS/iPadOS

- AVFoundation capture session with explicit device configuration locking.
- Focus/exposure point, convergence observation and lock.
- Motion gating with Core Motion.
- Overlay/alignment and autonomous capture after all gates pass.

## Capture gate state machine

`IDLE -> PRODUCT_VISIBLE -> ALIGNED -> STABLE -> FOCUS_READY -> EXPOSURE_READY -> CAPTURED -> QUALITY_GATE -> QUEUED`

Any failed gate returns to the nearest safe state. A captured image is uploaded only when blur, glare,
framing and profile-context checks pass. Operators must always have a visible cancel/retry path.

## Domain separation

- `steel_equipment`: engineering verification, machining, welded fabrication and equipment assembly.
- `battery_assembly`: cell loading, polarity, connectors, insulation, weld and final visual assembly.

The domains use different dataset manifests, defect ontologies, capture profiles and future model artifacts.
Images and model metrics must never be pooled across these domains without an explicit validated experiment.

## Production acceptance gates

- Factory-approved SKU, revision, operation stage and defect definitions.
- Approved camera/device allow-list and repeatable lighting.
- Measured blur/glare rejection performance.
- Dataset split by physical part/lot, not random near-duplicate frames.
- Per-class precision/recall and false-accept/false-reject targets approved by quality engineering.
- Human review remains mandatory until the pilot acceptance criteria are met.
