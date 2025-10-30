from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from datetime import date, datetime, timedelta
from uuid import UUID
from decimal import Decimal

from app.db.session import get_db
from app.core.dependencies import get_current_user, get_current_admin
from app.models.user import Profile
from app.models.analytics import (
    ApplicationUsage, IdleTimeLog, ProductivityHeatmap,
    CustomReport, ReportExecution
)
from app.schemas.analytics import (
    ApplicationUsageResponse, ApplicationUsageSummary,
    IdleTimeLogResponse, IdleTimeSummary,
    ProductivityHeatmapResponse, HeatmapData,
    CustomReportCreate, CustomReportUpdate, CustomReportResponse,
    ReportExecutionResponse, AnalyticsDashboard
)
from app.utils.cache import cache_result
from app.tasks.reports import generate_attendance_report, generate_productivity_report

router = APIRouter()


@router.get("/application-usage", response_model=List[ApplicationUsageResponse])
@cache_result(prefix="app_usage", ttl=300)
async def get_application_usage(
    start_date: date = Query(...),
    end_date: date = Query(...),
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(ApplicationUsage).where(
        and_(
            ApplicationUsage.user_id == current_user.id,
            ApplicationUsage.organization_id == current_user.organization_id,
            ApplicationUsage.usage_date >= start_date,
            ApplicationUsage.usage_date <= end_date
        )
    ).order_by(ApplicationUsage.usage_date.desc(), ApplicationUsage.duration_seconds.desc())

    result = await db.execute(query)
    usage_records = result.scalars().all()

    return usage_records


@router.get("/application-usage/summary", response_model=List[ApplicationUsageSummary])
@cache_result(prefix="app_usage_summary", ttl=600)
async def get_application_usage_summary(
    start_date: date = Query(...),
    end_date: date = Query(...),
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(
        ApplicationUsage.application_name,
        ApplicationUsage.category,
        func.sum(ApplicationUsage.duration_seconds).label("total_duration_seconds"),
        func.count(ApplicationUsage.id).label("usage_count")
    ).where(
        and_(
            ApplicationUsage.user_id == current_user.id,
            ApplicationUsage.organization_id == current_user.organization_id,
            ApplicationUsage.usage_date >= start_date,
            ApplicationUsage.usage_date <= end_date
        )
    ).group_by(
        ApplicationUsage.application_name,
        ApplicationUsage.category
    ).order_by(func.sum(ApplicationUsage.duration_seconds).desc())

    result = await db.execute(query)
    summary_data = result.all()

    total_duration = sum(row.total_duration_seconds for row in summary_data)

    return [
        ApplicationUsageSummary(
            application_name=row.application_name,
            category=row.category,
            total_duration_seconds=row.total_duration_seconds,
            usage_count=row.usage_count,
            percentage=Decimal(row.total_duration_seconds / total_duration * 100) if total_duration > 0 else Decimal(0)
        )
        for row in summary_data
    ]


@router.get("/idle-time", response_model=List[IdleTimeLogResponse])
@cache_result(prefix="idle_time", ttl=300)
async def get_idle_time_logs(
    start_date: date = Query(...),
    end_date: date = Query(...),
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())

    query = select(IdleTimeLog).where(
        and_(
            IdleTimeLog.user_id == current_user.id,
            IdleTimeLog.organization_id == current_user.organization_id,
            IdleTimeLog.idle_start_time >= start_datetime,
            IdleTimeLog.idle_start_time <= end_datetime
        )
    ).order_by(IdleTimeLog.idle_start_time.desc())

    result = await db.execute(query)
    idle_logs = result.scalars().all()

    return idle_logs


@router.get("/idle-time/summary", response_model=List[IdleTimeSummary])
@cache_result(prefix="idle_time_summary", ttl=600)
async def get_idle_time_summary(
    start_date: date = Query(...),
    end_date: date = Query(...),
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())

    query = select(
        func.date(IdleTimeLog.idle_start_time).label("date"),
        func.sum(IdleTimeLog.duration_seconds).label("total_idle_seconds"),
        func.max(IdleTimeLog.duration_seconds).label("longest_idle_seconds"),
        func.count(IdleTimeLog.id).label("idle_count")
    ).where(
        and_(
            IdleTimeLog.user_id == current_user.id,
            IdleTimeLog.organization_id == current_user.organization_id,
            IdleTimeLog.idle_start_time >= start_datetime,
            IdleTimeLog.idle_start_time <= end_datetime
        )
    ).group_by(func.date(IdleTimeLog.idle_start_time))

    result = await db.execute(query)
    summary_data = result.all()

    return [
        IdleTimeSummary(
            date=row.date,
            total_idle_seconds=row.total_idle_seconds or 0,
            longest_idle_seconds=row.longest_idle_seconds or 0,
            idle_count=row.idle_count or 0
        )
        for row in summary_data
    ]


@router.get("/productivity-heatmap", response_model=List[HeatmapData])
@cache_result(prefix="productivity_heatmap", ttl=3600)
async def get_productivity_heatmap(
    start_date: date = Query(...),
    end_date: date = Query(...),
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(ProductivityHeatmap).where(
        and_(
            ProductivityHeatmap.user_id == current_user.id,
            ProductivityHeatmap.organization_id == current_user.organization_id,
            ProductivityHeatmap.date >= start_date,
            ProductivityHeatmap.date <= end_date
        )
    ).order_by(ProductivityHeatmap.date, ProductivityHeatmap.hour)

    result = await db.execute(query)
    heatmap_records = result.scalars().all()

    heatmap_by_date = {}
    for record in heatmap_records:
        if record.date not in heatmap_by_date:
            heatmap_by_date[record.date] = []

        heatmap_by_date[record.date].append({
            "hour": record.hour,
            "productivity_score": float(record.productivity_score),
            "active_minutes": record.active_minutes,
            "idle_minutes": record.idle_minutes
        })

    return [
        HeatmapData(date=date_key, hourly_data=hourly_data)
        for date_key, hourly_data in sorted(heatmap_by_date.items())
    ]


@router.post("/custom-reports", response_model=CustomReportResponse)
async def create_custom_report(
    report_data: CustomReportCreate,
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    new_report = CustomReport(
        organization_id=current_user.organization_id,
        created_by=current_user.id,
        **report_data.model_dump()
    )

    db.add(new_report)
    await db.commit()
    await db.refresh(new_report)

    return new_report


@router.get("/custom-reports", response_model=List[CustomReportResponse])
async def list_custom_reports(
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(CustomReport).where(
        CustomReport.organization_id == current_user.organization_id
    ).order_by(CustomReport.created_at.desc())

    result = await db.execute(query)
    reports = result.scalars().all()

    return reports


@router.get("/custom-reports/{report_id}", response_model=CustomReportResponse)
async def get_custom_report(
    report_id: UUID,
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(CustomReport).where(
        and_(
            CustomReport.id == report_id,
            CustomReport.organization_id == current_user.organization_id
        )
    )

    result = await db.execute(query)
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    return report


@router.post("/custom-reports/{report_id}/execute", response_model=ReportExecutionResponse)
async def execute_custom_report(
    report_id: UUID,
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(CustomReport).where(
        and_(
            CustomReport.id == report_id,
            CustomReport.organization_id == current_user.organization_id
        )
    )

    result = await db.execute(query)
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    execution = ReportExecution(
        report_id=report_id,
        executed_by=current_user.id,
        status="pending"
    )

    db.add(execution)
    await db.commit()
    await db.refresh(execution)

    if report.report_type == "attendance":
        task = generate_attendance_report.delay(
            str(current_user.organization_id),
            report.filters.get("start_date"),
            report.filters.get("end_date"),
            report.filters.get("user_ids")
        )
    elif report.report_type == "productivity":
        task = generate_productivity_report.delay(
            str(current_user.organization_id),
            report.filters.get("start_date"),
            report.filters.get("end_date"),
            report.filters.get("user_ids")
        )

    return execution
