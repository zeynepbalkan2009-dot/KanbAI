# Public Investor Demo Deployment

This deployment publishes a disposable investor demo, not a factory pilot.
It uses the product landing page at `/` and the authenticated product demo at
`/login` under one HTTPS domain.

## What you need

- A Linux VPS with Docker Engine and Docker Compose (2 vCPU, 4 GB RAM minimum).
- A public DNS hostname, for example `demo.example.com`, pointing to the VPS.
- Inbound TCP ports 80 and 443 open in the VPS firewall/security group.
- A dedicated demo email account. The product currently links pilot and
  investor enquiries to `zeynep.balkan2009@gmail.com`.

## Secure demo configuration

On the server, clone the repository and create `.env` from `.env.example`.
Rotate every secret and set these values before starting containers:

```text
APP_ENV=production
DEBUG=false
DEMO_MODE=true
PILOT_MODE=false
DEMO_DOMAIN=demo.example.com
AI_INFERENCE_MODE=mock
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_WS_URL=
ALLOWED_ORIGINS=https://demo.example.com
```

Do not use a factory domain, factory credentials, factory images, or real
model weights in this environment.

## Deploy

```bash
docker compose -f docker-compose.yml -f docker-compose.public-demo.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.public-demo.yml exec -T api alembic upgrade head
docker compose -f docker-compose.yml -f docker-compose.public-demo.yml exec -T api python scripts/bootstrap_demo.py
```

Caddy obtains and renews the TLS certificate automatically after DNS is live.
Open `https://demo.example.com`, then use the demo credentials documented in
the repository README.

## Verification and operating rules

1. Confirm `https://demo.example.com/ready` reports `status: ok`.
2. Run the standard demo smoke test from an administrator workstation only;
   it resets demo-tagged records by design.
3. Never run `start-real-pilot.ps1`, Pilot Mode, or real-factory data in this
   environment.
4. Rebuild or reset the demo database when public test data becomes noisy.
5. Keep the public demo isolated from all factory networks and pilot secrets.
