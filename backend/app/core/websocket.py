from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Set
from datetime import datetime
import json
import asyncio
from uuid import UUID

from app.db.redis import get_redis


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[UUID, Set[str]] = {}
        self.admin_connections: Set[str] = set()
        self.peer_connections: Dict[str, Dict] = {}

    async def connect(self, websocket: WebSocket, connection_id: str, user_id: UUID, is_admin: bool = False):
        await websocket.accept()
        self.active_connections[connection_id] = websocket

        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(connection_id)

        if is_admin:
            self.admin_connections.add(connection_id)

        await self.broadcast_to_admins({
            "type": "user_connected",
            "user_id": str(user_id),
            "connection_id": connection_id,
            "timestamp": datetime.utcnow().isoformat()
        })

    def disconnect(self, connection_id: str, user_id: UUID):
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]

        if user_id in self.user_connections:
            self.user_connections[user_id].discard(connection_id)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]

        if connection_id in self.admin_connections:
            self.admin_connections.remove(connection_id)

        if connection_id in self.peer_connections:
            del self.peer_connections[connection_id]

    async def send_personal_message(self, message: dict, connection_id: str):
        if connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            await websocket.send_json(message)

    async def send_to_user(self, message: dict, user_id: UUID):
        if user_id in self.user_connections:
            for connection_id in self.user_connections[user_id]:
                await self.send_personal_message(message, connection_id)

    async def broadcast_to_admins(self, message: dict):
        disconnected = []
        for connection_id in self.admin_connections:
            try:
                await self.send_personal_message(message, connection_id)
            except Exception:
                disconnected.append(connection_id)

        for connection_id in disconnected:
            if connection_id in self.admin_connections:
                self.admin_connections.remove(connection_id)

    async def broadcast_to_room(self, room_id: str, message: dict, exclude: str = None):
        for connection_id, peer_data in self.peer_connections.items():
            if peer_data.get("room_id") == room_id and connection_id != exclude:
                await self.send_personal_message(message, connection_id)

    def get_active_users(self) -> List[dict]:
        return [
            {
                "user_id": str(user_id),
                "connection_count": len(connections)
            }
            for user_id, connections in self.user_connections.items()
        ]

    def is_user_online(self, user_id: UUID) -> bool:
        return user_id in self.user_connections and len(self.user_connections[user_id]) > 0


manager = ConnectionManager()
