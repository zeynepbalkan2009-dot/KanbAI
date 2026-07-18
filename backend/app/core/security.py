import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Password ──────────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── Token creation ────────────────────────────────────────────────────────────

def _make_token(payload: dict, secret: str, expires_delta: timedelta) -> str:
    data = payload.copy()
    data["exp"] = datetime.now(timezone.utc) + expires_delta
    data["iat"] = datetime.now(timezone.utc)
    return jwt.encode(data, secret, algorithm=settings.jwt_algorithm)


def create_access_token(
    user_id: str,
    tenant_id: str,
    role: str,
    jti: str | None = None,
) -> str:
    jti = jti or secrets.token_urlsafe(32)
    return _make_token(
        payload={
            "sub": user_id,
            "tenant_id": tenant_id,
            "role": role,
            "jti": jti,
            "type": "access",
        },
        secret=settings.jwt_secret_key,
        expires_delta=timedelta(minutes=settings.jwt_access_expire_minutes),
    )


def create_refresh_token(user_id: str, jti: str | None = None) -> tuple[str, str]:
    """Returns (refresh_token, jti)"""
    jti = jti or secrets.token_urlsafe(32)
    token = _make_token(
        payload={"sub": user_id, "jti": jti, "type": "refresh"},
        secret=settings.jwt_refresh_secret_key,
        expires_delta=timedelta(days=settings.jwt_refresh_expire_days),
    )
    return token, jti


# ── Token decoding ────────────────────────────────────────────────────────────

def decode_access_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        if payload.get("type") != "access":
            raise ValueError("Not an access token")
        return payload
    except JWTError as e:
        logger.warning("jwt_decode_failed", error=str(e))
        raise


def decode_refresh_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_refresh_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")
        return payload
    except JWTError as e:
        logger.warning("jwt_refresh_decode_failed", error=str(e))
        raise
