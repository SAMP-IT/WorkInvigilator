# FastAPI New Backend Architecture
## Work Invigilator - Independent Backend with PostgreSQL & Data Migration

---

## 🎯 Project Overview

### What We're Building
A **brand new, standalone FastAPI backend** that:
- Uses a **new PostgreSQL database** (not Supabase)
- **Migrates all data** from Supabase to the new PostgreSQL
- Uses **Backblaze B2** for file storage
- Deploys on **Oracle Cloud Infrastructure**
- Serves a **new React web application**
- Is **completely independent** from the Next.js dashboard

### What This Is NOT
- ❌ NOT a replacement for Next.js dashboard
- ❌ NOT using Supabase
- ❌ NOT migrating the Next.js app
- ❌ Just a new backend + new React app

---

## 📋 Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Database Design](#3-database-design)
4. [Data Migration Strategy](#4-data-migration-strategy)
5. [Directory Structure](#5-directory-structure)
6. [API Design](#6-api-design)
7. [Backblaze B2 Integration](#7-backblaze-b2-integration)
8. [Oracle Cloud Deployment](#8-oracle-cloud-deployment)
9. [Implementation Plan](#9-implementation-plan)
10. [Migration Timeline](#10-migration-timeline)

---

## 1. Architecture Overview

### 1.1 System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     CLIENT APPLICATIONS                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────┐      ┌─────────────────────────┐   │
│  │  Next.js Dashboard  │      │   New React Web App     │   │
│  │  (Existing)         │      │   (New - To Build)      │   │
│  │  Port 3000          │      │   Port 80/443           │   │
│  │  - Uses Supabase    │      │   - Uses FastAPI        │   │
│  │  - Admin UI         │      │   - Employee UI         │   │
│  │  - Analytics        │      │   - Self-service        │   │
│  └──────────┬──────────┘      └────────────┬────────────┘   │
│             │                               │                │
│             │ (No changes)                  │ (New)          │
└─────────────┼───────────────────────────────┼────────────────┘
              │                               │
              │                               │
              ▼                               ▼
   ┌──────────────────────┐       ┌──────────────────────────┐
   │  Supabase API        │       │  FastAPI Backend         │
   │  (Existing)          │       │  (New - OCI)             │
   │  - PostgreSQL        │       │  - REST API              │
   │  - Next.js APIs      │       │  - WebSocket             │
   │  - Auth              │       │  - Background Jobs       │
   └──────────┬───────────┘       └─────────┬────────────────┘
              │                              │
              │                              │
              ▼                              ▼
   ┌──────────────────────┐       ┌──────────────────────────┐
   │  Supabase Database   │       │  New PostgreSQL          │
   │  (Existing)          │       │  (OCI Autonomous DB)     │
   │  - Continues to work │       │  - Migrated data         │
   │  - No changes        │       │  - New data going forward│
   └──────────────────────┘       └──────────────────────────┘

                            ┌──────────────────────────┐
                            │  Backblaze B2            │
                            │  - Screenshots           │
                            │  - Audio files           │
                            │  - Documents             │
                            └──────────────────────────┘
```

### 1.2 Key Components

| Component | Technology | Purpose | Location |
|-----------|-----------|---------|----------|
| **API Server** | FastAPI 0.115+ | REST API, WebSocket | Oracle Cloud |
| **Database** | PostgreSQL 16 | Primary data store | Oracle Autonomous DB |
| **Cache** | Redis 7.2 | Session, API cache | Oracle Cloud |
| **Storage** | Backblaze B2 | Files (screenshots, audio) | Backblaze |
| **Web Server** | NGINX | Reverse proxy, SSL | Oracle Cloud |
| **Load Balancer** | OCI Load Balancer | High availability | Oracle Cloud |

---

## 2. Technology Stack

### 2.1 Backend Stack

```python
# Core Framework
fastapi==0.115.0
uvicorn[standard]==0.32.0
python==3.11+

# Database
psycopg2-binary==2.9.9       # PostgreSQL driver
asyncpg==0.29.0              # Async PostgreSQL driver
SQLAlchemy==2.0.35           # ORM
alembic==1.13.0              # Database migrations

# Data Validation
pydantic==2.10.0
pydantic-settings==2.6.0
email-validator==2.2.0

# Authentication
python-jose[cryptography]==3.3.0  # JWT
passlib[bcrypt]==1.7.4            # Password hashing
python-multipart==0.0.17          # Form data

# Caching
redis==5.2.0
hiredis==3.0.0

# Cloud Storage
b2sdk==2.5.0                 # Backblaze B2 SDK

# Background Jobs
celery==5.4.0
redis==5.2.0                 # Celery broker

# HTTP Client
httpx==0.28.0

# Utilities
python-dateutil==2.9.0
pytz==2024.2
python-dotenv==1.0.1

# Monitoring
python-json-logger==3.2.0
sentry-sdk[fastapi]==2.18.0
prometheus-fastapi-instrumentator==7.0.0

# Testing
pytest==8.3.0
pytest-asyncio==0.24.0
pytest-cov==6.0.0
faker==30.8.2                # Test data generation

# Development
black==24.10.0               # Code formatting
ruff==0.8.0                  # Linting
mypy==1.13.0                 # Type checking
```

### 2.2 Infrastructure Stack

```yaml
# Oracle Cloud Infrastructure
- Compute: VM.Standard.E4.Flex (4 vCPU, 16GB RAM) x 2
- Database: Autonomous Database (Serverless, 2 OCPU, 2TB storage)
- Load Balancer: Flexible shape, 10 Mbps minimum
- Block Volume: 100GB for application files
- VCN: Virtual Cloud Network with Internet Gateway
- Redis: OCI Cache for Redis (2GB)

# Backblaze B2
- Bucket: workinvigilator-media
- Storage: 1TB initial (scalable)
- CDN: Cloudflare (optional)

# Monitoring & Logging
- Sentry (error tracking)
- Prometheus + Grafana (metrics)
- OCI Logging (application logs)
```

---

## 3. Database Design

### 3.1 PostgreSQL Schema

Since we're creating a **new PostgreSQL database**, here's the complete schema:

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users/Profiles
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    department VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'user', -- 'admin' or 'user'
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    hourly_rate DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT role_check CHECK (role IN ('admin', 'user'))
);

-- Attendance Records
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in_time TIMESTAMP,
    clock_out_time TIMESTAMP,
    first_activity_time TIMESTAMP,
    last_activity_time TIMESTAMP,
    is_late BOOLEAN DEFAULT FALSE,
    late_by_minutes INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'present', -- 'present', 'late', 'absent', 'on_leave'
    auto_clocked_in BOOLEAN DEFAULT FALSE,
    clock_in_location_lat DECIMAL(10, 8),
    clock_in_location_lng DECIMAL(11, 8),
    clock_out_location_lat DECIMAL(10, 8),
    clock_out_location_lng DECIMAL(11, 8),
    clock_in_verified BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, organization_id, date),
    CONSTRAINT status_check CHECK (status IN ('present', 'late', 'absent', 'on_leave'))
);

-- Recording Sessions
CREATE TABLE recording_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    session_start_time TIMESTAMP NOT NULL,
    session_end_time TIMESTAMP,
    total_duration_seconds INTEGER DEFAULT 0,
    total_chunks INTEGER DEFAULT 0,
    total_chunk_duration_seconds INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Screenshots
CREATE TABLE screenshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    session_id UUID REFERENCES recording_sessions(id) ON DELETE SET NULL,
    filename VARCHAR(500) NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    storage_provider VARCHAR(50) DEFAULT 'backblaze', -- 'backblaze', 's3'
    backblaze_file_id VARCHAR(255), -- Backblaze B2 file ID for deletion
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audio Recordings
CREATE TABLE audio_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    session_id UUID REFERENCES recording_sessions(id) ON DELETE SET NULL,
    filename VARCHAR(500) NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    duration_seconds INTEGER,
    storage_provider VARCHAR(50) DEFAULT 'backblaze',
    backblaze_file_id VARCHAR(255),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Productivity Metrics
CREATE TABLE productivity_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    focus_time_seconds INTEGER DEFAULT 0,
    idle_time_seconds INTEGER DEFAULT 0,
    active_time_seconds INTEGER DEFAULT 0,
    break_time_seconds INTEGER DEFAULT 0,
    productivity_score DECIMAL(5, 2), -- 0.00 to 100.00
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, organization_id, date)
);

-- Work Hours Settings
CREATE TABLE work_hours_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    work_start_time TIME NOT NULL DEFAULT '09:00:00',
    work_end_time TIME NOT NULL DEFAULT '17:00:00',
    late_threshold_minutes INTEGER DEFAULT 15,
    break_duration_minutes INTEGER DEFAULT 60,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id)
);

-- Activity Logs (optional, for detailed tracking)
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'mouse_move', 'keyboard', 'app_switch', etc.
    activity_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refresh Tokens (for JWT refresh)
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX idx_profiles_organization ON profiles(organization_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_attendance_user_date ON attendance_records(user_id, date);
CREATE INDEX idx_attendance_organization ON attendance_records(organization_id);
CREATE INDEX idx_sessions_user ON recording_sessions(user_id);
CREATE INDEX idx_sessions_active ON recording_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_screenshots_user ON screenshots(user_id);
CREATE INDEX idx_screenshots_created ON screenshots(created_at);
CREATE INDEX idx_screenshots_organization ON screenshots(organization_id);
CREATE INDEX idx_audio_user ON audio_recordings(user_id);
CREATE INDEX idx_productivity_user_date ON productivity_metrics(user_id, date);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at) WHERE is_revoked = FALSE;
```

### 3.2 Database Connection

```python
# app/db/session.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=3600,
)

# Create async session factory
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base class for models
Base = declarative_base()

# Dependency injection
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

---

## 4. Data Migration Strategy

### 4.1 Migration Overview

We need to migrate data from **Supabase PostgreSQL** to **new OCI PostgreSQL**.

```
┌─────────────────────────┐
│  Supabase PostgreSQL    │
│  (Source)               │
│  - profiles             │
│  - attendance_records   │
│  - recording_sessions   │
│  - screenshots          │
│  - audio_recordings     │
│  - productivity_metrics │
│  - work_hours_settings  │
└────────────┬────────────┘
             │
             │ ETL Process
             ▼
┌─────────────────────────┐
│  Migration Script       │
│  (Python)               │
│  - Extract from Supabase│
│  - Transform data       │
│  - Load to new DB       │
│  - Verify integrity     │
└────────────┬────────────┘
             │
             │ Batch insert
             ▼
┌─────────────────────────┐
│  OCI PostgreSQL         │
│  (Target)               │
│  - New schema           │
│  - Migrated data        │
│  - Indexes created      │
└─────────────────────────┘
```

### 4.2 Migration Script

```python
# scripts/migrate_from_supabase.py
import asyncio
import asyncpg
from supabase import create_client, Client
from typing import List, Dict, Any
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Supabase connection
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# New PostgreSQL connection
NEW_DB_URL = os.getenv("NEW_DATABASE_URL")

class DataMigrator:
    def __init__(self):
        self.conn = None
        self.stats = {
            'organizations': 0,
            'profiles': 0,
            'attendance_records': 0,
            'recording_sessions': 0,
            'screenshots': 0,
            'audio_recordings': 0,
            'productivity_metrics': 0,
            'work_hours_settings': 0,
        }

    async def connect_target_db(self):
        """Connect to target PostgreSQL database"""
        self.conn = await asyncpg.connect(NEW_DB_URL)
        print("✓ Connected to target database")

    async def migrate_organizations(self):
        """
        Migrate organizations.
        Supabase might not have this table, so we create from profiles.
        """
        print("\n[1/8] Migrating organizations...")

        # Get unique organization_ids from profiles
        result = supabase.table('profiles').select('organization_id').execute()
        org_ids = list(set([r['organization_id'] for r in result.data if r.get('organization_id')]))

        for org_id in org_ids:
            await self.conn.execute('''
                INSERT INTO organizations (id, name, slug, created_at)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (id) DO NOTHING
            ''', org_id, f'Organization {org_id[:8]}', f'org-{org_id[:8]}', datetime.utcnow())
            self.stats['organizations'] += 1

        print(f"✓ Migrated {self.stats['organizations']} organizations")

    async def migrate_profiles(self):
        """Migrate user profiles"""
        print("\n[2/8] Migrating profiles...")

        # Fetch all profiles from Supabase
        offset = 0
        batch_size = 1000

        while True:
            result = supabase.table('profiles').select('*').range(offset, offset + batch_size - 1).execute()
            profiles = result.data

            if not profiles:
                break

            # Batch insert
            for profile in profiles:
                await self.conn.execute('''
                    INSERT INTO profiles (
                        id, email, password_hash, name, department, role,
                        organization_id, hourly_rate, is_active, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT (id) DO UPDATE SET
                        email = EXCLUDED.email,
                        name = EXCLUDED.name,
                        updated_at = EXCLUDED.updated_at
                ''',
                    profile['id'],
                    profile['email'],
                    profile.get('password_hash', ''),  # May need to handle auth separately
                    profile.get('name'),
                    profile.get('department'),
                    profile.get('role', 'user'),
                    profile['organization_id'],
                    profile.get('hourly_rate'),
                    True,
                    profile.get('created_at', datetime.utcnow()),
                    profile.get('updated_at', datetime.utcnow())
                )
                self.stats['profiles'] += 1

            offset += batch_size
            print(f"  Processed {offset} profiles...")

        print(f"✓ Migrated {self.stats['profiles']} profiles")

    async def migrate_attendance_records(self):
        """Migrate attendance records"""
        print("\n[3/8] Migrating attendance records...")

        offset = 0
        batch_size = 1000

        while True:
            result = supabase.table('attendance_records').select('*').range(offset, offset + batch_size - 1).execute()
            records = result.data

            if not records:
                break

            for record in records:
                await self.conn.execute('''
                    INSERT INTO attendance_records (
                        id, user_id, organization_id, date,
                        clock_in_time, clock_out_time,
                        first_activity_time, last_activity_time,
                        is_late, late_by_minutes, status,
                        auto_clocked_in, clock_in_verified,
                        created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    ON CONFLICT (user_id, organization_id, date) DO UPDATE SET
                        clock_out_time = EXCLUDED.clock_out_time,
                        updated_at = EXCLUDED.updated_at
                ''',
                    record['id'],
                    record['user_id'],
                    record['organization_id'],
                    record['date'],
                    record.get('clock_in_time'),
                    record.get('clock_out_time'),
                    record.get('first_activity_time'),
                    record.get('last_activity_time'),
                    record.get('is_late', False),
                    record.get('late_by_minutes', 0),
                    record.get('status', 'present'),
                    record.get('auto_clocked_in', False),
                    record.get('clock_in_verified', True),
                    record.get('created_at', datetime.utcnow()),
                    record.get('updated_at', datetime.utcnow())
                )
                self.stats['attendance_records'] += 1

            offset += batch_size
            print(f"  Processed {offset} attendance records...")

        print(f"✓ Migrated {self.stats['attendance_records']} attendance records")

    async def migrate_recording_sessions(self):
        """Migrate recording sessions"""
        print("\n[4/8] Migrating recording sessions...")

        offset = 0
        batch_size = 1000

        while True:
            result = supabase.table('recording_sessions').select('*').range(offset, offset + batch_size - 1).execute()
            sessions = result.data

            if not sessions:
                break

            for session in sessions:
                await self.conn.execute('''
                    INSERT INTO recording_sessions (
                        id, user_id, organization_id,
                        session_start_time, session_end_time,
                        total_duration_seconds, total_chunks,
                        total_chunk_duration_seconds, is_active,
                        created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT (id) DO NOTHING
                ''',
                    session['id'],
                    session['user_id'],
                    session['organization_id'],
                    session['session_start_time'],
                    session.get('session_end_time'),
                    session.get('total_duration_seconds', 0),
                    session.get('total_chunks', 0),
                    session.get('total_chunk_duration_seconds', 0),
                    session.get('session_end_time') is None,
                    session.get('created_at', datetime.utcnow()),
                    session.get('updated_at', datetime.utcnow())
                )
                self.stats['recording_sessions'] += 1

            offset += batch_size
            print(f"  Processed {offset} sessions...")

        print(f"✓ Migrated {self.stats['recording_sessions']} recording sessions")

    async def migrate_screenshots(self):
        """Migrate screenshots metadata (files already in storage)"""
        print("\n[5/8] Migrating screenshots...")

        offset = 0
        batch_size = 1000

        while True:
            result = supabase.table('screenshots').select('*').range(offset, offset + batch_size - 1).execute()
            screenshots = result.data

            if not screenshots:
                break

            for screenshot in screenshots:
                await self.conn.execute('''
                    INSERT INTO screenshots (
                        id, user_id, organization_id, session_id,
                        filename, file_url, storage_provider,
                        is_deleted, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (id) DO NOTHING
                ''',
                    screenshot['id'],
                    screenshot['user_id'],
                    screenshot['organization_id'],
                    screenshot.get('session_id'),
                    screenshot['filename'],
                    screenshot['file_url'],
                    screenshot.get('storage_provider', 'backblaze'),
                    False,
                    screenshot.get('created_at', datetime.utcnow())
                )
                self.stats['screenshots'] += 1

            offset += batch_size
            print(f"  Processed {offset} screenshots...")

        print(f"✓ Migrated {self.stats['screenshots']} screenshots")

    async def migrate_audio_recordings(self):
        """Migrate audio recordings metadata"""
        print("\n[6/8] Migrating audio recordings...")

        # Check if table exists in Supabase
        try:
            result = supabase.table('audio_recordings').select('*').limit(1).execute()
        except Exception:
            print("  ⚠ audio_recordings table not found in Supabase, skipping...")
            return

        offset = 0
        batch_size = 1000

        while True:
            result = supabase.table('audio_recordings').select('*').range(offset, offset + batch_size - 1).execute()
            recordings = result.data

            if not recordings:
                break

            for recording in recordings:
                await self.conn.execute('''
                    INSERT INTO audio_recordings (
                        id, user_id, organization_id, session_id,
                        filename, file_url, duration_seconds,
                        storage_provider, is_deleted, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (id) DO NOTHING
                ''',
                    recording['id'],
                    recording['user_id'],
                    recording['organization_id'],
                    recording.get('session_id'),
                    recording['filename'],
                    recording['file_url'],
                    recording.get('duration_seconds'),
                    recording.get('storage_provider', 'backblaze'),
                    False,
                    recording.get('created_at', datetime.utcnow())
                )
                self.stats['audio_recordings'] += 1

            offset += batch_size
            print(f"  Processed {offset} audio recordings...")

        print(f"✓ Migrated {self.stats['audio_recordings']} audio recordings")

    async def migrate_productivity_metrics(self):
        """Migrate productivity metrics"""
        print("\n[7/8] Migrating productivity metrics...")

        # Check if table exists
        try:
            result = supabase.table('productivity_metrics').select('*').limit(1).execute()
        except Exception:
            print("  ⚠ productivity_metrics table not found in Supabase, skipping...")
            return

        offset = 0
        batch_size = 1000

        while True:
            result = supabase.table('productivity_metrics').select('*').range(offset, offset + batch_size - 1).execute()
            metrics = result.data

            if not metrics:
                break

            for metric in metrics:
                await self.conn.execute('''
                    INSERT INTO productivity_metrics (
                        id, user_id, organization_id, date,
                        focus_time_seconds, idle_time_seconds,
                        active_time_seconds, productivity_score,
                        created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (user_id, organization_id, date) DO UPDATE SET
                        focus_time_seconds = EXCLUDED.focus_time_seconds,
                        updated_at = EXCLUDED.updated_at
                ''',
                    metric['id'],
                    metric['user_id'],
                    metric['organization_id'],
                    metric['date'],
                    metric.get('focus_time_seconds', 0),
                    metric.get('idle_time_seconds', 0),
                    metric.get('active_time_seconds', 0),
                    metric.get('productivity_score'),
                    metric.get('created_at', datetime.utcnow()),
                    metric.get('updated_at', datetime.utcnow())
                )
                self.stats['productivity_metrics'] += 1

            offset += batch_size
            print(f"  Processed {offset} productivity metrics...")

        print(f"✓ Migrated {self.stats['productivity_metrics']} productivity metrics")

    async def migrate_work_hours_settings(self):
        """Migrate work hours settings"""
        print("\n[8/8] Migrating work hours settings...")

        try:
            result = supabase.table('work_hours_settings').select('*').execute()
            settings = result.data

            for setting in settings:
                await self.conn.execute('''
                    INSERT INTO work_hours_settings (
                        id, organization_id, work_start_time, work_end_time,
                        late_threshold_minutes, break_duration_minutes,
                        created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (organization_id) DO UPDATE SET
                        work_start_time = EXCLUDED.work_start_time,
                        updated_at = EXCLUDED.updated_at
                ''',
                    setting['id'],
                    setting['organization_id'],
                    setting.get('work_start_time', '09:00:00'),
                    setting.get('work_end_time', '17:00:00'),
                    setting.get('late_threshold_minutes', 15),
                    setting.get('break_duration_minutes', 60),
                    setting.get('created_at', datetime.utcnow()),
                    setting.get('updated_at', datetime.utcnow())
                )
                self.stats['work_hours_settings'] += 1

        except Exception as e:
            print(f"  ⚠ work_hours_settings table not found or error: {e}")

        print(f"✓ Migrated {self.stats['work_hours_settings']} work hours settings")

    async def verify_migration(self):
        """Verify data integrity after migration"""
        print("\n📊 Verifying migration...")

        for table, count in self.stats.items():
            db_count = await self.conn.fetchval(f'SELECT COUNT(*) FROM {table}')
            if db_count == count:
                print(f"  ✓ {table}: {db_count} records (matches)")
            else:
                print(f"  ⚠ {table}: {db_count} in DB vs {count} migrated (mismatch!)")

    async def run(self):
        """Run full migration"""
        print("=" * 60)
        print("🚀 Starting Supabase to PostgreSQL Migration")
        print("=" * 60)

        try:
            await self.connect_target_db()
            await self.migrate_organizations()
            await self.migrate_profiles()
            await self.migrate_attendance_records()
            await self.migrate_recording_sessions()
            await self.migrate_screenshots()
            await self.migrate_audio_recordings()
            await self.migrate_productivity_metrics()
            await self.migrate_work_hours_settings()
            await self.verify_migration()

            print("\n" + "=" * 60)
            print("✅ Migration completed successfully!")
            print("=" * 60)
            print("\n📈 Final Statistics:")
            for table, count in self.stats.items():
                print(f"  {table}: {count}")

        except Exception as e:
            print(f"\n❌ Migration failed: {e}")
            raise
        finally:
            if self.conn:
                await self.conn.close()

if __name__ == "__main__":
    migrator = DataMigrator()
    asyncio.run(migrator.run())
```

### 4.3 Migration Checklist

```bash
# 1. Backup Supabase data
pg_dump -h <supabase-host> -U postgres -d postgres > supabase_backup.sql

# 2. Create new PostgreSQL database on OCI
# (Use OCI Console to create Autonomous Database)

# 3. Run schema creation
psql -h <oci-host> -U admin -d workinvigilator < schema.sql

# 4. Run migration script
python scripts/migrate_from_supabase.py

# 5. Verify data
psql -h <oci-host> -U admin -d workinvigilator -c "SELECT COUNT(*) FROM profiles;"

# 6. Update application config
# Point FastAPI to new database URL
```

---

## 5. Directory Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI application
│   ├── config.py                # Configuration
│   │
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py
│   │       ├── auth.py
│   │       ├── attendance.py
│   │       ├── dashboard.py
│   │       ├── employees.py
│   │       ├── health.py
│   │       ├── productivity.py
│   │       ├── screenshots.py
│   │       ├── sessions.py
│   │       └── settings.py
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── security.py          # JWT, password hashing
│   │   ├── dependencies.py      # DI
│   │   └── exceptions.py
│   │
│   ├── db/
│   │   ├── __init__.py
│   │   ├── session.py           # Database session
│   │   └── redis.py             # Redis client
│   │
│   ├── models/                  # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── attendance.py
│   │   ├── session.py
│   │   ├── screenshot.py
│   │   └── productivity.py
│   │
│   ├── schemas/                 # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── attendance.py
│   │   └── common.py
│   │
│   ├── services/                # Business logic
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── attendance_service.py
│   │   ├── dashboard_service.py
│   │   ├── screenshot_service.py
│   │   └── storage_service.py   # Backblaze B2
│   │
│   ├── repositories/            # Data access
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── user_repository.py
│   │   └── attendance_repository.py
│   │
│   └── utils/
│       ├── __init__.py
│       ├── datetime.py
│       └── validators.py
│
├── alembic/                     # Database migrations
│   ├── versions/
│   ├── env.py
│   └── alembic.ini
│
├── scripts/
│   ├── migrate_from_supabase.py # Data migration
│   ├── setup_backblaze.py
│   └── seed_data.py
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── conftest.py
│
├── requirements/
│   ├── base.txt
│   ├── dev.txt
│   └── prod.txt
│
├── .env.example
├── .env.production
├── Dockerfile
├── docker-compose.yml
├── pyproject.toml
└── README.md
```

---

## 6. API Design

### 6.1 Core Endpoints

```python
# Authentication
POST   /api/v1/auth/register         # Register new user
POST   /api/v1/auth/login            # Login
POST   /api/v1/auth/refresh          # Refresh token
POST   /api/v1/auth/logout           # Logout
POST   /api/v1/auth/forgot-password  # Password reset
GET    /api/v1/auth/me               # Get current user

# Attendance
POST   /api/v1/attendance/clock-in   # Clock in
POST   /api/v1/attendance/clock-out  # Clock out
GET    /api/v1/attendance/my-records # Get my attendance
GET    /api/v1/attendance/today      # Today's status

# Sessions
POST   /api/v1/sessions/start        # Start session
POST   /api/v1/sessions/end          # End session
GET    /api/v1/sessions/active       # Get active session
GET    /api/v1/sessions/history      # Session history

# Screenshots
POST   /api/v1/screenshots/upload    # Upload screenshot
GET    /api/v1/screenshots           # List screenshots
GET    /api/v1/screenshots/{id}      # Get screenshot
DELETE /api/v1/screenshots/{id}      # Delete screenshot

# Dashboard
GET    /api/v1/dashboard/summary     # Dashboard summary
GET    /api/v1/dashboard/charts      # Chart data

# Productivity
GET    /api/v1/productivity/today    # Today's metrics
GET    /api/v1/productivity/weekly   # Weekly summary
GET    /api/v1/productivity/monthly  # Monthly summary

# Health
GET    /health                       # Health check
```

---

## 7. Backblaze B2 Integration

### 7.1 Storage Service (same as before)

```python
# app/services/storage_service.py
from b2sdk.v2 import B2Api, InMemoryAccountInfo
from app.config import settings

class BackblazeService:
    def __init__(self):
        self.info = InMemoryAccountInfo()
        self.b2_api = B2Api(self.info)
        self.b2_api.authorize_account(
            "production",
            settings.BACKBLAZE_KEY_ID,
            settings.BACKBLAZE_APPLICATION_KEY
        )
        self.bucket = self.b2_api.get_bucket_by_name(settings.BACKBLAZE_BUCKET_NAME)

    async def upload_file(self, file_data: bytes, filename: str, content_type: str, folder: str = "screenshots"):
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{folder}/{timestamp}_{filename}"

        file_info = self.bucket.upload_bytes(
            data_bytes=file_data,
            file_name=unique_filename,
            content_type=content_type
        )

        download_url = self.b2_api.get_download_url_for_file_name(
            bucket_name=settings.BACKBLAZE_BUCKET_NAME,
            file_name=unique_filename
        )

        return {
            'file_url': download_url,
            'file_id': file_info.id_,
            'filename': unique_filename,
            'size_bytes': len(file_data)
        }

backblaze_service = BackblazeService()
```

---

## 8. Oracle Cloud Deployment

### 8.1 OCI Setup

```bash
# 1. Create Autonomous Database
oci db autonomous-database create \
  --compartment-id <compartment-ocid> \
  --db-name workinvigilator \
  --display-name "Work Invigilator DB" \
  --cpu-core-count 2 \
  --data-storage-size-in-tbs 2 \
  --admin-password "<strong-password>"

# 2. Create Compute Instances (2x)
oci compute instance launch \
  --availability-domain <AD> \
  --compartment-id <compartment-ocid> \
  --shape VM.Standard.E4.Flex \
  --shape-config '{"ocpus":4,"memoryInGBs":16}' \
  --image-id <ubuntu-22.04-image-id> \
  --subnet-id <subnet-ocid>

# 3. Create Load Balancer
oci lb load-balancer create \
  --compartment-id <compartment-ocid> \
  --display-name "workinvigilator-lb" \
  --shape-name "flexible" \
  --subnet-ids '["<subnet-ocid>"]'

# 4. Setup Redis
# (Use OCI Console to provision Redis Cache)
```

---

## 9. Implementation Plan

### Phase 1: Database Setup (Week 1)
- [ ] Create OCI Autonomous Database
- [ ] Run schema creation script
- [ ] Create database users and permissions
- [ ] Setup connection pooling
- [ ] Test database connectivity

### Phase 2: Data Migration (Week 1-2)
- [ ] Backup Supabase data
- [ ] Run migration script (dry run)
- [ ] Verify data integrity
- [ ] Run actual migration
- [ ] Post-migration validation

### Phase 3: Backend Development (Week 2-4)
- [ ] Setup FastAPI project structure
- [ ] Implement authentication (JWT)
- [ ] Implement core endpoints
- [ ] Integrate Backblaze B2
- [ ] Write unit tests
- [ ] Integration tests

### Phase 4: Deployment (Week 5)
- [ ] Setup OCI compute instances
- [ ] Deploy FastAPI to OCI
- [ ] Configure load balancer
- [ ] Setup SSL certificate
- [ ] Configure Redis cache
- [ ] Production testing

### Phase 5: React App (Week 6-8)
- [ ] Build React web app
- [ ] Integrate with FastAPI
- [ ] Deploy React app
- [ ] End-to-end testing
- [ ] Go live

---

## 10. Migration Timeline

```
Week 1: Database & Migration
├─ Day 1-2: Create OCI database
├─ Day 3-4: Test migration script
└─ Day 5-7: Run full migration

Week 2-4: Backend Development
├─ Week 2: Auth + Core APIs
├─ Week 3: File upload + Storage
└─ Week 4: Testing + Optimization

Week 5: Deployment
├─ Day 1-2: Setup OCI infrastructure
├─ Day 3-4: Deploy & configure
└─ Day 5-7: Production testing

Week 6-8: React App
├─ Week 6: Build React app
├─ Week 7: Integration
└─ Week 8: Launch
```

---

## Conclusion

This architecture provides:
✅ **New PostgreSQL database** on Oracle Cloud
✅ **Complete data migration** from Supabase
✅ **Backblaze B2** for file storage
✅ **Scalable FastAPI backend**
✅ **Independent** from Next.js dashboard

Ready to start? Begin with Phase 1: Database Setup.

---

*Document Version: 3.0*
*Last Updated: 2025-10-29*
*Author: Claude (Anthropic)*
