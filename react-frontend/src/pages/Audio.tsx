import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmployeeSidebar } from '../components/dashboard/EmployeeSidebar';
import { mockRecordings, mockProfiles, mockSessions } from '../lib/mockData';

interface Recording {
  id: string;
  user_id: string;
  employeeName: string;
  filename: string;
  duration: number;
  durationFormatted?: string;
  file_url: string;
  created_at: string;
  timestamp?: string;
  type?: 'complete' | 'chunked';
  session_info?: {
    total_chunks: number;
    session_start_time: string;
    chunks: Array<{
      id: string;
      chunk_number: number;
      duration_seconds: number;
      chunk_start_time: string;
      file_url: string;
      filename: string;
    }>;
  };
}

interface Profile {
  id: string;
  name: string;
  email: string;
  department?: string;
}

const Audio = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);

  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState<string>(getCurrentDate());
  const [endDate, setEndDate] = useState<string>(getCurrentDate());

  // Get employees from mock data
  const employees = useMemo(() => {
    return mockProfiles
      .filter(profile => profile.role === 'employee')
      .map(profile => ({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        department: profile.department,
      }));
  }, []);

  // Get recordings from mock data
  const recordings = useMemo(() => {
    return mockRecordings.map(recording => {
      const profile = mockProfiles.find(p => p.id === recording.employee_id);
      return {
        id: recording.id,
        user_id: recording.employee_id,
        employeeName: profile?.name || 'Unknown',
        filename: `recording_${recording.id}.mp3`,
        duration: recording.duration * 1000, // Convert to milliseconds
        durationFormatted: `${Math.floor(recording.duration / 60)}:${(recording.duration % 60).toString().padStart(2, '0')}`,
        file_url: recording.video_url, // Using video_url as audio url for demo
        created_at: recording.created_at,
        timestamp: new Date(recording.created_at).toLocaleDateString(),
      };
    });
  }, []);

  const isLoading = false;

  // Filter recordings by selected employee
  const filteredRecordings = selectedEmployee
    ? recordings.filter(r => r.user_id === selectedEmployee)
    : [];

  // Prepare employee data for sidebar
  const employeesForSidebar = useMemo(() => {
    return employees.map(emp => {
      const empSessions = mockSessions.filter(s => s.employee_id === emp.id);
      const activeSession = empSessions.find(s => s.status === 'active');
      const avgProductivity = empSessions.length > 0
        ? Math.round(empSessions.reduce((sum, s) => sum + s.productivity_score, 0) / empSessions.length)
        : 0;

      const profile = mockProfiles.find(p => p.id === emp.id);

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        avatar_url: profile?.avatar_url || '',
        department: emp.department || '',
        status: activeSession ? ('online' as const) : ('offline' as const),
        productivity: avgProductivity,
      };
    });
  }, [employees]);

  const formatDuration = (duration: number) => {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = (recording: typeof filteredRecordings[0]) => {
    if (!recording.file_url) return;

    const link = document.createElement('a');
    link.href = recording.file_url;
    link.download = recording.filename || `audio_${recording.id}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <h1 className="text-2xl font-semibold text-gray-900">Audio Recordings</h1>
          <p className="text-gray-600">Listen to employee audio recordings</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="info">
            {recordings.length} Total Recordings
          </Badge>
          {selectedEmployee && (
            <Badge variant="outline">
              {filteredRecordings.length} for selected employee
            </Badge>
          )}
        </div>
      </div>

      {/* Date Range Filters */}
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

      {/* Audio Recordings */}
      {!selectedEmployee ? (
        <div className="flex items-center justify-center h-[calc(100vh-400px)]">
          <div className="text-center">
            <svg className="w-24 h-24 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Employee Selected</h3>
            <p className="text-gray-500">Select an employee from the sidebar to view their audio recordings</p>
          </div>
        </div>
      ) : (
        <Card className="bg-white shadow-sm border border-blue-100">
          <CardHeader>
            <CardTitle>
              Audio Recordings - {employees.find(e => e.id === selectedEmployee)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredRecordings.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <svg className="w-16 h-16 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <p className="text-sm">No audio recordings found for this employee.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRecordings.map((recording) => (
                  <div key={recording.id} className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 hover:shadow-lg transition-all duration-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-base font-semibold text-gray-900">
                            {recording.filename}
                          </h3>
                          <Badge size="sm" variant="info">
                            {recording.durationFormatted || formatDuration(recording.duration)}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-600">
                          <span className="flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>{recording.employeeName}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{new Date(recording.created_at).toLocaleString()}</span>
                          </span>
                        </div>
                      </div>

                      {/* Download Button */}
                      {recording.file_url && (
                        <button
                          onClick={() => handleDownload(recording)}
                          className="bg-green-500 hover:bg-green-600 text-white rounded-lg p-3 transition-all duration-200 shadow-md hover:shadow-lg"
                          title="Download Audio"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Waveform Visualization */}
                    <div className="mb-4">
                      <div className="flex items-end space-x-1 h-20 bg-white/50 rounded-lg p-2">
                        {Array.from({ length: 50 }).map((_, i) => {
                          const height = Math.random() * 60 + 20;
                          return (
                            <div
                              key={i}
                              className="flex-1 bg-gradient-to-t from-blue-500 to-indigo-500 rounded-full transition-all duration-200 hover:from-blue-600 hover:to-indigo-600"
                              style={{
                                height: `${height}%`,
                                opacity: isPlaying === recording.id ? 0.9 : 0.5,
                              }}
                            ></div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Audio Player */}
                    {recording.file_url ? (
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <audio
                          controls
                          className="w-full"
                          preload="metadata"
                          onPlay={() => setIsPlaying(recording.id)}
                          onPause={() => setIsPlaying(null)}
                          onEnded={() => setIsPlaying(null)}
                        >
                          <source src={recording.file_url} type="audio/webm" />
                          <source src={recording.file_url} type="audio/wav" />
                          <source src={recording.file_url} type="audio/mp3" />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg p-4 shadow-sm text-center">
                        <Badge variant="outline" size="sm">
                          No audio file available
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Audio;
