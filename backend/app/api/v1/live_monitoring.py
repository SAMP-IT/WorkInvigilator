from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime

from app.db.session import get_db
from app.models.user import Profile
from app.core.dependencies import get_current_admin_user, get_current_user
from app.core.websocket import manager
from app.services.live_monitoring_service import live_monitoring_service
from app.schemas.websocket import (
    LiveStreamRequest,
    LiveStreamResponse,
    ActiveStreamInfo,
    ActiveStreamsResponse
)

router = APIRouter()


@router.get("/active-users")
async def get_active_users(
    current_user: Profile = Depends(get_current_admin_user)
):
    active_users = manager.get_active_users()
    return {
        "total": len(active_users),
        "users": active_users
    }


@router.get("/active-streams", response_model=ActiveStreamsResponse)
async def get_active_streams(
    current_user: Profile = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    rooms = await live_monitoring_service.get_active_rooms()

    stream_infos = []
    for room in rooms:
        user_result = await db.execute(
            select(Profile).where(Profile.id == room["user_id"])
        )
        user = user_result.scalar_one_or_none()

        if user:
            stream_infos.append(ActiveStreamInfo(
                user_id=user.id,
                user_name=user.name or user.email,
                room_id=room["room_id"],
                stream_type=room["stream_type"],
                started_at=datetime.fromisoformat(room["started_at"]),
                viewer_count=len(room.get("viewers", []))
            ))

    return ActiveStreamsResponse(
        total=len(stream_infos),
        streams=stream_infos
    )


@router.post("/request-stream/{user_id}", response_model=LiveStreamResponse)
async def request_user_stream(
    user_id: str,
    current_user: Profile = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Profile).where(Profile.id == user_id))
    target_user = result.scalar_one_or_none()

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not manager.is_user_online(target_user.id):
        raise HTTPException(status_code=400, detail="User is not online")

    await manager.send_to_user({
        "type": "stream-request",
        "from_admin": str(current_user.id),
        "admin_name": current_user.name or current_user.email
    }, target_user.id)

    return LiveStreamResponse(
        success=True,
        room_id="",
        message="Stream request sent to user"
    )


@router.get("/my-stream-status")
async def get_my_stream_status(
    current_user: Profile = Depends(get_current_user)
):
    room_id = await live_monitoring_service.get_user_room(current_user.id)

    if not room_id:
        return {
            "is_streaming": False,
            "room_id": None
        }

    room = await live_monitoring_service.get_room(room_id)

    return {
        "is_streaming": True,
        "room_id": room_id,
        "viewer_count": len(room.get("viewers", [])) if room else 0,
        "started_at": room.get("started_at") if room else None
    }


@router.post("/stop-stream")
async def stop_my_stream(
    current_user: Profile = Depends(get_current_user)
):
    room_id = await live_monitoring_service.get_user_room(current_user.id)

    if not room_id:
        raise HTTPException(status_code=400, detail="No active stream found")

    await live_monitoring_service.close_room(room_id)

    await manager.broadcast_to_admins({
        "type": "stream-ended",
        "user_id": str(current_user.id),
        "room_id": room_id
    })

    return {
        "success": True,
        "message": "Stream stopped successfully"
    }
