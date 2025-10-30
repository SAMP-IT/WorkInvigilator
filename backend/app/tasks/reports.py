from celery import Task
from datetime import datetime, timedelta
from typing import Dict, List, Any
import io
import csv
from uuid import UUID

from app.tasks import celery_app
from app.db.session import AsyncSessionLocal
from app.models.attendance import AttendanceRecord
from app.models.productivity import ProductivityMetric
from app.models.screenshot import Screenshot
from app.services.storage_service import BackblazeService
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession


class AsyncTask(Task):
    async def run_async(self, *args, **kwargs):
        raise NotImplementedError

    def __call__(self, *args, **kwargs):
        import asyncio
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(self.run_async(*args, **kwargs))


@celery_app.task(name="generate_attendance_report", base=AsyncTask, bind=True)
async def generate_attendance_report(self, organization_id: str, start_date: str, end_date: str, user_ids: List[str] = None) -> Dict[str, Any]:
    async with AsyncSessionLocal() as db:
        query = select(AttendanceRecord).where(
            and_(
                AttendanceRecord.organization_id == UUID(organization_id),
                AttendanceRecord.date >= datetime.fromisoformat(start_date).date(),
                AttendanceRecord.date <= datetime.fromisoformat(end_date).date()
            )
        )

        if user_ids:
            query = query.where(AttendanceRecord.user_id.in_([UUID(uid) for uid in user_ids]))

        result = await db.execute(query)
        records = result.scalars().all()

        csv_buffer = io.StringIO()
        writer = csv.DictWriter(csv_buffer, fieldnames=[
            'date', 'user_id', 'clock_in_time', 'clock_out_time',
            'first_activity_time', 'last_activity_time', 'is_late',
            'late_by_minutes', 'status'
        ])
        writer.writeheader()

        for record in records:
            writer.writerow({
                'date': str(record.date),
                'user_id': str(record.user_id),
                'clock_in_time': str(record.clock_in_time) if record.clock_in_time else '',
                'clock_out_time': str(record.clock_out_time) if record.clock_out_time else '',
                'first_activity_time': str(record.first_activity_time) if record.first_activity_time else '',
                'last_activity_time': str(record.last_activity_time) if record.last_activity_time else '',
                'is_late': str(record.is_late),
                'late_by_minutes': str(record.late_by_minutes),
                'status': record.status
            })

        csv_content = csv_buffer.getvalue().encode('utf-8')

        storage = BackblazeService()
        filename = f"attendance_report_{start_date}_{end_date}.csv"
        upload_result = await storage.upload_file(
            file_data=csv_content,
            filename=filename,
            content_type='text/csv',
            folder='reports'
        )

        return {
            'success': True,
            'file_url': upload_result['file_url'],
            'filename': filename,
            'record_count': len(records)
        }


@celery_app.task(name="generate_productivity_report", base=AsyncTask, bind=True)
async def generate_productivity_report(self, organization_id: str, start_date: str, end_date: str, user_ids: List[str] = None) -> Dict[str, Any]:
    async with AsyncSessionLocal() as db:
        query = select(ProductivityMetric).where(
            and_(
                ProductivityMetric.organization_id == UUID(organization_id),
                ProductivityMetric.date >= datetime.fromisoformat(start_date).date(),
                ProductivityMetric.date <= datetime.fromisoformat(end_date).date()
            )
        )

        if user_ids:
            query = query.where(ProductivityMetric.user_id.in_([UUID(uid) for uid in user_ids]))

        result = await db.execute(query)
        metrics = result.scalars().all()

        csv_buffer = io.StringIO()
        writer = csv.DictWriter(csv_buffer, fieldnames=[
            'date', 'user_id', 'focus_time_seconds', 'idle_time_seconds',
            'active_time_seconds', 'productivity_score'
        ])
        writer.writeheader()

        for metric in metrics:
            writer.writerow({
                'date': str(metric.date),
                'user_id': str(metric.user_id),
                'focus_time_seconds': str(metric.focus_time_seconds),
                'idle_time_seconds': str(metric.idle_time_seconds),
                'active_time_seconds': str(metric.active_time_seconds),
                'productivity_score': str(metric.productivity_score) if metric.productivity_score else ''
            })

        csv_content = csv_buffer.getvalue().encode('utf-8')

        storage = BackblazeService()
        filename = f"productivity_report_{start_date}_{end_date}.csv"
        upload_result = await storage.upload_file(
            file_data=csv_content,
            filename=filename,
            content_type='text/csv',
            folder='reports'
        )

        return {
            'success': True,
            'file_url': upload_result['file_url'],
            'filename': filename,
            'record_count': len(metrics)
        }


@celery_app.task(name="generate_screenshot_summary", base=AsyncTask, bind=True)
async def generate_screenshot_summary(self, organization_id: str, start_date: str, end_date: str) -> Dict[str, Any]:
    async with AsyncSessionLocal() as db:
        query = select(
            Screenshot.user_id,
            func.count(Screenshot.id).label('screenshot_count'),
            func.min(Screenshot.created_at).label('first_screenshot'),
            func.max(Screenshot.created_at).label('last_screenshot')
        ).where(
            and_(
                Screenshot.organization_id == UUID(organization_id),
                Screenshot.created_at >= datetime.fromisoformat(start_date),
                Screenshot.created_at <= datetime.fromisoformat(end_date),
                Screenshot.is_deleted == False
            )
        ).group_by(Screenshot.user_id)

        result = await db.execute(query)
        summary_data = result.all()

        csv_buffer = io.StringIO()
        writer = csv.DictWriter(csv_buffer, fieldnames=[
            'user_id', 'screenshot_count', 'first_screenshot', 'last_screenshot'
        ])
        writer.writeheader()

        for row in summary_data:
            writer.writerow({
                'user_id': str(row.user_id),
                'screenshot_count': str(row.screenshot_count),
                'first_screenshot': str(row.first_screenshot),
                'last_screenshot': str(row.last_screenshot)
            })

        csv_content = csv_buffer.getvalue().encode('utf-8')

        storage = BackblazeService()
        filename = f"screenshot_summary_{start_date}_{end_date}.csv"
        upload_result = await storage.upload_file(
            file_data=csv_content,
            filename=filename,
            content_type='text/csv',
            folder='reports'
        )

        return {
            'success': True,
            'file_url': upload_result['file_url'],
            'filename': filename,
            'user_count': len(summary_data)
        }
