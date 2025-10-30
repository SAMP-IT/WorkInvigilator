from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, date, time as dt_time
from typing import List, Optional

from app.db.session import get_db
from app.models.user import Profile
from app.models.attendance import AttendanceRecord, WorkHoursSetting
from app.schemas.attendance import (
    ClockInRequest,
    ClockOutRequest,
    ClockInResponse,
    ClockOutResponse,
    AttendanceRecordResponse
)
from app.core.dependencies import get_current_user
from app.core.exceptions import BadRequestException, NotFoundException

router = APIRouter()


@router.post("/clock-in", response_model=ClockInResponse)
async def clock_in(
    request: ClockInRequest,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    today = request.clock_in_time.date()

    result = await db.execute(
        select(WorkHoursSetting).where(
            WorkHoursSetting.organization_id == current_user.organization_id
        )
    )
    settings = result.scalar_one_or_none()

    work_start_time = settings.work_start_time if settings else dt_time(9, 0, 0)
    late_threshold = settings.late_threshold_minutes if settings else 15

    clock_in_time_only = request.clock_in_time.time()
    expected_minutes = work_start_time.hour * 60 + work_start_time.minute
    actual_minutes = clock_in_time_only.hour * 60 + clock_in_time_only.minute
    late_by_minutes = max(0, actual_minutes - expected_minutes)

    is_late = late_by_minutes > late_threshold
    status = "late" if is_late else "present"

    result = await db.execute(
        select(AttendanceRecord).where(
            and_(
                AttendanceRecord.user_id == current_user.id,
                AttendanceRecord.organization_id == current_user.organization_id,
                AttendanceRecord.date == today
            )
        )
    )
    existing_record = result.scalar_one_or_none()

    if existing_record:
        existing_record.clock_in_time = request.clock_in_time
        existing_record.first_activity_time = request.clock_in_time
        existing_record.is_late = is_late
        existing_record.late_by_minutes = late_by_minutes
        existing_record.status = status
        existing_record.auto_clocked_in = True
        existing_record.clock_in_location_lat = request.location_lat
        existing_record.clock_in_location_lng = request.location_lng
        existing_record.clock_in_verified = True
        existing_record.updated_at = datetime.utcnow()
        attendance_id = existing_record.id
    else:
        new_record = AttendanceRecord(
            user_id=current_user.id,
            organization_id=current_user.organization_id,
            date=today,
            clock_in_time=request.clock_in_time,
            first_activity_time=request.clock_in_time,
            is_late=is_late,
            late_by_minutes=late_by_minutes,
            status=status,
            auto_clocked_in=True,
            clock_in_location_lat=request.location_lat,
            clock_in_location_lng=request.location_lng,
            clock_in_verified=True
        )
        db.add(new_record)
        await db.commit()
        await db.refresh(new_record)
        attendance_id = new_record.id

    await db.commit()

    return ClockInResponse(
        success=True,
        attendance_id=attendance_id,
        is_late=is_late,
        late_by_minutes=late_by_minutes,
        status=status,
        message="Clocked in successfully"
    )


@router.post("/clock-out", response_model=ClockOutResponse)
async def clock_out(
    request: ClockOutRequest,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    today = request.clock_out_time.date()

    result = await db.execute(
        select(AttendanceRecord).where(
            and_(
                AttendanceRecord.user_id == current_user.id,
                AttendanceRecord.organization_id == current_user.organization_id,
                AttendanceRecord.date == today
            )
        )
    )
    record = result.scalar_one_or_none()

    if not record:
        raise NotFoundException(detail="No clock-in record found for today")

    if not record.clock_in_time:
        raise BadRequestException(detail="Cannot clock out without clocking in first")

    record.clock_out_time = request.clock_out_time
    record.last_activity_time = request.clock_out_time
    record.clock_out_location_lat = request.location_lat
    record.clock_out_location_lng = request.location_lng
    record.updated_at = datetime.utcnow()

    work_duration = (request.clock_out_time - record.clock_in_time).total_seconds() / 60

    await db.commit()

    return ClockOutResponse(
        success=True,
        attendance_id=record.id,
        work_duration_minutes=int(work_duration),
        message="Clocked out successfully"
    )


@router.get("/my-records", response_model=List[AttendanceRecordResponse])
async def get_my_attendance_records(
    start_date: date = Query(...),
    end_date: date = Query(...),
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AttendanceRecord).where(
            and_(
                AttendanceRecord.user_id == current_user.id,
                AttendanceRecord.organization_id == current_user.organization_id,
                AttendanceRecord.date >= start_date,
                AttendanceRecord.date <= end_date
            )
        ).order_by(AttendanceRecord.date.desc())
    )
    records = result.scalars().all()

    return records


@router.get("/today", response_model=Optional[AttendanceRecordResponse])
async def get_today_attendance(
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    today = date.today()

    result = await db.execute(
        select(AttendanceRecord).where(
            and_(
                AttendanceRecord.user_id == current_user.id,
                AttendanceRecord.organization_id == current_user.organization_id,
                AttendanceRecord.date == today
            )
        )
    )
    record = result.scalar_one_or_none()

    return record
