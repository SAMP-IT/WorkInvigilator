# Employee Attendance Tracking Feature

## Overview

The Attendance Tracking feature provides **automated clock-in/out** similar to DeskTime, eliminating the need for manual timesheets. The system automatically detects when employees start and stop working, tracks break times, and identifies idle periods.

## Key Features

### 1. Automated Clock-In/Out
- **Auto Clock-In**: Automatically triggered when employee starts monitoring (clicks "Work Invigilator ON")
- **Auto Clock-Out**: Automatically triggered when employee stops monitoring (clicks to end session)
- **No Manual Entry**: No need for employees to remember to clock in/out
- **Session-Based**: Tied to work sessions for accuracy

### 2. Intelligent Idle Detection
- **Automatic Detection**: Detects when employee is away from computer
- **5-Minute Threshold**: Idle period triggered after 5 minutes of inactivity
- **Activity Tracking**: Uses active window monitoring to detect activity
- **Auto-Resume**: Automatically ends idle period when activity resumes

### 3. Break Time Tracking
- **Idle Periods as Breaks**: Idle time automatically marked as breaks
- **Lunch Break Detection**: Automatically identifies lunch breaks (12 PM - 2 PM)
- **Short Breaks**: Other idle periods marked as short breaks
- **Total Break Time**: Aggregates all break time for the day

### 4. Late Arrival Detection
- **Configurable Work Hours**: Set organization start time (default 9:00 AM)
- **Late Threshold**: Configurable grace period (default 15 minutes)
- **Automatic Status**: Automatically marks as "late" if beyond threshold
- **Late-By Minutes**: Tracks exact minutes late for reporting

### 5. Work Time Calculation
- **Net Work Time**: `Total Time - Break Time - Idle Time`
- **Hourly Tracking**: Precise calculation to the second
- **Daily Summary**: Complete breakdown of work, break, and idle time

## Technical Implementation

### Database Schema

#### attendance_records Table
```sql
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID NOT NULL,
  date DATE NOT NULL,
  clock_in_time TIMESTAMPTZ NOT NULL,
  clock_out_time TIMESTAMPTZ,
  total_work_seconds INTEGER DEFAULT 0,
  total_break_seconds INTEGER DEFAULT 0,
  total_idle_seconds INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'present',
  is_late BOOLEAN DEFAULT FALSE,
  late_by_minutes INTEGER DEFAULT 0,
  first_activity_time TIMESTAMPTZ,
  last_activity_time TIMESTAMPTZ,
  auto_clocked_in BOOLEAN DEFAULT TRUE,
  auto_clocked_out BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id, date)
);
```

**Fields Explanation:**
- `date`: The calendar date of attendance (YYYY-MM-DD)
- `clock_in_time`: Exact timestamp when employee started work
- `clock_out_time`: Exact timestamp when employee ended work
- `total_work_seconds`: Net work time (excluding breaks and idle)
- `total_break_seconds`: Time spent on manual breaks
- `total_idle_seconds`: Time spent idle (auto-detected breaks)
- `status`: present, late, absent, half_day, on_leave
- `is_late`: Boolean flag if employee arrived late
- `late_by_minutes`: How many minutes late (if applicable)
- `auto_clocked_in/out`: Whether clock in/out was automatic

#### idle_periods Table
```sql
CREATE TABLE idle_periods (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID NOT NULL,
  attendance_record_id UUID REFERENCES attendance_records(id),
  session_id UUID REFERENCES recording_sessions(id),
  idle_start_time TIMESTAMPTZ NOT NULL,
  idle_end_time TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  idle_type TEXT NOT NULL DEFAULT 'short_break',
  detected_by TEXT NOT NULL DEFAULT 'auto',
  activity_resumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Idle Types:**
- `short_break`: Brief idle periods (< 15 minutes)
- `lunch_break`: Idle periods during lunch hours (12-2 PM)
- `away`: Extended idle periods (> 15 minutes)
- `system_idle`: System-level idle detection

#### work_hours_settings Table
```sql
CREATE TABLE work_hours_settings (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL UNIQUE,
  work_start_time TIME DEFAULT '09:00:00',
  work_end_time TIME DEFAULT '17:00:00',
  late_threshold_minutes INTEGER DEFAULT 15,
  half_day_threshold_hours DECIMAL(4,2) DEFAULT 4.0,
  full_day_threshold_hours DECIMAL(4,2) DEFAULT 8.0,
  idle_detection_threshold_minutes INTEGER DEFAULT 5,
  auto_break_threshold_minutes INTEGER DEFAULT 15,
  lunch_break_start_time TIME DEFAULT '12:00:00',
  lunch_break_end_time TIME DEFAULT '13:00:00',
  track_weekends BOOLEAN DEFAULT FALSE,
  require_manual_checkout BOOLEAN DEFAULT FALSE,
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Configurable Settings:**
- `work_start_time`: Expected start time (e.g., 9:00 AM)
- `work_end_time`: Expected end time (e.g., 5:00 PM)
- `late_threshold_minutes`: Grace period before marking late (15 min)
- `idle_detection_threshold_minutes`: How long before considering idle (5 min)
- `auto_break_threshold_minutes`: When to auto-mark as break (15 min)

### Desktop App Implementation

#### Attendance Tracking Properties
```javascript
// In WorkInvigilatorApp constructor
this.currentAttendanceId = null;
this.lastActivityTime = null;
this.idleCheckInterval = null;
this.IDLE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
this.currentIdlePeriodId = null;
this.idleStartTime = null;
```

#### Auto Clock-In Method
```javascript
async autoClockIn() {
  const now = new Date();
  const date = now.toISOString().split('T')[0];

  // Call API to clock in
  const response = await fetch('/api/attendance/clock-in', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      clockInTime: now.toISOString(),
      date: date
    })
  });

  if (response.ok) {
    const data = await response.json();
    this.currentAttendanceId = data.attendanceId;
    this.lastActivityTime = Date.now();
  }
}
```

**Triggered**: When `startMonitoring()` is called

**Process**:
1. Get current date and time
2. Call `/api/attendance/clock-in` endpoint
3. Store `attendanceId` for later updates
4. Initialize `lastActivityTime` for idle detection

#### Auto Clock-Out Method
```javascript
async autoClockOut() {
  if (!this.currentAttendanceId) return;

  // End any active idle period first
  if (this.currentIdlePeriodId) {
    await this.endIdlePeriod();
  }

  const now = new Date();

  // Call API to clock out
  const response = await fetch('/api/attendance/clock-out', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      attendanceId: this.currentAttendanceId,
      clockOutTime: now.toISOString()
    })
  });

  if (response.ok) {
    this.currentAttendanceId = null;
  }
}
```

**Triggered**: When `stopMonitoring()` is called

**Process**:
1. End any active idle period
2. Call `/api/attendance/clock-out` endpoint
3. Calculate total work time on backend
4. Clear `attendanceId`

#### Idle Detection System
```javascript
startIdleDetection() {
  this.lastActivityTime = Date.now();

  // Check for idle every 30 seconds
  this.idleCheckInterval = setInterval(() => {
    this.checkIdleStatus();
  }, 30000);
}

async checkIdleStatus() {
  const now = Date.now();
  const timeSinceActivity = now - (this.lastActivityTime || now);

  // If idle for more than 5 minutes
  if (timeSinceActivity > this.IDLE_THRESHOLD && !this.currentIdlePeriodId) {
    await this.startIdlePeriod();
  }
  // If was idle but now active
  else if (timeSinceActivity < this.IDLE_THRESHOLD && this.currentIdlePeriodId) {
    await this.endIdlePeriod();
  }
}
```

**How It Works**:
1. **Activity Tracking**: `lastActivityTime` updated whenever active window changes
2. **Periodic Check**: Every 30 seconds, check time since last activity
3. **Idle Trigger**: If > 5 minutes inactive, start idle period
4. **Resume Detection**: If activity detected while idle, end idle period

#### Activity Integration
```javascript
async logActivity(windowData) {
  const result = await window.electronAPI.getActiveWindow();

  if (result.success && result.data) {
    const activity = { /* ... */ };

    this.activityBuffer.push(activity);

    // Update last activity time for idle detection
    this.lastActivityTime = Date.now();

    // If was idle, end idle period
    if (this.currentIdlePeriodId) {
      await this.endIdlePeriod();
    }
  }
}
```

**Integration**: Activity tracking (every 10 seconds) automatically updates `lastActivityTime`, ensuring accurate idle detection.

### API Endpoints

#### POST /api/attendance/clock-in
**Request Body**:
```json
{
  "clockInTime": "2025-01-15T09:05:00.000Z",
  "date": "2025-01-15"
}
```

**Response**:
```json
{
  "success": true,
  "attendanceId": "uuid",
  "isLate": true,
  "lateByMinutes": 5,
  "status": "late"
}
```

**Logic**:
1. Get organization work hours settings
2. Calculate if late based on `work_start_time` and `late_threshold_minutes`
3. Create or update attendance record for the date
4. Return attendance ID for tracking

#### POST /api/attendance/clock-out
**Request Body**:
```json
{
  "attendanceId": "uuid",
  "clockOutTime": "2025-01-15T17:30:00.000Z"
}
```

**Response**:
```json
{
  "success": true,
  "totalWorkSeconds": 28800,
  "totalBreakSeconds": 1800,
  "totalIdleSeconds": 600
}
```

**Logic**:
1. Calculate total time: `clockOutTime - clockInTime`
2. Subtract break time and idle time
3. Update attendance record with `total_work_seconds`
4. Mark as `auto_clocked_out`

#### POST /api/attendance/start-idle
**Request Body**:
```json
{
  "attendanceId": "uuid",
  "idleStartTime": "2025-01-15T14:15:00.000Z"
}
```

**Response**:
```json
{
  "success": true,
  "idlePeriodId": "uuid"
}
```

**Logic**:
1. Determine idle type based on time of day
2. 12 PM - 2 PM → `lunch_break`
3. Otherwise → `short_break`
4. Create `idle_periods` record
5. Return idle period ID for ending later

#### POST /api/attendance/end-idle
**Request Body**:
```json
{
  "idlePeriodId": "uuid",
  "idleEndTime": "2025-01-15T14:25:00.000Z"
}
```

**Response**:
```json
{
  "success": true,
  "durationSeconds": 600
}
```

**Logic**:
1. Calculate duration: `idleEndTime - idleStartTime`
2. Update `idle_periods` record with end time and duration
3. Update `attendance_records.total_idle_seconds`
4. Update `last_activity_time`

#### GET /api/attendance
**Query Parameters**:
- `organizationId`: Required
- `employeeId`: Filter by specific employee
- `startDate`: Start of date range (YYYY-MM-DD)
- `endDate`: End of date range (YYYY-MM-DD)
- `status`: Filter by status (present, late, absent, etc.)

**Response**:
```json
{
  "records": [
    {
      "id": "uuid",
      "userId": "uuid",
      "employeeName": "John Doe",
      "employeeEmail": "john@example.com",
      "date": "2025-01-15",
      "clockIn": "09:05 AM",
      "clockOut": "05:30 PM",
      "workHours": 8.0,
      "breakHours": 0.5,
      "idleHours": 0.17,
      "totalHours": 8.67,
      "status": "late",
      "isLate": true,
      "lateByMinutes": 5,
      "autoClocked": true,
      "notes": null
    }
  ],
  "totalCount": 1
}
```

## Data Flow

### Clock-In Flow
```
Employee clicks "Work Invigilator ON"
  ↓
startMonitoring() called
  ↓
autoClockIn() triggered
  ↓
POST /api/attendance/clock-in
  ↓
Check work hours settings
  ↓
Calculate if late
  ↓
Create/update attendance_records
  ↓
Return attendanceId
  ↓
Store attendanceId in desktop app
  ↓
Start idle detection
```

### Idle Detection Flow
```
Activity tracking running (every 10s)
  ↓
Each activity → update lastActivityTime
  ↓
Idle check (every 30s)
  ↓
If > 5 min since last activity:
  ↓
POST /api/attendance/start-idle
  ↓
Create idle_periods record
  ↓
Return idlePeriodId
  ↓
If activity detected while idle:
  ↓
POST /api/attendance/end-idle
  ↓
Update idle_periods with end time
  ↓
Update attendance_records.total_idle_seconds
```

### Clock-Out Flow
```
Employee clicks to end session
  ↓
stopMonitoring() called
  ↓
End any active idle period
  ↓
autoClockOut() triggered
  ↓
POST /api/attendance/clock-out
  ↓
Calculate total work time
  ↓
Update attendance_records
  ↓
Clear attendanceId
  ↓
Stop idle detection
```

## Attendance Status Types

| Status | Description | Criteria |
|--------|-------------|----------|
| `present` | On time | Clocked in within late threshold |
| `late` | Late arrival | Clocked in beyond late threshold |
| `absent` | Did not work | No attendance record for the day |
| `half_day` | Partial day | < 4 hours worked |
| `on_leave` | Approved leave | Marked manually by manager |

## Configuration

### Organization Settings

Managers can configure attendance policies per organization:

```javascript
// Default settings
{
  work_start_time: '09:00:00',
  work_end_time: '17:00:00',
  late_threshold_minutes: 15,       // Grace period
  half_day_threshold_hours: 4.0,    // < 4 hours = half day
  full_day_threshold_hours: 8.0,    // >= 8 hours = full day
  idle_detection_threshold_minutes: 5,  // Detect idle after 5 min
  auto_break_threshold_minutes: 15,     // Auto-mark as break after 15 min
  track_weekends: false,                // Don't require weekend work
  timezone: 'America/New_York'
}
```

## Use Cases

### 1. Automated Timesheets
- **Problem**: Manual timesheets are error-prone and time-consuming
- **Solution**: Auto clock-in/out eliminates manual entry
- **Benefit**: Accurate time records without employee effort

### 2. Late Arrival Tracking
- **Problem**: Need to monitor punctuality
- **Solution**: Auto-detect late arrivals with configurable threshold
- **Benefit**: Objective lateness data for performance reviews

### 3. Break Time Monitoring
- **Problem**: Need to know how much time employees spend on breaks
- **Solution**: Auto-detect idle periods and classify as breaks
- **Benefit**: Separate productive time from break time

### 4. Payroll Integration
- **Problem**: Need accurate hours for salary calculation
- **Solution**: Net work time calculated automatically
- **Benefit**: Ready-to-use data for payroll processing

### 5. Compliance & Reporting
- **Problem**: Labor law compliance requires accurate time tracking
- **Solution**: Complete audit trail with clock-in/out timestamps
- **Benefit**: Compliance-ready attendance records

## Privacy & Compliance

### What is Tracked:
- Clock-in/out times (when work starts/ends)
- Idle periods (when computer is inactive)
- Break times (based on idle detection)
- Total work hours per day

### What is NOT Tracked:
- Personal activities during breaks
- Reason for breaks
- Location (unless geolocation enabled separately)
- Personal computer usage outside work hours

### Employee Transparency:
- Employees can see their own attendance records
- Clear indication when tracking is active (green indicator)
- Explicit start/stop actions (not hidden background tracking)

## Advantages Over Manual Timesheets

| Feature | Manual Timesheet | Auto Attendance |
|---------|-----------------|-----------------|
| **Accuracy** | Prone to errors | 100% accurate |
| **Employee Effort** | Must remember to clock in/out | Automatic |
| **Late Detection** | Manual review needed | Automatic with threshold |
| **Break Tracking** | Often not tracked | Auto-detected |
| **Idle Time** | Not tracked | Automatically detected |
| **Reporting** | Manual compilation | Instant reports |
| **Fraud Prevention** | Easy to manipulate | Tied to actual work sessions |

## Integration with Existing Features

### 1. Session Tracking
- Attendance tied to `recording_sessions`
- One attendance record per day, multiple sessions possible
- Sessions reference `attendance_record_id`

### 2. Activity Tracking
- Activity logs update `lastActivityTime`
- Idle detection based on activity tracking
- Seamless integration with productivity monitoring

### 3. Monthly Hours
- Attendance data feeds into monthly hours calculations
- Provides daily breakdown for monthly summaries
- Enables accurate salary calculations

### 4. Productivity Reports
- Late arrivals may correlate with productivity
- Break patterns visible in productivity analysis
- Idle time excludes from productivity calculations

## Future Enhancements

### Planned Features:
1. **Geolocation Tracking**: Verify employee is at work location (optional)
2. **Mobile App Support**: Clock in/out from mobile devices
3. **Shift Management**: Support for multiple shifts
4. **Overtime Alerts**: Notify when approaching overtime threshold
5. **Leave Management**: Request and approve time off within system
6. **Calendar Integration**: Sync attendance with Google Calendar/Outlook
7. **Biometric Clock-In**: Face recognition or fingerprint for physical locations
8. **Team Schedule View**: See who's working at any given time

## Troubleshooting

### Issue: Attendance not being created
**Solution**: Ensure monitoring is started (green indicator active)

### Issue: Idle period not ending
**Solution**: Activity tracking must be running (desktop app monitors every 10s)

### Issue: Incorrect late status
**Solution**: Check organization work hours settings

### Issue: Missing clock-out time
**Solution**: Ensure session is properly ended, not force-closed

## Performance

### Database Impact:
- One record per employee per day in `attendance_records`
- Multiple records in `idle_periods` per day (one per idle period)
- Approximately 20-30 idle periods per 8-hour day
- Monthly: ~22 attendance records + ~500 idle periods per employee

### Network Impact:
- Clock-in: 1 API call when starting work
- Clock-out: 1 API call when ending work
- Idle start: 1 API call per idle period (every ~30 min on average)
- Idle end: 1 API call when resuming activity
- Total: ~20-30 API calls per day per employee for attendance

## Conclusion

The Attendance Tracking feature transforms Work Invigilator into a complete time and attendance system, eliminating manual timesheets and providing accurate, automated records. With intelligent idle detection and late arrival tracking, managers get comprehensive insights into employee attendance patterns while employees enjoy hassle-free time tracking.

**Key Benefits**:
- ✅ Zero manual effort for employees
- ✅ 100% accurate time records
- ✅ Automatic late detection
- ✅ Intelligent break tracking
- ✅ Compliance-ready audit trail
- ✅ Seamless integration with existing features
