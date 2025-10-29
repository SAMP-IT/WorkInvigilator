import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '../components/ui/Table';
import { mockSessions, mockProfiles } from '../lib/mockData';
import { EmployeeSidebar } from '../components/dashboard/EmployeeSidebar';

interface Session {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  startTime: string;
  endTime: string;
  duration: string;
  focusTime: string;
  focusPercent: number;
  status: 'active' | 'completed' | 'paused';
  apps: string[];
  screenshots: number;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
}

const Sessions = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');

  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState<string>(getCurrentDate());
  const [endDate, setEndDate] = useState<string>(getCurrentDate());

  // Helper function to format time duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Helper function to format time
  const formatTime = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Transform mock data to match Session interface
  const sessions = useMemo(() => {
    return mockSessions
      .filter(session => {
        const sessionDate = new Date(session.start_time).toISOString().split('T')[0];
        const start = startDate || '';
        const end = endDate || '';

        if (start && sessionDate < start) return false;
        if (end && sessionDate > end) return false;
        return true;
      })
      .map(session => {
        const profile = mockProfiles.find(p => p.id === session.employee_id);
        const duration = session.end_time
          ? Math.floor((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 1000)
          : session.duration;
        const focusPercent = session.productivity_score;

        return {
          id: session.id,
          employeeId: session.employee_id,
          employeeName: profile?.name || 'Unknown',
          employeeAvatar: profile?.name?.split(' ').map(n => n[0]).join('') || 'U',
          startTime: formatTime(session.start_time),
          endTime: formatTime(session.end_time),
          duration: formatDuration(duration),
          focusTime: formatDuration(session.active_time),
          focusPercent: focusPercent,
          status: session.status as 'active' | 'completed' | 'paused',
          apps: ['VS Code', 'Chrome', 'Slack'], // Mock apps
          screenshots: Math.floor(duration / 600), // One screenshot per 10 minutes
        };
      })
      .sort((a, b) => {
        // Sort by status (active first) then by start time
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return 0;
      });
  }, [startDate, endDate]);

  // Transform employees data
  const employees = useMemo(() => {
    return mockProfiles
      .filter(p => p.role === 'employee')
      .map(profile => ({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        shiftStartTime: '09:00',
        shiftEndTime: '18:00',
      }));
  }, []);

  // Prepare employee data for sidebar
  const employeesForSidebar = useMemo(() => {
    return mockProfiles
      .filter(p => p.role === 'employee')
      .map(emp => {
        const empSessions = mockSessions.filter(s => s.employee_id === emp.id);
        const activeSession = empSessions.find(s => s.status === 'active');
        const avgProductivity = empSessions.length > 0
          ? Math.round(empSessions.reduce((sum, s) => sum + s.productivity_score, 0) / empSessions.length)
          : 0;

        return {
          id: emp.id,
          name: emp.name,
          email: emp.email,
          avatar_url: emp.avatar_url || '',
          department: emp.department || '',
          status: activeSession ? ('online' as const) : ('offline' as const),
          productivity: avgProductivity,
        };
      });
  }, []);

  const isLoading = false;

  const getSessionType = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee || !employee.shiftStartTime || !employee.shiftEndTime) return 'all';

    const startTime = employee.shiftStartTime;
    const endTime = employee.shiftEndTime;

    if (startTime >= '09:00' && endTime <= '18:00') return 'morning';
    if (startTime >= '12:00' && endTime <= '21:00') return 'afternoon';
    if ((startTime >= '17:30' && endTime >= '17:30') || (startTime >= '17:30' && endTime <= '02:30')) return 'evening';

    return 'all';
  };

  const filteredSessions = sessions.filter(session => {
    const matchesEmployee = !selectedEmployee || session.employeeId === selectedEmployee;
    const matchesSearch = session.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;

    let matchesSession = true;
    if (sessionFilter !== 'all') {
      const sessionType = getSessionType(session.employeeId);
      matchesSession = sessionType === sessionFilter;
    }

    return matchesEmployee && matchesSearch && matchesStatus && matchesSession;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'paused':
        return <Badge variant="warning">Paused</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getFocusColor = (percent: number) => {
    if (percent >= 80) return 'text-green-600';
    if (percent >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleExportCSV = () => {
    const headers = ['Employee Name', 'Employee ID', 'Start Time', 'End Time', 'Duration', 'Focus Time', 'Focus %', 'Status', 'Screenshots'];
    const csvRows = [
      headers.join(','),
      ...filteredSessions.map(session => [
        `"${session.employeeName}"`,
        `"${session.employeeId}"`,
        `"${session.startTime}"`,
        `"${session.endTime}"`,
        `"${session.duration}"`,
        `"${session.focusTime}"`,
        session.focusPercent,
        session.status,
        session.screenshots
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sessions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 bg-white min-h-screen p-6">
      {/* Employee Sidebar */}
      <EmployeeSidebar
        employees={employeesForSidebar as any}
        selectedEmployeeId={selectedEmployee}
        onSelectEmployee={setSelectedEmployee}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Work Sessions</h1>
          <p className="text-gray-600">
            {selectedEmployee
              ? `Viewing sessions for ${employeesForSidebar.find(e => e.id === selectedEmployee)?.name || 'selected employee'}`
              : 'Select an employee from the sidebar to view their sessions'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="success">
            {isLoading ? '...' : filteredSessions.filter(s => s.status === 'active').length} Active
          </Badge>
          <Badge variant="info">
            {isLoading ? '...' : filteredSessions.length} Sessions
          </Badge>
          {selectedEmployee && (
            <Badge variant="outline">
              {sessions.length} Total
            </Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white shadow-sm border border-blue-100">
        <CardContent className="py-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <select
                value={sessionFilter}
                onChange={(e) => setSessionFilter(e.target.value)}
                className="bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Sessions</option>
                <option value="morning">Morning Session</option>
                <option value="afternoon">Afternoon Session</option>
                <option value="evening">Evening Session</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
              </select>
              <Button variant="outline" onClick={handleExportCSV}>
                Export CSV
              </Button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>
              {(startDate || endDate) && (
                <div className="pt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStartDate(getCurrentDate());
                      setEndDate(getCurrentDate());
                    }}
                  >
                    Reset Dates
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      {!selectedEmployee ? (
        <div className="flex items-center justify-center h-[calc(100vh-400px)]">
          <div className="text-center">
            <svg className="w-24 h-24 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Employee Selected</h3>
            <p className="text-gray-500">Select an employee from the sidebar to view their work sessions</p>
          </div>
        </div>
      ) : (
        <Card className="bg-white shadow-sm border border-blue-100">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Session Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Focus Time</TableHead>
                <TableHead>Focus %</TableHead>
                <TableHead>Screenshots</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-200 rounded-full animate-pulse"></div>
                        <div>
                          <div className="h-4 bg-blue-200 rounded w-32 mb-1 animate-pulse"></div>
                          <div className="h-3 bg-blue-200 rounded w-16 animate-pulse"></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><div className="h-4 bg-blue-200 rounded w-24 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-blue-200 rounded w-16 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-blue-200 rounded w-16 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-blue-200 rounded w-12 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-blue-200 rounded w-8 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-6 bg-blue-200 rounded w-16 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-8 bg-blue-200 rounded w-20 animate-pulse"></div></TableCell>
                  </TableRow>
                ))
              ) : filteredSessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-gray-600">
                      <svg className="w-16 h-16 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm">No sessions found for this employee on the selected date range.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSessions.map((session) => (
                  <TableRow
                    key={session.id}
                    className="hover:bg-blue-50"
                  >
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar
                          fallback={session.employeeAvatar}
                          size="sm"
                        />
                        <div>
                          <div className="font-medium text-gray-900">{session.employeeName}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">
                        <div className="text-gray-900">{session.startTime}</div>
                        <div className="text-gray-600">to {session.endTime}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-gray-900">{session.duration}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-gray-700">{session.focusTime}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className={`font-mono font-medium ${getFocusColor(session.focusPercent)}`}>
                          {session.focusPercent}%
                        </span>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            session.focusPercent >= 80
                              ? 'bg-green-500'
                              : session.focusPercent >= 70
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-gray-700">{session.screenshots}</span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(session.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          View Timeline
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default Sessions;
