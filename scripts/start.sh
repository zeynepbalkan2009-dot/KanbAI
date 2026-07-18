#!/bin/bash
# ── QC Platform — Local Dev Startup ──────────────────────────────────────────
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ██████╗  ██████╗    ██████╗ ██╗      █████╗ ████████╗███████╗"
echo "  ██╔═══██╗██╔════╝   ██╔══██╗██║     ██╔══██╗╚══██╔══╝██╔════╝"
echo "  ██║   ██║██║        ██████╔╝██║     ███████║   ██║   █████╗  "
echo "  ██║▄▄ ██║██║        ██╔═══╝ ██║     ██╔══██║   ██║   ██╔══╝  "
echo "  ╚██████╔╝╚██████╗   ██║     ███████╗██║  ██║   ██║   ██║     "
echo "   ╚══▀▀═╝  ╚═════╝   ╚═╝     ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝     "
echo -e "${NC}"
echo -e "${YELLOW}Industrial AI Quality Control Platform — Local Development${NC}"
echo ""

# Check .env
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}⚠ .env not found — copying from .env.example${NC}"
  cp .env.example .env
  echo -e "${GREEN}✓ .env created — review and update JWT_SECRET_KEY${NC}"
fi

# Check Docker
if ! command -v docker &>/dev/null; then
  echo "❌ Docker not found. Install Docker Desktop first."
  exit 1
fi

if ! docker info &>/dev/null; then
  echo "❌ Docker daemon not running. Start Docker Desktop first."
  exit 1
fi

echo -e "${GREEN}✓ Docker is running${NC}"

# Pull + build
echo ""
echo "Building services..."
docker compose build --parallel

echo ""
echo "Starting infrastructure (postgres, redis, minio)..."
docker compose up -d postgres redis minio

echo "Waiting for postgres to be healthy..."
until docker compose exec postgres pg_isready -U qcuser -d qcplatform &>/dev/null; do
  sleep 1
done
echo -e "${GREEN}✓ PostgreSQL ready${NC}"

echo "Waiting for redis..."
until docker compose exec redis redis-cli -a redispassword123 ping 2>/dev/null | grep -q PONG; do
  sleep 1
done
echo -e "${GREEN}✓ Redis ready${NC}"

echo ""
echo "Initializing MinIO buckets..."
docker compose up -d minio-init
sleep 3
echo -e "${GREEN}✓ MinIO buckets ready${NC}"

echo ""
echo "Starting all services..."
docker compose up -d

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Platform is running!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}API (FastAPI):${NC}     http://localhost:8000"
echo -e "  ${CYAN}API Docs:${NC}          http://localhost:8000/docs"
echo -e "  ${CYAN}Web Panel:${NC}         http://localhost:3000"
echo -e "  ${CYAN}Nginx:${NC}             http://localhost:80"
echo -e "  ${CYAN}MinIO Console:${NC}     http://localhost:9001"
echo -e "  ${CYAN}Flower (Celery):${NC}   http://localhost:5555"
echo ""
echo -e "  ${YELLOW}Demo Credentials:${NC}"
echo -e "  Admin:    admin@demo.com    / Admin123!"
echo -e "  Operator: operator@demo.com / Operator123!"
echo ""
echo -e "  ${CYAN}Logs:${NC} docker compose logs -f api"
echo -e "  ${CYAN}Stop:${NC} docker compose down"
echo ""
