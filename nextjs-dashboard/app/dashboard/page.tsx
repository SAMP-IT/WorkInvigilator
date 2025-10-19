"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { useAuth } from "@/lib/auth-context";

interface EmployeeStatus {
  id: string;
  name: string;
  email: string;
  department: string;
  status: 'active' | 'idle' | 'offline' | 'late';
  currentActivity: string;
  todayHours: string;
  todayHoursRaw: number;
  idleTime: string;
  isLate: boolean;
  lateByMinutes: number;
  clockInTime: string | null;
  clockOutTime: string | null;
  productivity: number;
  lastActive: string | null;
}

interface OrganizationStats {
  totalEmployees: number;
  activeNow: number;
  idleNow: number;
  offlineNow: number;
  lateToday: number;
  totalHoursToday: string;
  avgProductivity: string;
  mostProductiveEmployee: string;
  mostProductiveHours: string;
}

interface DashboardData {
  organizationStats: OrganizationStats;
  employees: EmployeeStatus[];
  timestamp: string;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');

  useEffect(() => {
    if (profile?.organization_id) {
      loadDashboardData();
    }
  }, [profile]);

  useEffect(() => {
    if (!autoRefresh) return;

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (profile?.organization_id) {
        loadDashboardData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, profile]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!profile?.organization_id) {
        setError('No organization found');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `/api/analytics/realtime?organizationId=${profile.organization_id}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'idle':
        return 'warning';
      case 'late':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return '';
      case 'idle':
        return '';
      case 'late':
        return '';
      default:
        return '';
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getProductivityColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 75) return 'text-primary';
    if (score >= 60) return 'text-warning';
    return 'text-danger';
  };

  const filteredEmployees = dashboardData?.employees.filter(emp => {
    const matchesStatus = filterStatus === 'all' || emp.status === filterStatus;
    const matchesDepartment = filterDepartment === 'all' || emp.department === filterDepartment;
    return matchesStatus && matchesDepartment;
  }) || [];

  const departments = Array.from(
    new Set(dashboardData?.employees.map(e => e.department) || [])
  ).sort();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-ui text-2xl tracking-tightish font-semibold text-ink-hi">
              Real-Time Dashboard
            </h1>
            <p className="font-ui text-sm text-ink-muted">
              Live employee activity and productivity monitoring
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto-refresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-primary bg-surface border-line rounded focus:ring-primary"
              />
              <label htmlFor="auto-refresh" className="text-sm text-ink-mid cursor-pointer">
                Auto-refresh (30s)
              </label>
            </div>
            {dashboardData && (
              <span className="text-xs text-ink-muted">
                Last updated: {new Date(dashboardData.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between">
            <span className="font-medium">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              Close
            </button>
          </div>
        )}

        {/* Organization Statistics */}
        {dashboardData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-ink-muted">Active Now</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-success">
                    {dashboardData.organizationStats.activeNow}
                  </div>
                  <div className="text-sm text-ink-muted mt-1">
                    of {dashboardData.organizationStats.totalEmployees} employees
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-ink-muted">Idle / Offline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-warning">
                    {dashboardData.organizationStats.idleNow} / {dashboardData.organizationStats.offlineNow}
                  </div>
                  <div className="text-sm text-ink-muted mt-1">
                    Away from desk / Not clocked in
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-ink-muted">Late Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-danger">
                    {dashboardData.organizationStats.lateToday}
                  </div>
                  <div className="text-sm text-ink-muted mt-1">
                    Employees clocked in late
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-ink-muted">Total Hours Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-primary">
                    {dashboardData.organizationStats.totalHoursToday}
                  </div>
                  <div className="text-sm text-ink-muted mt-1">
                    Organization-wide work time
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Average Productivity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-4xl font-semibold text-success">
                      {dashboardData.organizationStats.avgProductivity}
                    </div>
                    <div className="text-sm text-ink-muted">
                      Across all active employees
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Performer Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-semibold text-ink-hi">
                        {dashboardData.organizationStats.mostProductiveEmployee}
                      </div>
                      <div className="text-sm text-ink-muted">Most productive employee</div>
                    </div>
                    <div className="text-2xl font-semibold text-primary">
                      {dashboardData.organizationStats.mostProductiveHours}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-ink-hi">Filters:</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="idle">Idle</option>
                    <option value="offline">Offline</option>
                    <option value="late">Late</option>
                  </select>
                  <select
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    className="bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  <span className="text-sm text-ink-muted">
                    Showing {filteredEmployees.length} of {dashboardData.employees.length} employees
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Employee Status Table */}
            <Card>
              <CardHeader>
                <CardTitle>Employee Status</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Today's Hours</TableHead>
                    <TableHead>Idle Time</TableHead>
                    <TableHead>Productivity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 bg-gray-300 rounded animate-pulse"></div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="text-ink-muted">
                          No employees match the selected filters.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar name={employee.name} size="sm" />
                            <div>
                              <div className="font-medium text-ink-hi">
                                {employee.name}
                              </div>
                              <div className="text-sm text-ink-muted">
                                {employee.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-ink-mid">
                            {employee.department}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(employee.status)} size="sm">
                            {getStatusIcon(employee.status)} {employee.status.toUpperCase()}
                          </Badge>
                          {employee.isLate && (
                            <div className="text-xs text-danger mt-1">
                              Late by {employee.lateByMinutes} min
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-ink-mid">
                            {employee.currentActivity}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono text-ink-mid">
                            {formatTime(employee.clockInTime)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono font-medium text-ink-hi">
                            {employee.todayHours}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono text-warning">
                            {employee.idleTime}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm font-medium ${getProductivityColor(employee.productivity)}`}>
                            {employee.productivity}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
