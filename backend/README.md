# Work Invigilator Backend

FastAPI-based backend for Work Invigilator employee monitoring system.

## Features

- User authentication with JWT
- Attendance tracking (clock in/out)
- Screenshot management
- Session recording
- Productivity metrics
- Backblaze B2 file storage
- PostgreSQL database
- Redis caching
- WebRTC live monitoring
- Real-time screen sharing
- WebSocket signaling server
- Admin dashboard for live viewing

## Technology Stack

- FastAPI 0.115
- Python 3.11+
- PostgreSQL 16
- Redis 7.2
- SQLAlchemy 2.0
- Alembic (migrations)
- Backblaze B2 SDK

## Project Structure

```
backend/
├── app/
│   ├── api/              # API endpoints
│   ├── core/             # Security, auth, exceptions
│   ├── db/               # Database configuration
│   ├── models/           # SQLAlchemy models
│   ├── schemas/          # Pydantic schemas
│   ├── services/         # Business logic
│   ├── config.py         # Configuration
│   └── main.py           # FastAPI app
├── alembic/              # Database migrations
├── scripts/              # Utility scripts
├── tests/                # Test suite
└── requirements/         # Dependencies
```

## Installation

### Prerequisites

- Python 3.11+
- PostgreSQL 16
- Redis 7.2
- Backblaze B2 account

### Setup

1. Clone the repository

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements/dev.txt
```

4. Create `.env` file:
```bash
cp .env.example .env
```

5. Update `.env` with your credentials:
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/workinvigilator
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=your-secret-key
BACKBLAZE_KEY_ID=your-key-id
BACKBLAZE_APPLICATION_KEY=your-app-key
BACKBLAZE_BUCKET_NAME=your-bucket-name
BACKBLAZE_BUCKET_ID=your-bucket-id
```

## Database Setup

### Create Database

```sql
CREATE DATABASE workinvigilator;
```

### Run Migrations

```bash
alembic upgrade head
```

### Create Initial Migration

```bash
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

## Data Migration

To migrate data from Supabase to new PostgreSQL:

1. Update `.env` with Supabase credentials:
```
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEW_DATABASE_URL=postgresql://user:password@localhost:5432/workinvigilator
```

2. Run migration script:
```bash
python scripts/migrate_from_supabase.py
```

## Running the Application

### Development

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Production

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker

```bash
docker-compose up --build
```

## API Documentation

Once running, access:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user

### Attendance
- `POST /api/v1/attendance/clock-in` - Clock in
- `POST /api/v1/attendance/clock-out` - Clock out
- `GET /api/v1/attendance/my-records` - Get attendance records
- `GET /api/v1/attendance/today` - Get today's attendance

### Sessions
- `POST /api/v1/sessions/start` - Start recording session
- `POST /api/v1/sessions/end` - End recording session
- `GET /api/v1/sessions/active` - Get active session
- `GET /api/v1/sessions/history` - Get session history

### Screenshots
- `POST /api/v1/screenshots/upload` - Upload screenshot
- `GET /api/v1/screenshots/my-screenshots` - Get screenshots
- `GET /api/v1/screenshots/{id}` - Get screenshot by ID
- `DELETE /api/v1/screenshots/{id}` - Delete screenshot

### Health
- `GET /health` - Health check
- `GET /` - API info

## Testing

Run tests:
```bash
pytest
```

With coverage:
```bash
pytest --cov=app --cov-report=html
```

## Deployment

### Oracle Cloud Infrastructure

See `FASTAPI_NEW_BACKEND_ARCHITECTURE.md` for detailed OCI deployment instructions.

### Docker Production

```bash
docker build -t workinvigilator-backend .
docker run -p 8000:8000 --env-file .env.production workinvigilator-backend
```

## Development

### Code Formatting

```bash
black app/
```

### Linting

```bash
ruff check app/
```

### Type Checking

```bash
mypy app/
```

## Environment Variables

See `.env.example` for all available configuration options.

## License

Proprietary

## Support

For issues and questions, contact the development team.
