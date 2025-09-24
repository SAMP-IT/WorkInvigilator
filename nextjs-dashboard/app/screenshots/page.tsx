'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

// Mock screenshot data
const recentScreenshots = [
  {
    id: '1',
    employeeId: '1',
    employeeName: 'Sarah Chen',
    timestamp: '24/09/2024 14:23',
    url: '/api/screenshots/1',
    size: '1.2MB',
    application: 'VS Code'
  },
  {
    id: '2',
    employeeId: '2',
    employeeName: 'Mike Johnson',
    timestamp: '24/09/2024 14:18',
    url: '/api/screenshots/2',
    size: '0.9MB',
    application: 'Figma'
  },
  {
    id: '3',
    employeeId: '3',
    employeeName: 'Lisa Wang',
    timestamp: '24/09/2024 14:15',
    url: '/api/screenshots/3',
    size: '1.1MB',
    application: 'Photoshop'
  },
  {
    id: '4',
    employeeId: '4',
    employeeName: 'David Kim',
    timestamp: '24/09/2024 14:12',
    url: '/api/screenshots/4',
    size: '0.8MB',
    application: 'IntelliJ'
  },
  {
    id: '5',
    employeeId: '1',
    employeeName: 'Sarah Chen',
    timestamp: '24/09/2024 14:08',
    url: '/api/screenshots/5',
    size: '1.0MB',
    application: 'Chrome'
  },
  {
    id: '6',
    employeeId: '2',
    employeeName: 'Mike Johnson',
    timestamp: '24/09/2024 14:05',
    url: '/api/screenshots/6',
    size: '1.3MB',
    application: 'Notion'
  },
  {
    id: '7',
    employeeId: '3',
    employeeName: 'Lisa Wang',
    timestamp: '24/09/2024 14:02',
    url: '/api/screenshots/7',
    size: '0.7MB',
    application: 'Slack'
  },
  {
    id: '8',
    employeeId: '4',
    employeeName: 'David Kim',
    timestamp: '24/09/2024 13:58',
    url: '/api/screenshots/8',
    size: '1.1MB',
    application: 'Terminal'
  },
  {
    id: '9',
    employeeId: '1',
    employeeName: 'Sarah Chen',
    timestamp: '24/09/2024 13:55',
    url: '/api/screenshots/9',
    size: '0.9MB',
    application: 'VS Code'
  },
  {
    id: '10',
    employeeId: '2',
    employeeName: 'Mike Johnson',
    timestamp: '24/09/2024 13:52',
    url: '/api/screenshots/10',
    size: '1.4MB',
    application: 'Figma'
  }
];

// Mock employee list
const employees = [
  { id: '1', name: 'Sarah Chen', department: 'Engineering' },
  { id: '2', name: 'Mike Johnson', department: 'Design' },
  { id: '3', name: 'Lisa Wang', department: 'Marketing' },
  { id: '4', name: 'David Kim', department: 'Engineering' }
];

// Mock employee-specific screenshots
const getEmployeeScreenshots = (employeeId: string) => {
  const baseScreenshots = [
    { timestamp: '24/09/2024 14:23', application: 'VS Code', size: '1.2MB' },
    { timestamp: '24/09/2024 14:08', application: 'Chrome', size: '1.0MB' },
    { timestamp: '24/09/2024 13:55', application: 'VS Code', size: '0.9MB' },
    { timestamp: '24/09/2024 13:42', application: 'Slack', size: '0.8MB' },
    { timestamp: '24/09/2024 13:30', application: 'Chrome', size: '1.1MB' },
    { timestamp: '24/09/2024 13:15', application: 'VS Code', size: '1.3MB' },
    { timestamp: '24/09/2024 13:02', application: 'Terminal', size: '0.7MB' },
    { timestamp: '24/09/2024 12:48', application: 'Chrome', size: '0.9MB' },
    { timestamp: '24/09/2024 12:35', application: 'VS Code', size: '1.0MB' },
    { timestamp: '24/09/2024 12:22', application: 'Slack', size: '0.8MB' },
    { timestamp: '24/09/2024 12:08', application: 'Chrome', size: '1.2MB' },
    { timestamp: '24/09/2024 11:55', application: 'VS Code', size: '1.1MB' }
  ];

  return baseScreenshots.map((screenshot, index) => ({
    id: `${employeeId}-${index + 1}`,
    employeeId,
    ...screenshot
  }));
};

export default function ScreenshotsPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  const displayedScreenshots = selectedEmployee === 'all'
    ? recentScreenshots
    : getEmployeeScreenshots(selectedEmployee);

  const selectedEmployeeName = selectedEmployee === 'all'
    ? 'All Employees'
    : employees.find(emp => emp.id === selectedEmployee)?.name || '';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink-hi">Screenshots</h1>
            <p className="text-ink-muted">Monitor employee activity through automatic screenshots</p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="info">
              {recentScreenshots.length} Today
            </Badge>
            <Button variant="outline">
              Download All
            </Button>
          </div>
        </div>

        {/* Employee Filter */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-ink-hi">
                  Filter by Employee:
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary min-w-48"
                >
                  <option value="all">All Employees</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} - {employee.department}
                    </option>
                  ))}
                </select>
                <Badge variant="outline">
                  {displayedScreenshots.length} screenshots
                </Badge>
              </div>
              {selectedEmployee !== 'all' && (
                <Button
                  variant="outline"
                  onClick={() => setSelectedEmployee('all')}
                >
                  Clear Filter
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Screenshots Section */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedEmployee === 'all' ? 'Recent Screenshots (Top 10)' : `Screenshots - ${selectedEmployeeName}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {displayedScreenshots.map((screenshot) => (
                <div
                  key={screenshot.id}
                  className="group relative bg-raised rounded-lg border border-line overflow-hidden hover:shadow-hover transition-all cursor-pointer"
                  onClick={() => setSelectedScreenshot(screenshot.id)}
                >
                  {/* Screenshot Placeholder */}
                  <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl mb-1">📸</div>
                      <div className="text-xs text-ink-muted">{screenshot.application}</div>
                    </div>
                  </div>

                  {/* Screenshot Info */}
                  <div className="p-3">
                    <div className="text-sm font-medium text-ink-hi mb-1">
                      {screenshot.employeeName || employees.find(emp => emp.id === screenshot.employeeId)?.name}
                    </div>
                    <div className="text-xs text-ink-muted mb-1 font-mono">
                      {screenshot.timestamp}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-muted">{screenshot.size}</span>
                      <Badge variant="outline" size="sm">
                        {screenshot.application}
                      </Badge>
                    </div>
                  </div>

                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex space-x-2">
                      <Button size="sm" variant="secondary">
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More (for employee-specific view) */}
            {selectedEmployee !== 'all' && displayedScreenshots.length > 10 && (
              <div className="flex justify-center mt-6">
                <Button variant="outline">
                  Load More Screenshots
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Screenshots Stats */}
        {selectedEmployee !== 'all' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="py-4">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-ink-hi font-mono">
                    {displayedScreenshots.length}
                  </div>
                  <div className="text-sm text-ink-muted">Total Screenshots Today</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-ink-hi font-mono">
                    {Math.round(displayedScreenshots.length / 8)} /hr
                  </div>
                  <div className="text-sm text-ink-muted">Average per Hour</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-ink-hi font-mono">
                    {displayedScreenshots.reduce((total, s) => total + parseFloat(s.size), 0).toFixed(1)}MB
                  </div>
                  <div className="text-sm text-ink-muted">Total Size</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Screenshot Modal */}
        {selectedScreenshot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
            <div className="relative max-w-4xl max-h-full p-4">
              <div className="bg-surface rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-line">
                  <h3 className="text-lg font-semibold text-ink-hi">Screenshot Preview</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedScreenshot(null)}
                  >
                    ✕
                  </Button>
                </div>
                <div className="p-4">
                  <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center mb-4">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📸</div>
                      <div className="text-ink-muted">Screenshot Preview</div>
                      <div className="text-sm text-ink-muted mt-2">
                        {displayedScreenshots.find(s => s.id === selectedScreenshot)?.timestamp}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center space-x-3">
                    <Button>
                      Download Original
                    </Button>
                    <Button variant="outline">
                      View Metadata
                    </Button>
                    <Button variant="outline">
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}