# WorkInvigilator Database Schema Documentation

This document provides comprehensive documentation for the WorkInvigilator Supabase database schema, including all tables, relationships, and their usage in the frontend application.

## Table of Contents
1. [Overview](#overview)
2. [Authentication Schema](#authentication-schema)
3. [Core Tables](#core-tables)
4. [Table Relationships](#table-relationships)
5. [Data Types and Constraints](#data-types-and-constraints)
6. [Row Level Security (RLS)](#row-level-security-rls)
7. [Frontend Integration](#frontend-integration)
8. [Sample Data](#sample-data)
9. [Recommended Improvements](#recommended-improvements)

## Overview

The WorkInvigilator database is built on Supabase (PostgreSQL) and consists of 7 main tables for managing employee monitoring, work sessions, screenshots, audio recordings, and productivity metrics.

**Database Provider:** Supabase (PostgreSQL)
**Schema:** `public`
**Current Tables:** 7
**Sample Data Records:** ~40 total

## Authentication Schema

Supabase provides built-in authentication with the `auth.users` table. Our application extends this with a custom `profiles` table.

### auth.users (Supabase Built-in)
- Manages user authentication
- Contains email, password hashes, metadata
- Referenced by `profiles.id` as foreign key

## Core Tables

### 1. profiles
**Purpose:** Extended user information and employee management
**RLS:** ✅ Enabled
**Records:** 4

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT,
    name TEXT,
    department TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    shift_start_time TIME, -- Employee work shift start time
    shift_end_time TIME,   -- Employee work shift end time
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Columns:**
- `id` (UUID, PK) - Links to auth.users.id
- `email` (TEXT) - Employee email address
- `name` (TEXT) - Employee full name
- `department` (TEXT) - Employee department
- `role` (TEXT) - User role: 'user' or 'admin'
- `shift_start_time` (TIME) - Work shift start time
- `shift_end_time` (TIME) - Work shift end time
- `created_at` (TIMESTAMPTZ) - Profile creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**Frontend Usage:**
- Employee list and management
- User authentication and authorization
- Settings page user information
- Dashboard employee metrics

### 2. recording_sessions
**Purpose:** Track employee work sessions and productivity
**RLS:** ✅ Enabled
**Records:** 6

```sql
CREATE TABLE recording_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    session_start_time TIMESTAMPTZ,
    session_end_time TIMESTAMPTZ,
    total_duration_seconds INTEGER,
    total_chunks INTEGER,
    total_chunk_duration_seconds INTEGER,
    chunk_files JSONB, -- Array of chunk file information
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**Columns:**
- `id` (UUID, PK) - Unique session identifier
- `user_id` (UUID, FK) - References auth.users.id
- `session_start_time` (TIMESTAMPTZ) - When session began
- `session_end_time` (TIMESTAMPTZ) - When session ended (NULL if active)
- `total_duration_seconds` (INTEGER) - Total session duration
- `total_chunks` (INTEGER) - Number of recording chunks
- `total_chunk_duration_seconds` (INTEGER) - Sum of all chunk durations
- `chunk_files` (JSONB) - Metadata about chunk files
- `created_at` (TIMESTAMPTZ) - Record creation timestamp

**Frontend Usage:**
- Sessions page session listing
- Dashboard active sessions widget
- Employee session history
- Session duration calculations

### 3. screenshots
**Purpose:** Store employee screenshot data and metadata
**RLS:** ✅ Enabled
**Records:** 20

```sql
CREATE TABLE screenshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    session_id UUID REFERENCES recording_sessions(id),
    filename TEXT,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**Columns:**
- `id` (UUID, PK) - Unique screenshot identifier
- `user_id` (UUID, FK) - References auth.users.id
- `session_id` (UUID, FK) - References recording_sessions.id
- `filename` (TEXT) - Screenshot file name
- `file_url` (TEXT) - URL to screenshot file in storage
- `created_at` (TIMESTAMPTZ) - Screenshot capture timestamp

**Frontend Usage:**
- Screenshots page gallery
- Dashboard recent screenshots widget
- Employee-specific screenshot viewing
- Session screenshot counts

### 4. productivity_metrics
**Purpose:** Store calculated productivity metrics for sessions
**RLS:** ❌ Disabled
**Records:** 5

```sql
CREATE TABLE productivity_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    session_id UUID REFERENCES recording_sessions(id),
    date DATE,
    focus_time_seconds INTEGER DEFAULT 0,
    total_time_seconds INTEGER DEFAULT 0,
    productivity_percentage DOUBLE PRECISION DEFAULT 0,
    screenshots_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**Columns:**
- `id` (UUID, PK) - Unique metric identifier
- `user_id` (UUID, FK) - References auth.users.id
- `session_id` (UUID, FK) - References recording_sessions.id
- `date` (DATE) - Date of the metrics
- `focus_time_seconds` (INTEGER) - Calculated focus time
- `total_time_seconds` (INTEGER) - Total working time
- `productivity_percentage` (DOUBLE PRECISION) - Calculated productivity %
- `screenshots_count` (INTEGER) - Number of screenshots taken
- `created_at` (TIMESTAMPTZ) - Record creation timestamp

**Frontend Usage:**
- Employee productivity calculations
- Reports page metrics
- Dashboard KPI tiles
- Productivity trend analysis

### 5. recording_chunks
**Purpose:** Store individual audio recording chunk metadata
**RLS:** ✅ Enabled
**Records:** 5

```sql
CREATE TABLE recording_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    session_start_time TIMESTAMPTZ,
    chunk_number INTEGER,
    filename TEXT,
    file_url TEXT,
    duration_seconds INTEGER,
    chunk_start_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**Columns:**
- `id` (UUID, PK) - Unique chunk identifier
- `user_id` (UUID, FK) - References auth.users.id
- `session_start_time` (TIMESTAMPTZ) - When the session started
- `chunk_number` (INTEGER) - Sequence number of chunk
- `filename` (TEXT) - Chunk file name
- `file_url` (TEXT) - URL to chunk file in storage
- `duration_seconds` (INTEGER) - Duration of this chunk
- `chunk_start_time` (TIMESTAMPTZ) - When this chunk started
- `created_at` (TIMESTAMPTZ) - Record creation timestamp

**Frontend Usage:**
- Audio page chunk-based playback
- Session audio duration calculations

### 6. recordings
**Purpose:** Store complete audio recording metadata (legacy/alternative structure)
**RLS:** ✅ Enabled
**Records:** 0

```sql
CREATE TABLE recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    filename TEXT,
    duration INTEGER,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**Columns:**
- `id` (UUID, PK) - Unique recording identifier
- `user_id` (UUID, FK) - References auth.users.id
- `filename` (TEXT) - Recording file name
- `duration` (INTEGER) - Recording duration in milliseconds
- `file_url` (TEXT) - URL to recording file in storage
- `created_at` (TIMESTAMPTZ) - Record creation timestamp

**Frontend Usage:**
- Alternative audio recording structure
- Currently empty but referenced in audio page

### 7. break_sessions
**Purpose:** Track employee break periods
**RLS:** ✅ Enabled
**Records:** 0

```sql
CREATE TABLE break_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    break_date DATE,
    break_start_time TIMESTAMPTZ,
    break_end_time TIMESTAMPTZ,
    break_duration_ms INTEGER,
    session_type TEXT DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**Columns:**
- `id` (UUID, PK) - Unique break session identifier
- `user_id` (UUID, FK) - References auth.users.id
- `break_date` (DATE) - Date of the break
- `break_start_time` (TIMESTAMPTZ) - Break start time
- `break_end_time` (TIMESTAMPTZ) - Break end time
- `break_duration_ms` (INTEGER) - Break duration in milliseconds
- `session_type` (TEXT) - Type of break session
- `created_at` (TIMESTAMPTZ) - Record creation timestamp

**Frontend Usage:**
- Break tracking functionality (not currently implemented in UI)
- Productivity calculations excluding break time

## Table Relationships

```
auth.users (Supabase)
    ↓ (1:1)
profiles
    ↓ (1:N)
recording_sessions
    ↓ (1:N)
├── screenshots
├── productivity_metrics
└── recording_chunks

auth.users
    ↓ (1:N)
├── recordings
└── break_sessions
```

**Key Relationships:**
1. `profiles.id` → `auth.users.id` (1:1) - Extended user information
2. `recording_sessions.user_id` → `auth.users.id` (N:1) - User's work sessions
3. `screenshots.user_id` → `auth.users.id` (N:1) - User's screenshots
4. `screenshots.session_id` → `recording_sessions.id` (N:1) - Session screenshots
5. `productivity_metrics.user_id` → `auth.users.id` (N:1) - User's metrics
6. `productivity_metrics.session_id` → `recording_sessions.id` (N:1) - Session metrics

## Data Types and Constraints

### Primary Keys
- All tables use `UUID` primary keys
- Generated using `gen_random_uuid()` or linked to auth.users

### Foreign Keys
- All user references point to `auth.users.id`
- Session-related tables reference `recording_sessions.id`

### Constraints
- `profiles.role` - CHECK constraint: must be 'user' or 'admin'
- All timestamps use `TIMESTAMPTZ` for timezone awareness
- Default values provided for creation timestamps

### Indexes
- Primary key indexes on all `id` columns
- Foreign key indexes on relationship columns
- Recommended: Add indexes on `created_at` for time-based queries

## Row Level Security (RLS)

**Enabled Tables:**
- ✅ `profiles`
- ✅ `recording_sessions`
- ✅ `screenshots`
- ✅ `recording_chunks`
- ✅ `recordings`
- ✅ `break_sessions`

**Disabled Tables:**
- ❌ `productivity_metrics`

**Note:** RLS policies need to be configured to restrict data access based on user authentication and roles.

## Frontend Integration

### API Endpoint Mappings

| Frontend Page | Primary Tables | API Endpoint |
|---------------|----------------|--------------|
| Dashboard | `profiles`, `recording_sessions`, `screenshots` | `/api/employees`, `/api/screenshots` |
| Employees | `profiles`, `productivity_metrics` | `/api/employees` |
| Sessions | `recording_sessions`, `profiles`, `productivity_metrics` | `/api/sessions` |
| Screenshots | `screenshots`, `profiles` | `/api/screenshots` |
| Reports | `recording_sessions`, `productivity_metrics`, `screenshots` | `/api/reports` |
| Settings | `profiles` | `/api/settings` |
| Audio | `recordings`, `recording_chunks`, `profiles` | Direct Supabase queries |

### Data Flow

1. **Employee Creation:**
   ```
   POST /api/employees → auth.users → profiles
   ```

2. **Session Tracking:**
   ```
   Work Session → recording_sessions → screenshots → productivity_metrics
   ```

3. **Report Generation:**
   ```
   Query: recording_sessions + productivity_metrics + screenshots → Calculated metrics
   ```

## Sample Data

### Current Data Distribution:
- **profiles:** 4 employee records
- **recording_sessions:** 6 active/completed sessions
- **screenshots:** 20 screenshot records
- **productivity_metrics:** 5 calculated metric records
- **recording_chunks:** 5 audio chunk records
- **recordings:** 0 (alternative audio structure)
- **break_sessions:** 0 (break tracking not implemented)

### Example Profile Record:
```json
{
  "id": "uuid",
  "email": "employee@company.com",
  "name": "John Doe",
  "department": "Development",
  "role": "user",
  "shift_start_time": "09:00:00",
  "shift_end_time": "17:00:00",
  "created_at": "2024-01-15T08:00:00Z",
  "updated_at": "2024-01-15T08:00:00Z"
}
```

### Example Session Record:
```json
{
  "id": "session-uuid",
  "user_id": "user-uuid",
  "session_start_time": "2024-01-15T09:00:00Z",
  "session_end_time": "2024-01-15T17:00:00Z",
  "total_duration_seconds": 28800,
  "total_chunks": 96,
  "total_chunk_duration_seconds": 28800,
  "created_at": "2024-01-15T09:00:00Z"
}
```

## Recommended Improvements

### 1. Schema Enhancements
```sql
-- Add application tracking
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    is_productive BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Track time spent in applications
CREATE TABLE application_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    session_id UUID REFERENCES recording_sessions(id),
    application_id UUID REFERENCES applications(id),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. Performance Optimizations
```sql
-- Add performance indexes
CREATE INDEX idx_recording_sessions_user_date ON recording_sessions(user_id, session_start_time);
CREATE INDEX idx_screenshots_user_date ON screenshots(user_id, created_at);
CREATE INDEX idx_productivity_metrics_user_date ON productivity_metrics(user_id, date);
```

### 3. Data Integrity
```sql
-- Add constraints for data validation
ALTER TABLE recording_sessions
ADD CONSTRAINT check_session_duration
CHECK (session_end_time IS NULL OR session_end_time > session_start_time);

ALTER TABLE productivity_metrics
ADD CONSTRAINT check_productivity_range
CHECK (productivity_percentage >= 0 AND productivity_percentage <= 100);
```

### 4. Missing Features
- **Notification System:** Track alerts and notifications
- **Team Management:** Hierarchical team structures
- **File Storage Metadata:** Better file management
- **Audit Logs:** Track administrative actions
- **Settings Table:** Centralized application settings

### 5. RLS Policies Implementation
```sql
-- Example RLS policies needed
CREATE POLICY "Users can view their own data" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all data" ON profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```

The current database schema provides a solid foundation for the WorkInvigilator application with room for enhancements in application tracking, performance optimization, and security policies.