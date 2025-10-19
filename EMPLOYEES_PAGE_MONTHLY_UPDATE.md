# Employees Page - Monthly Totals Update

## Summary of Changes

Changed the employees page from showing **7-day averages** to showing **actual monthly totals** with date range filtering.

---

## What Was Changed

### 1. **Removed Columns:**
- ❌ **AVG BREAK (h)** - Removed average daily break time
- ❌ **AVG SESSION (min)** - Removed average session duration in minutes

### 2. **Added Columns:**
- ✅ **Total Break (h)** - Shows total break hours for the selected date range
- ✅ **Total Work (h)** - Shows total work hours for the selected date range

### 3. **Added Date Range Filter:**
- ✅ **From Date** - Start date for filtering (defaults to first day of current month)
- ✅ **To Date** - End date for filtering (defaults to today)
- ✅ **Auto-refresh** - Data updates when dates change

---

## Files Modified

### 1. Frontend: `nextjs-dashboard/app/employees/page.tsx`

#### Interface Changes (Lines 26-41):
```typescript
// BEFORE
interface Employee {
  avgBreakHDay: number;    // Average break hours per day
  avgSessionMin: number;   // Average session in minutes
}

// AFTER
interface Employee {
  totalBreakHours: number; // Total break hours in date range
  totalWorkHours: number;  // Total work hours in date range
}
```

#### State Changes (Lines 71-78):
```typescript
// Added date range filter state (defaults to current month)
const [dateFrom, setDateFrom] = useState(() => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
});
const [dateTo, setDateTo] = useState(() => {
  return new Date().toISOString().split('T')[0];
});
```

#### API Call Changes (Line 120):
```typescript
// BEFORE
`/api/employees?organizationId=${profile.organization_id}`

// AFTER
`/api/employees?organizationId=${profile.organization_id}&dateFrom=${dateFrom}&dateTo=${dateTo}`
```

#### UI Changes:

**Filter Section (Lines 439-509):**
- Added 2 date input fields at the start of filters
- Changed grid from `grid-cols-3` to `grid-cols-5` to accommodate date filters

**Table Headers (Lines 539-540):**
```typescript
// BEFORE
<TableHead>Avg Break</TableHead>
<TableHead>Avg Session</TableHead>

// AFTER
<TableHead>Total Break (h)</TableHead>
<TableHead>Total Work (h)</TableHead>
```

**Table Cells (Lines 650-659):**
```typescript
// BEFORE
{formatHours(employee.avgBreakHDay)}
{formatMinutes(employee.avgSessionMin)}

// AFTER
{formatHours(employee.totalBreakHours)}
{formatHours(employee.totalWorkHours)}
```

**CSV Export (Lines 177-178, 191-192):**
```typescript
// BEFORE
headers: ["Avg Break (h)", "Avg Session (min)"]
data: [emp.avgBreakHDay.toFixed(1), emp.avgSessionMin]

// AFTER
headers: ["Total Break (h)", "Total Work (h)"]
data: [emp.totalBreakHours.toFixed(1), emp.totalWorkHours.toFixed(1)]
```

---

### 2. Backend: `nextjs-dashboard/app/api/employees/route.ts`

#### Query Parameters (Lines 7-22):
```typescript
// Get date range from query params
const dateFrom = searchParams.get('dateFrom')
const dateTo = searchParams.get('dateTo')

// Default to current month if no dates provided
const startDate = dateFrom || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
const endDate = dateTo || new Date().toISOString().split('T')[0]
```

#### Database Queries (Lines 50-84):
```typescript
// BEFORE - Last 7 days
.gte('created_at', sevenDaysAgo.toISOString())

// AFTER - Date range
.gte('created_at', `${startDate}T00:00:00.000Z`)
.lte('created_at', `${endDate}T23:59:59.999Z`)
```

Applied to all queries:
- Screenshots query
- Audio chunks query
- Recording sessions query
- Productivity metrics query
- Break sessions query

#### Calculation Changes (Lines 105-119):
```typescript
// BEFORE - Average break per day (7-day average)
const avgBreakHDay = breakSessions && breakSessions.length > 0 ?
  Number((totalBreakHours / 7).toFixed(1)) : 0

// BEFORE - Average session in minutes
let avgSessionMin = 0
if (sessions && sessions.length > 0) {
  avgSessionMin = Math.round((totalWorkSeconds / sessions.length) / 60)
}

// AFTER - Total break hours in date range
const totalBreakHours = Number((totalBreakSeconds / 3600).toFixed(1))

// AFTER - Total work hours in date range
const totalWorkHours = Number((totalWorkSeconds / 3600).toFixed(1))
```

#### Response Changes (Lines 174-175):
```typescript
// BEFORE
avgBreakHDay,
avgSessionMin,

// AFTER
totalBreakHours,
totalWorkHours,
```

---

## How It Works Now

### Default Behavior:
1. Page loads with date range set to **current month** (1st day of month → today)
2. API fetches all employee data for this month
3. Displays **total hours** worked and **total hours** on break for the month

### User Interaction:
1. Click "Filters" button to expand filter section
2. Change "From Date" and "To Date" as needed
3. Data automatically refreshes when dates change
4. Can select any custom date range (e.g., last week, last quarter, specific month)

### Data Display:
- **Total Break (h)**: Sum of all break time in the selected date range
- **Total Work (h)**: Sum of all work session time in the selected date range
- **Export CSV**: Includes the new column names

---

## Example Calculations

### Before (7-day averages):
```
Employee: John Doe
- 7 days of data
- Total break: 3.5 hours
- Avg Break per day: 3.5 / 7 = 0.5h ← OLD

- 5 sessions totaling 2500 minutes
- Avg Session: 2500 / 5 = 500 minutes ← OLD
```

### After (Monthly totals):
```
Employee: John Doe
- Date range: Dec 1 - Dec 31 (31 days)
- Total break: 15.5 hours ← NEW (sum of all breaks in December)
- Total work: 160.0 hours ← NEW (sum of all work sessions in December)
```

---

## Benefits

1. ✅ **More accurate** - Shows actual totals instead of averaged estimates
2. ✅ **Flexible date range** - Can view any time period (week, month, quarter, year)
3. ✅ **Better for payroll** - Total hours worked is what matters for salary calculation
4. ✅ **Consistent with other pages** - Matches timesheet and attendance pages that use date filters
5. ✅ **Clearer metrics** - "Total Work (h)" is more intuitive than "Avg Session (min)"

---

## Testing

To test the changes:

1. **Navigate to Employees page** (`/employees`)
2. **Check default view** - Should show current month's data
3. **Click "Filters"** - Should see date range inputs
4. **Change date range** - Try selecting:
   - Last week
   - Last month
   - Custom range (e.g., Jan 1 - Jan 15)
5. **Verify data updates** - Total Break and Total Work should change based on date range
6. **Export CSV** - Check that exported file has correct column names
7. **Check employee details drawer** - Quick stats should show "Total Break" and "Total Work"

---

## Database Schema Used

### Tables Queried:
1. **recording_sessions** - Work session data
   - `session_start_time` - When work started
   - `session_end_time` - When work ended
   - `total_duration_seconds` - Duration of session

2. **break_sessions** - Break time data
   - `break_date` - Date of break
   - `break_duration_ms` - Duration in milliseconds

3. **screenshots** - Activity tracking
   - `created_at` - Timestamp of screenshot

4. **audio_chunks** - Recording data
   - `created_at` - Timestamp of recording
   - `duration_seconds` - Duration

---

## Future Enhancements

Possible improvements:
1. Add preset date range buttons (This Week, This Month, Last Month, etc.)
2. Add timezone selection for date filtering
3. Cache monthly data for faster loading
4. Add comparison view (e.g., This Month vs Last Month)
5. Add charts to visualize work vs break time trends

---

## Related Documentation

- [Sessions Explanation](sessions-explained.md) - What is a "session"
- [Timesheet Page](timesheet-page.md) - Similar date filtering implementation
- [Attendance Page](attendance-page.md) - Similar monthly view

---

**Last Updated**: {{current_date}}
**Author**: Claude Code Assistant
