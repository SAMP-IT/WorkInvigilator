from pydantic import BaseModel
from typing import Optional
from datetime import date


class DashboardKPIs(BaseModel):
    active_sessions: int
    total_employees: int
    today_work_hours: float
    today_productivity_score: float
    week_work_hours: float
    month_work_hours: float


class DashboardSummary(BaseModel):
    date: date
    work_hours: float
    productivity_score: float
    screenshots_count: int
    active_time_hours: float
    focus_time_hours: float
    idle_time_hours: float


class DashboardResponse(BaseModel):
    kpis: DashboardKPIs
    today: DashboardSummary
    week: Optional[DashboardSummary]
    month: Optional[DashboardSummary]
