'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';
import { MonthlyHoursChart } from '@/components/charts/MonthlyHoursChart';
import { CumulativeHoursChart } from '@/components/charts/CumulativeHoursChart';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/Table';

interface EmployeeSummary {
  employeeId: string;
  employeeName: string;
  email: string;
  department: string;
  hourlyRate: number;
  totalWorkHours: number;
  totalBreakHours: number;
  totalNetHours: number;
  regularHours: number;
  overtimeHours: number;
  totalSessions: number;
  averageHoursPerDay: number;
  workingDays: number;
  salary: {
    regularPay: number;
    overtimePay: number;
    totalSalary: number;
  };
  dailyBreakdown: Array<{
    date: string;
    workHours: number;
    breakHours: number;
    netHours: number;
    sessions: number;
  }>;
  cumulativeData: Array<{
    date: string;
    cumulative: number;
    daily: number;
  }>;
}

interface MonthlyData {
  period: {
    startDate: string;
    endDate: string;
    month: string;
    monthName: string;
  };
  employees: EmployeeSummary[];
  summary: {
    totalEmployees: number;
    totalWorkHours: number;
    totalBreakHours: number;
    totalNetHours: number;
    totalSalary: number;
    totalOvertimeHours: number;
    averageHoursPerEmployee: number;
  };
}

export default function MonthlyHoursPage() {
  const { profile } = useAuth();
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [chartType, setChartType] = useState<'line' | 'bar'>('bar');
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  // Get current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());

  // Generate month options (last 12 months)
  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  };

  useEffect(() => {
    if (profile?.organization_id) {
      loadMonthlyData();
    }
  }, [profile, selectedMonth, selectedEmployee]);

  const loadMonthlyData = async () => {
    if (!profile?.organization_id) return;

    try {
      setLoading(true);
      setError(null);

      let url = `/api/monthly-hours?organizationId=${profile.organization_id}&month=${selectedMonth}`;
      if (selectedEmployee !== 'all') {
        url += `&employeeId=${selectedEmployee}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch monthly hours data');
      }

      const data = await response.json();
      setMonthlyData(data);
    } catch (err) {
      setError('Failed to load monthly hours data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = selectedDepartment === 'all'
    ? monthlyData?.employees || []
    : monthlyData?.employees.filter(emp => emp.department === selectedDepartment) || [];

  const departments = Array.from(new Set(monthlyData?.employees.map(emp => emp.department) || [])).sort();

  const exportToCSV = () => {
    if (!monthlyData) return;

    const headers = [
      'Employee Name',
      'Department',
      'Total Work Hours',
      'Total Break Hours',
      'Net Hours',
      'Regular Hours',
      'Overtime Hours',
      'Working Days',
      'Avg Hours/Day',
      'Hourly Rate',
      'Regular Pay',
      'Overtime Pay',
      'Total Salary'
    ];

    const csvRows = [
      headers.join(','),
      ...filteredEmployees.map(emp => [
        `"${emp.employeeName}"`,
        `"${emp.department}"`,
        emp.totalWorkHours,
        emp.totalBreakHours,
        emp.totalNetHours,
        emp.regularHours,
        emp.overtimeHours,
        emp.workingDays,
        emp.averageHoursPerDay,
        emp.hourlyRate,
        emp.salary.regularPay,
        emp.salary.overtimePay,
        emp.salary.totalSalary
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly_hours_${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const selectedEmployeeData = filteredEmployees.find(emp => emp.employeeId === expandedEmployee);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink-hi">Monthly Hours Tracker</h1>
            <p className="text-ink-muted">Track total work hours, salary calculations, and productivity trends</p>
          </div>
          <Button onClick={exportToCSV} disabled={loading || !monthlyData}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-hi mb-2">
                  Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                >
                  {getMonthOptions().map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-hi mb-2">
                  Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                >
                  <option value="all">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-hi mb-2">
                  Chart Type
                </label>
                <div className="flex space-x-2">
                  <Button
                    variant={chartType === 'bar' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setChartType('bar')}
                    className="flex-1"
                  >
                    Bar Chart
                  </Button>
                  <Button
                    variant={chartType === 'line' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setChartType('line')}
                    className="flex-1"
                  >
                    Line Chart
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="py-4">
                    <div className="h-16 bg-gray-300 rounded animate-pulse"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-center">
              <div className="text-danger text-sm mb-2">{error}</div>
              <Button variant="outline" size="sm" onClick={loadMonthlyData}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : !monthlyData ? (
          <Card>
            <CardContent className="py-8 text-center text-ink-muted">
              No data available
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="py-4">
                  <div className="text-sm text-ink-muted">Total Employees</div>
                  <div className="text-2xl font-semibold text-ink-hi">{filteredEmployees.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="text-sm text-ink-muted">Total Net Hours</div>
                  <div className="text-2xl font-semibold text-primary">
                    {filteredEmployees.reduce((sum, emp) => sum + emp.totalNetHours, 0).toFixed(2)}h
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="text-sm text-ink-muted">Avg Hours/Employee</div>
                  <div className="text-2xl font-semibold text-success">
                    {filteredEmployees.length > 0
                      ? (filteredEmployees.reduce((sum, emp) => sum + emp.totalNetHours, 0) / filteredEmployees.length).toFixed(2)
                      : 0}h
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="text-sm text-ink-muted">Total Salary</div>
                  <div className="text-2xl font-semibold text-ink-hi">
                    ${filteredEmployees.reduce((sum, emp) => sum + emp.salary.totalSalary, 0).toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Period Info */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-ink-hi">{monthlyData.period.monthName}</h3>
                    <p className="text-sm text-ink-muted">
                      Period: {new Date(monthlyData.period.startDate).toLocaleDateString('en-GB')} - {new Date(monthlyData.period.endDate).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-xs text-ink-muted">Overtime Hours</div>
                      <div className="text-lg font-semibold text-warn">
                        {filteredEmployees.reduce((sum, emp) => sum + emp.overtimeHours, 0).toFixed(2)}h
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Employee Table */}
            <Card>
              <CardHeader>
                <CardTitle>Employee Monthly Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Work Hours</TableHead>
                      <TableHead>Net Hours</TableHead>
                      <TableHead>Working Days</TableHead>
                      <TableHead>Overtime</TableHead>
                      <TableHead>Salary</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-ink-muted">
                          No employee data available for this month
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmployees.map((employee) => (
                        <>
                          <TableRow key={employee.employeeId}>
                            <TableCell>
                              <div className="font-medium text-ink-hi">{employee.employeeName}</div>
                              <div className="text-xs text-ink-muted">{employee.email}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" size="sm">{employee.department}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-ink-hi">{employee.totalWorkHours}h</span>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-primary font-semibold">{employee.totalNetHours}h</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-ink-mid">{employee.workingDays} days</span>
                            </TableCell>
                            <TableCell>
                              {employee.overtimeHours > 0 ? (
                                <Badge variant="warning" size="sm">{employee.overtimeHours}h</Badge>
                              ) : (
                                <span className="text-ink-muted">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {employee.hourlyRate > 0 ? (
                                <div>
                                  <div className="font-semibold text-success">${employee.salary.totalSalary.toFixed(2)}</div>
                                  <div className="text-xs text-ink-muted">${employee.hourlyRate}/hr</div>
                                </div>
                              ) : (
                                <span className="text-ink-muted">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setExpandedEmployee(
                                  expandedEmployee === employee.employeeId ? null : employee.employeeId
                                )}
                              >
                                {expandedEmployee === employee.employeeId ? 'Hide' : 'Details'}
                              </Button>
                            </TableCell>
                          </TableRow>

                          {expandedEmployee === employee.employeeId && selectedEmployeeData && (
                            <TableRow key={`${employee.employeeId}-details`}>
                              <TableCell colSpan={8} className="bg-surface/50">
                                <div className="p-4 space-y-6">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Daily Hours Chart */}
                                    <div>
                                      <h4 className="text-sm font-semibold text-ink-hi mb-4">Daily Hours Breakdown</h4>
                                      <MonthlyHoursChart
                                        data={selectedEmployeeData.dailyBreakdown.map(day => ({
                                          date: day.date.substring(0, 5), // DD/MM
                                          workHours: day.workHours,
                                          breakHours: day.breakHours,
                                          netHours: day.netHours
                                        }))}
                                        type={chartType}
                                      />
                                    </div>

                                    {/* Cumulative Chart */}
                                    <div>
                                      <h4 className="text-sm font-semibold text-ink-hi mb-4">Cumulative Hours</h4>
                                      <CumulativeHoursChart data={selectedEmployeeData.cumulativeData} />
                                    </div>
                                  </div>

                                  {/* Salary Breakdown */}
                                  {selectedEmployeeData.hourlyRate > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                      <Card elevated>
                                        <CardContent className="py-3">
                                          <div className="text-xs text-ink-muted">Regular Pay ({selectedEmployeeData.regularHours}h)</div>
                                          <div className="text-lg font-semibold text-ink-hi">
                                            ${selectedEmployeeData.salary.regularPay.toFixed(2)}
                                          </div>
                                        </CardContent>
                                      </Card>
                                      <Card elevated>
                                        <CardContent className="py-3">
                                          <div className="text-xs text-ink-muted">Overtime Pay ({selectedEmployeeData.overtimeHours}h)</div>
                                          <div className="text-lg font-semibold text-warn">
                                            ${selectedEmployeeData.salary.overtimePay.toFixed(2)}
                                          </div>
                                        </CardContent>
                                      </Card>
                                      <Card elevated>
                                        <CardContent className="py-3">
                                          <div className="text-xs text-ink-muted">Total Salary</div>
                                          <div className="text-lg font-semibold text-success">
                                            ${selectedEmployeeData.salary.totalSalary.toFixed(2)}
                                          </div>
                                        </CardContent>
                                      </Card>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
