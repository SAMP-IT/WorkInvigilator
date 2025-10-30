from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal


class ApplicationUsageResponse(BaseModel):
    id: UUID
    user_id: UUID
    organization_id: UUID
    application_name: str
    window_title: Optional[str]
    category: Optional[str]
    duration_seconds: int
    usage_date: date
    created_at: datetime

    class Config:
        from_attributes = True


class ApplicationUsageSummary(BaseModel):
    application_name: str
    category: Optional[str]
    total_duration_seconds: int
    usage_count: int
    percentage: Decimal


class IdleTimeLogResponse(BaseModel):
    id: UUID
    user_id: UUID
    session_id: Optional[UUID]
    idle_start_time: datetime
    idle_end_time: Optional[datetime]
    duration_seconds: int
    idle_type: str

    class Config:
        from_attributes = True


class IdleTimeSummary(BaseModel):
    date: date
    total_idle_seconds: int
    longest_idle_seconds: int
    idle_count: int


class ProductivityHeatmapResponse(BaseModel):
    date: date
    hour: int
    productivity_score: Decimal
    active_minutes: int
    idle_minutes: int

    class Config:
        from_attributes = True


class HeatmapData(BaseModel):
    date: date
    hourly_data: List[Dict[str, Any]]


class CustomReportCreate(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str]
    report_type: str
    filters: Optional[Dict[str, Any]]
    columns: Optional[List[str]]
    schedule: Optional[str]


class CustomReportUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str]
    filters: Optional[Dict[str, Any]]
    columns: Optional[List[str]]
    schedule: Optional[str]
    is_active: Optional[bool]


class CustomReportResponse(BaseModel):
    id: UUID
    organization_id: UUID
    created_by: Optional[UUID]
    name: str
    description: Optional[str]
    report_type: str
    filters: Optional[Dict[str, Any]]
    columns: Optional[List[str]]
    schedule: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReportExecutionResponse(BaseModel):
    id: UUID
    report_id: UUID
    executed_by: Optional[UUID]
    status: str
    file_url: Optional[str]
    record_count: Optional[int]
    error_message: Optional[str]
    started_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class AnalyticsDashboard(BaseModel):
    date_range: Dict[str, str]
    total_active_time: int
    total_idle_time: int
    average_productivity: Decimal
    top_applications: List[ApplicationUsageSummary]
    productivity_trend: List[Dict[str, Any]]
    idle_time_breakdown: List[IdleTimeSummary]
