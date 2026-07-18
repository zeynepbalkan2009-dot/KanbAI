from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyUrl, field_validator
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
    app_name: str = "QC Industrial Platform"
    app_version: str = "0.1.0"
    debug: bool = False

    # Backend
    backend_port: int = 8000
    allowed_origins: list[str] = ["http://localhost:3000"]

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",")]
        return v

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
    ai_inference_mode: Literal["mock", "yolo", "onnx"] = "mock"
    ai_mock_delay_min: float = 2.0
    ai_mock_delay_max: float = 4.0
    ai_confidence_pass_threshold: float = 0.75
    ai_confidence_review_threshold: float = 0.50
    yolo_model_path: str = "models/best.pt"
    onnx_model_path: str = "models/best.onnx"

    # Logging
    log_level: str = "INFO"
    log_format: Literal["json", "console"] = "json"

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
