from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from uuid import UUID
from decimal import Decimal


class ProductivityMetricResponse(BaseModel):
    id: UUID
    user_id: UUID
    organization_id: UUID
    date: date
    focus_time_seconds: int
    idle_time_seconds: int
    active_time_seconds: int
    break_time_seconds: int
    productivity_score: Optional[Decimal]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProductivitySummary(BaseModel):
    date: date
    total_work_hours: float
    focus_hours: float
    idle_hours: float
    active_hours: float
    break_hours: float
    productivity_percentage: float


class DailyProductivityResponse(BaseModel):
    today: ProductivitySummary
    week_average: Optional[ProductivitySummary]
    month_average: Optional[ProductivitySummary]
