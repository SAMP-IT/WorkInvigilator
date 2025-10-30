from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from typing import Optional, Tuple
from uuid import UUID
import hashlib

from app.models.user import Profile, RefreshToken
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, verify_token
from app.core.exceptions import UnauthorizedException, ConflictException, NotFoundException
from app.config import settings


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register_user(
        self,
        email: str,
        password: str,
        name: Optional[str],
        department: Optional[str],
        organization_id: UUID
    ) -> Profile:
        result = await self.db.execute(select(Profile).where(Profile.email == email))
        existing_user = result.scalar_one_or_none()

        if existing_user:
            raise ConflictException(detail="Email already registered")

        password_hash = get_password_hash(password)

        new_user = Profile(
            email=email,
            password_hash=password_hash,
            name=name,
            department=department,
            organization_id=organization_id,
            role="user",
            is_active=True
        )

        self.db.add(new_user)
        await self.db.commit()
        await self.db.refresh(new_user)

        return new_user

    async def authenticate_user(self, email: str, password: str) -> Optional[Profile]:
        result = await self.db.execute(select(Profile).where(Profile.email == email))
        user = result.scalar_one_or_none()

        if not user:
            return None

        if not verify_password(password, user.password_hash):
            return None

        if not user.is_active:
            raise UnauthorizedException(detail="User account is inactive")

        user.last_login = datetime.utcnow()
        await self.db.commit()

        return user

    async def create_tokens(self, user: Profile) -> Tuple[str, str]:
        access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})

        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        refresh_token_record = RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            is_revoked=False
        )

        self.db.add(refresh_token_record)
        await self.db.commit()

        return access_token, refresh_token

    async def refresh_access_token(self, refresh_token: str) -> Optional[str]:
        payload = verify_token(refresh_token)

        if not payload or payload.get("type") != "refresh":
            raise UnauthorizedException(detail="Invalid refresh token")

        user_id = payload.get("sub")
        if not user_id:
            raise UnauthorizedException(detail="Invalid token payload")

        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()

        result = await self.db.execute(
            select(RefreshToken).where(
                RefreshToken.token_hash == token_hash,
                RefreshToken.is_revoked == False,
                RefreshToken.expires_at > datetime.utcnow()
            )
        )
        token_record = result.scalar_one_or_none()

        if not token_record:
            raise UnauthorizedException(detail="Invalid or expired refresh token")

        result = await self.db.execute(select(Profile).where(Profile.id == UUID(user_id)))
        user = result.scalar_one_or_none()

        if not user or not user.is_active:
            raise UnauthorizedException(detail="User not found or inactive")

        new_access_token = create_access_token(data={"sub": str(user.id), "email": user.email})

        return new_access_token

    async def revoke_refresh_token(self, refresh_token: str) -> bool:
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()

        result = await self.db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        token_record = result.scalar_one_or_none()

        if token_record:
            token_record.is_revoked = True
            await self.db.commit()
            return True

        return False
