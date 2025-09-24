'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('1');
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const selectedEmployeeName = employees.find(emp => emp.id === selectedEmployee)?.name || '';

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      loadReportData();
    }
  }, [selectedEmployee, activeTab]);

  const loadEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }
      const data = await response.json();
      const employeeList = data.employees || [];
      setEmployees(employeeList);

      // Set first employee as selected if none selected
      if (employeeList.length > 0 && !selectedEmployee) {
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

      const response = await fetch(`/api/reports?employeeId=${selectedEmployee}&period=${activeTab}`);
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
            <Button variant="outline">
              📧 Email Report
            </Button>
            <Button>
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