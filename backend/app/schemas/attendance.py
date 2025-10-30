from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal


class ClockInRequest(BaseModel):
    clock_in_time: datetime
    location_lat: Optional[Decimal] = Field(None, ge=-90, le=90)
    location_lng: Optional[Decimal] = Field(None, ge=-180, le=180)


class ClockOutRequest(BaseModel):
    clock_out_time: datetime
    location_lat: Optional[Decimal] = Field(None, ge=-90, le=90)
    location_lng: Optional[Decimal] = Field(None, ge=-180, le=180)


class AttendanceRecordCreate(BaseModel):
    user_id: UUID
    organization_id: UUID
    date: date
    clock_in_time: Optional[datetime]
    clock_out_time: Optional[datetime]
    status: str = "present"


class AttendanceRecordResponse(BaseModel):
    id: UUID
    user_id: UUID
    organization_id: UUID
    date: date
    clock_in_time: Optional[datetime]
    clock_out_time: Optional[datetime]
    first_activity_time: Optional[datetime]
    last_activity_time: Optional[datetime]
    is_late: bool
    late_by_minutes: int
    status: str
    auto_clocked_in: bool
    clock_in_verified: bool
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ClockInResponse(BaseModel):
    success: bool
    attendance_id: UUID
    is_late: bool
    late_by_minutes: int
    status: str
    message: str


class ClockOutResponse(BaseModel):
    success: bool
    attendance_id: UUID
    work_duration_minutes: int
    message: str
