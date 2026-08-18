# Security Policy

## Public Demo Boundary

The GitHub Pages demo is intentionally static and browser-only:

- no backend calls
- no server-side upload
- no real factory data
- no trained model weights
- no production credentials

Uploaded images in the public product demo stay in the browser and are used only
for local simulation.

## What Must Not Be Committed

- `.env` files or production secrets
- TLS private keys or customer certificates
- real factory images, exports or customer identifiers
- YOLO, ONNX or TensorRT model weights
- generated datasets, model registry state or MLOps artifacts
- cloud tokens, webhooks or personal access tokens

Run this before publishing:

```powershell
.\scripts\public-release-guard.ps1
```

The same guard runs in CI and before GitHub Pages deployment.

## Factory Pilot Safety

For a real factory pilot:

- use `PILOT_MODE=true`
- use `DEMO_MODE=false`
- rotate every value from `.env.example`
- disable demo seed/reset workflows
- use trusted HTTPS certificates
- expose only the intended proxy endpoint to operators

## Reporting

If you find a security issue, please do not open a public issue with sensitive
details. Contact the maintainer directly.
