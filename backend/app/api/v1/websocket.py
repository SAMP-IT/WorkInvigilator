from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import uuid4, UUID
import json

from app.core.websocket import manager
from app.core.security import verify_token
from app.db.session import get_db
from app.models.user import Profile
from app.services.live_monitoring_service import live_monitoring_service

router = APIRouter()


async def get_user_from_token(token: str, db: AsyncSession) -> Optional[Profile]:
    payload = verify_token(token)
    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    result = await db.execute(select(Profile).where(Profile.id == UUID(user_id)))
    return result.scalar_one_or_none()


@router.websocket("/signaling")
async def websocket_signaling(
    websocket: WebSocket,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    user = await get_user_from_token(token, db)

    if not user:
        await websocket.close(code=1008, reason="Unauthorized")
        return

    connection_id = str(uuid4())
    is_admin = user.role == "admin"

    await manager.connect(websocket, connection_id, user.id, is_admin)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            message_type = message.get("type")

            if message_type == "offer":
                target_id = message.get("target_id")
                if target_id:
                    await manager.send_personal_message({
                        "type": "offer",
                        "from": connection_id,
                        "data": message.get("data")
                    }, target_id)

            elif message_type == "answer":
                target_id = message.get("target_id")
                if target_id:
                    await manager.send_personal_message({
                        "type": "answer",
                        "from": connection_id,
                        "data": message.get("data")
                    }, target_id)

            elif message_type == "ice-candidate":
                target_id = message.get("target_id")
                if target_id:
                    await manager.send_personal_message({
                        "type": "ice-candidate",
                        "from": connection_id,
                        "data": message.get("data")
                    }, target_id)

            elif message_type == "start-stream":
                room_id = await live_monitoring_service.create_room(
                    user.id,
                    message.get("stream_type", "screen")
                )
                manager.peer_connections[connection_id] = {
                    "room_id": room_id,
                    "user_id": str(user.id),
                    "role": "broadcaster"
                }
                await manager.send_personal_message({
                    "type": "stream-started",
                    "room_id": room_id
                }, connection_id)

                await manager.broadcast_to_admins({
                    "type": "new-stream-available",
                    "user_id": str(user.id),
                    "user_name": user.name or user.email,
                    "room_id": room_id
                })

            elif message_type == "join-stream":
                room_id = message.get("room_id")
                if room_id:
                    success = await live_monitoring_service.join_room(room_id, connection_id)
                    if success:
                        manager.peer_connections[connection_id] = {
                            "room_id": room_id,
                            "user_id": str(user.id),
                            "role": "viewer"
                        }
                        await manager.send_personal_message({
                            "type": "joined-stream",
                            "room_id": room_id
                        }, connection_id)

                        await manager.broadcast_to_room(room_id, {
                            "type": "viewer-joined",
                            "viewer_id": connection_id
                        }, exclude=connection_id)

            elif message_type == "leave-stream":
                room_id = message.get("room_id")
                if room_id:
                    await live_monitoring_service.leave_room(room_id, connection_id)
                    await manager.broadcast_to_room(room_id, {
                        "type": "viewer-left",
                        "viewer_id": connection_id
                    }, exclude=connection_id)

            elif message_type == "stop-stream":
                if connection_id in manager.peer_connections:
                    peer_data = manager.peer_connections[connection_id]
                    room_id = peer_data.get("room_id")
                    if room_id:
                        await live_monitoring_service.close_room(room_id)
                        await manager.broadcast_to_room(room_id, {
                            "type": "stream-ended",
                            "room_id": room_id
                        })
                        await manager.broadcast_to_admins({
                            "type": "stream-ended",
                            "room_id": room_id
                        })

            elif message_type == "ping":
                await manager.send_personal_message({
                    "type": "pong",
                    "timestamp": message.get("timestamp")
                }, connection_id)

    except WebSocketDisconnect:
        manager.disconnect(connection_id, user.id)

        if connection_id in manager.peer_connections:
            peer_data = manager.peer_connections[connection_id]
            room_id = peer_data.get("room_id")
            role = peer_data.get("role")

            if role == "broadcaster" and room_id:
                await live_monitoring_service.close_room(room_id)
                await manager.broadcast_to_room(room_id, {
                    "type": "stream-ended",
                    "room_id": room_id
                })
                await manager.broadcast_to_admins({
                    "type": "stream-ended",
                    "room_id": room_id
                })
            elif role == "viewer" and room_id:
                await live_monitoring_service.leave_room(room_id, connection_id)
                await manager.broadcast_to_room(room_id, {
                    "type": "viewer-left",
                    "viewer_id": connection_id
                })

        await manager.broadcast_to_admins({
            "type": "user_disconnected",
            "user_id": str(user.id),
            "connection_id": connection_id
        })
