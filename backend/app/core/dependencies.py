from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import UUID

from app.db.session import get_db
from app.core.security import verify_token
from app.models.user import Profile
from app.core.exceptions import UnauthorizedException, ForbiddenException

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Profile:
    token = credentials.credentials
    payload = verify_token(token)

    if not payload:
        raise UnauthorizedException(detail="Invalid authentication token")

    if payload.get("type") != "access":
        raise UnauthorizedException(detail="Invalid token type")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException(detail="Invalid token payload")

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise UnauthorizedException(detail="Invalid user ID format")

    result = await db.execute(select(Profile).where(Profile.id == user_uuid))
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedException(detail="User not found")

    if not user.is_active:
        raise UnauthorizedException(detail="User account is inactive")

    return user


async def get_current_active_user(
    current_user: Profile = Depends(get_current_user)
) -> Profile:
    if not current_user.is_active:
        raise UnauthorizedException(detail="User account is inactive")
    return current_user


async def get_current_admin_user(
    current_user: Profile = Depends(get_current_user)
) -> Profile:
    if current_user.role != "admin":
        raise ForbiddenException(detail="Admin access required")
    return current_user


def verify_organization_access(user: Profile, organization_id: UUID) -> bool:
    if user.organization_id != organization_id:
        raise ForbiddenException(detail="Access denied to this organization")
    return True
