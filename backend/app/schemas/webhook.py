from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


class WebhookCreate(BaseModel):
    url: HttpUrl
    events: List[str] = Field(..., min_length=1)
    description: Optional[str]
    retry_count: int = Field(default=3, ge=0, le=10)
    timeout_seconds: int = Field(default=30, ge=5, le=120)


class WebhookUpdate(BaseModel):
    url: Optional[HttpUrl]
    events: Optional[List[str]]
    description: Optional[str]
    is_active: Optional[bool]
    retry_count: Optional[int] = Field(None, ge=0, le=10)
    timeout_seconds: Optional[int] = Field(None, ge=5, le=120)


class WebhookResponse(BaseModel):
    id: UUID
    organization_id: UUID
    url: str
    events: List[str]
    is_active: bool
    description: Optional[str]
    retry_count: int
    timeout_seconds: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WebhookDeliveryResponse(BaseModel):
    id: UUID
    webhook_id: UUID
    event_type: str
    status: str
    response_code: Optional[int]
    attempts: int
    last_attempt_at: Optional[datetime]
    delivered_at: Optional[datetime]
    error_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class WebhookTestRequest(BaseModel):
    event_type: str
    test_payload: Optional[Dict[str, Any]]
