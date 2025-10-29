import { useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface Employee {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  department: string;
  status: 'online' | 'offline';
  productivity: number;
  salary?: number;
  hourlyRate?: number;
}

interface Screenshot {
  id: string;
  screenshot_url: string;
  captured_at: string;
  activity_level: 'high' | 'medium' | 'low';
}

interface AudioRecording {
  id: string;
  audio_url: string;
  duration: number;
  recorded_at: string;
}

interface Session {
  id: string;
  start_time: string;
  end_time: string | null;
  active_time: number;
  idle_time: number;
  break_time: number;
  applications: string[];
}

interface EmployeeDetailViewProps {
  employee: Employee | null;
  screenshots: Screenshot[];
  audioRecordings: AudioRecording[];
  todaySession: Session | null;
  totalSessions: number;
}

export function EmployeeDetailView({
  employee,
  screenshots,
  audioRecordings,
  todaySession,
  totalSessions,
}: EmployeeDetailViewProps) {
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Show default message when no employee selected
  if (!employee) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <svg
            className="w-24 h-24 mx-auto mb-4 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Employee Selected</h3>
          <p className="text-gray-500">Select an employee from the sidebar to view details</p>
        </div>
      </div>
    );
  }

  // Calculate work hours and break time
  const workHours = todaySession
    ? (todaySession.active_time / 3600).toFixed(1)
    : '0.0';
  const breakTime = todaySession
    ? (todaySession.break_time / 60).toFixed(0)
    : '0';
  const idleTime = todaySession
    ? (todaySession.idle_time / 60).toFixed(0)
    : '0';

  // Format time
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownloadAudio = (audioUrl: string) => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `audio-${employee.name}-${Date.now()}.mp3`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <img
              src={employee.avatar_url}
              alt={employee.name}
              className="w-20 h-20 rounded-xl border-4 border-white shadow-lg"
            />
            <div
              className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-4 border-white ${
                employee.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
              }`}
            ></div>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{employee.name}</h2>
            <p className="text-gray-600">{employee.email}</p>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant={employee.status === 'online' ? 'success' : 'default'}>
                {employee.status}
              </Badge>
              <Badge variant="info">{employee.department}</Badge>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Productivity</p>
            <p className="text-3xl font-bold text-blue-600">{employee.productivity}%</p>
          </div>
        </div>
      </Card>

      {/* KPI Tiles Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Salary/Hourly Rate */}
        <Card className="p-4 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-semibold text-gray-600 uppercase">Salary</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {employee.salary ? `$${employee.salary.toLocaleString()}` : employee.hourlyRate ? `$${employee.hourlyRate}/hr` : 'N/A'}
          </p>
        </Card>

        {/* Session Start Time */}
        <Card className="p-4 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-semibold text-gray-600 uppercase">Start Time</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {todaySession ? formatTime(todaySession.start_time) : '--:--'}
          </p>
        </Card>

        {/* Session End Time */}
        <Card className="p-4 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-semibold text-gray-600 uppercase">End Time</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {todaySession?.end_time ? formatTime(todaySession.end_time) : 'Active'}
          </p>
        </Card>

        {/* Work Hours */}
        <Card className="p-4 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-semibold text-gray-600 uppercase">Work Hours</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{workHours}h</p>
        </Card>

        {/* Break Time */}
        <Card className="p-4 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-semibold text-gray-600 uppercase">Break Time</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{breakTime}m</p>
        </Card>

        {/* Idle Time */}
        <Card className="p-4 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-semibold text-gray-600 uppercase">Idle Time</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{idleTime}m</p>
        </Card>

        {/* Applications Used */}
        <Card className="p-4 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-xs font-semibold text-gray-600 uppercase">Apps Used</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {todaySession?.applications.length || 0}
          </p>
        </Card>

        {/* Total Sessions */}
        <Card className="p-4 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-xs font-semibold text-gray-600 uppercase">Total Sessions</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalSessions}</p>
        </Card>
      </div>

      {/* Applications List */}
      {todaySession && todaySession.applications.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Applications Used Today</h3>
          <div className="flex flex-wrap gap-2">
            {todaySession.applications.map((app, index) => (
              <Badge key={index} variant="default" className="px-3 py-1">
                {app}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Screenshots */}
      {screenshots.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Screenshots</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {screenshots.slice(0, 2).map((screenshot) => (
              <div
                key={screenshot.id}
                className="group relative cursor-pointer overflow-hidden rounded-xl border-2 border-gray-200 hover:border-blue-500 transition-all duration-300"
                onClick={() => setSelectedScreenshot(screenshot)}
              >
                <img
                  src={screenshot.screenshot_url}
                  alt="Screenshot"
                  className="w-full h-[200px] object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-semibold">
                        {new Date(screenshot.captured_at).toLocaleString()}
                      </span>
                      <Badge
                        variant={
                          screenshot.activity_level === 'high'
                            ? 'success'
                            : screenshot.activity_level === 'medium'
                            ? 'warning'
                            : 'default'
                        }
                      >
                        {screenshot.activity_level}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <svg
                    className="w-12 h-12 text-white drop-shadow-lg"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                    />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Audio Recording */}
      {audioRecordings.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Audio Recording</h3>
          {audioRecordings.slice(0, 1).map((audio) => (
            <div key={audio.id} className="bg-gray-50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">Recorded at</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(audio.recorded_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDuration(audio.duration)}
                  </p>
                </div>
              </div>

              {/* Waveform Visualization (Simplified) */}
              <div className="flex items-center space-x-1 h-16 mb-4">
                {Array.from({ length: 50 }).map((_, i) => {
                  const height = Math.random() * 60 + 20;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-blue-500 rounded-full transition-all duration-200"
                      style={{
                        height: `${height}%`,
                        opacity: isPlaying ? 0.8 : 0.4,
                      }}
                    ></div>
                  );
                })}
              </div>

              {/* Audio Controls */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {isPlaying ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <div className="flex-1">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="0"
                    className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
                <button
                  onClick={() => handleDownloadAudio(audio.audio_url)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span className="font-semibold">Download</span>
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Screenshot Modal (90% of screen) */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div
            className="relative w-[90vw] h-[90vh] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border-2 border-blue-500"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Image */}
            <img
              src={selectedScreenshot.screenshot_url}
              alt="Screenshot"
              className="w-full h-full object-contain"
            />

            {/* Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-lg font-semibold mb-1">
                    {new Date(selectedScreenshot.captured_at).toLocaleString()}
                  </p>
                  <p className="text-gray-300 text-sm">Employee: {employee.name}</p>
                </div>
                <Badge
                  variant={
                    selectedScreenshot.activity_level === 'high'
                      ? 'success'
                      : selectedScreenshot.activity_level === 'medium'
                      ? 'warning'
                      : 'default'
                  }
                  size="lg"
                >
                  {selectedScreenshot.activity_level} activity
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
