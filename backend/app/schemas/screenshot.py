from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class ScreenshotUploadResponse(BaseModel):
    success: bool
    screenshot_id: UUID
    file_url: str
    message: str


class ScreenshotResponse(BaseModel):
    id: UUID
    user_id: UUID
    organization_id: UUID
    session_id: Optional[UUID]
    filename: str
    file_url: str
    file_size_bytes: Optional[int]
    storage_provider: str
    is_deleted: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ScreenshotListResponse(BaseModel):
    total: int
    items: list[ScreenshotResponse]
    limit: int
    offset: int
