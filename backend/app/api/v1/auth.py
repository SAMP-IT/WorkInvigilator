from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse, TokenRefresh
from app.schemas.common import MessageResponse
from app.services.auth_service import AuthService
from app.core.exceptions import UnauthorizedException, BadRequestException
from app.core.dependencies import get_current_user
from app.models.user import Profile
from app.config import settings

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    auth_service = AuthService(db)
    user = await auth_service.register_user(
        email=user_data.email,
        password=user_data.password,
        name=user_data.name,
        department=user_data.department,
        organization_id=user_data.organization_id
    )
    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    auth_service = AuthService(db)
    user = await auth_service.authenticate_user(credentials.email, credentials.password)

    if not user:
        raise UnauthorizedException(detail="Incorrect email or password")

    access_token, refresh_token = await auth_service.create_tokens(user)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.from_orm(user)
    )


@router.post("/refresh", response_model=dict)
async def refresh_token(
    token_data: TokenRefresh,
    db: AsyncSession = Depends(get_db)
):
    auth_service = AuthService(db)
    new_access_token = await auth_service.refresh_access_token(token_data.refresh_token)

    if not new_access_token:
        raise UnauthorizedException(detail="Invalid or expired refresh token")

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }


@router.post("/logout", response_model=MessageResponse)
async def logout(
    token_data: TokenRefresh,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    auth_service = AuthService(db)
    success = await auth_service.revoke_refresh_token(token_data.refresh_token)

    return MessageResponse(
        success=success,
        message="Logged out successfully" if success else "Token not found"
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Profile = Depends(get_current_user)
):
    return current_user
