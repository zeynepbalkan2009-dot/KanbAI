# GitHub Upload Guide

Repository:

```text
https://github.com/zeynepbalkan2009-dot/KanbAI.git
```

## Before Commit

Do not commit local runtime files:

- `.env`
- local HTTPS cert/key files under `infra/nginx/certs/`
- generated model registry JSON files under `mlops/registry/`
- `outputs/`
- `node_modules/`
- `.next/`
- Docker volume data

The current `.gitignore` excludes these.

## Validation Before Push

Run:

```powershell
cd D:\kanba-qc-platform\qc-platform
.\scripts\smoke-test.ps1 -ApiBaseUrl 'http://localhost:8000' -WebBaseUrl 'https://localhost' -AllowSelfSigned -SeedCount 8
cd web
.\node_modules\.bin\tsc.cmd --noEmit --incremental false
npm run build
```

## Commit And Push

```powershell
git status --short
git add .
git commit -m "Prepare KanbAI factory pilot demo"
git branch -M main
git remote set-url origin https://github.com/zeynepbalkan2009-dot/KanbAI.git
git push -u origin main
```

## Demo After Clone

```powershell
copy .env.example .env
.\scripts\start-pilot-https.ps1 -PrimeDemo
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
