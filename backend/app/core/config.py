from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
import json

from typing import Literal


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_env: Literal["development", "staging", "production"] = "development"
    app_name: str = "KanbAI QC Platform"
    app_version: str = "0.1.0"
    debug: bool = False

    # Backend
    backend_port: int = 8000
    allowed_origins: str = "http://localhost:3000"

    @property
    def allowed_origins_list(self) -> list[str]:
        raw = self.allowed_origins.strip()
        if raw.startswith("["):
            return [str(origin).strip() for origin in json.loads(raw)]
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    # JWT
    jwt_secret_key: str
    jwt_refresh_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_access_expire_minutes: int = 15
    jwt_refresh_expire_days: int = 30

    # Database
    database_url: str
    database_pool_size: int = 20
    database_max_overflow: int = 40

    # Redis
    redis_url: str
    celery_broker_url: str
    celery_result_backend: str

    # MinIO
    minio_endpoint: str
    minio_access_key: str
    minio_secret_key: str
    minio_bucket_inspections: str = "inspections"
    minio_bucket_models: str = "models"
    minio_bucket_datasets: str = "datasets"
    minio_secure: bool = False

    # AI
    ai_inference_mode: Literal["mock", "data_collection", "yolo", "onnx", "pilot_yolo_scope"] = "mock"
    ai_mock_delay_min: float = 2.0
    ai_mock_delay_max: float = 4.0
    ai_confidence_pass_threshold: float = 0.75
    ai_confidence_review_threshold: float = 0.50
    yolo_model_path: str = "models/best.pt"
    onnx_model_path: str = "models/best.onnx"

    # Logging
    log_level: str = "INFO"
    log_format: Literal["json", "console"] = "json"

    # Demo controls
    demo_mode: bool = False
    # Pilot deployments use real factory data and must never create or reset demo data.
    pilot_mode: bool = False

    # Secure Edge / Cloud controls. Pilot and production are fail-closed by default.
    edge_device_auth_enabled: bool = True
    edge_sync_enabled: bool = True
    edge_sync_batch_max: int = 100
    edge_event_max_payload_bytes: int = 262144
    edge_token_clock_skew_seconds: int = 60
    edge_require_signed_model: bool = True
    # Signing secret is intentionally optional at config-load time; secure deployment fails closed when required but missing.
    model_signing_secret: str = ""
    model_validation_min_map50: float = 0.80
    model_validation_min_precision: float = 0.80
    model_validation_min_recall: float = 0.80

    # Capture quality gate (image usability only; never a product quality decision)
    capture_quality_gate_enabled: bool = True
    capture_min_width: int = 640
    capture_min_height: int = 480
    capture_brightness_min: float = 25.0
    capture_brightness_max: float = 235.0
    capture_contrast_min: float = 12.0
    capture_sharpness_min: float = 8.0

    @property
    def demo_seed_enabled(self) -> bool:
        """Whether startup may insert the baseline demo data."""
        return self.demo_mode and not self.pilot_mode

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
