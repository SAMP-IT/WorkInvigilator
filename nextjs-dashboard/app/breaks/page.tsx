'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';

interface BreakSession {
  id: string;
  employeeId: string;
  employeeName: string;
  breakDate: string;
  startTime: string;
  endTime: string;
  duration: string;
  durationMs: number;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  department?: string;
}

export default function BreaksPage() {
  const { profile } = useAuth();
  const [breakSessions, setBreakSessions] = useState<BreakSession[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const displayedBreaks = selectedEmployee === 'all'
    ? breakSessions
    : breakSessions.filter(b => b.employeeId === selectedEmployee);

  useEffect(() => {
    loadData();
  }, [selectedEmployee, startDate, endDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!profile?.organization_id) {
        setError('No organization found');
        setLoading(false);
        return;
      }

      // Load employees first
      const employeesResponse = await fetch(`/api/employees?organizationId=${profile.organization_id}`);
      if (!employeesResponse.ok) {
        throw new Error('Failed to fetch employees');
      }
      const employeesData = await employeesResponse.json();
      setEmployees(employeesData.employees || []);

      // Load break sessions with filters
      let breaksUrl = selectedEmployee === 'all'
        ? `/api/breaks?organizationId=${profile.organization_id}`
        : `/api/breaks?employeeId=${selectedEmployee}&organizationId=${profile.organization_id}`;

      if (startDate) breaksUrl += `&startDate=${startDate}`;
      if (endDate) breaksUrl += `&endDate=${endDate}`;

      const breaksResponse = await fetch(breaksUrl);
      if (!breaksResponse.ok) {
        throw new Error('Failed to fetch break sessions');
      }

      const breaksData = await breaksResponse.json();
      setBreakSessions(breaksData.breakSessions || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load break sessions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalBreakTime = displayedBreaks.reduce((sum, b) => sum + b.durationMs, 0);
  const avgBreakDuration = displayedBreaks.length > 0
    ? totalBreakTime / displayedBreaks.length
    : 0;

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  const formatTotalTime = (ms: number) => {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleExport = () => {
    const csvContent = [
      ['Employee Name', 'Date', 'Start Time', 'End Time', 'Duration'].join(','),
      ...displayedBreaks.map(session =>
        [
          session.employeeName,
          session.breakDate,
          session.startTime,
          session.endTime,
          session.duration
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `break-sessions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink-hi">Break Sessions</h1>
            <p className="text-ink-muted">Track employee break times and durations</p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="info">
              {loading ? '...' : displayedBreaks.length} Breaks
            </Badge>
            <Button variant="outline" onClick={handleExport} disabled={displayedBreaks.length === 0}>
              Export CSV
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        {!loading && displayedBreaks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="py-4">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-ink-hi font-mono">
                    {displayedBreaks.length}
                  </div>
                  <div className="text-sm text-ink-muted">Total Breaks</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-ink-hi font-mono">
                    {formatTotalTime(totalBreakTime)}
                  </div>
                  <div className="text-sm text-ink-muted">Total Break Time</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-ink-hi font-mono">
                    {formatDuration(avgBreakDuration)}
                  </div>
                  <div className="text-sm text-ink-muted">Average Duration</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-hi mb-2">
                  Employee
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Employees</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} - {employee.department}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-hi mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-hi mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Badge variant="outline">
                  {displayedBreaks.length} breaks
                </Badge>
                {(startDate || endDate) && (
                  <p className="text-sm text-ink-muted">
                    {startDate && endDate ? `${startDate} to ${endDate}` :
                     startDate ? `From ${startDate}` :
                     `Until ${endDate}`}
                  </p>
                )}
              </div>
              {(selectedEmployee !== 'all' || startDate || endDate) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedEmployee('all');
                    setStartDate('');
                    setEndDate('');
                  }}
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Break Sessions List */}
        <Card>
          <CardHeader>
            <CardTitle>Break Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 bg-raised rounded-lg animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                        <div className="h-3 bg-gray-300 rounded w-1/4"></div>
                      </div>
                      <div className="h-6 bg-gray-300 rounded w-20"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-danger text-sm mb-2">{error}</div>
                <Button variant="outline" size="sm" onClick={loadData}>
                  Try Again
                </Button>
              </div>
            ) : displayedBreaks.length === 0 ? (
              <div className="text-center py-8 text-ink-muted">
                <div className="text-4xl mb-4">☕</div>
                <p className="text-sm">
                  {selectedEmployee === 'all'
                    ? 'No break sessions found.'
                    : 'No break sessions found for this employee.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedBreaks.map((breakSession) => (
                  <div
                    key={breakSession.id}
                    className="p-4 bg-raised rounded-lg border border-line hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-sm font-medium text-ink-hi">
                            {breakSession.employeeName}
                          </h3>
                          <Badge size="sm" variant="outline">
                            {breakSession.duration}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-ink-muted">
                          <span>📅 {breakSession.breakDate}</span>
                          <span>•</span>
                          <span>🕐 {breakSession.startTime}</span>
                          <span>→</span>
                          <span>🕐 {breakSession.endTime}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="info">
                          ☕ Break
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
