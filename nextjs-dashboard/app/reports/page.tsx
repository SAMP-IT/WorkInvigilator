'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

// Mock employee list
const employees = [
  { id: '1', name: 'Sarah Chen', department: 'Engineering' },
  { id: '2', name: 'Mike Johnson', department: 'Design' },
  { id: '3', name: 'Lisa Wang', department: 'Marketing' },
  { id: '4', name: 'David Kim', department: 'Engineering' }
];

// Mock report data generator
const generateReportData = (employeeId: string, period: 'daily' | 'weekly' | 'monthly') => {
  const employee = employees.find(emp => emp.id === employeeId);

  if (period === 'daily') {
    return {
      period: 'Today - 24/09/2024',
      workHours: '8h 15m',
      focusTime: '6h 45m',
      productivity: 82.1,
      sessionsCount: 3,
      screenshotsCount: 45,
      applications: [
        { name: 'VS Code', time: '4h 20m', percentage: 52.7 },
        { name: 'Chrome', time: '2h 10m', percentage: 26.3 },
        { name: 'Slack', time: '1h 25m', percentage: 17.2 },
        { name: 'Other', time: '20m', percentage: 3.8 }
      ],
      breakdowns: [
        { time: '09:00-11:30', activity: 'Development Work', focus: 95 },
        { time: '11:30-12:00', activity: 'Team Meeting', focus: 75 },
        { time: '13:00-15:30', activity: 'Code Review', focus: 88 },
        { time: '15:30-17:30', activity: 'Development Work', focus: 82 }
      ]
    };
  } else if (period === 'weekly') {
    return {
      period: 'This Week - 18/09 to 24/09/2024',
      workHours: '42h 30m',
      focusTime: '35h 15m',
      productivity: 83.5,
      sessionsCount: 15,
      screenshotsCount: 225,
      applications: [
        { name: 'VS Code', time: '22h 15m', percentage: 52.4 },
        { name: 'Chrome', time: '12h 30m', percentage: 29.4 },
        { name: 'Slack', time: '5h 45m', percentage: 13.5 },
        { name: 'Other', time: '2h 0m', percentage: 4.7 }
      ],
      dailyBreakdown: [
        { day: 'Monday', hours: '8h 30m', focus: '7h 10m', productivity: 84.3 },
        { day: 'Tuesday', hours: '8h 15m', focus: '6h 45m', productivity: 81.8 },
        { day: 'Wednesday', hours: '8h 45m', focus: '7h 30m', productivity: 85.7 },
        { day: 'Thursday', hours: '8h 0m', focus: '6h 30m', productivity: 81.3 },
        { day: 'Friday', hours: '8h 0m', focus: '6h 40m', productivity: 83.3 }
      ]
    };
  } else {
    return {
      period: 'This Month - September 2024',
      workHours: '168h 45m',
      focusTime: '140h 30m',
      productivity: 83.3,
      sessionsCount: 62,
      screenshotsCount: 890,
      applications: [
        { name: 'VS Code', time: '88h 30m', percentage: 52.4 },
        { name: 'Chrome', time: '48h 15m', percentage: 28.6 },
        { name: 'Slack', time: '22h 30m', percentage: 13.3 },
        { name: 'Other', time: '9h 30m', percentage: 5.7 }
      ],
      weeklyBreakdown: [
        { week: 'Week 1', hours: '40h 30m', focus: '33h 45m', productivity: 83.3 },
        { week: 'Week 2', hours: '42h 15m', focus: '35h 20m', productivity: 83.6 },
        { week: 'Week 3', hours: '41h 0m', focus: '34h 10m', productivity: 83.4 },
        { week: 'Week 4', hours: '45h 0m', focus: '37h 15m', productivity: 82.8 }
      ]
    };
  }
};

export default function ReportsPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('1');
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const selectedEmployeeName = employees.find(emp => emp.id === selectedEmployee)?.name || '';
  const reportData = generateReportData(selectedEmployee, activeTab);

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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}