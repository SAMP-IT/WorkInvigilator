import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '../components/ui/Table';
import { mockBreakSessions, mockProfiles, mockSessions } from '../lib/mockData';
import { EmployeeSidebar } from '../components/dashboard/EmployeeSidebar';

interface BreakSession {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeeDepartment: string;
  breakDate: string;
  startTime: string;
  endTime: string;
  duration: string;
  durationMs: number;
  breakType: 'lunch' | 'short';
  status: 'completed' | 'active';
  sessionId?: string;
}

const Breaks = () => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState<string>(getCurrentDate());
  const [endDate, setEndDate] = useState<string>(getCurrentDate());

  // Transform mock data
  const breakSessions = useMemo(() => {
    return mockBreakSessions
      .filter(breakSession => {
        const sessionDate = new Date(breakSession.start_time).toISOString().split('T')[0];
        const start = startDate || '';
        const end = endDate || '';

        if (start && sessionDate < start) return false;
        if (end && sessionDate > end) return false;
        return true;
      })
      .map(breakSession => {
        const profile = mockProfiles.find(p => p.id === breakSession.employee_id);
        const startTime = new Date(breakSession.start_time);
        const endTime = new Date(breakSession.end_time);

        return {
          id: breakSession.id,
          employeeId: breakSession.employee_id,
          employeeName: profile?.name || 'Unknown',
          employeeEmail: profile?.email || '',
          employeeDepartment: profile?.department || 'N/A',
          breakDate: startTime.toLocaleDateString(),
          startTime: startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          endTime: endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          duration: formatDuration(breakSession.duration_ms),
          durationMs: breakSession.duration_ms,
          breakType: breakSession.break_type as 'lunch' | 'short',
          status: breakSession.status as 'completed' | 'active',
          sessionId: breakSession.session_id,
        };
      })
      .sort((a, b) => b.durationMs - a.durationMs);
  }, [startDate, endDate]);

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

  const filteredData = useMemo(() => {
    if (!selectedEmployeeId) return [];
    return breakSessions.filter(breakSession => breakSession.employeeId === selectedEmployeeId);
  }, [breakSessions, selectedEmployeeId]);

  const totalBreakTime = filteredData.reduce((sum, b) => sum + b.durationMs, 0);
  const avgBreakDuration = filteredData.length > 0 ? totalBreakTime / filteredData.length : 0;

  function formatDuration(ms: number) {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  }

  const getBreakTypeBadge = (type: string) => {
    switch (type) {
      case 'lunch':
        return <Badge variant="info">Lunch</Badge>;
      case 'short':
        return <Badge variant="outline">Short Break</Badge>;
      default:
        return <Badge variant="default">{type}</Badge>;
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Employee Name', 'Date', 'Start Time', 'End Time', 'Duration', 'Break Type'].join(','),
      ...filteredData.map(session =>
        [
          session.employeeName,
          session.breakDate,
          session.startTime,
          session.endTime,
          session.duration,
          session.breakType
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
    <div className="space-y-6 bg-white min-h-screen p-6">
      {/* Employee Sidebar */}
      <EmployeeSidebar
        employees={employeesForSidebar as any}
        selectedEmployeeId={selectedEmployeeId}
        onSelectEmployee={setSelectedEmployeeId}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Break Sessions</h1>
          <p className="text-gray-600">
            {selectedEmployeeId
              ? `Viewing break sessions for ${employeesForSidebar.find(e => e.id === selectedEmployeeId)?.name || 'selected employee'}`
              : 'Select an employee from the sidebar to view their break sessions'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {selectedEmployeeId && filteredData.length > 0 && (
            <>
              <Badge variant="info">
                {filteredData.length} Breaks
              </Badge>
              <Button variant="outline" onClick={handleExport}>
                Export CSV
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      {selectedEmployeeId && filteredData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white shadow-sm border border-blue-100">
            <CardContent className="py-4">
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900 font-mono">
                  {filteredData.length}
                </div>
                <div className="text-sm text-gray-600">Total Breaks</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm border border-blue-100">
            <CardContent className="py-4">
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900 font-mono">
                  {formatDuration(totalBreakTime)}
                </div>
                <div className="text-sm text-gray-600">Total Break Time</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm border border-blue-100">
            <CardContent className="py-4">
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900 font-mono">
                  {formatDuration(avgBreakDuration)}
                </div>
                <div className="text-sm text-gray-600">Average Duration</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Date Filters */}
      <Card className="bg-white shadow-sm border border-blue-100">
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Break Sessions Table */}
      {!selectedEmployeeId ? (
        <div className="flex items-center justify-center h-[calc(100vh-400px)]">
          <div className="text-center">
            <svg className="w-24 h-24 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Employee Selected</h3>
            <p className="text-gray-500">Select an employee from the sidebar to view their break sessions</p>
          </div>
        </div>
      ) : (
        <Card className="bg-white shadow-sm border border-blue-100">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Break Type</TableHead>
                <TableHead>Session ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-gray-600">
                      <svg className="w-16 h-16 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm">No break sessions found for this employee in the selected date range.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((session) => (
                  <TableRow key={session.id} className="hover:bg-blue-50">
                    <TableCell>
                      <span className="font-mono text-sm text-gray-700">{session.breakDate}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-gray-900">{session.startTime}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-gray-900">{session.endTime}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-gray-700 text-base font-semibold">{session.duration}</span>
                    </TableCell>
                    <TableCell>
                      {getBreakTypeBadge(session.breakType)}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-gray-600">{session.sessionId || 'N/A'}</span>
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

export default Breaks;
