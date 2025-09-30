'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';

interface Employee {
  id: string;
  name: string;
  department?: string;
}

interface ReportData {
  period: string;
  workHours: string;
  focusTime: string;
  productivity: number;
  sessionsCount: number;
  screenshotsCount: number;
  applications: {
    name: string;
    time: string;
    percentage: number;
  }[];
  breakdowns?: {
    time: string;
    activity: string;
    focus: number;
  }[];
  dailyBreakdown?: {
    day: string;
    hours: string;
    focus: string;
    productivity: number;
  }[];
  weeklyBreakdown?: {
    week: string;
    hours: string;
    focus: string;
    productivity: number;
  }[];
}

export default function ReportsPage() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const selectedEmployeeName = employees.find(emp => emp.id === selectedEmployee)?.name || '';

  const exportToPDF = () => {
    if (!reportData) return;

    // Create printable content
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Report - ${selectedEmployeeName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #333; }
          h2 { color: #666; margin-top: 30px; }
          .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
          .metric { border: 1px solid #ddd; padding: 15px; text-align: center; }
          .metric-value { font-size: 24px; font-weight: bold; color: #333; }
          .metric-label { color: #666; font-size: 12px; margin-top: 5px; }
          .section { margin: 30px 0; }
          .app-item { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #eee; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { text-align: left; padding: 10px; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Employee Productivity Report</h1>
          <p><strong>Employee:</strong> ${selectedEmployeeName}</p>
          <p><strong>Period:</strong> ${reportData.period}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <div class="metrics">
          <div class="metric">
            <div class="metric-value">${reportData.workHours}</div>
            <div class="metric-label">Total Work Hours</div>
          </div>
          <div class="metric">
            <div class="metric-value">${reportData.focusTime}</div>
            <div class="metric-label">Focus Time</div>
          </div>
          <div class="metric">
            <div class="metric-value">${reportData.sessionsCount}</div>
            <div class="metric-label">Work Sessions</div>
          </div>
          <div class="metric">
            <div class="metric-value">${reportData.screenshotsCount}</div>
            <div class="metric-label">Screenshots</div>
          </div>
        </div>

        <div class="section">
          <h2>Productivity Score</h2>
          <p style="font-size: 32px; font-weight: bold; color: #22c55e;">${reportData.productivity}%</p>
        </div>

        <div class="section">
          <h2>Application Usage</h2>
          ${reportData.applications.map(app => `
            <div class="app-item">
              <span>${app.name}</span>
              <span>${app.time} (${app.percentage}%)</span>
            </div>
          `).join('')}
        </div>

        ${reportData.breakdowns ? `
          <div class="section">
            <h2>Activity Breakdown</h2>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Activity</th>
                  <th>Focus</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.breakdowns.map(item => `
                  <tr>
                    <td>${item.time}</td>
                    <td>${item.activity}</td>
                    <td>${item.focus}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${reportData.dailyBreakdown ? `
          <div class="section">
            <h2>Daily Breakdown</h2>
            <table>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Hours</th>
                  <th>Focus</th>
                  <th>Productivity</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.dailyBreakdown.map(item => `
                  <tr>
                    <td>${item.day}</td>
                    <td>${item.hours}</td>
                    <td>${item.focus}</td>
                    <td>${item.productivity}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  useEffect(() => {
    if (profile?.organization_id) {
      loadEmployees();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedEmployee && profile?.organization_id) {
      loadReportData();
    }
  }, [selectedEmployee, activeTab, profile]);

  const loadEmployees = async () => {
    try {
      if (!profile?.organization_id) {
        return;
      }

      const response = await fetch(`/api/employees?organizationId=${profile.organization_id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }
      const data = await response.json();
      const employeeList = data.employees || [];
      setEmployees(employeeList);

      // Set first employee as selected
      if (employeeList.length > 0) {
        setSelectedEmployee(employeeList[0].id);
      }
    } catch (err) {
      console.error('Error loading employees:', err);
      setError('Failed to load employees.');
    }
  };

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!profile?.organization_id) {
        setError('No organization found');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/reports?employeeId=${selectedEmployee}&period=${activeTab}&organizationId=${profile.organization_id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch report data');
      }

      const data = await response.json();
      setReportData(data.report);
    } catch (err) {
      console.error('Error loading report data:', err);
      setError('Failed to load report data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'daily' as const, label: 'Daily Report', icon: '📅' },
    { id: 'weekly' as const, label: 'Weekly Report', icon: '📊' },
    { id: 'monthly' as const, label: 'Monthly Report', icon: '📈' }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink-hi">Employee Reports</h1>
            <p className="text-ink-muted">Comprehensive productivity and activity reports</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button onClick={exportToPDF} disabled={!reportData}>
              📥 Export PDF
            </Button>
          </div>
        </div>

        {/* Employee Selection */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-ink-hi">
                Select Employee:
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary min-w-64"
              >
                {employees.map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} - {employee.department}
                  </option>
                ))}
              </select>
              <Badge variant="info">
                {selectedEmployeeName}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Report Tabs */}
        <Card>
          <CardHeader className="border-b border-line">
            <div className="flex space-x-4">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-ink-mid hover:text-ink-hi hover:bg-raised'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-6 bg-gray-300 rounded w-32 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-300 rounded w-48 animate-pulse"></div>
                  </div>
                  <div className="h-8 bg-gray-300 rounded w-24 animate-pulse"></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} elevated>
                      <CardContent className="py-4 text-center">
                        <div className="h-8 bg-gray-300 rounded mb-2 animate-pulse"></div>
                        <div className="h-4 bg-gray-300 rounded animate-pulse"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-32 bg-gray-300 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-danger text-sm mb-2">{error}</div>
                <Button variant="outline" size="sm" onClick={loadReportData}>
                  Try Again
                </Button>
              </div>
            ) : !reportData ? (
              <div className="text-center py-8 text-ink-muted">
                No report data available.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Report Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-ink-hi">{selectedEmployeeName}</h3>
                    <p className="text-ink-muted">{reportData.period}</p>
                  </div>
                  <Badge variant="success" size="md">
                    {reportData.productivity}% Productivity
                  </Badge>
                </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card elevated>
                  <CardContent className="py-4 text-center">
                    <div className="text-2xl font-semibold text-ink-hi font-mono">
                      {reportData.workHours}
                    </div>
                    <div className="text-sm text-ink-muted">Total Work Hours</div>
                  </CardContent>
                </Card>
                <Card elevated>
                  <CardContent className="py-4 text-center">
                    <div className="text-2xl font-semibold text-success font-mono">
                      {reportData.focusTime}
                    </div>
                    <div className="text-sm text-ink-muted">Focus Time</div>
                  </CardContent>
                </Card>
                <Card elevated>
                  <CardContent className="py-4 text-center">
                    <div className="text-2xl font-semibold text-primary font-mono">
                      {reportData.sessionsCount}
                    </div>
                    <div className="text-sm text-ink-muted">Work Sessions</div>
                  </CardContent>
                </Card>
                <Card elevated>
                  <CardContent className="py-4 text-center">
                    <div className="text-2xl font-semibold text-ink-hi font-mono">
                      {reportData.screenshotsCount}
                    </div>
                    <div className="text-sm text-ink-muted">Screenshots</div>
                  </CardContent>
                </Card>
              </div>

              {/* Application Usage */}
              <Card>
                <CardHeader>
                  <CardTitle>Application Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.applications.map((app, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 rounded-full bg-primary" style={{
                            backgroundColor: `hsl(${index * 90}, 60%, 50%)`
                          }}></div>
                          <span className="font-medium text-ink-hi">{app.name}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="font-mono text-ink-mid">{app.time}</span>
                          <span className="text-sm text-ink-muted w-12 text-right">
                            {app.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Time Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {activeTab === 'daily' ? 'Activity Breakdown' :
                     activeTab === 'weekly' ? 'Daily Breakdown' : 'Weekly Breakdown'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activeTab === 'daily' && 'breakdowns' in reportData && (
                    <div className="space-y-3">
                      {reportData.breakdowns.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-raised rounded-lg">
                          <div>
                            <div className="font-medium text-ink-hi">{item.activity}</div>
                            <div className="text-sm text-ink-muted font-mono">{item.time}</div>
                          </div>
                          <div className="text-right">
                            <div className={`font-medium ${
                              item.focus >= 90 ? 'text-success' :
                              item.focus >= 80 ? 'text-warn' : 'text-danger'
                            }`}>
                              {item.focus}% Focus
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'weekly' && 'dailyBreakdown' in reportData && (
                    <div className="space-y-3">
                      {reportData.dailyBreakdown.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-raised rounded-lg">
                          <div className="font-medium text-ink-hi">{item.day}</div>
                          <div className="flex items-center space-x-6">
                            <div className="text-sm">
                              <span className="text-ink-muted">Hours: </span>
                              <span className="font-mono text-ink-hi">{item.hours}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-ink-muted">Focus: </span>
                              <span className="font-mono text-success">{item.focus}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-ink-muted">Productivity: </span>
                              <span className="font-mono text-primary">{item.productivity}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'monthly' && 'weeklyBreakdown' in reportData && (
                    <div className="space-y-3">
                      {reportData.weeklyBreakdown.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-raised rounded-lg">
                          <div className="font-medium text-ink-hi">{item.week}</div>
                          <div className="flex items-center space-x-6">
                            <div className="text-sm">
                              <span className="text-ink-muted">Hours: </span>
                              <span className="font-mono text-ink-hi">{item.hours}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-ink-muted">Focus: </span>
                              <span className="font-mono text-success">{item.focus}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-ink-muted">Productivity: </span>
                              <span className="font-mono text-primary">{item.productivity}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Report Actions */}
              <div className="flex justify-center space-x-4">
                <Button variant="outline">
                  📊 View Detailed Analytics
                </Button>
                <Button variant="outline">
                  📋 Compare with Team
                </Button>
                <Button>
                  📤 Share Report
                </Button>
              </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}