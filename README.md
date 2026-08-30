# KanbAI Vision

**AI-powered visual quality control for manufacturing — using the cameras factories already have.**

[![KanbAI CI](https://github.com/zeynepbalkan2009-dot/KanbAI/actions/workflows/ci.yml/badge.svg)](https://github.com/zeynepbalkan2009-dot/KanbAI/actions/workflows/ci.yml)

> **Every inspection becomes training data. Every factory builds its own AI.**

KanbAI is a factory-focused AI quality-control platform for visual inspection, human-in-the-loop validation, traceable quality records, and continuous model improvement.

## Choose your path

| 👨‍💻 Developer | 🏭 Factory Pilot | 💰 Investor / Partner |
|---|---|---|
| [Run KanbAI locally](#-run-kanbai-locally) | [Start with the pilot docs](#-factory-pilot) | [See the product demo](#-public-demo) |
| Full-stack architecture, Docker and tests | Controlled real-world validation workflow | Product, business thesis and demo |

---

## Why KanbAI

Traditional visual quality-control deployments can require dedicated cameras, specialized hardware and significant integration work. KanbAI takes a software-first approach: connect an existing camera where possible, or use a low-cost camera/smartphone for an initial pilot, then build the AI quality workflow around the inspection point.

KanbAI is designed around a continuous learning loop:

**Capture → AI inference → PASS / REVIEW / FAIL → Human validation → Structured dataset → Model improvement**

The goal is not only to detect defects. It is to create a traceable quality layer where inspection decisions become reusable, factory-specific data.

## Product status

The platform foundation is built and the repository contains the web application, backend services, device setup, inspection workflow, human review, learning-ops surfaces, mobile capture and factory-pilot tooling.

**Current validation stage:** preparing and hardening the first controlled real-factory pilot.

The repository does **not** claim validated production AI accuracy. Real factory model performance requires factory-specific image data, labeling, training and measurement.

---

## Public Demo

### Investor site

https://zeynepbalkan2009-dot.github.io/KanbAI/

### Interactive product demo

https://zeynepbalkan2009-dot.github.io/KanbAI/product-demo.html

The public demo is an investor-safe, browser-only simulation. It does not upload factory data, does not call the production backend, does not contain trained factory model weights, and must not be interpreted as validated production performance.

### Product walkthrough

See the [Product Walkthrough](docs/product/PRODUCT_WALKTHROUGH.md) for the intended dashboard and inspection journey:

**Factory Dashboard → Device Registration → Operator Capture → AI Inspection → Human Review → Learning Ops → Battery Inspection**

A short product video can be added here once the final 60–90 second recording is available. We intentionally do not publish a placeholder or imply that a video exists when it does not.

---

## What the platform includes

- AI-assisted visual inspection workflow
- PASS / REVIEW / FAIL quality decisions
- Human approval, rejection and label correction
- Structured inspection records with production context
- Dataset contribution from reviewed inspections
- Continuous-learning and model-registry surfaces
- Factory dashboard and quality analytics
- Camera/device registration and activation
- Mobile capture workflow for initial pilot validation
- YOLO-based pilot inference integration
- Battery / energy-storage inspection workflow
- Docker-based local environment and CI smoke tests

## Full-stack architecture

- **Web:** Next.js 14, React, Tailwind, Recharts, Zustand
- **Backend:** FastAPI, SQLAlchemy async
- **Database / cache:** PostgreSQL, Redis
- **Storage:** MinIO
- **Workers:** Celery inference workers, Celery Beat, Flower
- **MLOps:** dataset, training and model-registry surfaces
- **Inference:** mock/demo mode plus YOLO pilot integration
- **Proxy:** Nginx with controlled local HTTPS pilot mode
- **Mobile:** Expo / React Native capture workflow

For the detailed architecture, see [Architecture](docs/product/ARCHITECTURE.md).

---

## 🚀 Run KanbAI locally

### Requirements

- Git
- Docker Desktop
- A machine with enough disk space for Docker images and local volumes
- Windows PowerShell users can use the commands below; macOS/Linux users can adapt the copy command to their shell

### 1. Clone the repository

```bash
git clone https://github.com/zeynepbalkan2009-dot/KanbAI.git
cd KanbAI
```

### 2. Create local configuration

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS / Linux:**

```bash
cp .env.example .env
```

The example configuration uses safe local/demo defaults. Never place production credentials in `.env.example` or commit a real `.env` file.

### 3. Start the stack

```bash
docker compose up -d --build
```

### 4. Open the web application

http://localhost

### 5. Run the smoke test

**Windows PowerShell:**

```powershell
.\scripts\smoke-test.ps1 -ApiBaseUrl 'http://localhost:8000' -WebBaseUrl 'http://localhost' -SeedCount 8
```

The local demo seed creates demo-only users for smoke testing. Do not reuse demo credentials for a factory pilot; create tenant-specific accounts and rotate secrets before any real deployment.

### Troubleshooting

Check container health:

```bash
docker compose ps
```

Inspect recent logs:

```bash
docker compose logs --tail=100
```

For a deeper setup guide, see the [documentation index](docs/README.md).

---

## 🏭 Factory Pilot

The factory pilot is separate from the public demo. Pilot mode is designed for controlled real-world validation with tenant/device setup, real inspection data and HTTPS access.

Start here:

- [Pilot Mode Runbook](docs/pilot/PILOT_MODE_RUNBOOK.md)
- [Factory Pilot Handoff](docs/pilot/FACTORY_PILOT_HANDOFF.md)
- [Factory Data Collection Protocol](docs/pilot/FACTORY_DATA_COLLECTION_PROTOCOL.md)
- [Factory Laptop + Phone Pilot](docs/pilot/FACTORY_LAPTOP_PHONE_PILOT.md)
- [Pilot Installation Guide](docs/pilot/PILOT_INSTALLATION_GUIDE.md)
- [Pilot Acceptance Criteria](docs/pilot/PILOT_ACCEPTANCE_CRITERIA.md)
- [Pilot Test Plan](docs/pilot/PILOT_TEST_PLAN.md)
- [Operator Guide](docs/pilot/FACTORY_OPERATOR_GUIDE.md)
- [Quality Manager Guide](docs/pilot/QUALITY_MANAGER_GUIDE.md)

### Pilot principle

Start with **one painful inspection point**. Prove image consistency, defect detection and human/AI agreement. Then expand to more stations, defect classes and production lines as verified data grows.

---

## 🔋 Battery & energy-storage workflow

KanbAI includes a dedicated battery/energy-storage inspection workflow and dataset preparation tooling. The current repository supports the software workflow; real production accuracy still requires factory-specific images, labeling, model training and measured validation.

See the battery-related pilot and dataset documentation in [`mlops/dataset/`](mlops/dataset/) and [`docs/pilot/`](docs/pilot/).

---

## Open Dataset Catalog

KanbAI does not scrape vendor websites or commit third-party raw images. Free open industrial datasets are tracked through a local catalog and downloader:

- [Open dataset catalog](mlops/dataset/OPEN_DATASETS.md)
- Catalog metadata: `mlops/dataset/open_sources.json`
- Windows helper: `.\scripts\prepare-open-datasets.ps1 -List`

---

## Documentation

- [Documentation index](docs/README.md)
- [Product Walkthrough](docs/product/PRODUCT_WALKTHROUGH.md)
- [Architecture](docs/product/ARCHITECTURE.md)
- [Known Limitations](docs/product/KNOWN_LIMITATIONS.md)
- [Public Demo Deployment](docs/deployment/PUBLIC_DEMO_DEPLOYMENT.md)
- [Public Release Checklist](docs/deployment/PUBLIC_RELEASE_CHECKLIST.md)
- [Technical Validation Report](docs/reports/TECHNICAL_VALIDATION_REPORT.md)
- [Real Factory Pilot Gap Analysis](docs/reports/REAL_FACTORY_PILOT_GAP_ANALYSIS.md)
- [GitHub Readiness Report](docs/reports/GITHUB_READINESS_REPORT.md)

---

## 🔐 Security & public-release boundary

Before changing repository visibility to public, run:

```powershell
.\scripts\public-release-guard.ps1
git status --short
```

The guard is intended to block tracked secrets, local runtime files, model weights, datasets and generated artifacts that should not be exposed publicly.

Never publish:

- real `.env` files or production secrets
- TLS private keys, customer certificates or VPN credentials
- real factory images or customer identifiers
- YOLO / ONNX / TensorRT weights trained on private factory data
- generated MLOps registry state or private datasets
- cloud tokens, API keys, webhooks or personal access tokens

If a secret was ever committed, rotate it even if the file was later deleted.

See [SECURITY.md](SECURITY.md) and the [Public Release Checklist](docs/deployment/PUBLIC_RELEASE_CHECKLIST.md).

---

## Repository scope

This repository is currently **source-available for technical evaluation and collaboration**. It is not licensed for unrestricted commercial reuse. See [LICENSE](LICENSE) before copying, modifying or redistributing the code.

## Contact

**Zeynep Balkan — Founder, KanbAI Vision**

Website: https://kanbai.ai/

GitHub: https://github.com/zeynepbalkan2009-dot/KanbAI
