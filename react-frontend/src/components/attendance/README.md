# Attendance Components

Light mode React components for displaying attendance data in the Work Invigilator application.

## Components

### AttendanceTable
Displays attendance records in a tabular format with employee details, clock in/out times, work hours, and status.

```tsx
import { AttendanceTable } from '../../components/attendance';

<AttendanceTable
  records={attendanceRecords}
  loading={isLoading}
  onRefresh={handleRefresh}
/>
```

**Props:**
- `records`: Array of attendance records
- `loading`: Boolean loading state
- `onRefresh`: Callback function for refresh action

### AttendanceStats
Shows key attendance statistics in card format.

```tsx
import { AttendanceStats } from '../../components/attendance';

<AttendanceStats
  stats={{
    totalPresent: 45,
    totalLate: 5,
    totalAbsent: 2,
    averageWorkHours: 8.2,
    averageArrivalTime: '09:15',
    onTimePercentage: 87
  }}
/>
```

**Props:**
- `stats`: Object containing attendance statistics

### AttendanceCalendar
Calendar view showing attendance status for each day of the month.

```tsx
import { AttendanceCalendar } from '../../components/attendance';

<AttendanceCalendar
  records={monthlyRecords}
  selectedMonth={new Date(2025, 9)}
  onDateClick={handleDateClick}
  selectedDate={selectedDate}
/>
```

**Props:**
- `records`: Array of attendance records
- `selectedMonth`: Date object for the month to display
- `onDateClick`: Optional callback when a date is clicked
- `selectedDate`: Optional currently selected date string

## Status Colors

- **Present**: Green (bg-green-100, text-green-700)
- **Late**: Yellow (bg-yellow-100, text-yellow-700)
- **Absent**: Red (bg-red-100, text-red-700)
- **Half Day**: Blue (bg-blue-100, text-blue-700)
- **On Leave**: Purple (bg-purple-100, text-purple-700)

## Design System

All components follow the light mode design system:
- White backgrounds (#FFFFFF)
- Blue accents (#3B82F6)
- Light gray secondary backgrounds (#F8FAFC)
- Clean borders and shadows
- Hover effects with smooth transitions
