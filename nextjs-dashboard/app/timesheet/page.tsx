'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth-context';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/Table';

interface TimesheetEntry {
  employeeId: string;
  employeeName: string;
  employeeDepartment?: string;
  date: string;
  punchIn: string;
  punchOut: string;
  workHours: number;
  breakHours: number;
  netHours: number;
  status: 'completed' | 'active' | 'absent';
}

interface Employee {
  id: string;
  name: string;
  email: string;
  department?: string;
}

export default function TimesheetPage() {
  const { profile } = useAuth();
  const [timesheetData, setTimesheetData] = useState<TimesheetEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [dateRange, setDateRange] = useState('today');

  // Set default dates to current date
  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  const [startDate, setStartDate] = useState(getCurrentDate());
  const [endDate, setEndDate] = useState(getCurrentDate());

  // Get unique departments sorted A-Z
  const departments = Array.from(new Set(timesheetData.map(entry => entry.employeeDepartment).filter(Boolean))).sort();

  useEffect(() => {
    // Don't load if custom range is selected but dates aren't set yet
    if (dateRange === 'custom' && (!startDate || !endDate)) {
      return;
    }
    loadTimesheetData();
  }, [dateRange, startDate, endDate, profile]);

  const loadTimesheetData = async () => {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }

    // Validate custom date range
    if (dateRange === 'custom' && (!startDate || !endDate)) {
      setError('Please select both start and end dates');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let url = `/api/timesheet?organizationId=${profile.organization_id}&range=${dateRange}`;
      if (dateRange === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTimesheetData(data.entries || []);
      } else {
        setError('Failed to load timesheet data');
      }
    } catch (err) {
      setError('Failed to load timesheet data');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = timesheetData.filter(entry => {
    const matchesSearch = entry.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || entry.employeeDepartment === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const handleExportCSV = () => {
    const headers = [
      'Employee Name',
      'Date',
      'Punch In',
      'Punch Out',
      'Work Hours',
      'Break Hours',
      'Net Hours',
      'Status'
    ];

    const csvRows = [
      headers.join(','),
      ...filteredData.map(entry => [
        `"${entry.employeeName}"`,
        entry.date,
        entry.punchIn,
        entry.punchOut,
        entry.workHours.toFixed(2),
        entry.breakHours.toFixed(2),
        entry.netHours.toFixed(2),
        entry.status
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const totalWorkHours = filteredData.reduce((sum, entry) => sum + entry.workHours, 0);
  const totalBreakHours = filteredData.reduce((sum, entry) => sum + entry.breakHours, 0);
  const totalNetHours = filteredData.reduce((sum, entry) => sum + entry.netHours, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'absent':
        return <Badge variant="danger">Absent</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink-hi">Employee Timesheet</h1>
            <p className="text-ink-muted">Track employee work hours and calculate payroll</p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="info">
              {filteredData.length} Employees
            </Badge>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-4">
              <div className="text-sm text-ink-muted">Total Work Hours</div>
              <div className="text-2xl font-semibold text-ink-hi">{totalWorkHours.toFixed(2)}h</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-sm text-ink-muted">Total Break Hours</div>
              <div className="text-2xl font-semibold text-ink-hi">{totalBreakHours.toFixed(2)}h</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-sm text-ink-muted">Net Payable Hours</div>
              <div className="text-2xl font-semibold text-success">{totalNetHours.toFixed(2)}h</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="space-y-4">
              {/* First Row: Search and Department */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Input
                    placeholder="Search by employee name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Second Row: Date Range and Export */}
              <div className="flex items-center space-x-4 flex-wrap gap-4">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary min-w-[150px]"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">This Week</option>
                  <option value="lastWeek">Last Week</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>

                {dateRange === 'custom' && (
                  <>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-ink-mid whitespace-nowrap">Start:</label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-40"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-ink-mid whitespace-nowrap">End:</label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-40"
                      />
                    </div>
                    <Button variant="outline" onClick={loadTimesheetData}>
                      Apply
                    </Button>
                  </>
                )}

                <div className="ml-auto">
                  <Button variant="primary" onClick={handleExportCSV}>
                    Export CSV
                  </Button>
                </div>
              </div>

              {/* Filter Summary and Clear */}
              {(selectedDepartment !== 'all' || searchTerm) && (
                <div className="flex items-center justify-between pt-2 border-t border-line">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">
                      {filteredData.length} employees
                    </Badge>
                    {selectedDepartment !== 'all' && (
                      <span className="text-sm text-ink-muted">
                        Department: {selectedDepartment}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedDepartment('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Timesheet Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Punch In</TableHead>
                <TableHead>Punch Out</TableHead>
                <TableHead>Work Hours</TableHead>
                <TableHead>Break Hours</TableHead>
                <TableHead>Net Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 bg-gray-300 rounded w-32 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-300 rounded w-24 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-300 rounded w-20 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-300 rounded w-20 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-6 bg-gray-300 rounded w-20 animate-pulse"></div></TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-danger text-sm">{error}</div>
                    <Button variant="outline" size="sm" onClick={loadTimesheetData} className="mt-2">
                      Try Again
                    </Button>
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-ink-muted">
                      {searchTerm ? 'No employees found matching your search.' : 'No timesheet data available for this period.'}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((entry) => (
                  <TableRow key={`${entry.employeeId}-${entry.date}`}>
                    <TableCell>
                      <div className="font-medium text-ink-hi">{entry.employeeName}</div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-ink-mid">{entry.date}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-ink-hi">{entry.punchIn}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-ink-hi">{entry.punchOut}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-ink-mid">{entry.workHours.toFixed(2)}h</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-ink-mid">{entry.breakHours.toFixed(2)}h</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-medium text-success">{entry.netHours.toFixed(2)}h</span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(entry.status)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Summary Footer */}
        {!loading && !error && filteredData.length > 0 && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-center">
                <div className="text-sm text-ink-muted">
                  Showing {filteredData.length} employee{filteredData.length !== 1 ? 's' : ''} for {dateRange === 'custom' ? `${startDate} to ${endDate}` : dateRange}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
