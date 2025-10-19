"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";

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

export default function AttendanceCalendarPage() {
  const { profile } = useAuth();
  const [calendarData, setCalendarData] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  useEffect(() => {
    if (profile?.organization_id) {
      loadEmployees();
      loadCalendar();
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.organization_id) {
      loadCalendar();
    }
  }, [selectedEmployee, selectedMonth]);

  const loadEmployees = async () => {
    if (!profile?.organization_id) return;

    try {
      const response = await fetch(
        `/api/employees?organizationId=${profile.organization_id}`
      );

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error("Failed to load employees:", error);
    }
  };

  const loadCalendar = async () => {
    try {
      setLoading(true);

      if (!profile?.organization_id) return;

      let url = `/api/attendance/calendar?organizationId=${profile.organization_id}&month=${selectedMonth}`;

      if (selectedEmployee !== "all") {
        url += `&employeeId=${selectedEmployee}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch calendar data");
      }

      const data = await response.json();
      setCalendarData(data);
    } catch (error) {
      console.error("Failed to load calendar:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dayOfWeek];
  };

  const changeMonth = (direction: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const newDate = new Date(year, month - 1 + direction, 1);
    setSelectedMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-ui text-2xl tracking-tightish font-semibold text-ink-hi">
              Attendance Calendar
            </h1>
            <p className="font-ui text-sm text-ink-muted">
              Visual calendar view of employee attendance, absences, and punctuality
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <label className="block text-sm font-medium text-ink-hi mb-2">
                    Employee
                  </label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
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
                  <label className="block text-sm font-medium text-ink-hi mb-2">
                    Month
                  </label>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changeMonth(-1)}
                    >
                      ←
                    </Button>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changeMonth(1)}
                    >
                      →
                    </Button>
                  </div>
                </div>
              </div>

              {calendarData && (
                <div className="text-right">
                  <div className="text-2xl font-semibold text-ink-hi">
                    {calendarData.period.monthName} {calendarData.period.year}
                  </div>
                  <div className="text-sm text-ink-muted">
                    {calendarData.stats.presentDays}/{calendarData.stats.workDays} days present
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        {calendarData && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-3xl font-semibold text-success">
                  {calendarData.stats.attendanceRate}%
                </div>
                <div className="text-sm text-ink-muted mt-1">Attendance Rate</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-3xl font-semibold text-primary">
                  {calendarData.stats.presentDays}
                </div>
                <div className="text-sm text-ink-muted mt-1">Present Days</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-3xl font-semibold text-danger">
                  {calendarData.stats.absentDays}
                </div>
                <div className="text-sm text-ink-muted mt-1">Absent Days</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-3xl font-semibold text-warning">
                  {calendarData.stats.lateDays}
                </div>
                <div className="text-sm text-ink-muted mt-1">Late Days</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-3xl font-semibold text-ink-mid">
                  {calendarData.stats.halfDays}
                </div>
                <div className="text-sm text-ink-muted mt-1">Half Days</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
            <span className="text-sm text-ink-mid">Present</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
            <span className="text-sm text-ink-mid">Late</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
            <span className="text-sm text-ink-mid">Half Day</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#9ca3af' }}></div>
            <span className="text-sm text-ink-mid">Absent</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#e5e7eb' }}></div>
            <span className="text-sm text-ink-mid">Weekend</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <Card>
          <CardHeader>
            <CardTitle>
              {calendarData?.period.monthName} {calendarData?.period.year} Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-96 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : calendarData ? (
              <>
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div
                      key={day}
                      className="text-center font-semibold text-sm text-ink-mid py-2"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-2">
                  {/* Empty cells for days before month starts */}
                  {Array.from({ length: calendarData.calendar[0]?.dayOfWeek || 0 }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square"></div>
                  ))}

                  {/* Calendar days */}
                  {calendarData.calendar.map((day: CalendarDay) => (
                    <div
                      key={day.date}
                      onClick={() => setSelectedDay(day)}
                      className="aspect-square border border-line rounded-lg p-2 cursor-pointer hover:shadow-md transition-shadow"
                      style={{ backgroundColor: day.color + '20' }}
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-ink-hi">
                            {new Date(day.date).getDate()}
                          </span>
                          {day.status !== 'weekend' && day.status !== 'absent' && (
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: day.color }}
                            ></div>
                          )}
                        </div>
                        <div className="text-xs text-ink-muted truncate">
                          {day.type}
                        </div>
                        {selectedEmployee === "all" && day.presentCount !== undefined && (
                          <div className="text-xs text-ink-mid mt-auto">
                            {day.presentCount} emp{day.presentCount !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-ink-muted">
                No calendar data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Day Details Modal */}
        {selectedDay && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <CardHeader className="border-b border-line">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {new Date(selectedDay.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </CardTitle>
                    <div className="mt-2">
                      <Badge
                        variant={
                          selectedDay.status === 'present' ? 'success' :
                          selectedDay.status === 'late' ? 'danger' :
                          selectedDay.status === 'half_day' ? 'warning' :
                          'default'
                        }
                      >
                        {selectedDay.type}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDay(null)}
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="py-4">
                {selectedDay.employees.length === 0 ? (
                  <div className="text-center py-8 text-ink-muted">
                    {selectedDay.status === 'weekend' ? 'Weekend' : 'No attendance records for this day'}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedDay.employees.map((emp, index) => (
                      <div
                        key={index}
                        className="p-4 bg-raised rounded-lg border border-line"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-semibold text-ink-hi">{emp.name}</div>
                            <div className="text-sm text-ink-muted">{emp.email}</div>
                          </div>
                          {emp.isLate && (
                            <Badge variant="danger" size="sm">
                              Late ({emp.lateByMinutes} min)
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                          <div>
                            <div className="text-ink-muted">Clock In</div>
                            <div className="font-medium text-ink-hi">
                              {emp.clockInTime
                                ? new Date(emp.clockInTime).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <div className="text-ink-muted">Clock Out</div>
                            <div className="font-medium text-ink-hi">
                              {emp.clockOutTime
                                ? new Date(emp.clockOutTime).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <div className="text-ink-muted">Total Time</div>
                            <div className="font-medium text-ink-hi">
                              {emp.totalWorkTime}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
