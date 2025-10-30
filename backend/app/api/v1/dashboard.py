from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import Dict, Any
from datetime import datetime, date, timedelta
from uuid import UUID
import json
import asyncio

from app.db.session import get_db
from app.core.dependencies import get_current_admin
from app.core.security import verify_token
from app.core.websocket import manager
from app.models.user import Profile
from app.models.attendance import AttendanceRecord
from app.models.productivity import ProductivityMetric
from app.models.session import RecordingSession
from app.models.screenshot import Screenshot
from app.models.analytics import IdleTimeLog

router = APIRouter()


async def get_dashboard_metrics(organization_id: UUID, db: AsyncSession) -> Dict[str, Any]:
    today = date.today()

    active_users_query = select(func.count(func.distinct(AttendanceRecord.user_id))).where(
        and_(
            AttendanceRecord.organization_id == organization_id,
            AttendanceRecord.date == today,
            AttendanceRecord.clock_out_time.is_(None)
        )
    )
    active_users_result = await db.execute(active_users_query)
    active_users_count = active_users_result.scalar() or 0

    total_users_query = select(func.count(Profile.id)).where(
        and_(
            Profile.organization_id == organization_id,
            Profile.is_active == True
        )
    )
    total_users_result = await db.execute(total_users_query)
    total_users_count = total_users_result.scalar() or 0

    avg_productivity_query = select(func.avg(ProductivityMetric.productivity_score)).where(
        and_(
            ProductivityMetric.organization_id == organization_id,
            ProductivityMetric.date == today
        )
    )
    avg_productivity_result = await db.execute(avg_productivity_query)
    avg_productivity = avg_productivity_result.scalar() or 0

    screenshots_today_query = select(func.count(Screenshot.id)).where(
        and_(
            Screenshot.organization_id == organization_id,
            func.date(Screenshot.created_at) == today,
            Screenshot.is_deleted == False
        )
    )
    screenshots_result = await db.execute(screenshots_today_query)
    screenshots_count = screenshots_result.scalar() or 0

    late_arrivals_query = select(func.count(AttendanceRecord.id)).where(
        and_(
            AttendanceRecord.organization_id == organization_id,
            AttendanceRecord.date == today,
            AttendanceRecord.is_late == True
        )
    )
    late_arrivals_result = await db.execute(late_arrivals_query)
    late_arrivals_count = late_arrivals_result.scalar() or 0

    idle_time_query = select(func.sum(IdleTimeLog.duration_seconds)).where(
        and_(
            IdleTimeLog.organization_id == organization_id,
            func.date(IdleTimeLog.idle_start_time) == today
        )
    )
    idle_time_result = await db.execute(idle_time_query)
    total_idle_seconds = idle_time_result.scalar() or 0

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "active_users": active_users_count,
        "total_users": total_users_count,
        "average_productivity": float(avg_productivity),
        "screenshots_today": screenshots_count,
        "late_arrivals": late_arrivals_count,
        "total_idle_hours": round(total_idle_seconds / 3600, 2),
        "online_users": len(manager.user_connections)
    }


@router.websocket("/realtime")
async def dashboard_realtime(
    websocket: WebSocket,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    try:
        payload = verify_token(token)
        user_id = UUID(payload["sub"])

        user_query = select(Profile).where(Profile.id == user_id)
        user_result = await db.execute(user_query)
        user = user_result.scalar_one_or_none()

        if not user or user.role != "admin":
            await websocket.close(code=1008)
            return

        connection_id = f"dashboard_{user_id}_{datetime.utcnow().timestamp()}"
        await manager.connect(websocket, connection_id, user_id, is_admin=True)

        try:
            while True:
                metrics = await get_dashboard_metrics(user.organization_id, db)

                await websocket.send_json({
                    "type": "dashboard_update",
                    "data": metrics
                })

                await asyncio.sleep(5)

        except WebSocketDisconnect:
            manager.disconnect(connection_id, user_id)

    except Exception as e:
        await websocket.close(code=1011)


@router.get("/metrics")
async def get_current_metrics(
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    metrics = await get_dashboard_metrics(current_user.organization_id, db)
    return metrics


@router.get("/activity-timeline")
async def get_activity_timeline(
    hours: int = Query(default=24, ge=1, le=168),
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    cutoff_time = datetime.utcnow() - timedelta(hours=hours)

    query = select(
        AttendanceRecord.user_id,
        AttendanceRecord.clock_in_time,
        AttendanceRecord.clock_out_time,
        AttendanceRecord.date
    ).where(
        and_(
            AttendanceRecord.organization_id == current_user.organization_id,
            AttendanceRecord.clock_in_time >= cutoff_time
        )
    ).order_by(AttendanceRecord.clock_in_time.desc())

    result = await db.execute(query)
    records = result.all()

    timeline = []
    for record in records:
        timeline.append({
            "user_id": str(record.user_id),
            "event": "clock_in",
            "timestamp": record.clock_in_time.isoformat() if record.clock_in_time else None
        })

        if record.clock_out_time:
            timeline.append({
                "user_id": str(record.user_id),
                "event": "clock_out",
                "timestamp": record.clock_out_time.isoformat()
            })

    timeline.sort(key=lambda x: x["timestamp"], reverse=True)

    return {"timeline": timeline[:100]}


@router.get("/user-status")
async def get_all_user_status(
    current_user: Profile = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    today = date.today()

    users_query = select(Profile).where(
        and_(
            Profile.organization_id == current_user.organization_id,
            Profile.is_active == True
        )
    )
    users_result = await db.execute(users_query)
    users = users_result.scalars().all()

    user_statuses = []

    for user in users:
        attendance_query = select(AttendanceRecord).where(
            and_(
                AttendanceRecord.user_id == user.id,
                AttendanceRecord.date == today
            )
        )
        attendance_result = await db.execute(attendance_query)
        attendance = attendance_result.scalar_one_or_none()

        is_online = manager.is_user_online(user.id)

        productivity_query = select(ProductivityMetric).where(
            and_(
                ProductivityMetric.user_id == user.id,
                ProductivityMetric.date == today
            )
        )
        productivity_result = await db.execute(productivity_query)
        productivity = productivity_result.scalar_one_or_none()

        user_statuses.append({
            "user_id": str(user.id),
            "name": user.name,
            "email": user.email,
            "is_online": is_online,
            "is_clocked_in": attendance.clock_in_time is not None and attendance.clock_out_time is None if attendance else False,
            "clock_in_time": attendance.clock_in_time.isoformat() if attendance and attendance.clock_in_time else None,
            "is_late": attendance.is_late if attendance else False,
            "productivity_score": float(productivity.productivity_score) if productivity and productivity.productivity_score else 0
        })

    return {"users": user_statuses}
