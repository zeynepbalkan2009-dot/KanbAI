import io
import uuid
from datetime import timedelta
from pathlib import Path

from minio import Minio
from minio.error import S3Error

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

_client: Minio | None = None


def get_minio_client() -> Minio:
    global _client
    if _client is None:
        _client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )
    return _client


async def upload_image(
    data: bytes,
    content_type: str,
    factory_id: str,
    device_id: str,
    original_filename: str,
) -> tuple[str, str]:
    """
    Upload image to MinIO.
    Returns (object_key, public_url).
    """
    client = get_minio_client()
    ext = Path(original_filename).suffix or ".jpg"
    key = f"{factory_id}/{device_id}/{uuid.uuid4()}{ext}"

    client.put_object(
        bucket_name=settings.minio_bucket_inspections,
        object_name=key,
        data=io.BytesIO(data),
        length=len(data),
        content_type=content_type,
    )
    logger.info("image_uploaded", key=key, size=len(data))
    return key, f"/{settings.minio_bucket_inspections}/{key}"


def get_presigned_url(bucket: str, key: str, expires_hours: int = 1) -> str:
    client = get_minio_client()
    return client.presigned_get_object(
        bucket_name=bucket,
        object_name=key,
        expires=timedelta(hours=expires_hours),
    )


def validate_image(data: bytes, content_type: str) -> None:
    """Basic image validation before upload."""
    MAX_SIZE = 20 * 1024 * 1024  # 20MB
    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
    ALLOWED_MAGIC = {
        b"\xff\xd8\xff": "jpeg",
        b"\x89PNG": "png",
        b"RIFF": "webp",
    }

    if len(data) > MAX_SIZE:
        raise ValueError(f"Image too large: {len(data)} bytes (max {MAX_SIZE})")

    if content_type not in ALLOWED_TYPES:
        raise ValueError(f"Unsupported content type: {content_type}")

    for magic, fmt in ALLOWED_MAGIC.items():
        if data[:len(magic)] == magic:
            return

    raise ValueError("File does not match allowed image formats")


def upload_model_artifact(
    data: bytes,
    *,
    factory_id: str,
    model_id: str,
    sha256: str,
    filename: str = "model.bin",
) -> str:
    """Store a model artifact under a factory-private key with integrity metadata."""
    client = get_minio_client()
    suffix = Path(filename).suffix or ".bin"
    key = f"{factory_id}/models/{model_id}/{sha256}{suffix}"
    client.put_object(
        bucket_name=settings.minio_bucket_models,
        object_name=key,
        data=io.BytesIO(data),
        length=len(data),
        content_type="application/octet-stream",
        metadata={"X-Amz-Meta-Sha256": sha256},
    )
    logger.info("model_artifact_uploaded", key=key, factory_id=factory_id, model_id=model_id)
    return key


def verify_model_artifact(bucket: str, key: str, expected_sha256: str) -> bool:
    """Artifact health check: object exists and carries the expected integrity metadata."""
    client = get_minio_client()
    try:
        stat = client.stat_object(bucket, key)
    except S3Error:
        return False
    metadata = {str(k).lower(): str(v) for k, v in (stat.metadata or {}).items()}
    return stat.size > 0 and metadata.get("x-amz-meta-sha256") == expected_sha256.lower()
