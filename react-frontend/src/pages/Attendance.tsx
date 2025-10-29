import { useState, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { mockAttendanceData, mockProfiles } from '../lib/mockData';
import { AttendanceCalendar } from '../components/attendance/AttendanceCalendar';
import { AttendanceStats } from '../components/attendance/AttendanceStats';
import { AttendanceTable } from '../components/attendance/AttendanceTable';

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

interface AttendanceStatsData {
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
  averageWorkHours: number;
  averageArrivalTime: string;
  onTimePercentage: number;
}

interface Employee {
  id: string;
  name?: string;
  email: string;
}

function Attendance() {
  const { profile } = useAuthStore();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Get employees from mock data
  const employees = useMemo(() => {
    return mockProfiles
      .filter((p) => p.role === 'employee')
      .map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
      }));
  }, []);

  // Transform mock attendance data to match component format
  const records = useMemo(() => {
    const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

    return mockAttendanceData
      .filter((att) => {
        const attDate = new Date(att.date);
        const inRange = attDate >= startDate && attDate <= endDate;
        const matchesEmployee = !selectedEmployee || att.employee_id === selectedEmployee;
        return inRange && matchesEmployee;
      })
      .map((att) => {
        const profile = mockProfiles.find((p) => p.id === att.employee_id);
        const checkIn = att.check_in ? new Date(att.check_in) : null;
        const checkOut = att.check_out ? new Date(att.check_out) : null;

        const workHours = att.hours_worked || 0;
        const breakHours = 1; // Mock break hours
        const idleHours = 0.5; // Mock idle hours
        const totalHours = workHours + breakHours;

        // Calculate if late (after 9:15 AM)
        const isLate = checkIn ? checkIn.getHours() > 9 || (checkIn.getHours() === 9 && checkIn.getMinutes() > 15) : false;
        const lateByMinutes = isLate && checkIn ? Math.max(0, (checkIn.getHours() - 9) * 60 + (checkIn.getMinutes() - 0)) : 0;

        return {
          id: att.id,
          userId: att.employee_id,
          employeeName: profile?.name || 'Unknown',
          employeeEmail: profile?.email || '',
          date: att.date,
          clockIn: checkIn ? `${checkIn.getHours().toString().padStart(2, '0')}:${checkIn.getMinutes().toString().padStart(2, '0')}` : '-',
          clockOut: checkOut ? `${checkOut.getHours().toString().padStart(2, '0')}:${checkOut.getMinutes().toString().padStart(2, '0')}` : '-',
          workHours,
          breakHours,
          idleHours,
          totalHours,
          status: att.status,
          isLate,
          lateByMinutes,
          autoClocked: false,
          notes: undefined,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedMonth, selectedEmployee]);

  const isLoading = false;

  // Calculate stats
  const stats: AttendanceStatsData | null = calculateStats(records);

  function calculateStats(records: AttendanceRecord[]): AttendanceStatsData | null {
    if (records.length === 0) return null;

    const totalPresent = records.filter(
      (r) => r.status === 'present' || r.status === 'late'
    ).length;
    const totalLate = records.filter((r) => r.isLate).length;
    const totalAbsent = records.filter((r) => r.status === 'absent').length;
    const averageWorkHours =
      records.reduce((sum, r) => sum + r.workHours, 0) / records.length;
    const onTimePercentage =
      totalPresent > 0 ? ((totalPresent - totalLate) / totalPresent) * 100 : 0;

    // Calculate average arrival time
    const arrivalTimes = records
      .filter((r) => r.clockIn && r.clockIn !== '-')
      .map((r) => {
        const time = r.clockIn.split(':');
        return parseInt(time[0]) * 60 + parseInt(time[1]);
      });

    const avgMinutes =
      arrivalTimes.length > 0
        ? arrivalTimes.reduce((sum, m) => sum + m, 0) / arrivalTimes.length
        : 0;

    const avgHour = Math.floor(avgMinutes / 60);
    const avgMin = Math.floor(avgMinutes % 60);
    const averageArrivalTime = `${avgHour.toString().padStart(2, '0')}:${avgMin
      .toString()
      .padStart(2, '0')}`;

    return {
      totalPresent,
      totalLate,
      totalAbsent,
      averageWorkHours: parseFloat(averageWorkHours.toFixed(2)),
      averageArrivalTime,
      onTimePercentage: parseFloat(onTimePercentage.toFixed(1)),
    };
  }

  const handleExportCSV = () => {
    if (records.length === 0) return;

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
      'Auto Clocked',
    ];

    const rows = records.map((r) => [
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
      r.autoClocked ? 'Yes' : 'No',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join(
      '\n'
    );

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

  const filteredRecords = records.filter((r) => {
    const matchesDate = !selectedDate || r.date === selectedDate;
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesDate && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            {/* Back Button */}
            <button
              onClick={() => window.history.back()}
              className="bg-white hover:bg-gray-50 border border-gray-300 rounded-lg p-2 transition-colors"
              title="Go back"
            >
              <svg
                className="w-6 h-6 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Attendance Tracking
              </h1>
              <p className="text-gray-600">
                Automated clock-in/out and break monitoring
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            {/* Month Selector */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Month
              </label>
              <input
                type="month"
                value={`${selectedMonth.getFullYear()}-${(selectedMonth.getMonth() + 1)
                  .toString()
                  .padStart(2, '0')}`}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-');
                  setSelectedMonth(new Date(parseInt(year), parseInt(month) - 1));
                }}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Employee Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name || emp.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
              </select>
            </div>

            {/* Export Button */}
            <div className="flex items-end">
              <button
                onClick={handleExportCSV}
                disabled={records.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Showing records for:{' '}
                    {new Date(selectedDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {filteredRecords.length} record(s) found
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Show All Records
              </button>
            </div>
          </div>
        )}

        {/* Attendance Table */}
        <AttendanceTable
          records={filteredRecords}
          loading={isLoading}
          onRefresh={() => {}}
        />
      </div>
    </div>
  );
}

export default Attendance;
