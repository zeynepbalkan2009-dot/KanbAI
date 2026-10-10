"""
Industrial QC Platform — FastAPI Application
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.logging import setup_logging, get_logger
from app.core.exceptions import AppError
from app.infrastructure.database.session import engine, Base
from app.api.v1 import auth_router, inspections_router, devices_router, ws_router, mlops_router, setup_router, hitl_router, battery_router

setup_logging()
logger = get_logger(__name__)
settings = get_settings()


async def seed_demo_data(conn) -> None:
    """Insert the baseline demo tenant, users, device, and mock model."""
    from sqlalchemy import text

    await conn.execute(text("""
        INSERT INTO factories (id, name, slug, location, timezone, is_active, created_at, updated_at)
        VALUES (
            'f0000000-0000-0000-0000-000000000001',
            'Demo Fabrika A',
            'demo-fabrika-a',
            'Adana, TR',
            'Europe/Istanbul',
            true,
            NOW(), NOW()
        ) ON CONFLICT DO NOTHING
    """))

    await conn.execute(text("""
        INSERT INTO users (id, factory_id, email, password_hash, full_name, role, is_active, created_at, updated_at)
        VALUES
            (
                '00000000-0000-0000-0000-000000000101',
                'f0000000-0000-0000-0000-000000000001',
                'admin@demo.com',
                '$2b$05$WQIvM6DqaP7LWxs/RwrWOesvz6MKN.yjaV9ZxGsTakAuQG1GzsN7C',
                'Demo Admin',
                'admin',
                true,
                NOW(), NOW()
            ),
            (
                '00000000-0000-0000-0000-000000000102',
                'f0000000-0000-0000-0000-000000000001',
                'operator@demo.com',
                '$2b$05$8UlAXMHnacgwwrlg8bDr6.9lomA3fdy7OIbP93YzHwLbdI8UQNxOO',
                'Demo Operator',
                'operator',
                true,
                NOW(), NOW()
            )
        ON CONFLICT DO NOTHING
    """))


    await conn.execute(text("""
        INSERT INTO production_lines (id, factory_id, name, code, status, metadata, created_at, updated_at)
        VALUES (
            '00000000-0000-0000-0000-000000000501',
            'f0000000-0000-0000-0000-000000000001',
            'Hat 1 - Govde Kaynak',
            'LINE-1',
            'active',
            '{"oee": 0.87, "shift_target": 1200}',
            NOW(), NOW()
        ) ON CONFLICT DO NOTHING
    """))

    await conn.execute(text("""
        INSERT INTO stations (id, factory_id, production_line_id, name, code, station_type, status, metadata, created_at, updated_at)
        VALUES (
            '00000000-0000-0000-0000-000000000601',
            'f0000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000501',
            'Istasyon 3 - AI Kamera',
            'ST-3-AI',
            'visual_inspection',
            'active',
            '{"camera": "Basler acA1920", "lighting": "dome-led"}',
            NOW(), NOW()
        ) ON CONFLICT DO NOTHING
    """))

    await conn.execute(text("""
        INSERT INTO products (id, factory_id, sku, name, revision, defect_policy, is_active, created_at, updated_at)
        VALUES (
            '00000000-0000-0000-0000-000000000701',
            'f0000000-0000-0000-0000-000000000001',
            'KB-A01-PANEL',
            'Aluminyum Govde Paneli',
            'R2',
            '{"review_threshold": 0.82, "fail_classes": ["crack", "edge_chip"]}',
            true,
            NOW(), NOW()
        ) ON CONFLICT DO NOTHING
    """))

    await conn.execute(text("""
        INSERT INTO shifts (id, factory_id, name, starts_at, ends_at, is_active, created_at, updated_at)
        VALUES (
            '00000000-0000-0000-0000-000000000801',
            'f0000000-0000-0000-0000-000000000001',
            'Gunduz Vardiyasi',
            '08:00',
            '16:00',
            true,
            NOW(), NOW()
        ) ON CONFLICT DO NOTHING
    """))

    await conn.execute(text("""
        INSERT INTO devices (id, factory_id, device_uuid, name, location_label, station_id, status, activated_at, is_active, created_at, updated_at)
        VALUES (
            '00000000-0000-0000-0000-000000000201',
            'f0000000-0000-0000-0000-000000000001',
            'DEVICE-DEMO-001',
            'Uretim Hatti 1 - Kamera A',
            'Hat 1, Istasyon 3',
            '00000000-0000-0000-0000-000000000601',
            'active',
            NOW(),
            true,
            NOW(), NOW()
        ) ON CONFLICT DO NOTHING
    """))

    await conn.execute(text("""
        INSERT INTO ai_models (id, factory_id, name, version, architecture, is_production, class_labels, created_at, updated_at)
        VALUES (
            '00000000-0000-0000-0000-000000000301',
            'f0000000-0000-0000-0000-000000000001',
            'qc-defect-detector',
            'mock-v1.0',
            'mock',
            true,
            '{"0":"scratch","1":"dent","2":"crack","3":"discoloration","4":"foreign_object","5":"edge_chip","6":"surface_void"}',
            NOW(), NOW()
        ) ON CONFLICT DO NOTHING
    """))

    await conn.execute(text("""
        INSERT INTO model_deployments (id, factory_id, model_id, is_active, deployment_status, created_at, updated_at)
        VALUES (
            '00000000-0000-0000-0000-000000000401',
            'f0000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000301',
            true,
            'active',
            NOW(), NOW()
        ) ON CONFLICT DO NOTHING
    """))


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "app_startup",
        env=settings.app_env,
        inference_mode=settings.ai_inference_mode,
        demo_mode=settings.demo_mode,
        pilot_mode=settings.pilot_mode,
        version=settings.app_version,
    )
    # Create tables (dev only — use Alembic in production)
    if settings.is_development:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            if settings.demo_seed_enabled:
                await seed_demo_data(conn)
                logger.info("demo_seeded_on_startup")
            elif settings.pilot_mode:
                logger.info("demo_seed_skipped_for_pilot_mode")
        logger.info("db_tables_created")

    yield

    logger.info("app_shutdown")
    await engine.dispose()


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
)

# ── Request ID middleware ─────────────────────────────────────────────────────

import uuid as _uuid
import structlog

@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(_uuid.uuid4())
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=request_id)
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


# ── Error handlers ─────────────────────────────────────────────────────────────

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "type": type(exc).__name__},
    )

@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    logger.error("unhandled_exception", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(auth_router.router, prefix="/api/v1")
app.include_router(inspections_router.router, prefix="/api/v1")
app.include_router(devices_router.router, prefix="/api/v1")
app.include_router(mlops_router.router, prefix="/api/v1")
app.include_router(setup_router.router, prefix="/api/v1")
app.include_router(hitl_router.router, prefix="/api/v1")
app.include_router(battery_router.router, prefix="/api/v1")
app.include_router(ws_router.router)


# ── Health & Info ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "version": settings.app_version,
        "env": settings.app_env,
        "inference_mode": settings.ai_inference_mode,
    }


@app.get("/ready")
async def ready():
    from sqlalchemy import text
    dependencies = {"postgresql": "unknown", "redis": "unknown", "minio": "unknown"}
    http_status = "ok"
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        dependencies["postgresql"] = "ok"
    except Exception as exc:
        dependencies["postgresql"] = f"error: {type(exc).__name__}"
        http_status = "degraded"
    try:
        from app.infrastructure.cache.redis_client import get_redis
        redis = await get_redis()
        await redis.ping()
        await redis.aclose()
        dependencies["redis"] = "ok"
    except Exception as exc:
        dependencies["redis"] = f"error: {type(exc).__name__}"
        http_status = "degraded"
    try:
        from app.infrastructure.storage.minio_client import get_minio_client
        client = get_minio_client()
        dependencies["minio"] = "ok" if client.bucket_exists(settings.minio_bucket_inspections) else "missing_bucket"
        if dependencies["minio"] != "ok":
            http_status = "degraded"
    except Exception as exc:
        dependencies["minio"] = f"error: {type(exc).__name__}"
        http_status = "degraded"
    return {"status": http_status, "dependencies": dependencies, "version": settings.app_version}

@app.get("/")
async def root():
    return {"name": settings.app_name, "version": settings.app_version}
