from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class SessionCreate(BaseModel):
    session_start_time: datetime


class SessionEnd(BaseModel):
    session_end_time: datetime


class SessionResponse(BaseModel):
    id: UUID
    user_id: UUID
    organization_id: UUID
    session_start_time: datetime
    session_end_time: Optional[datetime]
    total_duration_seconds: int
    total_chunks: int
    total_chunk_duration_seconds: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SessionStartResponse(BaseModel):
    success: bool
    session_id: UUID
    message: str


class SessionEndResponse(BaseModel):
    success: bool
    session_id: UUID
    duration_seconds: int
    message: str
