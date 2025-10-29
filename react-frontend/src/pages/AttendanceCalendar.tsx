import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

interface CalendarDay {
  date: string;
  dayOfWeek: number;
  status: string;
  type: string;
  color: string;
  presentCount?: number;
  lateCount?: number;
  halfDayCount?: number;
  employees: Array<{
    name: string;
    email: string;
    clockInTime: string;
    clockOutTime: string;
    totalWorkTime: string;
    isLate: boolean;
    lateByMinutes: number;
  }>;
}

interface CalendarData {
  period: {
    monthName: string;
    year: number;
  };
  stats: {
    attendanceRate: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    halfDays: number;
    workDays: number;
  };
  calendar: CalendarDay[];
}

interface Employee {
  id: string;
  name?: string;
  email: string;
}

function AttendanceCalendar() {
  const { profile } = useAuthStore();
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  // Fetch employees
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('organization_id', profile.organization_id)
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.organization_id,
  });

  // Fetch calendar data
  const { data: calendarData, isLoading } = useQuery<CalendarData>({
    queryKey: [
      'attendance-calendar',
      profile?.organization_id,
      selectedMonth,
      selectedEmployee,
    ],
    queryFn: async () => {
      if (!profile?.organization_id) throw new Error('No organization ID');

      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      const daysInMonth = endDate.getDate();

      let query = supabase
        .from('attendance_records')
        .select(`
          *,
          profiles:user_id (
            name,
            email
          )
        `)
        .eq('organization_id', profile.organization_id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (selectedEmployee !== 'all') {
        query = query.eq('user_id', selectedEmployee);
      }

      const { data: records, error } = await query;

      if (error) throw error;

      // Build calendar data
      const calendar: CalendarDay[] = [];
      let presentDays = 0;
      let absentDays = 0;
      let lateDays = 0;
      let halfDays = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(
          day
        ).padStart(2, '0')}`;
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        const dayRecords = (records || []).filter(
          (r: any) => r.date === dateStr
        );

        let status = 'absent';
        let type = 'Absent';
        let color = '#9ca3af';

        if (isWeekend) {
          status = 'weekend';
          type = 'Weekend';
          color = '#e5e7eb';
        } else if (dayRecords.length > 0) {
          const hasLate = dayRecords.some((r: any) => r.is_late);
          const hasPresent = dayRecords.some(
            (r: any) => r.status === 'present' || r.status === 'late'
          );
          const hasHalfDay = dayRecords.some((r: any) => r.status === 'half_day');

          if (hasLate) {
            status = 'late';
            type = 'Late';
            color = '#ef4444';
            lateDays++;
          } else if (hasHalfDay) {
            status = 'half_day';
            type = 'Half Day';
            color = '#f59e0b';
            halfDays++;
          } else if (hasPresent) {
            status = 'present';
            type = 'Present';
            color = '#10b981';
            presentDays++;
          }
        } else if (!isWeekend) {
          absentDays++;
        }

        const employees = dayRecords.map((r: any) => ({
          name: r.profiles?.name || 'Unknown',
          email: r.profiles?.email || '',
          clockInTime: r.clock_in_time || '',
          clockOutTime: r.clock_out_time || '',
          totalWorkTime: r.work_hours
            ? `${r.work_hours.toFixed(2)}h`
            : '0h',
          isLate: r.is_late || false,
          lateByMinutes: r.late_by_minutes || 0,
        }));

        calendar.push({
          date: dateStr,
          dayOfWeek,
          status,
          type,
          color,
          presentCount: selectedEmployee === 'all' ? employees.length : undefined,
          employees,
        });
      }

      const workDays = daysInMonth - calendar.filter((d) => d.status === 'weekend').length;
      const attendanceRate =
        workDays > 0 ? Math.round((presentDays / workDays) * 100) : 0;

      return {
        period: {
          monthName: new Date(year, month - 1).toLocaleString('default', {
            month: 'long',
          }),
          year,
        },
        stats: {
          attendanceRate,
          presentDays,
          absentDays,
          lateDays,
          halfDays,
          workDays,
        },
        calendar,
      };
    },
    enabled: !!profile?.organization_id,
  });

  const changeMonth = (direction: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const newDate = new Date(year, month - 1 + direction, 1);
    setSelectedMonth(
      `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(
        2,
        '0'
      )}`
    );
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Attendance Calendar
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Visual calendar view of employee attendance, absences, and punctuality
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Employee
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Employees</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name || emp.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Month
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => changeMonth(-1)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    ←
                  </button>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => changeMonth(1)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>

            {calendarData && (
              <div className="text-right">
                <div className="text-2xl font-semibold text-gray-900">
                  {calendarData.period.monthName} {calendarData.period.year}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {calendarData.stats.presentDays}/{calendarData.stats.workDays}{' '}
                  days present
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        {calendarData && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 text-center">
              <div className="text-3xl font-semibold text-green-600">
                {calendarData.stats.attendanceRate}%
              </div>
              <div className="text-sm text-gray-600 mt-1">Attendance Rate</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 text-center">
              <div className="text-3xl font-semibold text-blue-600">
                {calendarData.stats.presentDays}
              </div>
              <div className="text-sm text-gray-600 mt-1">Present Days</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 text-center">
              <div className="text-3xl font-semibold text-red-600">
                {calendarData.stats.absentDays}
              </div>
              <div className="text-sm text-gray-600 mt-1">Absent Days</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 text-center">
              <div className="text-3xl font-semibold text-yellow-600">
                {calendarData.stats.lateDays}
              </div>
              <div className="text-sm text-gray-600 mt-1">Late Days</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 text-center">
              <div className="text-3xl font-semibold text-gray-600">
                {calendarData.stats.halfDays}
              </div>
              <div className="text-sm text-gray-600 mt-1">Half Days</div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: '#10b981' }}
            ></div>
            <span className="text-sm text-gray-600">Present</span>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: '#ef4444' }}
            ></div>
            <span className="text-sm text-gray-600">Late</span>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: '#f59e0b' }}
            ></div>
            <span className="text-sm text-gray-600">Half Day</span>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: '#9ca3af' }}
            ></div>
            <span className="text-sm text-gray-600">Absent</span>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: '#e5e7eb' }}
            ></div>
            <span className="text-sm text-gray-600">Weekend</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {calendarData?.period.monthName} {calendarData?.period.year} Calendar
            </h2>
          </div>

          {isLoading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : calendarData ? (
            <>
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="text-center font-semibold text-sm text-gray-600 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {/* Empty cells for days before month starts */}
                {Array.from({
                  length: calendarData.calendar[0]?.dayOfWeek || 0,
                }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square"></div>
                ))}

                {/* Calendar days */}
                {calendarData.calendar.map((day: CalendarDay) => (
                  <div
                    key={day.date}
                    onClick={() => setSelectedDay(day)}
                    className="aspect-square border border-gray-300 rounded-lg p-2 cursor-pointer hover:shadow-md transition-shadow"
                    style={{ backgroundColor: day.color + '20' }}
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-900">
                          {new Date(day.date).getDate()}
                        </span>
                        {day.status !== 'weekend' && day.status !== 'absent' && (
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: day.color }}
                          ></div>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {day.type}
                      </div>
                      {selectedEmployee === 'all' &&
                        day.presentCount !== undefined && (
                          <div className="text-xs text-gray-700 mt-auto">
                            {day.presentCount} emp{day.presentCount !== 1 ? 's' : ''}
                          </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-600">
              No calendar data available
            </div>
          )}
        </div>

        {/* Day Details Modal */}
        {selectedDay && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl">
              <div className="border-b border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {new Date(selectedDay.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </h3>
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedDay.status === 'present'
                            ? 'bg-green-100 text-green-800'
                            : selectedDay.status === 'late'
                            ? 'bg-red-100 text-red-800'
                            : selectedDay.status === 'half_day'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {selectedDay.type}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-light"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="p-6">
                {selectedDay.employees.length === 0 ? (
                  <div className="text-center py-8 text-gray-600">
                    {selectedDay.status === 'weekend'
                      ? 'Weekend'
                      : 'No attendance records for this day'}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedDay.employees.map((emp, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-semibold text-gray-900">
                              {emp.name}
                            </div>
                            <div className="text-sm text-gray-600">{emp.email}</div>
                          </div>
                          {emp.isLate && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Late ({emp.lateByMinutes} min)
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                          <div>
                            <div className="text-gray-600">Clock In</div>
                            <div className="font-medium text-gray-900">
                              {emp.clockInTime
                                ? new Date(emp.clockInTime).toLocaleTimeString(
                                    [],
                                    {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    }
                                  )
                                : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">Clock Out</div>
                            <div className="font-medium text-gray-900">
                              {emp.clockOutTime
                                ? new Date(emp.clockOutTime).toLocaleTimeString(
                                    [],
                                    {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    }
                                  )
                                : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">Total Time</div>
                            <div className="font-medium text-gray-900">
                              {emp.totalWorkTime}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AttendanceCalendar;
