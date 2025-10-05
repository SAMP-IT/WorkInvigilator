'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';

interface Screenshot {
  id: string;
  employeeId: string;
  employeeName: string;
  timestamp: string;
  url: string;
  size: string;
  application: string;
  filename?: string;
}

interface Employee {
  id: string;
  name: string;
  department?: string;
}

export default function ScreenshotsPage() {
  const { profile } = useAuth();
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const displayedScreenshots = selectedEmployee === 'all'
    ? screenshots
    : screenshots.filter(s => s.employeeId === selectedEmployee);

  const selectedEmployeeName = selectedEmployee === 'all'
    ? 'All Employees'
    : employees.find(emp => emp.id === selectedEmployee)?.name || '';

  useEffect(() => {
    loadData();
  }, [selectedEmployee, startDate, endDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!profile?.organization_id) {
        setError('No organization found');
        setLoading(false);
        return;
      }

      // Load employees first
      const employeesResponse = await fetch(`/api/employees?organizationId=${profile.organization_id}`);
      if (!employeesResponse.ok) {
        throw new Error('Failed to fetch employees');
      }
      const employeesData = await employeesResponse.json();
      setEmployees(employeesData.employees || []);

      // Load screenshots with organization filter and date range
      let screenshotsUrl = selectedEmployee === 'all'
        ? `/api/screenshots?organizationId=${profile.organization_id}`
        : `/api/screenshots?employeeId=${selectedEmployee}&organizationId=${profile.organization_id}`;

      if (startDate) screenshotsUrl += `&startDate=${startDate}`;
      if (endDate) screenshotsUrl += `&endDate=${endDate}`;

      const screenshotsResponse = await fetch(screenshotsUrl);
      if (!screenshotsResponse.ok) {
        throw new Error('Failed to fetch screenshots');
      }

      const screenshotsData = await screenshotsResponse.json();
      setScreenshots(screenshotsData.screenshots || []);
      setTotalCount(screenshotsData.totalCount || 0);
    } catch (err) {
      setError('Failed to load screenshots. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (screenshotId: string) => {
    try {
      const response = await fetch(`/api/screenshots?id=${screenshotId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete screenshot');
      }

      // Refresh screenshots
      await loadData();
      setSelectedScreenshot(null);
    } catch (err) {
      setError('Failed to delete screenshot. Please try again.');
    }
  };

  const handleDownload = async (screenshotId: string) => {
    const screenshot = displayedScreenshots.find(s => s.id === screenshotId);
    if (!screenshot?.url) return;

    try {
      // Fetch the file as a blob to avoid CORS issues and prevent opening in new tab
      const response = await fetch(screenshot.url);
      const blob = await response.blob();
      
      // Create a blob URL and download
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = screenshot.filename || `screenshot_${screenshot.timestamp}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback to direct download
      window.location.href = screenshot.url;
    }
  };

  const handleDownloadAll = async () => {
    for (let i = 0; i < displayedScreenshots.length; i++) {
      const screenshot = displayedScreenshots[i];
      if (screenshot.url) {
        await handleDownload(screenshot.id);
        // Add small delay between downloads
        if (i < displayedScreenshots.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
  };

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
              {loading ? '...' : totalCount} Total
            </Badge>
            <Button variant="outline" onClick={handleDownloadAll} disabled={displayedScreenshots.length === 0}>
              Download All
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-hi mb-2">
                  Employee
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Employees</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} - {employee.department}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-hi mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-hi mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Badge variant="outline">
                  {displayedScreenshots.length} screenshots
                </Badge>
                {(startDate || endDate) && (
                  <p className="text-sm text-ink-muted">
                    {startDate && endDate ? `${startDate} to ${endDate}` :
                     startDate ? `From ${startDate}` :
                     `Until ${endDate}`}
                  </p>
                )}
              </div>
              {(selectedEmployee !== 'all' || startDate || endDate) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedEmployee('all');
                    setStartDate('');
                    setEndDate('');
                  }}
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Screenshots Section */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedEmployee === 'all' ? 'Recent Screenshots' : `Screenshots - ${selectedEmployeeName}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="bg-raised rounded-lg border border-line overflow-hidden">
                    <div className="aspect-video bg-gray-300 animate-pulse"></div>
                    <div className="p-3">
                      <div className="h-4 bg-gray-300 rounded mb-2 animate-pulse"></div>
                      <div className="h-3 bg-gray-300 rounded mb-1 animate-pulse"></div>
                      <div className="flex justify-between">
                        <div className="h-3 bg-gray-300 rounded w-12 animate-pulse"></div>
                        <div className="h-5 bg-gray-300 rounded w-16 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-danger text-sm mb-2">{error}</div>
                <Button variant="outline" size="sm" onClick={loadData}>
                  Try Again
                </Button>
              </div>
            ) : displayedScreenshots.length === 0 ? (
              <div className="text-center py-8 text-ink-muted">
                {selectedEmployee === 'all' ? 'No screenshots found.' : 'No screenshots found for this employee.'}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {displayedScreenshots.map((screenshot) => (
                <div
                  key={screenshot.id}
                  className="group relative bg-raised rounded-lg border border-line overflow-hidden hover:shadow-hover transition-all cursor-pointer"
                  onClick={() => setSelectedScreenshot(screenshot.id)}
                >
                  {/* Screenshot Image */}
                  <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden">
                    {screenshot.url ? (
                      <img
                        src={screenshot.url}
                        alt={`Screenshot by ${screenshot.employeeName}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to placeholder if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = `
                            <div class="text-center">
                              <div class="text-2xl mb-1">📸</div>
                              <div class="text-xs text-ink-muted">${screenshot.application || 'Screenshot'}</div>
                            </div>
                          `;
                        }}
                      />
                    ) : (
                      <div className="text-center">
                        <div className="text-2xl mb-1">📸</div>
                        <div className="text-xs text-ink-muted">{screenshot.application || 'No preview'}</div>
                      </div>
                    )}
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
                      <Button
                        size="sm"
                        variant="secondary"
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

            {/* Load More (for employee-specific view) */}
            {!loading && selectedEmployee !== 'all' && displayedScreenshots.length > 10 && (
              <div className="flex justify-center mt-6">
                <Button variant="outline">
                  Load More Screenshots
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Screenshots Stats */}
        {!loading && selectedEmployee !== 'all' && displayedScreenshots.length > 0 && (
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
                  <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                    {(() => {
                      const screenshot = displayedScreenshots.find(s => s.id === selectedScreenshot);
                      return screenshot?.url ? (
                        <img
                          src={screenshot.url}
                          alt="Screenshot preview"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-center">
                          <div className="text-6xl mb-4">📸</div>
                          <div className="text-ink-muted">Screenshot Preview</div>
                          <div className="text-sm text-ink-muted mt-2">
                            {screenshot?.timestamp}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex justify-center space-x-3">
                    <Button onClick={() => selectedScreenshot && handleDownload(selectedScreenshot)}>
                      Download Original
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