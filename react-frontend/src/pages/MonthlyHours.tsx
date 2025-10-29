import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { MonthlyHoursChart } from '../components/charts/MonthlyHoursChart';
import { CumulativeHoursChart } from '../components/charts/CumulativeHoursChart';
import { supabase } from '../lib/supabase';

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

async function fetchMonthlyData(
  organizationId: string,
  month: string,
  employeeId?: string
): Promise<MonthlyData> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const params = new URLSearchParams({
    organizationId,
    month,
  });

  if (employeeId && employeeId !== 'all') {
    params.append('employeeId', employeeId);
  }

  const response = await fetch(`/api/monthly-hours?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
    },
  });

  if (!response.ok) throw new Error('Failed to fetch monthly hours data');
  return await response.json();
}

export default function MonthlyHours() {
  const [organizationId, setOrganizationId] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [chartType, setChartType] = useState<'line' | 'bar'>('bar');
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());

  // Fetch current user profile to get organization_id
  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (profile?.organization_id) {
          setOrganizationId(profile.organization_id);
        }
      }
    }
    loadProfile();
  }, []);

  // Fetch monthly data
  const { data: monthlyData, isLoading, error } = useQuery({
    queryKey: ['monthly-hours', organizationId, selectedMonth, selectedEmployee],
    queryFn: () => fetchMonthlyData(organizationId, selectedMonth, selectedEmployee),
    enabled: !!organizationId,
  });

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
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Monthly Hours Tracker</h1>
          <p className="text-gray-600">Track total work hours, salary calculations, and productivity trends</p>
        </div>
        <Button onClick={exportToCSV} disabled={isLoading || !monthlyData}>
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
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                {getMonthOptions().map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
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

      {isLoading ? (
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
            <div className="text-red-600 text-sm mb-2">Failed to load monthly hours data</div>
            <Button variant="outline" size="sm">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : !monthlyData ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-600">
            No data available
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="py-4">
                <div className="text-sm text-gray-600">Total Employees</div>
                <div className="text-2xl font-semibold text-gray-900">{filteredEmployees.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="text-sm text-gray-600">Total Net Hours</div>
                <div className="text-2xl font-semibold text-blue-600">
                  {filteredEmployees.reduce((sum, emp) => sum + emp.totalNetHours, 0).toFixed(2)}h
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="text-sm text-gray-600">Avg Hours/Employee</div>
                <div className="text-2xl font-semibold text-green-600">
                  {filteredEmployees.length > 0
                    ? (filteredEmployees.reduce((sum, emp) => sum + emp.totalNetHours, 0) / filteredEmployees.length).toFixed(2)
                    : 0}h
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="text-sm text-gray-600">Total Salary</div>
                <div className="text-2xl font-semibold text-gray-900">
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
                  <h3 className="text-lg font-semibold text-gray-900">{monthlyData.period.monthName}</h3>
                  <p className="text-sm text-gray-600">
                    Period: {new Date(monthlyData.period.startDate).toLocaleDateString('en-GB')} - {new Date(monthlyData.period.endDate).toLocaleDateString('en-GB')}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-xs text-gray-600">Overtime Hours</div>
                    <div className="text-lg font-semibold text-yellow-600">
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
                    <TableHead>Total Work (h)</TableHead>
                    <TableHead>Total Break (h)</TableHead>
                    <TableHead>Working Days</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-600">
                        No employee data available for this month
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <>
                        <TableRow key={employee.employeeId}>
                          <TableCell>
                            <div className="font-medium text-gray-900">{employee.employeeName}</div>
                            <div className="text-xs text-gray-600">{employee.email}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" size="sm">{employee.department}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-gray-900">{employee.totalWorkHours.toFixed(1)}h</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-gray-600">{employee.totalBreakHours.toFixed(1)}h</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-gray-600">{employee.workingDays} days</span>
                          </TableCell>
                          <TableCell>
                            {employee.overtimeHours > 0 ? (
                              <Badge variant="warning" size="sm">{employee.overtimeHours}h</Badge>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {employee.hourlyRate > 0 ? (
                              <div>
                                <div className="font-semibold text-green-600">${employee.salary.totalSalary.toFixed(2)}</div>
                                <div className="text-xs text-gray-600">${employee.hourlyRate}/hr</div>
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
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
                            <TableCell colSpan={8} className="bg-gray-50">
                              <div className="p-4 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Daily Hours Chart */}
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-4">Daily Hours Breakdown</h4>
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
                                    <h4 className="text-sm font-semibold text-gray-900 mb-4">Cumulative Hours</h4>
                                    <CumulativeHoursChart data={selectedEmployeeData.cumulativeData} />
                                  </div>
                                </div>

                                {/* Salary Breakdown */}
                                {selectedEmployeeData.hourlyRate > 0 && (
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                    <Card elevated>
                                      <CardContent className="py-3">
                                        <div className="text-xs text-gray-600">Regular Pay ({selectedEmployeeData.regularHours}h)</div>
                                        <div className="text-lg font-semibold text-gray-900">
                                          ${selectedEmployeeData.salary.regularPay.toFixed(2)}
                                        </div>
                                      </CardContent>
                                    </Card>
                                    <Card elevated>
                                      <CardContent className="py-3">
                                        <div className="text-xs text-gray-600">Overtime Pay ({selectedEmployeeData.overtimeHours}h)</div>
                                        <div className="text-lg font-semibold text-yellow-600">
                                          ${selectedEmployeeData.salary.overtimePay.toFixed(2)}
                                        </div>
                                      </CardContent>
                                    </Card>
                                    <Card elevated>
                                      <CardContent className="py-3">
                                        <div className="text-xs text-gray-600">Total Salary</div>
                                        <div className="text-lg font-semibold text-green-600">
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
  );
}
