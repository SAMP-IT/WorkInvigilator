from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import time

from app.db.session import get_db
from app.db.redis import get_redis
from app.config import settings

router = APIRouter()


@router.get("/health")
async def health_check(
    db: AsyncSession = Depends(get_db)
):
    start_time = time.time()

    db_status = "ok"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    redis_status = "ok"
    try:
        redis_client = await get_redis()
        await redis_client.ping()
    except Exception as e:
        redis_status = f"error: {str(e)}"

    response_time = time.time() - start_time

    return {
        "status": "healthy" if db_status == "ok" and redis_status == "ok" else "unhealthy",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "redis": redis_status,
        "response_time_ms": round(response_time * 1000, 2)
    }


@router.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT
    }
