'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { AttendanceCalendar } from '@/components/attendance/AttendanceCalendar';
import { AttendanceStats } from '@/components/attendance/AttendanceStats';
import { AttendanceTable } from '@/components/attendance/AttendanceTable';

interface AttendanceRecord {
  id: string;
  userId: string;
  employeeName: string;
  employeeEmail: string;
  date: string;
  clockIn: string;
  clockOut: string;
  workHours: number;
  breakHours: number;
  idleHours: number;
  totalHours: number;
  status: string;
  isLate: boolean;
  lateByMinutes: number;
  autoClocked: boolean;
  notes?: string;
}

interface AttendanceStats {
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
  averageWorkHours: number;
  averageArrivalTime: string;
  onTimePercentage: number;
}

export default function AttendancePage() {
  const { profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && profile?.organization_id) {
      loadEmployees();
      loadAttendanceData();
    }
  }, [authLoading, profile?.organization_id, selectedMonth, selectedEmployee]);

  const loadEmployees = async () => {
    if (!profile?.organization_id) return;

    try {
      const response = await fetch(`/api/employees?organizationId=${profile.organization_id}`);
      const data = await response.json();

      if (data.employees) {
        setEmployees(data.employees);
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  };

  const loadAttendanceData = async () => {
    if (!profile?.organization_id) return;

    try {
      setLoading(true);

      // Calculate date range for selected month
      const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

      const params = new URLSearchParams({
        organizationId: profile.organization_id,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });

      if (selectedEmployee) {
        params.append('employeeId', selectedEmployee);
      }

      const response = await fetch(`/api/attendance?${params}`);
      const data = await response.json();

      if (data.records) {
        setRecords(data.records);
        calculateStats(data.records);
      }
    } catch (error) {
      console.error('Failed to load attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (records: AttendanceRecord[]) => {
    if (records.length === 0) {
      setStats(null);
      return;
    }

    const totalPresent = records.filter(r => r.status === 'present' || r.status === 'late').length;
    const totalLate = records.filter(r => r.isLate).length;
    const totalAbsent = records.filter(r => r.status === 'absent').length;
    const averageWorkHours = records.reduce((sum, r) => sum + r.workHours, 0) / records.length;
    const onTimePercentage = totalPresent > 0 ? ((totalPresent - totalLate) / totalPresent) * 100 : 0;

    // Calculate average arrival time
    const arrivalTimes = records
      .filter(r => r.clockIn && r.clockIn !== '-')
      .map(r => {
        const time = r.clockIn.split(':');
        return parseInt(time[0]) * 60 + parseInt(time[1]);
      });

    const avgMinutes = arrivalTimes.length > 0
      ? arrivalTimes.reduce((sum, m) => sum + m, 0) / arrivalTimes.length
      : 0;

    const avgHour = Math.floor(avgMinutes / 60);
    const avgMin = Math.floor(avgMinutes % 60);
    const averageArrivalTime = `${avgHour.toString().padStart(2, '0')}:${avgMin.toString().padStart(2, '0')}`;

    setStats({
      totalPresent,
      totalLate,
      totalAbsent,
      averageWorkHours: parseFloat(averageWorkHours.toFixed(2)),
      averageArrivalTime,
      onTimePercentage: parseFloat(onTimePercentage.toFixed(1))
    });
  };

  const handleExportCSV = () => {
    if (records.length === 0) return;

    // CSV headers
    const headers = [
      'Employee Name',
      'Email',
      'Date',
      'Clock In',
      'Clock Out',
      'Work Hours',
      'Break Hours',
      'Idle Hours',
      'Total Hours',
      'Status',
      'Late',
      'Late By (min)',
      'Auto Clocked'
    ];

    // CSV rows
    const rows = records.map(r => [
      r.employeeName,
      r.employeeEmail,
      r.date,
      r.clockIn,
      r.clockOut,
      r.workHours,
      r.breakHours,
      r.idleHours,
      r.totalHours,
      r.status,
      r.isLate ? 'Yes' : 'No',
      r.lateByMinutes,
      r.autoClocked ? 'Yes' : 'No'
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedMonth.toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            {/* Back Button */}
            <button
              onClick={() => window.history.back()}
              className="bg-surface hover:bg-surface-hover border border-line rounded-lg p-2 transition-colors"
              title="Go back"
            >
              <svg className="w-6 h-6 text-ink-hi" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-ink-hi mb-2">Attendance Tracking</h1>
              <p className="text-ink-mid">Automated clock-in/out and break monitoring</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-surface rounded-lg border border-line p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            {/* Month Selector */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-ink-mid mb-2">
                Month
              </label>
              <input
                type="month"
                value={`${selectedMonth.getFullYear()}-${(selectedMonth.getMonth() + 1).toString().padStart(2, '0')}`}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-');
                  setSelectedMonth(new Date(parseInt(year), parseInt(month) - 1));
                }}
                className="w-full px-3 py-2 bg-raised border border-line rounded-lg text-ink-hi"
              />
            </div>

            {/* Employee Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-ink-mid mb-2">
                Employee
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 bg-raised border border-line rounded-lg text-ink-hi"
              >
                <option value="">All Employees</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name || emp.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Export Button */}
            <div className="flex items-end">
              <button
                onClick={handleExportCSV}
                disabled={records.length === 0}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        {stats && <AttendanceStats stats={stats} />}

        {/* Calendar View */}
        <div className="mb-6">
          <AttendanceCalendar
            records={records}
            selectedMonth={selectedMonth}
            onDateClick={(date) => setSelectedDate(date)}
            selectedDate={selectedDate}
          />
        </div>

        {/* Selected Date Filter Info */}
        {selectedDate && (
          <div className="bg-primary/10 border border-primary rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-primary">
                    Showing records for: {new Date(selectedDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-xs text-ink-mid mt-1">
                    {records.filter(r => r.date === selectedDate).length} record(s) found
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                Show All Records
              </button>
            </div>
          </div>
        )}

        {/* Attendance Table */}
        <AttendanceTable
          records={selectedDate ? records.filter(r => r.date === selectedDate) : records}
          loading={loading}
          onRefresh={loadAttendanceData}
        />
      </div>
    </div>
  );
}
