# WorkInvigilator API Endpoints Documentation

This document provides comprehensive documentation for all API endpoints required by the WorkInvigilator Next.js frontend application.

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Employee Management](#employee-management)
4. [Session Management](#session-management)
5. [Screenshot Management](#screenshot-management)
6. [Report Generation](#report-generation)
7. [Settings Management](#settings-management)
8. [Audio Recording Management](#audio-recording-management)
9. [Data Models](#data-models)
10. [Error Handling](#error-handling)

## Overview

The WorkInvigilator API provides endpoints for managing employee monitoring, tracking work sessions, screenshots, audio recordings, and generating productivity reports. All endpoints return JSON responses and follow RESTful conventions.

**Base URL:** `/api`
**Content-Type:** `application/json`

## Authentication

Currently, the API uses Supabase authentication. All requests should include proper authentication headers when implemented.

## Employee Management

### GET /api/employees
Retrieves all employees with their productivity metrics.

**Status:** ✅ Implemented
**Method:** `GET`
**Description:** Fetches all employee profiles with calculated productivity metrics.

**Response:**
```json
{
  "employees": [
    {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "department": "string",
      "role": "USER|ADMIN",
      "productivity7d": 85.5,
      "avgFocusHDay": 6.2,
      "avgSessionMin": 142,
      "lastActive": "string",
      "status": "online|offline",
      "createdAt": "datetime",
      "shiftStartTime": "time",
      "shiftEndTime": "time"
    }
  ],
  "totalCount": 0
}
```

**Frontend Usage:**
- Dashboard overview (employee counts, productivity averages)
- Employee list page
- Employee selection dropdowns

### POST /api/employees
Creates a new employee account.

**Status:** ✅ Implemented
**Method:** `POST`
**Description:** Creates a new employee with authentication account and profile.

**Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "department": "string",
  "role": "user|admin",
  "shiftStartTime": "HH:MM",
  "shiftEndTime": "HH:MM"
}
```

**Response:**
```json
{
  "employee": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "department": "string",
    "role": "string",
    "shiftStartTime": "time",
    "shiftEndTime": "time"
  },
  "message": "Employee created successfully"
}
```

**Frontend Usage:**
- Add Employee form in employee management

## Session Management

### GET /api/sessions
Retrieves all work sessions with productivity metrics.

**Status:** ✅ Implemented
**Method:** `GET`
**Description:** Fetches all recording sessions with calculated metrics and user information.

**Response:**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "employeeId": "uuid",
      "employeeName": "string",
      "employeeAvatar": "string",
      "startTime": "formatted_datetime",
      "endTime": "formatted_datetime|Active",
      "duration": "2h 45m",
      "focusTime": "2h 20m",
      "focusPercent": 85.5,
      "status": "active|completed",
      "apps": ["Work Applications"],
      "screenshots": 12
    }
  ],
  "totalCount": 0,
  "activeCount": 0
}
```

**Frontend Usage:**
- Sessions page table
- Dashboard active sessions widget
- Employee session history

## Screenshot Management

### GET /api/screenshots
Retrieves screenshots with optional employee filtering.

**Status:** ✅ Implemented
**Method:** `GET`
**Query Parameters:**
- `employeeId` (optional): Filter by specific employee
- `limit` (optional): Number of screenshots to return (default: 20)

**Response:**
```json
{
  "screenshots": [
    {
      "id": "uuid",
      "employeeId": "uuid",
      "employeeName": "string",
      "timestamp": "formatted_datetime",
      "url": "string|null",
      "size": "1.2MB",
      "application": "Work Application",
      "filename": "string"
    }
  ],
  "totalCount": 0,
  "todayCount": 0
}
```

**Frontend Usage:**
- Screenshots page gallery
- Dashboard recent screenshots widget
- Employee-specific screenshot viewing

### DELETE /api/screenshots
Deletes a specific screenshot.

**Status:** ✅ Implemented
**Method:** `DELETE`
**Query Parameters:**
- `id`: Screenshot ID to delete

**Response:**
```json
{
  "message": "Screenshot deleted successfully"
}
```

**Frontend Usage:**
- Screenshot deletion from modal/gallery

## Report Generation

### GET /api/reports
Generates productivity reports for specific employees and time periods.

**Status:** ✅ Implemented
**Method:** `GET`
**Query Parameters:**
- `employeeId` (required): Employee to generate report for
- `period` (required): `daily|weekly|monthly`

**Response:**
```json
{
  "employeeName": "string",
  "employeeEmail": "string",
  "department": "string",
  "period": "formatted_period_label",
  "workHours": "8h 30m",
  "focusTime": "7h 15m",
  "productivity": 85.3,
  "sessionsCount": 3,
  "screenshotsCount": 48,
  "applications": [
    {
      "name": "Work Applications",
      "time": "8h 30m",
      "percentage": 100
    }
  ],
  "breakdowns": [
    {
      "time": "09:00-12:30",
      "activity": "Work Session",
      "focus": 88
    }
  ],
  "dailyBreakdown": [
    {
      "day": "Monday",
      "hours": "8h 30m",
      "focus": "7h 15m",
      "productivity": 85.3
    }
  ]
}
```

**Frontend Usage:**
- Reports page with daily/weekly/monthly views
- Export functionality data source

## Settings Management

### GET /api/settings
Retrieves user and organization settings.

**Status:** ✅ Implemented
**Method:** `GET`
**Query Parameters:**
- `userId` (required): User ID to get settings for

**Response:**
```json
{
  "currentUser": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "role": "USER|ADMIN",
    "organization": "string",
    "department": "string",
    "joinDate": "formatted_date",
    "lastLogin": "formatted_datetime",
    "totalEmployees": 0,
    "activeEmployees": 0,
    "avatar": "string"
  },
  "organizationSettings": {
    "name": "string",
    "industry": "string",
    "timezone": "string",
    "workingHours": "string",
    "workingDays": "string",
    "screenshotInterval": "string",
    "dataRetention": "string",
    "autoDelete": true
  }
}
```

### PUT /api/settings
Updates user profile settings.

**Status:** ✅ Implemented
**Method:** `PUT`
**Request Body:**
```json
{
  "userId": "uuid",
  "name": "string",
  "email": "string",
  "department": "string"
}
```

**Response:**
```json
{
  "profile": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "department": "string",
    "updated_at": "datetime"
  },
  "message": "Settings updated successfully"
}
```

**Frontend Usage:**
- Settings page account management
- Profile editing functionality

## Audio Recording Management

### Audio Recordings (Database Direct)
The audio page currently queries the database directly through Supabase client.

**Status:** 🔄 Needs API Implementation
**Recommended:** `/api/audio`

**Suggested Implementation:**
```typescript
// GET /api/audio?employeeId=uuid
{
  "recordings": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "filename": "string",
      "duration": 30000,
      "created_at": "datetime",
      "file_url": "string|null",
      "file_size": 1024
    }
  ],
  "totalCount": 0
}
```

**Frontend Usage:**
- Audio page recording list
- Employee-specific audio history

## Data Models

### Employee/Profile
```typescript
interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: 'USER' | 'ADMIN';
  productivity7d: number;
  avgFocusHDay: number;
  avgSessionMin: number;
  lastActive: string;
  status: 'online' | 'offline';
  createdAt: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
}
```

### Session
```typescript
interface Session {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  startTime: string;
  endTime: string;
  duration: string;
  focusTime: string;
  focusPercent: number;
  status: 'active' | 'completed' | 'paused';
  apps: string[];
  screenshots: number;
}
```

### Screenshot
```typescript
interface Screenshot {
  id: string;
  employeeId: string;
  employeeName: string;
  timestamp: string;
  url: string;
  size: string;
  application: string;
  filename?: string;
}
```

## Error Handling

All endpoints return standardized error responses:

```json
{
  "error": "Error message description",
  "details": "Additional error details (optional)"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (missing required parameters)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

## Mock Data vs Real Data Status

### Currently Using Real Database Data:
- ✅ Employee management (`/api/employees`)
- ✅ Session management (`/api/sessions`)
- ✅ Screenshot management (`/api/screenshots`)
- ✅ Report generation (`/api/reports`)
- ✅ Settings management (`/api/settings`)
- ✅ Audio recordings (direct database query)

### Mock Data Still Present:
- 🔄 Some hardcoded productivity calculation fallbacks
- 🔄 Application usage tracking (shows "Work Applications")
- 🔄 Some UI placeholder values in modals
- 🔄 Static organization settings

### Required API Enhancements:

1. **Enhanced Productivity Calculations**
   - Real-time activity tracking
   - Application-specific time tracking
   - Break session integration

2. **Missing Endpoints:**
   - `GET /api/audio` - Centralized audio management
   - `POST /api/sessions` - Manual session creation
   - `PUT /api/sessions/:id` - Session updates
   - `GET /api/dashboard/metrics` - Dashboard-specific aggregations

3. **Real-time Features:**
   - WebSocket connections for live session monitoring
   - Real-time productivity updates
   - Live screenshot feeds

4. **Advanced Filtering:**
   - Date range filtering for all endpoints
   - Advanced search and filtering options
   - Pagination for large datasets

The current implementation successfully integrates with the Supabase database and provides functional APIs for most core features. The remaining work involves enhancing calculations, adding missing endpoints, and implementing real-time features.