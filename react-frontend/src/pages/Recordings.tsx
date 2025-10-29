import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { mockRecordings, mockProfiles, mockSessions } from '../lib/mockData';

interface Recording {
  id: string;
  session_id: string;
  employee_id: string;
  video_url: string;
  duration: number;
  start_time: string;
  end_time: string;
  file_size: number;
  created_at: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Session {
  id: string;
  employee_id: string;
  start_time: string;
  end_time: string | null;
  status: string;
  productivity_score: number;
}

const Recordings = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [expandedRecording, setExpandedRecording] = useState<string | null>(null);

  // Use mock data
  const recordings: Recording[] = mockRecordings;
  const profiles: Profile[] = mockProfiles;
  const sessions: Session[] = mockSessions;

  // Filter recordings by selected employee
  const filteredRecordings = useMemo(() => {
    if (selectedEmployee === 'all') {
      return recordings;
    }
    return recordings.filter(rec => rec.employee_id === selectedEmployee);
  }, [recordings, selectedEmployee]);

  // Get employee name by ID
  const getEmployeeName = (employeeId: string): string => {
    const profile = profiles.find(p => p.id === employeeId);
    return profile?.name || 'Unknown';
  };

  // Get session details by ID
  const getSession = (sessionId: string) => {
    return sessions.find(s => s.id === sessionId);
  };

  // Format duration from seconds
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get unique employees who have recordings
  const employeesWithRecordings = useMemo(() => {
    const uniqueEmployeeIds = Array.from(new Set(recordings.map(r => r.employee_id)));
    return profiles.filter(p => uniqueEmployeeIds.includes(p.id));
  }, [recordings, profiles]);

  return (
    <div className="space-y-6 bg-white min-h-screen p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Video Recordings</h1>
          <p className="text-gray-600">View and manage employee session recordings</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="info">
            {filteredRecordings.length} {filteredRecordings.length === 1 ? 'Recording' : 'Recordings'}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white shadow-sm border border-blue-100">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Employees</option>
                {employeesWithRecordings.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedEmployee !== 'all' && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEmployee('all')}
                >
                  Clear Filter
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Video Recordings */}
      <Card className="bg-white shadow-sm border border-blue-100">
        <CardHeader>
          <CardTitle>
            {selectedEmployee === 'all'
              ? 'All Video Recordings'
              : `Video Recordings - ${getEmployeeName(selectedEmployee)}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRecordings.length > 0 ? (
            <div className="space-y-4">
              {filteredRecordings.map((recording) => {
                const session = getSession(recording.session_id);
                const isExpanded = expandedRecording === recording.id;

                return (
                  <div key={recording.id} className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-sm font-medium text-gray-900">
                            {getEmployeeName(recording.employee_id)} - Session Recording
                          </h3>
                          <Badge size="sm" variant="outline">
                            {formatDuration(recording.duration)}
                          </Badge>
                          <Badge size="sm" variant="info">
                            {formatFileSize(recording.file_size)}
                          </Badge>
                          {session && (
                            <Badge
                              size="sm"
                              variant={session.productivity_score >= 85 ? 'success' : session.productivity_score >= 70 ? 'warning' : 'danger'}
                            >
                              {session.productivity_score}% Productivity
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-col space-y-1 text-xs text-gray-600">
                          <div className="flex items-center space-x-4">
                            <span>Start: {formatTimestamp(recording.start_time)}</span>
                            <span>•</span>
                            <span>End: {formatTimestamp(recording.end_time)}</span>
                          </div>
                          {session && (
                            <div className="flex items-center space-x-4">
                              <span>Session Status: <Badge size="sm" variant={session.status === 'completed' ? 'success' : 'warning'}>{session.status}</Badge></span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedRecording(isExpanded ? null : recording.id)}
                        >
                          {isExpanded ? 'Hide Video' : 'Show Video'}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Video Player */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-blue-200">
                        <div className="bg-black rounded-lg overflow-hidden">
                          <video
                            controls
                            className="w-full max-h-96"
                            preload="metadata"
                            src={recording.video_url}
                          >
                            Your browser does not support the video element.
                          </video>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                          <span>Recording ID: {recording.id}</span>
                          <a
                            href={recording.video_url}
                            download
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Download Recording
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-600">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <p className="mt-2 text-sm">No recordings found.</p>
              {selectedEmployee !== 'all' && (
                <p className="text-xs mt-1">Try selecting a different employee or clearing filters.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Recordings;
