from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from datetime import datetime
from typing import List
from uuid import uuid4

from app.db.session import get_db
from app.models.user import Profile
from app.models.screenshot import Screenshot
from app.schemas.screenshot import ScreenshotUploadResponse, ScreenshotResponse, ScreenshotListResponse
from app.schemas.common import PaginationParams
from app.core.dependencies import get_current_user
from app.services.storage_service import backblaze_service
from app.config import settings
from app.core.exceptions import BadRequestException

router = APIRouter()


@router.post("/upload", response_model=ScreenshotUploadResponse)
async def upload_screenshot(
    file: UploadFile = File(...),
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
        raise BadRequestException(detail=f"Invalid file type. Allowed types: {', '.join(settings.ALLOWED_IMAGE_TYPES)}")

    file_data = await file.read()

    max_size = settings.MAX_SCREENSHOT_SIZE_MB * 1024 * 1024
    if len(file_data) > max_size:
        raise BadRequestException(detail=f"File size exceeds {settings.MAX_SCREENSHOT_SIZE_MB}MB limit")

    upload_result = await backblaze_service.upload_file(
        file_data=file_data,
        filename=file.filename,
        content_type=file.content_type,
        folder="screenshots"
    )

    screenshot = Screenshot(
        id=uuid4(),
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        filename=upload_result['filename'],
        file_url=upload_result['file_url'],
        file_size_bytes=upload_result['size_bytes'],
        storage_provider='backblaze',
        backblaze_file_id=upload_result['file_id'],
        is_deleted=False
    )

    db.add(screenshot)
    await db.commit()
    await db.refresh(screenshot)

    return ScreenshotUploadResponse(
        success=True,
        screenshot_id=screenshot.id,
        file_url=screenshot.file_url,
        message="Screenshot uploaded successfully"
    )


@router.get("/my-screenshots", response_model=ScreenshotListResponse)
async def get_my_screenshots(
    pagination: PaginationParams = Depends(),
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    count_query = select(func.count()).select_from(Screenshot).where(
        and_(
            Screenshot.user_id == current_user.id,
            Screenshot.organization_id == current_user.organization_id,
            Screenshot.is_deleted == False
        )
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = select(Screenshot).where(
        and_(
            Screenshot.user_id == current_user.id,
            Screenshot.organization_id == current_user.organization_id,
            Screenshot.is_deleted == False
        )
    ).order_by(Screenshot.created_at.desc()).limit(pagination.limit).offset(pagination.offset)

    result = await db.execute(query)
    screenshots = result.scalars().all()

    return ScreenshotListResponse(
        total=total,
        items=screenshots,
        limit=pagination.limit,
        offset=pagination.offset
    )


@router.get("/{screenshot_id}", response_model=ScreenshotResponse)
async def get_screenshot(
    screenshot_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Screenshot).where(
            and_(
                Screenshot.id == screenshot_id,
                Screenshot.user_id == current_user.id,
                Screenshot.organization_id == current_user.organization_id
            )
        )
    )
    screenshot = result.scalar_one_or_none()

    if not screenshot:
        raise HTTPException(status_code=404, detail="Screenshot not found")

    return screenshot


@router.delete("/{screenshot_id}")
async def delete_screenshot(
    screenshot_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Screenshot).where(
            and_(
                Screenshot.id == screenshot_id,
                Screenshot.user_id == current_user.id,
                Screenshot.organization_id == current_user.organization_id
            )
        )
    )
    screenshot = result.scalar_one_or_none()

    if not screenshot:
        raise HTTPException(status_code=404, detail="Screenshot not found")

    screenshot.is_deleted = True
    await db.commit()

    if screenshot.backblaze_file_id:
        await backblaze_service.delete_file(screenshot.backblaze_file_id, screenshot.filename)

    return {"success": True, "message": "Screenshot deleted successfully"}
