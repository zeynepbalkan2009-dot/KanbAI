"""Auth domain — schemas, service, FastAPI dependencies."""
import uuid
from datetime import datetime
from typing import Optional

from fastapi import Depends, Header, HTTPException
from jose import JWTError
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import UnauthorizedError, TokenRevokedError
from app.core.logging import get_logger
from app.core.security import (
    create_access_token, create_refresh_token,
    decode_access_token, decode_refresh_token,
    hash_password, verify_password,
)
from app.infrastructure.cache.redis_client import is_token_blacklisted, blacklist_token
from app.infrastructure.database.models import User
from app.infrastructure.database.session import get_db

logger = get_logger(__name__)
settings = get_settings()


# ── Schemas ───────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: uuid.UUID
    factory_id: uuid.UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    last_login_at: Optional[datetime]

    model_config = {"from_attributes": True}


class CurrentUser(BaseModel):
    user_id: str
    tenant_id: str
    role: str
    jti: str


# ── Service ───────────────────────────────────────────────────────────────────

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def login(self, email: str, password: str) -> TokenResponse:
        user = await self._get_user_by_email(email)

        if not user or not verify_password(password, user.password_hash):
            raise UnauthorizedError("Invalid credentials")

        if not user.is_active:
            raise UnauthorizedError("Account disabled")

        refresh_token, jti = create_refresh_token(str(user.id))
        access_token = create_access_token(
            user_id=str(user.id),
            tenant_id=str(user.factory_id),
            role=user.role,
            jti=jti,
        )

        # Update last_login
        from datetime import timezone
        from sqlalchemy import update
        await self.db.execute(
            update(User)
            .where(User.id == user.id)
            .values(last_login_at=datetime.now(timezone.utc))
        )

        logger.info("user_login", user_id=str(user.id), tenant_id=str(user.factory_id))
        return TokenResponse(access_token=access_token, refresh_token=refresh_token)

    async def logout(self, jti: str) -> None:
        ttl = settings.jwt_refresh_expire_days * 86400
        await blacklist_token(jti, ttl)
        logger.info("user_logout", jti=jti)

    async def refresh(self, refresh_token: str) -> TokenResponse:
        try:
            payload = decode_refresh_token(refresh_token)
        except JWTError:
            raise UnauthorizedError("Invalid refresh token")

        jti = payload.get("jti")
        if jti and await is_token_blacklisted(jti):
            raise TokenRevokedError()

        user_id = payload["sub"]
        user = await self._get_user_by_id(user_id)
        if not user or not user.is_active:
            raise UnauthorizedError("User not found or inactive")

        # Rotate: blacklist old JTI, issue new pair
        if jti:
            ttl = settings.jwt_refresh_expire_days * 86400
            await blacklist_token(jti, ttl)

        new_refresh, new_jti = create_refresh_token(str(user.id))
        new_access = create_access_token(
            user_id=str(user.id),
            tenant_id=str(user.factory_id),
            role=user.role,
            jti=new_jti,
        )
        return TokenResponse(access_token=new_access, refresh_token=new_refresh)

    async def _get_user_by_email(self, email: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.email == email, User.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def _get_user_by_id(self, user_id: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.id == user_id, User.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()


# ── FastAPI dependencies ──────────────────────────────────────────────────────

async def get_current_user(
    authorization: str = Header(...),
) -> CurrentUser:
    if not authorization.startswith("Bearer "):
        raise UnauthorizedError("Bearer token required")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_access_token(token)
    except JWTError:
        raise UnauthorizedError("Invalid or expired token")

    jti = payload.get("jti")
    if jti and await is_token_blacklisted(jti):
        raise TokenRevokedError()

    return CurrentUser(
        user_id=payload["sub"],
        tenant_id=payload["tenant_id"],
        role=payload.get("role", "operator"),
        jti=jti or "",
    )


def require_role(*roles: str):
    async def check(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(403, f"Role '{user.role}' not allowed. Required: {roles}")
        return user
    return check
