from celery import Task
from datetime import datetime
from typing import Dict, List, Any
from uuid import UUID
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.tasks import celery_app
from app.db.session import AsyncSessionLocal
from app.models.user import Profile
from app.config import settings
from sqlalchemy import select


class AsyncTask(Task):
    async def run_async(self, *args, **kwargs):
        raise NotImplementedError

    def __call__(self, *args, **kwargs):
        import asyncio
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(self.run_async(*args, **kwargs))


def send_email(to_email: str, subject: str, body: str, html_body: str = None):
    if not all([settings.SMTP_HOST, settings.SMTP_PORT, settings.SMTP_USER, settings.SMTP_PASSWORD]):
        return

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = settings.SMTP_USER
    msg['To'] = to_email

    text_part = MIMEText(body, 'plain')
    msg.attach(text_part)

    if html_body:
        html_part = MIMEText(html_body, 'html')
        msg.attach(html_part)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
    except Exception as e:
        raise


@celery_app.task(name="send_late_arrival_notification", base=AsyncTask, bind=True)
async def send_late_arrival_notification(self, user_id: str, late_by_minutes: int, date: str) -> Dict[str, Any]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Profile).where(Profile.id == UUID(user_id)))
        user = result.scalar_one_or_none()

        if not user:
            return {'success': False, 'error': 'User not found'}

        subject = f"Late Arrival Notification - {date}"
        body = f"Hello {user.name},\n\nYou were {late_by_minutes} minutes late on {date}.\n\nPlease ensure you arrive on time."
        html_body = f"""
        <html>
            <body>
                <p>Hello {user.name},</p>
                <p>You were <strong>{late_by_minutes} minutes</strong> late on {date}.</p>
                <p>Please ensure you arrive on time.</p>
            </body>
        </html>
        """

        send_email(user.email, subject, body, html_body)

        return {'success': True, 'user_email': user.email}


@celery_app.task(name="send_idle_time_alert", base=AsyncTask, bind=True)
async def send_idle_time_alert(self, user_id: str, admin_emails: List[str], idle_minutes: int) -> Dict[str, Any]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Profile).where(Profile.id == UUID(user_id)))
        user = result.scalar_one_or_none()

        if not user:
            return {'success': False, 'error': 'User not found'}

        subject = f"Idle Time Alert - {user.name}"
        body = f"User {user.name} ({user.email}) has been idle for {idle_minutes} minutes."
        html_body = f"""
        <html>
            <body>
                <p>User <strong>{user.name}</strong> ({user.email}) has been idle for <strong>{idle_minutes} minutes</strong>.</p>
                <p>Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
            </body>
        </html>
        """

        sent_count = 0
        for admin_email in admin_emails:
            try:
                send_email(admin_email, subject, body, html_body)
                sent_count += 1
            except Exception:
                continue

        return {'success': True, 'sent_to': sent_count}


@celery_app.task(name="send_daily_summary_email", base=AsyncTask, bind=True)
async def send_daily_summary_email(self, user_id: str, summary_data: Dict[str, Any]) -> Dict[str, Any]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Profile).where(Profile.id == UUID(user_id)))
        user = result.scalar_one_or_none()

        if not user:
            return {'success': False, 'error': 'User not found'}

        subject = f"Daily Work Summary - {summary_data['date']}"
        body = f"""
Hello {user.name},

Your work summary for {summary_data['date']}:

Clock In: {summary_data.get('clock_in_time', 'N/A')}
Clock Out: {summary_data.get('clock_out_time', 'N/A')}
Total Hours: {summary_data.get('total_hours', 0):.2f}
Active Time: {summary_data.get('active_time', 0):.2f} hours
Idle Time: {summary_data.get('idle_time', 0):.2f} hours
Productivity Score: {summary_data.get('productivity_score', 0):.1f}%

Have a great day!
        """

        html_body = f"""
        <html>
            <body>
                <h2>Daily Work Summary</h2>
                <p>Hello {user.name},</p>
                <p>Your work summary for {summary_data['date']}:</p>
                <table style="border-collapse: collapse; width: 100%;">
                    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Clock In:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{summary_data.get('clock_in_time', 'N/A')}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Clock Out:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{summary_data.get('clock_out_time', 'N/A')}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Total Hours:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{summary_data.get('total_hours', 0):.2f}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Active Time:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{summary_data.get('active_time', 0):.2f} hours</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Idle Time:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{summary_data.get('idle_time', 0):.2f} hours</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Productivity Score:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{summary_data.get('productivity_score', 0):.1f}%</td></tr>
                </table>
                <p>Have a great day!</p>
            </body>
        </html>
        """

        send_email(user.email, subject, body, html_body)

        return {'success': True, 'user_email': user.email}


@celery_app.task(name="send_report_ready_notification", base=AsyncTask, bind=True)
async def send_report_ready_notification(self, user_id: str, report_url: str, report_type: str) -> Dict[str, Any]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Profile).where(Profile.id == UUID(user_id)))
        user = result.scalar_one_or_none()

        if not user:
            return {'success': False, 'error': 'User not found'}

        subject = f"Your {report_type} Report is Ready"
        body = f"Hello {user.name},\n\nYour {report_type} report has been generated and is ready for download.\n\nDownload link: {report_url}"
        html_body = f"""
        <html>
            <body>
                <p>Hello {user.name},</p>
                <p>Your <strong>{report_type}</strong> report has been generated and is ready for download.</p>
                <p><a href="{report_url}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Download Report</a></p>
            </body>
        </html>
        """

        send_email(user.email, subject, body, html_body)

        return {'success': True, 'user_email': user.email}
