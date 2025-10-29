import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../components/ui/Table";
import { mockDashboardStats, mockActivityData, mockProfiles, mockSessions, mockScreenshots, mockRecordings } from "../lib/mockData";
import { EmployeeSidebar } from "../components/dashboard/EmployeeSidebar";
import { EmployeeDetailView } from "../components/dashboard/EmployeeDetailView";

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

// Helper function to format hours from seconds
function formatHours(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

// Helper function to calculate idle time
function calculateIdleTime(session: any): string {
  return formatHours(session.idle_time || 0);
}

// Transform mock data to match dashboard format
function getMockDashboardData(): DashboardData {
  const now = new Date();
  const todaySessions = mockSessions.filter(s =>
    new Date(s.start_time).toDateString() === now.toDateString()
  );

  // Calculate employee statuses
  const employees: EmployeeStatus[] = mockProfiles
    .filter(p => p.role === 'employee')
    .map(profile => {
      const session = todaySessions.find(s => s.employee_id === profile.id);
      const isActive = session && session.status === 'active';
      const hasSession = !!session;

      // Calculate hours worked
      const hoursWorked = session ? session.active_time / 3600 : 0;
      const idleTime = session ? session.idle_time : 0;

      // Determine status
      let status: 'active' | 'idle' | 'offline' | 'late' = 'offline';
      if (isActive) {
        status = idleTime > 600 ? 'idle' : 'active';
      } else if (hasSession && session.status === 'completed') {
        status = 'offline';
      }

      // Check if late (clocked in after 9:00 AM)
      const clockInTime = session ? new Date(session.start_time) : null;
      const isLate = clockInTime ? clockInTime.getHours() > 9 || (clockInTime.getHours() === 9 && clockInTime.getMinutes() > 15) : false;
      const lateByMinutes = isLate && clockInTime
        ? Math.floor((clockInTime.getTime() - new Date(clockInTime.toDateString() + ' 09:00:00').getTime()) / 60000)
        : 0;

      if (isLate) status = 'late';

      return {
        id: profile.id,
        name: profile.name || 'Unknown',
        email: profile.email || '',
        department: profile.id === '2' || profile.id === '4' ? 'Engineering' : profile.id === '3' ? 'Design' : 'Marketing',
        status,
        currentActivity: isActive ? 'Working on tasks' : hasSession ? 'Completed work' : 'Not clocked in',
        todayHours: formatHours(session ? session.active_time : 0),
        todayHoursRaw: hoursWorked,
        idleTime: calculateIdleTime(session || {}),
        isLate,
        lateByMinutes: Math.abs(lateByMinutes),
        clockInTime: clockInTime ? clockInTime.toISOString() : null,
        clockOutTime: session?.end_time || null,
        productivity: session?.productivity_score || 0,
        lastActive: isActive ? new Date().toISOString() : clockInTime?.toISOString() || null,
      };
    });

  // Calculate organization stats
  const activeNow = employees.filter(e => e.status === 'active').length;
  const idleNow = employees.filter(e => e.status === 'idle').length;
  const offlineNow = employees.filter(e => e.status === 'offline').length;
  const lateToday = employees.filter(e => e.isLate).length;

  const totalHoursToday = employees.reduce((sum, e) => sum + e.todayHoursRaw, 0);
  const avgProductivity = employees.filter(e => e.productivity > 0).length > 0
    ? Math.round(employees.filter(e => e.productivity > 0).reduce((sum, e) => sum + e.productivity, 0) / employees.filter(e => e.productivity > 0).length)
    : 0;

  const sortedByHours = [...employees].sort((a, b) => b.todayHoursRaw - a.todayHoursRaw);
  const mostProductiveEmployee = sortedByHours[0]?.name || 'N/A';
  const mostProductiveHours = sortedByHours[0]?.todayHours || '0h 0m';

  return {
    organizationStats: {
      totalEmployees: employees.length,
      activeNow,
      idleNow,
      offlineNow,
      lateToday,
      totalHoursToday: formatHours(totalHoursToday * 3600),
      avgProductivity: `${avgProductivity}%`,
      mostProductiveEmployee,
      mostProductiveHours,
    },
    employees,
    timestamp: new Date().toISOString(),
  };
}

export default function Dashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Use mock data instead of API calls
  const dashboardData = getMockDashboardData();
  const isLoading = false;
  const error = null;

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

  const formatTime = (isoString: string | null) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getProductivityColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredEmployees = dashboardData?.employees.filter(emp => {
    const matchesStatus = filterStatus === 'all' || emp.status === filterStatus;
    const matchesDepartment = filterDepartment === 'all' || emp.department === filterDepartment;
    return matchesStatus && matchesDepartment;
  }) || [];

  const departments = Array.from(
    new Set(dashboardData?.employees.map(e => e.department) || [])
  ).sort();

  // Prepare employee list for sidebar
  const employeesForSidebar = dashboardData?.employees.map(emp => {
    const profile = mockProfiles.find(p => p.id === emp.id);
    return {
      id: emp.id,
      name: emp.name,
      email: emp.email,
      avatar_url: profile?.avatar_url || '',
      department: emp.department,
      status: emp.status === 'active' || emp.status === 'idle' ? 'online' : 'offline',
      productivity: emp.productivity,
      salary: (profile as any)?.salary,
      hourlyRate: (profile as any)?.hourlyRate,
    };
  }) || [];

  // Get selected employee data
  const selectedEmployee = selectedEmployeeId
    ? employeesForSidebar.find(e => e.id === selectedEmployeeId) || null
    : null;

  // Get screenshots for selected employee
  const employeeScreenshots = selectedEmployeeId
    ? mockScreenshots.filter(s => s.employee_id === selectedEmployeeId)
    : [];

  // Get audio recordings for selected employee
  const employeeAudio = selectedEmployeeId
    ? mockRecordings.filter(r => r.employee_id === selectedEmployeeId)
    : [];

  // Get today's session for selected employee
  const todaySession = selectedEmployeeId
    ? mockSessions.find(s => s.employee_id === selectedEmployeeId && s.status === 'active')
    : null;

  // Get total sessions count
  const totalSessions = selectedEmployeeId
    ? mockSessions.filter(s => s.employee_id === selectedEmployeeId).length
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-8 animate-fade-in">
      {/* Employee Sidebar */}
      <EmployeeSidebar
        employees={employeesForSidebar as any}
        selectedEmployeeId={selectedEmployeeId}
        onSelectEmployee={setSelectedEmployeeId}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="max-w-[1800px] mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between animate-slide-in-up">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Real-Time Dashboard
            </h1>
            <p className="text-sm text-slate-600 mt-2 font-medium">
              Live employee activity and productivity monitoring
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 px-4 py-2.5 bg-white rounded-xl border border-slate-200 shadow-premium">
              <input
                type="checkbox"
                id="auto-refresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="auto-refresh" className="text-sm text-slate-700 font-semibold cursor-pointer">
                Auto-refresh (30s)
              </label>
            </div>
            {dashboardData && (
              <div className="flex items-center space-x-2 px-4 py-2.5 bg-blue-50 rounded-xl border border-blue-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-blue-700 font-semibold">
                  Updated: {new Date(dashboardData.timestamp).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-800 px-6 py-4 rounded-2xl flex items-center justify-between shadow-glow-red animate-slide-in-down">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-bold">{error.message}</span>
            </div>
          </div>
        )}

        {/* Organization Statistics */}
        {dashboardData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card hover gradient="green" className="animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Active Now</p>
                    </div>
                    <div className="text-4xl font-bold text-emerald-600 mb-2">
                      {dashboardData.organizationStats.activeNow}
                    </div>
                    <p className="text-sm text-slate-600 font-medium">
                      of {dashboardData.organizationStats.totalEmployees} employees
                    </p>
                  </div>
                  <Badge variant="success" glow size="sm">
                    Live
                  </Badge>
                </div>
              </Card>

              <Card hover gradient="orange" className="animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Idle / Offline</p>
                    </div>
                    <div className="text-4xl font-bold text-amber-600 mb-2">
                      {dashboardData.organizationStats.idleNow} / {dashboardData.organizationStats.offlineNow}
                    </div>
                    <p className="text-sm text-slate-600 font-medium">
                      Away from desk / Not clocked in
                    </p>
                  </div>
                </div>
              </Card>

              <Card hover className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200 animate-slide-in-up" style={{ animationDelay: '0.3s' }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Late Today</p>
                    </div>
                    <div className="text-4xl font-bold text-red-600 mb-2">
                      {dashboardData.organizationStats.lateToday}
                    </div>
                    <p className="text-sm text-slate-600 font-medium">
                      Employees clocked in late
                    </p>
                  </div>
                  {dashboardData.organizationStats.lateToday > 0 && (
                    <Badge variant="danger" glow size="sm">
                      Alert
                    </Badge>
                  )}
                </div>
              </Card>

              <Card hover gradient="blue" className="animate-slide-in-up" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Hours</p>
                    </div>
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {dashboardData.organizationStats.totalHoursToday}
                    </div>
                    <p className="text-sm text-slate-600 font-medium">
                      Organization-wide work time
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card hover className="bg-white animate-slide-in-up" style={{ animationDelay: '0.5s' }}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle gradient>Average Productivity</CardTitle>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center shadow-sm">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-5xl font-bold gradient-text-green mb-2">
                        {dashboardData.organizationStats.avgProductivity}
                      </div>
                      <p className="text-sm text-slate-600 font-medium">
                        Across all active employees
                      </p>
                    </div>
                    <Badge variant="success" size="md">
                      Excellent
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card hover className="bg-white animate-slide-in-up" style={{ animationDelay: '0.6s' }}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle gradient>Top Performer Today</CardTitle>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-100 to-amber-100 flex items-center justify-center shadow-sm">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-slate-900 mb-1">
                        {dashboardData.organizationStats.mostProductiveEmployee}
                      </div>
                      <p className="text-sm text-slate-600 font-medium">Most productive employee</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold gradient-text-blue">
                        {dashboardData.organizationStats.mostProductiveHours}
                      </div>
                      <p className="text-xs text-slate-500 font-medium">hours</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Employee Detail Section */}
            <div className="animate-slide-in-up" style={{ animationDelay: '0.7s' }}>
              <Card className="bg-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle gradient>Employee Details</CardTitle>
                    <Badge variant="primary" size="sm" glow>
                      Real-time
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <EmployeeDetailView
                    employee={selectedEmployee}
                    screenshots={employeeScreenshots}
                    audioRecordings={employeeAudio}
                    todaySession={todaySession}
                    totalSessions={totalSessions}
                  />
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
