from typing import Dict, List, Optional
from datetime import datetime
from uuid import UUID, uuid4
import json

from app.db.redis import get_redis


class LiveMonitoringService:
    def __init__(self):
        self.active_rooms: Dict[str, Dict] = {}

    async def create_room(self, user_id: UUID, stream_type: str = "screen") -> str:
        room_id = str(uuid4())
        room_data = {
            "room_id": room_id,
            "user_id": str(user_id),
            "stream_type": stream_type,
            "started_at": datetime.utcnow().isoformat(),
            "viewers": [],
            "is_active": True
        }

        self.active_rooms[room_id] = room_data

        redis = await get_redis()
        await redis.setex(
            f"live_room:{room_id}",
            3600,
            json.dumps(room_data)
        )

        return room_id

    async def join_room(self, room_id: str, viewer_id: str) -> bool:
        if room_id not in self.active_rooms:
            redis = await get_redis()
            room_data_str = await redis.get(f"live_room:{room_id}")
            if not room_data_str:
                return False
            self.active_rooms[room_id] = json.loads(room_data_str)

        room = self.active_rooms[room_id]
        if viewer_id not in room["viewers"]:
            room["viewers"].append(viewer_id)

            redis = await get_redis()
            await redis.setex(
                f"live_room:{room_id}",
                3600,
                json.dumps(room)
            )

        return True

    async def leave_room(self, room_id: str, viewer_id: str):
        if room_id in self.active_rooms:
            room = self.active_rooms[room_id]
            if viewer_id in room["viewers"]:
                room["viewers"].remove(viewer_id)

                redis = await get_redis()
                await redis.setex(
                    f"live_room:{room_id}",
                    3600,
                    json.dumps(room)
                )

    async def close_room(self, room_id: str):
        if room_id in self.active_rooms:
            self.active_rooms[room_id]["is_active"] = False
            del self.active_rooms[room_id]

            redis = await get_redis()
            await redis.delete(f"live_room:{room_id}")

    async def get_room(self, room_id: str) -> Optional[Dict]:
        if room_id in self.active_rooms:
            return self.active_rooms[room_id]

        redis = await get_redis()
        room_data_str = await redis.get(f"live_room:{room_id}")
        if room_data_str:
            return json.loads(room_data_str)

        return None

    async def get_active_rooms(self) -> List[Dict]:
        return [
            room for room in self.active_rooms.values()
            if room.get("is_active", False)
        ]

    async def get_user_room(self, user_id: UUID) -> Optional[str]:
        user_id_str = str(user_id)
        for room_id, room in self.active_rooms.items():
            if room["user_id"] == user_id_str and room.get("is_active", False):
                return room_id
        return None


live_monitoring_service = LiveMonitoringService()
