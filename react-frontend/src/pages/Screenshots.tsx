import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { mockScreenshots, mockProfiles, mockSessions } from '../lib/mockData';

interface Screenshot {
  id: string;
  employeeId: string;
  employeeName: string;
  timestamp: string;
  url: string;
  size: string;
  application: string;
  filename?: string;
  backupUrl?: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  department?: string;
}

const Screenshots = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState<string>(getCurrentDate());
  const [endDate, setEndDate] = useState<string>(getCurrentDate());

  // Transform mock data to match the component's expected format
  const employees: Employee[] = useMemo(() => {
    return mockProfiles
      .filter(profile => profile.role === 'employee')
      .map(profile => ({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        department: 'Engineering', // Mock department data
      }));
  }, []);

  const screenshots: Screenshot[] = useMemo(() => {
    return mockScreenshots.map(screenshot => {
      const profile = mockProfiles.find(p => p.id === screenshot.employee_id);
      const session = mockSessions.find(s => s.id === screenshot.session_id);

      return {
        id: screenshot.id,
        employeeId: screenshot.employee_id,
        employeeName: profile?.name || 'Unknown Employee',
        timestamp: screenshot.captured_at, // Keep as ISO string for filtering
        url: screenshot.screenshot_url,
        size: '1.2 MB', // Mock size
        application: screenshot.applications[0] || 'Unknown',
        filename: `screenshot_${screenshot.id}.png`,
        backupUrl: screenshot.thumbnail_url,
      };
    });
  }, []);

  const isLoading = false;

  // Filter by department, employee, and date range
  const displayedScreenshots = screenshots.filter(s => {
    const employee = employees.find(emp => emp.id === s.employeeId);
    const matchesDepartment = selectedDepartment === 'all' || employee?.department === selectedDepartment;
    const matchesEmployee = selectedEmployee === 'all' || s.employeeId === selectedEmployee;

    // Parse screenshot timestamp for date filtering
    const screenshotDate = new Date(s.timestamp).toISOString().split('T')[0];
    const matchesStartDate = !startDate || screenshotDate >= startDate;
    const matchesEndDate = !endDate || screenshotDate <= endDate;

    return matchesDepartment && matchesEmployee && matchesStartDate && matchesEndDate;
  });

  const filteredEmployees = selectedDepartment === 'all'
    ? employees
    : employees.filter(emp => emp.department === selectedDepartment);

  const departments = Array.from(new Set(employees.map(emp => emp.department).filter(Boolean))).sort();

  const handleDownload = async (screenshotId: string) => {
    const screenshot = displayedScreenshots.find(s => s.id === screenshotId);
    if (!screenshot?.url) return;

    try {
      const response = await fetch(screenshot.url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = screenshot.filename || `screenshot_${screenshot.timestamp}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      window.location.href = screenshot.url;
    }
  };

  const handleDownloadAll = async () => {
    for (let i = 0; i < displayedScreenshots.length; i++) {
      const screenshot = displayedScreenshots[i];
      if (screenshot.url) {
        await handleDownload(screenshot.id);
        if (i < displayedScreenshots.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
  };

  return (
    <div className="space-y-6 bg-white min-h-screen p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Screenshots</h1>
          <p className="text-gray-600">Monitor employee activity through automatic screenshots</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="info">
            {isLoading ? '...' : screenshots.length} Total
          </Badge>
          <Button variant="outline" onClick={handleDownloadAll} disabled={displayedScreenshots.length === 0}>
            Download All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white shadow-sm border border-blue-100">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setSelectedEmployee('all');
                }}
                className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
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
                {filteredEmployees.sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} - {employee.department}
                  </option>
                ))}
              </select>
            </div>
            <div>
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
            <div>
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
          </div>
          {(selectedEmployee !== 'all' || selectedDepartment !== 'all' || startDate || endDate) && (
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Badge variant="outline">
                  {displayedScreenshots.length} screenshots
                </Badge>
                {(startDate || endDate) && (
                  <p className="text-sm text-gray-600">
                    {startDate && endDate ? `${startDate} to ${endDate}` :
                     startDate ? `From ${startDate}` :
                     `Until ${endDate}`}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedEmployee('all');
                  setSelectedDepartment('all');
                  setStartDate(getCurrentDate());
                  setEndDate(getCurrentDate());
                }}
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Screenshots Grid */}
      <Card className="bg-white shadow-sm border border-blue-100">
        <CardHeader>
          <CardTitle>
            {selectedEmployee === 'all' ? 'Recent Screenshots' : `Screenshots - ${employees.find(e => e.id === selectedEmployee)?.name}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-blue-50 rounded-lg border border-blue-100 overflow-hidden">
                  <div className="aspect-video bg-blue-200 animate-pulse"></div>
                  <div className="p-3">
                    <div className="h-4 bg-blue-200 rounded mb-2 animate-pulse"></div>
                    <div className="h-3 bg-blue-200 rounded mb-1 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : displayedScreenshots.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              {selectedEmployee === 'all' ? 'No screenshots found.' : 'No screenshots found for this employee.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {displayedScreenshots.map((screenshot) => (
                <div
                  key={screenshot.id}
                  className="group relative bg-white rounded-lg border border-blue-100 overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => setSelectedScreenshot(screenshot.id)}
                >
                  <div className="aspect-video bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center overflow-hidden">
                    {screenshot.url ? (
                      <img
                        src={screenshot.url}
                        alt={`Screenshot by ${screenshot.employeeName}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="text-xs text-gray-500">{screenshot.application || 'No preview'}</div>
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      {screenshot.employeeName || employees.find(emp => emp.id === screenshot.employeeId)?.name}
                    </div>
                    <div className="text-xs text-gray-600 mb-1 font-mono">
                      {new Date(screenshot.timestamp).toLocaleString()}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{screenshot.size}</span>
                      <Badge variant="outline" size="sm">
                        {screenshot.application}
                      </Badge>
                    </div>
                  </div>

                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedScreenshot(screenshot.id);
                        }}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(screenshot.id);
                        }}
                      >
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Screenshot Modal - 90% viewport */}
      {selectedScreenshot && (() => {
        const screenshot = displayedScreenshots.find(s => s.id === selectedScreenshot);
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in"
            onClick={() => setSelectedScreenshot(null)}
          >
            <div
              className="relative w-[90vw] h-[90vh] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border-2 border-blue-500"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="absolute top-4 right-4 z-10 bg-red-500 hover:bg-red-600 rounded-full p-3 transition-all duration-200 shadow-2xl"
                title="Close"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Download Button */}
              <button
                onClick={() => screenshot && handleDownload(screenshot.id)}
                className="absolute top-4 left-4 z-10 bg-green-500 hover:bg-green-600 rounded-full p-3 transition-all duration-200 shadow-2xl"
                title="Download"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>

              {/* Image */}
              {screenshot?.url ? (
                <img
                  src={screenshot.url}
                  alt="Screenshot preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-white text-center">
                    <p className="text-xl">Screenshot not available</p>
                  </div>
                </div>
              )}

              {/* Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-lg font-semibold mb-1">
                      {screenshot?.employeeName}
                    </p>
                    <p className="text-gray-300 text-sm">
                      {screenshot ? new Date(screenshot.timestamp).toLocaleString() : ''}
                    </p>
                  </div>
                  {screenshot && (
                    <div className="flex items-center space-x-3">
                      <Badge variant="info" size="lg">
                        {screenshot.application}
                      </Badge>
                      <span className="text-white text-sm">{screenshot.size}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Screenshots;
