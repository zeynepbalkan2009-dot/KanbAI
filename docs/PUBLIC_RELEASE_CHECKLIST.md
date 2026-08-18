# Public Release Checklist

Use this before changing the repository visibility to public or enabling
GitHub Pages.

## What may be public

- `investor-demo/` static investor demo.
- Demo credentials such as `admin@demo.com / Admin123!`.
- Placeholder `.env.example` values marked as demo/local defaults.
- Documentation, scripts and Docker Compose files for local demo setup.

## What must not be public

- Real `.env` files or production secrets.
- TLS private keys, certificates or VPN/customer credentials.
- Real factory images, inspection exports or customer identifiers.
- YOLO/ONNX/model weights trained on factory data.
- Generated MLOps registry state or dataset versions.
- Cloud provider tokens, API keys, webhooks or personal access tokens.

## Required local checks

From the repository root:

```powershell
.\scripts\public-release-guard.ps1
git status --short
```

The guard fails if public-unsafe runtime files, model artifacts, datasets or
high-risk token patterns are tracked.

## GitHub checklist

1. Confirm the latest GitHub Actions run is green.
2. Confirm no real customer/factory data has ever been committed. If any secret
   was ever committed, rotate it even if it was later deleted.
3. Change repository visibility to public only after the guard passes.
4. Enable GitHub Pages with **Source: GitHub Actions**.
5. Run **Deploy public investor demo** manually with:

```text
PUBLISH_PUBLIC_DEMO
```

The public link will be:

```text
https://zeynepbalkan2009-dot.github.io/KanbAI/
```

The interactive demo link will be:

```text
https://zeynepbalkan2009-dot.github.io/KanbAI/product-demo.html
```

## Positioning

The public website is an investor-safe simulation. It does not run the backend,
does not upload real images, does not run YOLO and must not be presented as
validated factory model performance.
