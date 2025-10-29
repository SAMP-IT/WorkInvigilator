import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmployeeSidebar } from '../components/dashboard/EmployeeSidebar';
import { mockProfiles, mockSessions, mockProductivityStats } from '../lib/mockData';

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

// Mock function to get employees
function getEmployees(organizationId: string): Employee[] {
  return mockProfiles
    .filter(profile => profile.organization_id === organizationId)
    .map(profile => ({
      id: profile.id,
      name: profile.name,
      department: profile.department,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Mock function to generate report data based on employee and period
function generateReportData(
  employeeId: string,
  period: 'daily' | 'weekly' | 'monthly',
  startDate?: string,
  endDate?: string
): ReportData {
  const employee = mockProfiles.find(p => p.id === employeeId);
  const employeeSessions = mockSessions.filter(s => s.employee_id === employeeId);

  // Calculate metrics based on sessions
  const totalDuration = employeeSessions.reduce((sum, s) => sum + s.duration, 0);
  const activeTime = employeeSessions.reduce((sum, s) => sum + s.active_time, 0);
  const avgProductivity = employeeSessions.length > 0
    ? Math.round(employeeSessions.reduce((sum, s) => sum + s.productivity_score, 0) / employeeSessions.length)
    : 0;

  const workHours = (totalDuration / 3600).toFixed(1);
  const focusTime = (activeTime / 3600).toFixed(1);

  // Base report data
  const baseReport: ReportData = {
    period: period === 'daily' ? 'Today' : period === 'weekly' ? 'This Week' : 'This Month',
    workHours: `${workHours}h`,
    focusTime: `${focusTime}h`,
    productivity: avgProductivity,
    sessionsCount: employeeSessions.length,
    screenshotsCount: employeeSessions.length * 12,
    applications: mockProductivityStats.topApplications.map(app => ({
      name: app.name,
      time: `${app.hours}h`,
      percentage: app.percentage,
    })),
  };

  // Add period-specific breakdowns
  if (period === 'daily') {
    baseReport.breakdowns = [
      { time: '09:00 - 10:00', activity: 'Development', focus: 92 },
      { time: '10:00 - 11:00', activity: 'Code Review', focus: 88 },
      { time: '11:00 - 12:00', activity: 'Meeting', focus: 75 },
      { time: '12:00 - 13:00', activity: 'Lunch Break', focus: 0 },
      { time: '13:00 - 14:00', activity: 'Development', focus: 90 },
      { time: '14:00 - 15:00', activity: 'Testing', focus: 85 },
      { time: '15:00 - 16:00', activity: 'Documentation', focus: 82 },
      { time: '16:00 - 17:00', activity: 'Code Review', focus: 88 },
    ];
  } else if (period === 'weekly') {
    baseReport.dailyBreakdown = [
      { day: 'Monday', hours: '8.5h', focus: '7.2h', productivity: 89 },
      { day: 'Tuesday', hours: '9.0h', focus: '7.8h', productivity: 92 },
      { day: 'Wednesday', hours: '8.0h', focus: '6.8h', productivity: 85 },
      { day: 'Thursday', hours: '8.5h', focus: '7.5h', productivity: 88 },
      { day: 'Friday', hours: '8.5h', focus: '7.4h', productivity: 87 },
      { day: 'Saturday', hours: '0h', focus: '0h', productivity: 0 },
      { day: 'Sunday', hours: '0h', focus: '0h', productivity: 0 },
    ];
  } else if (period === 'monthly') {
    baseReport.weeklyBreakdown = [
      { week: 'Week 1', hours: '42.5h', focus: '36.7h', productivity: 88 },
      { week: 'Week 2', hours: '45.0h', focus: '39.2h', productivity: 91 },
      { week: 'Week 3', hours: '38.5h', focus: '33.1h', productivity: 86 },
      { week: 'Week 4', hours: '42.5h', focus: '37.0h', productivity: 89 },
    ];
  }

  return baseReport;
}

export default function Reports() {
  const [organizationId, setOrganizationId] = useState<string>('org-1');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState<string>(getCurrentDate());
  const [endDate, setEndDate] = useState<string>(getCurrentDate());

  // Get employees using mock data
  const employees = useMemo(() => {
    return organizationId ? getEmployees(organizationId) : [];
  }, [organizationId]);

  // Don't auto-select first employee anymore - let user choose from sidebar
  // useEffect(() => {
  //   if (employees.length > 0 && !selectedEmployee) {
  //     setSelectedEmployee(employees[0].id);
  //   }
  // }, [employees, selectedEmployee]);

  // Generate report data using mock data
  const reportData = useMemo(() => {
    if (!selectedEmployee) return null;
    return generateReportData(selectedEmployee, activeTab, startDate, endDate);
  }, [selectedEmployee, activeTab, startDate, endDate]);

  const selectedEmployeeName = employees.find(emp => emp.id === selectedEmployee)?.name || '';

  const filteredEmployees = selectedDepartment === 'all'
    ? employees
    : employees.filter(emp => emp.department === selectedDepartment);

  const departments = Array.from(new Set(employees.map(emp => emp.department).filter(Boolean))).sort();

  // Prepare employee data for sidebar
  const employeesForSidebar = useMemo(() => {
    return employees.map(emp => {
      const profile = mockProfiles.find(p => p.id === emp.id);
      const empSessions = mockSessions.filter(s => s.employee_id === emp.id);
      const activeSession = empSessions.find(s => s.status === 'active');
      const avgProductivity = empSessions.length > 0
        ? Math.round(empSessions.reduce((sum, s) => sum + s.productivity_score, 0) / empSessions.length)
        : 0;

      return {
        id: emp.id,
        name: emp.name,
        email: profile?.email || '',
        avatar_url: profile?.avatar_url || '',
        department: emp.department || '',
        status: activeSession ? ('online' as const) : ('offline' as const),
        productivity: avgProductivity,
      };
    });
  }, [employees]);

  const exportToCSV = () => {
    if (!reportData) return;

    let csvContent = "Employee Productivity Report\n";
    csvContent += `Employee:,${selectedEmployeeName}\n`;
    csvContent += `Period:,${reportData.period}\n`;
    csvContent += `Generated:,${new Date().toLocaleString()}\n\n`;

    csvContent += "Metrics\n";
    csvContent += `Total Work Hours:,${reportData.workHours}\n`;
    csvContent += `Focus Time:,${reportData.focusTime}\n`;
    csvContent += `Productivity Score:,${reportData.productivity}%\n`;
    csvContent += `Work Sessions:,${reportData.sessionsCount}\n`;
    csvContent += `Screenshots:,${reportData.screenshotsCount}\n\n`;

    csvContent += "Application Usage\n";
    csvContent += "Application,Time,Percentage\n";
    reportData.applications.forEach(app => {
      csvContent += `${app.name},${app.time},${app.percentage}%\n`;
    });

    if (reportData.breakdowns) {
      csvContent += "\nActivity Breakdown\n";
      csvContent += "Time,Activity,Focus\n";
      reportData.breakdowns.forEach(item => {
        csvContent += `${item.time},${item.activity},${item.focus}%\n`;
      });
    }

    if (reportData.dailyBreakdown) {
      csvContent += "\nDaily Breakdown\n";
      csvContent += "Day,Hours,Focus,Productivity\n";
      reportData.dailyBreakdown.forEach(item => {
        csvContent += `${item.day},${item.hours},${item.focus},${item.productivity}%\n`;
      });
    }

    if (reportData.weeklyBreakdown) {
      csvContent += "\nWeekly Breakdown\n";
      csvContent += "Week,Hours,Focus,Productivity\n";
      reportData.weeklyBreakdown.forEach(item => {
        csvContent += `${item.week},${item.hours},${item.focus},${item.productivity}%\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `report_${selectedEmployeeName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    if (!reportData) return;

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

  const tabs = [
    {
      id: 'daily' as const,
      label: 'Daily Report',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'weekly' as const,
      label: 'Weekly Report',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'monthly' as const,
      label: 'Monthly Report',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    }
  ];

  const loading = false;
  const error = null;

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
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
          <h1 className="text-2xl font-semibold text-gray-900">Employee Reports</h1>
          <p className="text-gray-600">Comprehensive productivity and activity reports</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={exportToCSV} disabled={!reportData} variant="outline">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </Button>
          <Button onClick={exportToPDF} disabled={!reportData}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-900">
                Date Range:
              </label>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {(startDate || endDate) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStartDate(getCurrentDate());
                    setEndDate(getCurrentDate());
                  }}
                >
                  Reset Dates
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Card>
        <CardHeader className="border-b border-gray-200">
          <div className="flex space-x-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
              <div className="text-red-600 text-sm mb-2">{error}</div>
              <Button variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          ) : !reportData || !selectedEmployee ? (
            <div className="flex items-center justify-center h-[calc(100vh-400px)]">
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
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Employee Selected</h3>
                <p className="text-gray-500">Select an employee from the sidebar to view their report</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Report Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedEmployeeName}</h3>
                  <p className="text-gray-600">{reportData.period}</p>
                </div>
                <Badge variant="success" size="md">
                  {reportData.productivity}% Productivity
                </Badge>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card elevated>
                  <CardContent className="py-4 text-center">
                    <div className="text-2xl font-semibold text-gray-900 font-mono">
                      {reportData.workHours}
                    </div>
                    <div className="text-sm text-gray-600">Total Work Hours</div>
                  </CardContent>
                </Card>
                <Card elevated>
                  <CardContent className="py-4 text-center">
                    <div className="text-2xl font-semibold text-green-600 font-mono">
                      {reportData.focusTime}
                    </div>
                    <div className="text-sm text-gray-600">Focus Time</div>
                  </CardContent>
                </Card>
                <Card elevated>
                  <CardContent className="py-4 text-center">
                    <div className="text-2xl font-semibold text-blue-600 font-mono">
                      {reportData.sessionsCount}
                    </div>
                    <div className="text-sm text-gray-600">Work Sessions</div>
                  </CardContent>
                </Card>
                <Card elevated>
                  <CardContent className="py-4 text-center">
                    <div className="text-2xl font-semibold text-gray-900 font-mono">
                      {reportData.screenshotsCount}
                    </div>
                    <div className="text-sm text-gray-600">Screenshots</div>
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
                          <div className="w-4 h-4 rounded-full" style={{
                            backgroundColor: `hsl(${index * 90}, 60%, 50%)`
                          }}></div>
                          <span className="font-medium text-gray-900">{app.name}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="font-mono text-gray-600">{app.time}</span>
                          <span className="text-sm text-gray-500 w-12 text-right">
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
                  {activeTab === 'daily' && reportData.breakdowns && (
                    <div className="space-y-3">
                      {reportData.breakdowns.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-900">{item.activity}</div>
                            <div className="text-sm text-gray-600 font-mono">{item.time}</div>
                          </div>
                          <div className="text-right">
                            <div className={`font-medium ${
                              item.focus >= 90 ? 'text-green-600' :
                              item.focus >= 80 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {item.focus}% Focus
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'weekly' && reportData.dailyBreakdown && (
                    <div className="space-y-3">
                      {reportData.dailyBreakdown.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="font-medium text-gray-900">{item.day}</div>
                          <div className="flex items-center space-x-6">
                            <div className="text-sm">
                              <span className="text-gray-600">Hours: </span>
                              <span className="font-mono text-gray-900">{item.hours}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-600">Focus: </span>
                              <span className="font-mono text-green-600">{item.focus}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-600">Productivity: </span>
                              <span className="font-mono text-blue-600">{item.productivity}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'monthly' && reportData.weeklyBreakdown && (
                    <div className="space-y-3">
                      {reportData.weeklyBreakdown.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="font-medium text-gray-900">{item.week}</div>
                          <div className="flex items-center space-x-6">
                            <div className="text-sm">
                              <span className="text-gray-600">Hours: </span>
                              <span className="font-mono text-gray-900">{item.hours}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-600">Focus: </span>
                              <span className="font-mono text-green-600">{item.focus}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-600">Productivity: </span>
                              <span className="font-mono text-blue-600">{item.productivity}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
