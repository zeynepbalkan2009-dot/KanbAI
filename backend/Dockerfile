FROM python:3.11-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

ARG REQUIREMENTS_FILE=requirements.txt
COPY requirements*.txt ./
RUN if [ "$REQUIREMENTS_FILE" = "requirements-yolo.txt" ]; then \
      grep -v '^ultralytics==' "$REQUIREMENTS_FILE" > requirements-yolo-base.txt && \
      pip install -r requirements-yolo-base.txt && \
      pip install --no-deps ultralytics==8.2.27; \
    else \
      pip install -r ${REQUIREMENTS_FILE}; \
    fi

# ── Development ──────────────────────────────────
FROM base AS development
COPY requirements-dev.txt .
RUN pip install -r requirements-dev.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--log-level", "info"]

# ── Production ───────────────────────────────────
FROM base AS production
COPY . .
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--log-level", "info"]
