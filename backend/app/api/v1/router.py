from fastapi import APIRouter

from app.api.v1 import (
    auth, health, attendance, screenshots, sessions,
    websocket, live_monitoring, analytics, webhooks, payroll, dashboard
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["attendance"])
api_router.include_router(screenshots.router, prefix="/screenshots", tags=["screenshots"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
api_router.include_router(websocket.router, prefix="/ws", tags=["websocket"])
api_router.include_router(live_monitoring.router, prefix="/live-monitoring", tags=["live-monitoring"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(payroll.router, prefix="/payroll", tags=["payroll"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
