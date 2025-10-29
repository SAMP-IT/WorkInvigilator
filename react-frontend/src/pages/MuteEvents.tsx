import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '../components/ui/Table';
import { mockMuteEvents, mockProfiles, mockSessions } from '../lib/mockData';
import { EmployeeSidebar } from '../components/dashboard/EmployeeSidebar';

interface MuteEvent {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeeDepartment: string;
  muteStartTime: string;
  muteEndTime: string;
  durationSeconds: number;
  detectionType: 'silence' | 'track_disabled' | 'hardware_mute';
  audioLevel: number;
  date: string;
  status: 'completed' | 'active';
  sessionId?: string;
}

const MuteEvents = () => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState<string>(getCurrentDate());
  const [endDate, setEndDate] = useState<string>(getCurrentDate());

  // Transform mock data
  const muteEvents = useMemo(() => {
    return mockMuteEvents
      .filter(event => {
        const eventDate = new Date(event.mute_start_time).toISOString().split('T')[0];
        const start = startDate || '';
        const end = endDate || '';

        if (start && eventDate < start) return false;
        if (end && eventDate > end) return false;
        return true;
      })
      .map(event => {
        const profile = mockProfiles.find(p => p.id === event.employee_id);
        const startTime = new Date(event.mute_start_time);
        const endTime = event.mute_end_time ? new Date(event.mute_end_time) : null;

        return {
          id: event.id,
          employeeId: event.employee_id,
          employeeName: profile?.name || 'Unknown',
          employeeEmail: profile?.email || '',
          employeeDepartment: profile?.department || 'N/A',
          muteStartTime: startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          muteEndTime: endTime ? endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Active',
          durationSeconds: event.duration_seconds,
          detectionType: event.detection_type as 'silence' | 'track_disabled' | 'hardware_mute',
          audioLevel: event.audio_level,
          date: startTime.toLocaleDateString(),
          status: event.status as 'completed' | 'active',
          sessionId: event.session_id,
        };
      })
      .sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return 0;
      });
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
    return muteEvents.filter(event => event.employeeId === selectedEmployeeId);
  }, [muteEvents, selectedEmployeeId]);

  const getDetectionTypeBadge = (type: string) => {
    switch (type) {
      case 'silence':
        return <Badge variant="warning">Silence</Badge>;
      case 'track_disabled':
        return <Badge variant="danger">Track Disabled</Badge>;
      case 'hardware_mute':
        return <Badge variant="danger">Hardware Mute</Badge>;
      default:
        return <Badge variant="default">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="danger">Active</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
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
          <h1 className="text-2xl font-semibold text-gray-900">Microphone Mute Events</h1>
          <p className="text-gray-600">
            {selectedEmployeeId
              ? `Viewing mute events for ${employeesForSidebar.find(e => e.id === selectedEmployeeId)?.name || 'selected employee'}`
              : 'Select an employee from the sidebar to view their mute events'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {selectedEmployeeId && (
            <>
              <Badge variant="danger">
                {filteredData.filter(e => e.status === 'active').length} Active
              </Badge>
              <Badge variant="info">
                {filteredData.length} Events
              </Badge>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {selectedEmployeeId && filteredData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white shadow-sm border border-blue-100">
            <CardContent className="py-4">
              <div className="text-sm text-gray-600">Total Events</div>
              <div className="text-2xl font-semibold text-gray-900">{filteredData.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm border border-blue-100">
            <CardContent className="py-4">
              <div className="text-sm text-gray-600">Active Mutes</div>
              <div className="text-2xl font-semibold text-red-600">
                {filteredData.filter(e => e.status === 'active').length}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm border border-blue-100">
            <CardContent className="py-4">
              <div className="text-sm text-gray-600">Total Duration</div>
              <div className="text-2xl font-semibold text-gray-900">
                {formatDuration(filteredData.reduce((sum, e) => sum + e.durationSeconds, 0))}
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

      {/* Mute Events Table */}
      {!selectedEmployeeId ? (
        <div className="flex items-center justify-center h-[calc(100vh-400px)]">
          <div className="text-center">
            <svg className="w-24 h-24 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Employee Selected</h3>
            <p className="text-gray-500">Select an employee from the sidebar to view their mute events</p>
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
                <TableHead>Detection Type</TableHead>
                <TableHead>Audio Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Session ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-gray-600">
                      <svg className="w-16 h-16 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      <p className="text-sm">No mute events found for this employee in the selected date range.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((event) => (
                  <TableRow key={event.id} className="hover:bg-blue-50">
                    <TableCell>
                      <span className="font-mono text-sm text-gray-700">{event.date}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-gray-900">{event.muteStartTime}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-gray-900">{event.muteEndTime}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-gray-700">{formatDuration(event.durationSeconds)}</span>
                    </TableCell>
                    <TableCell>
                      {getDetectionTypeBadge(event.detectionType)}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-gray-700">
                        {event.audioLevel !== undefined ? `${(event.audioLevel * 100).toFixed(1)}%` : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(event.status)}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-gray-600">{event.sessionId || 'N/A'}</span>
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

export default MuteEvents;
