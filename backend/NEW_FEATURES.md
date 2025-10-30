# New Features Implementation

This document outlines all the new features that have been implemented in the FastAPI backend.

## 1. Background Task Processing (Celery)

Implemented comprehensive background task system using Celery with Redis broker.

### Task Modules

- [app/tasks/reports.py](app/tasks/reports.py) - Report generation tasks
  - `generate_attendance_report` - Export attendance data to CSV
  - `generate_productivity_report` - Export productivity metrics to CSV
  - `generate_screenshot_summary` - Generate screenshot statistics

- [app/tasks/screenshots.py](app/tasks/screenshots.py) - Screenshot processing tasks
  - `process_screenshot_deduplication` - Detect and remove duplicate screenshots
  - `apply_retention_policy` - Delete screenshots older than retention period
  - `compress_screenshots` - Compress screenshots to save storage
  - `cleanup_orphaned_screenshots` - Remove screenshots without sessions

- [app/tasks/notifications.py](app/tasks/notifications.py) - Email notification tasks
  - `send_late_arrival_notification` - Notify users of late arrivals
  - `send_idle_time_alert` - Alert admins of prolonged idle time
  - `send_daily_summary_email` - Send daily work summary to users
  - `send_report_ready_notification` - Notify when reports are ready

- [app/tasks/cleanup.py](app/tasks/cleanup.py) - Maintenance tasks
  - `cleanup_expired_tokens` - Remove expired refresh tokens
  - `cleanup_stale_sessions` - Mark old active sessions as inactive
  - `cleanup_redis_cache` - Remove stale cache entries
  - `cleanup_old_activity_logs` - Delete old activity logs
  - `cleanup_websocket_rooms` - Clean up abandoned WebSocket rooms

- [app/tasks/webhooks.py](app/tasks/webhooks.py) - Webhook delivery tasks
  - `send_webhook` - Send webhook with retry logic
  - `retry_webhook` - Retry failed webhook deliveries

- [app/tasks/payroll.py](app/tasks/payroll.py) - Payroll processing tasks
  - `generate_timesheets` - Auto-generate timesheets from attendance
  - `process_payroll_cycle` - Calculate totals and finalize payroll

### Configuration

Task configuration in [app/tasks/__init__.py](app/tasks/__init__.py):
- Task serialization: JSON
- Timezone: UTC
- Task time limit: 3600 seconds (1 hour)
- Soft time limit: 3000 seconds (50 minutes)

## 2. Organization Management Extensions

Enhanced organization and team management with RBAC.

### New Models

- [app/models/team.py](app/models/team.py)
  - `Team` - Hierarchical team structure with manager assignment
  - `TeamMember` - Team membership with roles
  - `Permission` - Fine-grained permissions (resource + action)
  - `Role` - Custom roles with permission assignments
  - `RolePermission` - Role-to-permission mapping
  - `UserRole` - User-to-role assignment

### Organization Extensions

Extended Organization model in [app/models/user.py](app/models/user.py):
- `logo_url` - Organization branding
- `primary_color` / `secondary_color` - Custom colors
- `custom_domain` - White-label domain support
- `billing_email` - Billing contact
- `plan_type` - Subscription plan (free/pro/enterprise)
- `max_users` - User limit based on plan

### Schemas

- [app/schemas/team.py](app/schemas/team.py) - Team, role, and permission schemas

## 3. Advanced Analytics & Reporting

Comprehensive analytics system with custom reports.

### New Models

- [app/models/analytics.py](app/models/analytics.py)
  - `ApplicationUsage` - Track which applications users are using
  - `IdleTimeLog` - Detailed idle time tracking with session association
  - `ProductivityHeatmap` - Hourly productivity breakdown
  - `CustomReport` - User-defined report configurations
  - `ReportExecution` - Track report generation status

### API Endpoints

- [app/api/v1/analytics.py](app/api/v1/analytics.py)
  - `GET /analytics/application-usage` - Get application usage history
  - `GET /analytics/application-usage/summary` - Usage statistics by app
  - `GET /analytics/idle-time` - Get idle time logs
  - `GET /analytics/idle-time/summary` - Idle time statistics by day
  - `GET /analytics/productivity-heatmap` - Get hourly productivity data
  - `POST /analytics/custom-reports` - Create custom report definition
  - `GET /analytics/custom-reports` - List all custom reports
  - `GET /analytics/custom-reports/{id}` - Get report details
  - `POST /analytics/custom-reports/{id}/execute` - Generate report

### Features

- Redis caching for frequently accessed analytics data
- Customizable date ranges for all analytics
- Export to CSV via background tasks
- Scheduled report generation

## 4. Webhook System

Enterprise webhook system with retry logic and delivery tracking.

### Models

- [app/models/webhook.py](app/models/webhook.py)
  - `Webhook` - Webhook configuration with events and retry settings
  - `WebhookDelivery` - Delivery tracking with status and attempts

### Service

- [app/services/webhook_service.py](app/services/webhook_service.py)
  - HMAC signature generation for security
  - Automatic retry with exponential backoff
  - Delivery status tracking
  - Test webhook functionality

### API Endpoints

- [app/api/v1/webhooks.py](app/api/v1/webhooks.py)
  - `POST /webhooks` - Create webhook
  - `GET /webhooks` - List webhooks
  - `GET /webhooks/{id}` - Get webhook details
  - `PUT /webhooks/{id}` - Update webhook
  - `DELETE /webhooks/{id}` - Delete webhook
  - `GET /webhooks/{id}/deliveries` - View delivery history
  - `POST /webhooks/{id}/test` - Test webhook delivery
  - `POST /webhooks/{id}/regenerate-secret` - Regenerate signing secret

### Features

- Configurable retry count (0-10)
- Configurable timeout (5-120 seconds)
- HMAC-SHA256 payload signing
- Event filtering (subscribe to specific events)
- Delivery history with response tracking

## 5. Attendance Enhancements

Extended attendance tracking with breaks, shifts, overtime, and geofencing.

### New Models

- [app/models/attendance_extended.py](app/models/attendance_extended.py)
  - `BreakRecord` - Track break periods with paid/unpaid status
  - `Shift` - Define work shifts with time ranges
  - `ShiftAssignment` - Assign shifts to users
  - `OvertimeRecord` - Track overtime hours with approval workflow
  - `GeofenceLocation` - Define allowed locations for clock-in
  - `LocationVerification` - Verify clock-in/out locations

### Features

- Break management with duration tracking
- Shift scheduling with days of week support
- Overtime calculation and approval
- Geofencing with radius-based verification
- Location accuracy tracking

## 6. Payroll System

Complete payroll management with timesheet generation and tax calculations.

### Models

- [app/models/payroll.py](app/models/payroll.py)
  - `PayrollCycle` - Payroll periods with date ranges
  - `Timesheet` - Auto-generated from attendance data
  - `Bonus` - Performance bonuses with approval
  - `Deduction` - Deductions including auto-calculated taxes
  - `TaxConfiguration` - Configurable tax rates and thresholds

### API Endpoints

- [app/api/v1/payroll.py](app/api/v1/payroll.py)
  - `POST /payroll/cycles` - Create payroll cycle
  - `GET /payroll/cycles` - List payroll cycles
  - `GET /payroll/cycles/{id}` - Get cycle details
  - `GET /payroll/cycles/{id}/timesheets` - Get all timesheets
  - `GET /payroll/timesheets/my-timesheet` - Get user's timesheet
  - `POST /payroll/timesheets/{id}/approve` - Approve timesheet
  - `POST /payroll/timesheets/{id}/bonuses` - Add bonus
  - `POST /payroll/timesheets/{id}/deductions` - Add deduction
  - `POST /payroll/tax-configurations` - Create tax config
  - `GET /payroll/tax-configurations` - List tax configs
  - `PUT /payroll/tax-configurations/{id}` - Update tax config

### Features

- Automatic timesheet generation from attendance
- Regular and overtime hours calculation
- Configurable overtime rates (default 1.5x)
- Automatic tax calculations based on rules
- Bonus and deduction management
- Approval workflow for timesheets

## 7. Storage Enhancements

Enhanced Backblaze storage service with additional capabilities.

### Updates to BackblazeService

- [app/services/storage_service.py](app/services/storage_service.py)
  - `download_file()` - Download files for processing
  - `delete_file()` - Enhanced file deletion

### Features

- Screenshot deduplication using SHA256 hashing
- Image compression with Pillow (JPEG quality 85%)
- Retention policy enforcement
- Orphaned file cleanup

## 8. Real-time Dashboard

Live dashboard with WebSocket updates and comprehensive metrics.

### API Endpoints

- [app/api/v1/dashboard.py](app/api/v1/dashboard.py)
  - `WS /dashboard/realtime` - WebSocket for live metrics
  - `GET /dashboard/metrics` - Current dashboard metrics
  - `GET /dashboard/activity-timeline` - Recent activity events
  - `GET /dashboard/user-status` - All user statuses

### Metrics Provided

- Active users count (currently clocked in)
- Total users count
- Average productivity score
- Screenshots captured today
- Late arrivals count
- Total idle time (hours)
- Online users count (WebSocket connections)
- User-level status (online, clocked in, productivity)

### Features

- Real-time updates every 5 seconds
- Activity timeline with clock-in/out events
- Per-user status dashboard
- Admin-only access with JWT authentication

## 9. Caching System

Redis-based caching for improved performance.

### Cache Utilities

- [app/utils/cache.py](app/utils/cache.py)
  - `@cache_result` decorator for function result caching
  - `cache_set()` - Manual cache storage
  - `cache_get()` - Manual cache retrieval
  - `cache_delete()` - Single key deletion
  - `invalidate_cache_pattern()` - Pattern-based cache clearing

### Usage

Analytics endpoints use caching with appropriate TTLs:
- Application usage: 5 minutes
- Usage summaries: 10 minutes
- Productivity heatmap: 1 hour

## Configuration Updates

### Environment Variables

New configuration options in [app/config.py](app/config.py):
- `SMTP_HOST` - Email server hostname
- `SMTP_PORT` - Email server port (default 587)
- `SMTP_USER` - Email authentication username
- `SMTP_PASSWORD` - Email authentication password

### Dependencies

Updated [requirements/base.txt](requirements/base.txt):
- `pillow==11.0.0` - Image processing
- `websockets==14.1` - WebSocket support

## Database Schema Updates

All new models require database migrations. Generate and apply migrations:

```bash
alembic revision --autogenerate -m "Add advanced features"
alembic upgrade head
```

## API Documentation

All new endpoints are automatically documented in:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Usage Examples

### Webhook Integration

```python
import requests
import hmac
import hashlib

payload = {"event": "attendance.clock_in", "user_id": "..."}
secret = "your_webhook_secret"

signature = hmac.new(
    secret.encode('utf-8'),
    json.dumps(payload).encode('utf-8'),
    hashlib.sha256
).hexdigest()

headers = {
    "X-Webhook-Signature": signature,
    "X-Webhook-Event": "attendance.clock_in"
}

response = requests.post("https://your-endpoint.com", json=payload, headers=headers)
```

### Dashboard WebSocket

```javascript
const ws = new WebSocket(`ws://localhost:8000/api/v1/dashboard/realtime?token=${accessToken}`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Dashboard metrics:", data);
};
```

### Background Task

```python
from app.tasks.reports import generate_attendance_report

task = generate_attendance_report.delay(
    organization_id="...",
    start_date="2024-01-01",
    end_date="2024-01-31",
    user_ids=["user1", "user2"]
)

result = task.get(timeout=300)
```

## Testing

Run Celery worker for background tasks:

```bash
celery -A app.tasks worker --loglevel=info
```

Run Celery beat for scheduled tasks:

```bash
celery -A app.tasks beat --loglevel=info
```

## Performance Considerations

- All analytics endpoints use Redis caching
- Background tasks prevent API blocking
- WebSocket connections are managed efficiently
- Database queries use indexes for performance
- Webhook retries use exponential backoff

## Security Features

- Webhook HMAC signature verification
- JWT authentication for WebSocket connections
- Admin-only access for sensitive endpoints
- Organization-level data isolation
- RBAC with custom permissions
