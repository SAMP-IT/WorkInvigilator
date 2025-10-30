from celery import Task
from datetime import datetime, timedelta
from typing import Dict, Any

from app.tasks import celery_app
from app.db.session import AsyncSessionLocal
from app.models.user import RefreshToken
from app.models.session import RecordingSession
from app.db.redis import get_redis
from sqlalchemy import select, delete, and_


class AsyncTask(Task):
    async def run_async(self, *args, **kwargs):
        raise NotImplementedError

    def __call__(self, *args, **kwargs):
        import asyncio
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(self.run_async(*args, **kwargs))


@celery_app.task(name="cleanup_expired_tokens", base=AsyncTask, bind=True)
async def cleanup_expired_tokens(self) -> Dict[str, Any]:
    async with AsyncSessionLocal() as db:
        cutoff_date = datetime.utcnow()

        stmt = delete(RefreshToken).where(RefreshToken.expires_at < cutoff_date)
        result = await db.execute(stmt)
        await db.commit()

        deleted_count = result.rowcount

        return {
            'success': True,
            'deleted_count': deleted_count,
            'cutoff_date': cutoff_date.isoformat()
        }


@celery_app.task(name="cleanup_stale_sessions", base=AsyncTask, bind=True)
async def cleanup_stale_sessions(self, stale_hours: int = 24) -> Dict[str, Any]:
    async with AsyncSessionLocal() as db:
        cutoff_time = datetime.utcnow() - timedelta(hours=stale_hours)

        query = select(RecordingSession).where(
            and_(
                RecordingSession.is_active == True,
                RecordingSession.session_start_time < cutoff_time
            )
        )

        result = await db.execute(query)
        stale_sessions = result.scalars().all()

        updated_count = 0
        for session in stale_sessions:
            session.is_active = False
            session.session_end_time = session.session_start_time + timedelta(hours=stale_hours)
            updated_count += 1

        await db.commit()

        return {
            'success': True,
            'updated_count': updated_count,
            'stale_hours': stale_hours
        }


@celery_app.task(name="cleanup_redis_cache", base=AsyncTask, bind=True)
async def cleanup_redis_cache(self, pattern: str = "*cache*") -> Dict[str, Any]:
    redis = await get_redis()

    cursor = 0
    deleted_count = 0

    while True:
        cursor, keys = await redis.scan(cursor=cursor, match=pattern, count=100)

        for key in keys:
            ttl = await redis.ttl(key)
            if ttl == -1:
                await redis.delete(key)
                deleted_count += 1

        if cursor == 0:
            break

    return {
        'success': True,
        'deleted_count': deleted_count,
        'pattern': pattern
    }


@celery_app.task(name="cleanup_old_activity_logs", base=AsyncTask, bind=True)
async def cleanup_old_activity_logs(self, retention_days: int = 180) -> Dict[str, Any]:
    from app.models.activity import ActivityLog

    async with AsyncSessionLocal() as db:
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)

        stmt = delete(ActivityLog).where(ActivityLog.created_at < cutoff_date)
        result = await db.execute(stmt)
        await db.commit()

        deleted_count = result.rowcount

        return {
            'success': True,
            'deleted_count': deleted_count,
            'retention_days': retention_days,
            'cutoff_date': cutoff_date.isoformat()
        }


@celery_app.task(name="cleanup_websocket_rooms", base=AsyncTask, bind=True)
async def cleanup_websocket_rooms(self) -> Dict[str, Any]:
    redis = await get_redis()

    room_keys = []
    cursor = 0

    while True:
        cursor, keys = await redis.scan(cursor=cursor, match="room:*", count=100)
        room_keys.extend(keys)

        if cursor == 0:
            break

    cleaned_count = 0
    for key in room_keys:
        room_data = await redis.get(key)
        if room_data:
            import json
            room = json.loads(room_data)

            started_at = datetime.fromisoformat(room.get('started_at', datetime.utcnow().isoformat()))
            if datetime.utcnow() - started_at > timedelta(hours=6):
                await redis.delete(key)
                cleaned_count += 1

    return {
        'success': True,
        'cleaned_count': cleaned_count,
        'total_rooms_checked': len(room_keys)
    }
