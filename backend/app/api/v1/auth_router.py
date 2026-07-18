from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.auth.service import (
    AuthService, LoginRequest, TokenResponse, UserOut,
    get_current_user, CurrentUser,
)
from app.infrastructure.database.session import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await AuthService(db).login(body.email, body.password)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: dict, db: AsyncSession = Depends(get_db)):
    return await AuthService(db).refresh(body.get("refresh_token", ""))


@router.post("/logout")
async def logout(current: CurrentUser = Depends(get_current_user)):
    from app.infrastructure.cache.redis_client import blacklist_token
    from app.core.config import get_settings
    settings = get_settings()
    ttl = settings.jwt_refresh_expire_days * 86400
    await blacklist_token(current.jti, ttl)
    return {"message": "Logged out"}


@router.get("/me", response_model=UserOut)
async def me(
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.infrastructure.database.models import User
    result = await db.execute(select(User).where(User.id == current.user_id))
    user = result.scalar_one_or_none()
    if not user:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("User")
    return user
