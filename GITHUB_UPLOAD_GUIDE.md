# GitHub Upload Guide

## Recommended repo name

`kanba-qc-platform`

## Before upload

Do not commit `.env`. This repo includes `.env.example`; local users should run:

```bash
cp .env.example .env
```

## First-time GitHub push

```bash
git init
git add .
git commit -m "Initial Kanba QC Platform demo"
git branch -M main
git remote add origin https://github.com/<USERNAME>/kanba-qc-platform.git
git push -u origin main
```

## After clone

```bash
git clone https://github.com/<USERNAME>/kanba-qc-platform.git
cd kanba-qc-platform
cp .env.example .env
bash scripts/start.sh
```

## Useful checks

```bash
docker compose ps
docker compose logs -f api
docker compose logs -f celery-beat
docker compose logs -f worker-general
```

