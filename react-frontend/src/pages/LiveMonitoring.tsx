import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { mockProfiles, mockSessions, mockScreenshots } from '../lib/mockData';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface GridSize {
  cols: number;
  rows: number;
  max: number;
}

const GRID_SIZES: Record<string, GridSize> = {
  '2': { cols: 2, rows: 1, max: 2 },
  '4': { cols: 2, rows: 2, max: 4 },
  '8': { cols: 2, rows: 4, max: 8 },
  '12': { cols: 2, rows: 6, max: 12 },
  '18': { cols: 2, rows: 9, max: 18 },
  '24': { cols: 2, rows: 12, max: 24 },
  '36': { cols: 2, rows: 18, max: 36 },
  '50': { cols: 2, rows: 25, max: 50 }
};

interface ActiveEmployee {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  currentScreenshot: number;
  isOnline: boolean;
}

export default function LiveMonitoring() {
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const [activeStreams, setActiveStreams] = useState<Set<string>>(new Set());
  const [gridSize, setGridSize] = useState<string>('4');
  const [isConnected] = useState(true); // Always connected in mock mode
  const [mutedStreams, setMutedStreams] = useState<Set<string>>(new Set());
  const [cameraEnabled, setCameraEnabled] = useState<Set<string>>(new Set());
  const [modalUserId, setModalUserId] = useState<string | null>(null);

  // Get online employees (those with active sessions)
  const [onlineEmployees, setOnlineEmployees] = useState<ActiveEmployee[]>([]);

  // Initialize online employees from mock data
  useEffect(() => {
    const activeSessions = mockSessions.filter(session => session.status === 'active');
    const employees = activeSessions.map(session => {
      const employee = mockProfiles.find(p => p.id === session.employee_id);
      return {
        id: session.employee_id,
        name: employee?.name || 'Unknown',
        email: employee?.email || 'unknown@email.com',
        avatar_url: employee?.avatar_url || '',
        currentScreenshot: 0,
        isOnline: true
      };
    });
    setOnlineEmployees(employees);

    // Auto-start streams for first few employees (up to grid capacity)
    const currentSize = GRID_SIZES[gridSize];
    const autoStartIds = employees.slice(0, currentSize.max).map(e => e.id);
    setActiveStreams(new Set(autoStartIds));
  }, [gridSize]);

  // Simulate live feed by rotating through screenshots for each employee
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineEmployees(prev =>
        prev.map(emp => {
          // Get screenshots for this employee
          const employeeScreenshots = mockScreenshots.filter(s => s.employee_id === emp.id);
          if (employeeScreenshots.length === 0) return emp;

          // Rotate to next screenshot
          const nextIndex = (emp.currentScreenshot + 1) % employeeScreenshots.length;
          return {
            ...emp,
            currentScreenshot: nextIndex
          };
        })
      );
    }, 3000); // Change screenshot every 3 seconds to simulate live feed

    return () => clearInterval(interval);
  }, []);

  const toggleMute = (userId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setMutedStreams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleCamera = (userId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setCameraEnabled(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };


  const toggleStream = (userId: string) => {
    if (activeStreams.has(userId)) {
      // Stop watching
      setActiveStreams(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });

      // Clean up states
      setMutedStreams(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });

      setCameraEnabled(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    } else {
      // Start watching
      const currentSize = GRID_SIZES[gridSize];
      if (activeStreams.size < currentSize.max) {
        setActiveStreams(prev => new Set([...prev, userId]));
      } else {
        alert(`Maximum ${currentSize.max} streams in current grid size`);
      }
    }
  };

  // Get current screenshot for employee
  const getCurrentScreenshot = (employeeId: string) => {
    const employee = onlineEmployees.find(e => e.id === employeeId);
    if (!employee) return null;

    const employeeScreenshots = mockScreenshots.filter(s => s.employee_id === employeeId);
    if (employeeScreenshots.length === 0) {
      // Use a placeholder if no screenshots
      return 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800';
    }

    return employeeScreenshots[employee.currentScreenshot]?.screenshot_url || employeeScreenshots[0].screenshot_url;
  };

  const gridLayout = GRID_SIZES[gridSize];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Back Button */}
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back</span>
            </Button>

            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Live Employee Monitoring</h1>
              <p className="text-gray-600">
                Simulated live monitoring with mock data • {onlineEmployees.length} employees online
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-soft border border-gray-200">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium text-gray-700">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>

            {/* Grid Size Selector */}
            <div className="flex items-center space-x-2 bg-white rounded-lg shadow-soft p-2 border border-gray-200">
              <span className="text-sm font-medium text-gray-600">Grid:</span>
              {Object.keys(GRID_SIZES).map(size => (
                <button
                  key={size}
                  onClick={() => setGridSize(size)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    gridSize === size
                      ? 'bg-gradient-primary text-white shadow-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Stream Grid */}
        <div className="col-span-9">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${gridLayout.cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${gridLayout.rows}, minmax(0, 1fr))`
            }}
          >
            {Array.from(activeStreams).map(userId => {
              const employee = onlineEmployees.find(e => e.id === userId);
              const screenshotUrl = getCurrentScreenshot(userId);

              return (
                <div
                  key={userId}
                  className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video shadow-medium border-2 border-blue-200 hover:border-blue-400 transition-all duration-200 cursor-pointer"
                  onClick={() => setModalUserId(userId)}
                >
                  {/* Screenshot as "Live Feed" */}
                  <img
                    src={screenshotUrl || ''}
                    alt={`${employee?.name} screen`}
                    className="w-full h-full object-cover bg-black"
                  />

                  {/* Stream Info Overlay */}
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{employee?.name}</p>
                        <p className="text-xs text-gray-300">{employee?.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-medium text-red-200">LIVE</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStream(userId);
                        }}
                        className="bg-red-500 hover:bg-red-600 rounded-full p-2 transition-all duration-200 shadow-medium"
                        title="Stop watching"
                      >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Camera Overlay (Picture-in-Picture style) */}
                  {cameraEnabled.has(userId) && (
                    <div className="absolute bottom-16 right-3 w-32 h-24 bg-black rounded-lg overflow-hidden border-2 border-blue-500 shadow-2xl flex items-center justify-center">
                      <img
                        src={employee?.avatar_url}
                        alt={`${employee?.name} camera`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded font-semibold">CAM</div>
                    </div>
                  )}

                  {/* Stream Controls Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={(e) => toggleMute(userId, e)}
                        className="bg-white/90 hover:bg-white rounded-full p-2 transition-all duration-200 shadow-medium"
                        title={mutedStreams.has(userId) ? "Unmute" : "Mute"}
                      >
                        {mutedStreams.has(userId) ? (
                          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={(e) => toggleCamera(userId, e)}
                        className={`${
                          cameraEnabled.has(userId)
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-white/90 hover:bg-white text-gray-700'
                        } rounded-full p-2 transition-all duration-200 shadow-medium`}
                        title={cameraEnabled.has(userId) ? "Hide Camera" : "Show Camera"}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty Slots */}
            {Array.from({ length: gridLayout.max - activeStreams.size }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-dashed border-blue-300 aspect-video flex items-center justify-center"
              >
                <div className="text-center text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm font-medium">Empty Slot</p>
                </div>
              </div>
            ))}
          </div>

          {activeStreams.size === 0 && (
            <div className="text-center py-20 text-gray-500">
              <svg className="w-24 h-24 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <h3 className="text-xl font-semibold mb-2 text-gray-700">No Active Streams</h3>
              <p>Select employees from the sidebar to start monitoring</p>
            </div>
          )}
        </div>

        {/* Sidebar - Available Employees */}
        <div className="col-span-3">
          <Card className="bg-white shadow-medium">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Employees ({onlineEmployees.length})</h2>

            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              {onlineEmployees.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No employees online</p>
                </div>
              ) : (
                onlineEmployees.map(employee => (
                  <div
                    key={employee.id}
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      activeStreams.has(employee.id)
                        ? 'bg-gradient-primary text-white shadow-medium'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                    onClick={() => toggleStream(employee.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 ${
                        activeStreams.has(employee.id) ? 'bg-white/20' : 'bg-blue-100'
                      } rounded-full flex items-center justify-center flex-shrink-0`}>
                        <span className={`text-sm font-semibold ${
                          activeStreams.has(employee.id) ? 'text-white' : 'text-blue-700'
                        }`}>
                          {employee.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{employee.name}</p>
                        <p className="text-xs truncate opacity-75">{employee.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs font-medium opacity-75">Online</span>
                        </div>
                      </div>
                      {activeStreams.has(employee.id) && (
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Stats */}
          <Card className="bg-white shadow-medium mt-4">
            <h3 className="text-sm font-semibold mb-3 text-gray-600">Monitoring Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Active Streams:</span>
                <span className="font-semibold text-gray-900">{activeStreams.size}/{gridLayout.max}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Online Employees:</span>
                <span className="font-semibold text-gray-900">{onlineEmployees.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Grid Size:</span>
                <span className="font-semibold text-gray-900">{gridSize}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Full Screen Modal - 90% of screen */}
      {modalUserId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setModalUserId(null)}
        >
          <div
            className="relative w-[90vw] h-[90vh] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border-2 border-blue-500"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const employee = onlineEmployees.find(e => e.id === modalUserId);
              const screenshotUrl = getCurrentScreenshot(modalUserId);

              // Get current index and calculate previous/next
              const activeStreamsArray = Array.from(activeStreams);
              const currentIndex = activeStreamsArray.indexOf(modalUserId);
              const hasPrevious = currentIndex > 0;
              const hasNext = currentIndex < activeStreamsArray.length - 1;

              const goToPrevious = () => {
                if (hasPrevious) {
                  setModalUserId(activeStreamsArray[currentIndex - 1]);
                }
              };

              const goToNext = () => {
                if (hasNext) {
                  setModalUserId(activeStreamsArray[currentIndex + 1]);
                }
              };

              return (
                <>
                  {/* Close Button */}
                  <button
                    onClick={() => setModalUserId(null)}
                    className="absolute top-4 right-4 z-10 bg-red-500 hover:bg-red-600 rounded-full p-3 transition-all duration-200 shadow-2xl"
                    title="Close"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* Previous Button */}
                  {hasPrevious && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        goToPrevious();
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-blue-500 hover:bg-blue-600 rounded-full p-4 transition-all duration-200 shadow-2xl hover:scale-110 active:scale-95"
                      title="Previous Employee"
                    >
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}

                  {/* Next Button */}
                  {hasNext && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        goToNext();
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-blue-500 hover:bg-blue-600 rounded-full p-4 transition-all duration-200 shadow-2xl hover:scale-110 active:scale-95"
                      title="Next Employee"
                    >
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}

                  {/* Large Screenshot */}
                  <img
                    src={screenshotUrl || ''}
                    alt={`${employee?.name} screen`}
                    className="w-full h-full object-contain bg-black"
                  />

                  {/* Employee Info Overlay */}
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 to-transparent p-6">
                    <div className="flex items-center space-x-4">
                      <img
                        src={employee?.avatar_url}
                        alt={employee?.name}
                        className="w-16 h-16 rounded-full border-4 border-white/20"
                      />
                      <div>
                        <h2 className="text-2xl font-bold text-white">{employee?.name}</h2>
                        <p className="text-lg text-gray-300">{employee?.email}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-semibold text-red-200">LIVE MONITORING</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Controls Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
                    <div className="flex items-center justify-center space-x-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMute(modalUserId, e as any);
                        }}
                        className="bg-white/90 hover:bg-white rounded-full p-4 transition-all duration-200 shadow-2xl"
                        title={mutedStreams.has(modalUserId) ? "Unmute" : "Mute"}
                      >
                        {mutedStreams.has(modalUserId) ? (
                          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                        )}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCamera(modalUserId, e as any);
                        }}
                        className={`${
                          cameraEnabled.has(modalUserId) ? 'bg-blue-500 hover:bg-blue-600' : 'bg-white/90 hover:bg-white'
                        } rounded-full p-4 transition-all duration-200 shadow-2xl`}
                        title={cameraEnabled.has(modalUserId) ? "Hide Camera" : "Show Camera"}
                      >
                        <svg className={`w-6 h-6 ${cameraEnabled.has(modalUserId) ? 'text-white' : 'text-gray-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Camera Overlay in Modal */}
                  {cameraEnabled.has(modalUserId) && (
                    <div className="absolute bottom-24 right-8 w-64 h-48 bg-black rounded-xl overflow-hidden border-4 border-blue-500 shadow-2xl flex items-center justify-center">
                      <img
                        src={employee?.avatar_url}
                        alt={`${employee?.name} camera`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-blue-600 text-white text-sm px-2 py-1 rounded font-semibold">CAMERA</div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
