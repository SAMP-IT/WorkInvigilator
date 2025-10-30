from pydantic import BaseModel, Field
from typing import Optional


class PaginationParams(BaseModel):
    limit: int = Field(50, ge=1, le=100, description="Number of items per page")
    offset: int = Field(0, ge=0, description="Number of items to skip")


class MessageResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None
