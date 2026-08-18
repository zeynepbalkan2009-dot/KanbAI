# Controlled Factory Pilot Runbook

This runbook starts a real-factory trial without demo data. It is suitable for a
single controlled factory tenant, not an unattended production rollout.

## Safety boundary

| Mode | `DEMO_MODE` | `PILOT_MODE` | Automatic demo seed | Demo seed/reset API |
| --- | --- | --- | --- | --- |
| Investor demo | `true` | `false` | Enabled in development | Enabled for admins |
| Controlled factory pilot | `false` | `true` | Disabled | HTTP 403 |
| Production | `false` | `true` | Disabled | HTTP 403 |

`PILOT_MODE=true` wins even if `DEMO_MODE=true` is accidentally retained.

## Before bringing the stack online

1. Copy `.env.example` to `.env`; never commit it.
2. Set `APP_ENV=production`, `PILOT_MODE=true`, `DEMO_MODE=false`, `DEBUG=false`,
   and use a unique `JWT_SECRET_KEY`, `JWT_REFRESH_SECRET_KEY`, PostgreSQL
   password, Redis password, and MinIO credentials.
3. Set `ALLOWED_ORIGINS` only to the actual pilot laptop/tablet HTTPS origin.
4. Install a trusted certificate for the laptop IP or pilot hostname. A
   self-signed certificate is appropriate only for a supervised dry run.
5. Use the supplied pilot Compose overlay so PostgreSQL, Redis, MinIO, API,
   Flower, and MLflow are not published on the factory LAN; expose only the
   HTTPS reverse proxy to tablets.
6. Obtain written approval for image retention, export, and access roles.

## First startup and bootstrap

Run migrations before creating the tenant. The bootstrap command creates one
new factory and one admin, and refuses to modify an existing slug or email.

```powershell
.\scripts\start-real-pilot.ps1 -Build
$pilotCompose = @('-f', 'docker-compose.yml', '-f', 'docker-compose.https.yml', '-f', 'docker-compose.pilot.yml')
docker compose @pilotCompose exec -T api alembic upgrade head
docker compose @pilotCompose exec -it api python scripts/bootstrap_pilot_admin.py `
  --factory-name 'Example Factory' `
  --factory-slug example-factory `
  --admin-email qa.admin@example-factory.com `
  --admin-name 'QA Admin' `
  --location 'Istanbul, TR'
```

The command prompts for a password. Do not pass `--password` into a shared
shell history except in a controlled automation environment.

## Non-destructive verification

After the administrator has logged in once, run:

```powershell
.\scripts\pilot-mode-smoke-test.ps1 `
  -ApiBaseUrl 'https://pilot.example-factory.com' `
  -Email 'qa.admin@example-factory.com' `
  -Password '<admin-password>'
```

The test checks health, readiness, an admin session, and that both demo
seed/reset endpoints return HTTP 403. It does not create, reset, upload, or
review inspection data.

## Go/no-go before line use

- Verify the API log contains `demo_seed_skipped_for_pilot_mode`.
- Record the active model mode. Use `mock` only for workflow rehearsal; do not
  make quality claims from it.
- For YOLO mode, validate the exact approved model artifact with factory images
  and record precision, recall, latency, false positives, and false negatives.
- Test a tablet camera over the trusted HTTPS URL on the target factory network.
- Complete the data-collection and rollback checks in `PILOT_TEST_PLAN.md`.

## Stop conditions

Pause the pilot if image capture is using the demo fallback, a worker queue is
not completing inspections, a tenant boundary is questioned, a model produces
unacceptable false negatives, or trusted HTTPS cannot be maintained.
